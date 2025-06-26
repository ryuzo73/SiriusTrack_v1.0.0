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
};