/**
 * @file Manages caching and normalization of scheduler runtime data to improve performance.
 */

class SchedulerDataCache {
    constructor() {
        this.runtimeCache = new Map();
        this.resourceMetadataCache = new Map();
        this.queuePathCache = new Map();
        this.lastFetchTime = 0;
        this.CACHE_TTL = 30000; // 30 seconds
    }

    /**
     * Checks if the cached data is still valid based on TTL.
     * @returns {boolean} True if cache is valid, false if expired.
     */
    isCacheValid() {
        return Date.now() - this.lastFetchTime < this.CACHE_TTL;
    }

    /**
     * Normalizes scheduler info data by extracting repetitive structures and creating references.
     * @param {Object} rawData - Raw scheduler info from YARN API
     * @returns {Object} Normalized data structure with metadata references
     */
    normalizeSchedulerInfo(rawData) {
        if (!rawData?.scheduler?.schedulerInfo) {
            return null;
        }

        this.lastFetchTime = Date.now();

        // Extract unique resource metadata definitions
        const resourceTypes = this._extractResourceTypes(rawData);
        this.resourceMetadataCache = resourceTypes;

        // Normalize queue hierarchy with references
        const normalizedRoot = this._normalizeQueue(rawData.scheduler.schedulerInfo, resourceTypes);

        // Build path cache for O(1) queue lookups
        this._buildPathCache(normalizedRoot);

        this.runtimeCache.set('root', normalizedRoot);
        return normalizedRoot;
    }

    /**
     * Retrieves normalized queue data by path.
     * @param {string} queuePath - Full queue path (e.g., "root.default")
     * @returns {Object|null} Normalized queue data or null if not found
     */
    getQueueByPath(queuePath) {
        return this.queuePathCache.get(queuePath) || null;
    }

    /**
     * Clears all cached data.
     */
    clearCache() {
        this.runtimeCache.clear();
        this.resourceMetadataCache.clear();
        this.queuePathCache.clear();
        this.lastFetchTime = 0;
    }

    _extractResourceTypes(data) {
        const types = new Map();
        const seenPatterns = new Set();

        // Traverse and extract unique resource patterns
        const extractFromNode = (node) => {
            if (node?.resourcesUsed?.resourceInformations?.resourceInformation) {
                const pattern = this._createResourcePattern(
                    node.resourcesUsed.resourceInformations.resourceInformation
                );
                if (!seenPatterns.has(pattern)) {
                    seenPatterns.add(pattern);
                    types.set(pattern, {
                        id: pattern,
                        template: node.resourcesUsed.resourceInformations.resourceInformation,
                    });
                }
            }

            // Check queue capacities by partition
            if (node?.capacities?.queueCapacitiesByPartition) {
                for (const partition of node.capacities.queueCapacitiesByPartition) {
                    if (partition.resourcesUsed?.resourceInformations?.resourceInformation) {
                        const pattern = this._createResourcePattern(
                            partition.resourcesUsed.resourceInformations.resourceInformation
                        );
                        if (!seenPatterns.has(pattern)) {
                            seenPatterns.add(pattern);
                            types.set(pattern, {
                                id: pattern,
                                template: partition.resourcesUsed.resourceInformations.resourceInformation,
                            });
                        }
                    }
                }
            }

            // Recursively process child queues
            if (node?.queues?.queue) {
                for (const child of node.queues.queue) {
                    extractFromNode(child);
                }
            }
        };

        extractFromNode(data.scheduler.schedulerInfo);
        return types;
    }

    _createResourcePattern(resourceInfo) {
        // Create a unique pattern identifier for resource metadata
        return resourceInfo
            .map((r) => `${r.name}:${r.resourceType}:${r.units}`)
            .sort()
            .join('|');
    }

    _normalizeQueue(queueData, resourceTypes) {
        const normalized = {
            // Core queue properties (keep as-is)
            queuePath: queueData.queuePath,
            queueName: queueData.queueName,
            type: queueData.type,
            state: queueData.state,
            capacity: queueData.capacity,
            usedCapacity: queueData.usedCapacity,
            maxCapacity: queueData.maxCapacity,
            absoluteCapacity: queueData.absoluteCapacity,
            absoluteMaxCapacity: queueData.absoluteMaxCapacity,
            absoluteUsedCapacity: queueData.absoluteUsedCapacity,
            weight: queueData.weight,
            normalizedWeight: queueData.normalizedWeight,
            numApplications: queueData.numApplications,
            maxParallelApps: queueData.maxParallelApps,

            // Replace resource information with references
            resourcesUsed: this._normalizeResourceUsage(queueData.resourcesUsed, resourceTypes),

            // Normalize capacities by partition
            capacities: this._normalizeCapacities(queueData.capacities, resourceTypes),

            // Keep other properties
            nodeLabels: queueData.nodeLabels,
            queueCapacityVectorInfo: queueData.queueCapacityVectorInfo,
        };

        // Recursively normalize child queues
        if (queueData.queues?.queue) {
            normalized.queues = {
                queue: queueData.queues.queue.map((child) => this._normalizeQueue(child, resourceTypes)),
            };
        }

        return normalized;
    }

    _normalizeResourceUsage(resourceUsage, resourceTypes) {
        if (!resourceUsage?.resourceInformations?.resourceInformation) {
            return resourceUsage;
        }

        const pattern = this._createResourcePattern(resourceUsage.resourceInformations.resourceInformation);

        return {
            memory: resourceUsage.memory,
            vCores: resourceUsage.vCores,
            // Store reference instead of full structure
            resourceInfoRef: pattern,
            // Keep actual values
            values: resourceUsage.resourceInformations.resourceInformation.map((r) => ({
                name: r.name,
                value: r.value,
            })),
        };
    }

    _normalizeCapacities(capacities, resourceTypes) {
        if (!capacities?.queueCapacitiesByPartition) {
            return capacities;
        }

        return {
            queueCapacitiesByPartition: capacities.queueCapacitiesByPartition.map((partition) => ({
                ...partition,
                // Normalize resource fields
                resourcesUsed: this._normalizeResourceUsage(partition.resourcesUsed, resourceTypes),
                reserved: this._normalizeResourceUsage(partition.reserved, resourceTypes),
                pending: this._normalizeResourceUsage(partition.pending, resourceTypes),
                amUsed: this._normalizeResourceUsage(partition.amUsed, resourceTypes),
                amLimit: this._normalizeResourceUsage(partition.amLimit, resourceTypes),
                userAmLimit: this._normalizeResourceUsage(partition.userAmLimit, resourceTypes),
            })),
        };
    }

    _buildPathCache(node, cache = this.queuePathCache) {
        if (node.queuePath) {
            cache.set(node.queuePath, node);
        }

        if (node.queues?.queue) {
            for (const child of node.queues.queue) {
                this._buildPathCache(child, cache);
            }
        }
    }
}
