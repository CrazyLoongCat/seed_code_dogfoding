import type { ConditionRule, ConditionGroup } from '../types';

export function evaluateCondition(
  condition: ConditionRule | ConditionGroup,
  formData: Record<string, unknown>
): boolean {
  if ('logic' in condition) {
    const results = condition.conditions.map(c => evaluateCondition(c, formData));
    return condition.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  const { fieldId, operator, value } = condition;
  const fieldValue = formData[fieldId];

  switch (operator) {
    case '==':
      return fieldValue === value;
    case '!=':
      return fieldValue !== value;
    case '>':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;
    case '<':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;
    case '>=':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;
    case '<=':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      return typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.includes(value);
    case 'not_contains':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(value);
      }
      return typeof fieldValue === 'string' && typeof value === 'string' && !fieldValue.includes(value);
    case 'empty':
      return fieldValue === undefined || fieldValue === null || fieldValue === '' || 
             (Array.isArray(fieldValue) && fieldValue.length === 0);
    case 'not_empty':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '' &&
             (!Array.isArray(fieldValue) || fieldValue.length > 0);
    default:
      return true;
  }
}

export function evaluateConditionGroup(
  group: ConditionGroup | undefined,
  formData: Record<string, unknown>
): boolean {
  if (!group) return true;
  return evaluateCondition(group, formData);
}
