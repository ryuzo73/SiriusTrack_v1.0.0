import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { database } from '../utils/database';
import CalendarDateModal from '../components/CalendarDateModal';

interface CalendarItem {
  date: string;
  segmentName: string;
  todos: Array<{
    id: number;
    title: string;
    completed: boolean;
    type: 'daily' | 'weekly' | 'habit';
  }>;
  milestones: Array<{
    id: number;
    title: string;
    status: 'pending' | 'completed';
  }>;
}

const CalendarPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // URLパラメータから戻り先情報を取得
  const fromSegment = searchParams.get('from') === 'segment';
  const segmentId = searchParams.get('segmentId');
  const segmentName = searchParams.get('segmentName');

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth]);

  const loadCalendarData = async () => {
    try {
      const segments = await database.getSegments();
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      console.log('Loading calendar data for:', start, 'to', end);
      console.log('Segments:', segments);
      
      const data: CalendarItem[] = [];
      
      for (const segment of segments) {
        // マイルストーンを取得
        const milestones = await database.getMilestones(segment.id);
        console.log(`Segment ${segment.name} milestones:`, milestones);
        
        // 期間内のマイルストーンをフィルタ
        const filteredMilestones = milestones.filter((milestone: any) => 
          milestone.target_date >= start && milestone.target_date <= end
        );
        
        // 期間内の各日について今日のTodosを取得
        const todos: any[] = [];
        const currentDate = new Date(start);
        const endDate = new Date(end);
        
        while (currentDate <= endDate) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          const dayTodos = await database.getTodos(segment.id, dateStr);
          dayTodos.forEach(todo => {
            todos.push({
              ...todo,
              date: dateStr
            });
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log(`Segment ${segment.name}:`, todos.length, 'todos,', filteredMilestones.length, 'milestones');
        
        // Todosを処理
        todos.forEach((todo: any) => {
          let existing = data.find(d => d.date === todo.date);
          if (!existing) {
            existing = {
              date: todo.date,
              segmentName: segment.name,
              todos: [],
              milestones: []
            };
            data.push(existing);
          }
          existing.todos.push({
            id: todo.id,
            title: `${todo.type === 'weekly' ? '[週] ' : ''}[${segment.name}] ${todo.title}`,
            completed: todo.completed,
            type: todo.type
          });
        });
        
        // マイルストーンを処理
        filteredMilestones.forEach((milestone: any) => {
          let existing = data.find(d => d.date === milestone.target_date);
          if (!existing) {
            existing = {
              date: milestone.target_date,
              segmentName: segment.name,
              todos: [],
              milestones: []
            };
            data.push(existing);
          }
          existing.milestones.push({
            id: milestone.id,
            title: `🎯[${segment.name}] ${milestone.title}`,
            status: milestone.status
          });
        });
      }
      
      console.log('Final calendar data:', data);
      setCalendarData(data);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = calendarData.find(d => d.date === dateStr);
    return {
      todos: dayData?.todos || [],
      milestones: dayData?.milestones || []
    };
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          {fromSegment && segmentId ? (
            <Link 
              to={`/segment/${segmentId}`} 
              className="inline-flex items-center gap-2 text-apple-gray-500 hover:text-apple-gray-700 transition-colors"
            >
              <ArrowLeft size={20} />
              {segmentName ? `${decodeURIComponent(segmentName)}に戻る` : 'セグメントに戻る'}
            </Link>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2 text-apple-gray-500 hover:text-apple-gray-700 transition-colors">
              <ArrowLeft size={20} />
              メインページに戻る
            </Link>
          )}
          <div className="flex items-center gap-3">
            <Calendar size={24} className="text-blue-500" />
            <h1 className="text-2xl font-light">Calendar</h1>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-center mb-6">
          <h2 className="text-xl font-medium">
            {format(currentMonth, 'yyyy年 M月', { locale: ja })}
          </h2>
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-apple-gray-200">
          {['日', '月', '火', '水', '木', '金', '土'].map(day => (
            <div key={day} className="bg-apple-gray-100 p-3 text-center text-sm font-medium">
              {day}
            </div>
          ))}
          
          {Array.from({ length: new Date(days[0]).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white p-3"></div>
          ))}
          
          {days.map(day => {
            const { todos, milestones } = getItemsForDate(day);
            const completedTodos = todos.filter(t => t.completed).length;
            const completedMilestones = milestones.filter(m => m.status === 'completed').length;
            const totalItems = todos.length + milestones.length;
            const completedItems = completedTodos + completedMilestones;
            
            return (
              <div
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                className={`bg-white p-3 min-h-[120px] cursor-pointer hover:bg-apple-gray-50 transition-colors ${
                  !isSameMonth(day, currentMonth) ? 'opacity-50' : ''
                } ${isToday(day) ? 'ring-2 ring-apple-gray-400' : ''}`}
              >
                <div className="font-medium mb-2">{format(day, 'd')}</div>
                {totalItems > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      {milestones.length > 0 && (
                        <div className="text-xs text-blue-600 font-medium">
                          🎯 {milestones.length}件
                        </div>
                      )}
                      {todos.length > 0 && (
                        <div className="text-xs text-apple-gray-600">
                          📝 {todos.length}件
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-apple-gray-500 pt-2 border-t">
                      {completedItems}/{totalItems} 完了
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <CalendarDateModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        date={selectedDate}
        todos={selectedDate ? getItemsForDate(selectedDate).todos : []}
        milestones={selectedDate ? getItemsForDate(selectedDate).milestones : []}
      />
    </div>
  );
};

export default CalendarPage;