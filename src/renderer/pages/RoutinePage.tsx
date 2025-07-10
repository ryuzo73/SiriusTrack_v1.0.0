import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Clock, Edit3, Trash2, Save, X } from 'lucide-react';
import { database, RoutineEvent } from '../utils/database';
import ConfirmModal from '../components/ConfirmModal';
import CircularTimeline from '../components/CircularTimeline';
import ColorSettingsModal from '../components/ColorSettingsModal';

const RoutinePage: React.FC = () => {
  const [events, setEvents] = useState<RoutineEvent[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start_time: '',
    end_time: ''
  });
  const [editingEvent, setEditingEvent] = useState<{ id: number; title: string; start_time: string; end_time: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<RoutineEvent | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  // 色分け設定関連
  const [timeRanges, setTimeRanges] = useState([
    { start: 6, end: 12, color: '#FEF3C7', label: '朝' },
    { start: 12, end: 18, color: '#DBEAFE', label: '昼' },
    { start: 18, end: 22, color: '#FEE2E2', label: '夕方' },
    { start: 22, end: 6, color: '#E5E7EB', label: '夜・深夜' }
  ]);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  
  // レスポンシブサイズ管理
  const [circularTimelineSize, setCircularTimelineSize] = useState<'small' | 'medium' | 'large'>('medium');
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCircularTimelineSize('small');
      } else if (window.innerWidth < 1200) {
        setCircularTimelineSize('medium');
      } else {
        setCircularTimelineSize('large');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 円形タイムラインでのイベントクリック処理
  const handleEventClick = (event: RoutineEvent) => {
    setSelectedEvent(event);
  };

  // 円形タイムラインでの時間クリック処理
  const handleTimeClick = (hour: number, minute: number) => {
    // 分を15分単位で丸める
    const roundedMinute = Math.round(minute / 15) * 15;
    
    // クリックした時間を基に、1時間の範囲でデフォルト値を設定
    const startTime = `${hour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`;
    
    // 終了時間は開始時間の1時間後
    let endHour = hour + 1;
    let endMinute = roundedMinute;
    
    // 24時間を超える場合は24時間表記で調整
    if (endHour >= 24) {
      endHour = 23;
      endMinute = 59;
    }
    
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    setNewEvent({
      title: '',
      start_time: startTime,
      end_time: endTime
    });
    setIsAddingEvent(true);
  };

  const loadEvents = async () => {
    try {
      const eventData = await database.getRoutineEvents();
      setEvents(eventData);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.start_time || !newEvent.end_time) {
      return;
    }

    try {
      await database.createRoutineEvent(newEvent.title, newEvent.start_time, newEvent.end_time);
      setNewEvent({ title: '', start_time: '', end_time: '' });
      setIsAddingEvent(false);
      await loadEvents();
    } catch (error) {
      console.error('Failed to add event:', error);
      alert('イベントの追加に失敗しました');
    }
  };

  const handleEditEvent = (event: RoutineEvent) => {
    setEditingEvent({
      id: event.id,
      title: event.title,
      start_time: event.start_time,
      end_time: event.end_time
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEvent || !editingEvent.title.trim() || !editingEvent.start_time || !editingEvent.end_time) {
      return;
    }

    try {
      await database.updateRoutineEvent(editingEvent.id, editingEvent.title, editingEvent.start_time, editingEvent.end_time);
      setEditingEvent(null);
      await loadEvents();
      
      // 更新後、selectedEventも更新
      if (selectedEvent && selectedEvent.id === editingEvent.id) {
        setSelectedEvent({
          ...selectedEvent,
          title: editingEvent.title,
          start_time: editingEvent.start_time,
          end_time: editingEvent.end_time
        });
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      alert('イベントの更新に失敗しました');
    }
  };

  const handleDeleteEvent = (id: number, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'イベントを削除',
      message: `「${title}」を削除しますか？\nこの操作は元に戻せません。`,
      onConfirm: async () => {
        try {
          await database.deleteRoutineEvent(id);
          await loadEvents();
          
          // 削除されたイベントが選択されていた場合、選択を解除
          if (selectedEvent && selectedEvent.id === id) {
            setSelectedEvent(null);
          }
        } catch (error) {
          console.error('Failed to delete event:', error);
          alert('イベントの削除に失敗しました');
        }
      }
    });
  };


  const loadColorSettings = async () => {
    try {
      const savedSettings = await database.getColorSettings();
      if (savedSettings.length > 0) {
        const convertedSettings = savedSettings.map((setting: any) => ({
          start: setting.start_time,
          end: setting.end_time,
          color: setting.color,
          label: setting.label
        }));
        setTimeRanges(convertedSettings);
      }
    } catch (error) {
      console.error('Failed to load color settings:', error);
    }
  };

  useEffect(() => {
    loadEvents();
    loadColorSettings();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-apple-gray-500 hover:text-apple-gray-700 transition-colors">
            <ArrowLeft size={20} />
            メインページに戻る
          </Link>
          <div className="flex items-center gap-3">
            <Clock size={24} className="text-blue-500" />
            <h1 className="text-2xl font-light">Routine Page</h1>
          </div>
        </div>
        
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        {/* 円形タイムスケジュール表示 */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-medium">一日のスケジュール</h2>
            <p className="text-sm text-apple-gray-500">
              円グラフの任意の場所をクリックして新しいイベントを作成できます
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 円形タイムライン */}
            <div className="flex-shrink-0 flex justify-center lg:justify-start">
              <CircularTimeline 
                events={events}
                onEventClick={handleEventClick}
                onTimeClick={handleTimeClick}
                timeRanges={timeRanges}
                onColorSettingsClick={() => setIsColorModalOpen(true)}
                size={circularTimelineSize}
              />
            </div>
            
            {/* イベント詳細・編集パネル */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* 色分け設定 */}
              {isColorModalOpen && (
                <div>
                  <ColorSettingsModal
                    isOpen={isColorModalOpen}
                    onClose={() => setIsColorModalOpen(false)}
                    onSave={async (newTimeRanges) => {
                      try {
                        await database.saveColorSettings(newTimeRanges);
                        setTimeRanges(newTimeRanges);
                        setIsColorModalOpen(false);
                      } catch (error) {
                        console.error('Failed to save color settings:', error);
                        alert('色分け設定の保存に失敗しました');
                      }
                    }}
                    initialTimeRanges={timeRanges}
                    position="inline"
                  />
                </div>
              )}
              
              {/* 新規イベント追加ボタン */}
              {!isColorModalOpen && (
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setNewEvent({ title: '', start_time: '', end_time: '' });
                      setIsAddingEvent(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors"
                  >
                    <Plus size={16} />
                    新しいイベントを追加
                  </button>
                </div>
              )}

              {/* 新規イベント追加フォーム */}
              {isAddingEvent && !isColorModalOpen && (
                <div className="bg-apple-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">新しいイベントを追加</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-apple-gray-600 mb-1">
                        イベント内容
                      </label>
                      <input
                        type="text"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        placeholder="例：朝食、ウォーキング、英語学習"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-apple-gray-600 mb-1">
                        開始時刻
                      </label>
                      <input
                        type="time"
                        value={newEvent.start_time}
                        onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-apple-gray-600 mb-1">
                        終了時刻
                      </label>
                      <input
                        type="time"
                        value={newEvent.end_time}
                        onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddEvent}
                        disabled={!newEvent.title.trim() || !newEvent.start_time || !newEvent.end_time}
                        className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={16} />
                        追加
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingEvent(false);
                          setNewEvent({ title: '', start_time: '', end_time: '' });
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
              
              {/* イベントリスト */}
              {!isColorModalOpen && (
                <div className="bg-white rounded-lg p-4 border">
                  <h3 className="text-lg font-medium mb-4">イベント一覧</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {events.map((event) => (
                      <div 
                        key={event.id} 
                        className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedEvent?.id === event.id 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'hover:bg-apple-gray-50'
                        }`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="text-sm font-medium">{event.title}</div>
                        <div className="text-xs text-apple-gray-500">
                          {event.start_time} 〜 {event.end_time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* イベント詳細 */}
              {selectedEvent && !isColorModalOpen && (
                <div className="bg-apple-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">イベント詳細</h3>
                  
                  {editingEvent?.id === selectedEvent.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-apple-gray-600 mb-1">
                          イベント名
                        </label>
                        <input
                          type="text"
                          value={editingEvent.title}
                          onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="イベント名"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-apple-gray-600 mb-1">
                          開始時刻
                        </label>
                        <input
                          type="time"
                          value={editingEvent.start_time}
                          onChange={(e) => setEditingEvent({ ...editingEvent, start_time: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-apple-gray-600 mb-1">
                          終了時刻
                        </label>
                        <input
                          type="time"
                          value={editingEvent.end_time}
                          onChange={(e) => setEditingEvent({ ...editingEvent, end_time: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors"
                        >
                          <Save size={16} />
                          保存
                        </button>
                        <button
                          onClick={() => setEditingEvent(null)}
                          className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-500 rounded-lg hover:bg-apple-gray-50 transition-colors"
                        >
                          <X size={16} />
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-apple-gray-800">{selectedEvent.title}</h4>
                        <p className="text-sm text-apple-gray-600">
                          {selectedEvent.start_time} 〜 {selectedEvent.end_time}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditEvent(selectedEvent)}
                          className="flex items-center gap-2 px-4 py-2 border border-apple-gray-300 text-apple-gray-700 rounded-lg hover:bg-apple-gray-50 transition-colors"
                        >
                          <Edit3 size={16} />
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(selectedEvent.id, selectedEvent.title)}
                          className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={16} />
                          削除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 空の状態表示 */}
        {events.length === 0 && !isAddingEvent && (
          <div className="text-center py-12 text-apple-gray-500">
            <Clock size={48} className="mx-auto mb-4 text-apple-gray-300" />
            <p className="text-lg mb-2">まだイベントが登録されていません</p>
            <p className="text-sm">「新しいイベントを追加」ボタンから、一日のルーティンを構築してみましょう</p>
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

export default RoutinePage;