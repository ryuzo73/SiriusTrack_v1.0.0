import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Target, Edit2, Trash2, Layers, RefreshCw, Star, Clock, Lightbulb } from 'lucide-react';
import { database, OverallPurpose, Segment, UnifiedCarryoverTask } from '../utils/database';
import ConfirmModal from '../components/ConfirmModal';
import EvaluationDashboard, { EvaluationDashboardHandle } from '../components/EvaluationDashboard';
import ResetConfirmModal from '../components/ResetConfirmModal';
import UnifiedCarryoverModal from '../components/UnifiedCarryoverModal';
import { useCarryover } from '../contexts/CarryoverContext';
import { format } from 'date-fns';

const MainPage: React.FC = () => {
  const [overallPurpose, setOverallPurpose] = useState<OverallPurpose | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isEditingPurpose, setIsEditingPurpose] = useState(false);
  const [purposeTitle, setPurposeTitle] = useState('');
  const [purposeDescription, setPurposeDescription] = useState('');
  const [purposeGoal, setPurposeGoal] = useState('');
  const [newSegmentName, setNewSegmentName] = useState('');
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [resetModal, setResetModal] = useState(false);
  const evaluationDashboardRef = useRef<EvaluationDashboardHandle>(null);
  const { hasCheckedCarryoverToday, updateLastCheckedDate } = useCarryover();
  const [carryoverModal, setCarryoverModal] = useState<{
    isOpen: boolean;
    incompleteTasks: UnifiedCarryoverTask[];
  }>({ isOpen: false, incompleteTasks: [] });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // 初期データロード後、引き継ぎチェックを実行
    if (segments.length > 0 && !hasCheckedCarryoverToday) {
      checkForIncompleteTasks();
    }
  }, [segments, hasCheckedCarryoverToday]);

  const loadData = async () => {
    const purpose = await database.getOverallPurpose();
    setOverallPurpose(purpose);
    if (purpose) {
      setPurposeTitle(purpose.title);
      setPurposeDescription(purpose.description);
      setPurposeGoal(purpose.goal || '');
    }
    
    const segs = await database.getSegments();
    setSegments(segs);
  };

  const checkForIncompleteTasks = async () => {
    try {
      const incompleteTasks = await database.getAllIncompleteTasksForCarryover();
      
      if (incompleteTasks.length > 0) {
        setCarryoverModal({
          isOpen: true,
          incompleteTasks
        });
      }
    } catch (error) {
      console.error('Failed to check for incomplete tasks:', error);
    }
  };

  const handleCarryoverConfirm = async (selectedTasks: UnifiedCarryoverTask[]) => {
    try {
      if (selectedTasks.length > 0) {
        console.log('Carrying over tasks:', selectedTasks);
        const result = await database.recordBulkCarryover(selectedTasks);
        console.log('Carryover result:', result);
      }
      updateLastCheckedDate();
      setCarryoverModal({ isOpen: false, incompleteTasks: [] });
    } catch (error) {
      console.error('Failed to carry over tasks:', error);
      alert(`タスクの引き継ぎに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCarryoverClose = () => {
    updateLastCheckedDate();
    setCarryoverModal({ isOpen: false, incompleteTasks: [] });
  };

  const handleSavePurpose = async () => {
    await database.setOverallPurpose(purposeTitle, purposeDescription, purposeGoal);
    await loadData();
    setIsEditingPurpose(false);
  };

  const handleAddSegment = async () => {
    if (newSegmentName.trim()) {
      await database.createSegment(newSegmentName, '');
      setNewSegmentName('');
      setIsAddingSegment(false);
      await loadData();
    }
  };

  const handleDeleteSegment = (segmentId: number, segmentName: string) => {
    setConfirmModal({
      isOpen: true,
      title: '領域を削除',
      message: `「${segmentName}」を削除しますか？\nこの操作により、関連するマイルストーン、Todo、議論事項もすべて削除されます。`,
      onConfirm: async () => {
        try {
          await database.deleteSegment(segmentId);
          await loadData();
        } catch (error) {
          console.error('Error deleting segment:', error);
          alert('学習分野の削除に失敗しました');
        }
      }
    });
  };

  const handleGlobalReset = async () => {
    try {
      console.log('Starting global reset...');
      const result = await database.resetAllEvaluations();
      console.log('Global reset result:', result);
      console.log('✅ すべての評価データをリセットしました');
      await loadData();
      // EvaluationDashboard（活動量ランキング）のリフレッシュ
      if (evaluationDashboardRef.current) {
        await evaluationDashboardRef.current.refreshEvaluationData();
      }
    } catch (error) {
      console.error('Error resetting all evaluations:', error);
      throw error;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">SiriusTrack</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setResetModal(true)}
            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
            title="すべての評価データをリセット"
          >
            <RefreshCw size={24} />
          </button>
          <Link to="/calendar" className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors" title="カレンダー">
            <Calendar size={24} />
          </Link>
          <Link to="/routine" className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors" title="Routine">
            <Clock size={24} />
          </Link>
          <Link to="/bucket-list" className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors" title="Bucket List">
            <Star size={24} />
          </Link>
          <Link to="/idea-list" className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors" title="Idea List">
            <Lightbulb size={24} />
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-medium flex items-center gap-2 mb-2">
              <Target size={20} />
              ゴール
            </h2>
            <p className="text-sm text-apple-gray-600">
              最終的な目的を設計し、その目的を達成するための目標の設定を行います。
            </p>
          </div>
          <button
            onClick={() => setIsEditingPurpose(!isEditingPurpose)}
            className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
          >
            <Edit2 size={16} />
          </button>
        </div>

        {isEditingPurpose ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-apple-gray-600 mb-1">目的</label>
              <input
                type="text"
                value={purposeTitle}
                onChange={(e) => setPurposeTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && purposeTitle.trim()) {
                    e.preventDefault();
                    handleSavePurpose();
                  }
                }}
                placeholder="例：世界に平和を取り戻す"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-apple-gray-600 mb-1">目標</label>
              <textarea
                value={purposeGoal}
                onChange={(e) => setPurposeGoal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && purposeTitle.trim()) {
                    e.preventDefault();
                    handleSavePurpose();
                  }
                }}
                placeholder="例：年内に魔王を倒す"
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-apple-gray-600 mb-1">詳細説明</label>
              <textarea
                value={purposeDescription}
                onChange={(e) => setPurposeDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && purposeTitle.trim()) {
                    e.preventDefault();
                    handleSavePurpose();
                  }
                }}
                placeholder="例：町が魔王におびえている状態を解決したい。まずは近くの森で体力を鍛え、次に神殿で勇者の剣を引き抜く必要がある"
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSavePurpose}
                className="px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setIsEditingPurpose(false)}
                className="px-4 py-2 border rounded-lg hover:bg-apple-gray-100 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div>
            {overallPurpose ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-1">目的</h3>
                  <p className="text-apple-gray-600">{overallPurpose.title}</p>
                </div>
                {overallPurpose.goal && (
                  <div>
                    <h4 className="text-sm font-medium text-apple-gray-600 mb-1">目標</h4>
                    <p className="text-apple-gray-500 text-sm whitespace-pre-wrap">{overallPurpose.goal}</p>
                  </div>
                )}
                {overallPurpose.description && (
                  <div>
                    <h4 className="text-sm font-medium text-apple-gray-600 mb-1">詳細説明</h4>
                    <p className="text-apple-gray-500 text-sm whitespace-pre-wrap">{overallPurpose.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-apple-gray-400">まずは全体の目的を設定しましょう（右上の編集ボタンをクリック）</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-medium flex items-center gap-2 mb-2">
              <Layers size={20} />
              領域
            </h2>
            <p className="text-sm text-apple-gray-600">
              具体的に取り組む学習分野、また取得を目指す資格名、業務の効率化を図るセクション名などを追加します。
            </p>
          </div>
          <button
            onClick={() => setIsAddingSegment(true)}
            className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors"
          >
            <Plus size={16} />
            新しい領域を追加
          </button>
        </div>

        {isAddingSegment && (
          <div className="mb-6 p-4 border rounded-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSegmentName.trim()) {
                    e.preventDefault();
                    handleAddSegment();
                  }
                }}
                placeholder="例：英語学習、Python習得、AI開発スキル"
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400"
                autoFocus
              />
              <button
                onClick={handleAddSegment}
                disabled={!newSegmentName.trim()}
                className="px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                追加
              </button>
              <button
                onClick={() => {
                  setIsAddingSegment(false);
                  setNewSegmentName('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-apple-gray-100 transition-colors"
              >
                キャンセル
              </button>
            </div>
            <p className="text-xs text-apple-gray-500 mt-2">
              目標は後で学習分野ページで設定できます
            </p>
          </div>
        )}

        {segments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-apple-gray-400 mb-4">まだ学習分野が登録されていません</p>
            <p className="text-sm text-apple-gray-400">上の「新しい学習分野を追加」ボタンから始めましょう</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="relative p-6 border rounded-xl hover:bg-apple-gray-50 hover:shadow-md transition-all group"
              >
                <Link
                  to={`/segment/${segment.id}`}
                  className="block"
                >
                  <h3 className="font-medium mb-2 group-hover:text-apple-gray-600">{segment.name}</h3>
                  {segment.overall_goal ? (
                    <p className="text-sm text-apple-gray-500 line-clamp-2">{segment.overall_goal}</p>
                  ) : (
                    <p className="text-sm text-apple-gray-400 italic">目標未設定</p>
                  )}
                  <p className="text-xs text-apple-gray-400 mt-4">クリックして詳細を見る →</p>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteSegment(segment.id, segment.name);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                  title="削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 学習分野比較評価 */}
      <div className="mt-8">
        <EvaluationDashboard ref={evaluationDashboardRef} />
      </div>
      
      <UnifiedCarryoverModal
        isOpen={carryoverModal.isOpen}
        onClose={handleCarryoverClose}
        onConfirm={handleCarryoverConfirm}
        incompleteTasks={carryoverModal.incompleteTasks}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      <ResetConfirmModal
        isOpen={resetModal}
        onClose={() => setResetModal(false)}
        onConfirm={handleGlobalReset}
        title="全体評価データリセット"
        message="すべての領域の評価データをリセットします。この操作により、すべての活動ポイント、評価計算結果に加えて、過去のタスクとマイルストーンのデータが完全に削除されます。"
        resetType="global"
      />
    </div>
  );
};

export default MainPage;