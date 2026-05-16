import type { FieldConfig } from '../../types';
import { useFieldState } from '../../context/FormContext';

interface CheckboxFieldProps {
  field: FieldConfig;
}

export function CheckboxField({ field }: CheckboxFieldProps) {
  const { visible, disabled, touched, errors, value, setValue, touchField } = useFieldState(field.name);

  if (!visible) {
    return null;
  }

  const hasError = errors.length > 0 && touched;
  const currentValue = Array.isArray(value) ? value : [];

  const handleChange = (optionValue: string, checked: boolean) => {
    const newValue = [...currentValue];
    if (checked) {
      if (!newValue.includes(optionValue)) {
        newValue.push(optionValue);
      }
    } else {
      const index = newValue.indexOf(optionValue);
      if (index > -1) {
        newValue.splice(index, 1);
      }
    }
    setValue(newValue);
  };

  return (
    <div className="field-wrapper">
      <label className={`field-label ${field.required ? 'required' : ''}`}>
        {field.label}
      </label>
      <div className="checkbox-group" onBlur={touchField}>
        {field.options?.map((option) => (
          <label key={option.value} className="checkbox-item">
            <input
              type="checkbox"
              checked={currentValue.includes(String(option.value))}
              onChange={(e) => handleChange(String(option.value), e.target.checked)}
              disabled={disabled}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {field.helpText && <p className="field-help">{field.helpText}</p>}
      {hasError && errors.map((error: string, idx: number) => (
        <p key={idx} className="error-message">{error}</p>
      ))}
    </div>
  );
}
