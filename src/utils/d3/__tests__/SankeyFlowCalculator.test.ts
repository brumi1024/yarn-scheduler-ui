import { describe, it, expect, beforeEach } from 'vitest';
import { SankeyFlowCalculator } from '../SankeyFlowCalculator';
import type { LayoutNode } from '../D3TreeLayout';
import type { Queue } from '../../../types/Queue';

describe('SankeyFlowCalculator', () => {
    let calculator: SankeyFlowCalculator;
    let mockNodes: LayoutNode[];

    beforeEach(() => {
        calculator = new SankeyFlowCalculator();
        mockNodes = createMockLayoutNodes();
    });

    describe('constructor', () => {
        it('should initialize with default options', () => {
            expect(calculator).toBeDefined();
        });

        it('should accept custom options', () => {
            const customCalculator = new SankeyFlowCalculator({
                minWidth: 10,
                maxWidth: 80,
                padding: 4,
                curvature: 0.7,
            });
            expect(customCalculator).toBeDefined();
        });
    });

    describe('calculateFlows', () => {
        it('should calculate flows for hierarchical nodes', () => {
            const flows = calculator.calculateFlows(mockNodes);

            expect(flows).toHaveLength(3); // 3 child nodes with parents
            expect(flows[0].source).toBeDefined();
            expect(flows[0].target).toBeDefined();
            expect(flows[0].path).toBeDefined();
            expect(flows[0].width).toBeGreaterThan(0);
        });

        it('should calculate flow widths based on capacity', () => {
            const flows = calculator.calculateFlows(mockNodes);
            const highCapacityFlow = flows.find((f) => f.capacity === 50);
            const lowCapacityFlow = flows.find((f) => f.capacity === 20);

            expect(highCapacityFlow).toBeDefined();
            expect(lowCapacityFlow).toBeDefined();
            expect(highCapacityFlow!.width).toBeGreaterThan(lowCapacityFlow!.width);
        });

        it('should create SVG paths for flows', () => {
            const flows = calculator.calculateFlows(mockNodes);

            flows.forEach((flow) => {
                expect(flow.path).toMatch(/^M \d+(\.\d+)?,-?\d+(\.\d+)?/); // Starts with Move command
                expect(flow.path).toContain('C'); // Contains cubic bezier
                expect(flow.path).toContain('Z'); // Closes the path
            });
        });

        it('should handle nodes without parents', () => {
            const rootOnlyNodes = [mockNodes[0]]; // Just the root
            const flows = calculator.calculateFlows(rootOnlyNodes);

            expect(flows).toHaveLength(0);
        });
    });

    describe('calculateFlowMetrics', () => {
        it('should calculate flow metrics correctly', () => {
            const flows = calculator.calculateFlows(mockNodes);
            const metrics = calculator.calculateFlowMetrics(flows);

            expect(metrics.flowCount).toBe(3);
            expect(metrics.totalCapacity).toBe(100); // 50 + 30 + 20
            expect(metrics.averageWidth).toBeGreaterThan(0);
            expect(metrics.maxWidth).toBeGreaterThan(metrics.averageWidth);
        });

        it('should handle empty flows', () => {
            const metrics = calculator.calculateFlowMetrics([]);

            expect(metrics.flowCount).toBe(0);
            expect(metrics.totalCapacity).toBe(0);
            expect(metrics.averageWidth).toBe(0);
            expect(metrics.maxWidth).toBe(0);
        });
    });

    describe('createSankeyData', () => {
        it('should create sankey data structure', () => {
            const sankeyData = calculator.createSankeyData(mockNodes);

            expect(sankeyData.nodes).toHaveLength(4);
            expect(sankeyData.links).toHaveLength(3);

            sankeyData.links.forEach((link) => {
                expect(link.source).toBeDefined();
                expect(link.target).toBeDefined();
                expect(link.value).toBeGreaterThanOrEqual(0);
            });
        });

        it('should map node relationships correctly', () => {
            const sankeyData = calculator.createSankeyData(mockNodes);
            const rootNode = sankeyData.nodes.find((n) => n.id === 'root');
            const childNode = sankeyData.nodes.find((n) => n.id === 'root.prod');
            const link = sankeyData.links.find((l) => l.source.id === 'root' && l.target.id === 'root.prod');

            expect(rootNode).toBeDefined();
            expect(childNode).toBeDefined();
            expect(link).toBeDefined();
            expect(link!.value).toBe(50);
        });
    });

    describe('flow width calculation', () => {
        it('should respect min and max width constraints', () => {
            const customCalculator = new SankeyFlowCalculator({
                minWidth: 10,
                maxWidth: 50,
            });

            const flows = customCalculator.calculateFlows(mockNodes);

            flows.forEach((flow) => {
                expect(flow.width).toBeGreaterThanOrEqual(10);
                expect(flow.width).toBeLessThanOrEqual(50);
            });
        });

        it('should scale width proportionally to capacity', () => {
            const flows = calculator.calculateFlows(mockNodes);
            const sortedFlows = flows.sort((a, b) => a.capacity - b.capacity);

            for (let i = 1; i < sortedFlows.length; i++) {
                expect(sortedFlows[i].width).toBeGreaterThanOrEqual(sortedFlows[i - 1].width);
            }
        });
    });

    describe('path calculation', () => {
        it('should create paths from source right to target left', () => {
            const flows = calculator.calculateFlows(mockNodes);
            const flow = flows[0];

            const sourceX = flow.source.x + flow.source.width;
            const targetX = flow.target.x;

            // Path should start at source right edge
            expect(flow.path).toContain(`M ${sourceX},`);
        });

        it('should use configurable curvature', () => {
            const straightCalculator = new SankeyFlowCalculator({ curvature: 0 });
            const curvedCalculator = new SankeyFlowCalculator({ curvature: 1 });

            const straightFlows = straightCalculator.calculateFlows(mockNodes);
            const curvedFlows = curvedCalculator.calculateFlows(mockNodes);

            // Different curvature should produce different paths
            expect(straightFlows[0].path).not.toBe(curvedFlows[0].path);
        });
    });
});

function createMockLayoutNodes(): LayoutNode[] {
    const mockQueue = (id: string, name: string, capacity: number): Queue => ({
        id,
        name,
        path: id,
        type: id === 'root' ? 'PARENT' : 'LEAF',
        state: 'RUNNING',
        capacity,
        maxCapacity: 100,
        absoluteCapacity: capacity,
        absoluteMaxCapacity: 100,
        weight: capacity / 100,
        children: [],
    });

    const root: LayoutNode = {
        id: 'root',
        x: 0,
        y: 100,
        width: 280,
        height: 120,
        data: mockQueue('root', 'root', 100),
        children: [],
    };

    const prod: LayoutNode = {
        id: 'root.prod',
        x: 400,
        y: 0,
        width: 280,
        height: 120,
        data: mockQueue('root.prod', 'prod', 50),
        parent: root,
        children: [],
    };

    const dev: LayoutNode = {
        id: 'root.dev',
        x: 400,
        y: 150,
        width: 280,
        height: 120,
        data: mockQueue('root.dev', 'dev', 30),
        parent: root,
        children: [],
    };

    const test: LayoutNode = {
        id: 'root.test',
        x: 400,
        y: 300,
        width: 280,
        height: 120,
        data: mockQueue('root.test', 'test', 20),
        parent: root,
        children: [],
    };

    root.children = [prod, dev, test];

    return [root, prod, dev, test];
}
