import * as cheerio from 'cheerio';

const DELAY_BETWEEN_REQUESTS = 1000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchRegionResults(query, regionId, options = {}) {
  try {
    const { category, minPrice, maxPrice } = options;
    let url = `https://www.daangn.com/kr/buy-sell/?in=${encodeURIComponent(regionId)}&search=${encodeURIComponent(query)}`;
    
    if (category) url += `&category_id=${category}`;
    if (minPrice && maxPrice) url += `&price=${minPrice}__${maxPrice}`;
    else if (minPrice) url += `&price=${minPrice}__`;
    else if (maxPrice) url += `&price=__${maxPrice}`;

    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract __remixContext from inline script
    let remixData = null;
    $('script').each((_, el) => {
      const text = $(el).html();
      if (text && text.includes('window.__remixContext')) {
        try {
          const match = text.match(/window\.__remixContext\s*=\s*({.+?})\s*;?\s*$/s);
          if (match) {
            remixData = JSON.parse(match[1]);
          }
        } catch (e) {
          // Try alternative extraction
          try {
            const start = text.indexOf('{');
            const jsonStr = text.substring(start).replace(/;\s*$/, '');
            remixData = JSON.parse(jsonStr);
          } catch (e2) {
            console.log('Failed to parse remixContext');
          }
        }
      }
    });

    if (!remixData) {
      console.log(`No remixContext found for ${regionId}`);
      return [];
    }

    // Extract articles from loaderData
    const loaderData = remixData?.state?.loaderData;
    const pageData = loaderData?.['routes/kr.buy-sell._index'] || loaderData?.['routes/kr.buy-sell.s'] || {};
    const articles = pageData?.allPage?.fleamarketArticles || pageData?.searchPage?.fleamarketArticles || [];

    if (articles.length === 0) {
      // Try to find articles in any loader key
      for (const key of Object.keys(loaderData || {})) {
        const d = loaderData[key];
        const arts = d?.allPage?.fleamarketArticles || d?.searchPage?.fleamarketArticles || [];
        if (arts.length > 0) {
          return arts.map(a => formatArticle(a, regionId));
        }
      }
      console.log(`No articles found in remixContext for ${regionId}`);
      return [];
    }

    return articles.map(a => formatArticle(a, regionId));
  } catch (error) {
    console.error(`Error fetching region ${regionId}:`, error.message);
    return [];
  }
}

function formatArticle(article, regionId) {
  // Debug: 첫 번째 아이템만 전체 구조 출력
  if (Math.random() < 0.1) { // 10% 확률로 샘플 출력
    console.log('[DEBUG] Article structure:', JSON.stringify(article, null, 2));
  }

  const regionName = article.region?.name || article.regionId?.name || regionId.split('-')[0];

  // Format price
  let price = '';
  if (article.price) {
    const num = parseFloat(article.price);
    if (num === 0) {
      price = '나눔';
    } else {
      price = num.toLocaleString('ko-KR') + '원';
    }
  } else {
    price = '가격 미정';
  }

  // Format time
  let time = '';
  if (article.createdAt || article.boostedAt) {
    const date = new Date(article.boostedAt || article.createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) time = '방금 전';
    else if (diffMin < 60) time = `${diffMin}분 전`;
    else if (diffHour < 24) time = `${diffHour}시간 전`;
    else if (diffDay < 30) time = `${diffDay}일 전`;
    else time = `${Math.floor(diffDay / 30)}개월 전`;
    
    if (article.boostedAt && article.boostedAt !== article.createdAt) {
      time = '끌올 ' + time;
    }
  }

  const item = {
    title: article.title || '제목 없음',
    price,
    location: regionName,
    time,
    thumbnail: article.thumbnail || '',
    link: article.href || (article.id ? `https://www.daangn.com${article.id}` : ''),
    region: regionName,
    status: article.status || ''
  };

  // Debug: 판매 상태 로그
  if (article.status) {
    console.log(`[DEBUG] ${article.title}: status=${article.status}`);
  }

  return item;
}

export async function crawlDaangn(query, regionIds, options = {}) {
  const allItems = [];
  
  // 동 단위가 아니라 구 단위로 검색 가능 - regionId가 "구의동-6059" 형태
  console.log(`Starting crawl for "${query}" across ${regionIds.length} regions`);
  
  for (let i = 0; i < regionIds.length; i++) {
    const regionId = regionIds[i];
    console.log(`Processing ${i + 1}/${regionIds.length}: ${regionId}`);
    
    const items = await fetchRegionResults(query, regionId, options);
    allItems.push(...items);
    console.log(`Found ${items.length} items in ${regionId}`);
    
    if (i < regionIds.length - 1) await delay(DELAY_BETWEEN_REQUESTS);
  }
  
  // Deduplicate by link
  const seen = new Set();
  const uniqueItems = allItems.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
  
  // Sort newest first
  uniqueItems.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  
  console.log(`Total unique items: ${uniqueItems.length}`);
  
  return {
    query,
    regions: regionIds,
    totalItems: uniqueItems.length,
    items: uniqueItems,
    timestamp: new Date().toISOString()
  };
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 999999;
  const s = timeStr;
  if (s.includes('방금') || s.includes('초')) return 0;
  const min = s.match(/(\d+)분/);
  if (min) return parseInt(min[1]);
  const hr = s.match(/(\d+)시간/);
  if (hr) return parseInt(hr[1]) * 60;
  const day = s.match(/(\d+)일/);
  if (day) return parseInt(day[1]) * 1440;
  const mon = s.match(/(\d+)개월/);
  if (mon) return parseInt(mon[1]) * 43200;
  return 999999;
}
