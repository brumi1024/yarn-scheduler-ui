import { nanoid } from 'nanoid';
import { buildPropertyKey } from '~/utils/propertyUtils';
import type { SchedulerStore } from '~/stores/schedulerStore';
import type {
  CapacityResourceMode,
  CapacityRowDraft,
  CapacityVectorEntryDraft,
} from '~/stores/slices/capacityEditorSlice';

const VECTOR_START = '[';
const VECTOR_END = ']';
const DEFAULT_VECTOR_KEYS = ['memory', 'vcores'];

export const DEFAULT_PARTITION_VALUE = '__DEFAULT_PARTITION__';

const sanitize = (value?: string | null) => (value ?? '').trim();

const looksLikeVector = (value: string): boolean => {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.startsWith(VECTOR_START) && trimmed.endsWith(VECTOR_END);
};

export const parseVectorDraft = (value: string): CapacityVectorEntryDraft[] => {
  const trimmed = value.trim();
  if (!looksLikeVector(trimmed)) {
    return [];
  }

  const withoutBrackets = trimmed.slice(1, -1).trim();
  if (!withoutBrackets) {
    return [];
  }

  return withoutBrackets
    .split(',')
    .map((pair) => {
      const [rawKey, rawValue] = pair.split('=');
      const key = rawKey?.trim() ?? '';
      const entryValue = rawValue?.trim() ?? '';

      if (!key) {
        return null;
      }

      return {
        id: nanoid(),
        key,
        value: entryValue,
      };
    })
    .filter((entry): entry is CapacityVectorEntryDraft => entry !== null);
};

export const ensureCoreEntries = (
  entries: CapacityVectorEntryDraft[],
  includeDefaults = true,
): CapacityVectorEntryDraft[] => {
  if (!includeDefaults) {
    return entries;
  }

  const existingKeys = new Set(entries.map((entry) => entry.key));
  const withDefaults = [...entries];

  DEFAULT_VECTOR_KEYS.forEach((key) => {
    if (!existingKeys.has(key)) {
      withDefaults.push({
        id: nanoid(),
        key,
        value: '',
      });
    }
  });

  return withDefaults;
};

const inferModeFromValues = (capacity: string, maxCapacity: string): CapacityResourceMode => {
  if (looksLikeVector(capacity) || looksLikeVector(maxCapacity)) {
    return 'vector';
  }
  return 'simple';
};

export interface CreateRowDraftOptions {
  queuePath: string;
  queueName: string;
  baseCapacity: string | undefined;
  baseMaxCapacity: string | undefined;
  currentCapacity?: string | null;
  currentMaxCapacity?: string | null;
  isOrigin?: boolean;
  isNew?: boolean;
  hasStagedChange?: boolean;
}

export const createRowDraft = ({
  queuePath,
  queueName,
  baseCapacity,
  baseMaxCapacity,
  currentCapacity,
  currentMaxCapacity,
  isOrigin = false,
  isNew = false,
  hasStagedChange = false,
}: CreateRowDraftOptions): CapacityRowDraft => {
  const baseCapacityValue = sanitize(baseCapacity);
  const baseMaxCapacityValue = sanitize(baseMaxCapacity);

  const capacityValue = sanitize(
    currentCapacity !== null && currentCapacity !== undefined ? currentCapacity : baseCapacityValue,
  );
  const maxCapacityValue = sanitize(
    currentMaxCapacity !== null && currentMaxCapacity !== undefined
      ? currentMaxCapacity
      : baseMaxCapacityValue,
  );

  const mode = inferModeFromValues(capacityValue, maxCapacityValue);
  const baseMode = inferModeFromValues(baseCapacityValue, baseMaxCapacityValue);

  const vectorCapacity =
    mode === 'vector' ? ensureCoreEntries(parseVectorDraft(capacityValue)) : [];
  const vectorMaxCapacity =
    mode === 'vector' ? ensureCoreEntries(parseVectorDraft(maxCapacityValue)) : [];

  return {
    queuePath,
    queueName,
    isOrigin,
    isNew,
    hasStagedChange,
    mode,
    baseMode,
    baseCapacityValue,
    baseMaxCapacityValue,
    capacityValue,
    maxCapacityValue,
    vectorCapacity,
    vectorMaxCapacity,
  };
};

