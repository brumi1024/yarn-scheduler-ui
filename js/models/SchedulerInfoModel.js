/**
 * @file Manages data from the YARN Scheduler Info API (/ws/v1/cluster/scheduler).
 * This includes live queue metrics, partition information, etc.
 * Now includes caching and data normalization for improved performance.
 */
class SchedulerInfoModel extends EventEmitter {
    constructor() {
        super();
        this._schedulerInfo = null; // Raw object from API
        this._partitions = [DEFAULT_PARTITION]; // Initialize with default partition
        this._nodeLabels = []; // Available node labels in the cluster
        this._dataCache = new SchedulerDataCache(); // Performance optimization
        this._useCache = true; // Can be disabled for testing
    }

    /**
     * Loads and processes data from the Scheduler Info API.
     * @param {Object} schedulerInfoData - The raw JSON object from the API.
     * @param {boolean} forceRefresh - Force cache refresh even if data is still valid
     */
    loadSchedulerInfo(schedulerInfoData, forceRefresh = false) {
        if (!schedulerInfoData || !schedulerInfoData.scheduler || !schedulerInfoData.scheduler.schedulerInfo) {
            console.error('SchedulerInfoModel: Invalid schedulerInfoData received.');
            this._schedulerInfo = null;
            this._partitions = [DEFAULT_PARTITION];
            this._nodeLabels = [];
            this._dataCache.clearCache();
            this._emit('infoLoaded', { success: false, error: 'Invalid scheduler info data' });
            return;
        }

        // Use cache if enabled and valid
        if (this._useCache && !forceRefresh && this._dataCache.isCacheValid()) {
            this._emit('infoLoaded', { success: true, fromCache: true });
            return;
        }

        // Normalize and cache the data for performance
        const startTime = performance.now();
        this._schedulerInfo = this._useCache 
            ? this._dataCache.normalizeSchedulerInfo(schedulerInfoData)
            : schedulerInfoData.scheduler.schedulerInfo;
        
        const processingTime = performance.now() - startTime;
        console.log(`SchedulerInfoModel: Data processing took ${processingTime.toFixed(2)}ms`);

        this._extractPartitions();
        this._extractNodeLabels();
        this._emit('infoLoaded', { success: true, processingTime });
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
     * Extracts unique node labels from the loaded scheduler info.
     * @private
     */
    _extractNodeLabels() {
        const nodeLabels = new Set();
        
        if (this._schedulerInfo) {
            const extractFromQueueRecursive = (queueInfo) => {
                if (!queueInfo) return;

                // Check nodeLabels array on queues
                if (queueInfo.nodeLabels) {
                    for (const label of queueInfo.nodeLabels) {
                        if (label && label !== '*' && label !== '' && label !== DEFAULT_PARTITION) {
                            nodeLabels.add(label);
                        }
                    }
                }

                // Recurse through child queues
                if (queueInfo.queues && queueInfo.queues.queue) {
                    const children = Array.isArray(queueInfo.queues.queue)
                        ? queueInfo.queues.queue
                        : [queueInfo.queues.queue];
                    for (const child of children) {
                        extractFromQueueRecursive(child);
                    }
                }
            };
            extractFromQueueRecursive(this._schedulerInfo);
        }
        
        this._nodeLabels = [...nodeLabels].sort();
    }

    /**
     * Retrieves live runtime information for a specific queue.
     * Uses cached data when available for better performance.
     * @param {string} queuePath - The full path of the queue (e.g., "root.default").
     * @param {string} [partition=""] - The specific partition to get info for. Defaults to default partition.
     * @returns {Object | null} The queue's runtime info object or null if not found.
     */
    getQueueRuntimeInfo(queuePath, partition = DEFAULT_PARTITION) {
        if (!this._schedulerInfo) return null;

        if (this._useCache && this._dataCache.isCacheValid()) {
            const cachedQueue = this._dataCache.getQueueByPath(queuePath);
            if (cachedQueue) {
                // Handle partition-specific data if needed
                if (partition !== DEFAULT_PARTITION && cachedQueue.capacities?.queueCapacitiesByPartition) {
                    const partitionData = cachedQueue.capacities.queueCapacitiesByPartition.find(
                        p => p.partitionName === partition
                    );
                    if (partitionData) {
                        return { ...cachedQueue, partitionSpecificData: partitionData };
                    }
                }
                return cachedQueue;
            }
        }

        // Fallback to original search method
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
     * Returns a copy of the available node labels.
     * @returns {Array<string>} Array of node labels
     */
    getNodeLabels() {
        return [...this._nodeLabels];
    }

    /**
     * Returns the raw scheduler info object (root of schedulerInfo.scheduler.schedulerInfo).
     * @returns {Object | null}
     */
    getRawSchedulerInfo() {
        return this._schedulerInfo;
    }

    /**
     * Enables or disables caching for performance optimization.
     * @param {boolean} enabled - Whether to enable caching
     */
    setCacheEnabled(enabled) {
        this._useCache = enabled;
        if (!enabled) {
            this._dataCache.clearCache();
        }
    }

    /**
     * Gets cache statistics for monitoring performance improvements.
     * @returns {Object} Cache statistics including memory savings
     */
    getCacheStats() {
        if (!this._useCache || !this._schedulerInfo) {
            return { enabled: false };
        }

        // Estimate memory savings
        const originalSize = JSON.stringify(this._schedulerInfo).length;
        const cachedSize = this._dataCache.runtimeCache.size * 1000; // Rough estimate
        const savingsPercent = ((originalSize - cachedSize) / originalSize * 100).toFixed(1);

        return {
            enabled: true,
            valid: this._dataCache.isCacheValid(),
            originalSizeKB: (originalSize / 1024).toFixed(2),
            cachedSizeKB: (cachedSize / 1024).toFixed(2),
            savingsPercent,
            ttlMs: this._dataCache.CACHE_TTL,
            resourceTypesCount: this._dataCache.resourceMetadataCache.size
        };
    }

    /**
     * Forces a cache refresh on next data load.
     */
    invalidateCache() {
        this._dataCache.clearCache();
    }
}
