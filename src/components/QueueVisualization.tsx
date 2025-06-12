import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import { D3TreeLayout, SankeyFlowCalculator, type LayoutNode, type FlowPath, type LayoutQueue } from '../utils/d3';
import { CanvasRenderer, PanZoomController, QueueSelectionController, type SelectionEvent, type HoverEvent } from '../utils/canvas';
import { ZoomControls } from './ZoomControls';
import { QueueInfoPanel } from './QueueInfoPanel';
import { useConfiguration, useScheduler } from '../hooks/useApi';
import { ConfigParser } from '../utils/ConfigParser';
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
  
  // Get configuration data for tree building and scheduler data for metrics
  const { data: configData, loading: configLoading, error: configError } = useConfiguration();
  const { data: schedulerData, loading: schedulerLoading, error: schedulerError } = useScheduler();
  
  const apiLoading = configLoading || schedulerLoading;
  const apiError = configError || schedulerError;

  // Sync API loading state with component loading state
  useEffect(() => {
    if (apiLoading && !configData) {
      setIsLoading(true);
    }
  }, [apiLoading, configData]);

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
        nodeHeight: 180,
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

  // Find queue in scheduler data for runtime metrics
  const findQueueInSchedulerData = useCallback((queuePath: string, schedulerData: unknown): any | null => {
    if (!schedulerData || typeof schedulerData !== 'object') return null;
    
    const data = schedulerData as { scheduler?: { schedulerInfo?: any } };
    if (!data.scheduler?.schedulerInfo) return null;

    
    const findInQueue = (queue: any): any | null => {
      // Try multiple matching strategies for flexible queue path matching
      if (queue.queuePath === queuePath) {
        return queue;
      }
      
      if (queue.queues?.queue) {
        for (const child of queue.queues.queue) {
          const found = findInQueue(child);
          if (found) return found;
        }
      }
      
      return null;
    };

    return findInQueue(data.scheduler.schedulerInfo);
  }, []);

  // Merge configuration and runtime data
  const mergeQueueData = useCallback((layoutQueue: LayoutQueue, runtimeQueue: any): LayoutQueue => {
    return {
      ...layoutQueue,
      usedCapacity: runtimeQueue?.usedCapacity || 0,
      absoluteCapacity: runtimeQueue?.absoluteCapacity || layoutQueue.absoluteCapacity,
      absoluteUsedCapacity: runtimeQueue?.absoluteUsedCapacity || 0,
      absoluteMaxCapacity: runtimeQueue?.absoluteMaxCapacity || layoutQueue.absoluteMaxCapacity,
      numApplications: runtimeQueue?.numApplications || 0,
      resourcesUsed: runtimeQueue?.resourcesUsed || { memory: 0, vCores: 0 },
      capacities: runtimeQueue?.capacities || undefined
    };
  }, []);

  // Setup selection event handlers
  useEffect(() => {
    if (!selectionController) return;

    const handleSelection = (event: SelectionEvent) => {
      // Only open info panel on select events, not deselect
      if (event.type === 'select' && event.nodeId && event.node?.data) {
        setSelectedQueue(event.nodeId);
        // The data is already merged with runtime data
        setSelectedQueueData(event.node.data as Queue);
        setInfoPanelOpen(true);
      } else if (event.type === 'deselect' || !event.nodeId) {
        setSelectedQueue(null);
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
  }, [selectionController, renderer, nodes, flows, panZoomController, schedulerData, findQueueInSchedulerData, mergeQueueData]);

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

  // Convert configuration data to queue tree (stable function - no dependencies)
  const buildQueueTree = useCallback((configData: unknown): LayoutQueue | null => {
    if (!configData || typeof configData !== 'object') return null;
    
    const data = configData as { property?: Array<{ name: string; value: string }> };
    if (!data.property) return null;

    // Convert property array to configuration object for ConfigParser
    const configuration: Record<string, string> = {};
    data.property.forEach(prop => {
      configuration[prop.name] = prop.value;
    });

    // Parse the configuration using ConfigParser
    const parseResult = ConfigParser.parse(configuration);
    
    if (parseResult.errors.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Configuration parsing errors:', parseResult.errors);
      return null;
    }

    if (parseResult.queues.length === 0) {
      return null;
    }

    // Convert ParsedQueue to LayoutQueue
    const convertParsedQueue = (parsedQueue: any): LayoutQueue => {
      return {
        id: parsedQueue.path,
        queueName: parsedQueue.name,
        queuePath: parsedQueue.path,
        capacity: parsedQueue.capacity.numericValue || 0,
        usedCapacity: 0, // Will be filled from scheduler data later
        maxCapacity: parsedQueue.maxCapacity.numericValue || 100,
        absoluteCapacity: 0, // Calculate based on parent
        absoluteUsedCapacity: 0,
        absoluteMaxCapacity: 100,
        state: parsedQueue.state,
        numApplications: 0, // Will be filled from scheduler data later
        resourcesUsed: { memory: 0, vCores: 0 }, // Will be filled from scheduler data later
        children: parsedQueue.children?.map(convertParsedQueue) || []
      };
    };

    return convertParsedQueue(parseResult.queues[0]);
  }, []);

  // Update visualization when data changes
  useEffect(() => {
    if (!configData || !treeLayout || !sankeyCalculator || !renderer) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build queue tree from configuration data
      const rootQueue = buildQueueTree(configData);
      if (!rootQueue) {
        setError('No queue data available');
        setIsLoading(false);
        return;
      }

      // Calculate tree layout
      const layoutData = treeLayout.computeLayout(rootQueue);
      
      // MERGE SCHEDULER DATA INTO NODES
      if (schedulerData) {
        layoutData.nodes.forEach(node => {
          const runtimeData = findQueueInSchedulerData(node.id, schedulerData);
          if (runtimeData) {
            node.data = mergeQueueData(node.data, runtimeData);
          }
        });
      }
      
      
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
  }, [configData, schedulerData, treeLayout, sankeyCalculator, renderer, buildQueueTree, findQueueInSchedulerData, mergeQueueData]);

  // Handle canvas resize and setup
  useEffect(() => {
    const setupCanvasSize = () => {
      if (canvasRef.current && containerRef.current) {
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
    
    // Clear selection in the selection controller
    if (selectionController) {
      selectionController.clearSelection();
    }
    
    // Update visual state
    if (renderer) {
      renderer.setSelectedNodes(new Set());
      const state = panZoomController?.getState() || { x: 0, y: 0, scale: 1 };
      renderer.render(nodes, flows, state);
    }
  }, [renderer, nodes, flows, panZoomController, selectionController]);

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