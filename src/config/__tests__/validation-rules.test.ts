import { describe, it, expect } from 'vitest';
import { runFieldValidation, type ValidationContext } from '../validation-rules';
import { AUTO_CREATION_PROPS } from '~/types/constants/auto-creation';
import type { SchedulerInfo } from '~/types';

function createMockSchedulerData(): SchedulerInfo {
  return {
    type: 'capacityScheduler',
    queueName: 'root',
    capacity: 100,
    usedCapacity: 0,
    maxCapacity: 100,
    queues: {
      queue: [
        {
          queueName: 'production',
          queuePath: 'root.production',
          capacity: 60,
          usedCapacity: 0,
          maxCapacity: 100,
          absoluteCapacity: 60,
          absoluteMaxCapacity: 100,
          absoluteUsedCapacity: 0,
          numApplications: 0,
          numActiveApplications: 0,
          numPendingApplications: 0,
          queueType: 'parent',
          state: 'RUNNING',
          queues: {
            queue: [
              {
                queueName: 'critical',
                queuePath: 'root.production.critical',
                capacity: 50,
                usedCapacity: 0,
                maxCapacity: 100,
                absoluteCapacity: 30,
                absoluteMaxCapacity: 60,
                absoluteUsedCapacity: 0,
                numApplications: 0,
                numActiveApplications: 0,
                numPendingApplications: 0,
                queueType: 'leaf',
                state: 'RUNNING',
              },
            ],
          },
        },
        {
          queueName: 'development',
          queuePath: 'root.development',
          capacity: 40,
          usedCapacity: 0,
          maxCapacity: 100,
          absoluteCapacity: 40,
          absoluteMaxCapacity: 100,
          absoluteUsedCapacity: 0,
          numApplications: 0,
          numActiveApplications: 0,
          numPendingApplications: 0,
          queueType: 'leaf',
          state: 'RUNNING',
        },
      ],
    },
  };
}

