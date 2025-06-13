import { describe, it, expect, beforeEach, vi } from 'vitest';
import { D3AnimationManager } from '../D3AnimationManager';
import type { LayoutNode, FlowPath } from '../D3TreeLayout';

// Mock requestAnimationFrame
let animationFrameId = 0;
const mockRaf = vi.fn((callback: FrameRequestCallback) => {
    const id = ++animationFrameId;
    setTimeout(() => callback(performance.now()), 16); // ~60fps
    return id;
});

const mockCancelRaf = vi.fn();

vi.stubGlobal('requestAnimationFrame', mockRaf);
vi.stubGlobal('cancelAnimationFrame', mockCancelRaf);

describe('D3AnimationManager', () => {
    let manager: D3AnimationManager;
    let mockNodes: LayoutNode[];

    beforeEach(() => {
        manager = new D3AnimationManager();
        mockNodes = createMockLayoutNodes();
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with default state', () => {
            expect(manager.isAnimating()).toBe(false);
            expect(manager.getProgress()).toBe(0);
        });
    });

    describe('animateNodes', () => {
        it('should animate node positions', async () => {
            const targetPositions = new Map([
                ['node1', { x: 100, y: 100 }],
                ['node2', { x: 200, y: 200 }],
            ]);

            const onUpdate = vi.fn();
            const promise = manager.animateNodes(mockNodes, targetPositions, {
                duration: 100,
                onUpdate,
            });

            expect(manager.isAnimating()).toBe(true);

            // Wait for animation to complete
            await promise;

            expect(manager.isAnimating()).toBe(false);
            expect(onUpdate).toHaveBeenCalled();
            expect(mockRaf).toHaveBeenCalled();
        });

        it('should call lifecycle callbacks', async () => {
            const targetPositions = new Map([['node1', { x: 100, y: 100 }]]);

            const onStart = vi.fn();
            const onComplete = vi.fn();
            const onUpdate = vi.fn();

            await manager.animateNodes(mockNodes, targetPositions, {
                duration: 50,
                onStart,
                onComplete,
                onUpdate,
            });

            expect(onStart).toHaveBeenCalledOnce();
            expect(onComplete).toHaveBeenCalledOnce();
            expect(onUpdate).toHaveBeenCalled();
        });
    });

    describe('animateCollapse', () => {
        it('should animate opacity for collapsing nodes', async () => {
            const onUpdate = vi.fn();

            await manager.animateCollapse(mockNodes, true, {
                duration: 50,
                onUpdate,
            });

            expect(onUpdate).toHaveBeenCalled();

            // Check that opacity was animated
            const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
            const progress = lastCall[0];
            expect(progress).toBeCloseTo(1, 1);
        });

        it('should animate opacity for expanding nodes', async () => {
            await manager.animateCollapse(mockNodes, false, { duration: 50 });

            // Nodes should have opacity property set
            mockNodes.forEach((node) => {
                expect((node as any).opacity).toBeDefined();
            });
        });
    });

    describe('animateLayoutChange', () => {
        it('should animate between two layouts', async () => {
            const currentNodes = mockNodes;
            const targetNodes = mockNodes.map((node) => ({
                ...node,
                x: node.x + 100,
                y: node.y + 50,
            }));

            await manager.animateLayoutChange(currentNodes, targetNodes, [], [], { duration: 50 });

            // Nodes should have moved toward target positions
            currentNodes.forEach((node, i) => {
                expect(node.x).toBeCloseTo(targetNodes[i].x, 0);
                expect(node.y).toBeCloseTo(targetNodes[i].y, 0);
            });
        });

        it('should handle node removal', async () => {
            const currentNodes = mockNodes;
            const targetNodes = [mockNodes[0]]; // Only keep first node

            await manager.animateLayoutChange(currentNodes, targetNodes, [], [], { duration: 50 });

            // Removed nodes should have opacity 0
            expect((currentNodes[1] as any).opacity).toBeCloseTo(0, 1);
        });

        it('should handle node addition', async () => {
            const newNode: LayoutNode = {
                id: 'node3',
                x: 300,
                y: 300,
                width: 280,
                height: 120,
                data: {} as any,
            };

            const currentNodes = mockNodes;
            const targetNodes = [...mockNodes, newNode];

            await manager.animateLayoutChange(currentNodes, targetNodes, [], [], { duration: 50 });

            // New node should fade in
            expect((newNode as any).opacity).toBeDefined();
        });
    });

    describe('stopAnimation', () => {
        it('should stop running animation', async () => {
            const targetPositions = new Map([['node1', { x: 100, y: 100 }]]);

            const promise = manager.animateNodes(mockNodes, targetPositions, {
                duration: 1000, // Long duration
            });

            expect(manager.isAnimating()).toBe(true);

            manager.stopAnimation();

            expect(manager.isAnimating()).toBe(false);
            expect(mockCancelRaf).toHaveBeenCalled();

            // Animation should still resolve
            await promise;
        });
    });

    describe('progress tracking', () => {
        it('should track animation progress', async () => {
            const targetPositions = new Map([['node1', { x: 100, y: 100 }]]);

            const progressValues: number[] = [];
            const onUpdate = (progress: number) => {
                progressValues.push(progress);
            };

            await manager.animateNodes(mockNodes, targetPositions, {
                duration: 100,
                onUpdate,
            });

            expect(progressValues.length).toBeGreaterThan(0);
            expect(progressValues[0]).toBeLessThan(0.5); // First progress should be near 0
            expect(progressValues[progressValues.length - 1]).toBe(1);

            // Progress should be monotonically increasing
            for (let i = 1; i < progressValues.length; i++) {
                expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
            }
        });
    });

    describe('createStaggeredAnimation', () => {
        it('should create staggered animations', async () => {
            const promises = manager.createStaggeredAnimation(mockNodes, 10);

            expect(promises).toHaveLength(mockNodes.length);

            // All promises should resolve
            await Promise.all(promises);
        });
    });

    describe('interpolatePath', () => {
        it('should interpolate between paths', () => {
            const startPath = 'M 0 0 L 100 100';
            const endPath = 'M 0 0 L 200 200';

            const path1 = manager.interpolatePath(startPath, endPath, 0.25);
            const path2 = manager.interpolatePath(startPath, endPath, 0.75);

            expect(path1).toBe(startPath); // < 0.5
            expect(path2).toBe(endPath); // >= 0.5
        });
    });

    describe('easing', () => {
        it('should apply easing function', async () => {
            const targetPositions = new Map([['node1', { x: 100, y: 100 }]]);

            let midProgress = 0;
            const onUpdate = (progress: number) => {
                if (progress > 0.4 && progress < 0.6) {
                    midProgress = progress;
                }
            };

            await manager.animateNodes(mockNodes, targetPositions, {
                duration: 100,
                onUpdate,
            });

            // With cubic easing, progress at midpoint should not be exactly 0.5
            expect(midProgress).toBeGreaterThan(0.4);
            expect(midProgress).toBeLessThan(0.6);
        });
    });
});

function createMockLayoutNodes(): LayoutNode[] {
    return [
        {
            id: 'node1',
            x: 0,
            y: 0,
            width: 280,
            height: 120,
            data: {
                id: 'node1',
                name: 'Node 1',
                path: 'node1',
                type: 'LEAF',
                state: 'RUNNING',
                capacity: 50,
                maxCapacity: 100,
                absoluteCapacity: 50,
                absoluteMaxCapacity: 100,
                weight: 0.5,
                children: [],
            },
        },
        {
            id: 'node2',
            x: 300,
            y: 0,
            width: 280,
            height: 120,
            data: {
                id: 'node2',
                name: 'Node 2',
                path: 'node2',
                type: 'LEAF',
                state: 'RUNNING',
                capacity: 50,
                maxCapacity: 100,
                absoluteCapacity: 50,
                absoluteMaxCapacity: 100,
                weight: 0.5,
                children: [],
            },
        },
    ];
}
