import { useMemo } from 'react';
import type { SectionConfig } from '../types';
import { FieldRenderer } from './FieldRenderer';
import { useForm } from '../context/FormContext';
import { evaluateConditionGroup } from '../engine/conditionEngine';

interface SectionRendererProps {
  section: SectionConfig;
}

export function SectionRenderer({ section }: SectionRendererProps) {
  const { instance } = useForm();
  
  const isVisible = useMemo(() => {
    return evaluateConditionGroup(section.visibleCondition, instance.data);
  }, [section.visibleCondition, instance.data]);
  
  if (!isVisible) {
    return null;
  }

  return (
    <div className="section-container">
      <h3 className="section-title">{section.title}</h3>
      {section.description && <p className="section-description">{section.description}</p>}
      {section.fields.map((field) => (
        <FieldRenderer key={field.id} field={field} />
      ))}
    </div>
  );
}
