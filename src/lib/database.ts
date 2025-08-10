import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'meire_blog',
  charset: 'utf8mb4',
  timezone: '+00:00'
};

let connection: mysql.Connection | null = null;

export async function getConnection(): Promise<mysql.Connection> {
  if (!connection) {
    connection = await mysql.createConnection(dbConfig);
  }
  return connection;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const conn = await getConnection();
  const [rows] = await conn.execute(sql, params || []);
  return rows as T[];
}

export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.end();
    connection = null;
  }
}