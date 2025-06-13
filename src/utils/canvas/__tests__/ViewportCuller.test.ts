import { describe, it, expect, beforeEach } from 'vitest';
import { ViewportCuller, QuadTree } from '../ViewportCuller';
import type { LayoutNode, FlowPath } from '../../d3/D3TreeLayout';
import type { Viewport } from '../ViewportCuller';

describe('ViewportCuller', () => {
    let culler: ViewportCuller;
    let viewport: Viewport;
    let mockNodes: LayoutNode[];
    let mockFlows: FlowPath[];

    beforeEach(() => {
        viewport = { x: 0, y: 0, width: 800, height: 600 };
        culler = new ViewportCuller(viewport, 50);
        mockNodes = createMockNodes();
        mockFlows = createMockFlows();
    });

    describe('constructor', () => {
        it('should initialize with viewport and padding', () => {
            expect(culler).toBeDefined();
        });

        it('should use default padding', () => {
            const defaultCuller = new ViewportCuller(viewport);
            expect(defaultCuller).toBeDefined();
        });
    });

    describe('updateViewport', () => {
        it('should update viewport', () => {
            const newViewport = { x: 100, y: 100, width: 600, height: 400 };
            culler.updateViewport(newViewport);

            // Test by culling - should use new viewport
            const result = culler.cullNodes(mockNodes);
            expect(result).toBeDefined();
        });
    });

    describe('cullNodes', () => {
        it('should separate visible and culled nodes', () => {
            const result = culler.cullNodes(mockNodes);

            expect(result.visible).toBeDefined();
            expect(result.culled).toBeDefined();
            expect(result.visible.length + result.culled.length).toBe(mockNodes.length);
        });

        it('should include nodes in viewport', () => {
            // Node at 100,100 should be visible in viewport 0,0,800,600
            const result = culler.cullNodes(mockNodes);

            const visibleNode = result.visible.find((n) => n.id === 'node1');
            expect(visibleNode).toBeDefined();
        });

        it('should cull nodes outside viewport', () => {
            // Create node far outside viewport
            const farNode: LayoutNode = {
                id: 'farNode',
                x: 2000,
                y: 2000,
                width: 280,
                height: 120,
                data: createMockQueue('farNode', 'Far Queue'),
            };

            const result = culler.cullNodes([...mockNodes, farNode]);

            const culledNode = result.culled.find((n) => n.id === 'farNode');
            expect(culledNode).toBeDefined();
        });

        it('should include nodes partially in viewport', () => {
            // Node that partially overlaps viewport
            const partialNode: LayoutNode = {
                id: 'partialNode',
                x: 750, // Starts at 750, ends at 1030 (overlaps viewport edge at 800)
                y: 100,
                width: 280,
                height: 120,
                data: createMockQueue('partialNode', 'Partial Queue'),
            };

            const result = culler.cullNodes([partialNode]);

            expect(result.visible).toContain(partialNode);
        });

        it('should account for padding', () => {
            // Node just outside viewport but within padding
            const paddedNode: LayoutNode = {
                id: 'paddedNode',
                x: 820, // Outside 800px viewport but within 50px padding
                y: 100,
                width: 280,
                height: 120,
                data: createMockQueue('paddedNode', 'Padded Queue'),
            };

            const result = culler.cullNodes([paddedNode]);

            expect(result.visible).toContain(paddedNode);
        });
    });

    describe('cullFlows', () => {
        it('should separate visible and culled flows', () => {
            const result = culler.cullFlows(mockFlows);

            expect(result.visible).toBeDefined();
            expect(result.culled).toBeDefined();
            expect(result.visible.length + result.culled.length).toBe(mockFlows.length);
        });

        it('should include flows with source or target in viewport', () => {
            const result = culler.cullFlows(mockFlows);

            // Flow between nodes in viewport should be visible
            expect(result.visible.length).toBeGreaterThan(0);
        });

        it('should cull flows with both ends outside viewport', () => {
            const farNode1: LayoutNode = {
                id: 'far1',
                x: 2000,
                y: 2000,
                width: 280,
                height: 120,
                data: createMockQueue('far1', 'Far Queue 1'),
            };

            const farNode2: LayoutNode = {
                id: 'far2',
                x: 2500,
                y: 2000,
                width: 280,
                height: 120,
                data: createMockQueue('far2', 'Far Queue 2'),
            };

            const farFlow: FlowPath = {
                id: 'farFlow',
                source: farNode1,
                target: farNode2,
                path: 'M 2280 2060 L 2500 2060',
                width: 20,
                capacity: 50,
            };

            const result = culler.cullFlows([farFlow]);

            expect(result.culled).toContain(farFlow);
        });
    });

    describe('getVisibleBounds', () => {
        it('should return bounds of visible nodes', () => {
            const bounds = culler.getVisibleBounds(mockNodes);

            expect(bounds).toBeDefined();
            expect(bounds!.x).toBeLessThanOrEqual(100); // Leftmost node x
            expect(bounds!.y).toBeLessThanOrEqual(100); // Topmost node y
            expect(bounds!.width).toBeGreaterThan(0);
            expect(bounds!.height).toBeGreaterThan(0);
        });

        it('should return null if no nodes are visible', () => {
            const farNodes = mockNodes.map((node) => ({
                ...node,
                x: 2000,
                y: 2000,
            }));

            const bounds = culler.getVisibleBounds(farNodes);

            expect(bounds).toBeNull();
        });
    });

    describe('createSpatialIndex', () => {
        it('should create QuadTree spatial index', () => {
            const quadTree = culler.createSpatialIndex(mockNodes);

            expect(quadTree).toBeInstanceOf(QuadTree);
        });
    });
});