describe('PARENT_CHILD_CAPACITY_MODE validation rule', () => {
  it('should pass when parent uses percentage and child uses percentage', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.capacity', '100'],
      ['yarn.scheduler.capacity.root.production.capacity', '60'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production',
      fieldName: 'capacity',
      fieldValue: '60',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const parentChildModeIssues = issues.filter(
      (issue) => issue.rule === 'parent-child-capacity-mode',
    );

    expect(parentChildModeIssues).toHaveLength(0);
  });

  it('should pass when parent uses absolute and child uses absolute', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.capacity', '100'],
      ['yarn.scheduler.capacity.root.production.capacity', '[memory=8192,vcores=8]'],
      ['yarn.scheduler.capacity.root.production.critical.capacity', '[memory=4096,vcores=4]'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production.critical',
      fieldName: 'capacity',
      fieldValue: '[memory=4096,vcores=4]',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const parentChildModeIssues = issues.filter(
      (issue) => issue.rule === 'parent-child-capacity-mode',
    );

    expect(parentChildModeIssues).toHaveLength(0);
  });

  it('should fail when parent uses absolute and child uses percentage', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.capacity', '100'],
      ['yarn.scheduler.capacity.root.production.capacity', '[memory=8192,vcores=8]'],
      ['yarn.scheduler.capacity.root.production.critical.capacity', '50'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production.critical',
      fieldName: 'capacity',
      fieldValue: '50',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const parentChildModeIssues = issues.filter(
      (issue) => issue.rule === 'parent-child-capacity-mode',
    );

    expect(parentChildModeIssues).toHaveLength(1);
    expect(parentChildModeIssues[0]).toMatchObject({
      queuePath: 'root.production.critical',
      field: 'capacity',
      severity: 'error',
      rule: 'parent-child-capacity-mode',
    });
    expect(parentChildModeIssues[0].message).toContain('Parent queue uses absolute resources');
  });

  it('should fail when parent uses absolute and child uses weight', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.capacity', '100'],
      ['yarn.scheduler.capacity.root.production.capacity', '[memory=8192,vcores=8]'],
      ['yarn.scheduler.capacity.root.production.critical.capacity', '2w'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production.critical',
      fieldName: 'capacity',
      fieldValue: '2w',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const parentChildModeIssues = issues.filter(
      (issue) => issue.rule === 'parent-child-capacity-mode',
    );

    expect(parentChildModeIssues).toHaveLength(1);
    expect(parentChildModeIssues[0]).toMatchObject({
      queuePath: 'root.production.critical',
      field: 'capacity',
      severity: 'error',
      rule: 'parent-child-capacity-mode',
    });
  });

  it('should not run in flexible mode', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.capacity', '100'],
      ['yarn.scheduler.capacity.root.production.capacity', '[memory=8192,vcores=8]'],
      ['yarn.scheduler.capacity.root.production.critical.capacity', '50'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production.critical',
      fieldName: 'capacity',
      fieldValue: '50',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: false,
    };

    const issues = runFieldValidation(context);
    const parentChildModeIssues = issues.filter(
      (issue) => issue.rule === 'parent-child-capacity-mode',
    );

    expect(parentChildModeIssues).toHaveLength(0);
  });

  it('should not apply to root queue', () => {
    const config = new Map([['yarn.scheduler.capacity.root.capacity', '100']]);

    const context: ValidationContext = {
      queuePath: 'root',
      fieldName: 'capacity',
      fieldValue: '100',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const parentChildModeIssues = issues.filter(
      (issue) => issue.rule === 'parent-child-capacity-mode',
    );

    expect(parentChildModeIssues).toHaveLength(0);
  });

  it('should not produce error when validating existing queue with unchanged capacity', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.capacity', '100'],
      ['yarn.scheduler.capacity.root.production.capacity', '[memory=8192,vcores=8]'],
      ['yarn.scheduler.capacity.root.production.critical.capacity', '50'],
    ]);

    // Queue already has percentage capacity, not changing it
    const context: ValidationContext = {
      queuePath: 'root.production.critical',
      fieldName: 'capacity',
      fieldValue: '50', // Same as current value
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const parentChildModeIssues = issues.filter(
      (issue) => issue.rule === 'parent-child-capacity-mode',
    );

    // Should still produce error because it's invalid configuration
    expect(parentChildModeIssues).toHaveLength(1);
  });

  it('should fail when parent uses percentage and child uses absolute (reverse direction)', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.capacity', '100'],
      ['yarn.scheduler.capacity.root.production.capacity', '60'],
      ['yarn.scheduler.capacity.root.production.critical.capacity', '[memory=4096,vcores=4]'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production.critical',
      fieldName: 'capacity',
      fieldValue: '[memory=4096,vcores=4]',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const parentChildModeIssues = issues.filter(
      (issue) => issue.rule === 'parent-child-capacity-mode',
    );

    expect(parentChildModeIssues).toHaveLength(1);
    expect(parentChildModeIssues[0]).toMatchObject({
      queuePath: 'root.production.critical',
      field: 'capacity',
      severity: 'error',
      rule: 'parent-child-capacity-mode',
    });
    expect(parentChildModeIssues[0].message).toContain('Parent queue uses percentage mode');
    expect(parentChildModeIssues[0].message).toContain('cannot use absolute resources');
  });

  it('should fail when parent uses weight and child uses absolute (reverse direction)', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.capacity', '100'],
      ['yarn.scheduler.capacity.root.production.capacity', '2w'],
      ['yarn.scheduler.capacity.root.production.critical.capacity', '[memory=4096,vcores=4]'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production.critical',
      fieldName: 'capacity',
      fieldValue: '[memory=4096,vcores=4]',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const parentChildModeIssues = issues.filter(
      (issue) => issue.rule === 'parent-child-capacity-mode',
    );

    expect(parentChildModeIssues).toHaveLength(1);
    expect(parentChildModeIssues[0]).toMatchObject({
      queuePath: 'root.production.critical',
      field: 'capacity',
      severity: 'error',
      rule: 'parent-child-capacity-mode',
    });
    expect(parentChildModeIssues[0].message).toContain('Parent queue uses weight mode');
    expect(parentChildModeIssues[0].message).toContain('cannot use absolute resources');
  });

  it('should pass when both parent and child use weight mode', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.capacity', '100'],
      ['yarn.scheduler.capacity.root.production.capacity', '2w'],
      ['yarn.scheduler.capacity.root.production.critical.capacity', '1w'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production.critical',
      fieldName: 'capacity',
      fieldValue: '1w',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const parentChildModeIssues = issues.filter(
      (issue) => issue.rule === 'parent-child-capacity-mode',
    );

    expect(parentChildModeIssues).toHaveLength(0);
  });
});

