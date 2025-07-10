import React from 'react';
import { ArrowRight, X, Check } from 'lucide-react';

interface CarryoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  incompleteTodos: Array<{ id: number; title: string }>;
}

const CarryoverModal: React.FC<CarryoverModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  incompleteTodos
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <ArrowRight size={24} className="text-blue-500" />
            <h2 className="text-lg font-medium">前日の未完了タスク</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-apple-gray-600 mb-4">
            前日の未完了タスクが<span className="font-medium text-blue-600">{incompleteTodos.length}件</span>あります。
            今日に引き継ぎますか？
          </p>
          
          <div className="bg-apple-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
            <h3 className="text-sm font-medium text-apple-gray-700 mb-2">未完了タスク:</h3>
            <ul className="space-y-2">
              {incompleteTodos.map((todo) => (
                <li key={todo.id} className="flex items-center gap-2 text-sm text-apple-gray-600">
                  <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0"></div>
                  {todo.title}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1"
          >
            <Check size={16} />
            引き継ぐ
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

export default CarryoverModal;