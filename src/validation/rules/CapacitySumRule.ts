import { ValidationRule, ValidationContext, ValidationIssue } from '../types';
import type { ParsedQueue } from '../../types/Queue';

export class CapacitySumRule implements ValidationRule {
    name = 'capacity-sum';
    description = 'Child queue capacities must sum to 100%';
    severity = 'error' as const;

    validate(context: ValidationContext): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        
        // Only check in legacy mode
        if (!context.isLegacyMode) return issues;
        
        const checkQueue = (queue: ParsedQueue) => {
            if (queue.children.length === 0) return;
            
            // Only check percentage-based children
            const percentageChildren = queue.children
                .filter(child => child.capacity.mode === 'percentage');
            
            if (percentageChildren.length > 0) {
                const sum = percentageChildren
                    .reduce((total, child) => total + (child.capacity.numericValue || 0), 0);
                
                if (Math.abs(sum - 100) > 0.01) {
                    issues.push({
                        path: queue.path,
                        message: `Child capacities sum to ${sum.toFixed(2)}%, must equal 100%`,
                        severity: 'error',
                        rule: this.name,
                    });
                }
            }
            
            // Check children recursively
            queue.children.forEach(checkQueue);
        };
        
        context.queues.forEach(checkQueue);
        return issues;
    }
}