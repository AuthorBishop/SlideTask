/**
 * 本地 SQLite 数据库初始化
 * 使用 dbReady Promise 模式，确保所有操作在 DB 就绪后执行
 */
import * as SQLite from 'expo-sqlite';

// 简易 UUID 生成（本地无需加密随机）
export function newId(): string {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 9) +
    '-' +
    Math.random().toString(36).slice(2, 9)
  );
}

// 唯一 DB 就绪 Promise，模块级单例
export const dbReady: Promise<SQLite.SQLiteDatabase> = (async () => {
  const db = await SQLite.openDatabaseAsync('tasks.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS tasks (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL DEFAULT '',
      note         TEXT NOT NULL DEFAULT '',
      color        TEXT NOT NULL DEFAULT '#6366F1',
      progress_position REAL NOT NULL DEFAULT 0,
      order_index  INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );

    CREATE TABLE IF NOT EXISTS task_nodes (
      id       TEXT PRIMARY KEY,
      task_id  TEXT NOT NULL,
      title    TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  // 迁移：若旧 DB 已有 tasks 表但无 order_index 列，补加
  const cols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(tasks)`
  );
  if (!cols.some((c) => c.name === 'order_index')) {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0`);
    // 用 rowid 初始化既有数据的 order_index，保持原有顺序
    await db.execAsync(`UPDATE tasks SET order_index = rowid WHERE order_index = 0`);
  }

  // 迁移：补加 completed_at 列（用于已完成任务功能）
  if (!cols.some((c) => c.name === 'completed_at')) {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN completed_at TEXT`);
  }

  return db;
})();
