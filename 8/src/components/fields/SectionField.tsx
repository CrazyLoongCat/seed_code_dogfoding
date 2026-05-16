import type { FieldConfig } from '../../types';
import { FieldRenderer } from '../FieldRenderer';
import { useFieldState } from '../../context/FormContext';

interface SectionFieldProps {
  field: FieldConfig;
}

export function SectionField({ field }: SectionFieldProps) {
  const { visible } = useFieldState(field.name);

  if (!visible) {
    return null;
  }

  return (
    <div className="section-container" style={{ marginLeft: '24px', borderLeftColor: '#8b5cf6' }}>
      <h4 className="section-title" style={{ fontSize: '16px' }}>{field.label}</h4>
      {field.helpText && <p className="section-description">{field.helpText}</p>}
      {field.children?.map((child) => (
        <FieldRenderer key={child.id} field={child} />
      ))}
    </div>
  );
}
