import { v4 as uuidv4 } from 'uuid';
import type { FormEvent, FormInstance, FormHistoryItem, FormStatus, FormTemplate } from '../types';

interface Transition {
  from: FormStatus[];
  to: FormStatus;
  event: FormEvent;
}

const transitions: Transition[] = [
  { from: ['draft', 'rejected'], to: 'draft', event: 'save' },
  { from: ['draft'], to: 'pending', event: 'submit' },
  { from: ['pending'], to: 'approved', event: 'approve' },
  { from: ['pending'], to: 'rejected', event: 'reject' },
  { from: ['pending'], to: 'withdrawn', event: 'withdraw' },
  { from: ['approved', 'rejected', 'withdrawn', 'draft'], to: 'draft', event: 'rollback' },
  { from: ['draft', 'pending', 'approved', 'rejected', 'withdrawn'], to: 'deleted', event: 'delete' },
];

export function getValidTransitions(currentStatus: FormStatus): Transition[] {
  return transitions.filter(t => t.from.includes(currentStatus));
}

export function canTransition(currentStatus: FormStatus, event: FormEvent): boolean {
  return transitions.some(t => t.from.includes(currentStatus) && t.event === event);
}

export function getNextStatus(currentStatus: FormStatus, event: FormEvent): FormStatus | null {
  const transition = transitions.find(t => t.from.includes(currentStatus) && t.event === event);
  return transition ? transition.to : null;
}

export function createHistoryItem(
  event: FormEvent,
  fromStatus: FormStatus,
  toStatus: FormStatus,
  operator: string,
  comment?: string,
  version?: number
): FormHistoryItem {
  return {
    id: uuidv4(),
    event,
    fromStatus,
    toStatus,
    timestamp: new Date().toISOString(),
    operator,
    comment,
    version
  };
}

export function applyTransition(
  instance: FormInstance,
  event: FormEvent,
  operator: string,
  comment?: string
): FormInstance {
  if (!canTransition(instance.status, event)) {
    throw new Error(`Cannot transition from ${instance.status} via ${event}`);
  }

  const nextStatus = getNextStatus(instance.status, event);
  if (!nextStatus) {
    throw new Error(`Invalid transition: ${instance.status} -> ${event}`);
  }

  const historyItem = createHistoryItem(
    event,
    instance.status,
    nextStatus,
    operator,
    comment,
    instance.currentVersion
  );

  return {
    ...instance,
    status: nextStatus,
    history: [...instance.history, historyItem],
    updatedAt: historyItem.timestamp
  };
}

export function getAvailableActions(instance: FormInstance): FormEvent[] {
  return getValidTransitions(instance.status).map(t => t.event);
}

export function isReadOnly(status: FormStatus): boolean {
  return ['approved', 'withdrawn', 'deleted'].includes(status);
}

export function isEditingAllowed(status: FormStatus): boolean {
  return ['draft', 'rejected'].includes(status);
}

export function createInitialInstance(
  template: FormTemplate,
  operator: string
): FormInstance {
  const now = new Date().toISOString();
  const initialData: Record<string, unknown> = {};

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.type === 'section' && field.children) {
        for (const child of field.children) {
          if (child.defaultValue !== undefined) {
            initialData[child.name] = child.defaultValue;
          }
        }
      } else if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue;
      }
    }
  }

  const instance: FormInstance = {
    id: uuidv4(),
    templateId: template.id,
    templateVersion: template.version,
    currentVersion: 1,
    status: 'draft',
    data: initialData,
    versions: [{
      id: uuidv4(),
      version: 1,
      status: 'draft',
      data: initialData,
      createdAt: now,
      createdBy: operator,
      comment: '初始版本',
      event: 'save'
    }],
    history: [
      createHistoryItem('save', 'draft', 'draft', operator, '创建表单', 1)
    ],
    createdAt: now,
    updatedAt: now
  };

  return instance;
}
