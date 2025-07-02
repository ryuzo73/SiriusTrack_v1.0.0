import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Calendar, Target, CheckCircle, Clock, AlertTriangle, Trophy } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays, isPast, isToday, startOfDay } from 'date-fns';

interface Milestone {
  id: number;
  title: string;
  target_date: string;
  status: 'pending' | 'completed';
  achievement_level: 'pending' | 'achieved' | 'partial' | 'not_achieved';
  display_order: number;
  completed_at: string | null;
  created_at: string;
}

interface MilestoneHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestones: Milestone[];
}

const MilestoneHistoryModal: React.FC<MilestoneHistoryModalProps> = ({
  isOpen,
  onClose,
  milestones
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'overdue' | 'today'>('all');
  const [sortBy, setSortBy] = useState<'target_desc' | 'target_asc' | 'created_desc' | 'completed_desc'>('target_desc');
  const [filteredMilestones, setFilteredMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let filtered = [...milestones];

    // フィルタリング
    const now = new Date();
    switch (filterStatus) {
      case 'completed':
        filtered = filtered.filter(m => m.status === 'completed');
        break;
      case 'pending':
        filtered = filtered.filter(m => m.status === 'pending');
        break;
      case 'overdue':
        filtered = filtered.filter(m => {
          const targetDate = startOfDay(parseISO(m.target_date));
          const today = startOfDay(new Date());
          return m.status === 'pending' && differenceInCalendarDays(targetDate, today) < 0;
        });
        break;
      case 'today':
        filtered = filtered.filter(m => {
          const targetDate = startOfDay(parseISO(m.target_date));
          const today = startOfDay(new Date());
          return differenceInCalendarDays(targetDate, today) === 0;
        });
        break;
    }

    // 検索
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(term)
      );
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'target_asc':
          return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'completed_desc':
          if (a.completed_at && b.completed_at) {
            return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
          }
          return a.completed_at ? -1 : b.completed_at ? 1 : 0;
        default: // target_desc
          return new Date(b.target_date).getTime() - new Date(a.target_date).getTime();
      }
    });

    setFilteredMilestones(filtered);
  }, [milestones, searchTerm, filterStatus, sortBy, isOpen]);

  const getStatusIcon = (milestone: Milestone) => {
    if (milestone.status === 'completed') {
      switch (milestone.achievement_level) {
        case 'achieved':
          return <CheckCircle size={20} className="text-green-600" />;
        case 'partial':
          return <CheckCircle size={20} className="text-yellow-600" />;
        case 'not_achieved':
          return <X size={20} className="text-red-600" />;
        default:
          return <CheckCircle size={20} className="text-gray-600" />;
      }
    }

    const targetDate = startOfDay(parseISO(milestone.target_date));
    const today = startOfDay(new Date());
    const daysRemaining = differenceInCalendarDays(targetDate, today);
    
    if (daysRemaining === 0) {
      return <AlertTriangle size={20} className="text-orange-600" />;
    }
    if (daysRemaining < 0) {
      return <AlertTriangle size={20} className="text-red-600" />;
    }
    return <Clock size={20} className="text-blue-600" />;
  };

  const getStatusText = (milestone: Milestone) => {
    if (milestone.status === 'completed') {
      switch (milestone.achievement_level) {
        case 'achieved':
          return { text: '達成', color: 'bg-green-100 text-green-800' };
        case 'partial':
          return { text: '部分達成', color: 'bg-yellow-100 text-yellow-800' };
        case 'not_achieved':
          return { text: '未達成', color: 'bg-red-100 text-red-800' };
        default:
          return { text: '完了', color: 'bg-gray-100 text-gray-800' };
      }
    }

    const targetDate = startOfDay(parseISO(milestone.target_date));
    const today = startOfDay(new Date());
    const daysRemaining = differenceInCalendarDays(targetDate, today);
    
    if (daysRemaining === 0) {
      return { text: '今日まで', color: 'bg-orange-100 text-orange-800' };
    }
    if (daysRemaining < 0) {
      return { text: `${Math.abs(daysRemaining)}日超過`, color: 'bg-red-100 text-red-800' };
    }
    return { text: `あと${daysRemaining}日`, color: 'bg-blue-100 text-blue-800' };
  };

  if (!isOpen) return null;

  const totalCount = milestones.length;
  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const achievedCount = milestones.filter(m => m.achievement_level === 'achieved').length;
  const overdueCount = milestones.filter(m => {
    const targetDate = startOfDay(parseISO(m.target_date));
    const today = startOfDay(new Date());
    return m.status === 'pending' && differenceInCalendarDays(targetDate, today) < 0;
  }).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Trophy size={28} className="text-purple-600" />
                マイルストーンの履歴
              </h2>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span>全体: {totalCount}</span>
                <span>完了: {completedCount}</span>
                <span>達成: {achievedCount}</span>
                {overdueCount > 0 && <span className="text-red-600">期限超過: {overdueCount}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* 検索・フィルター */}
          <div className="flex flex-wrap gap-4">
            {/* 検索 */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="マイルストーンを検索..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* ステータスフィルター */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">すべて</option>
                <option value="completed">完了済み</option>
                <option value="pending">進行中</option>
                <option value="overdue">期限超過</option>
                <option value="today">今日期限</option>
              </select>
            </div>

            {/* ソート */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="target_desc">期限日新しい順</option>
                <option value="target_asc">期限日古い順</option>
                <option value="created_desc">作成日新しい順</option>
                <option value="completed_desc">完了日新しい順</option>
              </select>
            </div>
          </div>
        </div>

        {/* 一覧 */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {filteredMilestones.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Target size={48} className="mx-auto mb-4 text-gray-300" />
              <p>該当するマイルストーンが見つかりませんでした</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMilestones.map((milestone) => {
                const statusInfo = getStatusText(milestone);
                return (
                  <div
                    key={milestone.id}
                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* ステータスアイコン */}
                      <div className="mt-1">
                        {getStatusIcon(milestone)}
                      </div>

                      {/* コンテンツ */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium mb-2 ${
                          milestone.status === 'completed' ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {milestone.title}
                        </h3>

                        {/* 日付情報 */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Target size={12} />
                            期限: {format(parseISO(milestone.target_date), 'yyyy/MM/dd')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            作成: {format(new Date(milestone.created_at), 'yyyy/MM/dd')}
                          </span>
                          {milestone.completed_at && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle size={12} />
                              完了: {format(new Date(milestone.completed_at), 'yyyy/MM/dd')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ステータスバッジ */}
                      <div className="flex-shrink-0">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
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
            達成率: {totalCount > 0 ? Math.round((achievedCount / totalCount) * 100) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default MilestoneHistoryModal;