import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDatabase, db } from './database';

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
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  
  // Open DevTools in development
  mainWindow.webContents.openDevTools();

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
    return db.prepare('SELECT * FROM todos WHERE segment_id = ? AND date = ? ORDER BY display_order ASC, created_at ASC').all(segmentId, date);
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

ipcMain.handle('db:updateTodoAchievement', (_, id: number, achievementLevel: string) => {
  try {
    const completedAt = achievementLevel !== 'pending' ? new Date().toISOString() : null;
    const completed = (achievementLevel === 'achieved' || achievementLevel === 'partial') ? 1 : 0;
    return db.prepare('UPDATE todos SET achievement_level = ?, completed = ?, completed_at = ? WHERE id = ?')
      .run(achievementLevel, completed, completedAt, id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:deleteTodo', (_, id: number) => {
  try {
    return db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  } catch (error: any) {
    console.error('Database error:', error);
    throw new Error(error.message);
  }
});

ipcMain.handle('db:updateMilestoneAchievement', (_, id: number, achievementLevel: string) => {
  try {
    const completedAt = achievementLevel !== 'pending' ? new Date().toISOString() : null;
    const status = (achievementLevel === 'achieved' || achievementLevel === 'partial') ? 'completed' : 'pending';
    return db.prepare('UPDATE milestones SET achievement_level = ?, status = ?, completed_at = ? WHERE id = ?')
      .run(achievementLevel, status, completedAt, id);
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
      if (m.achievement_level === 'partial') return sum + 0.5;
      return sum; // not_achieved = 0 points
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
      if (t.achievement_level === 'partial') return sum + 0.5;
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
      if (t.achievement_level === 'partial') return sum + 0.5;
      return sum; // not_achieved = 0 points
    }, 0);
    const weeklyTodoAchievementRate = evaluatedWeeklyTodos.length > 0 ? weeklyTodoPoints / evaluatedWeeklyTodos.length : 0;
    
    // Calculate activity volume as total points earned (milestone + todo points)
    const totalActivityPoints = milestonePoints + dailyTodoPoints + weeklyTodoPoints;
    console.log('Activity points breakdown:', { milestonePoints, dailyTodoPoints, weeklyTodoPoints, totalActivityPoints });
    
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
      /^UPDATE discussion_items SET display_order = \? WHERE id = \?$/
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