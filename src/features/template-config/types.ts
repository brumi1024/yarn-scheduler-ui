import type { StagedChange } from '~/types';

export type TemplateScopeType = 'legacyLeaf' | 'flexibleShared' | 'flexibleLeaf' | 'flexibleParent';

export type TemplateScope = {
  id: string;
  queuePath: string;
  displayName: string;
  displayQueuePath: string | null;
  description: string;
  type: TemplateScopeType;
  isWildcard: boolean;
  allowDeletion: boolean;
};

export type TemplateScopeGroup = {
  type: 'legacy' | 'flexible';
  label: string;
  scopes: TemplateScope[];
};

export type TemplateScopeBuilderOptions = {
  queuePath: string;
  configData: Map<string, string>;
  stagedChanges: StagedChange[];
  legacyEnabled: boolean;
  flexibleEnabled: boolean;
};
