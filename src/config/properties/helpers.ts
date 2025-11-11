import { queuePropertyDefinitions } from './queue-properties';
import type { PropertyDescriptor, PropertyCategory } from '~/types';

export function getPropertiesByCategory(category: PropertyCategory): PropertyDescriptor[] {
  return queuePropertyDefinitions.filter((prop) => prop.category === category);
}

export function getTemplatePropertyDefinitions(): PropertyDescriptor[] {
  return queuePropertyDefinitions.filter((prop) => prop.templateSupport);
}

export function getTemplatePropertiesByCategory(category: PropertyCategory): PropertyDescriptor[] {
  return queuePropertyDefinitions.filter(
    (prop) => prop.category === category && prop.templateSupport,
  );
}

export function getPropertyCategories(): PropertyCategory[] {
  return [
    'capacity',
    'resource',
    'application-limits',
    'dynamic-queues',
    'node-labels',
    'scheduling',
    'security',
    'preemption',
  ];
}

export function getPropertyDefinition(name: string): PropertyDescriptor | undefined {
  return queuePropertyDefinitions.find((prop) => prop.name === name);
}
