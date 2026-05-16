export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'section';

export type FormStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'deleted';

export type FormEvent = 'save' | 'submit' | 'approve' | 'reject' | 'withdraw' | 'rollback' | 'delete';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface ConditionRule {
  fieldId: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains' | 'empty' | 'not_empty';
  value?: unknown;
}

export interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: (ConditionRule | ConditionGroup)[];
}

export interface ValidationRule {
  type: 'required' | 'pattern' | 'min' | 'max' | 'min_length' | 'max_length' | 'custom';
  value?: unknown;
  message?: string;
}

export interface CrossFieldValidation {
  id: string;
  fields: string[];
  validation: (values: Record<string, unknown>) => boolean;
  message: string;
}

export interface FormulaConfig {
  formula: string;
  dependencies: string[];
}

export interface FieldConfig {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  options?: SelectOption[];
  required?: boolean;
  validations?: ValidationRule[];
  visibleCondition?: ConditionGroup;
  disabledCondition?: ConditionGroup;
  formula?: FormulaConfig;
  children?: FieldConfig[];
}

export interface SectionConfig {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
  visibleCondition?: ConditionGroup;
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  version: string;
  sections: SectionConfig[];
  validations?: CrossFieldValidation[];
}

export interface FormVersion {
  id: string;
  version: number;
  status: FormStatus;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  comment?: string;
  event?: FormEvent;
}

export interface FormInstance {
  id: string;
  templateId: string;
  templateVersion: string;
  currentVersion: number;
  status: FormStatus;
  data: Record<string, unknown>;
  versions: FormVersion[];
  history: FormHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FormHistoryItem {
  id: string;
  event: FormEvent;
  fromStatus: FormStatus;
  toStatus: FormStatus;
  timestamp: string;
  operator: string;
  comment?: string;
  version?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FieldState {
  visible: boolean;
  disabled: boolean;
  touched: boolean;
  errors: ValidationError[];
}

export interface FormState {
  template: FormTemplate;
  instance: FormInstance;
  fieldStates: Record<string, FieldState>;
  isSubmitting: boolean;
  activeTab: 'form' | 'history' | 'versions';
  compareVersions: {
    left: string | null;
    right: string | null;
  };
}

export interface VersionDiff {
  field: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'added' | 'removed' | 'modified';
}
