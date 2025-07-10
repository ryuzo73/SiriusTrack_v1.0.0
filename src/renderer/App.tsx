import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import MainPageSimple from './pages/MainPageSimple';
import MainPageDebug from './pages/MainPageDebug';
import SegmentPage from './pages/SegmentPage';
import CalendarPage from './pages/CalendarPage';
import RoutinePage from './pages/RoutinePage';
import BucketListPage from './pages/BucketListPage';
import IdeaListPage from './pages/IdeaListPage';
import TestComponent from './TestComponent';
import { CarryoverProvider } from './contexts/CarryoverContext';

const App: React.FC = () => {
  return (
    <CarryoverProvider>
      <div className="min-h-screen bg-apple-gray-50">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/simple" element={<MainPageSimple />} />
          <Route path="/debug" element={<MainPageDebug />} />
          <Route path="/test" element={<TestComponent />} />
          <Route path="/segment/:segmentId" element={<SegmentPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/routine" element={<RoutinePage />} />
          <Route path="/bucket-list" element={<BucketListPage />} />
          <Route path="/idea-list" element={<IdeaListPage />} />
        </Routes>
      </div>
    </CarryoverProvider>
  );
};

export default App;