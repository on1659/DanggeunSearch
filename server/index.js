import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { crawlDaangn } from './crawler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// In-memory cache for search results (5 minutes)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Search API endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { query, regions, category, minPrice, maxPrice } = req.query;
    
    if (!query || !regions) {
      return res.status(400).json({ error: 'Query and regions are required' });
    }

    const regionList = regions.split(',');
    const cacheKey = `${query}-${regions}-${category || ''}-${minPrice || ''}-${maxPrice || ''}`;
    
    // Check cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Returning cached result for:', cacheKey);
        return res.json(cached.data);
      } else {
        cache.delete(cacheKey);
      }
    }

    console.log('Searching for:', query, 'in regions:', regionList);
    
    const results = await crawlDaangn(query, regionList, {
      category,
      minPrice,
      maxPrice
    });

    // Cache the results
    cache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// Get available regions
app.get('/api/regions', (req, res) => {
  // Seoul districts and major Gyeonggi areas
  const regions = {
    "서울특별시": {
      "강남구": {
        "개포동": "개포동-5971",
        "논현동": "논현동-5973", 
        "대치동": "대치동-5974",
        "도곡동": "도곡동-5975",
        "삼성동": "삼성동-5976",
        "세곡동": "세곡동-5977",
        "신사동": "신사동-5978",
        "압구정동": "압구정동-5979",
        "역삼동": "역삼동-5980",
        "일원동": "일원동-5981",
        "청담동": "청담동-5982"
      },
      "강동구": {
        "강일동": "강일동-6055",
        "고덕동": "고덕동-6056",
        "길동": "길동-6057",
        "둔촌동": "둔촌동-6058",
        "명일동": "명일동-6061",
        "상일동": "상일동-6062",
        "성내동": "성내동-6063",
        "암사동": "암사동-6064",
        "천호동": "천호동-6065"
      },
      "강북구": {
        "번동": "번동-6066",
        "수유동": "수유동-6067",
        "우이동": "우이동-6068"
      },
      "강서구": {
        "가양동": "가양동-6069",
        "개화동": "개화동-6070",
        "공항동": "공항동-6071",
        "과해동": "과해동-6072",
        "내발산동": "내발산동-6073",
        "등촌동": "등촌동-6074",
        "마곡동": "마곡동-6075",
        "방화동": "방화동-6076",
        "염창동": "염창동-6077",
        "외발산동": "외발산동-6078",
        "화곡동": "화곡동-6079"
      },
      "관악구": {
        "낙성대동": "낙성대동-6080",
        "남현동": "남현동-6081",
        "대학동": "대학동-6082",
        "도림동": "도림동-6083",
        "보라매동": "보라매동-6084",
        "봉천동": "봉천동-6085",
        "삼성동": "삼성동-6086",
        "서림동": "서림동-6087",
        "신림동": "신림동-6088",
        "은천동": "은천동-6089",
        "인헌동": "인헌동-6090",
        "조원동": "조원동-6091",
        "중앙동": "중앙동-6092",
        "청룡동": "청룡동-6093",
        "청림동": "청림동-6094"
      },
      "광진구": {
        "구의동": "구의동-6059",
        "광장동": "광장동-79",
        "능동": "능동-6095",
        "자양동": "자양동-6060",
        "중곡동": "중곡동-6096",
        "화양동": "화양동-72"
      },
      "구로구": {
        "가리봉동": "가리봉동-6097",
        "개봉동": "개봉동-6098",
        "고척동": "고척동-6099",
        "구로동": "구로동-6100",
        "궁동": "궁동-6101",
        "신도림동": "신도림동-6102",
        "오류동": "오류동-6103",
        "온수동": "온수동-6104",
        "천왕동": "천왕동-6105",
        "항동": "항동-6106"
      },
      "금천구": {
        "가산동": "가산동-6107",
        "독산동": "독산동-6108",
        "시흥동": "시흥동-6109"
      }
    },
    "경기도": {
      "성남시": {
        "분당구": {
          "정자동": "정자동-1234",
          "서현동": "서현동-1235",
          "수내동": "수내동-1236",
          "야탑동": "야탑동-1237",
          "이매동": "이매동-1238",
          "판교동": "판교동-1239"
        },
        "수정구": {
          "단대동": "단대동-1240",
          "신흥동": "신흥동-1241",
          "수진동": "수진동-1242",
          "태평동": "태평동-1243"
        },
        "중원구": {
          "상대원동": "상대원동-1244",
          "하대원동": "하대원동-1245",
          "중앙동": "중앙동-1246",
          "금광동": "금광동-1247"
        }
      },
      "용인시": {
        "기흥구": {
          "구갈동": "구갈동-1248",
          "기흥동": "기흥동-1249",
          "보라동": "보라동-1250",
          "상갈동": "상갈동-1251",
          "신갈동": "신갈동-1252"
        },
        "수지구": {
          "대화동": "대화동-1253",
          "동천동": "동천동-1254",
          "상현동": "상현동-1255",
          "풍덕천동": "풍덕천동-1256"
        },
        "처인구": {
          "김량장동": "김량장동-1257",
          "마평동": "마평동-1258",
          "역북동": "역북동-1259"
        }
      }
    }
  };

  res.json(regions);
});

// Serve the app for all other routes (SPA fallback)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Local: http://localhost:${PORT}`);
});