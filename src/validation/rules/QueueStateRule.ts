// src/validation/rules/QueueStateRule.ts
import { ValidationRule, ValidationContext, ValidationIssue } from '../types';
import type { ParsedQueue } from '../../types/Queue';

export class QueueStateRule implements ValidationRule {
    name = 'queue-state';
    description = 'Queue state transitions must be valid';
    severity = 'warning' as const;

    validate(context: ValidationContext): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        const checkQueue = (queue: ParsedQueue) => {
            const state = queue.state || 'RUNNING';
            
            // Check if stopped queue has running children
            if (state === 'STOPPED' && queue.children.length > 0) {
                const runningChildren = queue.children.filter(child => 
                    child.state === 'RUNNING' || !child.state
                );
                
                if (runningChildren.length > 0) {
                    issues.push({
                        path: `${queue.path}.state`,
                        message: `Queue is STOPPED but has ${runningChildren.length} running child queue(s). Children will not accept new applications.`,
                        severity: 'warning',
                        rule: this.name,
                    });
                }
            }

            // Check if queue has applications (would need app count from API)
            const numAppsKey = `yarn.scheduler.capacity.${queue.path}.numApplications`;
            const numApps = parseInt(context.configuration[numAppsKey] || '0', 10);
            
            if (state === 'STOPPED' && numApps > 0) {
                issues.push({
                    path: `${queue.path}.state`,
                    message: `Cannot stop queue with ${numApps} active application(s). Applications must complete or be moved first.`,
                    severity: 'error',
                    rule: this.name,
                });
            }

            // Recursively check children
            queue.children.forEach(checkQueue);
        };

        context.queues.forEach(checkQueue);
        return issues;
    }
}