export const convertVectorDraftToString = (entries: CapacityVectorEntryDraft[]): string => {
  if (entries.length === 0) {
    return '';
  }

  const parts = entries
    .filter((entry) => entry.key.trim().length > 0)
    .map((entry) => `${entry.key.trim()}=${entry.value.trim()}`);

  if (parts.length === 0) {
    return '';
  }

  return `[${parts.join(',')}]`;
};

export const createEmptyVectorEntry = (key = '', value = ''): CapacityVectorEntryDraft => ({
  id: nanoid(),
  key,
  value,
});

const getParentPath = (queuePath: string): string => {
  const parts = queuePath.split('.');
  return parts.slice(0, -1).join('.');
};

const getBaseValue = (store: SchedulerStore, queuePath: string, property: string): string => {
  const key = buildPropertyKey(queuePath, property);
  return sanitize(store.configData.get(key) ?? '');
};

export const getPropertyNameForLabel = (
  label: string | null,
  property: 'capacity' | 'maximum-capacity',
) => {
  if (!label) {
    return property;
  }
  return `accessible-node-labels.${label}.${property}`;
};

export interface BuildCapacityEditorDraftsParams {
  store: SchedulerStore;
  parentQueuePath: string;
  originQueuePath: string;
  originQueueName: string;
  originInitialCapacity?: string | null;
  originInitialMaxCapacity?: string | null;
  originIsNew?: boolean;
  selectedNodeLabel?: string | null;
}

