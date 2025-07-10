import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Edit3, Lightbulb, Link } from 'lucide-react';
import { IdeaListItem } from '../utils/database';

interface IdeaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: IdeaListItem;
  onSave: (id: number, title: string, description?: string, referenceMaterials?: string) => void;
  onDelete: (id: number, title: string) => void;
}

const IdeaDetailModal: React.FC<IdeaDetailModalProps> = ({ isOpen, onClose, item, onSave, onDelete }) => {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [referenceMaterials, setReferenceMaterials] = useState(item.reference_materials || '');
  const [isEditing, setIsEditing] = useState(false);
  const [linkTooltip, setLinkTooltip] = useState<{ show: boolean; x: number; y: number; text: string } | null>(null);
  const referenceMaterialsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(item.title);
      setDescription(item.description || '');
      setReferenceMaterials(item.reference_materials || '');
      setIsEditing(false);
    }
  }, [isOpen, item]);

  const handleSave = () => {
    if (!title.trim()) return;
    
    onSave(
      item.id,
      title.trim(),
      description.trim() || undefined,
      referenceMaterials.trim() || undefined
    );
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(item.id, item.title);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isEditing) {
        setIsEditing(false);
        setTitle(item.title);
        setDescription(item.description || '');
        setReferenceMaterials(item.reference_materials || '');
      } else {
        onClose();
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!isEditing || !referenceMaterialsRef.current) return;
    
    const textarea = referenceMaterialsRef.current;
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    
    if (selectedText.trim() && isValidUrl(selectedText.trim())) {
      setLinkTooltip({
        show: true,
        x: e.clientX,
        y: e.clientY,
        text: selectedText.trim()
      });
    }
  };

  const isValidUrl = (text: string): boolean => {
    try {
      new URL(text);
      return true;
    } catch {
      return text.startsWith('http://') || text.startsWith('https://') || text.startsWith('www.');
    }
  };

  const handleLinkify = () => {
    if (!linkTooltip || !referenceMaterialsRef.current) return;
    
    const textarea = referenceMaterialsRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = linkTooltip.text;
    
    // Create markdown link format
    const linkText = `[${selectedText}](${selectedText})`;
    
    const newValue = 
      referenceMaterials.substring(0, start) +
      linkText +
      referenceMaterials.substring(end);
    
    setReferenceMaterials(newValue);
    setLinkTooltip(null);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (linkTooltip) {
      setLinkTooltip(null);
    }
  };

  useEffect(() => {
    if (linkTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [linkTooltip]);

  const renderLinksInText = (text: string) => {
    if (!text) return null;
    
    // Regex to match [text](url) format
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before link
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add clickable link
      const linkText = match[1];
      const linkUrl = match[2];
      parts.push(
        <button
          key={match.index}
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI?.shell?.openExternal(linkUrl);
          }}
          className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
        >
          {linkText}
        </button>
      );
      
      lastIndex = linkRegex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Lightbulb size={24} className="text-yellow-500" />
            <h2 className="text-xl font-medium">アイディア詳細</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-2 text-apple-gray-600 hover:bg-apple-gray-100 rounded-lg transition-colors"
                title="編集"
              >
                <Edit3 size={16} />
                編集
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="削除"
            >
              <Trash2 size={16} />
              削除
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
              title="閉じる"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* タイトル */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-apple-gray-700 mb-2">
              タイトル
            </label>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="アイディアのタイトルを入力..."
              />
            ) : (
              <h3 className="text-lg font-medium text-apple-gray-900">{item.title}</h3>
            )}
          </div>

          {/* 詳細説明 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-apple-gray-700 mb-2">
              詳細説明
            </label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="アイディアの詳細な説明を入力..."
              />
            ) : (
              <div className="min-h-[300px] p-3 bg-apple-gray-50 rounded-lg border">
                {item.description ? (
                  <p className="text-apple-gray-900 whitespace-pre-wrap">{item.description}</p>
                ) : (
                  <p className="text-apple-gray-500 italic">説明が入力されていません</p>
                )}
              </div>
            )}
          </div>

          {/* 参考資料 */}
          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-apple-gray-700 mb-2">
              参考資料・リンク
            </label>
            {isEditing ? (
              <textarea
                ref={referenceMaterialsRef}
                value={referenceMaterials}
                onChange={(e) => setReferenceMaterials(e.target.value)}
                onContextMenu={handleContextMenu}
                rows={6}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="参考資料やリンクを入力... (URLを選択して右クリックでリンク化)"
              />
            ) : (
              <div className="min-h-[150px] p-3 bg-apple-gray-50 rounded-lg border">
                {item.reference_materials ? (
                  <div className="text-apple-gray-900 whitespace-pre-wrap">
                    {renderLinksInText(item.reference_materials)}
                  </div>
                ) : (
                  <p className="text-apple-gray-500 italic">参考資料が入力されていません</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        {isEditing && (
          <div className="flex justify-end gap-2 p-6 border-t">
            <button
              onClick={() => {
                setIsEditing(false);
                setTitle(item.title);
                setDescription(item.description || '');
                setReferenceMaterials(item.reference_materials || '');
              }}
              className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors"
            >
              <X size={16} />
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              保存
            </button>
          </div>
        )}
      </div>

      {/* リンクツールチップ */}
      {linkTooltip && (
        <div
          className="fixed z-50 bg-white border border-apple-gray-300 rounded-lg shadow-lg p-2"
          style={{
            left: linkTooltip.x,
            top: linkTooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button
            onClick={handleLinkify}
            className="flex items-center gap-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Link size={14} />
            リンク化
          </button>
        </div>
      )}
    </div>
  );
};

export default IdeaDetailModal;