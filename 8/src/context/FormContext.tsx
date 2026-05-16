import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { FormState, FormInstance, FormTemplate, FormEvent, FormStatus, FieldState, FieldConfig } from '../types';
import { evaluateConditionGroup } from '../engine/conditionEngine';
import { validateForm, validateField } from '../engine/validationEngine';
import { recalculateFormulas } from '../engine/formulaEngine';
import { addVersion, createVersion, rollbackToVersion } from '../engine/versionManager';
import { applyTransition, isEditingAllowed } from '../engine/stateMachine';

function findFieldConfig(template: FormTemplate, fieldName: string): FieldConfig | undefined {
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.name === fieldName) return field;
      if (field.type === 'section' && field.children) {
        for (const child of field.children) {
          if (child.name === fieldName) return child;
        }
      }
    }
  }
  return undefined;
}

interface FormContextType extends FormState {
  updateField: (fieldName: string, value: unknown) => void;
  updateFieldWithCalculated: (fieldName: string, value: unknown) => void;
  touchField: (fieldName: string) => void;
  handleEvent: (event: FormEvent, operator: string, comment?: string) => void;
  setActiveTab: (tab: 'form' | 'history' | 'versions') => void;
  setCompareVersion: (side: 'left' | 'right', versionId: string | null) => void;
  rollback: (versionId: string, operator: string) => void;
  getFieldLabel: (fieldName: string) => string;
  getAllFieldLabels: () => Record<string, string>;
  getFieldErrors: (fieldName: string) => string[];
}

const FormContext = createContext<FormContextType | null>(null);

type FormAction =
  | { type: 'UPDATE_FIELD'; fieldName: string; value: unknown }
  | { type: 'TOUCH_FIELD'; fieldName: string; errors?: { field: string; message: string }[] }
  | { type: 'UPDATE_FIELD_STATES'; fieldStates: Record<string, FieldState> }
  | { type: 'HANDLE_EVENT'; instance: FormInstance }
  | { type: 'SET_ACTIVE_TAB'; tab: 'form' | 'history' | 'versions' }
  | { type: 'SET_COMPARE_VERSION'; side: 'left' | 'right'; versionId: string | null }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        instance: {
          ...state.instance,
          data: {
            ...state.instance.data,
            [action.fieldName]: action.value
          }
        }
      };
    case 'TOUCH_FIELD':
      return {
        ...state,
        fieldStates: {
          ...state.fieldStates,
          [action.fieldName]: {
            ...state.fieldStates[action.fieldName],
            touched: true,
            errors: action.errors || state.fieldStates[action.fieldName]?.errors || []
          }
        }
      };
    case 'UPDATE_FIELD_STATES':
      return {
        ...state,
        fieldStates: action.fieldStates
      };
    case 'HANDLE_EVENT':
      return {
        ...state,
        instance: action.instance
      };
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.tab
      };
    case 'SET_COMPARE_VERSION':
      return {
        ...state,
        compareVersions: {
          ...state.compareVersions,
          [action.side]: action.versionId
        }
      };
    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.isSubmitting
      };
    default:
      return state;
  }
}

interface FormProviderProps {
  template: FormTemplate;
  instance: FormInstance;
  children: ReactNode;
}

