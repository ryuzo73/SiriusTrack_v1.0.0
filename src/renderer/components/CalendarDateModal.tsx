import React from 'react';
import { X, Target, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface CalendarDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  todos: Array<{
    id: number;
    title: string;
    completed: boolean;
    type: 'daily' | 'weekly';
  }>;
  milestones: Array<{
    id: number;
    title: string;
    status: 'pending' | 'completed';
  }>;
}

const CalendarDateModal: React.FC<CalendarDateModalProps> = ({
  isOpen,
  onClose,
  date,
  todos,
  milestones
}) => {
  if (!isOpen || !date) return null;

  // Escape key to close
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Group items by segment (extract segment name from title)
  const groupedItems: { [key: string]: { todos: typeof todos; milestones: typeof milestones } } = {};
  
  todos.forEach(todo => {
    const match = todo.title.match(/\[([^\]]+)\]/);
    const segmentName = match ? match[1] : 'その他';
    if (!groupedItems[segmentName]) {
      groupedItems[segmentName] = { todos: [], milestones: [] };
    }
    groupedItems[segmentName].todos.push(todo);
  });

  milestones.forEach(milestone => {
    const match = milestone.title.match(/\[([^\]]+)\]/);
    const segmentName = match ? match[1] : 'その他';
    if (!groupedItems[segmentName]) {
      groupedItems[segmentName] = { todos: [], milestones: [] };
    }
    groupedItems[segmentName].milestones.push(milestone);
  });

  const totalItems = todos.length + milestones.length;
  const completedItems = todos.filter(t => t.completed).length + milestones.filter(m => m.status === 'completed').length;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-medium mb-2">
              {format(date, 'yyyy年M月d日（E）', { locale: ja })}
            </h2>
            <p className="text-sm text-apple-gray-600">
              {completedItems}/{totalItems} タスク完了
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedItems).map(([segmentName, items]) => (
            <div key={segmentName} className="mb-6">
              <h3 className="font-medium text-apple-gray-700 mb-3 border-b pb-2">
                {segmentName}
              </h3>
              
              {/* Milestones */}
              {items.milestones.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-apple-gray-600 mb-2">
                    <Target size={16} />
                    マイルストーン
                  </div>
                  <div className="space-y-2 ml-6">
                    {items.milestones.map(milestone => (
                      <div key={milestone.id} className="flex items-start gap-2">
                        {milestone.status === 'completed' ? (
                          <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${milestone.status === 'completed' ? 'line-through text-apple-gray-400' : ''}`}>
                          {milestone.title.replace(/🎯?\[([^\]]+)\]\s*/, '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Todos */}
              {items.todos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-apple-gray-600 mb-2">
                    <Calendar size={16} />
                    タスク
                  </div>
                  <div className="space-y-2 ml-6">
                    {items.todos.map(todo => (
                      <div key={todo.id} className="flex items-start gap-2">
                        {todo.completed ? (
                          <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle size={18} className="text-apple-gray-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <span className={`text-sm ${todo.completed ? 'line-through text-apple-gray-400' : ''}`}>
                            {todo.title.replace(/\[([^\]]+)\]\s*/, '')}
                          </span>
                          <span className="text-xs text-apple-gray-500 ml-2">
                            {todo.type === 'weekly' ? '(週次)' : '(日次)'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {totalItems === 0 && (
            <div className="text-center py-8 text-apple-gray-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-20" />
              <p>この日のタスクはありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarDateModal;