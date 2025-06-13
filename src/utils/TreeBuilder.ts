/**
 * Tree Builder Utility for YARN Queue Hierarchies
 *
 * Provides utilities for tree operations, searching, filtering, and metrics calculation.
 */

import type { ParsedQueue } from '../types/Queue';
// import type { CapacityValue } from './CapacityModeDetector';
import { CapacityModeDetector } from './CapacityModeDetector';

export interface TreeMetrics {
    totalQueues: number;
    leafQueues: number;
    maxDepth: number;
    capacityUtilization: number;
    modeDistribution: {
        percentage: number;
        weight: number;
        absolute: number;
    };
}

export interface SearchOptions {
    searchTerm: string;
    includeProperties?: boolean;
    caseSensitive?: boolean;
}

export interface FilterOptions {
    state?: 'RUNNING' | 'STOPPED';
    capacityMode?: 'percentage' | 'weight' | 'absolute';
    hasChildren?: boolean;
    minCapacity?: number;
    maxCapacity?: number;
}

export class TreeBuilder {
    /**
     * Calculate comprehensive metrics for a queue tree
     */
    static calculateMetrics(rootQueue: ParsedQueue): TreeMetrics {
        const metrics: TreeMetrics = {
            totalQueues: 0,
            leafQueues: 0,
            maxDepth: 0,
            capacityUtilization: 0,
            modeDistribution: {
                percentage: 0,
                weight: 0,
                absolute: 0,
            },
        };

        this.traverseAndCalculateMetrics(rootQueue, 0, metrics);

        // Calculate percentages for mode distribution
        const total = metrics.totalQueues;
        if (total > 0) {
            metrics.modeDistribution.percentage = (metrics.modeDistribution.percentage / total) * 100;
            metrics.modeDistribution.weight = (metrics.modeDistribution.weight / total) * 100;
            metrics.modeDistribution.absolute = (metrics.modeDistribution.absolute / total) * 100;
        }

        return metrics;
    }

    /**
     * Traverse tree and calculate metrics recursively
     */
    private static traverseAndCalculateMetrics(queue: ParsedQueue, depth: number, metrics: TreeMetrics): void {
        metrics.totalQueues++;
        metrics.maxDepth = Math.max(metrics.maxDepth, depth);

        // Count leaf queues
        if (queue.children.length === 0) {
            metrics.leafQueues++;
        }

        // Count capacity modes
        metrics.modeDistribution[queue.capacity.mode as keyof typeof metrics.modeDistribution]++;

        // Recursively process children
        queue.children.forEach(child => this.traverseAndCalculateMetrics(child, depth + 1, metrics));
    }

    /**
     * Search for queues matching the given criteria
     */
    static searchQueues(rootQueue: ParsedQueue, options: SearchOptions): ParsedQueue[] {
        const searchTerm = options.caseSensitive ? options.searchTerm : options.searchTerm.toLowerCase();
        const allQueues = this.flattenTree(rootQueue);
        
        return allQueues.filter(queue => {
            const queueName = options.caseSensitive ? queue.name : queue.name.toLowerCase();
            const queuePath = options.caseSensitive ? queue.path : queue.path.toLowerCase();

            // Check name and path
            if (queueName.includes(searchTerm) || queuePath.includes(searchTerm)) {
                return true;
            }

            // Check properties if requested
            if (options.includeProperties && queue.properties) {
                return Object.entries(queue.properties).some(([key, value]) => {
                    const searchKey = options.caseSensitive ? key : key.toLowerCase();
                    const searchValue = options.caseSensitive ? value : value.toLowerCase();
                    return searchKey.includes(searchTerm) || searchValue.includes(searchTerm);
                });
            }

            return false;
        });
    }

