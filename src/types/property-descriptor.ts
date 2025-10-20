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

export type PropertyDescriptor = {
  name: string;
  displayName: string;
  description: string;
  type: PropertyType;
  category: PropertyCategory;
  defaultValue: string;
  required: boolean;
  validationRules?: ValidationRule[];
  enumValues?: PropertyEnumOption[];
  enumDisplay?: 'toggle' | 'choiceCard' | 'select';
  dependsOn?: string[];
  enableWhen?: Record<string, (value: string) => boolean>;
  displayFormat?: DisplayFormat;
  deprecated?: boolean;
  deprecationMessage?: string;
  formFieldName?: string; // Escaped name for React Hook Form
  originalName?: string; // Original name before escaping
};
