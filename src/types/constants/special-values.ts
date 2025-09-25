export const SPECIAL_VALUES = {
  ROOT_QUEUE_NAME: 'root',
  GLOBAL_QUEUE_PATH: 'global',
  ALL_USERS_ACL: '*',
  DEFAULT_PARTITION: '',
  QUEUE_MARKER: '__queue__',
  MAPPING_RULE_JSON_PROPERTY: 'yarn.scheduler.capacity.mapping-rule-json',
  MAPPING_RULE_FORMAT_PROPERTY: 'yarn.scheduler.capacity.mapping-rule-format',
  LEGACY_MODE_PROPERTY: 'yarn.scheduler.capacity.legacy-queue-mode.enabled',
} as const;
