import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import SegmentPage from './pages/SegmentPage';
import CalendarPage from './pages/CalendarPage';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-apple-gray-50">
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/segment/:segmentId" element={<SegmentPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Routes>
    </div>
  );
};

export default App;