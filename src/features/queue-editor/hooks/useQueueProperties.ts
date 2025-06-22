// src/features/queue-editor/hooks/useQueueProperties.ts
import { useMemo } from 'react';
import { DynamicPropertyResolver, PropertyDefinition } from '../../../config';
import type { ParsedQueue } from '../../../types/Queue';

/**
 * Hook to get all properties (static + dynamic) for a queue
 * @param queue The parsed queue object
 * @returns All applicable properties for this queue
 */
export function useQueueProperties(queue: ParsedQueue | null) {
    const properties = useMemo(() => {
        if (!queue) {
            return {};
        }

        // Get all properties including dynamic ones
        return DynamicPropertyResolver.getAllPropertiesForQueue(queue);
    }, [queue]);

    // Group properties by their group field
    const groupedProperties = useMemo(() => {
        const groups: Record<string, PropertyDefinition[]> = {
            'core': [],
            'resource': [],
            'security': [],
            'advanced': [],
            'auto-creation': [],
        };

        Object.values(properties).forEach(prop => {
            if (groups[prop.group]) {
                groups[prop.group].push(prop);
            }
        });

        return groups;
    }, [properties]);

    // Get properties for a specific node label
    const getNodeLabelProperties = (label: string) => {
        return Object.entries(properties)
            .filter(([key]) => key.includes(`accessible-node-labels.${label}`))
            .map(([_, prop]) => prop);
    };

    // Get template properties by type
    const getTemplateProperties = (templateType: 'template' | 'leaf-template' | 'parent-template') => {
        return Object.entries(properties)
            .filter(([key]) => key.includes(`auto-queue-creation-v2.${templateType}`))
            .map(([_, prop]) => prop);
    };

    return {
        allProperties: properties,
        groupedProperties,
        getNodeLabelProperties,
        getTemplateProperties,
    };
}