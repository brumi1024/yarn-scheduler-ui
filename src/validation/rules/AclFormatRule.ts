import { ValidationRule, ValidationContext, ValidationIssue } from '../types';
import type { ParsedQueue } from '../../types/Queue';

export class AclFormatRule implements ValidationRule {
    name = 'acl-format';
    description = 'ACL must follow "users groups" format';
    severity = 'error' as const;
    
    private readonly ACL_REGEX = /^([\w,]+)?(\s+([\w,]+)?)?$/;

    validate(context: ValidationContext): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        
        const aclProperties = [
            'acl_submit_applications',
            'acl_administer_queue',
            'acl_application_max_priority'
        ];
        
        const checkQueue = (queue: ParsedQueue) => {
            const queuePath = queue.path;
            
            aclProperties.forEach(aclProp => {
                const key = `yarn.scheduler.capacity.${queuePath}.${aclProp}`;
                const value = context.configuration[key];
                
                if (value && value !== '*' && value !== ' ' && !this.ACL_REGEX.test(value)) {
                    issues.push({
                        path: `${queuePath}.${aclProp}`,
                        message: `Invalid ACL format. Use "user1,user2 group1,group2" or "*" or " "`,
                        severity: 'error',
                        rule: this.name,
                    });
                }
            });
            
            queue.children.forEach(checkQueue);
        };
        
        context.queues.forEach(checkQueue);
        return issues;
    }
}