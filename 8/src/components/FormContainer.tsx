import { useForm } from '../context/FormContext';
import { SectionRenderer } from './SectionRenderer';
import { FormActions } from './FormActions';
import { getStatusDisplayText } from '../engine/versionManager';

export function FormContainer() {
  const { template, instance } = useForm();

  return (
    <div>
      <div className="app-header">
        <div>
          <h1 className="app-title">{template.name}</h1>
          {template.description && <p style={{ color: '#6b7280', marginTop: '4px' }}>{template.description}</p>}
        </div>
        <span className={`status-badge status-${instance.status}`}>
          {getStatusDisplayText(instance.status)}
        </span>
      </div>
      
      <div className="form-container">
        {template.sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </div>

      <FormActions />
    </div>
  );
}
