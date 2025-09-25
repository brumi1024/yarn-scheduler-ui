export type MutationResponse = {
  success: boolean;
  configVersion?: number;
  error?: MutationError;
};

export type MutationError = {
  RemoteException: {
    exception: string;
    message: string;
    javaClassName: string;
  };
};

export type ValidationResponse = {
  validation: 'success' | 'failed';
  errors?: string[];
  versionId?: number | string;
  mutationId?: number | string;
  newVersionId?: number | string;
};

export type ConfigVersionResponse = {
  versionInfo: {
    version: number;
    lastModified?: string;
    lastModifiedBy?: string;
  };
};

export type NodeLabelAddRequest = {
  nodeLabels: Array<{
    name: string;
    exclusivity: boolean;
  }>;
};

export type NodeLabelRemoveRequest = {
  labels: string[];
};

export type NodeLabelReplaceRequest = {
  nodeToLabels: Array<{
    nodeId: string;
    labels: string[];
  }>;
};
