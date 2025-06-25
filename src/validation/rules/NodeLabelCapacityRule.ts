// src/validation/rules/NodeLabelCapacityRule.ts
import { ValidationRule, ValidationContext, ValidationIssue } from '../types';
import type { ParsedQueue } from '../../types/Queue';
import { CapacityParser } from '../../utils/capacityParser';

export class NodeLabelCapacityRule implements ValidationRule {
    name = 'node-label-capacity';
    description = 'Node label capacities must be valid and sum correctly';
    severity = 'error' as const;

    validate(context: ValidationContext): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        // Only validate in legacy mode
        if (!context.isLegacyMode) return issues;

        const checkQueue = (queue: ParsedQueue) => {
            // Skip validation for root queue - it has special handling
            const isRoot = queue.path === 'root';

            // Get node labels for this queue
            const nodeLabels = this.getNodeLabels(queue, context.configuration);

            nodeLabels.forEach((label) => {
                // For non-root queues with children, check capacity sum
                if (!isRoot && queue.children.length > 0) {
                    // Check if all children have this label accessible
                    const childrenWithLabel = queue.children.filter((child) => {
                        const childLabels = this.getNodeLabels(child, context.configuration);
                        return childLabels.includes(label);
                    });

                    // Only validate if at least one child has access to this label
                    if (childrenWithLabel.length > 0) {
                        // Calculate sum of child capacities for this label
                        const sum = this.calculateChildCapacitySum(queue, label, context.configuration);

                        // Only validate if sum is not 0 (meaning children are configured for this label)
                        if (sum > 0 && Math.abs(sum - 100) > 0.01) {
                            issues.push({
                                path: `${queue.path}.accessible-node-labels.${label}`,
                                message: `Child capacities for label "${label}" sum to ${sum.toFixed(2)}%, must equal 100%`,
                                severity: 'error',
                                rule: this.name,
                                field: `yarn.scheduler.capacity.${queue.path}.accessible-node-labels.${label}.capacity`,
                            });
                        }
                    }
                }

                // Check max capacity >= capacity for all queues including root
                const capacity = this.getCapacityForLabel(queue, label, context.configuration);
                const maxCapacity = this.getMaxCapacityForLabel(queue, label, context.configuration);

                if (capacity > maxCapacity) {
                    issues.push({
                        path: `${queue.path}.accessible-node-labels.${label}.maximum-capacity`,
                        message: `Maximum capacity (${maxCapacity}%) is less than capacity (${capacity}%) for label "${label}"`,
                        severity: 'error',
                        rule: this.name,
                        field: `yarn.scheduler.capacity.${queue.path}.accessible-node-labels.${label}.maximum-capacity`,
                    });
                }
            });

            // Recursively check children
            queue.children.forEach(checkQueue);
        };

        context.queues.forEach(checkQueue);
        return issues;
    }

    private getNodeLabels(queue: ParsedQueue, config: Record<string, string>): string[] {
        const key = `yarn.scheduler.capacity.${queue.path}.accessible-node-labels`;
        const value = config[key];

        // Special handling for "*" label - it means all labels
        if (value === '*') {
            // For validation purposes, we'll skip "*" as it's a wildcard
            return [];
        }

        return value
            ? value
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s && s !== '*')
            : [];
    }

    private getCapacityForLabel(queue: ParsedQueue, label: string, config: Record<string, string>): number {
        const key = `yarn.scheduler.capacity.${queue.path}.accessible-node-labels.${label}.capacity`;
        const value = config[key] || '0%';

        try {
            const parsed = CapacityParser.parse(value);
            return parsed.numericValue || 0;
        } catch {
            return 0;
        }
    }

    private getMaxCapacityForLabel(queue: ParsedQueue, label: string, config: Record<string, string>): number {
        const key = `yarn.scheduler.capacity.${queue.path}.accessible-node-labels.${label}.maximum-capacity`;
        const value = config[key] || '100%';

        try {
            const parsed = CapacityParser.parse(value);
            return parsed.numericValue || 100;
        } catch {
            return 100;
        }
    }

    private calculateChildCapacitySum(parent: ParsedQueue, label: string, config: Record<string, string>): number {
        return parent.children.reduce((sum, child) => {
            // Only include children that have access to this label
            const childLabels = this.getNodeLabels(child, config);
            if (childLabels.includes(label)) {
                const capacity = this.getCapacityForLabel(child, label, config);
                return sum + capacity;
            }
            return sum;
        }, 0);
    }
}
