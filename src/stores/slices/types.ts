/**
 * Shared types for store slices
 */

import type { YarnApiClient } from '~/lib/api/YarnApiClient';
import type {
  SchedulerInfo,
  NodeLabel,
  NodeInfo,
  NodeToLabelMapping,
  StagedChange,
  QueueInfo,
} from '~/types';
import type { PlacementRulesSlice } from './placementRulesSlice';

export interface BaseStoreSlice {
  apiClient: YarnApiClient;
}

export interface SchedulerDataSlice {
  schedulerData: SchedulerInfo | null;
  configData: Map<string, string>;
  configVersion: number;
  isLoading: boolean;
  error: string | null;

  loadInitialData: () => Promise<void>;
  refreshSchedulerData: () => Promise<void>;
}

export interface NodeLabelsSlice {
  nodeLabels: NodeLabel[];
  nodes: NodeInfo[];
  nodeToLabels: NodeToLabelMapping[];
  selectedNodeLabel: string | null;

  selectNodeLabel: (label: string | null) => void;
  addNodeLabel: (name: string, exclusivity: boolean) => Promise<void>;
  removeNodeLabel: (name: string) => Promise<void>;
  assignNodeToLabel: (nodeId: string, labelName: string | null) => Promise<void>;
}

import type { BusinessValidationError } from '~/utils/validation/businessRules/types';

export interface StagedChangesSlice {
  stagedChanges: StagedChange[];

  stageQueueChange: (queuePath: string, property: string, value: string, validationErrors?: BusinessValidationError[]) => void;
  stageGlobalChange: (
    property: string,
    value: string | Record<string, unknown> | unknown[],
    validationErrors?: BusinessValidationError[],
  ) => void;
  stageQueueAddition: (
    parentPath: string,
    queueName: string,
    config: Record<string, string>,
    validationErrors?: BusinessValidationError[],
  ) => void;
  stageQueueRemoval: (queuePath: string, validationErrors?: BusinessValidationError[]) => void;
  stageLabelQueueChange: (
    queuePath: string,
    label: string,
    property: string,
    value: string,
    validationErrors?: BusinessValidationError[],
  ) => void;
  applyChanges: () => Promise<void>;
  revertChange: (changeId: string) => void;
  clearAllChanges: () => void;
  clearQueueChanges: (queuePath: string) => void;
  hasUnsavedChanges: () => boolean;
  getChangesForQueue: (queuePath: string) => StagedChange[];
  getStagedChangeById: (changeId: string) => StagedChange | undefined;
  getLabelChangesForQueue: (queuePath: string, label: string) => StagedChange[];
  refreshValidationErrors: () => void;
  refreshAffectedValidationErrors: (triggeringQueuePath: string, triggeringProperty: string) => void;
}

export interface QueueSelectionSlice {
  selectedQueuePath: string | null;
  comparisonQueues: string[];
  isPropertyPanelOpen: boolean;

  selectQueue: (queuePath: string | null) => void;
  toggleComparisonQueue: (queuePath: string) => void;
  setPropertyPanelOpen: (isOpen: boolean) => void;
}

export interface QueueDataSlice {
  getQueuePropertyValue: (
    queuePath: string,
    property: string,
  ) => { value: string; isStaged: boolean };
  getGlobalPropertyValue: (property: string) => { value: string; isStaged: boolean };
  getQueueByPath: (queuePath: string) => QueueInfo | null;
  getChildQueues: (parentPath: string) => QueueInfo[];
}

export type SchedulerStore = BaseStoreSlice &
  SchedulerDataSlice &
  NodeLabelsSlice &
  StagedChangesSlice &
  QueueSelectionSlice &
  QueueDataSlice &
  PlacementRulesSlice;