export const buildCapacityEditorDrafts = ({
  store,
  parentQueuePath,
  originQueuePath,
  originQueueName,
  originInitialCapacity = null,
  originInitialMaxCapacity = null,
  originIsNew = false,
  selectedNodeLabel = null,
}: BuildCapacityEditorDraftsParams): CapacityRowDraft[] => {
  if (!parentQueuePath) {
    return [];
  }

  const capacityProperty = getPropertyNameForLabel(selectedNodeLabel, 'capacity');
  const maxCapacityProperty = getPropertyNameForLabel(selectedNodeLabel, 'maximum-capacity');

  const drafts: CapacityRowDraft[] = [];
  const seen = new Set<string>();

  const childQueues = store.getChildQueues(parentQueuePath) ?? [];

  childQueues.forEach((queue) => {
    const queuePath = queue.queuePath;
    seen.add(queuePath);

    const baseCapacity = getBaseValue(store, queuePath, capacityProperty);
    const baseMaxCapacity = getBaseValue(store, queuePath, maxCapacityProperty);

    const capacityResult = store.getQueuePropertyValue(queuePath, capacityProperty);
    const maxCapacityResult = store.getQueuePropertyValue(queuePath, maxCapacityProperty);

    const isOrigin = queuePath === originQueuePath;
    const currentCapacity =
      isOrigin && originInitialCapacity !== null ? originInitialCapacity : capacityResult.value;
    const currentMaxCapacity =
      isOrigin && originInitialMaxCapacity !== null
        ? originInitialMaxCapacity
        : maxCapacityResult.value;

    const hasStagedChange = capacityResult.isStaged || maxCapacityResult.isStaged;

    drafts.push(
      createRowDraft({
        queuePath,
        queueName: queue.queueName,
        baseCapacity,
        baseMaxCapacity,
        currentCapacity,
        currentMaxCapacity,
        isOrigin,
        isNew: false,
        hasStagedChange,
      }),
    );
  });

  const stagedAdditions = new Map<
    string,
    {
      capacity?: string;
      maxCapacity?: string;
    }
  >();

  store.stagedChanges.forEach((change) => {
    if (change.type !== 'add' || !change.queuePath) {
      return;
    }

    const changeParent = getParentPath(change.queuePath);
    if (changeParent !== parentQueuePath) {
      return;
    }

    const entry = stagedAdditions.get(change.queuePath) ?? {};

    if (change.property === capacityProperty && change.newValue !== undefined) {
      entry.capacity = change.newValue;
    } else if (change.property === maxCapacityProperty && change.newValue !== undefined) {
      entry.maxCapacity = change.newValue;
    }

    stagedAdditions.set(change.queuePath, entry);
  });

  stagedAdditions.forEach((values, queuePath) => {
    if (seen.has(queuePath)) {
      return;
    }

    const queueName = queuePath.split('.').pop() ?? queuePath;
    const isOrigin = queuePath === originQueuePath;

    const currentCapacity =
      (isOrigin && originInitialCapacity !== null ? originInitialCapacity : values.capacity) ?? '';
    const currentMaxCapacity =
      (isOrigin && originInitialMaxCapacity !== null
        ? originInitialMaxCapacity
        : values.maxCapacity) ?? '';

    drafts.push(
      createRowDraft({
        queuePath,
        queueName,
        baseCapacity: '',
        baseMaxCapacity: '',
        currentCapacity,
        currentMaxCapacity,
        isOrigin,
        isNew: true,
        hasStagedChange: true,
      }),
    );

    seen.add(queuePath);
  });

  if (!seen.has(originQueuePath)) {
    drafts.unshift(
      createRowDraft({
        queuePath: originQueuePath,
        queueName: originQueueName || originQueuePath.split('.').pop() || originQueuePath,
        baseCapacity: originIsNew ? '' : (originInitialCapacity ?? ''),
        baseMaxCapacity: originIsNew ? '' : (originInitialMaxCapacity ?? ''),
        currentCapacity: originInitialCapacity ?? '',
        currentMaxCapacity: originInitialMaxCapacity ?? '',
        isOrigin: true,
        isNew: originIsNew,
        hasStagedChange: originIsNew,
      }),
    );
  }

  const originRow = drafts.find((draft) => draft.isOrigin);
  const otherRows = drafts.filter((draft) => !draft.isOrigin);

  return originRow ? [originRow, ...otherRows] : otherRows;
};

export interface LabelOption {
  value: string;
  label: string;
}

export const buildCapacityEditorLabelOptions = (
  store: SchedulerStore,
  parentQueuePath: string | null,
): LabelOption[] => {
  const options: LabelOption[] = [
    {
      value: DEFAULT_PARTITION_VALUE,
      label: 'Default partition',
    },
  ];

  if (!parentQueuePath) {
    return options;
  }

  const accessibleResult = store.getQueuePropertyValue(parentQueuePath, 'accessible-node-labels');
  const accessibleRaw = sanitize(accessibleResult.value);

  const labels = new Set<string>();

  if (accessibleRaw === '*') {
    store.nodeLabels.forEach((label) => {
      if (label.name) {
        labels.add(label.name);
      }
    });
  }

  if (accessibleRaw !== '*' && accessibleRaw.length > 0) {
    accessibleRaw
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .forEach((name) => labels.add(name));
  }

  store.stagedChanges.forEach((change) => {
    if (!change.queuePath) {
      return;
    }

    const changeParent = getParentPath(change.queuePath);
    if (changeParent !== parentQueuePath) {
      return;
    }

    const match = change.property.match(/^accessible-node-labels\.([^.]+)\./);
    if (match && match[1]) {
      labels.add(match[1]);
    }
  });

  Array.from(labels)
    .sort((a, b) => a.localeCompare(b))
    .forEach((label) => {
      options.push({
        value: label,
        label,
      });
    });

  return options;
};
