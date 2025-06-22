import type { ParsedQueue } from '../types/Queue';

export interface ValidationIssue {
    path: string;
    message: string;
    severity: 'error' | 'warning';
    rule: string;
}

export interface ValidationContext {
    configuration: Record<string, string>;
    queues: ParsedQueue[];
    isLegacyMode: boolean;
}

export interface ValidationResult {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    isValid: boolean;
}

export interface ValidationRule {
    name: string;
    description: string;
    severity: 'error' | 'warning';
    validate(context: ValidationContext): ValidationIssue[];
}
