// File: js/queues/queue-parser.js (Simplified)

// Assuming CAPACITY_MODES is globally available from config.js
// Assuming QUEUE_TYPES might be useful if directly inspecting schedulerInfo objects elsewhere.
const QUEUE_TYPES = {
  PARENT: "parent",
  LEAF: "leaf",
};

/**
 * Determines queue type from a queueInfo object (typically from /ws/v1/cluster/scheduler response).
 * @param {Object} queueInfo - A queue object from the scheduler info.
 * @returns {string} QUEUE_TYPES.PARENT or QUEUE_TYPES.LEAF
 */
function determineQueueTypeFromSchedulerInfo(queueInfo) {
  if (!queueInfo) return QUEUE_TYPES.LEAF;
  const hasChildren =
      queueInfo.queues?.queue &&
      (Array.isArray(queueInfo.queues.queue)
          ? queueInfo.queues.queue.length > 0
          : true);
  return hasChildren ? QUEUE_TYPES.PARENT : QUEUE_TYPES.LEAF;
}

/**
 * Parses a YARN resource vector string (e.g., "[memory=1024,vcores=1]")
 * into an array of resource objects.
 * @param {string} capacityString - The resource vector string.
 * @returns {{isVector: boolean, entries?: Array<{resourceName: string, resourceValue: number}>, value?: any, formatted: string, error?: string}}
 */
function parseCapacityVector(capacityString) {
  if (!capacityString || typeof capacityString !== 'string') {
    return { isVector: false, value: null, formatted: String(capacityString) };
  }

  const trimmedStr = capacityString.trim();
  if (trimmedStr.startsWith('[') && trimmedStr.endsWith(']')) {
    const vectorContent = trimmedStr.slice(1, -1);
    if (!vectorContent.trim()) {
      return { isVector: true, entries: [], formatted: capacityString, error: "Empty vector content" };
    }
    try {
      const entries = vectorContent.split(',').map((entryStr) => {
        const parts = entryStr.split('=').map(s => s.trim());
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          throw new Error(`Invalid vector entry: ${entryStr}`);
        }
        const resourceValue = parseFloat(parts[1]);
        if (isNaN(resourceValue)) {
          throw new Error(`Invalid resource value in entry: ${entryStr}`);
        }
        return { resourceName: parts[0], resourceValue: resourceValue };
      });
      return { isVector: true, entries: entries, formatted: capacityString };
    } catch (error) {
      console.warn(`Failed to parse capacity vector "${capacityString}": ${error.message}`);
      return { isVector: false, value: capacityString, formatted: capacityString, error: error.message };
    }
  }
  // Not a vector string in the expected format
  return { isVector: false, value: capacityString, formatted: capacityString };
}

// Expose selected utilities if they are used elsewhere or might be in the future.
window.QUEUE_TYPES = QUEUE_TYPES; // If needed globally
window.parseCapacityVector = parseCapacityVector; // This is used by QueueViewDataFormatter