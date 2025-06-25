import { z } from 'zod';

/**
 * Property data types for configuration values.
 * - string: Text values
 * - number: Numeric values (integers or decimals)
 * - percentage: Percentage values (0-100)
 * - boolean: True/false values
 * - select: Enumerated values from a list
 * - memory: Memory size values (MB, GB, etc.)
 * - vcores: Virtual CPU core counts
 * - resource: Complex resource specifications
 */
export const PropertyTypeSchema = z.enum([
  'string',
  'number',
  'percentage',
  'boolean',
  'select',
  'memory',
  'vcores',
  'resource'
]);

/**
 * UI component types for rendering properties.
 * Maps property types to appropriate UI controls.
 * - input: Text input field
 * - slider: Numeric slider with min/max
 * - select: Dropdown selection
 * - switch: Boolean toggle
 * - textarea: Multi-line text input
 * - resource-editor: Complex resource allocation UI
 */
export const UIComponentSchema = z.enum([
  'input',
  'slider',
  'select',
  'switch',
  'textarea',
  'resource-editor'
]);

/**
 * Validation rules for property values.
 * Defines constraints that values must satisfy.
 * 
 * @example
 * ```typescript
 * const capacityValidation: PropertyValidation = {
 *   required: true,
 *   min: 0,
 *   max: 100,
 *   pattern: "^\\d+(\\.\\d+)?$"  // Numeric string
 * };
 * ```
 */
export const PropertyValidationSchema = z.object({
  /** Whether the property is required */
  required: z.boolean().optional(),
  /** Minimum numeric value */
  min: z.number().optional(),
  /** Maximum numeric value */
  max: z.number().optional(),
  /** Minimum string length */
  minLength: z.number().optional(),
  /** Maximum string length */
  maxLength: z.number().optional(),
  /** Regex pattern for string validation */
  pattern: z.string().optional(),
  /** Valid options for select properties */
  options: z.array(z.string()).optional(),
  /** Name of custom validation function */
  custom: z.string().optional()
});

/**
 * UI rendering configuration for properties.
 * Controls how properties are displayed in the interface.
 * 
 * @example
 * ```typescript
 * const sliderUI: PropertyUIConfig = {
 *   component: "slider",
 *   suffix: "%",
 *   step: 0.1,
 *   placeholder: "Enter percentage"
 * };
 * ```
 */
export const PropertyUIConfigSchema = z.object({
  /** UI component to render */
  component: UIComponentSchema,
  /** Text suffix (e.g., "%", "MB") */
  suffix: z.string().optional(),
  /** Text prefix (e.g., "$") */
  prefix: z.string().optional(),
  /** Placeholder text for inputs */
  placeholder: z.string().optional(),
  /** Step size for numeric inputs */
  step: z.number().optional(),
  /** Enable multi-line for textareas */
  multiline: z.boolean().optional(),
  /** Number of rows for textareas */
  rows: z.number().optional()
});

/**
 * Property grouping for UI organization.
 * Groups related properties together in the interface.
 * - capacity: Queue capacity and allocation
 * - scheduling: Scheduling policies and priorities
 * - security: ACLs and access control
 * - resources: Resource limits and allocations
 * - advanced: Advanced/expert settings
 * - node-labels: Node label specific settings
 * - auto-creation: Auto queue creation policies
 */
export const PropertyGroupSchema = z.enum([
  'capacity',
  'scheduling',
  'security',
  'resources',
  'advanced',
  'node-labels',
  'auto-creation'
]);

/**
 * Complete property definition metadata.
 * Defines everything needed to render and validate a configuration property.
 * 
 * @example
 * ```typescript
 * const capacityProperty: PropertyDefinition = {
 *   key: "capacity",
 *   path: "yarn.scheduler.capacity.{queue}.capacity",
 *   label: "Queue Capacity",
 *   description: "The percentage of cluster resources allocated to this queue",
 *   type: "percentage",
 *   group: "capacity",
 *   validation: {
 *     required: true,
 *     min: 0,
 *     max: 100
 *   },
 *   ui: {
 *     component: "slider",
 *     suffix: "%",
 *     step: 0.1
 *   },
 *   defaultValue: 0,
 *   isDynamic: false,
 *   visible: true
 * };
 * 
 * // Dynamic property example (node-label specific)
 * const nodeLabelCapacity: PropertyDefinition = {
 *   key: "accessible-node-labels.{label}.capacity",
 *   path: "yarn.scheduler.capacity.{queue}.accessible-node-labels.{label}.capacity",
 *   label: "Capacity for {label}",
 *   description: "Queue capacity for specific node label",
 *   type: "percentage",
 *   group: "node-labels",
 *   isDynamic: true,  // Indicates {label} is dynamic
 *   // ... other fields
 * };
 * ```
 */
export const PropertyDefinitionSchema = z.object({
  /** Unique property key */
  key: z.string(),
  /** Full configuration path with placeholders */
  path: z.string(),
  /** Display label */
  label: z.string(),
  /** Help text/description */
  description: z.string(),
  /** Data type */
  type: PropertyTypeSchema,
  /** UI grouping */
  group: PropertyGroupSchema,
  /** Validation rules */
  validation: PropertyValidationSchema.optional(),
  /** UI rendering config */
  ui: PropertyUIConfigSchema,
  /** Default value if not set */
  defaultValue: z.unknown().optional(),
  /** Whether this has dynamic segments like {label} */
  isDynamic: z.boolean().optional(),
  /** Other property keys this depends on */
  dependsOn: z.array(z.string()).optional(),
  /** Whether to show in UI */
  visible: z.boolean().optional(),
  /** Whether property is deprecated */
  deprecated: z.boolean().optional(),
  /** Deprecation warning message */
  deprecationMessage: z.string().optional()
});

/**
 * Collection of property definitions.
 * Typically loaded from JSON configuration files.
 */
export const PropertyDefinitionsSchema = z.array(PropertyDefinitionSchema);

// Type exports
export type PropertyType = z.infer<typeof PropertyTypeSchema>;
export type UIComponent = z.infer<typeof UIComponentSchema>;
export type PropertyValidation = z.infer<typeof PropertyValidationSchema>;
export type PropertyUIConfig = z.infer<typeof PropertyUIConfigSchema>;
export type PropertyGroup = z.infer<typeof PropertyGroupSchema>;
export type PropertyDefinition = z.infer<typeof PropertyDefinitionSchema>;
export type PropertyDefinitions = z.infer<typeof PropertyDefinitionsSchema>;