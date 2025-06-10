import { Resource } from './Queue';

export interface NodeLabel {
  name: string;
  exclusivity: boolean;
  partitionInfo?: {
    resourceAvailable: Resource;
    resourceTotal: Resource;
    resourceUtilization?: Resource;
  };
}

export interface NodeLabelsResponse {
  nodeLabelsInfo: {
    nodeLabelInfo: NodeLabel[];
  };
}

export interface NodeToLabelsMapping {
  nodeId: string;
  nodeLabels: string[];
}

export interface NodeToLabelsResponse {
  nodeToLabelsInfo: {
    nodeToLabels: NodeToLabelsMapping[];
  };
}

export interface LabelsToNodesMapping {
  nodeLabels: string[];
  nodeId: string[];
}

export interface LabelsToNodesResponse {
  labelsToNodesInfo: {
    labelsToNodes: LabelsToNodesMapping[];
  };
}

export interface AddNodeLabelsRequest {
  nodeLabelsInfo: {
    nodeLabelInfo: Array<{
      name: string;
      exclusivity: boolean;
    }>;
  };
}

export interface ReplaceNodeLabelsRequest {
  nodeToLabelsEntryList: {
    nodeToLabels: NodeToLabelsMapping[];
  };
}

export interface ClusterNode {
  id: string;
  rack: string;
  state: 'NEW' | 'RUNNING' | 'UNHEALTHY' | 'DECOMMISSIONING' | 'DECOMMISSIONED' | 'LOST' | 'REBOOTED' | 'SHUTDOWN';
  nodeHostName: string;
  nodeHTTPAddress: string;
  lastHealthUpdate: number;
  version: string;
  healthReport: string;
  numContainers: number;
  usedMemoryMB: number;
  availMemoryMB: number;
  usedVirtualCores: number;
  availableVirtualCores: number;
  memUtilization: number;
  cpuUtilization: number;
  nodeLabels: string[];
  resourceUtilization?: {
    nodePhysicalMemoryMB: number;
    nodeVirtualMemoryMB: number;
    nodeCPUUsage: number;
    aggregatedContainersPhysicalMemoryMB: number;
    aggregatedContainersVirtualMemoryMB: number;
    containersCPUUsage: number;
  };
  usedResource: Resource;
  availableResource: Resource;
  totalResource: Resource;
}

export interface NodesResponse {
  nodes: {
    node: ClusterNode[];
  };
}