import type { ResourceInfo } from './resource';

export type LabelConfig = {
    name: string;
    capacity?: number;
    maximumCapacity?: number;
    maximumAmResourcePercent?: number;
    isAccessible: boolean;
};

export type NodeLabel = {
    name: string;
    exclusivity: boolean;
    partitionName?: string;
    activeNMs?: number;
    totalResource?: ResourceInfo;
};

export type NodeLabelsInfo = {
    nodeLabelsInfo: Array<{
        name: string;
        exclusivity: boolean;
        activeNMs?: number;
    }>;
};

export type NodeToLabels = {
    nodeToLabels: Record<string, {
        labels: string[];
    }>;
};