export function FormProvider({ template, instance: initialInstance, children }: FormProviderProps) {
  const initialFieldStates = useMemo(() => {
    const states: Record<string, FieldState> = {};
    for (const section of template.sections) {
      for (const field of section.fields) {
        if (field.type === 'section' && field.children) {
          for (const child of field.children) {
            states[child.name] = { visible: true, disabled: false, touched: false, errors: [] };
          }
        } else {
          states[field.name] = { visible: true, disabled: false, touched: false, errors: [] };
        }
      }
    }
    return states;
  }, [template]);

  const [state, dispatch] = useReducer(formReducer, {
    template,
    instance: initialInstance,
    fieldStates: initialFieldStates,
    isSubmitting: false,
    activeTab: 'form',
    compareVersions: { left: null, right: null }
  });

  const calculateFieldStates = useCallback((data: Record<string, unknown>) => {
    const newStates: Record<string, FieldState> = {};
    const status = state.instance.status;

    for (const section of template.sections) {
      const sectionVisible = evaluateConditionGroup(section.visibleCondition, data);
      if (!sectionVisible) {
        for (const field of section.fields) {
          if (field.type === 'section' && field.children) {
            for (const child of field.children) {
              newStates[child.name] = { 
                visible: false, 
                disabled: true, 
                touched: state.fieldStates[child.name]?.touched || false,
                errors: [] 
              };
            }
          } else {
            newStates[field.name] = { 
              visible: false, 
              disabled: true, 
              touched: state.fieldStates[field.name]?.touched || false,
              errors: [] 
            };
          }
        }
        continue;
      }

      for (const field of section.fields) {
        if (field.type === 'section' && field.children) {
          const nestedSectionVisible = evaluateConditionGroup(field.visibleCondition, data);
          if (!nestedSectionVisible) {
            for (const child of field.children) {
              newStates[child.name] = { 
                visible: false, 
                disabled: true, 
                touched: state.fieldStates[child.name]?.touched || false,
                errors: [] 
              };
            }
            continue;
          }
          for (const child of field.children) {
            const visible = evaluateConditionGroup(child.visibleCondition, data);
            const disabled = !visible || !isEditingAllowed(status) || evaluateConditionGroup(child.disabledCondition, data) || !!child.formula;
            const errors = visible ? validateField(child, data[child.name], data) : [];
            newStates[child.name] = { 
              visible, 
              disabled, 
              touched: state.fieldStates[child.name]?.touched || false,
              errors 
            };
          }
        } else {
          const visible = evaluateConditionGroup(field.visibleCondition, data);
          const disabled = !visible || !isEditingAllowed(status) || evaluateConditionGroup(field.disabledCondition, data) || !!field.formula;
          const errors = visible ? validateField(field, data[field.name], data) : [];
          newStates[field.name] = { 
            visible, 
            disabled, 
            touched: state.fieldStates[field.name]?.touched || false,
            errors 
          };
        }
      }
    }
    return newStates;
  }, [template, state.instance.status, state.fieldStates]);

  const formulas = useMemo(() => {
    const list: Array<{ fieldId: string; config: import('../types').FormulaConfig }> = [];
    for (const section of template.sections) {
      for (const field of section.fields) {
        if (field.formula) {
          list.push({ fieldId: field.name, config: field.formula });
        }
        if (field.type === 'section' && field.children) {
          for (const child of field.children) {
            if (child.formula) {
              list.push({ fieldId: child.name, config: child.formula });
            }
          }
        }
      }
    }
    return list;
  }, [template]);

  const updateField = useCallback((fieldName: string, value: unknown) => {
    let newData = { ...state.instance.data, [fieldName]: value };
    const formulaUpdates = recalculateFormulas(formulas, newData, fieldName);
    newData = { ...newData, ...formulaUpdates };

    dispatch({ type: 'UPDATE_FIELD', fieldName, value });
    Object.entries(formulaUpdates).forEach(([name, val]) => {
      dispatch({ type: 'UPDATE_FIELD', fieldName: name, value: val });
    });
  }, [state.instance.data, formulas]);

  const updateFieldWithCalculated = useCallback((fieldName: string, value: unknown) => {
    dispatch({ type: 'UPDATE_FIELD', fieldName, value });
    const newStates = calculateFieldStates({ ...state.instance.data, [fieldName]: value });
    dispatch({ type: 'UPDATE_FIELD_STATES', fieldStates: newStates });
  }, [state.instance.data, calculateFieldStates]);

  const touchField = useCallback((fieldName: string) => {
    const data = state.instance.data;
    const fieldConfig = findFieldConfig(template, fieldName);
    
    if (fieldConfig) {
      const errors = validateField(fieldConfig, data[fieldName], data);
      dispatch({ 
        type: 'TOUCH_FIELD', 
        fieldName,
        errors
      });
    } else {
      dispatch({ type: 'TOUCH_FIELD', fieldName });
    }
  }, [state.instance.data, template]);

  const handleEvent = useCallback((event: FormEvent, operator: string, comment?: string) => {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const currentData = state.instance.data;
      const fieldStates = calculateFieldStates(currentData);

      if (event === 'submit' || event === 'approve') {
        const touchedFieldStates: Record<string, FieldState> = {};
        Object.keys(fieldStates).forEach(fieldName => {
          touchedFieldStates[fieldName] = {
            ...fieldStates[fieldName],
            touched: true
          };
        });
        dispatch({ type: 'UPDATE_FIELD_STATES', fieldStates: touchedFieldStates });

        const errors = validateForm(template, currentData, touchedFieldStates);
        if (errors.length > 0) {
          dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
          throw new Error('表单验证失败，请检查表单');
        }
      }

      let updatedInstance = applyTransition(state.instance, event, operator, comment);

      if (event === 'save' || event === 'submit' || event === 'rollback') {
        const newVersion = createVersion(updatedInstance, updatedInstance.data, event, operator, comment);
        updatedInstance = addVersion(updatedInstance, newVersion);
      }

      dispatch({ type: 'HANDLE_EVENT', instance: updatedInstance });
      const newStates = calculateFieldStates(updatedInstance.data);
      dispatch({ type: 'UPDATE_FIELD_STATES', fieldStates: newStates });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [state.instance, template, calculateFieldStates]);

  const setActiveTab = useCallback((tab: 'form' | 'history' | 'versions') => {
    dispatch({ type: 'SET_ACTIVE_TAB', tab });
  }, []);

  const setCompareVersion = useCallback((side: 'left' | 'right', versionId: string | null) => {
    dispatch({ type: 'SET_COMPARE_VERSION', side, versionId });
  }, []);

  const rollback = useCallback((versionId: string, operator: string) => {
    const rolledBack = rollbackToVersion(state.instance, versionId, operator);
    dispatch({ type: 'HANDLE_EVENT', instance: rolledBack });
    const newStates = calculateFieldStates(rolledBack.data);
    dispatch({ type: 'UPDATE_FIELD_STATES', fieldStates: newStates });
  }, [state.instance, calculateFieldStates]);

  const getFieldLabel = useCallback((fieldName: string): string => {
    for (const section of template.sections) {
      for (const field of section.fields) {
        if (field.name === fieldName) return field.label;
        if (field.type === 'section' && field.children) {
          for (const child of field.children) {
            if (child.name === fieldName) return child.label;
          }
        }
      }
    }
    return fieldName;
  }, [template]);

  const getAllFieldLabels = useCallback((): Record<string, string> => {
    const labels: Record<string, string> = {};
    for (const section of template.sections) {
      for (const field of section.fields) {
        labels[field.name] = field.label;
        if (field.type === 'section' && field.children) {
          for (const child of field.children) {
            labels[child.name] = child.label;
          }
        }
      }
    }
    return labels;
  }, [template]);

  const getFieldErrors = useCallback((fieldName: string): string[] => {
    const fieldState = state.fieldStates[fieldName];
    if (!fieldState || !fieldState.touched) return [];
    return fieldState.errors?.map(e => e.message) || [];
  }, [state.fieldStates]);

  const value: FormContextType = {
    ...state,
    updateField,
    updateFieldWithCalculated,
    touchField,
    handleEvent,
    setActiveTab,
    setCompareVersion,
    rollback,
    getFieldLabel,
    getAllFieldLabels,
    getFieldErrors
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

export function useForm() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within FormProvider');
  }
  return context;
}

export function useFormStatus(): FormStatus {
  return useForm().instance.status;
}

export function useFieldState(fieldName: string) {
  const { fieldStates, updateField, getFieldErrors, instance, template, touchField } = useForm();
  const fieldConfig = findFieldConfig(template, fieldName);
  const fieldState = fieldStates[fieldName] || { visible: true, disabled: false, touched: false, errors: [] };

  const value = instance.data[fieldName];

  const visible = useMemo(() => {
    if (!fieldConfig) return true;
    return evaluateConditionGroup(fieldConfig.visibleCondition, instance.data);
  }, [fieldConfig, instance.data]);

  const disabled = useMemo(() => {
    if (!fieldConfig) return false;
    if (fieldConfig.formula) return true;
    if (!isEditingAllowed(instance.status)) return true;
    return false;
  }, [fieldConfig, instance.status]);

  return {
    ...fieldState,
    value,
    visible,
    disabled,
    setValue: (value: unknown) => updateField(fieldName, value),
    touchField: () => touchField(fieldName),
    errors: getFieldErrors(fieldName)
  };
}
