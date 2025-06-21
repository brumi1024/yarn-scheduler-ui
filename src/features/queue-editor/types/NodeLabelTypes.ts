import type { Queue } from '../../../types/Queue';

export interface QueueWithLabelInfo extends Queue {
    hasLabelAccess: boolean;
    labelCapacity?: number;
    labelMaxCapacity?: number;
    isLabelCapacityConfigured: boolean;
    isLabelMaxCapacityConfigured: boolean;
    effectiveCapacity: number;
    effectiveMaxCapacity: number;
}

export interface NodeLabelCapacityInfo {
    label: string;
    capacity: number;
    maxCapacity?: number;
    isConfigured: boolean;
    isInherited: boolean;
}