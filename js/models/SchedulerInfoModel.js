/**
 * @file Manages data from the YARN Scheduler Info API (/ws/v1/cluster/scheduler).
 * This includes live queue metrics, partition information, etc.
 */
class SchedulerInfoModel extends EventEmitter {
    constructor() {
        super();
        this._schedulerInfo = null; // Raw object from API
        this._partitions = [DEFAULT_PARTITION]; // Initialize with default partition
    }

    /**
     * Loads and processes data from the Scheduler Info API.
     * @param {Object} schedulerInfoData - The raw JSON object from the API.
     */
    loadSchedulerInfo(schedulerInfoData) {
        if (!schedulerInfoData || !schedulerInfoData.scheduler || !schedulerInfoData.scheduler.schedulerInfo) {
            console.error('SchedulerInfoModel: Invalid schedulerInfoData received.');
            this._schedulerInfo = null;
            this._partitions = [DEFAULT_PARTITION];
            this._emit('infoLoaded', { success: false, error: 'Invalid scheduler info data' });
            return;
        }
        this._schedulerInfo = schedulerInfoData.scheduler.schedulerInfo;
        this._extractPartitions();
        this._emit('infoLoaded', { success: true });
    }

    /**
     * Extracts unique partition names from the loaded scheduler info.
     * Partitions are derived from node labels accessible by queues.
     * @private
     */
    _extractPartitions() {
        const partitions = new Set([DEFAULT_PARTITION]); // Always include the default partition
        if (this._schedulerInfo && this._schedulerInfo.queues) {
            const extractFromQueueRecursive = (queueInfo) => {
                if (queueInfo.capacities && queueInfo.capacities.queueCapacitiesByPartition) {
                    for (const pInfo of queueInfo.capacities.queueCapacitiesByPartition) {
                        if (pInfo.partitionName && pInfo.partitionName !== '') {
                            // Ensure not empty and not default
                            partitions.add(pInfo.partitionName);
                        }
                    }
                }
                // Also check nodeLabels array on queues as per old logic, if that's still relevant for partition discovery
                if (queueInfo.nodeLabels) {
                    for (const label of queueInfo.nodeLabels) {
                        if (label && label !== '*' && label !== '') partitions.add(label);
                    }
                }

                if (queueInfo.queues && queueInfo.queues.queue) {
                    const children = Array.isArray(queueInfo.queues.queue)
                        ? queueInfo.queues.queue
                        : [queueInfo.queues.queue];
                    for (const child of children) {
                        extractFromQueueRecursive(child);
                    }
                }
            };
            extractFromQueueRecursive(this._schedulerInfo); // Start from root
        }
        this._partitions = [...partitions].sort();
    }

    /**
     * Retrieves live runtime information for a specific queue.
     * @param {string} queuePath - The full path of the queue (e.g., "root.default").
     * @param {string} [partition=""] - The specific partition to get info for. Defaults to default partition.
     * @returns {Object | null} The queue's runtime info object or null if not found.
     */
    getQueueRuntimeInfo(queuePath, partition = DEFAULT_PARTITION) {
        if (!this._schedulerInfo) return null;

        function findQueueInInfo(infoNode, targetPath) {
            if (!infoNode) return null;
            let currentPath = infoNode.queuePath;
            if (infoNode.queueName !== 'root' && infoNode.parentPath) {
                // Assuming we can add parentPath
                currentPath = `${infoNode.parentPath}.${infoNode.queueName}`;
            } else if (
                infoNode.queueName !== 'root' &&
                !infoNode.parentPath &&
                infoNode.queuePath &&
                infoNode.queuePath.includes('.')
            ) {
                currentPath = infoNode.queuePath;
            }

            if (currentPath === targetPath) {
                // If partition specific data is needed, we'd look into `capacities.queueCapacitiesByPartition`
                // For now, returning the main queue object. Deeper parsing happens in Formatter.
                return infoNode;
            }

            if (infoNode.queues && infoNode.queues.queue) {
                const children = Array.isArray(infoNode.queues.queue) ? infoNode.queues.queue : [infoNode.queues.queue];
                for (const child of children) {
                    child.parentPath = currentPath; // Temporarily augment for recursive search
                    const found = findQueueInInfo(child, targetPath);
                    delete child.parentPath; // Clean up
                    if (found) return found;
                }
            }
            return null;
        }
        return findQueueInInfo(this._schedulerInfo, queuePath);
    }

    /**
     * Returns the list of available partition names.
     * @returns {Array<string>}
     */
    getPartitions() {
        return [...this._partitions];
    }

    /**
     * Returns the raw scheduler info object (root of schedulerInfo.scheduler.schedulerInfo).
     * @returns {Object | null}
     */
    getRawSchedulerInfo() {
        return this._schedulerInfo;
    }
}
