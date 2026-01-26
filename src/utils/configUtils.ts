import { SPECIAL_VALUES } from '~/types/constants/special-values';
import {
  buildGlobalPropertyKey,
  buildNodeLabelPropertyKey,
  buildPropertyKey,
} from '~/utils/propertyUtils';
import type { StagedChange } from '~/types/staged-change';

export function mergeStagedConfig(
  configData: Map<string, string>,
  stagedChanges: StagedChange[],
): Map<string, string> {
  const merged = new Map(configData);

  stagedChanges.forEach((change) => {
    if (!change.property) {
      return;
    }

    if (change.type === 'remove' && change.queuePath !== SPECIAL_VALUES.GLOBAL_QUEUE_PATH) {
      const queuePrefix = `${buildPropertyKey(change.queuePath, '')}`;
      for (const key of Array.from(merged.keys())) {
        if (key.startsWith(queuePrefix)) {
          merged.delete(key);
        }
      }
    }

    const key = buildEffectivePropertyKey(change.queuePath, change.property);

    if (change.newValue === '' || change.newValue === null || change.newValue === undefined) {
      merged.delete(key);
    } else {
      merged.set(key, change.newValue);
    }
  });

  return merged;
}

export function getEffectivePropertyValue(
  configData: Map<string, string>,
  stagedChanges: StagedChange[],
  queuePath: string,
  property: string,
): string {
  const stagedChange = stagedChanges.find(
    (change) => change.queuePath === queuePath && change.property === property,
  );

  if (stagedChange && stagedChange.newValue !== undefined) {
    return stagedChange.newValue;
  }

  const key = buildEffectivePropertyKey(queuePath, property);
  return configData.get(key) ?? '';
}

export function applyFieldPreview(
  baseConfig: Map<string, string>,
  queuePath: string,
  fieldName: string,
  fieldValue: unknown,
): Map<string, string> {
  const merged = new Map(baseConfig);
  const key = buildEffectivePropertyKey(queuePath, fieldName);

  if (fieldValue === '' || fieldValue === null || fieldValue === undefined) {
    merged.delete(key);
  } else {
    merged.set(key, String(fieldValue));
  }

  return merged;
}

export function buildEffectivePropertyKey(queuePath: string, propertyName: string): string {
  if (queuePath === SPECIAL_VALUES.GLOBAL_QUEUE_PATH) {
    return buildGlobalPropertyKey(propertyName);
  }

  if (propertyName.startsWith('accessible-node-labels.')) {
    const parts = propertyName.split('.');
    if (parts.length >= 3) {
      const label = parts[1];
      const rest = parts.slice(2).join('.');
      return buildNodeLabelPropertyKey(queuePath, label, rest);
    }
  }

  return buildPropertyKey(queuePath, propertyName);
}
