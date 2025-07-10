import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { format } from 'date-fns';

interface CarryoverContextType {
  hasCheckedCarryoverToday: boolean;
  setHasCheckedCarryoverToday: (checked: boolean) => void;
  lastCheckedDate: string | null;
  updateLastCheckedDate: () => void;
}

const CarryoverContext = createContext<CarryoverContextType | undefined>(undefined);

const CARRYOVER_CHECK_KEY = 'siriustrack_last_carryover_check';

export const CarryoverProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasCheckedCarryoverToday, setHasCheckedCarryoverToday] = useState(false);
  const [lastCheckedDate, setLastCheckedDate] = useState<string | null>(null);

  // 初回ロード時とlastCheckedDateが更新された時に実行
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const savedDate = localStorage.getItem(CARRYOVER_CHECK_KEY);
    
    setLastCheckedDate(savedDate);
    
    // 保存された日付が今日でない場合は、チェックフラグをリセット
    if (savedDate !== today) {
      setHasCheckedCarryoverToday(false);
    } else {
      setHasCheckedCarryoverToday(true);
    }
  }, []);

  const updateLastCheckedDate = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem(CARRYOVER_CHECK_KEY, today);
    setLastCheckedDate(today);
    setHasCheckedCarryoverToday(true);
  };

  return (
    <CarryoverContext.Provider value={{ 
      hasCheckedCarryoverToday, 
      setHasCheckedCarryoverToday,
      lastCheckedDate,
      updateLastCheckedDate
    }}>
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