import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import { D3TreeLayout, SankeyFlowCalculator, type LayoutNode, type FlowPath, type LayoutQueue } from '../utils/d3';
import { CanvasRenderer, PanZoomController, QueueSelectionController, type SelectionEvent, type HoverEvent } from '../utils/canvas';
import { ZoomControls } from './ZoomControls';
import { QueueInfoPanel } from './QueueInfoPanel';
import { useScheduler } from '../hooks/useApi';
import type { Queue } from '../types/Queue';

export interface QueueVisualizationProps {
  width?: number;
  height?: number;
  className?: string;
}

export const QueueVisualization: React.FC<QueueVisualizationProps> = ({
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resetHandlerRef = useRef<(() => void) | null>(null);
  const nodesRef = useRef<LayoutNode[]>([]);
  const flowsRef = useRef<FlowPath[]>([]);
  
  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderer, setRenderer] = useState<CanvasRenderer | null>(null);
  const [panZoomController, setPanZoomController] = useState<PanZoomController | null>(null);
  const [selectionController, setSelectionController] = useState<QueueSelectionController | null>(null);
  const [treeLayout, setTreeLayout] = useState<D3TreeLayout | null>(null);
  const [sankeyCalculator, setSankeyCalculator] = useState<SankeyFlowCalculator | null>(null);
  
  // Layout data
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [flows, setFlows] = useState<FlowPath[]>([]);
  
  // Selection state
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [hoveredQueue, setHoveredQueue] = useState<string | null>(null);
  const [selectedQueueData, setSelectedQueueData] = useState<Queue | null>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  
  // Get queue data from API
  const { data: schedulerData, loading: apiLoading, error: apiError } = useScheduler();

  // Sync API loading state with component loading state
  useEffect(() => {
    if (apiLoading && !schedulerData) {
      setIsLoading(true);
    }
  }, [apiLoading, schedulerData]);

  // Initialize visualization components
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Initialize canvas renderer
      const canvasRenderer = new CanvasRenderer({
        canvas: canvasRef.current,
        devicePixelRatio: window.devicePixelRatio
      });
      setRenderer(canvasRenderer);

      // Initialize pan/zoom controller
      const controller = new PanZoomController(canvasRef.current, {
        minScale: 0.1,
        maxScale: 3.0,
        enableTouch: true,
        enableKeyboard: true
      });
      setPanZoomController(controller);

      // Initialize selection controller
      const selection = new QueueSelectionController(canvasRef.current, controller, {
        enableMultiSelect: false, // Single selection for now
        enableHover: true,
        hoverDelay: 15
      });
      setSelectionController(selection);

      // Initialize layout components
      const layout = new D3TreeLayout({
        nodeWidth: 280,
        nodeHeight: 120,
        horizontalSpacing: 100,
        verticalSpacing: 80,
        orientation: 'horizontal'
      });
      setTreeLayout(layout);

      const sankey = new SankeyFlowCalculator({
        minWidth: 2,
        maxWidth: 50,
        curvature: 0.6
      });
      setSankeyCalculator(sankey);

      return () => {
        selection.destroy();
        controller.destroy();
        canvasRenderer.destroy();
      };
    } catch {
      setError('Failed to initialize visualization components');
    }
  }, []);

  // Setup pan/zoom event handler when renderer is ready
  useEffect(() => {
    if (!renderer || !panZoomController) return;

    const handlePanZoom = () => {
      const state = panZoomController.getState();
      // Get the current nodes and flows from refs to avoid stale closures
      renderer.render(nodesRef.current, flowsRef.current, state);
    };

    panZoomController.addEventListener(handlePanZoom);

    return () => {
      panZoomController.removeEventListener(handlePanZoom);
    };
  }, [renderer, panZoomController]);

  // Setup selection event handlers
  useEffect(() => {
    if (!selectionController) return;

    const handleSelection = (event: SelectionEvent) => {
      setSelectedQueue(event.nodeId || null);
      
      // Find the queue data for the selected node
      if (event.nodeId && event.node?.data) {
        setSelectedQueueData(event.node.data as Queue);
        setInfoPanelOpen(true);
      } else {
        setSelectedQueueData(null);
        setInfoPanelOpen(false);
      }
      
      // Update canvas renderer with selection
      if (renderer) {
        const selectedSet = new Set(event.selectedNodes);
        renderer.setSelectedNodes(selectedSet);
        const state = panZoomController?.getState() || { x: 0, y: 0, scale: 1 };
        renderer.render(nodes, flows, state);
      }
    };

    const handleHover = (event: HoverEvent) => {
      setHoveredQueue(event.nodeId || null);
      
      // Update canvas renderer with hover
      if (renderer) {
        const hoveredNode = event.node || null;
        renderer.setHoveredNode(hoveredNode);
        const state = panZoomController?.getState() || { x: 0, y: 0, scale: 1 };
        renderer.render(nodes, flows, state);
      }
    };

    selectionController.addSelectionListener(handleSelection);
    selectionController.addHoverListener(handleHover);

    return () => {
      selectionController.removeSelectionListener(handleSelection);
      selectionController.removeHoverListener(handleHover);
    };
  }, [selectionController, renderer, nodes, flows, panZoomController]);

  // Update selection controller with new nodes
  useEffect(() => {
    if (selectionController) {
      selectionController.updateNodes(nodes);
    }
  }, [selectionController, nodes]);

  // Calculate center root position
  const calculateCenterRootPosition = useCallback((nodeList: LayoutNode[]) => {
    if (!canvasRef.current || nodeList.length === 0) return { x: 0, y: 0, scale: 1 };

    const rootNode = nodeList.find(node => node.data.queueName === 'root') || nodeList[0];
    if (!rootNode) return { x: 0, y: 0, scale: 1 };

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const leftMargin = 100; // Distance from left edge
    const verticalCenter = canvasRect.height / 2;

    return {
      x: leftMargin - rootNode.x,
      y: verticalCenter - (rootNode.y + rootNode.height / 2),
      scale: 1
    };
  }, []);

  // Convert scheduler data to queue tree (stable function - no dependencies)
  const buildQueueTree = useCallback((schedulerData: unknown): LayoutQueue | null => {
    if (!schedulerData || typeof schedulerData !== 'object') return null;
    
    const data = schedulerData as { scheduler?: { schedulerInfo?: unknown } };
    if (!data.scheduler?.schedulerInfo) return null;

    const schedulerInfo = data.scheduler.schedulerInfo;
    
    const convertQueue = (apiQueue: unknown): LayoutQueue => {
      const queue = apiQueue as Record<string, unknown>;
      const queueName = (queue.queueName as string) || 'root';
      const queuePath = (queue.queuePath as string) || 'root';

      const queueList = queue.queues as { queue?: unknown[] };
      const children = queueList?.queue 
        ? queueList.queue.map((child: unknown) => convertQueue(child))
        : undefined;

      return {
        id: queuePath,
        queueName,
        queuePath,
        capacity: (queue.capacity as number) || 0,
        usedCapacity: (queue.usedCapacity as number) || 0,
        maxCapacity: (queue.maxCapacity as number) || 100,
        absoluteCapacity: (queue.absoluteCapacity as number) || 0,
        absoluteUsedCapacity: (queue.absoluteUsedCapacity as number) || 0,
        absoluteMaxCapacity: (queue.absoluteMaxCapacity as number) || 100,
        state: (queue.state as 'RUNNING' | 'STOPPED') || 'RUNNING',
        numApplications: (queue.numApplications as number) || 0,
        resourcesUsed: (queue.resourcesUsed as { memory: number; vCores: number }) || { memory: 0, vCores: 0 },
        children
      };
    };
    
    return convertQueue(schedulerInfo);
  }, []);

  // Update visualization when data changes
  useEffect(() => {
    if (!schedulerData || !treeLayout || !sankeyCalculator || !renderer) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build queue tree from API data
      const rootQueue = buildQueueTree(schedulerData);
      if (!rootQueue) {
        setError('No queue data available');
        setIsLoading(false);
        return;
      }

      // Calculate tree layout
      const layoutData = treeLayout.computeLayout(rootQueue);
      
      // Calculate flow paths
      const flowPaths = sankeyCalculator.calculateFlows(layoutData.nodes);
      
      // Update state and refs
      setNodes(layoutData.nodes);
      setFlows(flowPaths);
      nodesRef.current = layoutData.nodes;
      flowsRef.current = flowPaths;

      // Calculate center root position for initial render
      const initialState = calculateCenterRootPosition(layoutData.nodes);
      
      // Set the pan/zoom controller to this state
      if (panZoomController) {
        panZoomController.setState(initialState, false);
      }

      // Initial render with center root position
      renderer.render(layoutData.nodes, flowPaths, initialState);

      setIsLoading(false);
    } catch {
      setError('Failed to render queue visualization');
      setIsLoading(false);
    }
  }, [schedulerData, treeLayout, sankeyCalculator, renderer]);

  // Handle canvas resize and setup
  useEffect(() => {
    const setupCanvasSize = () => {
      if (canvasRef.current && containerRef.current) {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const canvas = canvasRef.current;
        
        // Trigger renderer resize if available (this will handle canvas sizing)
        if (renderer) {
          renderer.resize();
          // Re-render with current transform after resize
          if (panZoomController && nodes.length > 0) {
            const state = panZoomController.getState();
            renderer.render(nodes, flows, state);
          }
        }
      }
    };

    // Setup initial size
    setupCanvasSize();

    const handleResize = () => {
      setupCanvasSize();
    };

    // Use ResizeObserver for more accurate container size changes
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    }

    // Fallback to window resize
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [renderer, panZoomController, nodes, flows]);

  // Handle zoom to fit
  const handleZoomToFit = useCallback(() => {
    if (!panZoomController || nodes.length === 0) return;

    // Calculate content bounds
    const padding = 50;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });

    if (isFinite(minX)) {
      const bounds = {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2
      };
      
      panZoomController.zoomToFit(bounds, padding, true);
    }
  }, [panZoomController, nodes]);

  // Position root queue in middle-left of screen
  const handlePositionRootLeft = useCallback(() => {
    if (!panZoomController || nodes.length === 0) return;

    const position = calculateCenterRootPosition(nodes);
    panZoomController.setState(position, true);
  }, [panZoomController, nodes, calculateCenterRootPosition]);

  // Set the reset handler reference
  useEffect(() => {
    resetHandlerRef.current = handlePositionRootLeft;
  }, [handlePositionRootLeft]);

  // Handle info panel close
  const handleInfoPanelClose = useCallback(() => {
    // Clear everything at once
    setInfoPanelOpen(false);
    setSelectedQueueData(null);
    setSelectedQueue(null);
    
    // Update visual state
    if (renderer) {
      renderer.setSelectedNodes(new Set());
      const state = panZoomController?.getState() || { x: 0, y: 0, scale: 1 };
      renderer.render(nodes, flows, state);
    }
  }, [renderer, nodes, flows, panZoomController]);

  // Handle queue edit
  const handleQueueEdit = useCallback(() => {
    // TODO: Open property editor modal
  }, []);

  // Handle queue delete
  const handleQueueDelete = useCallback(() => {
    // TODO: Show confirmation dialog and delete queue
  }, []);

  // Handle queue state toggle
  const handleQueueStateToggle = useCallback(() => {
    // TODO: Update queue state via API
  }, []);

  // Handle API error
  if (apiError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load scheduler data: {apiError?.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  // Handle initialization error
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef}
      className={className}
      sx={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        bgcolor: 'background.default'
      }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            zIndex: 1000
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: panZoomController ? 'grab' : 'default'
        }}
      />

      {/* Zoom controls */}
      <ZoomControls
        panZoomController={panZoomController}
        onZoomToFit={handleZoomToFit}
        disabled={isLoading}
        position="top-right"
        showScale={true}
      />

      {/* Queue count indicator */}
      {!isLoading && nodes.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            bgcolor: 'background.paper',
            px: 2,
            py: 1,
            borderRadius: 1,
            boxShadow: 1,
            typography: 'caption',
            color: 'text.secondary'
          }}
        >
          {nodes.length} queue{nodes.length !== 1 ? 's' : ''}
        </Box>
      )}

      {/* Selected queue indicator */}
      {selectedQueue && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            px: 2,
            py: 1,
            borderRadius: 1,
            boxShadow: 2,
            typography: 'body2',
            fontWeight: 'medium'
          }}
        >
          Selected: {selectedQueue}
        </Box>
      )}

      {/* Hovered queue tooltip */}
      {hoveredQueue && !selectedQueue && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            bgcolor: 'grey.800',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 1,
            boxShadow: 2,
            typography: 'caption',
            opacity: 0.9
          }}
        >
          Hover: {hoveredQueue}
        </Box>
      )}

      {/* Invisible backdrop when info panel is open to prevent canvas clicks */}
      {infoPanelOpen && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1299, // Just below the info panel
            backgroundColor: 'transparent',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Queue Info Panel */}
      <QueueInfoPanel
        queue={selectedQueueData}
        open={infoPanelOpen}
        onClose={handleInfoPanelClose}
        onEdit={() => handleQueueEdit()}
        onDelete={() => handleQueueDelete()}
        onToggleState={() => handleQueueStateToggle()}
      />
    </Box>
  );
};