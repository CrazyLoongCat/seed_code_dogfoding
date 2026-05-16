import { useState } from 'react';
import { FormProvider } from './context/FormContext';
import { FormContainer } from './components/FormContainer';
import { VersionList } from './components/VersionList';
import { VersionCompare } from './components/VersionCompare';
import { HistoryTimeline } from './components/HistoryTimeline';
import { useForm } from './context/FormContext';
import { createInitialInstance } from './engine/stateMachine';
import { expenseReportTemplate } from './templates/expenseReport';

function Tabs() {
  const { activeTab, setActiveTab } = useForm();

  return (
    <div className="tabs">
      <div
        className={`tab ${activeTab === 'form' ? 'active' : ''}`}
        onClick={() => setActiveTab('form')}
      >
        表单填写
      </div>
      <div
        className={`tab ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => setActiveTab('history')}
      >
        操作历史
      </div>
      <div
        className={`tab ${activeTab === 'versions' ? 'active' : ''}`}
        onClick={() => setActiveTab('versions')}
      >
        版本管理
      </div>
    </div>
  );
}

function TabContent() {
  const { activeTab } = useForm();

  switch (activeTab) {
    case 'form':
      return <FormContainer />;
    case 'history':
      return <HistoryTimeline />;
    case 'versions':
      return (
        <div>
          <VersionList />
          <VersionCompare />
        </div>
      );
    default:
      return null;
  }
}

function AppContent() {
  return (
    <div className="app-container">
      <Tabs />
      <TabContent />
    </div>
  );
}

export default function App() {
  const [instance] = useState(() => {
    return createInitialInstance(expenseReportTemplate, '当前用户');
  });

  return (
    <FormProvider template={expenseReportTemplate} instance={instance}>
      <AppContent />
    </FormProvider>
  );
}
