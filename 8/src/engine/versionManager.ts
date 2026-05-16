import { v4 as uuidv4 } from 'uuid';
import type { FormInstance, FormVersion, FormEvent, FormStatus, VersionDiff } from '../types';

export function createVersion(
  instance: FormInstance,
  data: Record<string, unknown>,
  event: FormEvent,
  operator: string,
  comment?: string
): FormVersion {
  return {
    id: uuidv4(),
    version: instance.currentVersion + 1,
    status: instance.status,
    data: JSON.parse(JSON.stringify(data)),
    createdAt: new Date().toISOString(),
    createdBy: operator,
    comment,
    event
  };
}

export function addVersion(
  instance: FormInstance,
  version: FormVersion
): FormInstance {
  return {
    ...instance,
    versions: [...instance.versions, version],
    currentVersion: version.version,
    updatedAt: version.createdAt
  };
}

export function getVersionById(instance: FormInstance, versionId: string): FormVersion | undefined {
  return instance.versions.find(v => v.id === versionId);
}

export function getVersionByNumber(instance: FormInstance, versionNumber: number): FormVersion | undefined {
  return instance.versions.find(v => v.version === versionNumber);
}

export function rollbackToVersion(
  instance: FormInstance,
  versionId: string,
  operator: string
): FormInstance {
  const targetVersion = getVersionById(instance, versionId);
  if (!targetVersion) {
    throw new Error('Version not found');
  }

  const rollbackVersion: FormVersion = {
    id: uuidv4(),
    version: instance.currentVersion + 1,
    status: 'draft',
    data: JSON.parse(JSON.stringify(targetVersion.data)),
    createdAt: new Date().toISOString(),
    createdBy: operator,
    comment: `回滚到版本 v${targetVersion.version}`,
    event: 'rollback'
  };

  return {
    ...instance,
    data: rollbackVersion.data,
    status: 'draft',
    versions: [...instance.versions, rollbackVersion],
    currentVersion: rollbackVersion.version,
    updatedAt: rollbackVersion.createdAt
  };
}

export function compareVersions(
  versionA: FormVersion,
  versionB: FormVersion,
  fieldLabels: Record<string, string>
): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  const allFields = new Set([...Object.keys(versionA.data), ...Object.keys(versionB.data)]);

  for (const field of allFields) {
    const oldValue = versionA.data[field];
    const newValue = versionB.data[field];
    const fieldLabel = fieldLabels[field] || field;

    const oldStr = JSON.stringify(oldValue);
    const newStr = JSON.stringify(newValue);

    if (oldStr !== newStr) {
      let changeType: 'added' | 'removed' | 'modified';
      
      if (oldValue === undefined || oldValue === null || oldValue === '') {
        changeType = 'added';
      } else if (newValue === undefined || newValue === null || newValue === '') {
        changeType = 'removed';
      } else {
        changeType = 'modified';
      }

      diffs.push({
        field,
        fieldLabel,
        oldValue,
        newValue,
        changeType
      });
    }
  }

  return diffs;
}

export function getVersionHistory(instance: FormInstance): FormVersion[] {
  return [...instance.versions].sort((a, b) => b.version - a.version);
}

export function canEditInstance(instance: FormInstance): boolean {
  return instance.status === 'draft' || instance.status === 'rejected';
}

export function canSubmit(instance: FormInstance): boolean {
  return instance.status === 'draft';
}

export function canApprove(instance: FormInstance): boolean {
  return instance.status === 'pending';
}

export function canReject(instance: FormInstance): boolean {
  return instance.status === 'pending';
}

export function canWithdraw(instance: FormInstance): boolean {
  return instance.status === 'pending';
}

export function canRollback(instance: FormInstance): boolean {
  return instance.versions.length > 1 && 
         (instance.status === 'draft' || instance.status === 'rejected');
}

export function canDelete(instance: FormInstance): boolean {
  return instance.status !== 'deleted';
}

export function getStatusDisplayText(status: FormStatus): string {
  const statusMap: Record<FormStatus, string> = {
    draft: '草稿',
    pending: '待审核',
    approved: '已批准',
    rejected: '已驳回',
    withdrawn: '已撤回',
    deleted: '已删除'
  };
  return statusMap[status];
}

export function getEventDisplayText(event: FormEvent): string {
  const eventMap: Record<FormEvent, string> = {
    save: '保存',
    submit: '提交',
    approve: '批准',
    reject: '驳回',
    withdraw: '撤回',
    rollback: '回滚',
    delete: '删除'
  };
  return eventMap[event];
}
