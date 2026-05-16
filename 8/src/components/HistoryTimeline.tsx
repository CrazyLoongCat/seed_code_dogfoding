import dayjs from 'dayjs';
import { useForm } from '../context/FormContext';
import { getStatusDisplayText, getEventDisplayText } from '../engine/versionManager';

export function HistoryTimeline() {
  const { instance } = useForm();
  const history = [...instance.history].reverse();

  return (
    <div>
      <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>操作历史</h2>
      
      <div className="version-list">
        {history.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>暂无操作记录</p>
        ) : (
          <div className="history-timeline">
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-event">
                  {getEventDisplayText(item.event)}
                  <span className={`status-badge status-${item.toStatus}`} style={{ marginLeft: '12px' }}>
                    {getStatusDisplayText(item.fromStatus)} → {getStatusDisplayText(item.toStatus)}
                  </span>
                </div>
                <div className="history-time">
                  操作人: {item.operator} | 
                  时间: {dayjs(item.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                  {item.version && ` | 版本: v${item.version}`}
                  {item.comment && ` | 备注: ${item.comment}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
