import { describe, it, expect } from 'vitest';
import { DagreLayout } from '../DagreLayout';
import type { QueueNode } from '../../../../types';

describe('DagreLayout', () => {
    const mockQueueTree: QueueNode = {
        path: 'root',
        name: 'root',
        type: 'parent',
        properties: new Map([
            ['capacity', '100'],
            ['state', 'RUNNING'],
        ]),
        children: [
            {
                path: 'root.default',
                name: 'default',
                type: 'leaf',
                properties: new Map([
                    ['capacity', '30'],
                    ['state', 'RUNNING'],
                ]),
                children: [],
                labelConfigs: new Map(),
            },
            {
                path: 'root.production',
                name: 'production',
                type: 'parent',
                properties: new Map([
                    ['capacity', '70'],
                    ['state', 'RUNNING'],
                ]),
                children: [
                    {
                        path: 'root.production.critical',
                        name: 'critical',
                        type: 'leaf',
                        properties: new Map([
                            ['capacity', '50'],
                            ['state', 'RUNNING'],
                        ]),
                        children: [],
                        labelConfigs: new Map(),
                    },
                    {
                        path: 'root.production.batch',
                        name: 'batch',
                        type: 'leaf',
                        properties: new Map([
                            ['capacity', '20'],
                            ['state', 'STOPPED'],
                        ]),
                        children: [],
                        labelConfigs: new Map(),
                    },
                ],
                labelConfigs: new Map(),
            },
        ],
        labelConfigs: new Map(),
    };

    it('should create layout instance with default options', () => {
        const layout = new DagreLayout();
        expect(layout).toBeDefined();
    });

    it('should accept custom options', () => {
        const layout = new DagreLayout({
            nodeWidth: 300,
            nodeHeight: 250,
            horizontalSpacing: 100,
            verticalSpacing: 80,
        });
        expect(layout).toBeDefined();
    });

    it('should calculate positions for all nodes', () => {
        const layout = new DagreLayout();
        const positions = layout.calculatePositions(mockQueueTree);

        expect(positions.size).toBe(5); // root + 2 children + 2 grandchildren
        expect(positions.has('root')).toBe(true);
        expect(positions.has('root.default')).toBe(true);
        expect(positions.has('root.production')).toBe(true);
        expect(positions.has('root.production.critical')).toBe(true);
        expect(positions.has('root.production.batch')).toBe(true);
    });

    it('should position nodes with proper spacing', () => {
        const layout = new DagreLayout({
            nodeWidth: 280,
            nodeHeight: 220,
            horizontalSpacing: 50,
            verticalSpacing: 100,
        });
        const positions = layout.calculatePositions(mockQueueTree);

        const rootPos = positions.get('root')!;
        const defaultPos = positions.get('root.default')!;
        const productionPos = positions.get('root.production')!;

        // Root should be at top
        expect(rootPos.y).toBe(0);

        // Children should be below root
        expect(defaultPos.y).toBeGreaterThan(rootPos.y);
        expect(productionPos.y).toBeGreaterThan(rootPos.y);

        // Children should be at same level
        expect(defaultPos.y).toBe(productionPos.y);

        // Children should have horizontal spacing
        expect(Math.abs(productionPos.x - defaultPos.x)).toBeGreaterThanOrEqual(280 + 50);
    });

    it('should center parent nodes above children', () => {
        const layout = new DagreLayout();
        const positions = layout.calculatePositions(mockQueueTree);

        const productionPos = positions.get('root.production')!;
        const criticalPos = positions.get('root.production.critical')!;
        const batchPos = positions.get('root.production.batch')!;

        // Parent should be centered between children
        const childrenCenterX = (criticalPos.x + batchPos.x + 280) / 2; // Add node width
        const parentCenterX = productionPos.x + 140; // Half of node width

        expect(Math.abs(parentCenterX - childrenCenterX)).toBeLessThan(10); // Allow small variance
    });

    it('should handle single child nodes', () => {
        const singleChildTree: QueueNode = {
            path: 'root',
            name: 'root',
            type: 'parent',
            properties: new Map(),
            children: [
                {
                    path: 'root.only',
                    name: 'only',
                    type: 'leaf',
                    properties: new Map(),
                    children: [],
                    labelConfigs: new Map(),
                },
            ],
            labelConfigs: new Map(),
        };

        const layout = new DagreLayout();
        const positions = layout.calculatePositions(singleChildTree);

        const rootPos = positions.get('root')!;
        const childPos = positions.get('root.only')!;

        // Single child should be directly below parent
        expect(childPos.x).toBe(rootPos.x);
        expect(childPos.y).toBeGreaterThan(rootPos.y);
    });

    it('should handle empty tree', () => {
        const emptyTree: QueueNode = {
            path: 'root',
            name: 'root',
            type: 'leaf',
            properties: new Map(),
            children: [],
            labelConfigs: new Map(),
        };

        const layout = new DagreLayout();
        const positions = layout.calculatePositions(emptyTree);

        expect(positions.size).toBe(1);
        expect(positions.has('root')).toBe(true);

        const rootPos = positions.get('root')!;
        expect(rootPos.x).toBe(0);
        expect(rootPos.y).toBe(0);
    });

    it('should return proper bounds for the layout', () => {
        const layout = new DagreLayout();
        const positions = layout.calculatePositions(mockQueueTree);
        const bounds = layout.getBounds(positions);

        expect(bounds.minX).toBeLessThanOrEqual(0);
        expect(bounds.minY).toBe(0);
        expect(bounds.maxX).toBeGreaterThan(bounds.minX);
        expect(bounds.maxY).toBeGreaterThan(bounds.minY);
    });

    it('should work with horizontal orientation', () => {
        const layout = new DagreLayout({ orientation: 'horizontal' });
        const positions = layout.calculatePositions(mockQueueTree);

        const rootPos = positions.get('root')!;
        const defaultPos = positions.get('root.default')!;

        // In horizontal layout, children are to the right
        expect(defaultPos.x).toBeGreaterThan(rootPos.x);
    });

    it('should work with vertical orientation', () => {
        const layout = new DagreLayout({ orientation: 'vertical' });
        const positions = layout.calculatePositions(mockQueueTree);

        const rootPos = positions.get('root')!;
        const defaultPos = positions.get('root.default')!;

        // In vertical layout, children are below
        expect(defaultPos.y).toBeGreaterThan(rootPos.y);
    });
});