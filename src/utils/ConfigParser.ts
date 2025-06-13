/**
 * Configuration Parser for YARN Capacity Scheduler
 *
 * Parses flat YARN configuration properties into hierarchical queue structures.
 * Uses a two-pass approach to correctly handle edge cases where queue names
 * could conflict with property names (e.g., a queue named "capacity").
 */

import type { ParsedQueue, Configuration } from '../types/Queue';
// import type { CapacityValue } from './CapacityModeDetector';
import { CapacityModeDetector } from './CapacityModeDetector';
import { parseIntProperty, parseNumericProperty, parseBooleanProperty, parseStringArray } from './CapacityValidation';

export interface ParsedProperty {
    key: string;
    value: string;
    queuePath?: string;
    property?: string;
    isGlobal: boolean;
}

export interface ParseResult {
    queues: ParsedQueue[];
    globalProperties: Record<string, string>;
    isLegacyMode: boolean;
    errors: string[];
    warnings: string[];
}

export class ConfigParser {
    private static readonly CAPACITY_PREFIX = 'yarn.scheduler.capacity.';
    private static readonly ROOT_QUEUE = 'root';

    /**
     * Main entry point for parsing YARN configuration
     * Uses a two-pass approach:
     * 1. First pass: Discover all queue paths by finding .queues properties
     * 2. Second pass: Parse all properties with knowledge of valid queue paths
     */
    static parse(config: Configuration): ParseResult {
        const result: ParseResult = {
            queues: [],
            globalProperties: {},
            isLegacyMode: true, // Default assumption
            errors: [],
            warnings: [],
        };

        try {
            // Phase 1: Discover all valid queue paths
            const validQueuePaths = this.discoverQueuePaths(config);

            // Phase 2: Parse properties with queue path knowledge
            const parsedProperties = this.parseProperties(config, validQueuePaths);

            // Extract global properties first (needed for legacy mode detection)
            this.extractGlobalProperties(parsedProperties, result);

            // Build queue hierarchy
            this.buildQueueHierarchy(parsedProperties, result);

            // Validate the configuration
            this.validateConfiguration(result);
        } catch (error) {
            result.errors.push(
                `Configuration parsing failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }

        return result;
    }

    /**
     * Phase 1: Discover all valid queue paths by examining .queues properties
     * This allows us to correctly handle cases where queue names conflict with property names
     */
    private static discoverQueuePaths(config: Configuration): Set<string> {
        const queuePaths = new Set<string>();

        // Root queue always exists
        queuePaths.add(this.ROOT_QUEUE);

        // Keep discovering until no new queues are found (handles nested hierarchies)
        let foundNewQueues = true;
        while (foundNewQueues) {
            foundNewQueues = false;

            // Find all .queues properties to discover child queues
            for (const [key, value] of Object.entries(config)) {
                if (!key.startsWith(this.CAPACITY_PREFIX)) {
                    continue;
                }

                const suffix = key.substring(this.CAPACITY_PREFIX.length);

                // Check if this is a .queues property
                if (suffix.endsWith('.queues')) {
                    // Extract the parent queue path
                    const parentPath = suffix.substring(0, suffix.length - '.queues'.length);

                    // Check if this parent path is already known to be a valid queue
                    if (queuePaths.has(parentPath)) {
                        // Parse the child queue names
                        const childNames = value
                            .split(',')
                            .map((s: string) => s.trim())
                            .filter((s: string) => s.length > 0);

                        // Add each child queue path
                        for (const childName of childNames) {
                            const childPath = parentPath + '.' + childName;
                            if (!queuePaths.has(childPath)) {
                                queuePaths.add(childPath);
                                foundNewQueues = true;
                            }
                        }
                    }
                }
            }
        }

        return queuePaths;
    }

    /**
     * Phase 2: Parse all configuration properties with knowledge of valid queue paths
     */
    private static parseProperties(config: Configuration, validQueuePaths: Set<string>): ParsedProperty[] {
        const properties: ParsedProperty[] = [];

        for (const [key, value] of Object.entries(config)) {
            if (!key.startsWith(this.CAPACITY_PREFIX)) {
                continue;
            }

            const suffix = key.substring(this.CAPACITY_PREFIX.length);
            const parsed = this.classifyProperty(key, value, suffix, validQueuePaths);
            properties.push(parsed);
        }

        return properties;
    }

    /**
     * Classify a property as global or queue-specific using validated queue paths
     */
    private static classifyProperty(
        fullKey: string,
        value: string,
        suffix: string,
        validQueuePaths: Set<string>
    ): ParsedProperty {
        const base: ParsedProperty = {
            key: fullKey,
            value: value,
            isGlobal: true, // Default assumption
        };

        // If it doesn't start with 'root', it's definitely global
        if (!suffix.startsWith(this.ROOT_QUEUE)) {
            return base;
        }

        // It starts with 'root', so it could be a queue property
        // Find the longest matching queue path
        const queuePathAndProperty = this.extractQueuePathAndProperty(suffix, validQueuePaths);

        if (queuePathAndProperty) {
            return {
                ...base,
                isGlobal: false,
                queuePath: queuePathAndProperty.queuePath,
                property: queuePathAndProperty.property,
            };
        }

        return base;
    }

    /**
     * Extract queue path and property using the set of valid queue paths
     * This ensures we correctly handle cases like root.capacity.capacity
     * where "capacity" could be either a queue name or a property name
     */
    private static extractQueuePathAndProperty(
        suffix: string,
        validQueuePaths: Set<string>
    ): { queuePath: string; property: string } | null {
        // Try to find the longest valid queue path that matches the beginning of suffix
        let longestMatch = '';

        for (const queuePath of validQueuePaths) {
            if (suffix.startsWith(queuePath + '.') && queuePath.length > longestMatch.length) {
                longestMatch = queuePath;
            } else if (suffix === queuePath) {
                // The suffix is exactly a queue path with no property
                // This shouldn't happen in valid configs but we'll handle it
                return null;
            }
        }

        if (longestMatch) {
            // Extract the property part after the queue path
            const property = suffix.substring(longestMatch.length + 1); // +1 for the dot
            return {
                queuePath: longestMatch,
                property: property,
            };
        }

        // No valid queue path found
        return null;
    }

    /**
     * Extract global properties from parsed properties
     */
    private static extractGlobalProperties(properties: ParsedProperty[], result: ParseResult): void {
        for (const prop of properties) {
            if (prop.isGlobal) {
                result.globalProperties[prop.key] = prop.value;
            }
        }

        // Determine legacy mode from global properties
        const legacyModeKey = 'yarn.scheduler.capacity.legacy-queue-mode.enabled';
        result.isLegacyMode = result.globalProperties[legacyModeKey] !== 'false';
    }

    /**
     * Build queue hierarchy from parsed properties
     */
    private static buildQueueHierarchy(properties: ParsedProperty[], result: ParseResult): void {
        // Collect all queue-specific properties
        const queueProperties = properties.filter((p) => !p.isGlobal);
        const queuePropertyMap = new Map<string, Map<string, string>>();
        const allQueuePaths = new Set<string>();

        // Organize properties by queue path and collect all queue paths
        for (const prop of queueProperties) {
            if (!prop.queuePath || !prop.property) continue;

            allQueuePaths.add(prop.queuePath);

            if (!queuePropertyMap.has(prop.queuePath)) {
                queuePropertyMap.set(prop.queuePath, new Map());
            }

            queuePropertyMap.get(prop.queuePath)!.set(prop.property, prop.value);
        }

        // Ensure root queue is included if it has properties or children
        if (
            queuePropertyMap.has(this.ROOT_QUEUE) ||
            [...queueProperties].some((p) => p.property === 'queues' && p.queuePath === this.ROOT_QUEUE)
        ) {
            allQueuePaths.add(this.ROOT_QUEUE);
        }

        // Also ensure we create queues that are declared in .queues properties
        // but might not have any properties themselves
        for (const prop of queueProperties) {
            if (prop.property === 'queues' && prop.value) {
                const parentPath = prop.queuePath!;
                const childNames = prop.value
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0);
                for (const childName of childNames) {
                    const childPath = `${parentPath}.${childName}`;
                    allQueuePaths.add(childPath);
                }
            }
        }

        // Build queue objects
        const queueMap = new Map<string, ParsedQueue>();

        // Create all queue objects (including those without explicit properties)
        for (const queuePath of allQueuePaths) {
            const properties = queuePropertyMap.get(queuePath) || new Map();
            const queue = this.createQueueFromProperties(queuePath, properties);
            queueMap.set(queuePath, queue);
        }

        // Build parent-child relationships
        for (const queue of queueMap.values()) {
            const properties = queuePropertyMap.get(queue.path);
            const queuesProperty = properties?.get('queues');

            if (queuesProperty) {
                const childNames = queuesProperty
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0);

                for (const childName of childNames) {
                    const childPath = `${queue.path}.${childName}`;
                    const childQueue = queueMap.get(childPath);

                    if (childQueue) {
                        childQueue.parent = queue.path;
                        queue.children.push(childQueue);
                    } else {
                        // This should not happen with our two-pass approach
                        result.warnings.push(
                            `Child queue '${childName}' declared in '${queue.path}' but not found in configuration`
                        );
                    }
                }
            }
        }

        // Find root queues (should only be 'root')
        result.queues = Array.from(queueMap.values()).filter((q) => q.path === this.ROOT_QUEUE);

        if (result.queues.length === 0) {
            result.errors.push('No root queue found in configuration');
        } else if (result.queues.length > 1) {
            result.errors.push('Multiple root queues found in configuration');
        }
    }

    /**
     * Create a Queue object from properties
     */
    private static createQueueFromProperties(queuePath: string, properties: Map<string, string>): ParsedQueue {
        const queueName = queuePath.split('.').pop() || queuePath;

        // Parse capacity information
        const capacityStr = properties.get('capacity') || '0';
        const maxCapacityStr = properties.get('maximum-capacity') || '100';

        const capacity = CapacityModeDetector.parseCapacityValue(capacityStr);
        const maxCapacity = CapacityModeDetector.parseCapacityValue(maxCapacityStr);

        // Determine if this is a leaf queue (no children declared)
        const isLeaf = !properties.has('queues');

        const queue: ParsedQueue = {
            name: queueName,
            path: queuePath,
            parent: this.getParentPath(queuePath),
            children: [],
            isLeaf,

            // Capacity information
            capacity,
            maxCapacity,

            // Basic properties with defaults from documentation
            state: (properties.get('state') || 'RUNNING') as 'RUNNING' | 'STOPPED',

            // Resource limits
            maxApplications: parseIntProperty(properties.get('maximum-applications'), -1),
            maxAMResourcePercent: parseNumericProperty(properties.get('maximum-am-resource-percent')),

            // User limits
            minimumUserLimitPercent: parseNumericProperty(properties.get('minimum-user-limit-percent'), 100),
            userLimitFactor: parseNumericProperty(properties.get('user-limit-factor'), 1.0),

            // Application settings
            maxParallelApps: parseIntProperty(properties.get('max-parallel-apps'), Number.MAX_SAFE_INTEGER),
            priority: parseIntProperty(properties.get('priority'), 0),

            // Access control
            submitACL: properties.get('acl_submit_applications') || (queuePath === 'root' ? '*' : ''),
            adminACL: properties.get('acl_administer_queue') || (queuePath === 'root' ? '*' : ''),

            // Node labels
            accessibleNodeLabels: parseStringArray(properties.get('accessible-node-labels')),
            defaultNodeLabelExpression: properties.get('default-node-label-expression'),

            // Preemption
            preemptionDisabled: parseBooleanProperty(properties.get('disable_preemption'), false),
            intraQueuePreemptionDisabled: parseBooleanProperty(
                properties.get('intra-queue-preemption.disable_preemption'),
                false
            ),

            // Raw properties for extensibility
            properties: Object.fromEntries(properties),
        };

        return queue;
    }

    /**
     * Get parent path from queue path
     */
    private static getParentPath(queuePath: string): string | undefined {
        if (queuePath === this.ROOT_QUEUE) {
            return undefined;
        }

        const parts = queuePath.split('.');
        if (parts.length <= 1) {
            return undefined;
        }

        return parts.slice(0, -1).join('.');
    }

    /**
     * Validate the parsed configuration
     */
    private static validateConfiguration(result: ParseResult): void {
        if (result.queues.length === 0) return;

        const rootQueue = result.queues[0];
        this.validateQueueHierarchy(rootQueue, result);

        if (result.isLegacyMode) {
            this.validateLegacyModeConstraints(rootQueue, result);
        }
    }

    /**
     * Validate queue hierarchy structure
     */
    private static validateQueueHierarchy(queue: ParsedQueue, result: ParseResult): void {
        // Validate capacity values
        if (queue.capacity.mode === 'percentage') {
            const value = queue.capacity.numericValue || 0;
            if (value < 0 || value > 100) {
                result.errors.push(`Queue '${queue.path}' has invalid capacity: ${value}%`);
            }
        }

        // Validate children
        for (const child of queue.children) {
            this.validateQueueHierarchy(child, result);
        }
    }

    /**
     * Validate legacy mode constraints
     */
    private static validateLegacyModeConstraints(queue: ParsedQueue, result: ParseResult): void {
        if (queue.children.length === 0) return;

        // In legacy mode, children capacities should sum to 100%
        // (except for auto-created queue templates)
        const childCapacities = queue.children
            .filter((child) => child.capacity.mode === 'percentage')
            .map((child) => child.capacity.numericValue || 0);

        if (childCapacities.length > 0) {
            const sum = childCapacities.reduce((a, b) => a + b, 0);
            if (Math.abs(sum - 100) > 0.01) {
                // Allow small floating point errors
                result.warnings.push(
                    `Legacy mode: Children of '${queue.path}' have capacity sum of ${sum}%, expected 100%`
                );
            }
        }

        // Recursively validate children
        for (const child of queue.children) {
            this.validateLegacyModeConstraints(child, result);
        }
    }

}
