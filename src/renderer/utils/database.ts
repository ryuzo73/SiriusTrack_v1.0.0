import { format } from 'date-fns';

export interface OverallPurpose {
  id: number;
  title: string;
  description: string;
  goal: string;
  created_at: string;
}

export interface Segment {
  id: number;
  name: string;
  overall_goal: string;
  color: string;
  created_at: string;
}

export interface Milestone {
  id: number;
  segment_id: number;
  title: string;
  target_date: string;
  status: 'pending' | 'completed';
  achievement_level: 'pending' | 'achieved';
  display_order: number;
  completed_at: string | null;
  created_at: string;
}

export interface Todo {
  id: number;
  segment_id: number;
  title: string;
  completed: boolean;
  achievement_level: 'pending' | 'achieved';
  date: string;
  type: 'daily' | 'weekly';
  display_order: number;
  completed_at: string | null;
  created_at: string;
  habit_todo_id?: number;
  is_from_habit?: boolean;
}

export interface HabitTodo {
  id: number;
  segment_id: number;
  title: string;
  active: boolean;
  created_at: string;
  deactivated_at: string | null;
}

export interface HabitTodoCompletion {
  id: number;
  habit_todo_id: number;
  segment_id: number;
  date: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  title?: string; // Joined from habit_todos table
}

export interface DiscussionItem {
  id: number;
  segment_id: number;
  content: string;
  resolved: boolean;
  display_order: number;
  created_at: string;
  resolved_at: string | null;
}

export interface ActivityPoint {
  id: number;
  segment_id: number;
  date: string;
  points: number;
  source_type: 'daily' | 'weekly' | 'habit' | 'milestone';
  source_id: number;
  description: string | null;
  created_at: string;
}

const db = window.electronAPI.database;

export interface UnifiedCarryoverTask {
  id: number;
  title: string;
  date: string;
  segmentId: number;
  segmentName: string;
  segmentColor: string;
}

export interface BucketListItem {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  display_order: number;
  completed_at: string | null;
  created_at: string;
}

export interface RoutineEvent {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  display_order: number;
  created_at: string;
}

export interface IdeaListItem {
  id: number;
  title: string;
  description: string | null;
  reference_materials: string | null;
  display_order: number;
  created_at: string;
}

