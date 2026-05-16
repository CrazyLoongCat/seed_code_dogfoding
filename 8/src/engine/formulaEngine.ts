import type { FormulaConfig } from '../types';

export function calculateFormula(
  formula: string,
  formData: Record<string, unknown>
): number | string | null {
  try {
    const processedFormula = formula.replace(/\{\{(\w+)\}\}/g, (_, fieldName) => {
      const value = formData[fieldName];
      if (value === undefined || value === null || value === '') {
        return '0';
      }
      return String(value);
    });

    const sanitizedFormula = processedFormula.replace(/[^0-9+\-*/().\s]/g, '');
    
    const result = Function(`"use strict"; return (${sanitizedFormula})`)();
    
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
    
    return result;
  } catch (error) {
    console.error('Formula calculation error:', error);
    return null;
  }
}

export function evaluateFieldFormula(
  formulaConfig: FormulaConfig,
  formData: Record<string, unknown>
): unknown {
  return calculateFormula(formulaConfig.formula, formData);
}

export function hasDependencyChanged(
  formulaConfig: FormulaConfig,
  changedField: string
): boolean {
  return formulaConfig.dependencies.includes(changedField);
}

export function recalculateFormulas(
  formulas: Array<{ fieldId: string; config: FormulaConfig }>,
  formData: Record<string, unknown>,
  changedField?: string
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  formulas.forEach(({ fieldId, config }) => {
    if (!changedField || hasDependencyChanged(config, changedField)) {
      const result = evaluateFieldFormula(config, { ...formData, ...updates });
      if (result !== null) {
        updates[fieldId] = result;
      }
    }
  });

  return updates;
}
