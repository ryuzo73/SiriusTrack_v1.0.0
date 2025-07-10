import React from 'react';
import { Check } from 'lucide-react';

interface AchievementButtonProps {
  currentLevel: 'pending' | 'achieved';
  onLevelChange: (level: 'pending' | 'achieved') => void;
  size?: 'sm' | 'md';
}

const AchievementButton: React.FC<AchievementButtonProps> = ({
  currentLevel,
  onLevelChange,
  size = 'md'
}) => {
  const isAchieved = currentLevel === 'achieved';
  const buttonSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const handleClick = () => {
    const newLevel = isAchieved ? 'pending' : 'achieved';
    onLevelChange(newLevel);
  };

  return (
    <button
      onClick={handleClick}
      className={`${buttonSize} rounded border-2 flex items-center justify-center transition-colors ${
        isAchieved 
          ? 'bg-green-600 border-transparent' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
      title={isAchieved ? '達成済み' : '未達成（クリックで達成にする）'}
    >
      <Check 
        size={size === 'sm' ? 12 : 14} 
        color={isAchieved ? 'white' : '#6b7280'} 
      />
    </button>
  );
};

export default AchievementButton;