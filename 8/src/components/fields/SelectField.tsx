import type { FieldConfig } from '../../types';
import { useFieldState } from '../../context/FormContext';

interface SelectFieldProps {
  field: FieldConfig;
}

export function SelectField({ field }: SelectFieldProps) {
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
      <div className="select-wrapper">
        <select
          className={`${hasError ? 'field-error' : ''}`}
          value={(value as string | number) ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            const option = field.options?.find(o => String(o.value) === val);
            setValue(option?.value ?? val);
          }}
          onBlur={touchField}
          disabled={disabled}
        >
          <option value="">请选择</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {field.helpText && <p className="field-help">{field.helpText}</p>}
      {hasError && errors.map((error: string, idx: number) => (
        <p key={idx} className="error-message">{error}</p>
      ))}
    </div>
  );
}
