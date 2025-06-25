import { z } from 'zod';

/**
 * Tracks changes to a single configuration property.
 * Used for staging changes before committing to YARN.
 *
 * @example
 * ```typescript
 * const capacityChange: PropertyChange = {
 *   originalValue: "25.0",
 *   stagedValue: "30.0",
 *   timestamp: new Date()
 * };
 * ```
 */
export const PropertyChangeSchema = z.object({
    /** The original value from the server/configuration */
    originalValue: z.unknown(),
    /** The new value staged by the user */
    stagedValue: z.unknown(),
    /** When the change was made */
    timestamp: z.date().optional(),
});

/**
 * Tracks node label assignment changes.
 * Monitors which labels are assigned to which nodes.
 *
 * @example
 * ```typescript
 * const labelChange: NodeLabelAssignment = {
 *   nodeId: "node-123.cluster.local",
 *   originalLabels: ["cpu"],
 *   stagedLabels: ["cpu", "gpu", "ssd"]
 * };
 * ```
 */
export const NodeLabelAssignmentSchema = z.object({
    /** The node identifier */
    nodeId: z.string(),
    /** Original labels assigned to the node */
    originalLabels: z.array(z.string()),
    /** New labels to be assigned */
    stagedLabels: z.array(z.string()),
});

/**
 * Types of changes that can be tracked.
 * - property: Configuration property change
 * - queue-add: New queue added
 * - queue-remove: Queue marked for deletion
 * - node-label: Node label assignment change
 */
export const ChangeTypeSchema = z.enum(['property', 'queue-add', 'queue-remove', 'node-label']);

/**
 * Complete change set for undo/redo functionality.
 * Represents a single atomic change that can be reverted.
 *
 * @example
 * ```typescript
 * // Property change
 * const propChange: ChangeSet = {
 *   id: "change-123",
 *   type: "property",
 *   path: "yarn.scheduler.capacity.root.production.capacity",
 *   timestamp: new Date(),
 *   change: {
 *     originalValue: "50.0",
 *     stagedValue: "60.0"
 *   }
 * };
 *
 * // Queue addition
 * const queueAdd: ChangeSet = {
 *   id: "change-124",
 *   type: "queue-add",
 *   path: "root.production.analytics",
 *   timestamp: new Date(),
 *   change: {
 *     action: "add",
 *     queuePath: "root.production.analytics",
 *     queueData: { capacity: "10.0", state: "RUNNING" }
 *   }
 * };
 * ```
 */
export const ChangeSetSchema = z.object({
    /** Unique identifier for this change */
    id: z.string(),
    /** Type of change */
    type: ChangeTypeSchema,
    /** Path affected by this change */
    path: z.string(),
    /** When the change was made */
    timestamp: z.date(),
    /** The actual change data (varies by type) */
    change: z.union([
        PropertyChangeSchema,
        NodeLabelAssignmentSchema,
        z.object({
            action: z.enum(['add', 'remove']),
            queuePath: z.string(),
            queueData: z.any().optional(),
        }),
    ]),
});

// Type exports
export type PropertyChange = z.infer<typeof PropertyChangeSchema>;
export type NodeLabelAssignment = z.infer<typeof NodeLabelAssignmentSchema>;
export type ChangeType = z.infer<typeof ChangeTypeSchema>;
export type ChangeSet = z.infer<typeof ChangeSetSchema>;
