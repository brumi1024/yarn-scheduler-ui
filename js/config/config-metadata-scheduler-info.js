/**
 * @file Metadata for displaying fields from the Scheduler Info API (/ws/v1/cluster/scheduler).
 * Defines which fields to show in the Queue Info modal, their display names,
 * and potential formatting instructions.
 */

const SCHEDULER_INFO_METADATA = {
    // General Queue Info (applies to both Parent and Leaf if present)
    queueName: { displayName: 'Queue Name' },
    queuePath: { displayName: 'Queue Path' },
    state: { displayName: 'State' }, // From schedulerInfo, not scheduler-conf
    type: { displayName: 'Queue Type' }, // e.g., capacitySchedulerLeafQueueInfo or parent type (derived)
    capacity: { displayName: 'Effective Capacity', unit: '%' }, // From schedulerInfo.capacity (Effective)
    usedCapacity: { displayName: 'Used Capacity', unit: '%' },
    maxCapacity: { displayName: 'Effective Max Capacity', unit: '%' }, // From schedulerInfo.maxCapacity (Effective)
    absoluteCapacity: { displayName: 'Absolute Capacity', unit: '%' },
    absoluteMaxCapacity: { displayName: 'Absolute Max Capacity', unit: '%' },
    absoluteUsedCapacity: { displayName: 'Absolute Used Capacity', unit: '%' },
    numApplications: { displayName: 'Total Applications' },
    maxParallelApps: { displayName: 'Max Parallel Apps (Live)'}, // From scheduler info if different from conf
    resourcesUsed: { // This is an object in API
        displayName: 'Resources Used (Live)',
        memory: { displayName: 'Memory Used', unit: 'MB' },
        vCores: { displayName: 'VCores Used' }
    },
    mode: { displayName: 'Capacity Mode (Live)' }, // As reported by scheduler endpoint
    weight: { displayName: 'Weight (Live)'},
    normalizedWeight: {displayName: 'Normalized Weight (Live)'},

    // Leaf Queue Specific Info
    numActiveApplications: { displayName: 'Active Applications' },
    numPendingApplications: { displayName: 'Pending Applications' },
    numContainers: { displayName: 'Total Containers' },
    allocatedContainers: { displayName: 'Allocated Containers' },
    reservedContainers: { displayName: 'Reserved Containers' },
    pendingContainers: { displayName: 'Pending Containers' },
    maxApplications: { displayName: 'Max Applications (Queue Limit)' }, // Leaf specific from schedulerInfo
    userLimitFactor: { displayName: 'User Limit Factor (Live)' }, // Leaf specific from schedulerInfo

    // It might be too verbose to list all from `capacities.queueCapacitiesByPartition`
    // Instead, the Info Modal could summarize or pick the default partition's effective/configured resources.
    // For example, for the default partition:
    defaultPartitionEffectiveMinResource: {
        displayName: 'Default Partition Effective Min Resource',
        memory: { displayName: 'Memory', unit: 'MB' },
        vCores: { displayName: 'VCores' }
    },
    defaultPartitionEffectiveMaxResource: {
        displayName: 'Default Partition Effective Max Resource',
        memory: { displayName: 'Memory', unit: 'MB' },
        vCores: { displayName: 'VCores' }
    },
    // Add more fields from scheduler-info.txt as needed for the Info Modal.
    // Consider how to display array/nested objects like `users` or `queueAcls` if desired.
};