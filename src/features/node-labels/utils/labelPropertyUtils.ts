import type { PropertyDescriptor, LabelPropertyDescriptor } from '~/types/property-descriptor';
import type { NodeLabel } from '~/types';
import { capacityValueSchema } from '~/config/schemas/validation';

/**
 * Base property definitions for node label properties.
 * These are the template properties that will be generated for each label.
 */
const labelPropertyTemplates = {
  capacity: {
    type: 'string' as const,
    category: 'nodeLabels' as const,
    defaultValue: '',
    required: false,
    validationRules: [
      {
        type: 'custom' as const,
        message:
          'Invalid capacity format. Use percentage (50), weight (2w), or absolute ([memory=1024,vcores=2])',
        validator: (value: string) => {
          if (!value.trim()) return true; // Optional field
          return capacityValueSchema.safeParse(value).success;
        },
      },
    ],
  },
  maximumCapacity: {
    type: 'string' as const,
    category: 'nodeLabels' as const,
    defaultValue: '',
    required: false,
    validationRules: [
      {
        type: 'custom' as const,
        message: 'Invalid maximum capacity format',
        validator: (value: string) => {
          if (!value.trim()) return true;
          if (value === '-1') return true;
          return capacityValueSchema.safeParse(value).success;
        },
      },
    ],
  },
  maximumAmResourcePercent: {
    type: 'number' as const,
    category: 'nodeLabels' as const,
    defaultValue: '',
    required: false,
    validationRules: [
      {
        type: 'range' as const,
        message: 'Must be between 0.0 and 1.0',
        min: 0.0,
        max: 1.0,
      },
    ],
  },
};

/**
 * Generates property descriptors for node label capacity settings.
 * Creates capacity, maximum-capacity, and maximum-am-resource-percent properties for each available label.
 */
export function generateLabelPropertyDescriptors(
  nodeLabels: NodeLabel[],
): LabelPropertyDescriptor[] {
  const labelProperties: LabelPropertyDescriptor[] = [];

  for (const label of nodeLabels) {
    // Capacity property for this label
    labelProperties.push({
      ...labelPropertyTemplates.capacity,
      name: `accessible-node-labels.${label.name}.capacity`,
      displayName: 'Capacity',
      description: `Queue capacity allocation for ${label.name} label. Supports percentage (50), weight (2w), or absolute ([memory=1024,vcores=2]) formats.`,
      label: label.name,
      basePropertyName: 'capacity',
    });

    // Maximum capacity property for this label
    labelProperties.push({
      ...labelPropertyTemplates.maximumCapacity,
      name: `accessible-node-labels.${label.name}.maximum-capacity`,
      displayName: 'Maximum Capacity',
      description: `Maximum capacity the queue can expand to on ${label.name} label. Must be >= capacity. Use -1 for unlimited.`,
      label: label.name,
      basePropertyName: 'maximum-capacity',
    });

    // Maximum AM resource percent property for this label
    labelProperties.push({
      ...labelPropertyTemplates.maximumAmResourcePercent,
      name: `accessible-node-labels.${label.name}.maximum-am-resource-percent`,
      displayName: 'Maximum AM Resource Percent',
      description: `Maximum percentage of ${label.name} label resources for Application Masters (0.0-1.0).`,
      label: label.name,
      basePropertyName: 'maximum-am-resource-percent',
    });
  }

  return labelProperties;
}

/**
 * Groups label properties by label name for UI display.
 */
export function groupLabelPropertiesByLabel(
  labelProperties: LabelPropertyDescriptor[],
): Record<string, LabelPropertyDescriptor[]> {
  return labelProperties.reduce(
    (groups, property) => {
      const { label } = property;
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(property);
      return groups;
    },
    {} as Record<string, LabelPropertyDescriptor[]>,
  );
}

/**
 * Checks if a property name represents a label property.
 */
export function isLabelProperty(propertyName: string): boolean {
  return propertyName.startsWith('accessible-node-labels.');
}

/**
 * Extracts the label name from a label property name.
 * e.g., 'accessible-node-labels.gpu.capacity' -> 'gpu'
 */
export function extractLabelFromPropertyName(propertyName: string): string | null {
  const match = propertyName.match(/^accessible-node-labels\.([^.]+)\./);
  return match ? match[1] : null;
}

/**
 * Extracts the base property name from a label property name.
 * e.g., 'accessible-node-labels.gpu.capacity' -> 'capacity'
 */
export function extractBasePropertyFromLabelProperty(propertyName: string): string | null {
  const parts = propertyName.split('.');
  if (parts.length >= 3 && parts[0] === 'accessible-node-labels') {
    return parts.slice(2).join('.'); // Handle nested properties like 'accessible-node-labels.gpu.some.nested.property'
  }
  return null;
}
