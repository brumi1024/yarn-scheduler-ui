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
  valid: boolean;
  errors?: string[];
};

export type ConfigVersionResponse = {
  versionInfo: {
    version: number;
    lastModified?: string;
    lastModifiedBy?: string;
  };
};

export type NodeLabelAddRequest = {
  nodeLabels: string[];
};

export type NodeLabelRemoveRequest = {
  nodeLabels: string[];
};

export type NodeLabelReplaceRequest = {
  nodeToLabels: Record<string, string[]>;
};