describe('QuadTree', () => {
    let quadTree: QuadTree;
    let mockNodes: LayoutNode[];
    let bounds: Viewport;

    beforeEach(() => {
        bounds = { x: 0, y: 0, width: 1000, height: 1000 };
        mockNodes = createMockNodes();
        quadTree = new QuadTree(mockNodes, bounds);
    });

    describe('constructor', () => {
        it('should create quadtree with nodes', () => {
            expect(quadTree).toBeDefined();
        });
    });

    describe('query', () => {
        it('should return nodes in query region', () => {
            const queryRegion = { x: 50, y: 50, width: 200, height: 200 };
            const results = quadTree.query(queryRegion);

            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
        });

        it('should return empty array for region with no nodes', () => {
            const emptyRegion = { x: 5000, y: 5000, width: 100, height: 100 };
            const results = quadTree.query(emptyRegion);

            expect(results).toEqual([]);
        });

        it('should return nodes that intersect query region', () => {
            const queryRegion = { x: 0, y: 0, width: 150, height: 150 };
            const results = quadTree.query(queryRegion);

            // Should include node at 100,100
            const foundNode = results.find((n) => n.id === 'node1');
            expect(foundNode).toBeDefined();
        });
    });
});

function createMockNodes(): LayoutNode[] {
    return [
        {
            id: 'node1',
            x: 100,
            y: 100,
            width: 280,
            height: 120,
            data: createMockQueue('node1', 'Queue 1'),
        },
        {
            id: 'node2',
            x: 500,
            y: 100,
            width: 280,
            height: 120,
            data: createMockQueue('node2', 'Queue 2'),
        },
        {
            id: 'node3',
            x: 100,
            y: 300,
            width: 280,
            height: 120,
            data: createMockQueue('node3', 'Queue 3'),
        },
    ];
}

function createMockFlows(): FlowPath[] {
    const nodes = createMockNodes();

    return [
        {
            id: 'flow1',
            source: nodes[0],
            target: nodes[1],
            path: 'M 380 160 L 500 160',
            width: 20,
            capacity: 50,
        },
    ];
}

function createMockQueue(id: string, name: string) {
    return {
        id,
        name,
        path: `root.${id}`,
        type: 'LEAF' as const,
        state: 'RUNNING' as const,
        capacity: 50,
        maxCapacity: 100,
        absoluteCapacity: 50,
        absoluteMaxCapacity: 100,
        weight: 0.5,
        children: [],
    };
}
