import type { FieldConfig } from '../../types';
import { useFieldState } from '../../context/FormContext';

interface DateFieldProps {
  field: FieldConfig;
}

export function DateField({ field }: DateFieldProps) {
  const { visible, disabled, touched, errors, value, setValue, touchField } = useFieldState(field.name);

  if (!visible) {
    return null;
  }

  const hasError = errors.length > 0 && touched;

  return (
    <div className="field-wrapper">
      <label className={`field-label ${field.required ? 'required' : ''}`}>
        {field.label}
      </label>
      <input
        type="date"
        className={`field-input ${hasError ? 'field-error' : ''}`}
        value={(value as string) || ''}
        onChange={(e) => setValue(e.target.value)}
        onBlur={touchField}
        disabled={disabled}
      />
      {field.helpText && <p className="field-help">{field.helpText}</p>}
      {hasError && errors.map((error: string, idx: number) => (
        <p key={idx} className="error-message">{error}</p>
      ))}
    </div>
  );
}
