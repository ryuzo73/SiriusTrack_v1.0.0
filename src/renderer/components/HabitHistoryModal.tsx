import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, RotateCcw, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { database, HabitTodo } from '../utils/database';

interface HabitHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  segmentId: number;
  onHabitTodosChanged?: () => void;
}

const HabitHistoryModal: React.FC<HabitHistoryModalProps> = ({
  isOpen,
  onClose,
  segmentId,
  onHabitTodosChanged
}) => {
  const [habitTodos, setHabitTodos] = useState<HabitTodo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredHabits, setFilteredHabits] = useState<HabitTodo[]>([]);

  useEffect(() => {
    if (isOpen && segmentId) {
      loadAllHabitTodos();
    }
  }, [isOpen, segmentId]);

  useEffect(() => {
    let filtered = [...habitTodos];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(habit => 
        habit.title.toLowerCase().includes(term)
      );
    }
    
    setFilteredHabits(filtered);
  }, [habitTodos, searchTerm]);

  const loadAllHabitTodos = async () => {
    try {
      const allHabits = await database.getAllHabitTodos(segmentId);
      setHabitTodos(allHabits);
    } catch (error) {
      console.error('Error loading habit history:', error);
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await database.reactivateHabitTodo(id);
      await loadAllHabitTodos();
      // 親コンポーネントに変更を通知
      if (onHabitTodosChanged) {
        onHabitTodosChanged();
      }
    } catch (error) {
      console.error('Error reactivating habit todo:', error);
    }
  };

  const getStatusInfo = (habit: HabitTodo) => {
    if (habit.active) {
      return {
        icon: <CheckCircle size={16} className="text-green-600" />,
        text: 'アクティブ',
        color: 'bg-green-100 text-green-800',
        period: `${format(new Date(habit.created_at), 'yyyy/MM/dd')}〜`
      };
    } else {
      return {
        icon: <Clock size={16} className="text-gray-600" />,
        text: '非アクティブ',
        color: 'bg-gray-100 text-gray-800',
        period: `${format(new Date(habit.created_at), 'yyyy/MM/dd')}〜${habit.deactivated_at ? format(new Date(habit.deactivated_at), 'yyyy/MM/dd') : ''}`
      };
    }
  };

  if (!isOpen) return null;

  const activeCount = habitTodos.filter(h => h.active).length;
  const inactiveCount = habitTodos.filter(h => !h.active).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <RotateCcw size={28} className="text-amber-600" />
                習慣Todoの履歴
              </h2>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span>アクティブ: {activeCount}</span>
                <span>非アクティブ: {inactiveCount}</span>
                <span>総計: {habitTodos.length}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* 検索 */}
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="習慣Todoを検索..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* 一覧 */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {filteredHabits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <RotateCcw size={48} className="mx-auto mb-4 text-gray-300" />
              <p>該当する習慣Todoが見つかりませんでした</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHabits.map((habit) => {
                const statusInfo = getStatusInfo(habit);
                return (
                  <div
                    key={habit.id}
                    className={`border rounded-lg p-4 transition-all ${
                      habit.active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* ステータスアイコン */}
                      <div className="mt-1">
                        {statusInfo.icon}
                      </div>

                      {/* コンテンツ */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium mb-2 ${
                          habit.active ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {habit.title}
                        </h3>

                        {/* 期間情報 */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            期間: {statusInfo.period}
                          </span>
                        </div>
                      </div>

                      {/* ステータスバッジとアクション */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                        {!habit.active && (
                          <button
                            onClick={() => handleReactivate(habit.id)}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            再アクティブ化
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            習慣として実行してきたタスクの履歴を確認できます
          </p>
        </div>
      </div>
    </div>
  );
};

export default HabitHistoryModal;