import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDatabase, db, getColorSettings, saveColorSettings, getIdeaListItems, createIdeaListItem, updateIdeaListItem, deleteIdeaListItem, reorderIdeaListItems } from './database';

// サーバー側用の統一日付ユーティリティ
const getTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const logDateDebug = (context: string): string => {
  const dateString = getTodayString();
  const now = new Date();
  console.log(`[Main-DateUtils] ${context}: ${dateString} (generated at ${now.toISOString()})`);
  return dateString;
};

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SiriusTrack',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      sandbox: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#fafafa',
    show: false
  });

  // Always load from localhost:3000 in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools only in development mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Replace generic db:query with specific secure handlers
ipcMain.handle('db:getOverallPurpose', () => {
  try {
    return db.prepare('SELECT * FROM overall_purpose ORDER BY created_at DESC LIMIT 1').get();
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:saveOverallPurpose', (_, title: string, description: string, goal: string) => {
  try {
    return db.prepare('INSERT OR REPLACE INTO overall_purpose (id, title, description, goal) VALUES (1, ?, ?, ?)').run(title, description, goal);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:getSegments', () => {
  try {
    return db.prepare('SELECT * FROM segments ORDER BY created_at ASC').all();
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createSegment', (_, name: string, goal: string, color: string) => {
  try {
    return db.prepare('INSERT INTO segments (name, overall_goal, color) VALUES (?, ?, ?)').run(name, goal, color);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:updateSegment', (_, id: number, name: string, goal: string, color: string) => {
  try {
    return db.prepare('UPDATE segments SET name = ?, overall_goal = ?, color = ? WHERE id = ?').run(name, goal, color, id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:deleteSegment', (_, id: number) => {
  try {
    return db.prepare('DELETE FROM segments WHERE id = ?').run(id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:getTodos', (_, segmentId: number, date: string) => {
  try {
    // Join with habit_todo_completions to get correct completion status for habit todos
    return db.prepare(`
      SELECT 
        t.id,
        t.segment_id,
        t.title,
        t.date,
        t.type,
        t.display_order,
        t.created_at,
        t.achievement_level,
        t.habit_todo_id,
        t.is_from_habit,
        CASE 
          WHEN t.habit_todo_id IS NOT NULL THEN COALESCE(htc.completed, 0)
          ELSE t.completed
        END as completed,
        CASE 
          WHEN t.habit_todo_id IS NOT NULL THEN htc.completed_at
          ELSE t.completed_at
        END as completed_at
      FROM todos t
      LEFT JOIN habit_todo_completions htc ON t.habit_todo_id = htc.habit_todo_id AND t.date = htc.date
      WHERE t.segment_id = ? AND t.date = ? 
      ORDER BY t.display_order ASC, t.created_at ASC
    `).all(segmentId, date);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createTodo', (_, segmentId: number, title: string, date: string, type: string) => {
  try {
    // Get the highest display_order for this segment and date
    const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM todos WHERE segment_id = ? AND date = ? AND type = ?').get(segmentId, date, type) as { max_order: number | null } | undefined;
    const nextOrder = (maxOrder?.max_order || 0) + 1;
    return db.prepare('INSERT INTO todos (segment_id, title, date, type, display_order) VALUES (?, ?, ?, ?, ?)').run(segmentId, title, date, type, nextOrder);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:updateTodoAchievement', (_, id: number, achievementLevel: 'pending' | 'achieved') => {
  try {
    // Get current todo state and info
    const currentTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as any;
    if (!currentTodo) {
      throw new Error('Todo not found');
    }
    
    const wasCompleted = currentTodo.achievement_level === 'achieved';
    const isNowCompleted = achievementLevel === 'achieved';
    
    const completedAt = achievementLevel === 'achieved' ? new Date().toISOString() : null;
    const completed = isNowCompleted ? 1 : 0;
    
    // Update todo
    const updateResult = db.prepare('UPDATE todos SET achievement_level = ?, completed = ?, completed_at = ? WHERE id = ?')
      .run(achievementLevel, completed, completedAt, id);
    
    // Handle activity points for daily and weekly todos (not habits, they're handled separately)
    if (currentTodo.type === 'daily' || currentTodo.type === 'weekly') {
      if (!wasCompleted && isNowCompleted) {
        // 完了に変更された場合はポイント付与
        const result = db.prepare(`
          INSERT INTO activity_points (segment_id, date, points, source_type, source_id, description) 
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(currentTodo.segment_id, currentTodo.date, 1, currentTodo.type, id, `${currentTodo.type}タスクの完了`);
        console.log(`✅ Added 1 point for ${currentTodo.type} todo completion. Insert ID:`, result.lastInsertRowid);
        console.log(`📊 Point details: segment_id=${currentTodo.segment_id}, date=${currentTodo.date}, source_type=${currentTodo.type}, source_id=${id}`);
      } else if (wasCompleted && !isNowCompleted) {
        // 未完了に変更された場合はポイント削除
        const result = db.prepare(`
          DELETE FROM activity_points 
          WHERE source_type = ? AND source_id = ? AND date = ?
        `).run(currentTodo.type, id, currentTodo.date);
        console.log(`🗑️ Removed ${result.changes} points for ${currentTodo.type} todo incompletion`);
      }
    }
    
    return updateResult;
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:deleteTodo', (_, id: number) => {
  try {
    console.log('Deleting todo with ID:', id);
    
    // Get todo info before deletion to clean up activity points
    const todoInfo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as any;
    if (!todoInfo) {
      throw new Error('Todo not found');
    }
    
    // Delete related activity points first
    if (todoInfo.type === 'daily' || todoInfo.type === 'weekly') {
      // Debug: Check what points exist before deletion
      const existingPoints = db.prepare(`
        SELECT * FROM activity_points 
        WHERE source_type = ? AND source_id = ? AND date = ?
      `).all(todoInfo.type, id, todoInfo.date);
      console.log(`🔍 Found ${existingPoints.length} activity points for ${todoInfo.type} todo before deletion:`, existingPoints);
      
      const deletedPoints = db.prepare(`
        DELETE FROM activity_points 
        WHERE source_type = ? AND source_id = ? AND date = ?
      `).run(todoInfo.type, id, todoInfo.date);
      console.log(`✅ Deleted ${deletedPoints.changes} activity points for ${todoInfo.type} todo`);
      
      // Debug: Verify deletion
      const remainingPoints = db.prepare(`
        SELECT * FROM activity_points 
        WHERE source_type = ? AND source_id = ? AND date = ?
      `).all(todoInfo.type, id, todoInfo.date);
      if (remainingPoints.length > 0) {
        console.error(`❌ ERROR: ${remainingPoints.length} activity points still remain after deletion!`, remainingPoints);
      }
    }
    
    // Delete the todo
    const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    console.log('Deleted todo:', result.changes);
    
    return result;
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:updateMilestoneAchievement', (_, id: number, achievementLevel: 'pending' | 'achieved') => {
  try {
    // Get current milestone state and info
    const currentMilestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id) as any;
    if (!currentMilestone) {
      throw new Error('Milestone not found');
    }
    
    const wasCompleted = currentMilestone.achievement_level === 'achieved';
    const isNowCompleted = achievementLevel === 'achieved';
    
    const completedAt = achievementLevel === 'achieved' ? new Date().toISOString() : null;
    const status = isNowCompleted ? 'completed' : 'pending';
    
    // Update milestone
    const updateResult = db.prepare('UPDATE milestones SET achievement_level = ?, status = ?, completed_at = ? WHERE id = ?')
      .run(achievementLevel, status, completedAt, id);
    
    // Handle activity points for milestones
    if (!wasCompleted && isNowCompleted) {
      // 完了に変更された場合はポイント付与
      db.prepare(`
        INSERT INTO activity_points (segment_id, date, points, source_type, source_id, description) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(currentMilestone.segment_id, currentMilestone.target_date, 1, 'milestone', id, 'マイルストーンの完了');
      console.log('Added 1 point for milestone completion');
    } else if (wasCompleted && !isNowCompleted) {
      // 未完了に変更された場合はポイント削除
      db.prepare(`
        DELETE FROM activity_points 
        WHERE source_type = ? AND source_id = ? AND date = ?
      `).run('milestone', id, currentMilestone.target_date);
      console.log('Removed point for milestone incompletion');
    }
    
    return updateResult;
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:getMilestones', (_, segmentId: number) => {
  try {
    return db.prepare('SELECT * FROM milestones WHERE segment_id = ? ORDER BY display_order ASC, target_date ASC').all(segmentId);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:deleteMilestone', (_, id: number) => {
  try {
    console.log('Deleting milestone with ID:', id);
    
    // Get milestone info before deletion to clean up activity points
    const milestoneInfo = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id) as any;
    if (!milestoneInfo) {
      throw new Error('Milestone not found');
    }
    
    // Delete related activity points first
    const deletedPoints = db.prepare(`
      DELETE FROM activity_points 
      WHERE source_type = ? AND source_id = ? AND date = ?
    `).run('milestone', id, milestoneInfo.target_date);
    console.log(`Deleted ${deletedPoints.changes} activity points for milestone`);
    
    // Delete the milestone
    const result = db.prepare('DELETE FROM milestones WHERE id = ?').run(id);
    console.log('Deleted milestone:', result.changes);
    
    return result;
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createMilestone', (_, segmentId: number, title: string, targetDate: string) => {
  try {
    // Get the highest display_order for this segment
    const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM milestones WHERE segment_id = ?').get(segmentId) as { max_order: number | null } | undefined;
    const nextOrder = (maxOrder?.max_order || 0) + 1;
    return db.prepare('INSERT INTO milestones (segment_id, title, target_date, display_order) VALUES (?, ?, ?, ?)').run(segmentId, title, targetDate, nextOrder);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:getDiscussionItems', (_, segmentId: number) => {
  try {
    return db.prepare('SELECT * FROM discussion_items WHERE segment_id = ? ORDER BY display_order ASC, created_at DESC').all(segmentId);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createDiscussionItem', (_, segmentId: number, content: string) => {
  try {
    // Get the highest display_order for this segment
    const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM discussion_items WHERE segment_id = ?').get(segmentId) as { max_order: number | null } | undefined;
    const nextOrder = (maxOrder?.max_order || 0) + 1;
    return db.prepare('INSERT INTO discussion_items (segment_id, content, display_order) VALUES (?, ?, ?)').run(segmentId, content, nextOrder);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:calculateAndSaveEvaluation', (_, segmentId: number, date: string) => {
  console.log('=== IPC Handler db:calculateAndSaveEvaluation called ===');
  console.log('Parameters:', { segmentId, date });
  try {
    console.log('Calculating evaluation for segment:', segmentId, 'date:', date);
    
    // Get milestone statistics (all milestones for this segment up to date)
    const milestones = db.prepare('SELECT * FROM milestones WHERE segment_id = ? AND target_date <= ?').all(segmentId, date);
    console.log('Found milestones:', milestones);
    
    // Calculate milestone achievement rate
    const evaluatedMilestones = milestones.filter((m: any) => m.achievement_level !== 'pending');
    const milestonePoints = evaluatedMilestones.reduce((sum: number, m: any) => {
      if (m.achievement_level === 'achieved') return sum + 1;
      return sum; // pending = 0 points
    }, 0);
    const milestoneAchievementRate = evaluatedMilestones.length > 0 ? milestonePoints / evaluatedMilestones.length : 0;
    
    // Get daily todos (last 30 days for comprehensive view)
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 29); // Last 30 days including today
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const dailyTodos = db.prepare('SELECT * FROM todos WHERE segment_id = ? AND type = ? AND date >= ? AND date <= ?').all(segmentId, 'daily', startDateStr, date);
    console.log('Found daily todos for date range', startDateStr, 'to', date, ':', dailyTodos);
    
    // Calculate daily todo achievement rate
    const evaluatedDailyTodos = dailyTodos.filter((t: any) => t.achievement_level !== 'pending');
    const dailyTodoPoints = evaluatedDailyTodos.reduce((sum: number, t: any) => {
      if (t.achievement_level === 'achieved') return sum + 1;
      return sum; // not_achieved = 0 points
    }, 0);
    const dailyTodoAchievementRate = evaluatedDailyTodos.length > 0 ? dailyTodoPoints / evaluatedDailyTodos.length : 0;
    
    // Get weekly todos (last 30 days for comprehensive view)
    const weeklyTodos = db.prepare('SELECT * FROM todos WHERE segment_id = ? AND type = ? AND date >= ? AND date <= ?').all(segmentId, 'weekly', startDateStr, date);
    console.log('Found weekly todos for date range', startDateStr, 'to', date, ':', weeklyTodos);
    
    // Calculate weekly todo achievement rate
    const evaluatedWeeklyTodos = weeklyTodos.filter((t: any) => t.achievement_level !== 'pending');
    const weeklyTodoPoints = evaluatedWeeklyTodos.reduce((sum: number, t: any) => {
      if (t.achievement_level === 'achieved') return sum + 1;
      return sum; // pending = 0 points
    }, 0);
    const weeklyTodoAchievementRate = evaluatedWeeklyTodos.length > 0 ? weeklyTodoPoints / evaluatedWeeklyTodos.length : 0;
    
    // Calculate activity volume from activity_points table (our new point system)
    const activityPointsQuery = db.prepare('SELECT SUM(points) as total FROM activity_points WHERE segment_id = ? AND date >= ? AND date <= ?');
    const activityPointsResult = activityPointsQuery.get(segmentId, startDateStr, date) as { total: number | null };
    const totalActivityPoints = activityPointsResult.total || 0;
    console.log('Activity points from activity_points table:', totalActivityPoints);
    
    // Calculate task validity (on-time completion rate) - include weekly todos
    const allTasks = [...milestones, ...dailyTodos, ...weeklyTodos];
    
    console.log('=== TASK VALIDITY DEBUG ===');
    console.log('All tasks count:', allTasks.length);
    console.log('All tasks:', allTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      achievement_level: t.achievement_level,
      completed_at: t.completed_at,
      target_date: t.target_date || t.date,
      type: t.type || 'milestone'
    })));
    
    const overdueTasks = allTasks.filter((task: any) => {
      if (task.achievement_level === 'pending') return false; // Skip unevaluated
      const taskDate = task.target_date || task.date;
      const taskDeadline = new Date(taskDate);
      const completedDate = task.completed_at ? new Date(task.completed_at) : new Date();
      return completedDate > taskDeadline && task.achievement_level !== 'not_achieved';
    });
    
    const completedOnTimeTasks = allTasks.filter((task: any) => {
      if (task.achievement_level === 'pending') {
        console.log('Skipping pending task:', task.title);
        return false; // Skip unevaluated
      }
      
      const taskDate = task.target_date || task.date;
      const taskDeadlineStr = taskDate; // YYYY-MM-DD format
      const isAchieved = task.achievement_level === 'achieved' || task.achievement_level === 'partial';
      
      // Simplified: If task is evaluated as achieved/partial on the same day or before deadline, count as valid
      const isOnTime = date <= taskDeadlineStr; // Current evaluation date vs task deadline
      
      console.log('Task validity check:', {
        title: task.title,
        achievement_level: task.achievement_level,
        taskDeadline: taskDeadlineStr,
        evaluationDate: date,
        isOnTime: isOnTime,
        isAchieved: isAchieved,
        isValid: isOnTime && isAchieved
      });
      
      return isOnTime && isAchieved;
    });
    
    const totalEvaluatedTasks = evaluatedMilestones.length + evaluatedDailyTodos.length + evaluatedWeeklyTodos.length;
    const taskValidity = totalEvaluatedTasks > 0 ? completedOnTimeTasks.length / totalEvaluatedTasks : 0;
    
    console.log('Task validity results:', {
      completedOnTimeTasks: completedOnTimeTasks.length,
      totalEvaluatedTasks: totalEvaluatedTasks,
      taskValidity: taskValidity,
      taskValidityPercent: Math.round(taskValidity * 100) + '%'
    });
    
    // Additional debugging: Show which tasks were considered valid
    if (completedOnTimeTasks.length > 0) {
      console.log('Valid tasks (on-time completion):');
      completedOnTimeTasks.forEach((task: any) => {
        console.log(`- ${task.title} (${task.achievement_level})`);
      });
    } else {
      console.log('No valid tasks found (all were either pending, late, or not_achieved)');
    }
    
    console.log('=== END TASK VALIDITY DEBUG ===');
    
    console.log('New Evaluation Metrics:');
    console.log('- Milestone Achievement Rate:', Math.round(milestoneAchievementRate * 100) + '%');
    console.log('- Daily Todo Achievement Rate:', Math.round(dailyTodoAchievementRate * 100) + '%');
    console.log('- Weekly Todo Achievement Rate:', Math.round(weeklyTodoAchievementRate * 100) + '%');
    console.log('- Activity Volume (Points):', totalActivityPoints, 'pts');
    console.log('- Task Validity:', Math.round(taskValidity * 100) + '%');
    
    // Save evaluation with new metrics - using consistency_score for weekly todos and total_todos for activity points
    const result = db.prepare(`INSERT OR REPLACE INTO evaluations 
       (segment_id, date, achievement_score, goal_design_score, consistency_score, 
        total_todos, completed_todos, achieved_todos, partially_achieved_todos, 
        total_milestones, completed_milestones, achieved_milestones) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(segmentId, date, milestoneAchievementRate, dailyTodoAchievementRate, weeklyTodoAchievementRate,
           Math.round(totalActivityPoints * 100), Math.round(taskValidity * 100), completedOnTimeTasks.length, totalEvaluatedTasks,
           milestones.length, evaluatedMilestones.length, Math.round(overdueTasks.length));
    
    console.log('New evaluation metrics saved to database:', result);
    
    // Return the calculated evaluation data for debugging
    return {
      success: true,
      segmentId,
      date,
      metrics: {
        milestoneAchievementRate,
        dailyTodoAchievementRate,
        weeklyTodoAchievementRate,
        totalActivityPoints,
        taskValidity
      },
      statistics: {
        totalMilestones: milestones.length,
        evaluatedMilestones: evaluatedMilestones.length,
        totalDailyTodos: dailyTodos.length,
        evaluatedDailyTodos: evaluatedDailyTodos.length,
        totalWeeklyTodos: weeklyTodos.length,
        evaluatedWeeklyTodos: evaluatedWeeklyTodos.length,
        totalActivityPoints: totalActivityPoints,
        onTimeCompletions: completedOnTimeTasks.length
      },
      result
    };
  } catch (error: any) {
    console.error('=== Error in calculateAndSaveEvaluation ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
});

// Keep the generic handler but add strict validation for backwards compatibility
ipcMain.handle('db:query', (_, sql: string, params?: any[]) => {
  try {
    // Only allow safe SELECT queries for calendar and evaluation data
    const safeSqlPatterns = [
      /^SELECT \* FROM evaluations WHERE segment_id = \? AND date >= \? AND date <= \? ORDER BY date ASC$/,
      /^SELECT \* FROM evaluations WHERE segment_id = \? ORDER BY date DESC$/,
      /^SELECT \* FROM todos WHERE segment_id = \? AND date >= \? AND date <= \?$/,
      /^SELECT \* FROM milestones WHERE segment_id = \? AND target_date >= \? AND target_date <= \?$/,
      /^SELECT \* FROM todos WHERE segment_id = \? AND date >= \? AND date <= \?$/,
      /^SELECT \* FROM milestones WHERE segment_id = \? AND target_date <= \?$/,
      /^INSERT OR REPLACE INTO evaluations/,
      /^SELECT \* FROM todos WHERE segment_id = \? AND date = \?$/,
      /^SELECT \* FROM milestones WHERE segment_id = \? AND target_date <= \?$/,
      /^SELECT \* FROM milestones WHERE segment_id = \? ORDER BY display_order ASC, target_date ASC$/,
      /^SELECT \* FROM milestones WHERE segment_id = \? ORDER BY/,
      /^INSERT INTO milestones \(segment_id, title, target_date, display_order\) VALUES \(\?, \?, \?, \?\)$/,
      /^UPDATE milestones SET status = \? WHERE id = \?$/,
      /^UPDATE milestones SET achievement_level = \?, status = \?, completed_at = \? WHERE id = \?$/,
      /^DELETE FROM milestones WHERE id = \?$/,
      /^SELECT \* FROM discussion_items WHERE segment_id = \? ORDER BY display_order ASC, created_at DESC$/,
      /^SELECT \* FROM discussion_items WHERE segment_id = \? ORDER BY/,
      /^INSERT INTO discussion_items \(segment_id, content, display_order\) VALUES \(\?, \?, \?\)$/,
      /^UPDATE discussion_items SET resolved = \?, resolved_at = \? WHERE id = \?$/,
      /^UPDATE discussion_items SET resolved = NOT resolved, resolved_at = CASE WHEN resolved = 0 THEN datetime\(\) ELSE NULL END WHERE id = \?$/,
      /^UPDATE discussion_items SET resolved = \?, resolved_at = CASE WHEN \? = 1 THEN datetime\(\) ELSE NULL END WHERE id = \?$/,
      /^DELETE FROM discussion_items WHERE id = \?$/,
      /^SELECT \* FROM discussion_memos WHERE discussion_item_id = \? ORDER BY created_at DESC$/,
      /^SELECT \* FROM discussion_memos WHERE discussion_item_id = \? ORDER BY created_at DESC LIMIT 1$/,
      /^INSERT INTO discussion_memos \(discussion_item_id, memo\) VALUES \(\?, \?\)$/,
      /^UPDATE discussion_memos SET memo = \?, created_at = datetime\(\) WHERE id = \?$/,
      /^SELECT MAX\(display_order\) as max_order FROM discussion_items WHERE segment_id = \?$/,
      /^SELECT MAX\(display_order\) as max_order FROM milestones WHERE segment_id = \?$/,
      /^SELECT MAX\(display_order\) as max_order FROM/,
      /^UPDATE todos SET completed = NOT completed WHERE id = \?$/,
      /^INSERT INTO todos \(segment_id, title, date, type, completed\) VALUES \(\?, \?, \?, \?, \?\)$/,
      /^UPDATE milestones SET display_order = \? WHERE id = \?$/,
      /^UPDATE discussion_items SET display_order = \? WHERE id = \?$/,
      /^SELECT \* FROM todos WHERE segment_id = \? ORDER BY date DESC$/,
      /^SELECT \* FROM todos WHERE segment_id = \? AND date >= \? AND date <= \? ORDER BY date DESC$/,
      // Habit todos patterns
      /^SELECT \* FROM habit_todos WHERE segment_id = \? AND active = 1 ORDER BY created_at ASC$/,
      /^SELECT \* FROM habit_todos WHERE segment_id = \? ORDER BY active DESC, created_at ASC$/,
      /^INSERT INTO habit_todos \(segment_id, title\) VALUES \(\?, \?\)$/,
      /^UPDATE habit_todos SET title = \? WHERE id = \?$/,
      /^UPDATE habit_todos SET active = 0, deactivated_at = datetime\(\) WHERE id = \?$/,
      /^UPDATE habit_todos SET active = 1, deactivated_at = NULL WHERE id = \?$/,
      /^SELECT \* FROM todos WHERE segment_id = \? AND date = \? AND is_from_habit = 1$/,
      /^SELECT MAX\(display_order\) as max_order FROM todos WHERE segment_id = \? AND date = \? AND type = \?$/,
      /^INSERT INTO todos \(segment_id, title, date, type, display_order, habit_todo_id, is_from_habit\) VALUES \(\?, \?, \?, \?, \?, \?, \?\)$/,
      /^DELETE FROM todos WHERE habit_todo_id = \?$/,
      /^DELETE FROM habit_todos WHERE id = \?$/
    ];
    
    const isAllowed = safeSqlPatterns.some(pattern => pattern.test(sql.trim()));
    if (!isAllowed) {
      throw new Error('SQL query not allowed for security reasons');
    }
    
    console.log('Executing SQL query:', sql);
    console.log('With parameters:', params);
    
    const stmt = db.prepare(sql);
    let result;
    if (sql.toLowerCase().startsWith('select')) {
      result = params ? stmt.all(...params) : stmt.all();
    } else {
      result = params ? stmt.run(...params) : stmt.run();
    }
    
    console.log('SQL query result:', result);
    return result;
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Carryover records handlers
ipcMain.handle('db:recordCarryover', (_, segmentId: number, todoId: number, title: string, originalDate: string, carriedOverDate: string) => {
  try {
    return db.prepare('INSERT INTO carryover_records (segment_id, original_todo_id, original_title, original_date, carried_over_date) VALUES (?, ?, ?, ?, ?)')
      .run(segmentId, todoId, title, originalDate, carriedOverDate);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:getCarryoverRecords', (_, segmentId: number) => {
  try {
    return db.prepare('SELECT * FROM carryover_records WHERE segment_id = ?').all(segmentId);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Habit Todos handlers
ipcMain.handle('db:getHabitTodos', (_, segmentId: number) => {
  try {
    return db.prepare('SELECT * FROM habit_todos WHERE segment_id = ? AND active = 1 ORDER BY created_at ASC').all(segmentId);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:getAllHabitTodos', (_, segmentId: number) => {
  try {
    return db.prepare('SELECT * FROM habit_todos WHERE segment_id = ? ORDER BY active DESC, created_at ASC').all(segmentId);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createHabitTodo', (_, segmentId: number, title: string) => {
  try {
    return db.prepare('INSERT INTO habit_todos (segment_id, title) VALUES (?, ?)').run(segmentId, title);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:updateHabitTodo', (_, id: number, title: string) => {
  try {
    return db.prepare('UPDATE habit_todos SET title = ? WHERE id = ?').run(title, id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:deactivateHabitTodo', (_, id: number) => {
  try {
    return db.prepare('UPDATE habit_todos SET active = 0, deactivated_at = datetime() WHERE id = ?').run(id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:reactivateHabitTodo', (_, id: number) => {
  try {
    return db.prepare('UPDATE habit_todos SET active = 1, deactivated_at = NULL WHERE id = ?').run(id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:generateHabitTodos', (_, segmentId: number, date: string) => {
  try {
    console.log('Generating habit todos for segment:', segmentId, 'date:', date);
    
    // Get active habit todos
    const habitTodos = db.prepare('SELECT * FROM habit_todos WHERE segment_id = ? AND active = 1').all(segmentId) as Array<{
      id: number;
      segment_id: number;
      title: string;
      active: boolean;
      created_at: string;
      deactivated_at: string | null;
    }>;
    console.log('Found active habit todos:', habitTodos);
    
    let generated = 0;
    let skipped = 0;
    
    for (const habitTodo of habitTodos) {
      // Check if this specific habit todo already exists for this date
      const existingTodo = db.prepare('SELECT * FROM todos WHERE segment_id = ? AND date = ? AND habit_todo_id = ?').get(segmentId, date, habitTodo.id);
      
      if (existingTodo) {
        console.log(`Habit todo ${habitTodo.id} already exists for date ${date}`);
        skipped++;
        continue;
      }
      
      // Get the highest display_order for daily todos on this date
      const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM todos WHERE segment_id = ? AND date = ? AND type = ?').get(segmentId, date, 'daily') as { max_order: number | null } | undefined;
      const nextOrder = (maxOrder?.max_order || 0) + 1;
      
      db.prepare('INSERT INTO todos (segment_id, title, date, type, display_order, habit_todo_id, is_from_habit) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        segmentId, habitTodo.title, date, 'daily', nextOrder, habitTodo.id, 1
      );
      generated++;
    }
    
    console.log('Generated habit todos:', generated, 'skipped:', skipped);
    return { generated, skipped };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Bulk delete handlers
ipcMain.handle('db:bulkDeleteMilestones', (_, segmentId: number) => {
  try {
    console.log('Bulk deleting all milestones for segment:', segmentId);
    const result = db.prepare('DELETE FROM milestones WHERE segment_id = ?').run(segmentId);
    console.log('Deleted milestones count:', result.changes);
    return { deleted: result.changes };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:bulkDeleteDiscussions', (_, segmentId: number) => {
  try {
    console.log('Bulk deleting all discussions for segment:', segmentId);
    // Delete discussion memos first (foreign key constraint)
    const memosResult = db.prepare('DELETE FROM discussion_memos WHERE discussion_item_id IN (SELECT id FROM discussion_items WHERE segment_id = ?)').run(segmentId);
    console.log('Deleted discussion memos count:', memosResult.changes);
    
    // Delete discussion items
    const discussionsResult = db.prepare('DELETE FROM discussion_items WHERE segment_id = ?').run(segmentId);
    console.log('Deleted discussions count:', discussionsResult.changes);
    
    return { 
      deletedDiscussions: discussionsResult.changes, 
      deletedMemos: memosResult.changes 
    };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:bulkDeleteTodaysUncompletedTodos', (_, segmentId: number, date: string) => {
  try {
    console.log('Bulk deleting today\'s uncompleted todos for segment:', segmentId, 'date:', date);
    const result = db.prepare('DELETE FROM todos WHERE segment_id = ? AND date = ? AND completed = 0').run(segmentId, date);
    console.log('Deleted uncompleted todos count:', result.changes);
    return { deleted: result.changes };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:bulkDeleteTodaysTodos', (_, segmentId: number, date: string) => {
  try {
    console.log('Bulk deleting all today\'s todos for segment:', segmentId, 'date:', date);
    const result = db.prepare('DELETE FROM todos WHERE segment_id = ? AND date = ?').run(segmentId, date);
    console.log('Deleted todos count:', result.changes);
    return { deleted: result.changes };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:deleteHabitTodo', (_, id: number) => {
  try {
    console.log('Deleting habit todo with ID:', id, 'and all related todos');
    
    // Delete related activity points first
    const deletedPoints = db.prepare(`
      DELETE FROM activity_points 
      WHERE source_type = ? AND source_id = ?
    `).run('habit', id);
    console.log(`Deleted ${deletedPoints.changes} activity points for habit todo`);
    
    // Delete habit todo completions
    const deletedCompletions = db.prepare('DELETE FROM habit_todo_completions WHERE habit_todo_id = ?').run(id);
    console.log('Deleted habit completions count:', deletedCompletions.changes);
    
    // Delete all todos generated from this habit todo
    const deletedTodos = db.prepare('DELETE FROM todos WHERE habit_todo_id = ?').run(id);
    console.log('Deleted todos count:', deletedTodos.changes);
    
    // Delete the habit todo itself
    const deletedHabit = db.prepare('DELETE FROM habit_todos WHERE id = ?').run(id);
    console.log('Deleted habit todo:', deletedHabit.changes);
    
    return { 
      deletedHabitTodos: deletedHabit.changes,
      deletedRelatedTodos: deletedTodos.changes,
      deletedActivityPoints: deletedPoints.changes
    };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Habit todo completion handlers
ipcMain.handle('db:getHabitTodoCompletions', (_, segmentId: number, date: string) => {
  try {
    console.log('Getting habit todo completions for segment:', segmentId, 'date:', date);
    return db.prepare(`
      SELECT htc.*, ht.title
      FROM habit_todo_completions htc
      JOIN habit_todos ht ON htc.habit_todo_id = ht.id
      WHERE htc.segment_id = ? AND htc.date = ?
    `).all(segmentId, date);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:toggleHabitTodoCompletion', (_, habitTodoId: number, segmentId: number, date: string) => {
  try {
    console.log('Toggling habit todo completion:', { habitTodoId, segmentId, date });
    
    // Check if completion record exists
    const existing = db.prepare('SELECT * FROM habit_todo_completions WHERE habit_todo_id = ? AND date = ?').get(habitTodoId, date) as { completed: number } | undefined;
    const wasCompleted = existing ? existing.completed === 1 : false;
    
    let newCompleted: boolean;
    let completionResult: any;
    
    if (existing) {
      // Toggle existing record
      const newCompletedValue = existing.completed ? 0 : 1;
      completionResult = db.prepare(`
        UPDATE habit_todo_completions 
        SET completed = ?, completed_at = CASE WHEN ? = 1 THEN datetime('now', 'localtime') ELSE NULL END
        WHERE habit_todo_id = ? AND date = ?
      `).run(newCompletedValue, newCompletedValue, habitTodoId, date);
      
      newCompleted = newCompletedValue === 1;
    } else {
      // Create new completion record (default to completed = true)
      completionResult = db.prepare(`
        INSERT INTO habit_todo_completions (habit_todo_id, segment_id, date, completed, completed_at)
        VALUES (?, ?, ?, 1, datetime('now', 'localtime'))
      `).run(habitTodoId, segmentId, date);
      
      newCompleted = true;
    }
    
    // Handle activity points
    if (!wasCompleted && newCompleted) {
      // 完了に変更された場合はポイント付与
      db.prepare(`
        INSERT INTO activity_points (segment_id, date, points, source_type, source_id, description) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(segmentId, date, 1, 'habit', habitTodoId, '習慣todoの完了');
      console.log('Added 1 point for habit todo completion');
    } else if (wasCompleted && !newCompleted) {
      // 未完了に変更された場合はポイント削除
      db.prepare(`
        DELETE FROM activity_points 
        WHERE source_type = ? AND source_id = ? AND date = ?
      `).run('habit', habitTodoId, date);
      console.log('Removed point for habit todo incompletion');
    }
    
    return { 
      completed: newCompleted,
      changes: completionResult.changes
    };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Get todos with correct habit completion status for history
ipcMain.handle('db:getAllTodosWithCompletions', (_, segmentId: number) => {
  try {
    console.log('Getting all todos with habit completions for segment:', segmentId);
    
    // Get today's date first
    const today = logDateDebug('getAllTodosWithCompletions');
    
    // Debug: Check habit_todo_completions table
    const completionsDebug = db.prepare('SELECT * FROM habit_todo_completions WHERE segment_id = ?').all(segmentId);
    console.log('Debug - All habit_todo_completions for segment:', completionsDebug);
    
    // Debug: Check today's specific completions
    const todayCompletions = db.prepare('SELECT * FROM habit_todo_completions WHERE segment_id = ? AND date = ?').all(segmentId, today);
    console.log('Debug - Today\'s habit_todo_completions:', todayCompletions);
    
    // Get date range (past 3 months to future 1 month)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    
    const startDate = threeMonthsAgo.toISOString().split('T')[0];
    const endDate = oneMonthLater.toISOString().split('T')[0];
    
    // Debug the JOIN query step by step
    console.log('Debug - Checking JOIN query for today...');
    const joinDebug = db.prepare(`
      SELECT 
        t.id, t.title, t.habit_todo_id, t.date, t.completed as t_completed,
        htc.habit_todo_id as htc_habit_id, htc.date as htc_date, htc.completed as htc_completed
      FROM todos t
      LEFT JOIN habit_todo_completions htc ON t.habit_todo_id = htc.habit_todo_id AND t.date = htc.date
      WHERE t.segment_id = ? AND t.date = ? AND t.habit_todo_id IS NOT NULL
    `).all(segmentId, today);
    console.log('Debug - JOIN result for today\'s habit todos:', joinDebug);
    
    // Debug: Find habit todos with missing completions
    const habitTodosWithoutCompletions = joinDebug.filter((row: any) => row.htc_completed === null);
    if (habitTodosWithoutCompletions.length > 0) {
      console.log('⚠️  Habit todos without completion records for today:', habitTodosWithoutCompletions.map((r: any) => ({
        todo_id: r.id,
        habit_todo_id: r.habit_todo_id,
        title: r.title
      })));
    }
    
    // Query that joins todos with habit_todo_completions to get actual completion status
    const result = db.prepare(`
      SELECT 
        t.id,
        t.segment_id,
        t.title,
        t.date,
        t.type,
        t.display_order,
        t.created_at,
        t.achievement_level,
        t.habit_todo_id,
        t.is_from_habit,
        CASE 
          WHEN t.habit_todo_id IS NOT NULL THEN COALESCE(htc.completed, 0)
          ELSE t.completed
        END as completed,
        CASE 
          WHEN t.habit_todo_id IS NOT NULL AND htc.completed = 1 THEN htc.completed_at
          WHEN t.habit_todo_id IS NULL AND t.completed = 1 THEN t.completed_at
          ELSE NULL
        END as completed_at
      FROM todos t
      LEFT JOIN habit_todo_completions htc ON t.habit_todo_id = htc.habit_todo_id AND t.date = htc.date
      WHERE t.segment_id = ? AND t.date >= ? AND t.date <= ?
      ORDER BY t.date DESC
    `).all(segmentId, startDate, endDate);
    
    console.log('Retrieved todos with habit completions:', result.length);
    console.log('Sample todos with completions:', result.slice(0, 3).map((r: any) => ({
      id: r.id,
      title: r.title,
      habit_todo_id: r.habit_todo_id,
      is_from_habit: r.is_from_habit,
      completed: r.completed,
      date: r.date
    })));
    
    // Final verification: Check if habit todos have correct completion status
    const todayHabitTodos = result.filter((r: any) => r.habit_todo_id && r.date === today);
    console.log('✅ Today\'s habit todos with final completion status:', todayHabitTodos.map((r: any) => ({
      todo_id: r.id,
      habit_todo_id: r.habit_todo_id,
      title: r.title,
      completed: r.completed,
      date: r.date
    })));
    
    return result;
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Toggle Todo with point handling
ipcMain.handle('db:toggleTodo', (_, id: number) => {
  try {
    console.log('Toggling todo:', id);
    
    // Get current todo state
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as any;
    if (!todo) {
      throw new Error('Todo not found');
    }
    
    const wasCompleted = todo.completed === 1;
    
    // Toggle completion status
    const toggleResult = db.prepare('UPDATE todos SET completed = NOT completed WHERE id = ?').run(id);
    
    // Handle activity points
    if (!wasCompleted) {
      // 完了に変更された場合はポイント付与
      const description = todo.type === 'weekly' ? '週次タスクの完了' : '日次タスクの完了';
      db.prepare(`
        INSERT INTO activity_points (segment_id, date, points, source_type, source_id, description) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(todo.segment_id, todo.date, 1, todo.type, id, description);
      console.log('Added 1 point for todo completion');
    } else {
      // 未完了に変更された場合はポイント削除
      db.prepare(`
        DELETE FROM activity_points 
        WHERE source_type = ? AND source_id = ? AND date = ?
      `).run(todo.type, id, todo.date);
      console.log('Removed point for todo incompletion');
    }
    
    return { changes: toggleResult.changes };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Activity Points IPC handlers
ipcMain.handle('db:addActivityPoint', (_, segmentId: number, date: string, points: number, sourceType: string, sourceId: number, description: string) => {
  try {
    const result = db.prepare(`
      INSERT INTO activity_points (segment_id, date, points, source_type, source_id, description) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(segmentId, date, points, sourceType, sourceId, description);
    
    return { changes: result.changes };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:removeActivityPoints', (_, sourceType: string, sourceId: number, date: string) => {
  try {
    const result = db.prepare(`
      DELETE FROM activity_points 
      WHERE source_type = ? AND source_id = ? AND date = ?
    `).run(sourceType, sourceId, date);
    
    return { changes: result.changes };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:getTotalPoints', (_, segmentId?: number) => {
  try {
    let query = 'SELECT SUM(points) as total FROM activity_points';
    let params: any[] = [];
    
    if (segmentId) {
      query += ' WHERE segment_id = ?';
      params = [segmentId];
    }
    
    const result = db.prepare(query).get(...params) as { total: number | null };
    return result.total || 0;
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Reset evaluation data handlers
ipcMain.handle('db:resetAllEvaluations', () => {
  try {
    console.log('=== GLOBAL EVALUATION RESET STARTED ===');
    
    // Begin transaction for atomicity
    db.exec('BEGIN TRANSACTION');
    
    // 1. Delete all evaluations
    const evaluationsResult = db.prepare('DELETE FROM evaluations').run();
    console.log(`Deleted ${evaluationsResult.changes} evaluation records`);
    
    // 2. Delete all activity points
    const pointsResult = db.prepare('DELETE FROM activity_points').run();
    console.log(`Deleted ${pointsResult.changes} activity points`);
    
    // 3. Delete all todos (past task data complete removal)
    const todosResult = db.prepare('DELETE FROM todos').run();
    console.log(`Deleted ${todosResult.changes} todos completely`);
    
    // 4. Delete all milestones (past milestone data complete removal)
    const milestonesResult = db.prepare('DELETE FROM milestones').run();
    console.log(`Deleted ${milestonesResult.changes} milestones completely`);
    
    // 5. Delete all habit todos (habit todo definitions)
    const habitTodosResult = db.prepare('DELETE FROM habit_todos').run();
    console.log(`Deleted ${habitTodosResult.changes} habit todos`);
    
    // 6. Delete all habit todo completions (past completion history)
    const habitsResult = db.prepare('DELETE FROM habit_todo_completions').run();
    console.log(`Deleted ${habitsResult.changes} habit todo completions`);
    
    // 7. Delete carryover records
    const carryoverResult = db.prepare('DELETE FROM carryover_records').run();
    console.log(`Deleted ${carryoverResult.changes} carryover records`);
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log('=== GLOBAL EVALUATION RESET COMPLETED ===');
    
    return {
      success: true,
      resetCounts: {
        evaluations: evaluationsResult.changes,
        activityPoints: pointsResult.changes,
        todos: todosResult.changes,
        milestones: milestonesResult.changes,
        habitTodos: habitTodosResult.changes,
        habitCompletions: habitsResult.changes,
        carryoverRecords: carryoverResult.changes
      }
    };
  } catch (error: any) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('Database error during global reset:', error);
    throw new Error(error.message);
  }
});

// Get all incomplete tasks across all segments for carryover
ipcMain.handle('db:getAllIncompleteTasksForCarryover', () => {
  try {
    console.log('Getting all incomplete tasks for carryover');
    
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get all incomplete tasks from the past 7 days across all segments
    const incompleteTasks = db.prepare(`
      SELECT 
        t.id,
        t.segment_id,
        t.title,
        t.date,
        t.type,
        t.is_from_habit,
        s.name as segment_name,
        s.color as segment_color
      FROM todos t
      JOIN segments s ON t.segment_id = s.id
      WHERE t.completed = 0 
        AND t.date >= ? 
        AND t.date < ?
        AND t.is_from_habit = 0
        AND t.type IN ('daily', 'weekly')
      ORDER BY t.date DESC, s.name, t.title
    `).all(sevenDaysAgo, today) as Array<{
      id: number;
      segment_id: number;
      title: string;
      date: string;
      type: string;
      is_from_habit: number;
      segment_name: string;
      segment_color: string;
    }>;
    
    console.log(`Found ${incompleteTasks.length} incomplete tasks`);
    
    // Get carryover records to filter out already carried over tasks
    const carryoverRecords = db.prepare(`
      SELECT segment_id, original_title 
      FROM carryover_records 
      WHERE carried_over_date = ?
    `).all(today);
    
    const carriedOverSet = new Set(
      carryoverRecords.map((r: any) => `${r.segment_id}-${r.original_title.toLowerCase().trim()}`)
    );
    
    // Filter out duplicates and already carried over tasks
    const uniqueTasks = new Map<string, any>();
    
    for (const task of incompleteTasks) {
      const key = `${task.segment_id}-${task.title.toLowerCase().trim()}`;
      
      // Skip if already carried over today
      if (carriedOverSet.has(key)) {
        continue;
      }
      
      // Keep only the most recent task if duplicates exist
      if (!uniqueTasks.has(key) || task.date > uniqueTasks.get(key).date) {
        uniqueTasks.set(key, task);
      }
    }
    
    const result = Array.from(uniqueTasks.values());
    console.log(`Returning ${result.length} unique incomplete tasks after filtering`);
    
    return result;
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Record bulk carryover
ipcMain.handle('db:recordBulkCarryover', (_, carryoverTasks: Array<{ segmentId: number; todoId: number; title: string; originalDate: string; carriedOverDate: string }>) => {
  try {
    console.log('Recording bulk carryover for', carryoverTasks.length, 'tasks');
    console.log('Tasks to carryover:', carryoverTasks);
    
    db.exec('BEGIN TRANSACTION');
    
    const insertCarryover = db.prepare(`
      INSERT INTO carryover_records (segment_id, original_todo_id, original_title, original_date, carried_over_date) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const insertTodo = db.prepare(`
      INSERT INTO todos (segment_id, title, date, type, display_order, completed) 
      VALUES (?, ?, ?, ?, 
        (SELECT COALESCE(MAX(display_order), 0) + 1 FROM todos WHERE segment_id = ? AND date = ? AND type = ?), 
        0)
    `);
    
    for (const task of carryoverTasks) {
      console.log('Processing task:', task);
      
      // Record carryover
      const carryoverResult = insertCarryover.run(task.segmentId, task.todoId, task.title, task.originalDate, task.carriedOverDate);
      console.log('Carryover record inserted:', carryoverResult);
      
      // Create new todo for today
      // Parameters: segment_id, title, date, type, segment_id, date, type (for subquery)
      const todoResult = insertTodo.run(task.segmentId, task.title, task.carriedOverDate, 'daily', task.segmentId, task.carriedOverDate, 'daily');
      console.log('Todo inserted:', todoResult);
    }
    
    db.exec('COMMIT');
    
    console.log('Bulk carryover completed successfully');
    return { success: true, count: carryoverTasks.length };
  } catch (error: any) {
    console.error('Database error during bulk carryover:', error);
    console.error('Error details:', error.stack);
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    throw new Error(`Database error: ${error.message}`);
  }
});

ipcMain.handle('db:resetSegmentEvaluations', (_, segmentId: number) => {
  try {
    console.log(`=== SEGMENT ${segmentId} EVALUATION RESET STARTED ===`);
    
    // Begin transaction for atomicity
    db.exec('BEGIN TRANSACTION');
    
    // 1. Delete segment evaluations
    const evaluationsResult = db.prepare('DELETE FROM evaluations WHERE segment_id = ?').run(segmentId);
    console.log(`Deleted ${evaluationsResult.changes} evaluation records for segment ${segmentId}`);
    
    // 2. Delete segment activity points
    const pointsResult = db.prepare('DELETE FROM activity_points WHERE segment_id = ?').run(segmentId);
    console.log(`Deleted ${pointsResult.changes} activity points for segment ${segmentId}`);
    
    // 3. Delete segment todos (past task data complete removal)
    const todosResult = db.prepare('DELETE FROM todos WHERE segment_id = ?').run(segmentId);
    console.log(`Deleted ${todosResult.changes} todos completely for segment ${segmentId}`);
    
    // 4. Delete segment milestones (past milestone data complete removal)
    const milestonesResult = db.prepare('DELETE FROM milestones WHERE segment_id = ?').run(segmentId);
    console.log(`Deleted ${milestonesResult.changes} milestones completely for segment ${segmentId}`);
    
    // 5. Delete segment habit todos (habit todo definitions)
    const habitTodosResult = db.prepare('DELETE FROM habit_todos WHERE segment_id = ?').run(segmentId);
    console.log(`Deleted ${habitTodosResult.changes} habit todos for segment ${segmentId}`);
    
    // 6. Delete segment habit todo completions (past completion history)
    const habitsResult = db.prepare('DELETE FROM habit_todo_completions WHERE segment_id = ?').run(segmentId);
    console.log(`Deleted ${habitsResult.changes} habit todo completions for segment ${segmentId}`);
    
    // 7. Delete segment carryover records
    const carryoverResult = db.prepare('DELETE FROM carryover_records WHERE segment_id = ?').run(segmentId);
    console.log(`Deleted ${carryoverResult.changes} carryover records for segment ${segmentId}`);
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log(`=== SEGMENT ${segmentId} EVALUATION RESET COMPLETED ===`);
    
    return {
      success: true,
      segmentId: segmentId,
      resetCounts: {
        evaluations: evaluationsResult.changes,
        activityPoints: pointsResult.changes,
        todos: todosResult.changes,
        milestones: milestonesResult.changes,
        habitTodos: habitTodosResult.changes,
        habitCompletions: habitsResult.changes,
        carryoverRecords: carryoverResult.changes
      }
    };
  } catch (error: any) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error(`Database error during segment ${segmentId} reset:`, error);
    throw new Error(error.message);
  }
});

// Bucket List IPC handlers
ipcMain.handle('db:getBucketListItems', () => {
  try {
    return db.prepare('SELECT * FROM bucket_list_items ORDER BY display_order ASC, created_at DESC').all();
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createBucketListItem', (_, title: string, description?: string) => {
  try {
    const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM bucket_list_items').get() as { max_order: number | null };
    const nextOrder = (maxOrder?.max_order || 0) + 1;
    
    return db.prepare(`
      INSERT INTO bucket_list_items (title, description, display_order) 
      VALUES (?, ?, ?)
    `).run(title, description || '', nextOrder);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:updateBucketListItem', (_, id: number, title: string, description?: string) => {
  try {
    return db.prepare(`
      UPDATE bucket_list_items 
      SET title = ?, description = ?
      WHERE id = ?
    `).run(title, description || '', id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:toggleBucketListItem', (_, id: number) => {
  try {
    // Get current state
    const item = db.prepare('SELECT completed FROM bucket_list_items WHERE id = ?').get(id) as { completed: number } | undefined;
    if (!item) {
      throw new Error('Bucket list item not found');
    }
    
    const newCompleted = item.completed === 1 ? 0 : 1;
    const completedAt = newCompleted === 1 ? new Date().toISOString() : null;
    
    return db.prepare(`
      UPDATE bucket_list_items 
      SET completed = ?, completed_at = ?
      WHERE id = ?
    `).run(newCompleted, completedAt, id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:deleteBucketListItem', (_, id: number) => {
  try {
    return db.prepare('DELETE FROM bucket_list_items WHERE id = ?').run(id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:reorderBucketListItems', (_, items: Array<{ id: number; display_order: number }>) => {
  try {
    db.exec('BEGIN TRANSACTION');
    
    const updateOrder = db.prepare('UPDATE bucket_list_items SET display_order = ? WHERE id = ?');
    
    for (const item of items) {
      updateOrder.run(item.display_order, item.id);
    }
    
    db.exec('COMMIT');
    return { success: true };
  } catch (error: any) {
    db.exec('ROLLBACK');
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Routine Events IPC handlers
ipcMain.handle('db:getRoutineEvents', () => {
  try {
    return db.prepare('SELECT * FROM routine_events ORDER BY start_time ASC, display_order ASC').all();
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createRoutineEvent', (_, title: string, startTime: string, endTime: string) => {
  try {
    const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM routine_events').get() as { max_order: number | null };
    const nextOrder = (maxOrder?.max_order || 0) + 1;
    
    return db.prepare(`
      INSERT INTO routine_events (title, start_time, end_time, display_order) 
      VALUES (?, ?, ?, ?)
    `).run(title, startTime, endTime, nextOrder);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:updateRoutineEvent', (_, id: number, title: string, startTime: string, endTime: string) => {
  try {
    return db.prepare(`
      UPDATE routine_events 
      SET title = ?, start_time = ?, end_time = ?
      WHERE id = ?
    `).run(title, startTime, endTime, id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:deleteRoutineEvent', (_, id: number) => {
  try {
    return db.prepare('DELETE FROM routine_events WHERE id = ?').run(id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:reorderRoutineEvents', (_, items: Array<{ id: number; display_order: number }>) => {
  try {
    db.exec('BEGIN TRANSACTION');
    
    const updateOrder = db.prepare('UPDATE routine_events SET display_order = ? WHERE id = ?');
    
    for (const item of items) {
      updateOrder.run(item.display_order, item.id);
    }
    
    db.exec('COMMIT');
    return { success: true };
  } catch (error: any) {
    db.exec('ROLLBACK');
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Color settings handlers
ipcMain.handle('db:getColorSettings', () => {
  try {
    return getColorSettings();
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:saveColorSettings', (_, timeRanges: Array<{ start: number; end: number; color: string; label: string }>) => {
  try {
    saveColorSettings(timeRanges);
    return { success: true };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

// Idea list items handlers
ipcMain.handle('db:getIdeaListItems', () => {
  try {
    return getIdeaListItems();
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:createIdeaListItem', (_, title: string, description?: string, referenceMaterials?: string) => {
  try {
    return createIdeaListItem(title, description, referenceMaterials);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:updateIdeaListItem', (_, id: number, title: string, description?: string, referenceMaterials?: string) => {
  try {
    return updateIdeaListItem(id, title, description, referenceMaterials);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:deleteIdeaListItem', (_, id: number) => {
  try {
    return deleteIdeaListItem(id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:reorderIdeaListItems', (_, items: Array<{ id: number; display_order: number }>) => {
  try {
    reorderIdeaListItems(items);
    return { success: true };
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});