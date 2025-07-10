import React, { useState, useEffect } from 'react';

const MainPageDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  useEffect(() => {
    addDebugInfo('Component mounted');
    
    // Test electron API
    try {
      if (window.electronAPI) {
        addDebugInfo('✓ electronAPI is available');
        
        // Test database connection
        window.electronAPI.database.getSegments()
          .then(() => {
            addDebugInfo('✓ Database connection successful');
          })
          .catch((error) => {
            addDebugInfo(`✗ Database error: ${error.message}`);
          });
      } else {
        addDebugInfo('✗ electronAPI is not available');
      }
    } catch (error) {
      addDebugInfo(`✗ Error testing electronAPI: ${error}`);
    }
    
    // Test imports
    try {
      addDebugInfo('Testing imports...');
      import('../utils/database').then(() => {
        addDebugInfo('✓ database utils imported');
      }).catch((error) => {
        addDebugInfo(`✗ database utils import failed: ${error.message}`);
      });
      
      import('../contexts/CarryoverContext').then(() => {
        addDebugInfo('✓ CarryoverContext imported');
      }).catch((error) => {
        addDebugInfo(`✗ CarryoverContext import failed: ${error.message}`);
      });
      
      import('../components/UnifiedCarryoverModal').then(() => {
        addDebugInfo('✓ UnifiedCarryoverModal imported');
      }).catch((error) => {
        addDebugInfo(`✗ UnifiedCarryoverModal import failed: ${error.message}`);
      });
      
    } catch (error) {
      addDebugInfo(`✗ Import test failed: ${error}`);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">MainPage Debug</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
        <div className="space-y-2">
          {debugInfo.map((info, index) => (
            <div key={index} className="text-sm font-mono p-2 bg-gray-100 rounded">
              {info}
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Instructions</h3>
        <p className="text-blue-700">
          Check the debug information above to identify what's causing the MainPage to fail.
          Open browser console (F12) for additional error details.
        </p>
      </div>
    </div>
  );
};

export default MainPageDebug;