export const database = {
  async getOverallPurpose(): Promise<OverallPurpose | null> {
    return await db.getOverallPurpose();
  },

  async setOverallPurpose(title: string, description: string, goal: string): Promise<void> {
    await db.saveOverallPurpose(title, description, goal);
  },

  async getSegments(): Promise<Segment[]> {
    return await db.getSegments();
  },

  async getSegment(id: number): Promise<Segment | null> {
    const segments = await db.getSegments();
    return segments.find(s => s.id === id) || null;
  },

  async createSegment(name: string, overall_goal: string, color: string = '#6e6e73'): Promise<void> {
    try {
      if (!name?.trim()) throw new Error('セグメント名が必要です');
      await db.createSegment(name, overall_goal, color);
    } catch (error) {
      console.error('Failed to create segment:', error);
      throw new Error('セグメントの作成に失敗しました');
    }
  },

  async updateSegment(id: number, name: string, overall_goal: string, color: string): Promise<void> {
    try {
      if (!name?.trim()) throw new Error('セグメント名が必要です');
      await db.updateSegment(id, name, overall_goal, color);
    } catch (error) {
      console.error('Failed to update segment:', error);
      throw new Error('セグメントの更新に失敗しました');
    }
  },

  async deleteSegment(id: number): Promise<void> {
    await db.deleteSegment(id);
  },

  async getMilestones(segmentId: number): Promise<Milestone[]> {
    return await db.getMilestones(segmentId);
  },

  async createMilestone(segmentId: number, title: string, targetDate: string): Promise<void> {
    await db.createMilestone(segmentId, title, targetDate);
  },

  async updateMilestoneStatus(id: number, status: 'pending' | 'completed'): Promise<void> {
    await db.query('UPDATE milestones SET status = ? WHERE id = ?', [status, id]);
  },

  async getTodos(segmentId: number, date: string): Promise<Todo[]> {
    return await db.getTodos(segmentId, date);
  },

  async createTodo(segmentId: number, title: string, date: string, type: 'daily' | 'weekly' = 'daily'): Promise<void> {
    try {
      if (!title?.trim()) throw new Error('タスク名が必要です');
      if (!date) throw new Error('日付が必要です');
      
      await db.createTodo(segmentId, title, date, type);
    } catch (error) {
      console.error('Failed to create todo:', error);
      throw new Error('Todoの作成に失敗しました');
    }
  },

  async toggleTodo(id: number): Promise<void> {
    // Main processで完了状態の切り替えとポイント処理を一括実行
    await db.toggleTodo(id);
  },

  async getDiscussionItems(segmentId: number): Promise<DiscussionItem[]> {
    return await db.getDiscussionItems(segmentId);
  },

  async createDiscussionItem(segmentId: number, content: string): Promise<void> {
    await db.createDiscussionItem(segmentId, content);
  },

  async toggleDiscussionItem(id: number): Promise<void> {
    await db.query('UPDATE discussion_items SET resolved = NOT resolved, resolved_at = CASE WHEN resolved = 0 THEN datetime() ELSE NULL END WHERE id = ?', [id]);
  },

  async saveDiscussionMemo(discussionItemId: number, memo: string, resolved: boolean): Promise<void> {
    console.log('saveDiscussionMemo called with:', { discussionItemId, memo, resolved });
    
    // Save memo - 既存のメモがあれば更新、なければ新規作成
    if (memo.trim()) {
      console.log('Saving memo to database...');
      const existingMemos = await db.query('SELECT * FROM discussion_memos WHERE discussion_item_id = ? ORDER BY created_at DESC LIMIT 1', [discussionItemId]);
      
      if (existingMemos.length > 0) {
        // 既存のメモを更新
        await db.query('UPDATE discussion_memos SET memo = ?, created_at = datetime() WHERE id = ?', [memo.trim(), existingMemos[0].id]);
      } else {
        // 新規メモを作成
        await db.query('INSERT INTO discussion_memos (discussion_item_id, memo) VALUES (?, ?)', [discussionItemId, memo.trim()]);
      }
      console.log('Memo saved successfully');
    }
    
    // Update resolved status
    console.log('Updating resolved status...');
    await db.query('UPDATE discussion_items SET resolved = ?, resolved_at = CASE WHEN ? = 1 THEN datetime() ELSE NULL END WHERE id = ?', [resolved, resolved, discussionItemId]);
    console.log('Resolved status updated successfully');
  },

  async updateMilestoneOrder(milestones: { id: number; display_order: number }[]): Promise<void> {
    for (const milestone of milestones) {
      await db.query('UPDATE milestones SET display_order = ? WHERE id = ?', [milestone.display_order, milestone.id]);
    }
  },

  async updateTodoOrder(todos: { id: number; display_order: number }[]): Promise<void> {
    for (const todo of todos) {
      await db.query('UPDATE todos SET display_order = ? WHERE id = ?', [todo.display_order, todo.id]);
    }
  },

  async updateDiscussionItemOrder(items: { id: number; display_order: number }[]): Promise<void> {
    for (const item of items) {
      await db.query('UPDATE discussion_items SET display_order = ? WHERE id = ?', [item.display_order, item.id]);
    }
  },

  async getDiscussionMemos(discussionItemId: number): Promise<any[]> {
    return await db.query('SELECT * FROM discussion_memos WHERE discussion_item_id = ? ORDER BY created_at DESC', [discussionItemId]);
  },

  async updateTodoAchievement(id: number, achievementLevel: 'pending' | 'achieved'): Promise<void> {
    await db.updateTodoAchievement(id, achievementLevel);
  },

  async updateMilestoneAchievement(id: number, achievementLevel: 'pending' | 'achieved'): Promise<void> {
    await db.updateMilestoneAchievement(id, achievementLevel);
  },

  async getEvaluationData(segmentId: number, dateRange: number = 30): Promise<any[]> {
    // FINAL FIX: Use explicit date format that matches saving format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const endDateStr = `${year}-${month}-${day}`;
    
    // Calculate start date
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - dateRange + 1);
    const startYear = startDate.getFullYear();
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const startDay = String(startDate.getDate()).padStart(2, '0');
    const startDateStr = `${startYear}-${startMonth}-${startDay}`;
    
    console.log('=== FINAL getEvaluationData ===');
    console.log('Today (explicit):', endDateStr);
    console.log('Start date:', startDateStr);
    console.log('Fetching evaluation data:', { segmentId, startDateStr, endDateStr });
    
    const result = await db.query(
      'SELECT * FROM evaluations WHERE segment_id = ? AND date >= ? AND date <= ? ORDER BY date ASC',
      [segmentId, startDateStr, endDateStr]
    );
    
    console.log('Retrieved evaluation records:', result.length);
    if (result.length > 0) {
      console.log('Latest evaluation data:', result[result.length - 1]);
    }
    return result;
  },

  async calculateAndSaveEvaluation(segmentId: number, date: string): Promise<any> {
    try {
      console.log('Calling calculateAndSaveEvaluation via IPC:', { segmentId, date });
      const result = await db.calculateAndSaveEvaluation(segmentId, date);
      console.log('IPC result received:', result);
      return result;
    } catch (error) {
      console.error('Error in calculateAndSaveEvaluation:', error);
      throw error;
    }
  },


  async deleteMilestone(milestoneId: number): Promise<void> {
    try {
      console.log('Deleting milestone via IPC:', milestoneId);
      await db.deleteMilestone(milestoneId);
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      throw new Error('マイルストーンの削除に失敗しました');
    }
  },

  async deleteTodo(todoId: number): Promise<void> {
    try {
      await db.deleteTodo(todoId);
    } catch (error) {
      console.error('Failed to delete todo:', error);
      throw new Error('Todoの削除に失敗しました');
    }
  },

  async deleteDiscussionItem(discussionId: number): Promise<void> {
    try {
      // Use generic query for discussion deletion (not yet implemented in main)
      await db.query('DELETE FROM discussion_items WHERE id = ?', [discussionId]);
    } catch (error) {
      console.error('Failed to delete discussion item:', error);
      throw new Error('議論事項の削除に失敗しました');
    }
  },

  async recordCarryover(segmentId: number, todoId: number, title: string, originalDate: string, carriedOverDate: string): Promise<void> {
    await db.recordCarryover(segmentId, todoId, title, originalDate, carriedOverDate);
  },

  async getCarryoverRecords(segmentId: number): Promise<any[]> {
    return await db.getCarryoverRecords(segmentId);
  },

  async getAllTodosForSegment(segmentId: number): Promise<Todo[]> {
    console.log('getAllTodosForSegment called with segmentId:', segmentId);
    
    try {
      // まず最もシンプルなクエリでテスト
      const simpleResult = await db.query(
        'SELECT * FROM todos WHERE segment_id = ? ORDER BY date DESC',
        [segmentId]
      );
      console.log('Simple query result:', simpleResult);
      
      // 過去3ヶ月から未来1ヶ月のTodoを取得
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      
      const startDate = threeMonthsAgo.toISOString().split('T')[0];
      const endDate = oneMonthLater.toISOString().split('T')[0];
      
      console.log('getAllTodosForSegment query conditions:', {
        segmentId,
        startDate,
        endDate,
        query: 'SELECT * FROM todos WHERE segment_id = ? AND date >= ? AND date <= ? ORDER BY date DESC'
      });
      
      const result = await db.query(
        'SELECT * FROM todos WHERE segment_id = ? AND date >= ? AND date <= ? ORDER BY date DESC',
        [segmentId, startDate, endDate]
      );
      
      console.log('getAllTodosForSegment final result:', result);
      return result;
    } catch (error) {
      console.error('Error in getAllTodosForSegment:', error);
      return [];
    }
  },

  async getTodosInDateRange(segmentId: number, startDate: string, endDate: string): Promise<Todo[]> {
    return await db.query(
      'SELECT * FROM todos WHERE segment_id = ? AND date >= ? AND date <= ? ORDER BY date DESC',
      [segmentId, startDate, endDate]
    );
  },

  // Habit Todos
  async getHabitTodos(segmentId: number): Promise<HabitTodo[]> {
    return await db.getHabitTodos(segmentId);
  },

  async getAllHabitTodos(segmentId: number): Promise<HabitTodo[]> {
    return await db.getAllHabitTodos(segmentId);
  },

  async createHabitTodo(segmentId: number, title: string): Promise<void> {
    try {
      if (!title?.trim()) throw new Error('習慣タスク名が必要です');
      await db.createHabitTodo(segmentId, title);
    } catch (error) {
      console.error('Failed to create habit todo:', error);
      throw new Error('習慣Todoの作成に失敗しました');
    }
  },

  async updateHabitTodo(id: number, title: string): Promise<void> {
    try {
      if (!title?.trim()) throw new Error('習慣タスク名が必要です');
      await db.updateHabitTodo(id, title);
    } catch (error) {
      console.error('Failed to update habit todo:', error);
      throw new Error('習慣Todoの更新に失敗しました');
    }
  },

  async deactivateHabitTodo(id: number): Promise<void> {
    try {
      await db.deactivateHabitTodo(id);
    } catch (error) {
      console.error('Failed to deactivate habit todo:', error);
      throw new Error('習慣Todoの非アクティブ化に失敗しました');
    }
  },

  async reactivateHabitTodo(id: number): Promise<void> {
    try {
      await db.reactivateHabitTodo(id);
    } catch (error) {
      console.error('Failed to reactivate habit todo:', error);
      throw new Error('習慣Todoの再アクティブ化に失敗しました');
    }
  },

  async generateHabitTodos(segmentId: number, date: string): Promise<{ generated: number; skipped: number }> {
    try {
      return await db.generateHabitTodos(segmentId, date);
    } catch (error) {
      console.error('Failed to generate habit todos:', error);
      throw new Error('習慣Todoの生成に失敗しました');
    }
  },

  async deleteHabitTodo(id: number): Promise<{ deletedHabitTodos: number; deletedRelatedTodos: number }> {
    try {
      return await db.deleteHabitTodo(id);
    } catch (error) {
      console.error('Failed to delete habit todo:', error);
      throw new Error('習慣Todoの削除に失敗しました');
    }
  },

  // Bulk delete operations
  async bulkDeleteMilestones(segmentId: number): Promise<{ deleted: number }> {
    try {
      return await db.bulkDeleteMilestones(segmentId);
    } catch (error) {
      console.error('Failed to bulk delete milestones:', error);
      throw new Error('マイルストーンの一括削除に失敗しました');
    }
  },

  async bulkDeleteDiscussions(segmentId: number): Promise<{ deletedDiscussions: number; deletedMemos: number }> {
    try {
      return await db.bulkDeleteDiscussions(segmentId);
    } catch (error) {
      console.error('Failed to bulk delete discussion items:', error);
      throw new Error('議論事項の一括削除に失敗しました');
    }
  },

  async bulkDeleteTodaysUncompletedTodos(segmentId: number, date: string): Promise<{ deleted: number }> {
    try {
      return await db.bulkDeleteTodaysUncompletedTodos(segmentId, date);
    } catch (error) {
      console.error('Failed to bulk delete uncompleted todos:', error);
      throw new Error('未完了タスクの一括削除に失敗しました');
    }
  },

  async bulkDeleteTodaysTodos(segmentId: number, date: string): Promise<{ deleted: number }> {
    try {
      return await db.bulkDeleteTodaysTodos(segmentId, date);
    } catch (error) {
      console.error('Failed to bulk delete today\'s todos:', error);
      throw new Error('今日のタスクの一括削除に失敗しました');
    }
  },

  // Habit todo completion tracking
  async getHabitTodoCompletions(segmentId: number, date: string): Promise<HabitTodoCompletion[]> {
    try {
      return await db.getHabitTodoCompletions(segmentId, date);
    } catch (error) {
      console.error('Failed to get habit todo completions:', error);
      throw new Error('習慣Todo完了状況の取得に失敗しました');
    }
  },

  async toggleHabitTodoCompletion(habitTodoId: number, segmentId: number, date: string): Promise<{ completed: boolean; changes: number }> {
    try {
      // Main processで完了状態の切り替えとポイント処理を一括実行
      return await db.toggleHabitTodoCompletion(habitTodoId, segmentId, date);
    } catch (error) {
      console.error('Failed to toggle habit todo completion:', error);
      throw new Error('習慣Todo完了状況の更新に失敗しました');
    }
  },

  async getAllTodosWithCompletions(segmentId: number): Promise<Todo[]> {
    try {
      return await db.getAllTodosWithCompletions(segmentId);
    } catch (error) {
      console.error('Failed to get todos with completions:', error);
      throw new Error('習慣Todo完了状況を含む履歴の取得に失敗しました');
    }
  },

  // ポイント関連
  async addActivityPoint(segmentId: number, date: string, points: number, sourceType: 'daily' | 'weekly' | 'habit' | 'milestone', sourceId: number, description: string): Promise<void> {
    await db.addActivityPoint(segmentId, date, points, sourceType, sourceId, description);
  },

  async removeActivityPoints(sourceType: string, sourceId: number, date: string): Promise<void> {
    await db.removeActivityPoints(sourceType, sourceId, date);
  },

  async getTotalPoints(segmentId?: number): Promise<number> {
    return await db.getTotalPoints(segmentId);
  },


  // Reset evaluation data functions
  async resetAllEvaluations(): Promise<any> {
    try {
      console.log('🔄 Starting global evaluation reset...');
      const result = await db.resetAllEvaluations();
      console.log('✅ Global evaluation reset completed:', result);
      return result;
    } catch (error) {
      console.error('Failed to reset all evaluations:', error);
      throw new Error('全評価データのリセットに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  },

  async resetSegmentEvaluations(segmentId: number): Promise<any> {
    try {
      console.log('🔄 Starting segment evaluation reset for:', segmentId);
      const result = await db.resetSegmentEvaluations(segmentId);
      console.log('✅ Segment evaluation reset completed:', result);
      return result;
    } catch (error) {
      console.error('Failed to reset segment evaluations:', error);
      throw new Error('領域評価データのリセットに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  },

  async getPointsByDateRange(segmentId: number, startDate: string, endDate: string): Promise<ActivityPoint[]> {
    return await db.query(
      'SELECT * FROM activity_points WHERE segment_id = ? AND date >= ? AND date <= ? ORDER BY date DESC, created_at DESC',
      [segmentId, startDate, endDate]
    );
  },

  async getAllIncompleteTasksForCarryover(): Promise<UnifiedCarryoverTask[]> {
    try {
      const tasks = await db.getAllIncompleteTasksForCarryover();
      return tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        date: task.date,
        segmentId: task.segment_id,
        segmentName: task.segment_name,
        segmentColor: task.segment_color
      }));
    } catch (error) {
      console.error('Failed to get incomplete tasks for carryover:', error);
      throw new Error('未完了タスクの取得に失敗しました');
    }
  },

  async recordBulkCarryover(tasks: UnifiedCarryoverTask[]): Promise<{ success: boolean; count: number }> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const carryoverTasks = tasks.map(task => ({
        segmentId: task.segmentId,
        todoId: task.id,
        title: task.title,
        originalDate: task.date,
        carriedOverDate: today
      }));
      
      return await db.recordBulkCarryover(carryoverTasks);
    } catch (error) {
      console.error('Failed to record bulk carryover:', error);
      throw new Error('タスク引き継ぎの記録に失敗しました');
    }
  },

  // Bucket List functions
  async getBucketListItems(): Promise<BucketListItem[]> {
    try {
      return await db.getBucketListItems();
    } catch (error) {
      console.error('Failed to get bucket list items:', error);
      throw new Error('バケットリストの取得に失敗しました');
    }
  },

  async createBucketListItem(title: string, description?: string): Promise<void> {
    try {
      if (!title?.trim()) throw new Error('タイトルが必要です');
      await db.createBucketListItem(title, description);
    } catch (error) {
      console.error('Failed to create bucket list item:', error);
      throw new Error('バケットリストアイテムの作成に失敗しました');
    }
  },

  async updateBucketListItem(id: number, title: string, description?: string): Promise<void> {
    try {
      if (!title?.trim()) throw new Error('タイトルが必要です');
      await db.updateBucketListItem(id, title, description);
    } catch (error) {
      console.error('Failed to update bucket list item:', error);
      throw new Error('バケットリストアイテムの更新に失敗しました');
    }
  },

  async toggleBucketListItem(id: number): Promise<void> {
    try {
      await db.toggleBucketListItem(id);
    } catch (error) {
      console.error('Failed to toggle bucket list item:', error);
      throw new Error('バケットリストアイテムの状態変更に失敗しました');
    }
  },

  async deleteBucketListItem(id: number): Promise<void> {
    try {
      await db.deleteBucketListItem(id);
    } catch (error) {
      console.error('Failed to delete bucket list item:', error);
      throw new Error('バケットリストアイテムの削除に失敗しました');
    }
  },

  async reorderBucketListItems(items: Array<{ id: number; display_order: number }>): Promise<void> {
    try {
      await db.reorderBucketListItems(items);
    } catch (error) {
      console.error('Failed to reorder bucket list items:', error);
      throw new Error('バケットリストアイテムの並び替えに失敗しました');
    }
  },

  // Routine Events functions
  async getRoutineEvents(): Promise<RoutineEvent[]> {
    try {
      return await db.getRoutineEvents();
    } catch (error) {
      console.error('Failed to get routine events:', error);
      throw new Error('ルーティンイベントの取得に失敗しました');
    }
  },

  async createRoutineEvent(title: string, startTime: string, endTime: string): Promise<void> {
    try {
      if (!title?.trim()) throw new Error('タイトルが必要です');
      if (!startTime || !endTime) throw new Error('開始時刻と終了時刻が必要です');
      await db.createRoutineEvent(title, startTime, endTime);
    } catch (error) {
      console.error('Failed to create routine event:', error);
      throw new Error('ルーティンイベントの作成に失敗しました');
    }
  },

  async updateRoutineEvent(id: number, title: string, startTime: string, endTime: string): Promise<void> {
    try {
      if (!title?.trim()) throw new Error('タイトルが必要です');
      if (!startTime || !endTime) throw new Error('開始時刻と終了時刻が必要です');
      await db.updateRoutineEvent(id, title, startTime, endTime);
    } catch (error) {
      console.error('Failed to update routine event:', error);
      throw new Error('ルーティンイベントの更新に失敗しました');
    }
  },

  async deleteRoutineEvent(id: number): Promise<void> {
    try {
      await db.deleteRoutineEvent(id);
    } catch (error) {
      console.error('Failed to delete routine event:', error);
      throw new Error('ルーティンイベントの削除に失敗しました');
    }
  },

  async reorderRoutineEvents(items: Array<{ id: number; display_order: number }>): Promise<void> {
    try {
      await db.reorderRoutineEvents(items);
    } catch (error) {
      console.error('Failed to reorder routine events:', error);
      throw new Error('ルーティンイベントの並び替えに失敗しました');
    }
  },

  // Color settings functions
  async getColorSettings(): Promise<Array<{ start_time: number; end_time: number; color: string; label: string }>> {
    try {
      const result = await db.getColorSettings();
      return result || [];
    } catch (error) {
      console.error('Failed to get color settings:', error);
      throw new Error('色分け設定の取得に失敗しました');
    }
  },

  async saveColorSettings(timeRanges: Array<{ start: number; end: number; color: string; label: string }>): Promise<void> {
    try {
      await db.saveColorSettings(timeRanges);
    } catch (error) {
      console.error('Failed to save color settings:', error);
      throw new Error('色分け設定の保存に失敗しました');
    }
  },

  // Idea list items functions
  async getIdeaListItems(): Promise<IdeaListItem[]> {
    try {
      return await db.getIdeaListItems();
    } catch (error) {
      console.error('Failed to get idea list items:', error);
      throw new Error('アイディアリストの取得に失敗しました');
    }
  },

  async createIdeaListItem(title: string, description?: string, referenceMaterials?: string): Promise<void> {
    try {
      if (!title?.trim()) throw new Error('タイトルが必要です');
      await db.createIdeaListItem(title, description, referenceMaterials);
    } catch (error) {
      console.error('Failed to create idea list item:', error);
      throw new Error('アイディアリストアイテムの作成に失敗しました');
    }
  },

  async updateIdeaListItem(id: number, title: string, description?: string, referenceMaterials?: string): Promise<void> {
    try {
      if (!title?.trim()) throw new Error('タイトルが必要です');
      await db.updateIdeaListItem(id, title, description, referenceMaterials);
    } catch (error) {
      console.error('Failed to update idea list item:', error);
      throw new Error('アイディアリストアイテムの更新に失敗しました');
    }
  },

  async deleteIdeaListItem(id: number): Promise<void> {
    try {
      await db.deleteIdeaListItem(id);
    } catch (error) {
      console.error('Failed to delete idea list item:', error);
      throw new Error('アイディアリストアイテムの削除に失敗しました');
    }
  },

  async reorderIdeaListItems(items: Array<{ id: number; display_order: number }>): Promise<void> {
    try {
      await db.reorderIdeaListItems(items);
    } catch (error) {
      console.error('Failed to reorder idea list items:', error);
      throw new Error('アイディアリストアイテムの並び替えに失敗しました');
    }
  }
};