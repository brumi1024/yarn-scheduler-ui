/**
 * Capacity Editor slice
 *
 * Manages dialog visibility, draft state, and contextual metadata
 * for the Capacity Editor experience.
 */

import type { StateCreator } from 'zustand';
import { produce } from 'immer';
import type { SchedulerStore } from './types';
import {
  buildCapacityEditorDrafts,
  buildCapacityEditorLabelOptions,
  convertVectorDraftToString,
  DEFAULT_PARTITION_VALUE,
  getPropertyNameForLabel,
} from '~/features/queue-management/utils/capacityEditor';
import { buildPropertyKey } from '~/utils/propertyUtils';
import { validateQueue } from '~/features/validation/service';
import type { ValidationIssue } from '~/features/validation/types';

export type CapacityEditorOrigin = 'property-editor' | 'context-menu' | 'add-queue';

export type CapacityResourceMode = 'simple' | 'vector';

export interface CapacityVectorEntryDraft {
  key: string;
  value: string;
  id: string;
}

export interface CapacityRowDraft {
  queuePath: string;
  queueName: string;
  isOrigin: boolean;
  isNew: boolean;
  hasStagedChange: boolean;
  mode: CapacityResourceMode;
  baseMode: CapacityResourceMode;
  baseCapacityValue: string;
  baseMaxCapacityValue: string;
  capacityValue: string;
  maxCapacityValue: string;
  vectorCapacity: CapacityVectorEntryDraft[];
  vectorMaxCapacity: CapacityVectorEntryDraft[];
}

interface CapacityEditorDialogState {
  isOpen: boolean;
  origin: CapacityEditorOrigin | null;
  parentQueuePath: string | null;
  originQueuePath: string | null;
  originQueueName: string | null;
  originQueueState: string | null;
  originInitialCapacity: string | null;
  originInitialMaxCapacity: string | null;
  originIsNew: boolean;
  selectedNodeLabel: string | null;
  labelOptions: Array<{ value: string; label: string }>;
  drafts: Record<string, CapacityRowDraft>;
  draftOrder: string[];
  isSaving: boolean;
  saveError: string | null;
  validationIssues: ValidationIssue[];
}

const createEmptyDialogState = (): CapacityEditorDialogState => ({
  isOpen: false,
  origin: null,
  parentQueuePath: null,
  originQueuePath: null,
  originQueueName: null,
  originQueueState: null,
  originInitialCapacity: null,
  originInitialMaxCapacity: null,
  originIsNew: false,
  selectedNodeLabel: null,
  labelOptions: [
    {
      value: DEFAULT_PARTITION_VALUE,
      label: 'Default partition',
    },
  ],
  drafts: {},
  draftOrder: [],
  isSaving: false,
  saveError: null,
  validationIssues: [],
});

const applyDraftsToState = (editorState: CapacityEditorDialogState, drafts: CapacityRowDraft[]) => {
  editorState.drafts = {};
  editorState.draftOrder = [];

  drafts.forEach((draft) => {
    editorState.drafts[draft.queuePath] = draft;
    editorState.draftOrder.push(draft.queuePath);
  });
};

const normalizeLabelOptions = (
  options: Array<{ value: string; label: string }>,
  selectedLabel: string | null,
) => {
  const dedup = new Map<string, string>();
  options.forEach((option) => {
    dedup.set(option.value, option.label);
  });

  if (selectedLabel && !dedup.has(selectedLabel)) {
    dedup.set(selectedLabel, selectedLabel);
  }

  const sorted = Array.from(dedup.entries())
    .filter(([value]) => value !== DEFAULT_PARTITION_VALUE)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.value.localeCompare(b.value));

  return [
    {
      value: DEFAULT_PARTITION_VALUE,
      label: 'Default partition',
    },
    ...sorted,
  ];
};

export interface CapacityEditorSlice {
  capacityEditor: CapacityEditorDialogState;
  openCapacityEditor: (options: {
    origin: CapacityEditorOrigin;
    parentQueuePath: string;
    originQueuePath: string;
    originQueueName: string;
    originQueueState?: string | null;
    originInitialCapacity?: string | null;
    originInitialMaxCapacity?: string | null;
    originIsNew?: boolean;
    selectedNodeLabel?: string | null;
  }) => void;
  closeCapacityEditor: () => void;
  setCapacityEditorLabel: (label: string | null) => void;
  updateCapacityDraft: (queuePath: string, updater: (draft: CapacityRowDraft) => void) => void;
  resetCapacityDrafts: () => void;
  saveCapacityDrafts: (options?: { force?: boolean }) => Promise<boolean>;
}

