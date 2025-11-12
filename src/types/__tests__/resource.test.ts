import { describe, it, expect } from 'vitest';
import type { ResourceInfo, ResourceInformation } from '~/types/resource';

describe('ResourceInfo interface', () => {
  it('should accept basic resource info with memory and vCores', () => {
    const resource: ResourceInfo = {
      memory: 4096,
      vCores: 8,
    };

    expect(resource.memory).toBe(4096);
    expect(resource.vCores).toBe(8);
  });

  it('should accept resource info with extended resource types', () => {
    const extendedResource: ResourceInfo = {
      memory: 8192,
      vCores: 16,
      resourceInformations: {
        gpu: 4,
        fpga: 2,
        bandwidth: 1000,
      },
    };

    expect(extendedResource.resourceInformations).toBeDefined();
    expect(extendedResource.resourceInformations?.['gpu']).toBe(4);
    expect(extendedResource.resourceInformations?.['fpga']).toBe(2);
    expect(extendedResource.resourceInformations?.['bandwidth']).toBe(1000);
  });

  it('should handle resource info without extended resources', () => {
    const basicResource: ResourceInfo = {
      memory: 2048,
      vCores: 4,
    };

    expect(basicResource.resourceInformations).toBeUndefined();
  });

  it('should handle zero resources', () => {
    const zeroResource: ResourceInfo = {
      memory: 0,
      vCores: 0,
    };

    expect(zeroResource.memory).toBe(0);
    expect(zeroResource.vCores).toBe(0);
  });
});

describe('ResourceInformation interface', () => {
  it('should accept detailed resource information', () => {
    const resourceInfo: ResourceInformation = {
      attributes: {},
      maximumAllocation: 32768,
      minimumAllocation: 1024,
      name: 'memory-mb',
      resourceType: 'COUNTABLE',
      units: 'Mi',
      value: 4096,
    };

    expect(resourceInfo.name).toBe('memory-mb');
    expect(resourceInfo.resourceType).toBe('COUNTABLE');
    expect(resourceInfo.units).toBe('Mi');
    expect(resourceInfo.value).toBe(4096);
  });

  it('should handle vCore resource information', () => {
    const vcoreInfo: ResourceInformation = {
      attributes: {},
      maximumAllocation: 88,
      minimumAllocation: 1,
      name: 'vcores',
      resourceType: 'COUNTABLE',
      units: '',
      value: 8,
    };

    expect(vcoreInfo.name).toBe('vcores');
    expect(vcoreInfo.units).toBe('');
    expect(vcoreInfo.maximumAllocation).toBe(88);
  });

  it('should handle custom resource types', () => {
    const gpuInfo: ResourceInformation = {
      attributes: {
        vendor: 'nvidia',
        model: 'A100',
      },
      maximumAllocation: 8,
      minimumAllocation: 0,
      name: 'gpu',
      resourceType: 'COUNTABLE',
      units: 'gpu',
      value: 2,
    };

    expect(gpuInfo.name).toBe('gpu');
    expect(gpuInfo.attributes).toBeDefined();
    expect(gpuInfo.attributes?.['vendor']).toBe('nvidia');
    expect(gpuInfo.attributes?.['model']).toBe('A100');
  });
});
