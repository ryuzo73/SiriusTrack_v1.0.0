import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const MainPageSimple: React.FC = () => {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    setMessage('MainPage is working!');
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-light mb-8">SiriusTrack - Simple Test</h1>
      <p className="text-lg">{message}</p>
      
      <div className="mt-4 space-x-4">
        <Link to="/test" className="text-blue-500 underline">
          Go to Test Component
        </Link>
        <Link to="/debug" className="text-green-500 underline">
          Go to Debug Page
        </Link>
        <Link to="/main" className="text-purple-500 underline">
          Go to Main Page (Full)
        </Link>
      </div>
      
      <div className="mt-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl mb-4">Navigation Test</h2>
        <p>✅ React is working correctly</p>
        <p>✅ Routing is working</p>
        <p>✅ Tailwind CSS is working</p>
        <p className="mt-2 text-sm text-gray-600">
          Next step: Click "Go to Debug Page" to test electron APIs and imports
        </p>
      </div>
    </div>
  );
};

export default MainPageSimple;