export const createCapacityEditorSlice: StateCreator<
  SchedulerStore,
  [['zustand/immer', never]],
  [],
  CapacityEditorSlice
> = (set, get) => ({
  capacityEditor: createEmptyDialogState(),

  openCapacityEditor: ({
    origin,
    parentQueuePath,
    originQueuePath,
    originQueueName,
    originQueueState = null,
    originInitialCapacity = null,
    originInitialMaxCapacity = null,
    originIsNew = false,
    selectedNodeLabel = null,
  }) => {
    const store = get();
    const drafts = buildCapacityEditorDrafts({
      store,
      parentQueuePath,
      originQueuePath,
      originQueueName,
      originInitialCapacity,
      originInitialMaxCapacity,
      originIsNew,
      selectedNodeLabel,
    });

    const labelOptions = normalizeLabelOptions(
      buildCapacityEditorLabelOptions(store, parentQueuePath),
      selectedNodeLabel,
    );

    set((state) => {
      const editorState = state.capacityEditor;
      editorState.isOpen = true;
      editorState.origin = origin;
      editorState.parentQueuePath = parentQueuePath;
      editorState.originQueuePath = originQueuePath;
      editorState.originQueueName = originQueueName;
      editorState.originQueueState = originQueueState;
      editorState.originInitialCapacity = originInitialCapacity ?? null;
      editorState.originInitialMaxCapacity = originInitialMaxCapacity ?? null;
      editorState.originIsNew = originIsNew;
      editorState.selectedNodeLabel = selectedNodeLabel;
      editorState.labelOptions = labelOptions;
      applyDraftsToState(editorState, drafts);
    });
  },

  closeCapacityEditor: () =>
    set((state) => {
      state.capacityEditor = createEmptyDialogState();
    }),

  setCapacityEditorLabel: (label) => {
    const store = get();
    const {
      parentQueuePath,
      originQueuePath,
      originQueueName,
      originInitialCapacity,
      originInitialMaxCapacity,
      originIsNew,
    } = store.capacityEditor;

    if (!parentQueuePath || !originQueuePath || !originQueueName) {
      set((state) => {
        state.capacityEditor.selectedNodeLabel = label;
      });
      return;
    }

    const drafts = buildCapacityEditorDrafts({
      store,
      parentQueuePath,
      originQueuePath,
      originQueueName,
      originInitialCapacity,
      originInitialMaxCapacity,
      originIsNew,
      selectedNodeLabel: label,
    });

    const labelOptions = normalizeLabelOptions(
      buildCapacityEditorLabelOptions(store, parentQueuePath),
      label,
    );

    set((state) => {
      const editorState = state.capacityEditor;
      editorState.selectedNodeLabel = label;
      editorState.labelOptions = labelOptions;
      applyDraftsToState(editorState, drafts);
    });
  },

  updateCapacityDraft: (queuePath, updater) =>
    set((state) => {
      const existing = state.capacityEditor.drafts[queuePath];
      if (!existing) {
        return;
      }

      state.capacityEditor.drafts[queuePath] = produce(existing, (draft) => {
        updater(draft);
      });
    }),

  resetCapacityDrafts: () => {
    const store = get();
    const {
      parentQueuePath,
      originQueuePath,
      originQueueName,
      originInitialCapacity,
      originInitialMaxCapacity,
      originIsNew,
      selectedNodeLabel,
    } = store.capacityEditor;

    if (!parentQueuePath || !originQueuePath || !originQueueName) {
      return;
    }

    const drafts = buildCapacityEditorDrafts({
      store,
      parentQueuePath,
      originQueuePath,
      originQueueName,
      originInitialCapacity,
      originInitialMaxCapacity,
      originIsNew,
      selectedNodeLabel,
    });

    set((state) => {
      applyDraftsToState(state.capacityEditor, drafts);
    });
  },

  saveCapacityDrafts: async ({ force = false } = {}) => {
    const storeSnapshot = get();
    const {
      parentQueuePath,
      originQueuePath,
      originQueueName,
      originInitialCapacity: _originInitialCapacity,
      originInitialMaxCapacity: _originInitialMaxCapacity,
      originIsNew,
      selectedNodeLabel,
      drafts,
      draftOrder,
    } = storeSnapshot.capacityEditor;

    if (!parentQueuePath || !originQueuePath || !originQueueName) {
      return false;
    }

    set((state) => {
      state.capacityEditor.isSaving = true;
      state.capacityEditor.saveError = null;
      if (!force) {
        state.capacityEditor.validationIssues = [];
      }
    });

    const capacityProperty = getPropertyNameForLabel(selectedNodeLabel, 'capacity');
    const maxCapacityProperty = getPropertyNameForLabel(selectedNodeLabel, 'maximum-capacity');

    const normalizeValue = (value: string) => value.trim();

    const changesByQueue = new Map<string, Record<string, string>>();

    draftOrder.forEach((queuePath) => {
      const draft = drafts[queuePath];
      if (!draft) {
        return;
      }

      const capacityString =
        draft.mode === 'vector'
          ? convertVectorDraftToString(draft.vectorCapacity)
          : draft.capacityValue;
      const maxCapacityString =
        draft.mode === 'vector'
          ? convertVectorDraftToString(draft.vectorMaxCapacity)
          : draft.maxCapacityValue;

      const currentCapacity = normalizeValue(capacityString);
      const currentMaxCapacity = normalizeValue(maxCapacityString);

      const existingCapacity = normalizeValue(
        storeSnapshot.getQueuePropertyValue(queuePath, capacityProperty).value,
      );
      const existingMaxCapacity = normalizeValue(
        storeSnapshot.getQueuePropertyValue(queuePath, maxCapacityProperty).value,
      );

      const propertyChanges: Record<string, string> = {};

      if (currentCapacity !== existingCapacity) {
        propertyChanges[capacityProperty] = currentCapacity;
      }

      if (currentMaxCapacity !== existingMaxCapacity) {
        propertyChanges[maxCapacityProperty] = currentMaxCapacity;
      }

      if (Object.keys(propertyChanges).length > 0) {
        changesByQueue.set(queuePath, propertyChanges);
      }
    });

    if (changesByQueue.size === 0) {
      set((state) => {
        state.capacityEditor.isSaving = false;
        state.capacityEditor.validationIssues = [];
      });
      return true;
    }

    const previewConfig = new Map(storeSnapshot.configData);
    changesByQueue.forEach((properties, queuePath) => {
      Object.entries(properties).forEach(([propertyName, value]) => {
        const key = buildPropertyKey(queuePath, propertyName);
        if (value === '') {
          previewConfig.delete(key);
        } else {
          previewConfig.set(key, value);
        }
      });
    });

    let aggregatedIssues: ValidationIssue[] = [];
    let hasBlockingErrors = false;

    changesByQueue.forEach((properties, queuePath) => {
      const result = validateQueue({
        queuePath,
        properties,
        configData: previewConfig,
        stagedChanges: storeSnapshot.stagedChanges,
        schedulerData: storeSnapshot.schedulerData,
      });

      aggregatedIssues = aggregatedIssues.concat(result.issues);

      if (!force && result.issues.some((issue) => issue.severity === 'error')) {
        hasBlockingErrors = true;
      }
    });

    if (!force && hasBlockingErrors) {
      set((state) => {
        state.capacityEditor.isSaving = false;
        state.capacityEditor.saveError = 'Capacity validation failed.';
        state.capacityEditor.validationIssues = aggregatedIssues;
      });
      return false;
    }

    changesByQueue.forEach((properties, queuePath) => {
      Object.entries(properties).forEach(([propertyName, value]) => {
        const propertyIssues = aggregatedIssues.filter(
          (issue) => issue.queuePath === queuePath && issue.field === propertyName,
        );

        const labelMatch = propertyName.match(/^accessible-node-labels\.([^.]+)\.([^.]+)$/);

        if (labelMatch) {
          const [, labelName, baseProperty] = labelMatch;
          storeSnapshot.stageLabelQueueChange(
            queuePath,
            labelName,
            baseProperty as 'capacity' | 'maximum-capacity',
            value,
            propertyIssues.length > 0 ? propertyIssues : undefined,
          );
          return;
        }

        storeSnapshot.stageQueueChange(
          queuePath,
          propertyName,
          value,
          propertyIssues.length > 0 ? propertyIssues : undefined,
        );
      });
    });

    const refreshedStore = get();
    const refreshedDrafts = buildCapacityEditorDrafts({
      store: refreshedStore,
      parentQueuePath,
      originQueuePath,
      originQueueName,
      originInitialCapacity: null,
      originInitialMaxCapacity: null,
      originIsNew,
      selectedNodeLabel,
    });

    const refreshedOrigin = refreshedDrafts.find((draft) => draft.isOrigin);

    set((state) => {
      const editorState = state.capacityEditor;
      editorState.isSaving = false;
      editorState.saveError = null;
      editorState.validationIssues = aggregatedIssues;
      if (refreshedOrigin) {
        editorState.originInitialCapacity = refreshedOrigin.capacityValue;
        editorState.originInitialMaxCapacity = refreshedOrigin.maxCapacityValue;
      }
      applyDraftsToState(editorState, refreshedDrafts);
    });

    return true;
  },
});
