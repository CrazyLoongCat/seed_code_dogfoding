import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AnnotationPage from './pages/AnnotationPage';
import Layout from './components/Layout';
import TestAuth from './pages/TestAuth';
import TestFetch from './pages/TestFetch';
import SimpleImageTest from './pages/SimpleImageTest';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/annotation/:imageId" element={<AnnotationPage />} />
        <Route path="/test-auth" element={<TestAuth />} />
        <Route path="/test-fetch/:imageId?" element={<TestFetch />} />
        <Route path="/test-image" element={<SimpleImageTest />} />
      </Routes>
    </Router>
  );
}

export default App;
