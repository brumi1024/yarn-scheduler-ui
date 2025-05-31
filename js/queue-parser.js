const CAPACITY_MODES = {
  VECTOR: "vector",
  WEIGHT: "weight",
  ABSOLUTE: "absolute",
  PERCENTAGE: "percentage",
};

const QUEUE_TYPES = {
  PARENT: "parent",
  LEAF: "leaf",
};

function parseSchedulerConfig(conf) {
  const map = new Map()
  Object.values(conf.data.property).forEach(
      v => map.set(v.name.replace("yarn.scheduler.capacity.", ""), v.value))
  return {
    map: map,
    capacity: path => map.get(path+".capacity"),
    maxCapacity: path => map.get(path+".max-capacity"),
    detectMode: value => {
      if (!isNaN(Number(value))) {
        return CAPACITY_MODES.PERCENTAGE
      }
      if (String(value).endsWith("w")) {
        return CAPACITY_MODES.WEIGHT
      }
      if (String(value).startsWith("[")) {
        return CAPACITY_MODES.ABSOLUTE
      }
      return CAPACITY_MODES.VECTOR //TODO
    },
    display: (mode, value) => {
      if (mode === CAPACITY_MODES.PERCENTAGE) {
        return value + "%"
      }
      if (mode === CAPACITY_MODES.WEIGHT) {
        return value + "w"
      }
      return value.slice(1,-1).split(",").map(v => v.split("="))
    }
  }
}

function determineQueueType(queueInfo) {
  if (!queueInfo) return QUEUE_TYPES.LEAF;

  const hasChildren =
    queueInfo.queues?.queue &&
    (Array.isArray(queueInfo.queues.queue)
      ? queueInfo.queues.queue.length > 0
      : true);

  return hasChildren ? QUEUE_TYPES.PARENT : QUEUE_TYPES.LEAF;
}

function detectCapacityMode(queueInfo) {
  if (!queueInfo) {
    return CAPACITY_MODES.PERCENTAGE;
  }

  if (queueInfo.queueCapacityVectorInfo?.configuredCapacityVector) {
    return CAPACITY_MODES.VECTOR;
  }

  if (queueInfo.capacity) {
    const capacityStr = String(queueInfo.capacity);

    if (capacityStr.includes("w")) {
      return CAPACITY_MODES.WEIGHT;
    }

    if (capacityStr.startsWith("[") && capacityStr.endsWith("]")) {
      return CAPACITY_MODES.ABSOLUTE;
    }
  }

  return CAPACITY_MODES.PERCENTAGE;
}

function parseCapacityVector(capacityString) {
  if (!capacityString || typeof capacityString !== "string") {
    return {
      isVector: false,
      value: null,
      formatted: "",
    };
  }

  if (capacityString.startsWith("[") && capacityString.endsWith("]")) {
    try {
      const vectorContent = capacityString.slice(1, -1);
      if (!vectorContent.trim()) {
        throw new Error("Empty vector content");
      }

      const entries = vectorContent.split(",").map((entry) => {
        const [resource, value] = entry.split("=");
        if (!resource || !value) {
          throw new Error(`Invalid vector entry: ${entry}`);
        }
        return {
          resourceName: resource.trim(),
          resourceValue: parseFloat(value.trim()) || 0,
        };
      });

      return {
        isVector: true,
        entries: entries,
        formatted: capacityString,
      };
    } catch (error) {
      console.warn(
        `Failed to parse capacity vector "${capacityString}":`,
        error.message
      );
      return {
        isVector: false,
        value: capacityString,
        formatted: capacityString,
        error: error.message,
      };
    }
  }

  return {
    isVector: false,
    value: parseFloat(capacityString) || 0,
    formatted: capacityString,
  };
}

