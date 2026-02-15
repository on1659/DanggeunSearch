import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB 파일 경로
const dbPath = path.join(__dirname, 'search_logs.db');
const db = new Database(dbPath);

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS search_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    query TEXT NOT NULL,
    regions TEXT,
    region_count INTEGER,
    result_count INTEGER,
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Database initialized:', dbPath);

// 검색 기록 저장
export function logSearch(data) {
  const stmt = db.prepare(`
    INSERT INTO search_logs (user_name, query, regions, region_count, result_count, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(
      data.userName || 'Anonymous',
      data.query,
      JSON.stringify(data.regions),
      data.regionCount,
      data.resultCount,
      data.ipAddress
    );
    console.log(`📝 Search logged: ID=${result.lastInsertRowid}, query="${data.query}"`);
    return result.lastInsertRowid;
  } catch (error) {
    console.error('Error logging search:', error);
    return null;
  }
}

// 최근 검색 기록 조회
export function getRecentSearches(limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM search_logs
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

// 인기 검색어 조회
export function getPopularSearches(limit = 10) {
  const stmt = db.prepare(`
    SELECT query, COUNT(*) as count
    FROM search_logs
    WHERE query != ''
    GROUP BY query
    ORDER BY count DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

// 사용자별 검색 기록
export function getUserSearches(userName, limit = 20) {
  const stmt = db.prepare(`
    SELECT * FROM search_logs
    WHERE user_name = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  return stmt.all(userName, limit);
}

export default db;
