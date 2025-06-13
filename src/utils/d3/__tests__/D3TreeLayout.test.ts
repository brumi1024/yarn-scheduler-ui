import { describe, it, expect, beforeEach } from 'vitest';
import { D3TreeLayout } from '../D3TreeLayout';
import type { Queue } from '../../../types/Queue';

describe('D3TreeLayout', () => {
    let layout: D3TreeLayout;
    let mockQueue: Queue;

    beforeEach(() => {
        layout = new D3TreeLayout();
        mockQueue = createMockQueue();
    });

    describe('constructor', () => {
        it('should initialize with default options', () => {
            expect(layout).toBeDefined();
        });

        it('should accept custom options', () => {
            const customLayout = new D3TreeLayout({
                nodeWidth: 300,
                nodeHeight: 150,
                horizontalSpacing: 100,
                verticalSpacing: 40,
                orientation: 'vertical',
            });
            expect(customLayout).toBeDefined();
        });
    });

    describe('computeLayout', () => {
        it('should compute layout for a single node', () => {
            const singleNode: Queue = {
                id: 'root',
                name: 'root',
                path: 'root',
                type: 'PARENT',
                state: 'RUNNING',
                capacity: 100,
                maxCapacity: 100,
                absoluteCapacity: 100,
                absoluteMaxCapacity: 100,
                weight: 1,
                children: [],
            };

            const result = layout.computeLayout(singleNode);

            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0].id).toBe('root');
            expect(result.nodes[0].x).toBeDefined();
            expect(result.nodes[0].y).toBeDefined();
            expect(result.flows).toHaveLength(0);
            expect(result.bounds).toBeDefined();
        });

        it('should compute layout for hierarchical tree', () => {
            const result = layout.computeLayout(mockQueue);

            expect(result.nodes).toHaveLength(7); // root + 3 children + 3 grandchildren
            expect(result.flows).toHaveLength(6); // 3 + 3 connections
            expect(result.bounds.width).toBeGreaterThan(0);
            expect(result.bounds.height).toBeGreaterThan(0);
        });

        it('should position nodes horizontally by default', () => {
            const result = layout.computeLayout(mockQueue);
            const rootNode = result.nodes.find((n) => n.id === 'root');
            const childNode = result.nodes.find((n) => n.id === 'root.prod');

            expect(rootNode).toBeDefined();
            expect(childNode).toBeDefined();
            expect(childNode!.x).toBeGreaterThan(rootNode!.x);
        });

        it('should respect collapsed state', () => {
            layout.toggleNodeCollapse('root.prod');
            const result = layout.computeLayout(mockQueue);

            // Should not include children of collapsed node
            // root + dev + test + their children (prod is collapsed so no prod children)
            expect(result.nodes).toHaveLength(6); // root + 3 children + 2 grandchildren (not prod's child)
            expect(result.flows).toHaveLength(5); // 3 connections to children + 2 to grandchildren
        });
    });

    describe('toggleNodeCollapse', () => {
        it('should toggle node collapse state', () => {
            expect(layout.isNodeCollapsed('root.prod')).toBe(false);

            layout.toggleNodeCollapse('root.prod');
            expect(layout.isNodeCollapsed('root.prod')).toBe(true);

            layout.toggleNodeCollapse('root.prod');
            expect(layout.isNodeCollapsed('root.prod')).toBe(false);
        });
    });

    describe('resetCollapsedStates', () => {
        it('should clear all collapsed states', () => {
            layout.toggleNodeCollapse('root.prod');
            layout.toggleNodeCollapse('root.dev');

            expect(layout.isNodeCollapsed('root.prod')).toBe(true);
            expect(layout.isNodeCollapsed('root.dev')).toBe(true);

            layout.resetCollapsedStates();

            expect(layout.isNodeCollapsed('root.prod')).toBe(false);
            expect(layout.isNodeCollapsed('root.dev')).toBe(false);
        });
    });

    describe('flow paths', () => {
        it('should calculate flow widths based on capacity', () => {
            const result = layout.computeLayout(mockQueue);
            const highCapacityFlow = result.flows.find((f) => f.capacity === 50);
            const lowCapacityFlow = result.flows.find((f) => f.capacity === 20);

            expect(highCapacityFlow).toBeDefined();
            expect(lowCapacityFlow).toBeDefined();
            expect(highCapacityFlow!.width).toBeGreaterThan(lowCapacityFlow!.width);
        });

        it('should create bezier paths for connections', () => {
            const result = layout.computeLayout(mockQueue);
            const flow = result.flows[0];

            expect(flow.path).toMatch(/^M \d+(\.\d+)? \d+(\.\d+)? C/); // Starts with Move and Cubic bezier
        });
    });

    describe('getNodesAtDepth', () => {
        it('should return nodes at specific depth', () => {
            const result = layout.computeLayout(mockQueue);

            const depth0 = layout.getNodesAtDepth(result.nodes, 0);
            const depth1 = layout.getNodesAtDepth(result.nodes, 1);
            const depth2 = layout.getNodesAtDepth(result.nodes, 2);

            expect(depth0).toHaveLength(1); // root
            expect(depth1).toHaveLength(3); // prod, dev, test
            expect(depth2).toHaveLength(3); // app1, app2, app3
        });
    });

    describe('getMaxDepth', () => {
        it('should return maximum tree depth', () => {
            const result = layout.computeLayout(mockQueue);
            const maxDepth = layout.getMaxDepth(result.nodes);

            expect(maxDepth).toBe(2); // 0: root, 1: children, 2: grandchildren
        });
    });

    describe('animateToNewLayout', () => {
        it('should create animation frames', () => {
            const result1 = layout.computeLayout(mockQueue);

            // Simulate layout change
            layout.toggleNodeCollapse('root.prod');
            const result2 = layout.computeLayout(mockQueue);

            const frames = layout.animateToNewLayout(result1.nodes, result2, 750);

            expect(frames.length).toBe(61); // 0 to 60 frames
            expect(frames[0].progress).toBe(0);
            expect(frames[frames.length - 1].progress).toBe(1);

            // Check interpolation
            const midFrame = frames[30];
            expect(midFrame.progress).toBeCloseTo(0.5, 1);
        });
    });

    describe('vertical orientation', () => {
        it('should layout nodes vertically', () => {
            const verticalLayout = new D3TreeLayout({ orientation: 'vertical' });
            const result = verticalLayout.computeLayout(mockQueue);

            const rootNode = result.nodes.find((n) => n.id === 'root');
            const childNode = result.nodes.find((n) => n.id === 'root.prod');

            expect(rootNode).toBeDefined();
            expect(childNode).toBeDefined();
            expect(childNode!.y).toBeGreaterThan(rootNode!.y);
        });
    });

    describe('bounds calculation', () => {
        it('should calculate correct bounds with padding', () => {
            const result = layout.computeLayout(mockQueue);
            const bounds = result.bounds;

            // Check that bounds include all nodes plus padding
            const minX = Math.min(...result.nodes.map((n) => n.x));
            const minY = Math.min(...result.nodes.map((n) => n.y));

            expect(bounds.x).toBeLessThan(minX);
            expect(bounds.y).toBeLessThan(minY);
            expect(bounds.width).toBeGreaterThan(0);
            expect(bounds.height).toBeGreaterThan(0);
        });
    });
});

