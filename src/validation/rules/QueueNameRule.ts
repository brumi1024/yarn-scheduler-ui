import { ValidationRule, ValidationContext, ValidationIssue } from '../types';
import type { ParsedQueue } from '../../types/Queue';

export class QueueNameRule implements ValidationRule {
    name = 'queue-name-format';
    description = 'Queue names must be valid';
    severity = 'error' as const;

    private readonly VALID_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

    validate(context: ValidationContext): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        const checkQueue = (queue: ParsedQueue) => {
            if (!this.VALID_NAME_REGEX.test(queue.name)) {
                issues.push({
                    path: queue.path,
                    message: `Invalid queue name "${queue.name}". Only alphanumeric, hyphens, and underscores allowed`,
                    severity: 'error',
                    rule: this.name,
                });
            }

            queue.children.forEach(checkQueue);
        };

        context.queues.forEach(checkQueue);
        return issues;
    }
}
