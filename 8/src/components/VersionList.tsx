import dayjs from 'dayjs';
import { useForm } from '../context/FormContext';
import { getStatusDisplayText, getEventDisplayText, canRollback } from '../engine/versionManager';

export function VersionList() {
  const { instance, compareVersions, setCompareVersion, rollback, isSubmitting } = useForm();
  const versions = [...instance.versions].sort((a, b) => b.version - a.version);

  const handleRollback = (versionId: string) => {
    if (confirm('确定要回滚到此版本吗？这将创建一个新的版本。')) {
      rollback(versionId, '当前用户');
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>版本历史</h2>
      
      <div className="compare-selector">
        <div>
          <label className="field-label">版本 A</label>
          <select
            className="field-input"
            value={compareVersions.left || ''}
            onChange={(e) => setCompareVersion('left', e.target.value || null)}
          >
            <option value="">选择版本</option>
            {versions.map(v => (
              <option key={v.id} value={v.id}>v{v.version}</option>
            ))}
          </select>
        </div>
        <span style={{ fontWeight: '600', color: '#6b7280' }}>VS</span>
        <div>
          <label className="field-label">版本 B</label>
          <select
            className="field-input"
            value={compareVersions.right || ''}
            onChange={(e) => setCompareVersion('right', e.target.value || null)}
          >
            <option value="">选择版本</option>
            {versions.map(v => (
              <option key={v.id} value={v.id}>v{v.version}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="version-list">
        {versions.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>暂无版本记录</p>
        ) : (
          versions.map((version) => (
            <div key={version.id} className="version-item">
              <div className="version-info">
                <div className="version-number">
                  版本 v{version.version}
                  <span className={`status-badge status-${version.status}`} style={{ marginLeft: '12px' }}>
                    {getStatusDisplayText(version.status)}
                  </span>
                  {version.event && (
                    <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '12px' }}>
                      [{getEventDisplayText(version.event)}]
                    </span>
                  )}
                </div>
                <div className="version-meta">
                  创建人: {version.createdBy} | 
                  时间: {dayjs(version.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  {version.comment && ` | 备注: ${version.comment}`}
                </div>
              </div>
              <div className="version-actions">
                <button
                  className={`btn ${compareVersions.left === version.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCompareVersion('left', compareVersions.left === version.id ? null : version.id)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  对比A
                </button>
                <button
                  className={`btn ${compareVersions.right === version.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCompareVersion('right', compareVersions.right === version.id ? null : version.id)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  对比B
                </button>
                <button
                  className="btn btn-warning"
                  onClick={() => handleRollback(version.id)}
                  disabled={!canRollback(instance) || isSubmitting || version.version === instance.currentVersion}
                >
                  回滚
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
