import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { crawlDaangn } from './crawler.js';
import { 
  logSearch, 
  getRecentSearches, 
  getPopularSearches, 
  getUserSearches,
  saveClickedItem,
  getClickedItems,
  addBookmark,
  removeBookmark,
  getBookmarks
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Cache (30분)
const cache = new Map();
const CACHE_DURATION = 30 * 60 * 1000;

// Rate limit: IP당 분당 5회
const rateLimitMap = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, [now]);
    return true;
  }
  const timestamps = rateLimitMap.get(ip).filter(t => now - t < RATE_WINDOW);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// 주기적으로 오래된 rate limit 데이터 정리
setInterval(() => {
  const now = Date.now();
  for (const [ip, ts] of rateLimitMap) {
    const valid = ts.filter(t => now - t < RATE_WINDOW);
    if (valid.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, valid);
  }
}, 60000);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Search API
app.get('/api/search', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.ip;
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: '검색 횟수 초과! 1분에 5회까지 가능합니다.' });
    }

    const { query, regions, category, minPrice, maxPrice, userName } = req.query;
    if (!query || !regions) {
      return res.status(400).json({ error: 'query와 regions 필수' });
    }

    const regionList = regions.split(',');
    const cacheKey = `${query}-${regions}-${category||''}-${minPrice||''}-${maxPrice||''}`;

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        // 캐시된 결과도 로그에 기록
        logSearch({
          userName: userName,
          query: query,
          regions: regionList,
          regionCount: regionList.length,
          resultCount: cached.data.totalItems,
          ipAddress: ip
        });
        return res.json(cached.data);
      }
      cache.delete(cacheKey);
    }

    const results = await crawlDaangn(query, regionList, { category, minPrice, maxPrice });
    cache.set(cacheKey, { data: results, timestamp: Date.now() });

    // 검색 기록 저장
    logSearch({
      userName: userName,
      query: query,
      regions: regionList,
      regionCount: regionList.length,
      resultCount: results.totalItems,
      ipAddress: ip
    });

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 검색 기록 API
app.get('/api/search-logs/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = getRecentSearches(limit);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching recent searches:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search-logs/popular', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const popular = getPopularSearches(limit);
    res.json(popular);
  } catch (error) {
    console.error('Error fetching popular searches:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search-logs/user/:userName', (req, res) => {
  try {
    const { userName } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const logs = getUserSearches(userName, limit);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching user searches:', error);
    res.status(500).json({ error: error.message });
  }
});

// 클릭한 아이템 저장 API
app.post('/api/clicked-items', (req, res) => {
  try {
    const { userName, item } = req.body;
    if (!userName || !item) {
      return res.status(400).json({ error: 'userName과 item 필수' });
    }
    const result = saveClickedItem(userName, item);
    res.json({ success: result });
  } catch (error) {
    console.error('Error saving clicked item:', error);
    res.status(500).json({ error: error.message });
  }
});

// 클릭 기록 조회 API
app.get('/api/clicked-items/:userName', (req, res) => {
  try {
    const { userName } = req.params;
    const items = getClickedItems(userName);
    res.json(items);
  } catch (error) {
    console.error('Error fetching clicked items:', error);
    res.status(500).json({ error: error.message });
  }
});

// 북마크 추가 API
app.post('/api/bookmarks', (req, res) => {
  try {
    const { userName, item } = req.body;
    if (!userName || !item) {
      return res.status(400).json({ error: 'userName과 item 필수' });
    }
    const result = addBookmark(userName, item);
    res.json(result);
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

// 북마크 삭제 API
app.delete('/api/bookmarks/:userName/:itemLink', (req, res) => {
  try {
    const { userName, itemLink } = req.params;
    const result = removeBookmark(userName, decodeURIComponent(itemLink));
    res.json(result);
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ error: error.message });
  }
});

// 북마크 목록 조회 API
app.get('/api/bookmarks/:userName', (req, res) => {
  try {
    const { userName } = req.params;
    const bookmarks = getBookmarks(userName);
    res.json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Regions API - 구 단위, 대표동 1개씩
app.get('/api/regions', (req, res) => {
  // { "시도": { "구": "대표동-ID" } }
  // 구 선택하면 이 대표동 ID로 검색 → 당근이 구 전체 결과 보여줌
  const regions = {
    "서울특별시": {
      "강남구": "역삼동-6035",
      "강동구": "천호동-6044",
      "강북구": "수유동-6046",
      "강서구": "화곡동-6057",
      "관악구": "봉천동-6058",
      "광진구": "구의동-6059",
      "구로구": "구로동-6064",
      "금천구": "가산동-295",
      "노원구": "상계동-6073",
      "도봉구": "창동-6080",
      "동대문구": "전농동-6086",
      "동작구": "사당동-6091",
      "마포구": "합정동-231",
      "서대문구": "연희동-211",
      "서초구": "서초동-6128",
      "성동구": "성수동2가-6141",
      "성북구": "길음동-6145",
      "송파구": "잠실동-6188",
      "양천구": "목동-6190",
      "영등포구": "여의도동-6216",
      "용산구": "이태원동-6245",
      "은평구": "응암동-6257",
      "종로구": "혜화동-14",
      "중구": "신당동-28",
      "중랑구": "면목동-6407"
    },
    "경기도": {
      // 수원시
      "수원시 장안구": "조원동-4524",
      "수원시 권선구": "권선동-4525",
      "수원시 팔달구": "매교동-4526",
      "수원시 영통구": "영통동-4537",
      // 성남시
      "성남시 수정구": "수진동-4513",
      "성남시 중원구": "상대원동-4514",
      "성남시 분당구": "정자동-1339",
      // 용인시
      "용인시 처인구": "김량장동-1656",
      "용인시 기흥구": "구갈동-1679",
      "용인시 수지구": "동천동-1694",
      // 고양시
      "고양시 덕양구": "화정동-2285",
      "고양시 일산동구": "백석동-2291",
      "고양시 일산서구": "주엽동-2292",
      // 안양시
      "안양시 만안구": "안양동-4502",
      "안양시 동안구": "비산동-4503",
      // 안산시
      "안산시 상록구": "본오동-4504",
      "안산시 단원구": "고잔동-4505",
      // 기타 시
      "의정부시": "의정부동-2275",
      "광명시": "광명동-4506",
      "평택시": "평택동-4562",
      "동두천시": "생연동-4563",
      "과천시": "중앙동-4564",
      "구리시": "인창동-4565",
      "남양주시": "다산동-4566",
      "오산시": "오산동-4567",
      "시흥시": "정왕동-4568",
      "군포시": "산본동-4569",
      "의왕시": "내손동-4570",
      "이천시": "중리동-4571",
      "안성시": "안성동-4572",
      "김포시": "장기동-4573",
      "화성시": "동탄동-4574",
      "광주시": "경안동-4575",
      "양주시": "회천동-4576",
      "포천시": "포천동-4577",
      "여주시": "여주동-4578",
      "부천시": "중동-1420",
      "하남시": "신장동-4820",
      "파주시": "운정동-5541",
      // 군
      "연천군": "연천읍-4579",
      "가평군": "가평읍-4580",
      "양평군": "양평읍-4581"
    }
  };
  res.json(regions);
});

// SPA fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
