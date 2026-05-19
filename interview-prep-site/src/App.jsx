import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import InterviewPrep from './pages/InterviewPrep';
import InterviewTopic from './pages/InterviewTopic';
import SystemDesign from './pages/SystemDesign';
import SystemDesignProject from './pages/SystemDesignProject';
import MarkdownViewer from './pages/MarkdownViewer';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="interview-prep" element={<InterviewPrep />} />
          <Route path="interview-prep/:category" element={<InterviewTopic />} />
          <Route path="interview-prep/:category/:file" element={<MarkdownViewer />} />
          <Route path="system-design" element={<SystemDesign />} />
          <Route path="system-design/:project" element={<SystemDesignProject />} />
          <Route path="system-design/:project/:file" element={<MarkdownViewer />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
