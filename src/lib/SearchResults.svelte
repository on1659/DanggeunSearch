<script>
  export let results = null;

  function formatPrice(priceStr) {
    if (!priceStr || priceStr === '가격 미표시') return priceStr;
    
    // 숫자만 추출
    const numbers = priceStr.replace(/[^\d]/g, '');
    if (!numbers) return priceStr;
    
    // 천의 자리마다 콤마 추가
    const formatted = parseInt(numbers).toLocaleString();
    return `${formatted}원`;
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    
    // 이미 "XX전" 형태라면 그대로 반환
    if (timeStr.includes('전')) return timeStr;
    
    // 그 외의 경우 그대로 반환
    return timeStr;
  }

  function getRegionColor(index) {
    const colors = [
      '#ff6f00', '#f57c00', '#ef6c00', '#e65100',
      '#ff9800', '#ffa726', '#ffb74d', '#ffcc02',
      '#4caf50', '#66bb6a', '#81c784', '#a5d6a7'
    ];
    return colors[index % colors.length];
  }

  function openLink(url, event) {
    event.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  }
</script>

{#if results}
  <div class="search-results">
    <div class="results-header">
      <h2>검색 결과</h2>
      <div class="results-info">
        <span class="search-query">"{results.query}"</span>
        <span class="item-count">총 {results.totalItems}개 매물</span>
        <span class="timestamp">
          {new Date(results.timestamp).toLocaleString('ko-KR')} 검색
        </span>
      </div>
    </div>

    {#if results.items && results.items.length > 0}
      <div class="items-grid">
        {#each results.items as item, index}
          <article class="item-card" on:click={(e) => openLink(item.link, e)}>
            <div class="item-image">
              {#if item.thumbnail}
                <img src={item.thumbnail} alt={item.title} loading="lazy" />
              {:else}
                <div class="no-image">
                  <span>🖼️</span>
                  <span>이미지 없음</span>
                </div>
              {/if}
              <div class="region-badge" style="background-color: {getRegionColor(index)}">
                {item.region}
              </div>
            </div>

            <div class="item-content">
              <h3 class="item-title">{item.title}</h3>
              
              <div class="item-price">
                {formatPrice(item.price)}
              </div>

              <div class="item-meta">
                <span class="item-location">{item.location}</span>
                {#if item.time}
                  <span class="item-time">{formatTime(item.time)}</span>
                {/if}
              </div>
            </div>

            <div class="item-link-overlay">
              <span>당근마켓에서 보기 →</span>
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <h3>검색 결과가 없습니다</h3>
        <p>다른 검색어나 지역을 시도해보세요.</p>
      </div>
    {/if}
  </div>
{/if}

<style>
  .search-results {
    margin-top: 2rem;
  }

  .results-header {
    margin-bottom: 1.5rem;
  }

  .results-header h2 {
    margin: 0 0 0.75rem 0;
    color: #333;
    font-size: 1.5rem;
  }

  .results-info {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    font-size: 0.9rem;
    color: #666;
  }

  .search-query {
    background: #fff3e0;
    color: #ff6f00;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 500;
  }

  .item-count {
    font-weight: 600;
    color: #333;
  }

  .timestamp {
    font-style: italic;
  }

  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .item-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
  }

  .item-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .item-image {
    position: relative;
    width: 100%;
    height: 200px;
    background: #f5f5f5;
    overflow: hidden;
  }

  .item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .no-image {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
    font-size: 0.9rem;
  }

  .no-image span:first-child {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .region-badge {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    background: #ff6f00;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .item-content {
    padding: 1rem;
  }

  .item-title {
    margin: 0 0 0.75rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .item-price {
    margin-bottom: 0.75rem;
    font-size: 1.2rem;
    font-weight: bold;
    color: #ff6f00;
  }

  .item-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: #666;
    gap: 0.5rem;
  }

  .item-location {
    flex: 1;
  }

  .item-time {
    flex-shrink: 0;
  }

  .item-link-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(255, 111, 0, 0.9), transparent);
    color: white;
    padding: 1rem;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    text-align: center;
    font-weight: 600;
  }

  .item-card:hover .item-link-overlay {
    transform: translateY(0);
  }

  .no-results {
    text-align: center;
    padding: 3rem 1rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .no-results-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .no-results h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  .no-results p {
    margin: 0;
    color: #666;
  }

  @media (max-width: 768px) {
    .items-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .results-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .item-image {
      height: 180px;
    }

    .item-card:hover .item-link-overlay {
      transform: translateY(100%);
    }

    .item-link-overlay {
      position: relative;
      transform: none;
      background: rgba(255, 111, 0, 0.1);
      color: #ff6f00;
      padding: 0.75rem;
    }
  }
</style>