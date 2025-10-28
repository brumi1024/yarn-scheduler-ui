import React from 'react';
import { Settings, HardDrive, Gauge, Calendar, Shield, Sliders } from 'lucide-react';
import type { PropertyCategory } from '~/types';

export const categoryConfig: Record<
  PropertyCategory,
  {
    label: string;
    description: string;
    defaultExpanded: boolean;
    icon: React.ReactElement;
  }
> = {
  general: {
    label: 'General Configuration',
    description: 'Basic queue settings including capacity, state, and hierarchy',
    defaultExpanded: true,
    icon: <Settings className="h-4 w-4 text-primary" />,
  },
  resource: {
    label: 'Resource Allocation',
    description: 'Memory, CPU, and other resource allocation settings',
    defaultExpanded: false,
    icon: <HardDrive className="h-4 w-4 text-primary" />,
  },
  limits: {
    label: 'Application Limits',
    description: 'User limits, application counts, and resource constraints',
    defaultExpanded: false,
    icon: <Gauge className="h-4 w-4 text-primary" />,
  },
  scheduling: {
    label: 'Scheduling Policy',
    description: 'Application ordering and priority settings',
    defaultExpanded: false,
    icon: <Calendar className="h-4 w-4 text-primary" />,
  },
  security: {
    label: 'Security & Access Control',
    description: 'User and group access permissions (ACLs)',
    defaultExpanded: false,
    icon: <Shield className="h-4 w-4 text-primary" />,
  },
  advanced: {
    label: 'Advanced Features',
    description: 'Preemption, auto-queue creation, and other advanced settings',
    defaultExpanded: false,
    icon: <Sliders className="h-4 w-4 text-primary" />,
  },
};

export const baseCategoryOrder: PropertyCategory[] = [
  'general',
  'resource',
  'limits',
  'scheduling',
  'security',
  'advanced',
];
