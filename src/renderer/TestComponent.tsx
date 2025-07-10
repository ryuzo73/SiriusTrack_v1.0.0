import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
      <h1>Test Component</h1>
      <p>If you can see this, React is working correctly.</p>
      <button onClick={() => console.log('Button clicked')}>
        Test Button
      </button>
    </div>
  );
};

export default TestComponent;