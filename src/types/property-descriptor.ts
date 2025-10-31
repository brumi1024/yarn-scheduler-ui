import type { QueueInfo } from './queue';
import type { SchedulerInfo } from './scheduler';
import type { StagedChange } from './staged-change';

export type PropertyType = 'string' | 'number' | 'boolean' | 'enum' | 'list';

export type PropertyCategory =
  | 'general'
  | 'resource'
  | 'scheduling'
  | 'limits'
  | 'security'
  | 'advanced';

export type ComparisonOperator = '<' | '<=' | '>' | '>=' | '==' | '!=';

export type ValidationRule = {
  type: 'range' | 'pattern' | 'comparison' | 'custom';
  message: string;
  min?: number;
  max?: number;
  pattern?: string;
  field?: string;
  operator?: ComparisonOperator;
  validator?: (value: string) => boolean;
};

export type DisplayFormat = {
  suffix?: string;
  prefix?: string;
  multiplier?: number;
  decimals?: number;
};

export type PropertyEnumOption = {
  value: string;
  label: string;
  description?: string;
};

export type PropertyEvaluationScope = 'global' | 'queue';

export type PropertyEvaluationContext = {
  scope: PropertyEvaluationScope;
  property: PropertyDescriptor;
  propertyValue: string;
  values: Record<string, string>;
  globalValues: Record<string, string>;
  queuePath?: string;
  queueInfo?: QueueInfo | null;
  schedulerInfo?: SchedulerInfo | null;
  stagedChanges: StagedChange[];
  configData: Map<string, string>;
  getValue: (name: string) => string | undefined;
  getGlobalValue: (name: string) => string | undefined;
  getQueueValue: (queuePath: string, name: string) => string | undefined;
  getConfigValue: (key: string) => string | undefined;
};

export type PropertyCondition = (context: PropertyEvaluationContext) => boolean;

export type PropertyDescriptor = {
  name: string;
  displayName: string;
  description: string;
  type: PropertyType;
  category: PropertyCategory;
  defaultValue: string;
  required: boolean;
  templateSupport?: boolean;
  validationRules?: ValidationRule[];
  enumValues?: PropertyEnumOption[];
  enumDisplay?: 'toggle' | 'choiceCard';
  showWhen?: PropertyCondition[];
  enableWhen?: PropertyCondition[];
  displayFormat?: DisplayFormat;
  deprecated?: boolean;
  deprecationMessage?: string;
  formFieldName?: string; // Escaped name for React Hook Form
  originalName?: string; // Original name before escaping
};
