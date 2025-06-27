import type { QueueInfo, QueueNode, QueueMetrics, LabelConfig } from '../types';

/**
 * Transforms QueueInfo (from YARN API) to QueueNode (for UI)
 * This is the critical bridge between the scheduler data and the UI components
 */
export function transformQueueInfoToQueueNode(
    queueInfo: QueueInfo,
    configData: Map<string, string>
): QueueNode {
    // Extract properties for this queue from config data
    const properties = new Map<string, string>();
    const labelConfigs = new Map<string, LabelConfig>();
    const prefix = `yarn.scheduler.capacity.${queueInfo.queuePath}.`;

    // Extract all properties for this queue
    for (const [key, value] of configData.entries()) {
        if (key.startsWith(prefix)) {
            const propName = key.substring(prefix.length);
            
            // Check if this is a label-specific property
            if (propName.startsWith('accessible-node-labels.') && propName.includes('.', 23)) {
                // Extract label config
                const labelMatch = propName.match(/^accessible-node-labels\.([^.]+)\.(.+)$/);
                if (labelMatch) {
                    const [, label, labelProp] = labelMatch;
                    const labelConfig = labelConfigs.get(label) || { capacity: 0, maximumCapacity: 100 };
                    
                    if (labelProp === 'capacity') {
                        labelConfig.capacity = parseFloat(value) || 0;
                    } else if (labelProp === 'maximum-capacity') {
                        labelConfig.maximumCapacity = parseFloat(value) || 100;
                    }
                    
                    labelConfigs.set(label, labelConfig);
                }
            } else {
                // Regular property
                properties.set(propName, value);
            }
        }
    }

    // Create metrics object from QueueInfo data
    const metrics: QueueMetrics = {
        usedCapacity: queueInfo.usedCapacity,
        absoluteUsedCapacity: queueInfo.absoluteUsedCapacity,
        numApplications: queueInfo.numApplications,
        numActiveApplications: queueInfo.numActiveApplications || 0,
        numPendingApplications: queueInfo.numPendingApplications || 0,
        resourcesUsed: queueInfo.resourcesUsed || { memory: 0, vCores: 0 },
    };

    // Determine queue type
    const isLeaf = queueInfo.type === 'capacitySchedulerLeafQueueInfo';
    const queueType = isLeaf ? 'leaf' : 'parent';

    // Recursively transform children
    const children: QueueNode[] = [];
    if (queueInfo.queues?.queue) {
        const childQueues = Array.isArray(queueInfo.queues.queue)
            ? queueInfo.queues.queue
            : [queueInfo.queues.queue];
        
        for (const child of childQueues) {
            children.push(transformQueueInfoToQueueNode(child, configData));
        }
    }

    return {
        path: queueInfo.queuePath,
        name: queueInfo.queueName,
        type: queueType,
        properties,
        children,
        metrics,
        labelConfigs,
    };
}