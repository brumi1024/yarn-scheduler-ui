// src/validation/rules/ApplicationLifetimeRule.ts
import { ValidationRule, ValidationContext, ValidationIssue } from '../types';
import type { ParsedQueue } from '../../types/Queue';

export class ApplicationLifetimeRule implements ValidationRule {
    name = 'application-lifetime';
    description = 'Application lifetime settings must be valid';
    severity = 'warning' as const;

    validate(context: ValidationContext): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        const checkQueue = (queue: ParsedQueue) => {
            const queuePath = queue.path;

            // Get lifetime values
            const maxLifetimeKey = `yarn.scheduler.capacity.${queuePath}.maximum-application-lifetime`;
            const defaultLifetimeKey = `yarn.scheduler.capacity.${queuePath}.default-application-lifetime`;

            const maxLifetime = this.parseLifetime(context.configuration[maxLifetimeKey]);
            const defaultLifetime = this.parseLifetime(context.configuration[defaultLifetimeKey]);

            // Check if default > max (when both are set)
            if (maxLifetime > 0 && defaultLifetime > 0 && defaultLifetime > maxLifetime) {
                issues.push({
                    path: `${queuePath}.default-application-lifetime`,
                    message: `Default lifetime (${defaultLifetime}s) exceeds maximum lifetime (${maxLifetime}s)`,
                    severity: 'error',
                    rule: this.name,
                });
            }

            // Warn about very short lifetimes
            if (maxLifetime > 0 && maxLifetime < 60) {
                issues.push({
                    path: `${queuePath}.maximum-application-lifetime`,
                    message: `Maximum lifetime is very short (${maxLifetime}s). This may cause applications to be killed prematurely.`,
                    severity: 'warning',
                    rule: this.name,
                });
            }

            // Check parent-child consistency
            if (queue.parent) {
                const parentMaxKey = `yarn.scheduler.capacity.${queue.parent}.maximum-application-lifetime`;
                const parentMax = this.parseLifetime(context.configuration[parentMaxKey]);

                if (parentMax > 0 && maxLifetime > 0 && maxLifetime > parentMax) {
                    issues.push({
                        path: `${queuePath}.maximum-application-lifetime`,
                        message: `Queue lifetime (${maxLifetime}s) exceeds parent limit (${parentMax}s)`,
                        severity: 'warning',
                        rule: this.name,
                    });
                }
            }

            // Recursively check children
            queue.children.forEach(checkQueue);
        };

        context.queues.forEach(checkQueue);
        return issues;
    }

    private parseLifetime(value: string | undefined): number {
        if (!value) return -1;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? -1 : parsed;
    }
}
