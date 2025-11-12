import { describe, it, expect } from 'vitest';
import type { NodeLabel } from '~/types/node-label';

describe('NodeLabel interface', () => {
  it('should accept basic node label definition', () => {
    const label: NodeLabel = {
      name: 'gpu',
      exclusivity: true,
    };

    expect(label.name).toBe('gpu');
    expect(label.exclusivity).toBe(true);
  });

  it('should accept node label with partition info', () => {
    const labelWithPartition: NodeLabel = {
      name: 'fpga',
      exclusivity: false,
      partitionName: 'fpga-partition',
      activeNMs: 5,
      totalResource: {
        memory: 32768,
        vCores: 16,
      },
    };

    expect(labelWithPartition.partitionName).toBe('fpga-partition');
    expect(labelWithPartition.activeNMs).toBe(5);
    expect(labelWithPartition.totalResource?.memory).toBe(32768);
  });

  it('should handle non-exclusive label', () => {
    const nonExclusiveLabel: NodeLabel = {
      name: 'ssd',
      exclusivity: false,
    };

    expect(nonExclusiveLabel.exclusivity).toBe(false);
  });
});
