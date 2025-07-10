import React, { useState } from 'react';
import { ArrowRight, X, Check, Square, CheckSquare } from 'lucide-react';

interface UnifiedCarryoverTask {
  id: number;
  title: string;
  date: string;
  segmentId: number;
  segmentName: string;
  segmentColor: string;
}

interface UnifiedCarryoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTasks: UnifiedCarryoverTask[]) => void;
  incompleteTasks: UnifiedCarryoverTask[];
}

const UnifiedCarryoverModal: React.FC<UnifiedCarryoverModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  incompleteTasks
}) => {
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(
    new Set(incompleteTasks.map(task => task.id))
  );

  if (!isOpen) return null;

  const handleToggleTask = (taskId: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === incompleteTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(incompleteTasks.map(task => task.id)));
    }
  };

  const handleConfirm = () => {
    const tasksToCarryOver = incompleteTasks.filter(task => selectedTasks.has(task.id));
    onConfirm(tasksToCarryOver);
    onClose();
  };

  const groupedTasks = incompleteTasks.reduce((acc, task) => {
    if (!acc[task.segmentId]) {
      acc[task.segmentId] = {
        segmentName: task.segmentName,
        segmentColor: task.segmentColor,
        tasks: []
      };
    }
    acc[task.segmentId].tasks.push(task);
    return acc;
  }, {} as Record<number, { segmentName: string; segmentColor: string; tasks: UnifiedCarryoverTask[] }>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <ArrowRight size={24} className="text-blue-500" />
            <h2 className="text-lg font-medium">未完了タスクの引き継ぎ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-apple-gray-600">
            過去7日間の未完了タスクが<span className="font-medium text-blue-600">{incompleteTasks.length}件</span>あります。
            引き継ぎたいタスクを選択してください。
          </p>
        </div>

        <div className="mb-4">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-apple-gray-50 transition-colors"
          >
            {selectedTasks.size === incompleteTasks.length ? (
              <>
                <CheckSquare size={16} />
                すべて選択解除
              </>
            ) : (
              <>
                <Square size={16} />
                すべて選択
              </>
            )}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-apple-gray-50 rounded-lg p-4 mb-6">
          {Object.entries(groupedTasks).map(([segmentId, group]) => (
            <div key={segmentId} className="mb-6 last:mb-0">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.segmentColor }}
                />
                <h3 className="text-sm font-medium text-apple-gray-700">
                  {group.segmentName}
                </h3>
                <span className="text-xs text-apple-gray-500">
                  ({group.tasks.length}件)
                </span>
              </div>
              <div className="space-y-2">
                {group.tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg hover:bg-apple-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => handleToggleTask(task.id)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-apple-gray-800">{task.title}</div>
                      <div className="text-xs text-apple-gray-500 mt-0.5">
                        {new Date(task.date).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={selectedTasks.size === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors flex-1 ${
              selectedTasks.size > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Check size={16} />
            {selectedTasks.size > 0 ? `${selectedTasks.size}件を引き継ぐ` : '選択してください'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-apple-gray-100 transition-colors flex-1"
          >
            スキップ
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCarryoverModal;