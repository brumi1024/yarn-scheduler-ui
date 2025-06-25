import { z } from 'zod';

/**
 * Validation severity levels.
 * - error: Prevents configuration from being applied
 * - warning: Potential issues but configuration can proceed
 * - info: Informational messages and suggestions
 */
export const ValidationSeveritySchema = z.enum(['error', 'warning', 'info']);

/**
 * Types of validation rules.
 * Each rule type checks specific configuration constraints.
 * 
 * - capacity-sum: Ensures child queue capacities sum to 100%
 * - max-capacity: Validates maximum capacity >= capacity
 * - queue-name: Checks queue naming conventions
 * - resource-limit: Validates resource allocation limits
 * - acl-format: Verifies ACL string formats
 * - queue-state: Validates state transitions
 * - node-label-capacity: Checks node-label specific capacities
 * - application-lifetime: Validates application lifetime settings
 * - custom: User-defined validation rules
 */
export const ValidationRuleTypeSchema = z.enum([
  'capacity-sum',
  'max-capacity',
  'queue-name',
  'resource-limit',
  'acl-format',
  'queue-state',
  'node-label-capacity',
  'application-lifetime',
  'custom'
]);

/**
 * Validation issue details.
 * Represents a single validation problem found in the configuration.
 * 
 * @example
 * ```typescript
 * const capacityError: ValidationIssue = {
 *   path: "root.production",
 *   message: "Child queue capacities sum to 95%, expected 100%",
 *   severity: "error",
 *   rule: "capacity-sum",
 *   field: "capacity",
 *   suggestion: "Add 5% to one of the child queues",
 *   autoFixable: true
 * };
 * ```
 */
export const ValidationIssueSchema = z.object({
  /** Queue or property path where issue was found */
  path: z.string(),
  /** Human-readable error message */
  message: z.string(),
  /** Issue severity level */
  severity: ValidationSeveritySchema,
  /** Validation rule that triggered this issue */
  rule: ValidationRuleTypeSchema,
  /** Specific field/property name (optional) */
  field: z.string().optional(),
  /** Suggested fix for the issue */
  suggestion: z.string().optional(),
  /** Whether this can be automatically fixed */
  autoFixable: z.boolean().optional()
});

/**
 * Context provided to validation rules.
 * Contains all data needed to validate the configuration.
 * 
 * @example
 * ```typescript
 * const context: ValidationContext = {
 *   configuration: {
 *     "yarn.scheduler.capacity.root.capacity": "100",
 *     "yarn.scheduler.capacity.root.production.capacity": "70"
 *   },
 *   queues: [rootQueue, productionQueue, developmentQueue],
 *   nodeLabels: ["gpu", "ssd", "cpu"],
 *   legacyMode: false
 * };
 * ```
 */
export const ValidationContextSchema = z.object({
  /** Full configuration as key-value pairs */
  configuration: z.record(z.string(), z.unknown()),
  /** Queue hierarchy (array of QueueNode objects) */
  queues: z.array(z.any()), // Will use QueueNode type in practice
  /** Available node labels */
  nodeLabels: z.array(z.string()).optional(),
  /** Whether running in legacy compatibility mode */
  legacyMode: z.boolean().optional()
});

/**
 * Complete validation result.
 * Aggregates all validation issues by severity.
 * 
 * @example
 * ```typescript
 * const result: ValidationResult = {
 *   errors: [
 *     { path: "root.prod", message: "Invalid capacity", severity: "error", rule: "capacity-sum" }
 *   ],
 *   warnings: [
 *     { path: "root.dev", message: "Low capacity", severity: "warning", rule: "max-capacity" }
 *   ],
 *   info: [
 *     { path: "root", message: "Consider using node labels", severity: "info", rule: "custom" }
 *   ],
 *   isValid: false  // Has errors
 * };
 * ```
 */
export const ValidationResultSchema = z.object({
  /** Blocking errors */
  errors: z.array(ValidationIssueSchema),
  /** Non-blocking warnings */
  warnings: z.array(ValidationIssueSchema),
  /** Informational messages */
  info: z.array(ValidationIssueSchema),
  /** Whether configuration is valid (no errors) */
  isValid: z.boolean()
});

/**
 * Validation rule definition.
 * Defines a validation rule that can be applied to configurations.
 * 
 * @example
 * ```typescript
 * const capacitySumRule: ValidationRuleDefinition = {
 *   type: "capacity-sum",
 *   name: "Child Capacity Sum Validation",
 *   description: "Ensures child queue capacities sum to exactly 100%",
 *   severity: "error",
 *   enabled: true,
 *   params: {
 *     tolerance: 0.01  // Allow 0.01% deviation
 *   }
 * };
 * ```
 */
export const ValidationRuleDefinitionSchema = z.object({
  /** Rule type identifier */
  type: ValidationRuleTypeSchema,
  /** Human-readable rule name */
  name: z.string(),
  /** Rule description */
  description: z.string(),
  /** Default severity for issues from this rule */
  severity: ValidationSeveritySchema,
  /** Whether rule is active */
  enabled: z.boolean(),
  /** Rule-specific parameters */
  params: z.record(z.string(), z.unknown()).optional()
});

// Type exports
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>;
export type ValidationRuleType = z.infer<typeof ValidationRuleTypeSchema>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type ValidationContext = z.infer<typeof ValidationContextSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type ValidationRuleDefinition = z.infer<typeof ValidationRuleDefinitionSchema>;