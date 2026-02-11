import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { crawlDaangn } from './crawler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Search API - regions는 대표동ID 리스트 (쉼표 구분)
app.get('/api/search', async (req, res) => {
  try {
    const { query, regions, category, minPrice, maxPrice } = req.query;
    if (!query || !regions) {
      return res.status(400).json({ error: 'query와 regions 필수' });
    }

    const regionList = regions.split(',');
    const cacheKey = `${query}-${regions}-${category||''}-${minPrice||''}-${maxPrice|''}`;
    
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return res.json(cached.data);
      }
      cache.delete(cacheKey);
    }

    const results = await crawlDaangn(query, regionList, { category, minPrice, maxPrice });
    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
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
      "성남시 분당구": "정자동-1339",
      "성남시 수정구": "수진동-4513",
      "용인시 기흥구": "구갈동-1679",
      "용인시 수지구": "동천동-1694",
      "수원시 영통구": "영통동-4537",
      "고양시 일산동구": "백석동-2291",
      "부천시": "중동-1420",
      "하남시": "신장동-4820",
      "파주시": "운정동-5541",
      "판교": "판교동-1350"
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
