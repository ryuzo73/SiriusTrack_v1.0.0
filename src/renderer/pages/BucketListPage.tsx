import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Star, Check, Trash2, Edit3, Save, X } from 'lucide-react';
import { database, BucketListItem } from '../utils/database';
import { format } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';

const BucketListPage: React.FC = () => {
  const [bucketListItems, setBucketListItems] = useState<BucketListItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: number; title: string; description: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBucketListItems();
  }, []);

  const loadBucketListItems = async () => {
    try {
      const items = await database.getBucketListItems();
      setBucketListItems(items);
    } catch (error) {
      console.error('Failed to load bucket list items:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;
    
    try {
      await database.createBucketListItem(newItemTitle, newItemDescription);
      setNewItemTitle('');
      setNewItemDescription('');
      setIsAddingItem(false);
      await loadBucketListItems();
    } catch (error) {
      console.error('Failed to add bucket list item:', error);
      alert('アイテムの追加に失敗しました');
    }
  };

  const handleToggleItem = async (id: number) => {
    try {
      await database.toggleBucketListItem(id);
      await loadBucketListItems();
    } catch (error) {
      console.error('Failed to toggle bucket list item:', error);
      alert('アイテムの状態変更に失敗しました');
    }
  };

  const handleDeleteItem = (id: number, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'アイテムを削除',
      message: `「${title}」を削除しますか？\nこの操作は元に戻せません。`,
      onConfirm: async () => {
        try {
          await database.deleteBucketListItem(id);
          await loadBucketListItems();
        } catch (error) {
          console.error('Failed to delete bucket list item:', error);
          alert('アイテムの削除に失敗しました');
        }
      }
    });
  };

  const handleStartEdit = (item: BucketListItem) => {
    setEditingItem({
      id: item.id,
      title: item.title,
      description: item.description
    });
    // Focus on the input after state update
    setTimeout(() => {
      editTitleInputRef.current?.focus();
    }, 0);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.title.trim()) return;
    
    try {
      await database.updateBucketListItem(editingItem.id, editingItem.title, editingItem.description);
      setEditingItem(null);
      await loadBucketListItems();
    } catch (error) {
      console.error('Failed to update bucket list item:', error);
      alert('アイテムの更新に失敗しました');
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
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
            <Star size={24} className="text-yellow-500" />
            <h1 className="text-2xl font-light">Bucket List</h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-apple-gray-500">
            人生で達成したいこと
          </span>
        </div>


        {/* 新規作成フォーム */}
        <div className="mb-6">
          {!isAddingItem ? (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setIsAddingItem(true);
                  setTimeout(() => titleInputRef.current?.focus(), 0);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors"
              >
                <Plus size={16} />
                新しい目標を追加
              </button>
            </div>
          ) : (
            <div className="p-4 bg-apple-gray-50 rounded-lg">
              <div className="space-y-3">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="例：世界一周旅行をする"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newItemTitle.trim()) {
                      handleAddItem();
                    } else if (e.key === 'Escape') {
                      setIsAddingItem(false);
                      setNewItemTitle('');
                      setNewItemDescription('');
                    }
                  }}
                />
                <textarea
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="詳細説明（オプション）"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={8}
                />
                <div className="flex gap-2">
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
                      setNewItemDescription('');
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-500 rounded-lg hover:bg-apple-gray-50 transition-colors"
                  >
                    <X size={16} />
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 全てのアイテム */}
        {bucketListItems.length > 0 && (
          <div className="mb-8">
            <div className="space-y-3">
              {bucketListItems.map((item, index) => (
                <div key={item.id} className="flex items-start gap-3 p-4 border rounded-lg group hover:bg-apple-gray-50 transition-colors">
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center mt-1 transition-colors ${
                      item.completed
                        ? 'border-green-500 bg-green-500 hover:border-green-600'
                        : 'border-apple-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {item.completed ? (
                      <Check size={14} className="text-white" />
                    ) : (
                      <span className="text-xs font-medium text-apple-gray-600">{index + 1}</span>
                    )}
                  </button>
                  
                  <div className="flex-1">
                    {editingItem?.id === item.id ? (
                      <div className="space-y-2">
                        <input
                          ref={editTitleInputRef}
                          type="text"
                          value={editingItem.title}
                          onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                        />
                        <textarea
                          value={editingItem.description}
                          onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={8}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex items-center gap-1 px-3 py-1 border border-apple-gray-300 text-apple-gray-700 rounded text-sm hover:bg-apple-gray-50 transition-colors"
                          >
                            <Save size={14} />
                            保存
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1 px-3 py-1 border border-apple-gray-300 text-apple-gray-500 rounded text-sm hover:bg-apple-gray-50 transition-colors"
                          >
                            <X size={14} />
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className={`font-medium text-apple-gray-800 ${item.completed ? 'line-through' : ''}`}>{item.title}</h3>
                        {item.description && (
                          <p className={`text-sm text-apple-gray-600 mt-1 ${item.completed ? 'line-through' : ''}`}>{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-apple-gray-500">
                          <span>作成日: {format(new Date(item.created_at), 'yyyy/MM/dd HH:mm')}</span>
                          {item.completed && item.completed_at && (
                            <span className="text-green-600">
                              達成日: {format(new Date(item.completed_at), 'yyyy/MM/dd HH:mm')}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {editingItem?.id !== item.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1 text-apple-gray-500 hover:bg-apple-gray-100 rounded transition-colors"
                        title="編集"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="削除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


        {/* 空の状態 */}
        {bucketListItems.length === 0 && (
          <div className="text-center py-12 text-apple-gray-500">
            <Star size={48} className="mx-auto mb-4 text-apple-gray-300" />
            <p className="text-lg mb-2">まだ目標が登録されていません</p>
            <p className="text-sm">「新しい目標を追加」ボタンから、人生で達成したいことを記録してみましょう</p>
          </div>
        )}
      </div>

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

export default BucketListPage;