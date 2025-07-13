import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { logger } from '../utils/logger';

let db: Database | null = null;

export async function initializeDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  try {
    logger.info('Initializing database connection...');
    
    db = await open({
      filename: process.env['DATABASE_URL'] || './data/video_analysis.db',
      driver: sqlite3.Database
    });

    // Create tables if they don't exist
    await createTables();
    
    logger.info('Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Create sessions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      rink_location_id TEXT NOT NULL,
      rink_name TEXT NOT NULL,
      rink_address TEXT NOT NULL,
      rink_livebarn_id TEXT NOT NULL,
      rink_timezone TEXT NOT NULL,
      game_date TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create comments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      text TEXT NOT NULL,
      author TEXT NOT NULL,
      game_time TEXT,
      position_x REAL,
      position_y REAL,
      color TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
  `);

  // Create video_segments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS video_segments (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      file_path TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
  `);

  // Create processing_jobs table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS processing_jobs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER NOT NULL DEFAULT 0,
      current_step TEXT NOT NULL,
      error TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
  `);

  // Create processed_videos table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS processed_videos (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      duration REAL NOT NULL,
      resolution TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
  `);

  logger.info('Database tables created successfully');
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    return await initializeDatabase();
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

// Export for convenience
export { db as database }; 