import { z } from 'zod';

// Property change tracking
export const PropertyChangeSchema = z.object({
  originalValue: z.unknown(),
  stagedValue: z.unknown(),
  timestamp: z.date().optional()
});

// Node label assignment tracking
export const NodeLabelAssignmentSchema = z.object({
  nodeId: z.string(),
  originalLabels: z.array(z.string()),
  stagedLabels: z.array(z.string())
});

// Change tracking types for undo/redo
export const ChangeTypeSchema = z.enum(['property', 'queue-add', 'queue-remove', 'node-label']);

export const ChangeSetSchema = z.object({
  id: z.string(),
  type: ChangeTypeSchema,
  path: z.string(),
  timestamp: z.date(),
  change: z.union([
    PropertyChangeSchema,
    NodeLabelAssignmentSchema,
    z.object({
      action: z.enum(['add', 'remove']),
      queuePath: z.string(),
      queueData: z.any().optional()
    })
  ])
});

// Type exports
export type PropertyChange = z.infer<typeof PropertyChangeSchema>;
export type NodeLabelAssignment = z.infer<typeof NodeLabelAssignmentSchema>;
export type ChangeType = z.infer<typeof ChangeTypeSchema>;
export type ChangeSet = z.infer<typeof ChangeSetSchema>;