import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CarryoverContextType {
  hasCheckedCarryoverToday: boolean;
  setHasCheckedCarryoverToday: (checked: boolean) => void;
}

const CarryoverContext = createContext<CarryoverContextType | undefined>(undefined);

export const CarryoverProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasCheckedCarryoverToday, setHasCheckedCarryoverToday] = useState(false);

  return (
    <CarryoverContext.Provider value={{ hasCheckedCarryoverToday, setHasCheckedCarryoverToday }}>
      {children}
    </CarryoverContext.Provider>
  );
};

export const useCarryover = () => {
  const context = useContext(CarryoverContext);
  if (!context) {
    throw new Error('useCarryover must be used within a CarryoverProvider');
  }
  return context;
};