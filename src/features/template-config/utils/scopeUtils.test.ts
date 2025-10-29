import { describe, expect, it } from 'vitest';
import { buildTemplateScopeGroups, createTemplateScope } from './scopeUtils';
import type { StagedChange } from '~/types';

describe('scopeUtils', () => {
  const baseQueuePath = 'root.analytics';

  const createConfigMap = (entries: Array<[string, string]>): Map<string, string> => {
    return new Map(entries);
  };

  const buildStagedChange = (queuePath: string): StagedChange => ({
    id: `change-${queuePath}`,
    timestamp: Date.now(),
    type: 'update',
    queuePath,
    property: 'dummy',
    oldValue: 'old',
    newValue: 'new',
  });

  it('adds default legacy scope when legacy mode is enabled', () => {
    const config = createConfigMap([]);

    const result = buildTemplateScopeGroups({
      queuePath: baseQueuePath,
      configData: config,
      stagedChanges: [],
      legacyEnabled: true,
      flexibleEnabled: false,
    });

    const legacyGroup = result.find((group) => group.type === 'legacy');
    expect(legacyGroup).toBeDefined();
    expect(legacyGroup?.scopes.map((scope) => scope.queuePath)).toContain(
      `${baseQueuePath}.leaf-queue-template`,
    );
  });

  it('merges staged flexible scopes and keeps them sorted', () => {
    const stagedScopeA = `${baseQueuePath}.team-a.auto-queue-creation-v2.template`;
    const stagedScopeB = `${baseQueuePath}.team-b.auto-queue-creation-v2.leaf-template`;

    const result = buildTemplateScopeGroups({
      queuePath: baseQueuePath,
      configData: createConfigMap([[`yarn.scheduler.capacity.${stagedScopeB}.property`, 'value']]),
      stagedChanges: [buildStagedChange(stagedScopeA)],
      legacyEnabled: false,
      flexibleEnabled: true,
    });

    const flexibleGroup = result.find((group) => group.type === 'flexible');
    expect(flexibleGroup).toBeDefined();
    const scopePaths = flexibleGroup?.scopes.map((scope) => scope.queuePath);
    expect(scopePaths).toEqual(
      expect.arrayContaining([
        `${baseQueuePath}.auto-queue-creation-v2.template`,
        stagedScopeA,
        stagedScopeB,
      ]),
    );

    // Ensure result is sorted lexicographically
    expect(scopePaths).toEqual([...scopePaths!].sort((a, b) => a.localeCompare(b)));
  });

  it('creates template scope metadata with wildcard awareness', () => {
    const wildcardPath = `${baseQueuePath}.*.auto-queue-creation-v2.template`;

    const scope = createTemplateScope(baseQueuePath, wildcardPath, 'flexibleShared');

    expect(scope.id).toBe(`flexibleShared:${wildcardPath}`);
    expect(scope.displayQueuePath).toBe(`${baseQueuePath}.*`);
    expect(scope.isWildcard).toBe(true);
    expect(scope.allowDeletion).toBe(true);
  });
});
