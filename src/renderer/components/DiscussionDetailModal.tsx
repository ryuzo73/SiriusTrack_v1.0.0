import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { database } from '../utils/database';

interface DiscussionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  discussionItem: {
    id: number;
    content: string;
    resolved: boolean;
    created_at: string;
    resolved_at: string | null;
  } | null;
  onSave: (id: number, memo: string, resolved: boolean) => void;
}

const DiscussionDetailModal: React.FC<DiscussionDetailModalProps> = ({
  isOpen,
  onClose,
  discussionItem,
  onSave
}) => {
  const [memo, setMemo] = useState('');
  const [isResolved, setIsResolved] = useState(false);
  const [latestMemo, setLatestMemo] = useState('');

  useEffect(() => {
    if (discussionItem) {
      setIsResolved(discussionItem.resolved);
      loadLatestMemo();
    }
  }, [discussionItem]);

  const loadLatestMemo = async () => {
    if (discussionItem) {
      const memos = await database.getDiscussionMemos(discussionItem.id);
      if (memos.length > 0) {
        setMemo(memos[0].memo); // 最新のメモを表示
        setLatestMemo(memos[0].memo);
      } else {
        setMemo('');
        setLatestMemo('');
      }
    }
  };

  const handleSave = async () => {
    if (discussionItem && memo.trim()) {
      try {
        await onSave(discussionItem.id, memo, isResolved);
        setLatestMemo(memo); // 保存されたメモを記録
        // メモは消さずにそのまま残す
      } catch (error) {
        console.error('Failed to save memo:', error);
      }
    }
  };

  if (!isOpen || !discussionItem) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-medium">議論事項の詳細</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* 元の議論事項 */}
          <div className="p-4 bg-apple-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-apple-gray-600 mb-2">議論事項</h3>
            <p className="text-apple-gray-700">{discussionItem.content}</p>
            <p className="text-xs text-apple-gray-500 mt-2">
              作成日: {format(new Date(discussionItem.created_at), 'yyyy年MM月dd日 HH:mm')}
            </p>
            {discussionItem.resolved && discussionItem.resolved_at && (
              <p className="text-xs text-green-600 mt-1">
                解決日: {format(new Date(discussionItem.resolved_at), 'yyyy年MM月dd日 HH:mm')}
              </p>
            )}
          </div>

          {/* メモ記入欄 */}
          <div>
            <label className="block text-sm font-medium text-apple-gray-600 mb-2">
              解決されましたか？
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey && memo.trim()) {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="解決方法、参考情報、学んだことなどを記録してください...（Ctrl+Enterで保存）"
              rows={6}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-gray-400 resize-none"
            />
          </div>

          {/* 解決状況 */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isResolved}
                onChange={(e) => setIsResolved(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-apple-gray-300"
              />
              <span className="text-sm font-medium text-apple-gray-700">
                この議論事項は解決済みです
              </span>
            </label>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={!memo.trim() || memo === latestMemo}
              className="flex items-center gap-2 px-4 py-2 bg-apple-gray-700 text-white rounded-lg hover:bg-apple-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {!memo.trim() ? 'メモを入力してください' : memo === latestMemo ? '保存済み' : '保存'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-apple-gray-100 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscussionDetailModal;