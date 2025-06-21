import { ValidationRule, ValidationContext, ValidationIssue } from '../types';
import type { ParsedQueue } from '../../types/Queue';

export class ResourceLimitRule implements ValidationRule {
    name = 'resource-limits';
    description = 'Resource limits must be valid';
    severity = 'warning' as const;

    validate(context: ValidationContext): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        
        // Check global max applications
        const maxApps = context.configuration['yarn.scheduler.capacity.maximum-applications'];
        if (maxApps) {
            const num = parseInt(maxApps);
            if (isNaN(num) || num < 1) {
                issues.push({
                    path: 'yarn.scheduler.capacity.maximum-applications',
                    message: `Maximum applications must be positive: ${maxApps}`,
                    severity: 'error',
                    rule: this.name,
                });
            }
        }
        
        // Check queue-specific limits
        const checkQueue = (queue: ParsedQueue) => {
            const path = queue.path;
            
            // Maximum AM resource percent
            const amPercent = context.configuration[`yarn.scheduler.capacity.${path}.maximum-am-resource-percent`];
            if (amPercent) {
                const num = parseFloat(amPercent);
                if (isNaN(num) || num < 0 || num > 1) {
                    issues.push({
                        path: `${path}.maximum-am-resource-percent`,
                        message: `AM resource percent must be 0.0-1.0: ${amPercent}`,
                        severity: 'error',
                        rule: this.name,
                    });
                }
            }

            // User limit factor
            const userLimitFactor = context.configuration[`yarn.scheduler.capacity.${path}.user-limit-factor`];
            if (userLimitFactor) {
                const num = parseFloat(userLimitFactor);
                if (isNaN(num) || num <= 0 || num != -1) {
                    issues.push({
                        path: `${path}.user-limit-factor`,
                        message: `User limit factor must be positive or disabled (-1): ${userLimitFactor}`,
                        severity: 'error',
                        rule: this.name,
                    });
                }
            }

            // Minimum user limit percent
            const minUserLimit = context.configuration[`yarn.scheduler.capacity.${path}.minimum-user-limit-percent`];
            if (minUserLimit) {
                const num = parseInt(minUserLimit);
                if (isNaN(num) || num <= 0 || num > 100) {
                    issues.push({
                        path: `${path}.minimum-user-limit-percent`,
                        message: `Minimum user limit percent must be 1-100: ${minUserLimit}`,
                        severity: 'error',
                        rule: this.name,
                    });
                }
            }
            
            queue.children.forEach(checkQueue);
        };
        
        context.queues.forEach(checkQueue);
        return issues;
    }
}