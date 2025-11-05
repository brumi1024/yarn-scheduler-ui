import type { ResourceInfo } from './resource';

export type NodeLabel = {
  name: string;
  exclusivity: boolean;
  partitionName?: string;
  activeNMs?: number;
  totalResource?: ResourceInfo;
};
