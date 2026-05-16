import type { FieldConfig } from '../../types';
import { useFieldState } from '../../context/FormContext';

interface TextFieldProps {
  field: FieldConfig;
}

export function TextField({ field }: TextFieldProps) {
  const { visible, disabled, touched, errors, value, setValue, touchField } = useFieldState(field.name);

  if (!visible) {
    return null;
  }

  const hasError = errors.length > 0 && touched;

  return (
    <div className="field-wrapper">
      <label className={`field-label ${field.required ? 'required' : ''}`}>
        {field.label}
        {field.formula && <span className="formula-badge">自动计算</span>}
      </label>
      <input
        type="text"
        className={`field-input ${hasError ? 'field-error' : ''} ${field.formula ? 'calculated-value' : ''}`}
        value={(value as string) || ''}
        onChange={(e) => setValue(e.target.value)}
        onBlur={touchField}
        placeholder={field.placeholder}
        disabled={disabled}
      />
      {field.helpText && <p className="field-help">{field.helpText}</p>}
      {hasError && errors.map((error: string, idx: number) => (
        <p key={idx} className="error-message">{error}</p>
      ))}
    </div>
  );
}
