import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Box } from '@mui/material';
import {
    CanvasRenderer,
    D3ZoomController,
    QueueSelectionController,
    type SelectionEvent,
    type HoverEvent,
} from '../utils/canvas';
import type { LayoutNode, FlowPath } from '../utils/d3';

export interface CanvasDisplayProps {
    nodes: LayoutNode[];
    flows: FlowPath[];
    onSelectionChange?: (event: SelectionEvent) => void;
    onHoverChange?: (event: HoverEvent) => void;
    className?: string;
}

export interface CanvasDisplayRef {
    panZoomController: D3ZoomController | null;
    zoomToFit: () => void;
    centerOnRoot: () => void;
    updateSelection: (selectedNodes: Set<string>) => void;
}

export const CanvasDisplay = forwardRef<CanvasDisplayRef, CanvasDisplayProps>(
    ({ nodes, flows, onSelectionChange, onHoverChange, className }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        // Canvas controllers
        const [renderer, setRenderer] = useState<CanvasRenderer | null>(null);
        const [panZoomController, setPanZoomController] = useState<D3ZoomController | null>(null);
        const [selectionController, setSelectionController] = useState<QueueSelectionController | null>(null);


        // Initialize canvas components
        useEffect(() => {
            if (!canvasRef.current) return;

            try {
                // Initialize canvas renderer
                const canvasRenderer = new CanvasRenderer({
                    canvas: canvasRef.current,
                    devicePixelRatio: window.devicePixelRatio,
                });
                setRenderer(canvasRenderer);

                // Initialize pan/zoom controller
                const controller = new D3ZoomController(canvasRef.current, {
                    minScale: 0.1,
                    maxScale: 3.0,
                    enableKeyboard: true,
                });
                setPanZoomController(controller);

                // Initialize selection controller
                const selection = new QueueSelectionController(canvasRef.current, controller, {
                    enableMultiSelect: false,
                    enableHover: true,
                    hoverDelay: 15,
                });
                setSelectionController(selection);

                return () => {
                    selection.destroy();
                    controller.destroy();
                    canvasRenderer.destroy();
                };
            } catch (error) {
                console.error('Failed to initialize canvas components:', error);
            }
        }, []);

        // Consolidated rendering and event handling
        useEffect(() => {
            if (!renderer || !panZoomController || !selectionController) return;

            // Handler for pan/zoom events
            const handlePanZoom = () => {
                renderer.update({ transform: panZoomController.getState() });
            };

            // Handler for selection events
            const handleSelection = (event: SelectionEvent) => {
                const selectedNodeIds = new Set(event.selectedNodes);
                renderer.update({ selectedNodeIds });
                onSelectionChange?.(event);
            };

            // Handler for hover events
            const handleHover = (event: HoverEvent) => {
                renderer.update({ hoveredNodeId: event.node?.id || null });
                onHoverChange?.(event);
            };

            // Attach listeners
            panZoomController.addEventListener(handlePanZoom);
            selectionController.addSelectionListener(handleSelection);
            selectionController.addHoverListener(handleHover);

            // Initial render with all props
            renderer.update({
                nodes,
                flows,
                transform: panZoomController.getState(),
                selectedNodeIds: new Set(selectionController.getSelection()),
                hoveredNodeId: null,
            });

            // Cleanup
            return () => {
                panZoomController.removeEventListener(handlePanZoom);
                selectionController.removeSelectionListener(handleSelection);
                selectionController.removeHoverListener(handleHover);
            };
        }, [renderer, panZoomController, selectionController, nodes, flows, onSelectionChange, onHoverChange]);

        // Update selection controller with new nodes
        useEffect(() => {
            if (selectionController && nodes.length > 0) {
                selectionController.updateNodes(nodes);
            }
        }, [selectionController, nodes]);


        // Handle canvas resize
        useEffect(() => {
            const setupCanvasSize = () => {
                if (renderer && containerRef.current) {
                    renderer.resize();
                    if (panZoomController && nodes.length > 0) {
                        renderer.update({
                            nodes,
                            flows,
                            transform: panZoomController.getState(),
                        });
                    }
                }
            };

            setupCanvasSize();

            const handleResize = () => {
                setupCanvasSize();
            };

            let resizeObserver: ResizeObserver | null = null;
            if (containerRef.current && window.ResizeObserver) {
                resizeObserver = new ResizeObserver(handleResize);
                resizeObserver.observe(containerRef.current);
            }

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                if (resizeObserver) {
                    resizeObserver.disconnect();
                }
            };
        }, [renderer, panZoomController, nodes, flows]);

        // Calculate center root position
        const calculateCenterRootPosition = useCallback((nodeList: LayoutNode[]) => {
            if (!canvasRef.current || nodeList.length === 0) return { x: 0, y: 0, scale: 1 };

            const rootNode = nodeList.find((node) => node.data.queueName === 'root') || nodeList[0];
            if (!rootNode) return { x: 0, y: 0, scale: 1 };

            const canvasRect = canvasRef.current.getBoundingClientRect();
            const leftMargin = 100;
            const verticalCenter = canvasRect.height / 2;

            return {
                x: leftMargin - rootNode.x,
                y: verticalCenter - (rootNode.y + rootNode.height / 2),
                scale: 1,
            };
        }, []);

        // Zoom to fit all content
        const zoomToFit = useCallback(() => {
            if (!panZoomController || nodes.length === 0) return;

            const padding = 50;
            let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;

            nodes.forEach((node) => {
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
                    height: maxY - minY + padding * 2,
                };

                panZoomController.zoomToFit(bounds, padding, true);
            }
        }, [panZoomController, nodes]);

        // Center on root node
        const centerOnRoot = useCallback(() => {
            if (!panZoomController || nodes.length === 0) return;

            const position = calculateCenterRootPosition(nodes);
            panZoomController.setState(position, true);
        }, [panZoomController, nodes, calculateCenterRootPosition]);

        // Update visual selection
        const updateSelection = useCallback(
            (selectedNodeIds: Set<string>) => {
                if (renderer) {
                    renderer.update({ selectedNodeIds });
                }
            },
            [renderer]
        );

        // Expose methods through ref
        useImperativeHandle(
            ref,
            () => ({
                panZoomController,
                zoomToFit,
                centerOnRoot,
                updateSelection,
            }),
            [panZoomController, zoomToFit, centerOnRoot, updateSelection]
        );

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
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        cursor: panZoomController ? 'grab' : 'default',
                    }}
                />
            </Box>
        );
    }
);

CanvasDisplay.displayName = 'CanvasDisplay';
