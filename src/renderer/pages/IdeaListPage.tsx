import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Lightbulb, Trash2, Edit3, Save, X } from 'lucide-react';
import { database, IdeaListItem } from '../utils/database';
import { format } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';
import IdeaDetailModal from '../components/IdeaDetailModal';

const IdeaListPage: React.FC = () => {
  const [ideaItems, setIdeaItems] = useState<IdeaListItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<IdeaListItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadIdeaItems();
  }, []);

  const loadIdeaItems = async () => {
    try {
      const items = await database.getIdeaListItems();
      setIdeaItems(items);
    } catch (error) {
      console.error('Failed to load idea items:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;
    
    try {
      await database.createIdeaListItem(newItemTitle.trim());
      setNewItemTitle('');
      setIsAddingItem(false);
      await loadIdeaItems();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('アイディアの追加に失敗しました');
    }
  };

  const handleDeleteItem = (id: number, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'アイディアを削除',
      message: `「${title}」を削除しますか？\nこの操作は元に戻せません。`,
      onConfirm: async () => {
        try {
          await database.deleteIdeaListItem(id);
          await loadIdeaItems();
        } catch (error) {
          console.error('Failed to delete item:', error);
          alert('アイディアの削除に失敗しました');
        }
      }
    });
  };

  const handleItemClick = (item: IdeaListItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleSaveItem = async (id: number, title: string, description?: string, referenceMaterials?: string) => {
    try {
      await database.updateIdeaListItem(id, title, description, referenceMaterials);
      await loadIdeaItems();
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('アイディアの保存に失敗しました');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    } else if (e.key === 'Escape') {
      setIsAddingItem(false);
      setNewItemTitle('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-apple-gray-500 hover:text-apple-gray-700 transition-colors">
            <ArrowLeft size={20} />
            メインページに戻る
          </Link>
          <div className="flex items-center gap-3">
            <Lightbulb size={24} className="text-yellow-500" />
            <h1 className="text-2xl font-light">Idea List</h1>
          </div>
        </div>
        
        <button
          onClick={() => {
            setIsAddingItem(true);
            setTimeout(() => titleInputRef.current?.focus(), 100);
          }}
          className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors"
        >
          <Plus size={16} />
          新しいアイディアを追加
        </button>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        {/* 新規アイディア追加フォーム */}
        {isAddingItem && (
          <div className="mb-6 p-4 bg-apple-gray-50 rounded-lg">
            <div className="flex gap-2">
              <input
                ref={titleInputRef}
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="アイディアのタイトルを入力..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddItem}
                disabled={!newItemTitle.trim()}
                className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                追加
              </button>
              <button
                onClick={() => {
                  setIsAddingItem(false);
                  setNewItemTitle('');
                }}
                className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-500 rounded-lg hover:bg-apple-gray-50 transition-colors"
              >
                <X size={16} />
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* アイディアアイテム一覧 */}
        <div className="space-y-3">
          {ideaItems.map((item) => (
            <div
              key={item.id}
              className="group p-4 border rounded-lg cursor-pointer hover:bg-apple-gray-50 transition-colors"
              onClick={() => handleItemClick(item)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-apple-gray-900 mb-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-apple-gray-600 line-clamp-2">
                      {item.description.substring(0, 100)}
                      {item.description.length > 100 && '...'}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-apple-gray-500">
                    <span>{format(new Date(item.created_at), 'yyyy/MM/dd')}</span>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id, item.title);
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 空の状態 */}
        {ideaItems.length === 0 && !isAddingItem && (
          <div className="text-center py-12 text-apple-gray-500">
            <Lightbulb size={48} className="mx-auto mb-4 text-apple-gray-300" />
            <p className="text-lg mb-2">まだアイディアがありません</p>
            <p className="text-sm">新しいアイディアを追加して、素晴らしいアイディアを記録しましょう</p>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedItem && (
        <IdeaDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onSave={handleSaveItem}
          onDelete={handleDeleteItem}
        />
      )}

      {/* 確認モーダル */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
};

export default IdeaListPage;