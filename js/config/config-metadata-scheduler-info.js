/**
 * @file Metadata for displaying fields from the Scheduler Info API (/ws/v1/cluster/scheduler).
 * Defines which fields to show in the Queue Info modal, their display names,
 * and potential formatting instructions.
 */

const SCHEDULER_INFO_METADATA = {
    // General Queue Info (applies to both Parent and Leaf if present)
    queueName: { displayName: 'Queue Name' },
    queuePath: { displayName: 'Queue Path' },
    state: { displayName: 'State' },
    type: { displayName: 'Queue Type' },
    capacity: { displayName: 'Effective Capacity', unit: '%' },
    usedCapacity: { displayName: 'Used Capacity', unit: '%' },
    maxCapacity: { displayName: 'Effective Max Capacity', unit: '%' },
    absoluteCapacity: { displayName: 'Absolute Capacity', unit: '%' },
    absoluteMaxCapacity: { displayName: 'Absolute Max Capacity', unit: '%' },
    absoluteUsedCapacity: { displayName: 'Absolute Used Capacity', unit: '%' },
    numApplications: { displayName: 'Total Applications' },
    maxParallelApps: { displayName: 'Max Parallel Apps' },
    resourcesUsed: {
        displayName: 'Resources Used',
        memory: { displayName: 'Memory Used', unit: 'MB' },
        vCores: { displayName: 'VCores Used' },
    },
    mode: { displayName: 'Capacity Mode' },
    weight: { displayName: 'Weight' },
    normalizedWeight: { displayName: 'Normalized Weight' },

    // Leaf Queue Specific Info
    numActiveApplications: { displayName: 'Active Applications' },
    numPendingApplications: { displayName: 'Pending Applications' },
    numContainers: { displayName: 'Total Containers' },
    allocatedContainers: { displayName: 'Allocated Containers' },
    reservedContainers: { displayName: 'Reserved Containers' },
    pendingContainers: { displayName: 'Pending Containers' },
    maxApplications: { displayName: 'Max Applications (Queue Limit)' },
    userLimitFactor: { displayName: 'User Limit Factor' },

    // It might be too verbose to list all from `capacities.queueCapacitiesByPartition`
    // Instead, the Info Modal could summarize or pick the default partition's effective/configured resources.
    // For example, for the default partition:
    defaultPartitionEffectiveMinResource: {
        displayName: 'Default Partition Effective Min Resource',
        memory: { displayName: 'Memory', unit: 'MB' },
        vCores: { displayName: 'VCores' },
    },
    defaultPartitionEffectiveMaxResource: {
        displayName: 'Default Partition Effective Max Resource',
        memory: { displayName: 'Memory', unit: 'MB' },
        vCores: { displayName: 'VCores' },
    },
    // Add more fields from scheduler-info.txt as needed for the Info Modal.
    // Consider how to display array/nested objects like `users` or `queueAcls` if desired.
};
