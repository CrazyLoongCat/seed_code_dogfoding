import { useState } from 'react';
import { useForm } from '../context/FormContext';
import { getAvailableActions, canTransition } from '../engine/stateMachine';
import { getEventDisplayText } from '../engine/versionManager';

const eventButtonClass: Record<string, string> = {
  save: 'btn-secondary',
  submit: 'btn-primary',
  approve: 'btn-success',
  reject: 'btn-danger',
  withdraw: 'btn-warning',
  rollback: 'btn-secondary',
  delete: 'btn-danger'
};

export function FormActions() {
  const { instance, handleEvent, isSubmitting } = useForm();
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<string | null>(null);

  const availableActions = getAvailableActions(instance);
  const filteredActions = availableActions.filter(action => action !== 'delete');

  const handleClick = (event: string) => {
    if (event === 'submit' || event === 'approve' || event === 'reject') {
      setPendingEvent(event);
      setShowComment(true);
    } else {
      handleEvent(event as any, '当前用户', comment);
      setComment('');
    }
  };

  const confirmAction = () => {
    if (pendingEvent) {
      handleEvent(pendingEvent as any, '当前用户', comment);
      setPendingEvent(null);
      setShowComment(false);
      setComment('');
    }
  };

  const cancelAction = () => {
    setPendingEvent(null);
    setShowComment(false);
    setComment('');
  };

  return (
    <div className="form-container">
      <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>操作</h3>
      
      {showComment ? (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label className="field-label">审核意见</label>
            <textarea
              className="field-input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请输入意见（可选）"
              rows={3}
            />
          </div>
          <div className="button-group">
            <button className="btn btn-primary" onClick={confirmAction}>
              确认{getEventDisplayText(pendingEvent as any)}
            </button>
            <button className="btn btn-secondary" onClick={cancelAction}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="button-group">
          {filteredActions.map((action) => (
            <button
              key={action}
              className={`btn ${eventButtonClass[action]}`}
              onClick={() => handleClick(action)}
              disabled={isSubmitting || !canTransition(instance.status, action as any)}
            >
              {getEventDisplayText(action as any)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