    /**
     * Filter queues based on criteria
     */
    static filterQueues(rootQueue: ParsedQueue, options: FilterOptions): ParsedQueue[] {
        const allQueues = this.flattenTree(rootQueue);
        
        return allQueues.filter(queue => {
            // Check state filter
            if (options.state && queue.state !== options.state) {
                return false;
            }

            // Check capacity mode filter
            if (options.capacityMode && queue.capacity.mode !== options.capacityMode) {
                return false;
            }

            // Check children filter
            if (options.hasChildren !== undefined) {
                const hasChildren = queue.children.length > 0;
                if (options.hasChildren !== hasChildren) {
                    return false;
                }
            }

            // Check capacity range filters
            if (options.minCapacity !== undefined || options.maxCapacity !== undefined) {
                const capacity = CapacityModeDetector.toDisplayPercentage(queue.capacity);

                if (options.minCapacity !== undefined && capacity < options.minCapacity) {
                    return false;
                }

                if (options.maxCapacity !== undefined && capacity > options.maxCapacity) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Find a queue by its path
     */
    static findQueueByPath(rootQueue: ParsedQueue, targetPath: string): ParsedQueue | null {
        if (rootQueue.path === targetPath) {
            return rootQueue;
        }

        for (const child of rootQueue.children) {
            const result = this.findQueueByPath(child, targetPath);
            if (result) {
                return result;
            }
        }

        return null;
    }

    /**
     * Get all ancestor paths for a queue
     */
    static getAncestorPaths(queuePath: string): string[] {
        const paths: string[] = [];
        const parts = queuePath.split('.');

        for (let i = 1; i <= parts.length; i++) {
            paths.push(parts.slice(0, i).join('.'));
        }

        return paths.slice(0, -1); // Exclude the queue itself
    }

    /**
     * Get all descendant queues
     */
    static getDescendants(queue: ParsedQueue): ParsedQueue[] {
        const descendants: ParsedQueue[] = [];

        for (const child of queue.children) {
            descendants.push(child);
            descendants.push(...this.getDescendants(child));
        }

        return descendants;
    }

    /**
     * Get all leaf queues in the tree
     */
    static getLeafQueues(rootQueue: ParsedQueue): ParsedQueue[] {
        return this.flattenTree(rootQueue).filter(queue => queue.children.length === 0);
    }

    /**
     * Validate queue hierarchy structure
     */
    static validateHierarchy(rootQueue: ParsedQueue): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        this.validateQueueRecursively(rootQueue, new Set(), errors);

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Recursively validate queue structure
     */
    private static validateQueueRecursively(queue: ParsedQueue, visitedPaths: Set<string>, errors: string[]): void {
        // Check for duplicate paths
        if (visitedPaths.has(queue.path)) {
            errors.push(`Duplicate queue path found: ${queue.path}`);
            return;
        }
        visitedPaths.add(queue.path);

        // Validate queue name
        if (!queue.name?.trim()) {
            errors.push(`Queue at path '${queue.path}' has empty name`);
        }

        // Validate parent-child relationships
        queue.children.forEach(child => {
            if (child.parent !== queue.path) {
                errors.push(
                    `Child queue '${child.path}' has incorrect parent reference: expected '${queue.path}', got '${child.parent}'`
                );
            }

            // Validate that child path is properly constructed
            const expectedChildPath = `${queue.path}.${child.name}`;
            if (child.path !== expectedChildPath) {
                errors.push(`Child queue has incorrect path: expected '${expectedChildPath}', got '${child.path}'`);
            }

            this.validateQueueRecursively(child, visitedPaths, errors);
        });
    }

    /**
     * Calculate capacity usage for visualization
     */
    static calculateCapacityUsage(queue: ParsedQueue): {
        allocated: number;
        available: number;
        mode: string;
        displayValue: string;
    } {
        const capacity = queue.capacity;
        const maxCapacity = queue.maxCapacity;

        switch (capacity.mode) {
            case 'percentage':
                return {
                    allocated: capacity.numericValue || 0,
                    available: (maxCapacity.numericValue || 100) - (capacity.numericValue || 0),
                    mode: 'percentage',
                    displayValue: `${capacity.numericValue || 0}%`,
                };

            case 'weight':
                return {
                    allocated: capacity.numericValue || 0,
                    available: 0, // Weight doesn't have a fixed maximum
                    mode: 'weight',
                    displayValue: `${capacity.numericValue || 0}w`,
                };

            case 'absolute': {
                // For absolute mode, we need to calculate based on resources
                const resources = capacity.resources || {};
                const resourceDisplay = Object.entries(resources)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(', ');

                return {
                    allocated: 0, // Cannot determine without cluster info
                    available: 0,
                    mode: 'absolute',
                    displayValue: `[${resourceDisplay}]`,
                };
            }

            default:
                return {
                    allocated: 0,
                    available: 0,
                    mode: 'unknown',
                    displayValue: capacity.value,
                };
        }
    }

    /**
     * Convert queue tree to flat list for table views
     */
    static flattenTree(rootQueue: ParsedQueue): ParsedQueue[] {
        return [rootQueue, ...rootQueue.children.flatMap(child => this.flattenTree(child))];
    }

    /**
     * Get queue depth in the tree
     */
    static getQueueDepth(queuePath: string): number {
        return queuePath.split('.').length - 1; // Subtract 1 because root is depth 0
    }

    /**
     * Check if a queue is an ancestor of another queue
     */
    static isAncestor(ancestorPath: string, descendantPath: string): boolean {
        if (ancestorPath === descendantPath) {
            return false; // A queue is not an ancestor of itself
        }

        return descendantPath.startsWith(ancestorPath + '.');
    }

    /**
     * Get siblings of a queue
     */
    static getSiblings(rootQueue: ParsedQueue, targetPath: string): ParsedQueue[] {
        const parts = targetPath.split('.');
        if (parts.length <= 1) {
            return []; // Root has no siblings
        }

        const parentPath = parts.slice(0, -1).join('.');
        const parent = this.findQueueByPath(rootQueue, parentPath);

        return parent?.children.filter(child => child.path !== targetPath) ?? [];
    }
}
