import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

export let db: Database.Database;

export const initDatabase = () => {
  const dbPath = path.join(app.getPath('userData'), 'siriustrack.db');
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS overall_purpose (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      goal TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Add goal column if it doesn't exist (for existing databases)
    PRAGMA table_info(overall_purpose);
  `);
  
  // Check if goal column exists, if not add it
  const columns = db.prepare("PRAGMA table_info(overall_purpose)").all();
  const hasGoalColumn = columns.some((col: any) => col.name === 'goal');
  if (!hasGoalColumn) {
    db.exec('ALTER TABLE overall_purpose ADD COLUMN goal TEXT');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      overall_goal TEXT,
      color TEXT DEFAULT '#6e6e73',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      segment_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      target_date DATE NOT NULL,
      status TEXT DEFAULT 'pending',
      achievement_level TEXT DEFAULT 'pending',
      display_order INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      segment_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT 0,
      achievement_level TEXT DEFAULT 'pending',
      date DATE NOT NULL,
      type TEXT DEFAULT 'daily',
      display_order INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS discussion_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      segment_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      resolved BOOLEAN DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS discussion_memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discussion_item_id INTEGER NOT NULL,
      memo TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (discussion_item_id) REFERENCES discussion_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      segment_id INTEGER NOT NULL,
      date DATE NOT NULL,
      achievement_score REAL DEFAULT 0,
      goal_design_score REAL DEFAULT 0,
      consistency_score REAL DEFAULT 0,
      total_todos INTEGER DEFAULT 0,
      completed_todos INTEGER DEFAULT 0,
      achieved_todos INTEGER DEFAULT 0,
      partially_achieved_todos INTEGER DEFAULT 0,
      total_milestones INTEGER DEFAULT 0,
      completed_milestones INTEGER DEFAULT 0,
      achieved_milestones INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
    );
  `);

  // Add missing columns to existing tables if they don't exist
  try {
    const milestoneColumns = db.prepare("PRAGMA table_info(milestones)").all();
    const hasMilestoneDisplayOrder = milestoneColumns.some((col: any) => col.name === 'display_order');
    if (!hasMilestoneDisplayOrder) {
      db.exec('ALTER TABLE milestones ADD COLUMN display_order INTEGER DEFAULT 0');
    }
    const hasMilestoneAchievement = milestoneColumns.some((col: any) => col.name === 'achievement_level');
    if (!hasMilestoneAchievement) {
      db.exec('ALTER TABLE milestones ADD COLUMN achievement_level TEXT DEFAULT "pending"');
    }
    const hasMilestoneCompletedAt = milestoneColumns.some((col: any) => col.name === 'completed_at');
    if (!hasMilestoneCompletedAt) {
      db.exec('ALTER TABLE milestones ADD COLUMN completed_at DATETIME');
    }
  } catch (error) {
    console.log('Milestone table migration skipped:', error);
  }

  try {
    const todoColumns = db.prepare("PRAGMA table_info(todos)").all();
    const hasTodoDisplayOrder = todoColumns.some((col: any) => col.name === 'display_order');
    if (!hasTodoDisplayOrder) {
      db.exec('ALTER TABLE todos ADD COLUMN display_order INTEGER DEFAULT 0');
    }
    const hasTodoAchievement = todoColumns.some((col: any) => col.name === 'achievement_level');
    if (!hasTodoAchievement) {
      db.exec('ALTER TABLE todos ADD COLUMN achievement_level TEXT DEFAULT "pending"');
    }
    const hasTodoCompletedAt = todoColumns.some((col: any) => col.name === 'completed_at');
    if (!hasTodoCompletedAt) {
      db.exec('ALTER TABLE todos ADD COLUMN completed_at DATETIME');
    }
  } catch (error) {
    console.log('Todo table migration skipped:', error);
  }

  try {
    const discussionColumns = db.prepare("PRAGMA table_info(discussion_items)").all();
    const hasDiscussionDisplayOrder = discussionColumns.some((col: any) => col.name === 'display_order');
    if (!hasDiscussionDisplayOrder) {
      db.exec('ALTER TABLE discussion_items ADD COLUMN display_order INTEGER DEFAULT 0');
    }
  } catch (error) {
    console.log('Discussion table migration skipped:', error);
  }

  // Create carryover_records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS carryover_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      segment_id INTEGER NOT NULL,
      original_todo_id INTEGER NOT NULL,
      original_title TEXT NOT NULL,
      original_date DATE NOT NULL,
      carried_over_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
    );
  `);

  // Create habit_todos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS habit_todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      segment_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deactivated_at DATETIME,
      FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
    );
  `);

  // Add habit-related columns to todos table
  try {
    const todoColumns = db.prepare("PRAGMA table_info(todos)").all();
    const hasHabitTodoId = todoColumns.some((col: any) => col.name === 'habit_todo_id');
    if (!hasHabitTodoId) {
      db.exec('ALTER TABLE todos ADD COLUMN habit_todo_id INTEGER');
    }
    const hasIsFromHabit = todoColumns.some((col: any) => col.name === 'is_from_habit');
    if (!hasIsFromHabit) {
      db.exec('ALTER TABLE todos ADD COLUMN is_from_habit BOOLEAN DEFAULT 0');
    }
  } catch (error) {
    console.log('Habit todos table migration skipped:', error);
  }

  // Create habit todo completions table for daily tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS habit_todo_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_todo_id INTEGER NOT NULL,
      segment_id INTEGER NOT NULL,
      date DATE NOT NULL,
      completed BOOLEAN DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (habit_todo_id) REFERENCES habit_todos(id) ON DELETE CASCADE,
      FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE,
      UNIQUE(habit_todo_id, date)
    );
  `);

  // Create activity points table for tracking activity points
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      segment_id INTEGER NOT NULL,
      date DATE NOT NULL,
      points INTEGER NOT NULL,
      source_type TEXT NOT NULL, -- 'daily', 'weekly', 'habit', 'milestone'
      source_id INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
    );
  `);

  // Create bucket list items table for life goals
  db.exec(`
    CREATE TABLE IF NOT EXISTS bucket_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed BOOLEAN DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create routine events table for daily schedule
  db.exec(`
    CREATE TABLE IF NOT EXISTS routine_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create color settings table for routine timeline color zones
  db.exec(`
    CREATE TABLE IF NOT EXISTS color_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      color TEXT NOT NULL,
      label TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create idea list items table for business ideas and issues
  db.exec(`
    CREATE TABLE IF NOT EXISTS idea_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      reference_materials TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// Color settings functions
export const getColorSettings = () => {
  return db.prepare('SELECT * FROM color_settings ORDER BY display_order ASC').all();
};

export const saveColorSettings = (timeRanges: Array<{ start: number; end: number; color: string; label: string }>) => {
  // Clear existing settings
  db.prepare('DELETE FROM color_settings').run();
  
  // Insert new settings
  const insertStmt = db.prepare('INSERT INTO color_settings (start_time, end_time, color, label, display_order) VALUES (?, ?, ?, ?, ?)');
  
  timeRanges.forEach((range, index) => {
    insertStmt.run(range.start, range.end, range.color, range.label, index);
  });
};

// Idea list items functions
export const getIdeaListItems = () => {
  return db.prepare('SELECT * FROM idea_list_items ORDER BY display_order ASC, created_at DESC').all();
};

export const createIdeaListItem = (title: string, description?: string, referenceMaterials?: string) => {
  const maxOrderResult = db.prepare('SELECT MAX(display_order) as max_order FROM idea_list_items').get() as { max_order: number };
  const nextOrder = (maxOrderResult.max_order || 0) + 1;
  
  return db.prepare('INSERT INTO idea_list_items (title, description, reference_materials, display_order) VALUES (?, ?, ?, ?)').run(
    title,
    description || null,
    referenceMaterials || null,
    nextOrder
  );
};

export const updateIdeaListItem = (id: number, title: string, description?: string, referenceMaterials?: string) => {
  return db.prepare('UPDATE idea_list_items SET title = ?, description = ?, reference_materials = ? WHERE id = ?').run(
    title,
    description || null,
    referenceMaterials || null,
    id
  );
};

export const deleteIdeaListItem = (id: number) => {
  return db.prepare('DELETE FROM idea_list_items WHERE id = ?').run(id);
};

export const reorderIdeaListItems = (items: Array<{ id: number; display_order: number }>) => {
  const updateStmt = db.prepare('UPDATE idea_list_items SET display_order = ? WHERE id = ?');
  
  items.forEach(item => {
    updateStmt.run(item.display_order, item.id);
  });
};