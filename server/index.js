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
      "강남구": "역삼동-5980",
      "강동구": "천호동-6065",
      "강북구": "수유동-6067",
      "강서구": "화곡동-6079",
      "관악구": "신림동-6088",
      "광진구": "구의동-6059",
      "구로구": "구로동-6100",
      "금천구": "가산동-6107",
      "노원구": "상계동-6110",
      "도봉구": "창동-6113",
      "동대문구": "전농동-6116",
      "동작구": "사당동-6119",
      "마포구": "합정동-6122",
      "서대문구": "연희동-6125",
      "서초구": "서초동-6128",
      "성동구": "성수동-6131",
      "성북구": "길음동-6134",
      "송파구": "잠실동-6137",
      "양천구": "목동-6140",
      "영등포구": "여의도동-6143",
      "용산구": "이태원동-6146",
      "은평구": "응암동-6149",
      "종로구": "종로동-6152",
      "중구": "명동-6155",
      "중랑구": "면목동-6158"
    },
    "경기도": {
      "성남시 분당구": "정자동-1234",
      "성남시 수정구": "단대동-1240",
      "성남시 중원구": "상대원동-1244",
      "용인시 기흥구": "구갈동-1248",
      "용인시 수지구": "동천동-1254",
      "수원시 영통구": "영통동-1260",
      "수원시 팔달구": "인계동-1263",
      "고양시 일산동구": "백석동-1266",
      "고양시 일산서구": "주엽동-1269",
      "부천시": "중동-1272",
      "안양시": "범계동-1275",
      "하남시": "신장동-1278",
      "광명시": "철산동-1281",
      "의정부시": "의정부동-1284",
      "파주시": "운정동-1287",
      "김포시": "장기동-1290"
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
