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
  nodeLabelInfo: Array<{
    name: string;
    exclusivity: boolean | 'true' | 'false';
    activeNMs?: number;
    partitionInfo?: unknown;
  }>;
};

export type NodeToLabels = {
  nodeToLabels: Array<{
    nodeId: string;
    nodeLabels: string[];
  }>;
};
