// src/config/dynamicProperties.ts
// import { z } from 'zod';
import { PropertyDefinition, capacityValueSchema, QUEUE_PROPERTIES } from './queueProperties';
import type { ParsedQueue } from '../types/Queue';

/**
 * Resolves dynamic properties based on queue configuration.
 * These properties only appear when certain conditions are met.
 */
export class DynamicPropertyResolver {
    /**
     * Generate properties for each configured node label
     * @param nodeLabels Array of node label names
     * @returns Record of dynamic property definitions
     */
    static resolveNodeLabelProperties(
        nodeLabels: string[]
    ): Record<string, PropertyDefinition> {
        const properties: Record<string, PropertyDefinition> = {};

        nodeLabels.forEach(label => {
            // Capacity property for this label
            const capacityKey = `accessible-node-labels.${label}.capacity`;
            properties[capacityKey] = {
                key: capacityKey,
                label: `${label} Label Capacity`,
                type: 'capacity',
                defaultValue: '0%',
                description: `Queue capacity for node label "${label}". Sum of child capacities must equal 100% in legacy mode.`,
                validation: capacityValueSchema,
                group: 'resource',
                getValueFromQueue: (q) => {
                    // Look for the property in raw queue data
                    const labelCapacities = q['accessible-node-labels.capacity'] || {};
                    return labelCapacities[label] || '0%';
                },
            };

            // Maximum capacity property for this label
            const maxCapacityKey = `accessible-node-labels.${label}.maximum-capacity`;
            properties[maxCapacityKey] = {
                key: maxCapacityKey,
                label: `${label} Label Max Capacity`,
                type: 'capacity',
                defaultValue: '100%',
                description: `Maximum capacity for node label "${label}". Must be >= capacity.`,
                validation: capacityValueSchema,
                group: 'resource',
                getValueFromQueue: (q) => {
                    const labelMaxCapacities = q['accessible-node-labels.maximum-capacity'] || {};
                    return labelMaxCapacities[label] || '100%';
                },
            };
        });

        return properties;
    }

    /**
     * Generate template properties for auto-queue creation
     * @param queuePath The path of the parent queue
     * @param templateType Type of template (template, leaf-template, parent-template)
     * @returns Record of dynamic property definitions
     */
    static resolveTemplateProperties(
        queuePath: string,
        templateType: 'template' | 'leaf-template' | 'parent-template'
    ): Record<string, PropertyDefinition> {
        const properties: Record<string, PropertyDefinition> = {};
        const prefix = `auto-queue-creation-v2.${templateType}`;

        // For each standard queue property, create a template version
        Object.entries(QUEUE_PROPERTIES).forEach(([key, prop]) => {
            // Skip properties that don't make sense for templates
            if (key === 'queues' || key === 'state') return;

            const templateKey = `${prefix}.${key}`;
            properties[templateKey] = {
                ...prop, // Copy all property settings
                key: templateKey,
                label: `Template ${prop.label}`,
                description: `${prop.description} (Applied to auto-created queues)`,
                group: 'auto-creation',
                // Adjust the getValueFromQueue function
                getValueFromQueue: (q) => {
                    const templateData = q[prefix] || {};
                    return templateData[key] || prop.defaultValue;
                },
            };
        });

        return properties;
    }

    /**
     * Get all dynamic properties for a queue
     * @param queue The parsed queue object
     * @returns Combined static and dynamic properties
     */
    static getAllPropertiesForQueue(queue: ParsedQueue): Record<string, PropertyDefinition> {
        const dynamicProps: Record<string, PropertyDefinition> = {};

        // Add node label properties if queue has accessible labels
        if (queue.accessibleNodeLabels && queue.accessibleNodeLabels.length > 0) {
            Object.assign(
                dynamicProps,
                this.resolveNodeLabelProperties(queue.accessibleNodeLabels)
            );
        }

        // Add template properties if auto-creation v2 is enabled
        const autoCreationEnabled = queue.rawConfig?.['auto-queue-creation-v2.enabled'] === 'true';
        if (autoCreationEnabled) {
            // Add all three template types
            Object.assign(
                dynamicProps,
                this.resolveTemplateProperties(queue.path, 'template')
            );
            Object.assign(
                dynamicProps,
                this.resolveTemplateProperties(queue.path, 'leaf-template')
            );
            Object.assign(
                dynamicProps,
                this.resolveTemplateProperties(queue.path, 'parent-template')
            );
        }

        // Combine with static properties
        return { ...QUEUE_PROPERTIES, ...dynamicProps };
    }
}