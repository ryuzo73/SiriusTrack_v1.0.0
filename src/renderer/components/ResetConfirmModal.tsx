import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  resetType: 'global' | 'segment';
  segmentName?: string;
}

const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  resetType,
  segmentName
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  const requiredText = 'RESET';
  const isConfirmValid = confirmText === requiredText;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    
    setIsResetting(true);
    try {
      await onConfirm();
      setConfirmText('');
      onClose();
    } catch (error) {
      console.error('Reset failed:', error);
      console.error('❌ リセットに失敗しました:', error);
      // Keep modal open on error so user can try again
      setConfirmText('');
      return;
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    if (isResetting) return;
    setConfirmText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <h2 className="text-xl font-medium text-red-700">{title}</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">{message}</p>
          
          {resetType === 'segment' && segmentName && (
            <div className="p-3 bg-orange-50 rounded-lg mb-4">
              <p className="text-sm text-orange-700">
                <strong>対象領域:</strong> {segmentName}
              </p>
            </div>
          )}

          <div className="p-4 bg-red-50 rounded-lg mb-4">
            <h3 className="font-medium text-red-700 mb-2">⚠️ 削除されるデータ:</h3>
            <ul className="text-sm text-red-600 space-y-1">
              <li>• 評価計算結果</li>
              <li>• 活動ポイント履歴</li>
              <li>• <strong>過去のタスクデータ（完全削除）</strong></li>
              <li>• <strong>過去のマイルストーンデータ（完全削除）</strong></li>
              <li>• <strong>習慣todoの定義（完全削除）</strong></li>
              <li>• <strong>習慣todoの完了履歴（完全削除）</strong></li>
              <li>• 引き継ぎ記録</li>
            </ul>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <p className="text-sm text-gray-700 mb-2">
              この操作は<strong>取り消せません</strong>。続行するには下記に <code className="bg-red-100 px-1 rounded text-red-700 font-mono">{requiredText}</code> と入力してください：
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`"${requiredText}" と入力`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 font-mono"
              disabled={isResetting}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isResetting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isResetting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResetting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                リセット中...
              </>
            ) : (
              <>
                <AlertTriangle size={16} />
                リセット実行
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetConfirmModal;