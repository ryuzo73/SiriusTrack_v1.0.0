import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Check, MessageSquare, Target, Calendar, AlertCircle, Edit2, Trash2, X } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subDays, differenceInDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { database, Segment, Milestone, Todo, DiscussionItem } from '../utils/database';
import DiscussionDetailModal from '../components/DiscussionDetailModal';
import ConfirmModal from '../components/ConfirmModal';
import CarryoverModal from '../components/CarryoverModal';
import AchievementButton from '../components/AchievementButton';
import EvaluationDashboard from '../components/EvaluationDashboard';

const SegmentPage: React.FC = () => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editedGoal, setEditedGoal] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const { segmentId } = useParams<{ segmentId: string }>();
  const [segment, setSegment] = useState<Segment | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [todayTodos, setTodayTodos] = useState<Todo[]>([]);
  const [weeklyTodos, setWeeklyTodos] = useState<Todo[]>([]);
  const [discussionItems, setDiscussionItems] = useState<DiscussionItem[]>([]);
  const [newMilestone, setNewMilestone] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [newDiscussion, setNewDiscussion] = useState('');
  const [todoType, setTodoType] = useState<'daily' | 'weekly'>('daily');
  const [selectedDiscussionItem, setSelectedDiscussionItem] = useState<DiscussionItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [carryoverModal, setCarryoverModal] = useState<{
    isOpen: boolean;
    incompleteTodos: Array<{ id: number; title: string }>;
  }>({ isOpen: false, incompleteTodos: [] });
  const [evaluationKey, setEvaluationKey] = useState(0);

  useEffect(() => {
    if (segmentId) {
      loadData();
    }
  }, [segmentId]);

  const loadData = async () => {
    try {
      console.log('Loading segment data for ID:', segmentId);
      const seg = await database.getSegment(Number(segmentId));
      console.log('Segment data:', seg);
      setSegment(seg);
      if (seg) {
        setEditedGoal(seg.overall_goal);
        setEditedName(seg.name);
      }

      const miles = await database.getMilestones(Number(segmentId));
      console.log('Milestones data:', miles);
      setMilestones(miles);

    const today = format(new Date(), 'yyyy-MM-dd');
    
    // 今日の日次Todoを取得
    const dailyTodos = await database.getTodos(Number(segmentId), today);
    
    // 過去7日間の未完了Todoをチェック（週末や休日のギャップに対応）
    const incompleteTodos: Todo[] = [];
    for (let i = 1; i <= 7; i++) {
      const checkDate = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayTodos = await database.getTodos(Number(segmentId), checkDate);
      const incompleteFromDay = dayTodos.filter(t => !t.completed && t.type === 'daily');
      
      // 重複を避けるため、同じタイトルのTodoは除外
      for (const todo of incompleteFromDay) {
        const isDuplicate = incompleteTodos.some(existing => 
          existing.title.toLowerCase().trim() === todo.title.toLowerCase().trim()
        );
        if (!isDuplicate) {
          incompleteTodos.push(todo);
        }
      }
      
      // 最大10件までに制限
      if (incompleteTodos.length >= 10) break;
    }
    
    if (incompleteTodos.length > 0) {
      setCarryoverModal({
        isOpen: true,
        incompleteTodos: incompleteTodos.map(t => ({ id: t.id, title: t.title }))
      });
      // 引き継ぎの判断前に一旦今日のTodoを表示
      setTodayTodos(dailyTodos.filter(t => t.type === 'daily'));
    } else {
      console.log('Daily todos (no carryover):', dailyTodos);
      setTodayTodos(dailyTodos.filter(t => t.type === 'daily'));
    }
    
    // 週次Todoを今週の範囲で取得
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // 月曜日開始
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    const weeklyTodos: Todo[] = [];
    const currentDate = new Date(weekStart);
    
    while (currentDate <= weekEnd) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayTodos = await database.getTodos(Number(segmentId), dateStr);
      const weeklyOnly = dayTodos.filter(t => t.type === 'weekly');
      weeklyTodos.push(...weeklyOnly);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 重複を除去（同じIDのものは1つだけ）
    const uniqueWeeklyTodos = weeklyTodos.filter((todo, index, self) => 
      index === self.findIndex(t => t.id === todo.id)
    );
    
    setWeeklyTodos(uniqueWeeklyTodos);

      const discussions = await database.getDiscussionItems(Number(segmentId));
      console.log('Discussion items:', discussions);
      setDiscussionItems(discussions);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleAddMilestone = async () => {
    if (newMilestone && newMilestoneDate) {
      await database.createMilestone(Number(segmentId), newMilestone, newMilestoneDate);
      setNewMilestone('');
      setNewMilestoneDate('');
      await loadData();
    }
  };

  const handleToggleMilestone = async (id: number, currentStatus: string) => {
    await database.updateMilestoneStatus(id, currentStatus === 'pending' ? 'completed' : 'pending');
    await loadData();
    await updateEvaluation();
  };

  const handleMilestoneAchievement = async (id: number, achievementLevel: string) => {
    console.log('handleMilestoneAchievement called:', { id, achievementLevel });
    try {
      await database.updateMilestoneAchievement(id, achievementLevel);
      await loadData();
      await updateEvaluation();
    } catch (error) {
      console.error('Error updating milestone achievement:', error);
    }
  };

  const handleAddTodo = async () => {
    if (newTodo) {
      const today = format(new Date(), 'yyyy-MM-dd');
      await database.createTodo(Number(segmentId), newTodo, today, todoType);
      setNewTodo('');
      await loadData();
    }
  };

  const handleToggleTodo = async (id: number) => {
    await database.toggleTodo(id);
    await loadData();
    await updateEvaluation();
  };

  const handleTodoAchievement = async (id: number, achievementLevel: string) => {
    console.log('handleTodoAchievement called:', { id, achievementLevel });
    try {
      await database.updateTodoAchievement(id, achievementLevel);
      await loadData();
      await updateEvaluation();
    } catch (error) {
      console.error('Error updating todo achievement:', error);
    }
  };

  const updateEvaluation = async () => {
    if (segmentId) {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      console.log('=== DEBUG updateEvaluation ===');
      console.log('Current time:', now);
      console.log('Formatted today:', today);
      console.log('Updating evaluation for segment:', segmentId, 'date:', today);
      const result = await database.calculateAndSaveEvaluation(Number(segmentId), today);
      console.log('Evaluation result from main process:', result);
      console.log('Evaluation updated successfully');
      // Force re-render of EvaluationDashboard
      setEvaluationKey(prev => prev + 1);
    }
  };

  const handleAddDiscussion = async () => {
    if (newDiscussion) {
      await database.createDiscussionItem(Number(segmentId), newDiscussion);
      setNewDiscussion('');
      await loadData();
    }
  };

  const handleToggleDiscussion = async (id: number) => {
    await database.toggleDiscussionItem(id);
    await loadData();
  };

  const handleSaveGoal = async () => {
    if (segment) {
      await database.updateSegment(segment.id, segment.name, editedGoal, segment.color);
      await loadData();
      setIsEditingGoal(false);
    }
  };

  const handleSaveName = async () => {
    if (segment && editedName.trim()) {
      await database.updateSegment(segment.id, editedName, segment.overall_goal, segment.color);
      await loadData();
      setIsEditingName(false);
    }
  };

  const handleDeleteMilestone = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'マイルストーンを削除',
      message: 'このマイルストーンを削除しますか？',
      onConfirm: async () => {
        try {
          await database.deleteMilestone(id);
          await loadData();
        } catch (error) {
          console.error('Error deleting milestone:', error);
          alert('マイルストーンの削除に失敗しました');
        }
      }
    });
  };

  const handleDeleteTodo = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Todoを削除',
      message: 'このTodoを削除しますか？',
      onConfirm: async () => {
        try {
          await database.deleteTodo(id);
          await loadData();
        } catch (error) {
          console.error('Error deleting todo:', error);
          alert('Todoの削除に失敗しました');
        }
      }
    });
  };

  const handleDeleteDiscussion = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: '議論事項を削除',
      message: 'この議論事項を削除しますか？',
      onConfirm: async () => {
        try {
          await database.deleteDiscussionItem(id);
          await loadData();
        } catch (error) {
          console.error('Error deleting discussion item:', error);
          alert('議論事項の削除に失敗しました');
        }
      }
    });
  };

  const handleDiscussionItemClick = (item: DiscussionItem) => {
    setSelectedDiscussionItem(item);
    setIsModalOpen(true);
  };

  const handleCarryoverConfirm = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    for (const todo of carryoverModal.incompleteTodos) {
      await window.electronAPI.database.query(
        'INSERT INTO todos (segment_id, title, date, type, completed) VALUES (?, ?, ?, ?, ?)',
        [Number(segmentId), todo.title, today, 'daily', false]
      );
    }
    
    setCarryoverModal({ isOpen: false, incompleteTodos: [] });
    
    // 引き継ぎ後、再度今日のTodoを取得
    const updatedDailyTodos = await database.getTodos(Number(segmentId), today);
    setTodayTodos(updatedDailyTodos.filter(t => t.type === 'daily'));
  };

  const handleCarryoverSkip = () => {
    setCarryoverModal({ isOpen: false, incompleteTodos: [] });
  };

  const handleSaveDiscussionMemo = async (id: number, memo: string, resolved: boolean) => {
    await database.saveDiscussionMemo(id, memo, resolved);
    await loadData();
  };

  const getRemainingDays = (targetDate: string) => {
    // differenceInCalendarDaysを使用して、時刻を無視した正確な日数差を計算
    const days = differenceInCalendarDays(
      parseISO(targetDate),
      new Date()
    );
    
    if (days < 0) {
      return `期限超過${Math.abs(days)}日`;
    } else if (days === 0) {
      return '今日まで';
    } else {
      return `残り${days}日`;
    }
  };

  if (!segment) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-apple-gray-500 hover:text-apple-gray-700 transition-colors">
          <ArrowLeft size={20} />
          メインページに戻る
        </Link>
        <Link 
          to={`/calendar?from=segment&segmentId=${segmentId}&segmentName=${encodeURIComponent(segment?.name || '')}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-apple-gray-100 hover:bg-apple-gray-200 rounded-lg transition-colors text-apple-gray-700"
        >
          <Calendar size={20} />
          カレンダーを見る
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {isEditingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editedName.trim()) {
                    e.preventDefault();
                    handleSaveName();
                  }
                  if (e.key === 'Escape') {
                    setIsEditingName(false);
                    setEditedName(segment?.name || '');
                  }
                }}
                className="text-3xl font-light bg-transparent border-b-2 border-apple-gray-300 focus:border-apple-gray-600 focus:outline-none px-2 py-1 flex-1"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="p-2 bg-apple-gray-700 text-white rounded-lg hover:bg-apple-gray-800 transition-colors"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false);
                  setEditedName(segment?.name || '');
                }}
                className="p-2 border rounded-lg hover:bg-apple-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-light flex-1">{segment.name}</h1>
              <button
                onClick={() => setIsEditingName(true)}
                className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
                title="タイトルを編集"
              >
                <Edit2 size={16} />
              </button>
            </>
          )}
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Target size={20} />
              {segment.name}の目標
            </h2>
            <button
              onClick={() => setIsEditingGoal(!isEditingGoal)}
              className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
            >
              <Edit2 size={16} />
            </button>
          </div>
          
          {isEditingGoal ? (
            <div className="space-y-4">
              <textarea
                value={editedGoal}
                onChange={(e) => setEditedGoal(e.target.value)}
                placeholder="いつまでにどうなっていたいか。"
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveGoal}
                  className="px-4 py-2 bg-apple-gray-700 text-white rounded-lg hover:bg-apple-gray-800 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsEditingGoal(false);
                    setEditedGoal(segment?.overall_goal || '');
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-apple-gray-100 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <p className="text-apple-gray-600">{segment.overall_goal}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Calendar size={20} />
              マイルストーン
            </h2>
            
            {/* 新規作成フォームを最上部に配置 */}
            <div className="flex gap-2 mb-6 p-4 bg-apple-gray-50 rounded-lg">
              <input
                type="text"
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMilestone && newMilestoneDate) {
                    e.preventDefault();
                    handleAddMilestone();
                  }
                }}
                placeholder="例：基礎文法の学習を完了する"
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400"
              />
              <input
                type="date"
                value={newMilestoneDate}
                onChange={(e) => setNewMilestoneDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMilestone && newMilestoneDate) {
                    e.preventDefault();
                    handleAddMilestone();
                  }
                }}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400"
              />
              <button
                onClick={handleAddMilestone}
                className="p-2 bg-apple-gray-700 text-white rounded-lg hover:bg-apple-gray-800 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            
            {/* 既存のマイルストーン一覧 */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {milestones.map((milestone) => {
                const remainingDays = getRemainingDays(milestone.target_date);
                const isOverdue = remainingDays.includes('期限超過');
                const isToday = remainingDays === '今日まで';
                
                return (
                  <div key={milestone.id} className="flex items-center gap-3 p-3 border rounded-lg group bg-white hover:bg-apple-gray-50 transition-colors">
                    <AchievementButton
                      currentLevel={milestone.achievement_level || 'pending'}
                      onLevelChange={(level) => handleMilestoneAchievement(milestone.id, level)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-apple-gray-600 mb-1">
                        {format(parseISO(milestone.target_date), 'yyyy年MM月dd日')}まで
                      </p>
                      <p className={`break-words ${milestone.status === 'completed' ? 'line-through text-apple-gray-400' : ''}`}>
                        {milestone.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        milestone.status === 'completed' 
                          ? 'bg-green-100 text-green-600' 
                          : isOverdue 
                            ? 'bg-red-100 text-red-600' 
                            : isToday 
                              ? 'bg-orange-100 text-orange-600' 
                              : 'bg-blue-100 text-blue-600'
                      }`}>
                        {milestone.status === 'completed' ? '完了' : remainingDays}
                      </span>
                      <button
                        onClick={() => handleDeleteMilestone(milestone.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                        title="削除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              議論事項・わからないこと
            </h2>
            
            {/* 新規作成フォームを最上部に配置 */}
            <div className="flex gap-2 mb-6 p-4 bg-apple-gray-50 rounded-lg">
              <input
                type="text"
                value={newDiscussion}
                onChange={(e) => setNewDiscussion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newDiscussion.trim()) {
                    e.preventDefault();
                    handleAddDiscussion();
                  }
                }}
                placeholder="例：効率的な学習方法がわからない"
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400"
              />
              <button
                onClick={handleAddDiscussion}
                className="p-2 bg-apple-gray-700 text-white rounded-lg hover:bg-apple-gray-800 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            
            {/* 既存の議論事項一覧 */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {discussionItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg group hover:bg-apple-gray-50 transition-colors bg-white">
                  <button
                    onClick={() => handleToggleDiscussion(item.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
                      Boolean(item.resolved) ? 'bg-green-600 border-green-600' : 'border-apple-gray-300'
                    }`}
                  >
                    {Boolean(item.resolved) && <Check size={14} color="white" />}
                  </button>
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleDiscussionItemClick(item)}
                  >
                    <p className={item.resolved ? 'line-through text-apple-gray-400' : ''}>
                      {item.content}
                    </p>
                    <p className="text-xs text-apple-gray-500 mt-1">
                      {format(new Date(item.created_at), 'yyyy/MM/dd HH:mm')}
                      {item.resolved && item.resolved_at && ` → 解決: ${format(new Date(item.resolved_at), 'yyyy/MM/dd HH:mm')}`}
                    </p>
                    <p className="text-xs text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      クリックして詳細・メモを見る
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteDiscussion(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all mt-0.5"
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="sticky top-0 bg-white z-10 p-6 pb-0 border-b">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <MessageSquare size={20} />
              今日のTodo
            </h2>
            
            {/* 新規作成フォームを最上部に配置 */}
            <div className="flex gap-2 mb-4 p-4 bg-apple-gray-50 rounded-lg">
              <select
                value={todoType}
                onChange={(e) => setTodoType(e.target.value as 'daily' | 'weekly')}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400"
              >
                <option value="daily">日次</option>
                <option value="weekly">週次</option>
              </select>
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTodo.trim()) {
                  e.preventDefault();
                  handleAddTodo();
                }
              }}
              placeholder="例：英単語10個暗記する"
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400"
            />
            <button
              onClick={handleAddTodo}
              className="p-2 bg-apple-gray-700 text-white rounded-lg hover:bg-apple-gray-800 transition-colors"
            >
              <Plus size={20} />
            </button>
            </div>
          </div>
          
          <div className="p-6 pt-4 max-h-[600px] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-apple-gray-600 mb-1">📅 週次タスク</h3>
              <p className="text-xs text-apple-gray-500 mb-2">
                {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'M/d')} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'M/d')} (今週)
              </p>
            <div className="mb-4 max-h-40 overflow-y-auto space-y-2">
              {weeklyTodos.map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 p-3 border rounded-lg group bg-white hover:bg-apple-gray-50 transition-colors">
                  <AchievementButton
                    currentLevel={todo.achievement_level || 'pending'}
                    onLevelChange={(level) => handleTodoAchievement(todo.id, level)}
                  />
                  <p className={`flex-1 ${todo.completed ? 'line-through text-apple-gray-400' : ''}`}>
                    {todo.title}
                  </p>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-apple-gray-600 mb-1">📝 日次タスク</h3>
            <p className="text-xs text-apple-gray-500 mb-2">
              {format(new Date(), 'M月d日')} (今日)
            </p>
            <div className="mb-4 max-h-40 overflow-y-auto space-y-2">
              {todayTodos.map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 p-3 border rounded-lg group bg-white hover:bg-apple-gray-50 transition-colors">
                  <AchievementButton
                    currentLevel={todo.achievement_level || 'pending'}
                    onLevelChange={(level) => handleTodoAchievement(todo.id, level)}
                  />
                  <p className={`flex-1 ${todo.completed ? 'line-through text-apple-gray-400' : ''}`}>
                    {todo.title}
                  </p>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* 評価ダッシュボード */}
      <div className="mt-8">
        <EvaluationDashboard key={evaluationKey} segmentId={Number(segmentId)} />
      </div>
      
      <DiscussionDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDiscussionItem(null);
        }}
        discussionItem={selectedDiscussionItem}
        onSave={handleSaveDiscussionMemo}
      />
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
      
      <CarryoverModal
        isOpen={carryoverModal.isOpen}
        onClose={handleCarryoverSkip}
        onConfirm={handleCarryoverConfirm}
        incompleteTodos={carryoverModal.incompleteTodos}
      />
    </div>
  );
};

export default SegmentPage;