function parseSchedulerData(schedulerInfo) {
  if (!schedulerInfo) {
    throw new Error("Scheduler info is required");
  }

  function createQueueDefaults() {
    return {
      capacity: 0,
      maxCapacity: 100,
      usedCapacity: 0,
      absoluteCapacity: 0,
      absoluteMaxCapacity: 100,
      effectiveCapacity: 0,
      effectiveMaxCapacity: 100,
      state: "RUNNING",
      userLimitFactor: 1,
      maxApplications: 1000,
      numApplications: 0,
      nodeLabels: [],
      defaultNodeLabelExpression: "",
      autoCreationEligibility: "off",
      creationMethod: "static",
      weight: 0,
      normalizedWeight: 0,
      children: {},
    };
  }

  function parseQueue(queueInfo, parentPath = "") {
    if (!queueInfo || !queueInfo.queueName) {
      throw new Error("Queue info must contain queueName");
    }

    const queuePath = parentPath
      ? `${parentPath}.${queueInfo.queueName}`
      : queueInfo.queueName;
    const defaults = createQueueDefaults();
    const capacityMode = detectCapacityMode(queueInfo);
    const queueType = determineQueueType(queueInfo);

    const queue = {
      ...defaults,
      name: queueInfo.queueName,
      path: queuePath,
      capacity: parseFloat(queueInfo.capacity) || defaults.capacity,
      capacityMode,
      capacityVector: parseCapacityVector(queueInfo.configuredCapacityVector),
      weight:
        parseFloat(queueInfo.weight) ||
        parseFloat(queueInfo.normalizedWeight) ||
        defaults.weight,
      normalizedWeight:
        parseFloat(queueInfo.normalizedWeight) || defaults.normalizedWeight,
      maxCapacity: parseFloat(queueInfo.maxCapacity) || defaults.maxCapacity,
      usedCapacity: parseFloat(queueInfo.usedCapacity) || defaults.usedCapacity,
      absoluteCapacity:
        parseFloat(queueInfo.absoluteCapacity) || defaults.absoluteCapacity,
      absoluteMaxCapacity:
        parseFloat(queueInfo.absoluteMaxCapacity) ||
        defaults.absoluteMaxCapacity,
      effectiveCapacity:
        parseFloat(queueInfo.effectiveCapacity || queueInfo.capacity) ||
        defaults.effectiveCapacity,
      effectiveMaxCapacity:
        parseFloat(queueInfo.effectiveMaxCapacity || queueInfo.maxCapacity) ||
        defaults.effectiveMaxCapacity,
      state: queueInfo.state || defaults.state,
      userLimitFactor:
        parseFloat(queueInfo.userLimitFactor) || defaults.userLimitFactor,
      maxApplications:
        parseInt(queueInfo.maxApplications) || defaults.maxApplications,
      numApplications:
        parseInt(queueInfo.numApplications) || defaults.numApplications,
      nodeLabels: Array.isArray(queueInfo.nodeLabels)
        ? queueInfo.nodeLabels
        : defaults.nodeLabels,
      defaultNodeLabelExpression:
        queueInfo.defaultNodeLabelExpression ||
        defaults.defaultNodeLabelExpression,
      autoCreationEligibility:
        queueInfo.autoCreationEligibility || defaults.autoCreationEligibility,
      creationMethod: queueInfo.creationMethod || defaults.creationMethod,
      queueType,
      queueCapacityVectorInfo: queueInfo.queueCapacityVectorInfo || null,
    };

    if (queueInfo.queues?.queue) {
      const childQueues = Array.isArray(queueInfo.queues.queue)
        ? queueInfo.queues.queue
        : [queueInfo.queues.queue];

      childQueues.forEach((childQueue) => {
        try {
          const childParsed = parseQueue(childQueue, queuePath);
          queue.children[childParsed.name] = childParsed;
        } catch (error) {
          console.error(`Failed to parse child queue of ${queuePath}:`, error);
        }
      });
    }

    return queue;
  }

  try {
    return parseQueue(schedulerInfo);
  } catch (error) {
    console.error("Failed to parse scheduler data:", error);
    throw new Error(`Scheduler data parsing failed: ${error.message}`);
  }
}

window.CAPACITY_MODES = CAPACITY_MODES;
window.QUEUE_TYPES = QUEUE_TYPES;
window.parseSchedulerData = parseSchedulerData;
window.parseCapacityVector = parseCapacityVector;
window.detectCapacityMode = detectCapacityMode;
window.parseSchedulerConfig = parseSchedulerConfig
