import type { FieldConfig, FormTemplate, ValidationError, ValidationRule } from '../types';

function validateRule(
  rule: ValidationRule,
  value: unknown,
  formData: Record<string, unknown>
): string | null {
  switch (rule.type) {
    case 'required':
      if (value === undefined || value === null || value === '') {
        return rule.message || '此字段为必填项';
      }
      if (Array.isArray(value) && value.length === 0) {
        return rule.message || '此字段为必填项';
      }
      return null;

    case 'pattern':
      if (value === undefined || value === null || value === '') return null;
      if (typeof value === 'string' && rule.value instanceof RegExp) {
        return rule.value.test(value) ? null : rule.message || '格式不正确';
      }
      if (typeof value === 'string' && typeof rule.value === 'string') {
        const regex = new RegExp(rule.value);
        return regex.test(value) ? null : rule.message || '格式不正确';
      }
      return null;

    case 'min':
      if (value === undefined || value === null || value === '') return null;
      if (typeof value === 'number' && typeof rule.value === 'number') {
        return value >= rule.value ? null : rule.message || `数值不能小于 ${rule.value}`;
      }
      return null;

    case 'max':
      if (value === undefined || value === null || value === '') return null;
      if (typeof value === 'number' && typeof rule.value === 'number') {
        return value <= rule.value ? null : rule.message || `数值不能大于 ${rule.value}`;
      }
      return null;

    case 'min_length':
      if (value === undefined || value === null || value === '') return null;
      if (typeof value === 'string' && typeof rule.value === 'number') {
        return value.length >= rule.value ? null : rule.message || `长度不能小于 ${rule.value} 个字符`;
      }
      return null;

    case 'max_length':
      if (value === undefined || value === null || value === '') return null;
      if (typeof value === 'string' && typeof rule.value === 'number') {
        return value.length <= rule.value ? null : rule.message || `长度不能大于 ${rule.value} 个字符`;
      }
      return null;

    case 'custom':
      if (typeof rule.value === 'function') {
        try {
          return rule.value(value, formData) ? null : rule.message || '验证失败';
        } catch {
          return rule.message || '验证失败';
        }
      }
      return null;

    default:
      return null;
  }
}

export function validateField(
  field: FieldConfig,
  value: unknown,
  formData: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (field.required) {
    const error = validateRule({ type: 'required' }, value, formData);
    if (error) {
      errors.push({ field: field.name, message: error });
    }
  }

  if (field.validations) {
    for (const rule of field.validations) {
      const error = validateRule(rule, value, formData);
      if (error) {
        errors.push({ field: field.name, message: error });
      }
    }
  }

  return errors;
}

export function validateForm(
  template: FormTemplate,
  formData: Record<string, unknown>,
  fieldStates: Record<string, { visible: boolean }>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.type === 'section' && field.children) {
        for (const childField of field.children) {
          const state = fieldStates[childField.name];
          if (state?.visible === false) continue;
          const fieldErrors = validateField(childField, formData[childField.name], formData);
          errors.push(...fieldErrors);
        }
      } else {
        const state = fieldStates[field.name];
        if (state?.visible === false) continue;
        const fieldErrors = validateField(field, formData[field.name], formData);
        errors.push(...fieldErrors);
      }
    }
  }

  if (template.validations) {
    for (const crossValidation of template.validations) {
      if (!crossValidation.validation(formData)) {
        errors.push({
          field: crossValidation.fields.join(','),
          message: crossValidation.message
        });
      }
    }
  }

  return errors;
}

export function hasErrors(errors: ValidationError[]): boolean {
  return errors.length > 0;
}
