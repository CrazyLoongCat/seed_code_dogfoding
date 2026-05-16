import type { FieldConfig } from '../types';
import { TextField } from './fields/TextField';
import { NumberField } from './fields/NumberField';
import { SelectField } from './fields/SelectField';
import { CheckboxField } from './fields/CheckboxField';
import { DateField } from './fields/DateField';
import { SectionField } from './fields/SectionField';

interface FieldRendererProps {
  field: FieldConfig;
}

export function FieldRenderer({ field }: FieldRendererProps) {
  switch (field.type) {
    case 'text':
      return <TextField field={field} />;
    case 'number':
      return <NumberField field={field} />;
    case 'select':
      return <SelectField field={field} />;
    case 'checkbox':
      return <CheckboxField field={field} />;
    case 'date':
      return <DateField field={field} />;
    case 'section':
      return <SectionField field={field} />;
    default:
      return null;
  }
}
