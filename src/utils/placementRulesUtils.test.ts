import { describe, it, expect } from 'vitest';
import { extractPlacementRulesFromConfig } from './placementRulesUtils';
import { SPECIAL_VALUES } from '~/types/constants/special-values';

describe('extractPlacementRulesFromConfig', () => {
  it('should return JSON format rules when configured', () => {
    const configData = new Map([
      ['yarn.scheduler.capacity.mapping-rule-format', 'json'],
      [
        SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY,
        JSON.stringify({
          rules: [
            {
              type: 'user',
              matches: '*',
              policy: 'user',
              parentQueue: 'root.users',
              fallbackResult: 'skip',
            },
            {
              type: 'group',
              matches: 'dev',
              policy: 'specified',
              value: 'root.dev',
              create: true,
            },
          ],
        }),
      ],
    ]);

    const result = extractPlacementRulesFromConfig(configData);

    expect(result.format).toBe('json');
    expect(result.rules).toHaveLength(2);
    expect(result.rules?.[0]).toEqual({
      type: 'user',
      matches: '*',
      policy: 'user',
      parentQueue: 'root.users',
      fallbackResult: 'skip',
    });
    expect(result.rules?.[1]).toEqual({
      type: 'group',
      matches: 'dev',
      policy: 'specified',
      value: 'root.dev',
      create: true,
    });
  });

  it('should return empty rules array when JSON format but no rules property', () => {
    const configData = new Map([
      ['yarn.scheduler.capacity.mapping-rule-format', 'json'],
      [SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, JSON.stringify({})],
    ]);

    const result = extractPlacementRulesFromConfig(configData);

    expect(result.format).toBe('json');
    expect(result.rules).toEqual([]);
  });

  it('should return empty rules array when JSON format but no JSON property', () => {
    const configData = new Map([['yarn.scheduler.capacity.mapping-rule-format', 'json']]);

    const result = extractPlacementRulesFromConfig(configData);

    expect(result.format).toBe('json');
    expect(result.rules).toEqual([]);
  });

  it('should handle invalid JSON gracefully', () => {
    const configData = new Map([
      ['yarn.scheduler.capacity.mapping-rule-format', 'json'],
      [SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, 'invalid json'],
    ]);

    const result = extractPlacementRulesFromConfig(configData);

    expect(result.format).toBe('json');
    expect(result.rules).toEqual([]);
  });

  it('should detect legacy format rules', () => {
    const configData = new Map([
      ['yarn.scheduler.capacity.queue-mappings', 'u:user1:queue1,g:group1:queue2'],
    ]);

    const result = extractPlacementRulesFromConfig(configData);

    expect(result.format).toBe('legacy');
    expect(result.legacyRules).toBe('u:user1:queue1,g:group1:queue2');
    expect(result.requiresMigration).toBe(true);
    expect(result.rules).toBeUndefined();
  });

  it('should return none format when no rules configured', () => {
    const configData = new Map([['some.other.property', 'value']]);

    const result = extractPlacementRulesFromConfig(configData);

    expect(result.format).toBe('none');
    expect(result.rules).toBeUndefined();
    expect(result.legacyRules).toBeUndefined();
    expect(result.requiresMigration).toBeUndefined();
  });

  it('should handle empty config map', () => {
    const configData = new Map();

    const result = extractPlacementRulesFromConfig(configData);

    expect(result.format).toBe('none');
    expect(result.rules).toBeUndefined();
    expect(result.legacyRules).toBeUndefined();
  });

  it('should prioritize JSON format over legacy when both exist', () => {
    const configData = new Map([
      ['yarn.scheduler.capacity.mapping-rule-format', 'json'],
      [
        SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY,
        JSON.stringify({
          rules: [{ type: 'user', matches: '*', policy: 'user' }],
        }),
      ],
      ['yarn.scheduler.capacity.queue-mappings', 'u:user1:queue1'], // This should be ignored
    ]);

    const result = extractPlacementRulesFromConfig(configData);

    expect(result.format).toBe('json');
    expect(result.rules).toHaveLength(1);
    expect(result.legacyRules).toBeUndefined();
  });
});
