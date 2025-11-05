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
