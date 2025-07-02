import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, CheckCircle, Clock, Target } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, groupBy } from 'date-fns';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  achievement_level: 'pending' | 'achieved' | 'partial' | 'not_achieved';
  date: string;
  type: 'daily' | 'weekly';
  display_order: number;
  completed_at: string | null;
  created_at: string;
}

interface TodoHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTodos: Todo[];
  segmentId: number;
}

const TodoHistoryModal: React.FC<TodoHistoryModalProps> = ({
  isOpen,
  onClose,
  allTodos,
  segmentId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'daily' | 'weekly'>('all');
  const [dateRange, setDateRange] = useState<'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom'>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [groupedTodos, setGroupedTodos] = useState<{[key: string]: Todo[]}>({});

  useEffect(() => {
    if (!isOpen) return;

    console.log('TodoHistoryModal - allTodos received:', allTodos);
    let filtered = [...allTodos];

    // 日付範囲フィルタリング
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (dateRange) {
      case 'thisWeek':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1);
        startDate = startOfWeek(lastWeek, { weekStartsOn: 1 });
        endDate = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = parseISO(customStartDate);
          endDate = parseISO(customEndDate);
        } else {
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
        }
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    filtered = filtered.filter(todo => {
      const todoDate = parseISO(todo.date);
      return todoDate >= startDate && todoDate <= endDate;
    });

    // タイプフィルタリング
    if (filterType !== 'all') {
      filtered = filtered.filter(todo => todo.type === filterType);
    }

    // 検索
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(todo => 
        todo.title.toLowerCase().includes(term)
      );
    }

    setFilteredTodos(filtered);

    // 日付でグループ化
    const grouped = filtered.reduce((acc, todo) => {
      const dateKey = todo.date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(todo);
      return acc;
    }, {} as {[key: string]: Todo[]});

    // 各日付のTodoを完了状況でソート（完了済み → 未完了の順）
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return a.display_order - b.display_order;
      });
    });

    setGroupedTodos(grouped);
  }, [allTodos, searchTerm, filterType, dateRange, customStartDate, customEndDate, isOpen]);

  const getAchievementIcon = (todo: Todo) => {
    if (!todo.completed) {
      return <Clock size={16} className="text-gray-400" />;
    }

    switch (todo.achievement_level) {
      case 'achieved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'partial':
        return <CheckCircle size={16} className="text-yellow-600" />;
      case 'not_achieved':
        return <X size={16} className="text-red-600" />;
      default:
        return <CheckCircle size={16} className="text-gray-600" />;
    }
  };

  const getAchievementText = (todo: Todo) => {
    if (!todo.completed) {
      return { text: '未完了', color: 'bg-gray-100 text-gray-600' };
    }

    switch (todo.achievement_level) {
      case 'achieved':
        return { text: '達成', color: 'bg-green-100 text-green-800' };
      case 'partial':
        return { text: '部分達成', color: 'bg-yellow-100 text-yellow-800' };
      case 'not_achieved':
        return { text: '未達成', color: 'bg-red-100 text-red-800' };
      default:
        return { text: '完了', color: 'bg-blue-100 text-blue-800' };
    }
  };

  const getDateLabel = () => {
    switch (dateRange) {
      case 'thisWeek': return '今週';
      case 'lastWeek': return '先週';
      case 'thisMonth': return '今月';
      case 'lastMonth': return '先月';
      case 'custom': return 'カスタム期間';
      default: return '';
    }
  };

  if (!isOpen) return null;

  const sortedDates = Object.keys(groupedTodos).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Target size={28} className="text-green-600" />
                Todoの履歴 - {getDateLabel()}
              </h2>
              <p className="text-gray-600 mt-1">
                日付ごとのタスク実行履歴を確認
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* フィルター */}
          <div className="flex flex-wrap gap-4">
            {/* 検索 */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Todoを検索..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* タイプフィルター */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべてのタイプ</option>
              <option value="daily">日次</option>
              <option value="weekly">週次</option>
            </select>

            {/* 期間フィルター */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="thisWeek">今週</option>
              <option value="lastWeek">先週</option>
              <option value="thisMonth">今月</option>
              <option value="lastMonth">先月</option>
              <option value="custom">カスタム期間</option>
            </select>

            {dateRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {sortedDates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
              <p>該当するTodoが見つかりませんでした</p>
              <p className="text-sm mt-2">期間やフィルターを変更してみてください</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => {
                const todos = groupedTodos[date];
                const completedCount = todos.filter(t => t.completed).length;
                const totalCount = todos.length;
                const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                return (
                  <div key={date} className="bg-white border rounded-lg overflow-hidden">
                    {/* 日付ヘッダー */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                          <Calendar size={20} className="text-blue-600" />
                          {format(parseISO(date), 'yyyy年MM月dd日 (E)', { locale: { localize: { day: (n) => ['日', '月', '火', '水', '木', '金', '土'][n] } } })}
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">
                            完了率: {completionRate}% ({completedCount}/{totalCount})
                          </span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Todo一覧 */}
                    <div className="p-4">
                      <div className="space-y-3">
                        {todos.map((todo) => {
                          const achievementInfo = getAchievementText(todo);
                          return (
                            <div
                              key={todo.id}
                              className={`flex items-center gap-4 p-3 border rounded-lg transition-all ${
                                todo.completed ? 'bg-gray-50' : 'bg-white hover:shadow-sm'
                              }`}
                            >
                              {/* アイコン */}
                              <div className="flex-shrink-0">
                                {getAchievementIcon(todo)}
                              </div>

                              {/* コンテンツ */}
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-medium ${
                                  todo.completed ? 'text-gray-600' : 'text-gray-900'
                                }`}>
                                  {todo.title}
                                </h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  <span className={`px-2 py-1 rounded-full ${
                                    todo.type === 'daily' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {todo.type === 'daily' ? '日次' : '週次'}
                                  </span>
                                  {todo.completed_at && (
                                    <span>
                                      完了: {format(new Date(todo.completed_at), 'HH:mm')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* ステータス */}
                              <div className="flex-shrink-0">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${achievementInfo.color}`}>
                                  {achievementInfo.text}
                                </span>
                              </div>
                            </div>
                          );
                        })}
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
            総Todo数: {filteredTodos.length} | 
            完了数: {filteredTodos.filter(t => t.completed).length} | 
            完了率: {filteredTodos.length > 0 ? Math.round((filteredTodos.filter(t => t.completed).length / filteredTodos.length) * 100) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default TodoHistoryModal;