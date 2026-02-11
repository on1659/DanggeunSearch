import * as cheerio from 'cheerio';

const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay to be respectful

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch and parse a single region's results
async function fetchRegionResults(query, regionId, options = {}) {
  try {
    const { category, minPrice, maxPrice } = options;
    
    // Build URL with parameters
    let url = `https://www.daangn.com/kr/buy-sell/s/?in=${regionId}&search=${encodeURIComponent(query)}`;
    
    if (category) {
      url += `&category_id=${category}`;
    }
    
    if (minPrice && maxPrice) {
      url += `&price=${minPrice}__${maxPrice}`;
    } else if (minPrice) {
      url += `&price=${minPrice}__`;
    } else if (maxPrice) {
      url += `&price=__${maxPrice}`;
    }

    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items = [];

    // Parse product listings
    // 당근마켓의 상품 목록은 여러 가지 셀렉터로 나타날 수 있음
    const selectors = [
      'a[href*="/articles/"]', // 기본 상품 링크
      '.flea-market-article', // 상품 카드
      '[data-testid="article-card"]', // 테스트 ID 기반
      'article a', // article 태그 안의 링크
    ];

    let foundItems = false;
    
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} items with selector: ${selector}`);
        foundItems = true;
        
        elements.each((index, element) => {
          const $item = $(element);
          const link = $item.attr('href');
          
          if (!link || !link.includes('/articles/')) return;
          
          // Extract information from the link or surrounding elements
          let title = '';
          let price = '';
          let location = '';
          let time = '';
          let thumbnail = '';

          // Try to extract title
          title = $item.find('h2, h3, .article-title, [data-testid="article-title"]').first().text().trim() ||
                  $item.text().trim().split('\n')[0] ||
                  $item.attr('title') || '';

          // Try to extract price
          const priceElement = $item.find('.price, .article-price, [data-testid="article-price"], .font-bold').first();
          price = priceElement.text().trim();

          // Try to extract location
          const locationElement = $item.find('.region-name, .article-region, [data-testid="article-region"]').first();
          location = locationElement.text().trim();

          // Try to extract time
          const timeElement = $item.find('.article-time, .time, [data-testid="article-time"]').first();
          time = timeElement.text().trim();

          // Try to extract thumbnail
          const imgElement = $item.find('img').first();
          thumbnail = imgElement.attr('src') || imgElement.attr('data-src') || '';

          // If we couldn't extract much info, try parsing from the entire text content
          if (!title && !price) {
            const fullText = $item.text().trim();
            const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            if (lines.length > 0) {
              title = lines[0];
              
              // Look for price in the lines (contains 원 or 만원)
              const priceLine = lines.find(line => line.includes('원') && (line.includes('만') || /\d/.test(line)));
              if (priceLine) price = priceLine;

              // Look for location and time in remaining lines
              const locationLine = lines.find(line => line.includes('동') || line.includes('구') || line.includes('시'));
              if (locationLine) location = locationLine;

              const timeLine = lines.find(line => line.includes('분') || line.includes('시간') || line.includes('일') || line.includes('전'));
              if (timeLine) time = timeLine;
            }
          }

          // Only add if we have at least title or meaningful content
          if (title || price) {
            items.push({
              title: title || '제목 없음',
              price: price || '가격 미표시',
              location: location || regionId.split('-')[0],
              time: time || '',
              thumbnail: thumbnail ? (thumbnail.startsWith('http') ? thumbnail : `https://www.daangn.com${thumbnail}`) : '',
              link: link.startsWith('http') ? link : `https://www.daangn.com${link}`,
              region: regionId.split('-')[0]
            });
          }
        });
        
        break; // Stop after finding items with first working selector
      }
    }

    if (!foundItems) {
      console.log('No items found with any selector. HTML structure might have changed.');
      // Log a sample of the HTML for debugging
      console.log('Sample HTML:', $('body').html().substring(0, 500));
    }

    return items;
  } catch (error) {
    console.error(`Error fetching region ${regionId}:`, error.message);
    return [];
  }
}

// Main crawling function
export async function crawlDaangn(query, regionIds, options = {}) {
  const allItems = [];
  
  console.log(`Starting crawl for query: "${query}" across ${regionIds.length} regions`);
  
  for (let i = 0; i < regionIds.length; i++) {
    const regionId = regionIds[i];
    console.log(`Processing region ${i + 1}/${regionIds.length}: ${regionId}`);
    
    try {
      const items = await fetchRegionResults(query, regionId, options);
      allItems.push(...items);
      console.log(`Found ${items.length} items in ${regionId}`);
    } catch (error) {
      console.error(`Failed to process region ${regionId}:`, error.message);
    }
    
    // Add delay between requests to be respectful
    if (i < regionIds.length - 1) {
      await delay(DELAY_BETWEEN_REQUESTS);
    }
  }
  
  // Remove duplicates based on link
  const uniqueItems = allItems.filter((item, index, self) => 
    index === self.findIndex(other => other.link === item.link)
  );
  
  // Sort by time (newest first) - this is a simple sort, could be improved
  // 당근마켓의 시간 표시를 파싱해서 정렬하는 로직
  uniqueItems.sort((a, b) => {
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    return timeA - timeB; // 낮은 숫자 = 최근 시간
  });
  
  console.log(`Total unique items found: ${uniqueItems.length}`);
  
  return {
    query,
    regions: regionIds,
    totalItems: uniqueItems.length,
    items: uniqueItems,
    timestamp: new Date().toISOString()
  };
}

// Helper function to parse Korean time strings to minutes for sorting
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 999999; // Unknown time goes to the end
  
  const str = timeStr.toLowerCase();
  
  // 방금 전, 몇 초 전
  if (str.includes('방금') || str.includes('초')) {
    return 0;
  }
  
  // X분 전
  const minuteMatch = str.match(/(\d+)분/);
  if (minuteMatch) {
    return parseInt(minuteMatch[1]);
  }
  
  // X시간 전
  const hourMatch = str.match(/(\d+)시간/);
  if (hourMatch) {
    return parseInt(hourMatch[1]) * 60;
  }
  
  // X일 전
  const dayMatch = str.match(/(\d+)일/);
  if (dayMatch) {
    return parseInt(dayMatch[1]) * 24 * 60;
  }
  
  // 기본적으로 오래된 것으로 처리
  return 999999;
}