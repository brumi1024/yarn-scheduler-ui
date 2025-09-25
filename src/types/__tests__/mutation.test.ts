import { describe, it, expect } from 'vitest';
import type {
  MutationResponse,
  MutationError,
  ValidationResponse,
  ConfigVersionResponse,
  NodeLabelAddRequest,
  NodeLabelRemoveRequest,
  NodeLabelReplaceRequest,
} from '../mutation';

describe('MutationResponse interface', () => {
  it('should accept successful mutation response', () => {
    const successResponse: MutationResponse = {
      success: true,
      configVersion: 2,
    };

    expect(successResponse.success).toBe(true);
    expect(successResponse.configVersion).toBe(2);
    expect(successResponse.error).toBeUndefined();
  });

  it('should accept error mutation response', () => {
    const errorResponse: MutationResponse = {
      success: false,
      error: {
        RemoteException: {
          exception: 'YarnException',
          message: 'Queue capacity must sum to 100%',
          javaClassName: 'org.apache.hadoop.yarn.exceptions.YarnException',
        },
      },
    };

    expect(errorResponse.success).toBe(false);
    expect(errorResponse.error).toBeDefined();
    expect(errorResponse.error?.RemoteException.message).toBe('Queue capacity must sum to 100%');
  });
});

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

describe('ConfigVersionResponse interface', () => {
  it('should accept version response', () => {
    const versionResponse: ConfigVersionResponse = {
      versionInfo: {
        version: 3,
        lastModified: '2024-01-15T10:30:00Z',
        lastModifiedBy: 'admin',
      },
    };

    expect(versionResponse.versionInfo.version).toBe(3);
    expect(versionResponse.versionInfo.lastModified).toBe('2024-01-15T10:30:00Z');
    expect(versionResponse.versionInfo.lastModifiedBy).toBe('admin');
  });

  it('should handle version info without optional fields', () => {
    const minimalVersion: ConfigVersionResponse = {
      versionInfo: {
        version: 1,
      },
    };

    expect(minimalVersion.versionInfo.version).toBe(1);
    expect(minimalVersion.versionInfo.lastModified).toBeUndefined();
    expect(minimalVersion.versionInfo.lastModifiedBy).toBeUndefined();
  });
});

describe('NodeLabelAddRequest interface', () => {
  it('should accept add node labels request', () => {
    const addRequest: NodeLabelAddRequest = {
      nodeLabels: [
        { name: 'gpu', exclusivity: true },
        { name: 'fpga', exclusivity: false },
        { name: 'ssd', exclusivity: true },
      ],
    };

    expect(addRequest.nodeLabels).toHaveLength(3);
    expect(addRequest.nodeLabels.map((label) => label.name)).toContain('gpu');
  });

  it('should accept single label addition', () => {
    const singleLabelRequest: NodeLabelAddRequest = {
      nodeLabels: [{ name: 'high-memory', exclusivity: true }],
    };

    expect(singleLabelRequest.nodeLabels).toHaveLength(1);
  });
});

describe('NodeLabelRemoveRequest interface', () => {
  it('should accept remove node labels request', () => {
    const removeRequest: NodeLabelRemoveRequest = {
      labels: ['deprecated-label', 'old-gpu'],
    };

    expect(removeRequest.labels).toHaveLength(2);
    expect(removeRequest.labels).toContain('deprecated-label');
  });
});

describe('NodeLabelReplaceRequest interface', () => {
  it('should accept replace node labels request', () => {
    const replaceRequest: NodeLabelReplaceRequest = {
      nodeToLabels: [
        { nodeId: 'node1.example.com:8041', labels: ['gpu'] },
        { nodeId: 'node2.example.com:8041', labels: ['fpga'] },
        { nodeId: 'node3.example.com:8041', labels: [] },
      ],
    };

    expect(replaceRequest.nodeToLabels).toHaveLength(3);
    expect(replaceRequest.nodeToLabels[0].labels).toContain('gpu');
    expect(replaceRequest.nodeToLabels[2].labels).toHaveLength(0);
  });

  it('should handle bulk label assignments', () => {
    const bulkRequest: NodeLabelReplaceRequest = {
      nodeToLabels: [
        { nodeId: 'gpu-node-1:8041', labels: ['gpu'] },
        { nodeId: 'gpu-node-2:8041', labels: ['gpu'] },
        { nodeId: 'gpu-node-3:8041', labels: ['gpu'] },
        { nodeId: 'cpu-node-1:8041', labels: ['high-cpu'] },
        { nodeId: 'cpu-node-2:8041', labels: ['high-cpu'] },
      ],
    };

    const gpuNodes = bulkRequest.nodeToLabels.filter((mapping) =>
      mapping.labels.includes('gpu'),
    ).length;

    expect(gpuNodes).toBe(3);
  });
});
