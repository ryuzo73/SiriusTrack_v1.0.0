import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Plus, Edit2, RefreshCw, Pause, Trash2, Check } from 'lucide-react';
import { database, HabitTodo, HabitTodoCompletion } from '../utils/database';
import { logDateDebug, getTodayString } from '../../utils/dateUtils';
import HabitHistoryModal from './HabitHistoryModal';
import ConfirmModal from './ConfirmModal';

interface HabitTodoSectionProps {
  segmentId: number;
  onHabitTodosChanged: () => void;
}

export interface HabitTodoSectionHandle {
  refreshHabitTodos: () => Promise<void>;
}

const HabitTodoSection = forwardRef<HabitTodoSectionHandle, HabitTodoSectionProps>(({ segmentId, onHabitTodosChanged }, ref) => {
  const [habitTodos, setHabitTodos] = useState<HabitTodo[]>([]);
  const [newHabitTodo, setNewHabitTodo] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [completions, setCompletions] = useState<Map<number, boolean>>(new Map());
  const newHabitInputRef = useRef<HTMLInputElement>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    if (segmentId) {
      loadHabitTodos();
      loadTodaysCompletions();
    }
  }, [segmentId]);

  useImperativeHandle(ref, () => ({
    refreshHabitTodos: async () => {
      await loadHabitTodos();
      await loadTodaysCompletions();
    }
  }));


  const loadHabitTodos = async () => {
    try {
      const habits = await database.getHabitTodos(segmentId);
      setHabitTodos(habits);
    } catch (error) {
      console.error('Error loading habit todos:', error);
    }
  };

  const loadTodaysCompletions = async () => {
    try {
      const todayString = logDateDebug('loadTodaysCompletions');
      
      const todaysCompletions = await database.getHabitTodoCompletions(segmentId, todayString);
      console.log('Habit completions loaded:', todaysCompletions);
      
      const completionMap = new Map<number, boolean>();
      todaysCompletions.forEach(completion => {
        completionMap.set(completion.habit_todo_id, completion.completed);
      });
      setCompletions(completionMap);
    } catch (error) {
      console.error('Error loading today\'s completions:', error);
    }
  };

  const handleAddHabitTodo = async () => {
    if (!newHabitTodo.trim()) return;
    
    try {
      await database.createHabitTodo(segmentId, newHabitTodo.trim());
      setNewHabitTodo('');
      await loadHabitTodos();
      onHabitTodosChanged();
    } catch (error) {
      console.error('Error creating habit todo:', error);
      alert('習慣Todoの作成に失敗しました: ' + error.message);
    }
  };

  const handleEditStart = (habitTodo: HabitTodo) => {
    setEditingId(habitTodo.id);
    setEditingTitle(habitTodo.title);
  };

  const handleEditSave = async () => {
    if (!editingTitle.trim() || editingId === null) return;
    
    try {
      await database.updateHabitTodo(editingId, editingTitle.trim());
      setEditingId(null);
      setEditingTitle('');
      await loadHabitTodos();
      onHabitTodosChanged();
    } catch (error) {
      console.error('Error updating habit todo:', error);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleDeactivate = async (id: number) => {
    try {
      await database.deactivateHabitTodo(id);
      await loadHabitTodos();
      onHabitTodosChanged();
    } catch (error) {
      console.error('Error deactivating habit todo:', error);
      alert('習慣Todoの非アクティブ化に失敗しました: ' + error.message);
    }
  };

  const handleDelete = (id: number, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: '習慣Todoを削除',
      message: `習慣Todo「${title}」を完全に削除しますか？\n\nこの操作により以下が削除されます：\n• 習慣Todo設定\n• この習慣Todoから生成されたすべての日次Todo\n• 履歴データ\n\nこの操作は元に戻せません。`,
      onConfirm: async () => {
        try {
          const result = await database.deleteHabitTodo(id);
          console.log(`習慣Todo削除完了: 習慣Todo ${result.deletedHabitTodos}個、関連Todo ${result.deletedRelatedTodos}個を削除`);
          
          // 状態をクリアしてから再ロード
          setCompletions(new Map());
          setEditingId(null);
          setEditingTitle('');
          
          await loadHabitTodos();
          await loadTodaysCompletions();
          onHabitTodosChanged();
          
          console.log(`削除完了：習慣Todo「${title}」と関連する${result.deletedRelatedTodos}個の日次Todoを削除しました。`);
        } catch (error) {
          console.error('Error deleting habit todo:', error);
          alert('習慣Todoの削除に失敗しました: ' + error.message);
        }
      }
    });
  };

  const handleToggleCompletion = async (habitTodoId: number) => {
    try {
      const todayString = logDateDebug('handleToggleCompletion');
      console.log('Toggling completion for habit_todo_id:', habitTodoId);
      
      const result = await database.toggleHabitTodoCompletion(habitTodoId, segmentId, todayString);
      console.log('Toggle result:', result);
      
      // Update local state
      setCompletions(prev => {
        const newMap = new Map(prev);
        newMap.set(habitTodoId, result.completed);
        return newMap;
      });
      
      // 習慣todoの完了状況が変更されたことを親コンポーネントに通知（履歴更新のため）
      onHabitTodosChanged();
    } catch (error) {
      console.error('Error toggling habit todo completion:', error);
      alert('完了状況の更新に失敗しました: ' + error.message);
    }
  };


  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-apple-gray-600 mb-1">🔄 習慣Todo</h3>
        <button
          onClick={() => setHistoryModalOpen(true)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors"
        >
          📚 履歴を見る
        </button>
      </div>
      <p className="text-xs text-apple-gray-500 mb-3">
        毎日実行する習慣的なタスクを設定します。チェックボックスで今日の完了状況を記録できます。
      </p>
      
      {/* 新規作成フォーム */}
      <div className="flex gap-2 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <input
          ref={newHabitInputRef}
          type="text"
          value={newHabitTodo}
          onChange={(e) => setNewHabitTodo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newHabitTodo.trim()) {
              e.preventDefault();
              handleAddHabitTodo();
            }
          }}
          placeholder="例：英単語30分学習、読書20分"
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />
        <button
          onClick={handleAddHabitTodo}
          className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* 習慣Todo一覧 */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {habitTodos.map((habitTodo) => {
          const isCompleted = completions.get(habitTodo.id) || false;
          
          return (
            <div key={habitTodo.id} className="flex items-center gap-3 p-3 border rounded-lg group bg-amber-50 hover:bg-amber-100 transition-colors border-amber-200">
              {/* Today's completion checkbox */}
              <button
                onClick={() => handleToggleCompletion(habitTodo.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isCompleted ? 'bg-green-600 border-green-600' : 'border-amber-400 hover:border-amber-500'
                }`}
                title="今日の完了状況"
              >
                {isCompleted && <Check size={14} color="white" />}
              </button>
              
              <div className="flex-1 min-w-0">
                {editingId === habitTodo.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEditSave();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          handleEditCancel();
                        }
                      }}
                      className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                      autoFocus
                    />
                    <button
                      onClick={handleEditSave}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <p className={`font-medium ${isCompleted ? 'text-green-700' : 'text-gray-800'}`}>
                    {habitTodo.title}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingId !== habitTodo.id && (
                  <>
                    <button
                      onClick={() => handleEditStart(habitTodo)}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-all"
                      title="編集"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeactivate(habitTodo.id)}
                      className="px-2 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded transition-all border border-orange-300"
                      title="この習慣Todoを非アクティブ化"
                    >
                      <Pause size={10} className="inline mr-1" />
                      非アクティブ
                    </button>
                    <button
                      onClick={() => handleDelete(habitTodo.id, habitTodo.title)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                      title="完全に削除（履歴含む）"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        
        {habitTodos.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">習慣Todoがありません</p>
            <p className="text-xs mt-1">毎日実行したいタスクを追加してください</p>
          </div>
        )}
      </div>

      
      <HabitHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        segmentId={segmentId}
        onHabitTodosChanged={loadHabitTodos}
      />
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />
    </div>
  );
});

HabitTodoSection.displayName = 'HabitTodoSection';

export default HabitTodoSection;