function createMockQueue(): Queue {
    return {
        id: 'root',
        name: 'root',
        path: 'root',
        type: 'PARENT',
        state: 'RUNNING',
        capacity: 100,
        maxCapacity: 100,
        absoluteCapacity: 100,
        absoluteMaxCapacity: 100,
        weight: 1,
        children: [
            {
                id: 'root.prod',
                name: 'prod',
                path: 'root.prod',
                type: 'PARENT',
                state: 'RUNNING',
                capacity: 50,
                maxCapacity: 100,
                absoluteCapacity: 50,
                absoluteMaxCapacity: 100,
                weight: 0.5,
                parentQueue: 'root',
                children: [
                    {
                        id: 'root.prod.app1',
                        name: 'app1',
                        path: 'root.prod.app1',
                        type: 'LEAF',
                        state: 'RUNNING',
                        capacity: 100,
                        maxCapacity: 100,
                        absoluteCapacity: 50,
                        absoluteMaxCapacity: 100,
                        weight: 1,
                        parentQueue: 'root.prod',
                        children: [],
                    },
                ],
            },
            {
                id: 'root.dev',
                name: 'dev',
                path: 'root.dev',
                type: 'PARENT',
                state: 'RUNNING',
                capacity: 30,
                maxCapacity: 50,
                absoluteCapacity: 30,
                absoluteMaxCapacity: 50,
                weight: 0.3,
                parentQueue: 'root',
                children: [
                    {
                        id: 'root.dev.app2',
                        name: 'app2',
                        path: 'root.dev.app2',
                        type: 'LEAF',
                        state: 'RUNNING',
                        capacity: 100,
                        maxCapacity: 100,
                        absoluteCapacity: 30,
                        absoluteMaxCapacity: 50,
                        weight: 1,
                        parentQueue: 'root.dev',
                        children: [],
                    },
                ],
            },
            {
                id: 'root.test',
                name: 'test',
                path: 'root.test',
                type: 'PARENT',
                state: 'RUNNING',
                capacity: 20,
                maxCapacity: 30,
                absoluteCapacity: 20,
                absoluteMaxCapacity: 30,
                weight: 0.2,
                parentQueue: 'root',
                children: [
                    {
                        id: 'root.test.app3',
                        name: 'app3',
                        path: 'root.test.app3',
                        type: 'LEAF',
                        state: 'STOPPED',
                        capacity: 100,
                        maxCapacity: 100,
                        absoluteCapacity: 20,
                        absoluteMaxCapacity: 30,
                        weight: 1,
                        parentQueue: 'root.test',
                        children: [],
                    },
                ],
            },
        ],
    };
}
