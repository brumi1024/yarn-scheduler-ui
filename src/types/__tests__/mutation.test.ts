import { describe, it, expect } from 'vitest';
import type { MutationError, ValidationResponse } from '../mutation';

describe('MutationError interface', () => {
  it('should accept standard YARN exception format', () => {
    const error: MutationError = {
      RemoteException: {
        exception: 'YarnException',
        message: 'Invalid queue configuration',
        javaClassName: 'org.apache.hadoop.yarn.exceptions.YarnException',
      },
    };

    expect(error.RemoteException.exception).toBe('YarnException');
    expect(error.RemoteException.javaClassName).toBe(
      'org.apache.hadoop.yarn.exceptions.YarnException',
    );
  });

  it('should accept AccessControlException', () => {
    const accessError: MutationError = {
      RemoteException: {
        exception: 'AccessControlException',
        message: 'User does not have permission to modify scheduler configuration',
        javaClassName: 'org.apache.hadoop.security.AccessControlException',
      },
    };

    expect(accessError.RemoteException.exception).toBe('AccessControlException');
    expect(accessError.RemoteException.message).toContain('permission');
  });
});

describe('ValidationResponse interface', () => {
  it('should accept successful validation response', () => {
    const validResponse: ValidationResponse = {
      validation: 'success',
      versionId: 12345,
    };

    expect(validResponse.validation).toBe('success');
    expect(validResponse.errors).toBeUndefined();
    expect(validResponse.versionId).toBe(12345);
  });

  it('should accept validation failure response', () => {
    const invalidResponse: ValidationResponse = {
      validation: 'failed',
      errors: [
        'Queue capacity for root.production children does not sum to 100%',
        'Maximum capacity cannot be less than capacity for queue root.dev',
      ],
      mutationId: 'abc-123',
    };

    expect(invalidResponse.validation).toBe('failed');
    expect(invalidResponse.errors).toHaveLength(2);
    expect(invalidResponse.errors?.[0]).toContain('sum to 100%');
    expect(invalidResponse.mutationId).toBe('abc-123');
  });

  it('should handle single validation error', () => {
    const singleErrorResponse: ValidationResponse = {
      validation: 'failed',
      errors: ['Queue name cannot contain dots'],
    };

    expect(singleErrorResponse.validation).toBe('failed');
    expect(singleErrorResponse.errors).toHaveLength(1);
  });
});
