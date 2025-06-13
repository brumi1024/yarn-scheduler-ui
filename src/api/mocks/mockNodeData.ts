import type { NodeLabelsResponse, NodesResponse } from '../../types/NodeLabel';

export const mockNodeLabelsData: NodeLabelsResponse = {
    nodeLabelsInfo: {
        nodeLabelInfo: [
            {
                name: 'gpu',
                exclusivity: true,
                partitionInfo: {
                    resourceAvailable: {
                        memory: 16384,
                        vCores: 8,
                    },
                    resourceTotal: {
                        memory: 32768,
                        vCores: 16,
                    },
                    resourceUtilization: {
                        memory: 16384,
                        vCores: 8,
                    },
                },
            },
            {
                name: 'high-memory',
                exclusivity: false,
                partitionInfo: {
                    resourceAvailable: {
                        memory: 65536,
                        vCores: 12,
                    },
                    resourceTotal: {
                        memory: 131072,
                        vCores: 24,
                    },
                    resourceUtilization: {
                        memory: 65536,
                        vCores: 12,
                    },
                },
            },
            {
                name: 'ssd',
                exclusivity: false,
                partitionInfo: {
                    resourceAvailable: {
                        memory: 8192,
                        vCores: 4,
                    },
                    resourceTotal: {
                        memory: 16384,
                        vCores: 8,
                    },
                    resourceUtilization: {
                        memory: 8192,
                        vCores: 4,
                    },
                },
            },
        ],
    },
};

export const mockNodesData: NodesResponse = {
    nodes: {
        node: [
            {
                id: 'worker1.example.com:8041',
                rack: '/default-rack',
                state: 'RUNNING',
                nodeHostName: 'worker1.example.com',
                nodeHTTPAddress: 'worker1.example.com:8042',
                lastHealthUpdate: Date.now() - 30000,
                version: '3.3.1',
                healthReport: 'Healthy',
                numContainers: 5,
                usedMemoryMB: 8192,
                availMemoryMB: 24576,
                usedVirtualCores: 4,
                availableVirtualCores: 12,
                memUtilization: 25.0,
                cpuUtilization: 25.0,
                nodeLabels: ['gpu', 'high-memory'],
                resourceUtilization: {
                    nodePhysicalMemoryMB: 32768,
                    nodeVirtualMemoryMB: 32768,
                    nodeCPUUsage: 25.0,
                    aggregatedContainersPhysicalMemoryMB: 8192,
                    aggregatedContainersVirtualMemoryMB: 8192,
                    containersCPUUsage: 25.0,
                },
                usedResource: {
                    memory: 8192,
                    vCores: 4,
                },
                availableResource: {
                    memory: 24576,
                    vCores: 12,
                },
                totalResource: {
                    memory: 32768,
                    vCores: 16,
                },
            },
            {
                id: 'worker2.example.com:8041',
                rack: '/default-rack',
                state: 'RUNNING',
                nodeHostName: 'worker2.example.com',
                nodeHTTPAddress: 'worker2.example.com:8042',
                lastHealthUpdate: Date.now() - 15000,
                version: '3.3.1',
                healthReport: 'Healthy',
                numContainers: 3,
                usedMemoryMB: 4096,
                availMemoryMB: 12288,
                usedVirtualCores: 2,
                availableVirtualCores: 6,
                memUtilization: 25.0,
                cpuUtilization: 25.0,
                nodeLabels: ['ssd'],
                resourceUtilization: {
                    nodePhysicalMemoryMB: 16384,
                    nodeVirtualMemoryMB: 16384,
                    nodeCPUUsage: 25.0,
                    aggregatedContainersPhysicalMemoryMB: 4096,
                    aggregatedContainersVirtualMemoryMB: 4096,
                    containersCPUUsage: 25.0,
                },
                usedResource: {
                    memory: 4096,
                    vCores: 2,
                },
                availableResource: {
                    memory: 12288,
                    vCores: 6,
                },
                totalResource: {
                    memory: 16384,
                    vCores: 8,
                },
            },
            {
                id: 'worker3.example.com:8041',
                rack: '/default-rack',
                state: 'RUNNING',
                nodeHostName: 'worker3.example.com',
                nodeHTTPAddress: 'worker3.example.com:8042',
                lastHealthUpdate: Date.now() - 45000,
                version: '3.3.1',
                healthReport: 'Healthy',
                numContainers: 2,
                usedMemoryMB: 2048,
                availMemoryMB: 6144,
                usedVirtualCores: 1,
                availableVirtualCores: 3,
                memUtilization: 25.0,
                cpuUtilization: 12.5,
                nodeLabels: [],
                resourceUtilization: {
                    nodePhysicalMemoryMB: 8192,
                    nodeVirtualMemoryMB: 8192,
                    nodeCPUUsage: 12.5,
                    aggregatedContainersPhysicalMemoryMB: 2048,
                    aggregatedContainersVirtualMemoryMB: 2048,
                    containersCPUUsage: 12.5,
                },
                usedResource: {
                    memory: 2048,
                    vCores: 1,
                },
                availableResource: {
                    memory: 6144,
                    vCores: 3,
                },
                totalResource: {
                    memory: 8192,
                    vCores: 4,
                },
            },
            {
                id: 'worker4.example.com:8041',
                rack: '/rack-2',
                state: 'UNHEALTHY',
                nodeHostName: 'worker4.example.com',
                nodeHTTPAddress: 'worker4.example.com:8042',
                lastHealthUpdate: Date.now() - 300000,
                version: '3.3.1',
                healthReport: 'Node manager not responding',
                numContainers: 0,
                usedMemoryMB: 0,
                availMemoryMB: 0,
                usedVirtualCores: 0,
                availableVirtualCores: 0,
                memUtilization: 0,
                cpuUtilization: 0,
                nodeLabels: ['high-memory'],
                resourceUtilization: {
                    nodePhysicalMemoryMB: 65536,
                    nodeVirtualMemoryMB: 65536,
                    nodeCPUUsage: 0,
                    aggregatedContainersPhysicalMemoryMB: 0,
                    aggregatedContainersVirtualMemoryMB: 0,
                    containersCPUUsage: 0,
                },
                usedResource: {
                    memory: 0,
                    vCores: 0,
                },
                availableResource: {
                    memory: 0,
                    vCores: 0,
                },
                totalResource: {
                    memory: 65536,
                    vCores: 24,
                },
            },
        ],
    },
};
