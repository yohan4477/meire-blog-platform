import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { join } from 'path';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getConnection(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!db) {
    const dbPath = join(process.cwd(), 'database.db');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }
  return db;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const conn = await getConnection();
  const rows = await conn.all(sql, params || []);
  return rows as T[];
}

export async function closeConnection(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}