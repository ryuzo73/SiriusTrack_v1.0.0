import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Calendar, CheckCircle, Clock, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

interface DiscussionItem {
  id: number;
  content: string;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
  memo?: string;
}

interface DiscussionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  discussionItems: DiscussionItem[];
  onItemClick: (item: DiscussionItem) => void;
}

const DiscussionHistoryModal: React.FC<DiscussionHistoryModalProps> = ({
  isOpen,
  onClose,
  discussionItems,
  onItemClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'resolved' | 'unresolved'>('all');
  const [sortBy, setSortBy] = useState<'created_desc' | 'created_asc' | 'resolved_desc'>('created_desc');
  const [filteredItems, setFilteredItems] = useState<DiscussionItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let filtered = [...discussionItems];

    // フィルタリング
    if (filterStatus === 'resolved') {
      filtered = filtered.filter(item => item.resolved);
    } else if (filterStatus === 'unresolved') {
      filtered = filtered.filter(item => !item.resolved);
    }

    // 検索
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.content.toLowerCase().includes(term) ||
        (item.memo && item.memo.toLowerCase().includes(term))
      );
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'resolved_desc':
          if (a.resolved && b.resolved && a.resolved_at && b.resolved_at) {
            return new Date(b.resolved_at).getTime() - new Date(a.resolved_at).getTime();
          }
          return a.resolved === b.resolved ? 0 : a.resolved ? -1 : 1;
        default: // created_desc
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredItems(filtered);
  }, [discussionItems, searchTerm, filterStatus, sortBy, isOpen]);

  const handleItemClick = (item: DiscussionItem) => {
    onClose(); // 履歴モーダルを閉じる
    onItemClick(item); // 詳細モーダルを開く
  };

  if (!isOpen) return null;

  const resolvedCount = discussionItems.filter(item => item.resolved).length;
  const totalCount = discussionItems.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <BookOpen size={28} className="text-blue-600" />
                議論事項・わからないことの履歴
              </h2>
              <p className="text-gray-600 mt-1">
                解決済み: {resolvedCount} / 全体: {totalCount}
              </p>
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
                  placeholder="議論事項や解決方法を検索..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* ステータスフィルター */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="resolved">解決済み</option>
                <option value="unresolved">未解決</option>
              </select>
            </div>

            {/* ソート */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_desc">作成日新しい順</option>
                <option value="created_asc">作成日古い順</option>
                <option value="resolved_desc">解決日新しい順</option>
              </select>
            </div>
          </div>
        </div>

        {/* 一覧 */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
              <p>該当する議論事項が見つかりませんでした</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    {/* ステータスアイコン */}
                    <div className="mt-1">
                      {item.resolved ? (
                        <CheckCircle size={20} className="text-green-600" />
                      ) : (
                        <Clock size={20} className="text-orange-500" />
                      )}
                    </div>

                    {/* コンテンツ */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium mb-2 group-hover:text-blue-600 transition-colors ${
                        item.resolved ? 'text-gray-700' : 'text-gray-900'
                      }`}>
                        {item.content}
                      </h3>

                      {/* メモプレビュー */}
                      {item.memo && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-3">
                          <p className="text-sm text-blue-800 line-clamp-2">
                            {item.memo}
                          </p>
                        </div>
                      )}

                      {/* 日付情報 */}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          作成: {format(new Date(item.created_at), 'yyyy/MM/dd HH:mm')}
                        </span>
                        {item.resolved && item.resolved_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={12} />
                            解決: {format(new Date(item.resolved_at), 'yyyy/MM/dd HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 矢印 */}
                    <div className="text-gray-400 group-hover:text-blue-600 transition-colors">
                      →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            クリックして詳細を確認・編集できます
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiscussionHistoryModal;