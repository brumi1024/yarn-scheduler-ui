import { ValidationRule, ValidationContext, ValidationIssue } from '../types';
import type { ParsedQueue } from '../../types/Queue';

export class MaxCapacityRule implements ValidationRule {
    name = 'max-capacity-constraint';
    description = 'Maximum capacity must be >= capacity';
    severity = 'error' as const;

    validate(context: ValidationContext): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        
        const checkQueue = (queue: ParsedQueue) => {
            // Only validate if both are percentages
            if (queue.capacity.mode === 'percentage' && 
                queue.maxCapacity.mode === 'percentage') {
                
                const capacity = queue.capacity.numericValue || 0;
                const maxCapacity = queue.maxCapacity.numericValue || 100;
                
                if (maxCapacity < capacity) {
                    issues.push({
                        path: `${queue.path}.maximum-capacity`,
                        message: `Maximum capacity (${maxCapacity}%) is less than capacity (${capacity}%)`,
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