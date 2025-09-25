import { describe, it, expect } from 'vitest';
import type { NodeLabel, LabelConfig, NodeLabelsInfo, NodeToLabels } from '../node-label';

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

describe('LabelConfig interface', () => {
  it('should accept label configuration for a queue', () => {
    const labelConfig: LabelConfig = {
      name: 'gpu',
      capacity: 80,
      maximumCapacity: 100,
      isAccessible: true,
    };

    expect(labelConfig.name).toBe('gpu');
    expect(labelConfig.capacity).toBe(80);
    expect(labelConfig.maximumCapacity).toBe(100);
    expect(labelConfig.isAccessible).toBe(true);
  });

  it('should handle label config with AM resource percent', () => {
    const labelConfigWithAm: LabelConfig = {
      name: 'fpga',
      capacity: 50,
      maximumCapacity: 75,
      maximumAmResourcePercent: 0.2,
      isAccessible: true,
    };

    expect(labelConfigWithAm.maximumAmResourcePercent).toBe(0.2);
  });

  it('should handle inaccessible label', () => {
    const inaccessibleLabel: LabelConfig = {
      name: 'restricted',
      isAccessible: false,
    };

    expect(inaccessibleLabel.isAccessible).toBe(false);
    expect(inaccessibleLabel.capacity).toBeUndefined();
  });
});

describe('NodeLabelsInfo interface', () => {
  it('should accept node labels response', () => {
    const nodeLabelsInfo: NodeLabelsInfo = {
      nodeLabelInfo: [
        {
          name: 'gpu',
          exclusivity: true,
          activeNMs: 3,
        },
        {
          name: 'fpga',
          exclusivity: false,
          activeNMs: 2,
        },
      ],
    };

    expect(nodeLabelsInfo.nodeLabelInfo).toHaveLength(2);
    expect(nodeLabelsInfo.nodeLabelInfo[0].name).toBe('gpu');
    expect(nodeLabelsInfo.nodeLabelInfo[1].exclusivity).toBe(false);
  });

  it('should handle empty node labels', () => {
    const emptyLabels: NodeLabelsInfo = {
      nodeLabelInfo: [],
    };

    expect(emptyLabels.nodeLabelInfo).toHaveLength(0);
  });
});

describe('NodeToLabels interface', () => {
  it('should accept node to labels mapping', () => {
    const nodeToLabels: NodeToLabels = {
      nodeToLabels: [
        { nodeId: 'node1.example.com:8041', nodeLabels: ['gpu'] },
        { nodeId: 'node2.example.com:8041', nodeLabels: ['fpga'] },
        { nodeId: 'node3.example.com:8041', nodeLabels: [] },
      ],
    };

    expect(nodeToLabels.nodeToLabels[0].nodeLabels).toContain('gpu');
    expect(nodeToLabels.nodeToLabels[1].nodeLabels).toContain('fpga');
    expect(nodeToLabels.nodeToLabels[2].nodeLabels).toHaveLength(0);
  });

  it('should handle empty node to labels mapping', () => {
    const emptyMapping: NodeToLabels = {
      nodeToLabels: [],
    };

    expect(emptyMapping.nodeToLabels).toHaveLength(0);
  });
});
