import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB 파일 경로
const dbPath = path.join(__dirname, 'search_logs.db');
const db = new Database(dbPath);

// 테이블 생성 (각각 개별 실행)
try {
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
} catch (e) { console.error('search_logs table error:', e); }

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clicked_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      item_link TEXT NOT NULL,
      item_title TEXT,
      item_price TEXT,
      item_location TEXT,
      item_thumbnail TEXT,
      item_status TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_name, item_link)
    )
  `);
} catch (e) { console.error('clicked_items table error:', e); }

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      item_link TEXT NOT NULL,
      item_title TEXT,
      item_price TEXT,
      item_location TEXT,
      item_thumbnail TEXT,
      item_status TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_name, item_link)
    )
  `);
} catch (e) { console.error('bookmarks table error:', e); }

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) { console.error('login_logs table error:', e); }

// 생성된 테이블 확인
const createdTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('✅ Database initialized:', dbPath);
console.log('📊 Tables:', createdTables.map(t => t.name).join(', '));

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

// 클릭한 아이템 저장 (최대 30개 유지)
export function saveClickedItem(userName, item) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO clicked_items 
      (user_name, item_link, item_title, item_price, item_location, item_thumbnail, item_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userName, item.link, item.title, item.price, item.location, item.thumbnail, item.status);

    // 30개 초과 시 오래된 것 삭제
    const deleteStmt = db.prepare(`
      DELETE FROM clicked_items 
      WHERE user_name = ? 
      AND id NOT IN (
        SELECT id FROM clicked_items 
        WHERE user_name = ? 
        ORDER BY timestamp DESC 
        LIMIT 30
      )
    `);
    deleteStmt.run(userName, userName);
    return true;
  } catch (error) {
    console.error('Error saving clicked item:', error);
    return false;
  }
}

// 클릭 기록 조회
export function getClickedItems(userName, limit = 30) {
  const stmt = db.prepare(`
    SELECT * FROM clicked_items
    WHERE user_name = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  return stmt.all(userName, limit);
}

// 북마크 추가
export function addBookmark(userName, item) {
  try {
    // 이미 10개면 추가 불가
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM bookmarks WHERE user_name = ?');
    const { count } = countStmt.get(userName);
    if (count >= 10) {
      return { success: false, error: '북마크는 최대 10개까지 저장할 수 있습니다' };
    }

    const stmt = db.prepare(`
      INSERT INTO bookmarks 
      (user_name, item_link, item_title, item_price, item_location, item_thumbnail, item_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userName, item.link, item.title, item.price, item.location, item.thumbnail, item.status);
    return { success: true };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return { success: false, error: '이미 북마크에 추가된 항목입니다' };
    }
    console.error('Error adding bookmark:', error);
    return { success: false, error: error.message };
  }
}

// 북마크 삭제
export function removeBookmark(userName, itemLink) {
  try {
    const stmt = db.prepare('DELETE FROM bookmarks WHERE user_name = ? AND item_link = ?');
    stmt.run(userName, itemLink);
    return { success: true };
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return { success: false, error: error.message };
  }
}

// 북마크 목록 조회
export function getBookmarks(userName) {
  const stmt = db.prepare(`
    SELECT * FROM bookmarks
    WHERE user_name = ?
    ORDER BY timestamp DESC
    LIMIT 10
  `);
  return stmt.all(userName);
}

// 북마크 여부 확인
export function isBookmarked(userName, itemLink) {
  const stmt = db.prepare('SELECT id FROM bookmarks WHERE user_name = ? AND item_link = ?');
  return stmt.get(userName, itemLink) !== undefined;
}

// 로그인 기록 저장
export function logLogin(userName, ipAddress) {
  try {
    const stmt = db.prepare(`
      INSERT INTO login_logs (user_name, ip_address)
      VALUES (?, ?)
    `);
    const result = stmt.run(userName, ipAddress);
    console.log(`📝 Login logged: ${userName} from ${ipAddress}`);
    return result.lastInsertRowid;
  } catch (error) {
    console.error('Error logging login:', error);
    return null;
  }
}

// 로그인 기록 조회
export function getLoginLogs(userName, limit = 10) {
  const stmt = db.prepare(`
    SELECT * FROM login_logs
    WHERE user_name = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  return stmt.all(userName, limit);
}

export default db;
