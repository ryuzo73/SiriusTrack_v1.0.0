import React, { useState } from 'react';
import { X, Save, Palette, Plus, Trash2 } from 'lucide-react';

interface TimeRange {
  start: number;
  end: number;
  color: string;
  label: string;
}

interface ColorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (timeRanges: TimeRange[]) => void;
  initialTimeRanges: TimeRange[];
  position?: 'center' | 'inline';
}

const ColorSettingsModal: React.FC<ColorSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialTimeRanges,
  position = 'center'
}) => {
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>(initialTimeRanges);

  const handleTimeRangeChange = (index: number, field: keyof TimeRange, value: string | number) => {
    const newTimeRanges = [...timeRanges];
    newTimeRanges[index] = { ...newTimeRanges[index], [field]: value };
    setTimeRanges(newTimeRanges);
  };

  const addTimeRange = () => {
    // 新しい区分のデフォルト値を設定
    const sortedRanges = [...timeRanges].sort((a, b) => a.start - b.start);
    const lastRange = sortedRanges[sortedRanges.length - 1];
    
    let defaultStartTime = 0;
    let defaultEndTime = 2;
    
    if (lastRange) {
      // 最後の区分の終了時刻から新しい区分を開始
      defaultStartTime = lastRange.end;
      defaultEndTime = defaultStartTime + 2;
      
      // 24時間を超える場合は調整
      if (defaultEndTime > 24) {
        defaultEndTime = 24;
      }
      
      // 開始時刻が24時間を超える場合は、空いている時間を探す
      if (defaultStartTime >= 24) {
        defaultStartTime = 0;
        defaultEndTime = 2;
      }
    }
    
    const newRange: TimeRange = {
      start: defaultStartTime,
      end: defaultEndTime,
      color: getRandomColor(),
      label: `区分${timeRanges.length + 1}`
    };
    
    setTimeRanges([...timeRanges, newRange]);
  };

  const removeTimeRange = (index: number) => {
    if (timeRanges.length > 1) {
      const newTimeRanges = timeRanges.filter((_, i) => i !== index);
      setTimeRanges(newTimeRanges);
    }
  };

  const getRandomColor = () => {
    const colors = [
      '#FEF3C7', '#DBEAFE', '#FEE2E2', '#E5E7EB', '#F3E8FF', 
      '#D1FAE5', '#FEF7CD', '#FECACA', '#E0E7FF', '#F0FDF4'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleSave = () => {
    onSave(timeRanges);
    onClose();
  };

  const handleCancel = () => {
    setTimeRanges(initialTimeRanges);
    onClose();
  };

  if (!isOpen) return null;

  if (position === 'inline') {
    return (
      <div className="bg-white rounded-lg border shadow-lg w-full flex flex-col" style={{ height: '800px' }}>
        {/* ヘッダー部分 - 固定 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-blue-500" />
            <h2 className="text-lg font-medium">時間帯の色分け設定</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-apple-gray-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* コンテンツ部分 - スクロール可能 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {timeRanges.map((range, index) => (
              <div key={index} className="p-3 border rounded-lg relative">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: range.color }}
                  />
                  <input
                    type="text"
                    value={range.label}
                    onChange={(e) => handleTimeRangeChange(index, 'label', e.target.value)}
                    className="font-medium text-sm flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {timeRanges.length > 1 && (
                    <button
                      onClick={() => removeTimeRange(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="この区分を削除"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-apple-gray-600 mb-1">開始時刻</label>
                    <select
                      value={range.start}
                      onChange={(e) => handleTimeRangeChange(index, 'start', parseInt(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-apple-gray-600 mb-1">終了時刻</label>
                    <select
                      value={range.end}
                      onChange={(e) => handleTimeRangeChange(index, 'end', parseInt(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 25 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 24 ? '24:00' : `${i.toString().padStart(2, '0')}:00`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mt-2">
                  <label className="block text-xs text-apple-gray-600 mb-1">色</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={range.color}
                      onChange={(e) => handleTimeRangeChange(index, 'color', e.target.value)}
                      className="w-8 h-6 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={range.color}
                      onChange={(e) => handleTimeRangeChange(index, 'color', e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 区分追加ボタン */}
          <div className="flex justify-center mt-3">
            <button
              onClick={addTimeRange}
              className="flex items-center gap-2 px-3 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors text-sm"
            >
              <Plus size={14} />
              新しい区分を追加
            </button>
          </div>
        </div>

        {/* フッター部分 - 固定 */}
        <div className="flex gap-2 p-4 border-t">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            <Save size={14} />
            保存
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-3 py-2 border border-apple-gray-300 text-apple-gray-500 rounded-lg hover:bg-apple-gray-50 transition-colors text-sm"
          >
            <X size={14} />
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
        {/* ヘッダー部分 - 固定 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-blue-500" />
            <h2 className="text-xl font-medium">時間帯の色分け設定</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-apple-gray-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* コンテンツ部分 - スクロール可能 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {timeRanges.map((range, index) => (
              <div key={index} className="p-4 border rounded-lg relative">
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: range.color }}
                  />
                  <input
                    type="text"
                    value={range.label}
                    onChange={(e) => handleTimeRangeChange(index, 'label', e.target.value)}
                    className="font-medium text-sm flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {timeRanges.length > 1 && (
                    <button
                      onClick={() => removeTimeRange(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="この区分を削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-apple-gray-600 mb-1">開始時刻</label>
                    <select
                      value={range.start}
                      onChange={(e) => handleTimeRangeChange(index, 'start', parseInt(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-apple-gray-600 mb-1">終了時刻</label>
                    <select
                      value={range.end}
                      onChange={(e) => handleTimeRangeChange(index, 'end', parseInt(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 25 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 24 ? '24:00' : `${i.toString().padStart(2, '0')}:00`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="block text-xs text-apple-gray-600 mb-1">色</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={range.color}
                      onChange={(e) => handleTimeRangeChange(index, 'color', e.target.value)}
                      className="w-12 h-8 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={range.color}
                      onChange={(e) => handleTimeRangeChange(index, 'color', e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 区分追加ボタン */}
          <div className="flex justify-center mt-4">
            <button
              onClick={addTimeRange}
              className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors"
            >
              <Plus size={16} />
              新しい区分を追加
            </button>
          </div>
        </div>

        {/* フッター部分 - 固定 */}
        <div className="flex gap-2 p-6 border-t">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Save size={16} />
            保存
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-500 rounded-lg hover:bg-apple-gray-50 transition-colors"
          >
            <X size={16} />
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorSettingsModal;