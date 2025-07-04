import { queuePropertyDefinitions } from './queue-properties';
import type { PropertyDescriptor, PropertyCategory } from '~/types';

export function getPropertiesByCategory(category: PropertyCategory): PropertyDescriptor[] {
  return queuePropertyDefinitions.filter((prop) => prop.category === category);
}

export function getPropertyCategories(): PropertyCategory[] {
  return ['general', 'resource', 'scheduling', 'limits', 'security', 'advanced'];
}

export function getPropertyDefinition(name: string): PropertyDescriptor | undefined {
  return queuePropertyDefinitions.find((prop) => prop.name === name);
}
