export type StagedChangeType = 'add' | 'update' | 'remove';

export type StagedChange = {
  id: string;
  type: StagedChangeType;
  queuePath: string | 'global';
  property?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: number;
  label?: string;
  description?: string;
  parentChangeId?: string;
};
