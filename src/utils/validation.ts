// src/utils/validation.ts
import { Configuration } from '../types/Configuration';

export type ValidationError = {
    path: string; // e.g., 'root.default.capacity'
    message: string;
};

export function validateConfiguration(config: Configuration): ValidationError[] {
    const errors: ValidationError[] = [];
    const isLegacyMode = config['yarn.scheduler.capacity.legacy-queue-mode.enabled'] !== 'false';

    if (isLegacyMode) {
        // Example: Check if children of a queue sum to 100%
        // This requires iterating through the queue hierarchy, which can be complex.
        // You would need to get the queue tree structure first.
        // Pseudocode:
        // const queueTree = buildQueueTree(config);
        // for (const parent of queueTree) {
        //   const children = parent.children;
        //   const percentageChildren = children.filter(c => isPercentage(c.capacity));
        //   const sum = percentageChildren.reduce((acc, c) => acc + parseFloat(c.capacity), 0);
        //   if (sum !== 100) {
        //     errors.push({ path: parent.path, message: 'Children capacities must sum to 100% in legacy mode.' });
        //   }
        // }
    }

    // Add more validation rules here...

    return errors;
}
