import type { ResourceInfo } from './resource';

export type NodeState = 'RUNNING' | 'SHUTDOWN' | 'UNHEALTHY' | 'REBOOTED' | 'LOST' | 'NEW';

export type NodeInfo = {
    id: string;
    rack: string;
    state: NodeState;
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
    numRunningOpportContainers: number;
    usedMemoryOpportGB: number;
    usedVirtualCoresOpport: number;
    numQueuedContainers: number;
    nodeLabels: string[];
    allocationTags: Record<string, unknown>;
    resourceUtilization?: {
        nodePhysicalMemoryMB: number;
        nodeVirtualMemoryMB: number;
        nodeCPUUsage: number;
        aggregatedContainersPhysicalMemoryMB: number;
        aggregatedContainersVirtualMemoryMB: number;
        containersCPUUsage: number;
    };
    usedResource: ResourceInfo;
    availableResource: ResourceInfo;
    nodeAttributesInfo: Record<string, unknown>;
};

export type NodesResponse = {
    nodes: {
        node: NodeInfo[];
    };
};

export type NodeToLabelMapping = {
    nodeId: string;
    nodeLabels: string[];
};

