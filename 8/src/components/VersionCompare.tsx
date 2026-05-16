import { useMemo } from 'react';
import { useForm } from '../context/FormContext';
import { compareVersions as compareVersionData, getVersionById } from '../engine/versionManager';
import type { VersionDiff } from '../types';

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '-';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function DiffItem({ diff }: { diff: VersionDiff }) {
  return (
    <div className="diff-item">
      <div className="diff-field-name">{diff.fieldLabel}</div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {diff.changeType === 'added' && (
          <span className="diff-added">新增: {formatValue(diff.newValue)}</span>
        )}
        {diff.changeType === 'removed' && (
          <span className="diff-removed">删除: {formatValue(diff.oldValue)}</span>
        )}
        {diff.changeType === 'modified' && (
          <>
            <span className="diff-removed">{formatValue(diff.oldValue)}</span>
            <span style={{ color: '#6b7280' }}>→</span>
            <span className="diff-added">{formatValue(diff.newValue)}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function VersionCompare() {
  const { instance, compareVersions, getAllFieldLabels } = useForm();
  
  const diffs = useMemo(() => {
    if (!compareVersions.left || !compareVersions.right) return [];
    
    const leftVersion = getVersionById(instance, compareVersions.left);
    const rightVersion = getVersionById(instance, compareVersions.right);
    
    if (!leftVersion || !rightVersion) return [];
    
    const fieldLabels = getAllFieldLabels();
    return compareVersionData(leftVersion, rightVersion, fieldLabels);
  }, [compareVersions.left, compareVersions.right, instance, getAllFieldLabels]);

  if (!compareVersions.left || !compareVersions.right) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
        请在上方选择两个版本进行对比
      </div>
    );
  }

  const leftVersion = getVersionById(instance, compareVersions.left);
  const rightVersion = getVersionById(instance, compareVersions.right);

  return (
    <div style={{ marginTop: '24px' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
        版本对比: v{leftVersion?.version} vs v{rightVersion?.version}
      </h3>
      
      {diffs.length === 0 ? (
        <div className="form-container" style={{ textAlign: 'center', color: '#10b981' }}>
          两个版本内容完全一致
        </div>
      ) : (
        <div className="form-container">
          <p style={{ marginBottom: '16px', color: '#6b7280' }}>
            共发现 {diffs.length} 处差异
          </p>
          {diffs.map((diff: VersionDiff, idx: number) => (
            <DiffItem key={idx} diff={diff} />
          ))}
        </div>
      )}
    </div>
  );
}
