import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Minus, ChevronDown } from 'lucide-react';

interface AchievementButtonProps {
  currentLevel: 'pending' | 'achieved' | 'partial' | 'not_achieved';
  onLevelChange: (level: 'pending' | 'achieved' | 'partial' | 'not_achieved') => void;
  size?: 'sm' | 'md';
}

const AchievementButton: React.FC<AchievementButtonProps> = ({
  currentLevel,
  onLevelChange,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const levels = [
    { key: 'achieved', label: '達成', icon: Check, color: 'bg-green-600', textColor: 'text-green-600' },
    { key: 'partial', label: '部分達成', icon: Minus, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    { key: 'not_achieved', label: '未達', icon: X, color: 'bg-red-500', textColor: 'text-red-600' },
    { key: 'pending', label: '未評価', icon: ChevronDown, color: 'bg-gray-300', textColor: 'text-gray-600' }
  ] as const;

  const currentLevelData = levels.find(level => level.key === currentLevel) || levels[3];
  const IconComponent = currentLevelData.icon;

  const buttonSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const dropdownSize = size === 'sm' ? 'text-xs' : 'text-sm';

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 200; // Approximate dropdown height
      
      let top = rect.bottom + 4;
      // If dropdown would go off-screen at bottom, show it above the button
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 4;
      }
      
      setDropdownPosition({
        top,
        left: rect.left
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && buttonRef.current) {
        const target = event.target as Node;
        const dropdown = document.querySelector('[data-achievement-dropdown="true"]');
        
        // Check if click is outside both button and dropdown
        if (!buttonRef.current.contains(target) && dropdown && !dropdown.contains(target)) {
          setIsOpen(false);
        }
      }
    };

    // Use click instead of mousedown to avoid conflicts
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`${buttonSize} rounded border-2 flex items-center justify-center transition-colors ${
          currentLevel === 'pending' 
            ? 'border-gray-300 hover:border-gray-400' 
            : `${currentLevelData.color} border-transparent`
        }`}
      >
        <IconComponent 
          size={size === 'sm' ? 12 : 14} 
          color={currentLevel === 'pending' ? '#6b7280' : 'white'} 
        />
      </button>

      {isOpen && createPortal(
        <div 
          data-achievement-dropdown="true"
          className="bg-white border rounded-lg shadow-lg min-w-32"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 9999
          }}
        >
            {levels.map((level) => {
              const LevelIcon = level.icon;
              return (
                <button
                  key={level.key}
                  onClick={() => {
                    console.log('AchievementButton level clicked:', level.key);
                    onLevelChange(level.key as any);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${dropdownSize} ${
                    currentLevel === level.key ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    currentLevel === level.key ? level.color : 'border-gray-300'
                  }`}>
                    <LevelIcon 
                      size={10} 
                      color={currentLevel === level.key ? 'white' : '#6b7280'} 
                    />
                  </div>
                  <span className={currentLevel === level.key ? level.textColor : 'text-gray-700'}>
                    {level.label}
                  </span>
                </button>
              );
            })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default AchievementButton;