describe('WEIGHT_MODE_TRANSITION_FLEXIBLE_AQC validation rule', () => {
  it('should pass when changing weight to percentage without flexible AQC', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.production.capacity', '2w'],
      ['yarn.scheduler.capacity.root.production.auto-queue-creation-v2.enabled', 'false'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production',
      fieldName: 'capacity',
      fieldValue: '60',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const transitionIssues = issues.filter(
      (issue) => issue.rule === 'weight-mode-transition-flexible-aqc',
    );

    expect(transitionIssues).toHaveLength(0);
  });

  it('should pass when changing weight to absolute without flexible AQC', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.production.capacity', '2w'],
      ['yarn.scheduler.capacity.root.production.auto-queue-creation-v2.enabled', 'false'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production',
      fieldName: 'capacity',
      fieldValue: '[memory=8192,vcores=8]',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const transitionIssues = issues.filter(
      (issue) => issue.rule === 'weight-mode-transition-flexible-aqc',
    );

    expect(transitionIssues).toHaveLength(0);
  });

  it('should fail when changing weight to percentage with flexible AQC enabled', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.production.capacity', '2w'],
      ['yarn.scheduler.capacity.root.production.auto-queue-creation-v2.enabled', 'true'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production',
      fieldName: 'capacity',
      fieldValue: '60',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const transitionIssues = issues.filter(
      (issue) => issue.rule === 'weight-mode-transition-flexible-aqc',
    );

    expect(transitionIssues).toHaveLength(1);
    expect(transitionIssues[0]).toMatchObject({
      queuePath: 'root.production',
      field: 'capacity',
      severity: 'error',
      rule: 'weight-mode-transition-flexible-aqc',
    });
    expect(transitionIssues[0].message).toContain('Cannot change from weight mode to percentage');
    expect(transitionIssues[0].message).toContain(AUTO_CREATION_PROPS.FLEXIBLE_ENABLED);
  });

  it('should fail when changing weight to absolute with flexible AQC enabled', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.production.capacity', '2w'],
      ['yarn.scheduler.capacity.root.production.auto-queue-creation-v2.enabled', 'true'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production',
      fieldName: 'capacity',
      fieldValue: '[memory=8192,vcores=8]',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const transitionIssues = issues.filter(
      (issue) => issue.rule === 'weight-mode-transition-flexible-aqc',
    );

    expect(transitionIssues).toHaveLength(1);
    expect(transitionIssues[0]).toMatchObject({
      queuePath: 'root.production',
      field: 'capacity',
      severity: 'error',
      rule: 'weight-mode-transition-flexible-aqc',
    });
    expect(transitionIssues[0].message).toContain('Cannot change from weight mode to absolute');
  });

  it('should pass when changing percentage to weight (not transitioning FROM weight)', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.production.capacity', '60'],
      ['yarn.scheduler.capacity.root.production.auto-queue-creation-v2.enabled', 'true'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production',
      fieldName: 'capacity',
      fieldValue: '2w',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const transitionIssues = issues.filter(
      (issue) => issue.rule === 'weight-mode-transition-flexible-aqc',
    );

    expect(transitionIssues).toHaveLength(0);
  });

  it('should pass when staying in weight mode', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.production.capacity', '2w'],
      ['yarn.scheduler.capacity.root.production.auto-queue-creation-v2.enabled', 'true'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production',
      fieldName: 'capacity',
      fieldValue: '3w',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: true,
    };

    const issues = runFieldValidation(context);
    const transitionIssues = issues.filter(
      (issue) => issue.rule === 'weight-mode-transition-flexible-aqc',
    );

    expect(transitionIssues).toHaveLength(0);
  });

  it('should not run in flexible mode', () => {
    const config = new Map([
      ['yarn.scheduler.capacity.root.production.capacity', '2w'],
      ['yarn.scheduler.capacity.root.production.auto-queue-creation-v2.enabled', 'true'],
    ]);

    const context: ValidationContext = {
      queuePath: 'root.production',
      fieldName: 'capacity',
      fieldValue: '60',
      config,
      schedulerData: createMockSchedulerData(),
      stagedChanges: [],
      legacyModeEnabled: false,
    };

    const issues = runFieldValidation(context);
    const transitionIssues = issues.filter(
      (issue) => issue.rule === 'weight-mode-transition-flexible-aqc',
    );

    expect(transitionIssues).toHaveLength(0);
  });
});
