<script>
  import { onMount } from 'svelte';

  let regions = {};
  let selectedDistricts = []; // [{province, district}]
  let query = '';
  let loading = false;
  let error = null;
  let searchResults = null;

  // region selector state
  let selectedProvince = '';
  let showRegionPicker = false;

  $: provinces = Object.keys(regions);
  $: districts = selectedProvince ? Object.keys(regions[selectedProvince] || {}) : [];

  onMount(async () => {
    try {
      const res = await fetch('/api/regions');
      regions = await res.json();
    } catch (err) {
      error = '지역 데이터 로드 실패';
    }
  });

  function toggleDistrict(province, district) {
    const exists = selectedDistricts.find(d => d.province === province && d.district === district);
    if (exists) {
      selectedDistricts = selectedDistricts.filter(d => !(d.province === province && d.district === district));
    } else {
      selectedDistricts = [...selectedDistricts, { province, district }];
    }
  }

  function removeDistrict(province, district) {
    selectedDistricts = selectedDistricts.filter(d => !(d.province === province && d.district === district));
  }

  function clearAll() {
    selectedDistricts = [];
  }

  function getAllRegionIds() {
    // 선택된 구의 모든 동 ID를 수집
    const ids = [];
    for (const { province, district } of selectedDistricts) {
      const dongData = regions[province]?.[district];
      if (dongData) {
        collectIds(dongData, ids);
      }
    }
    return ids;
  }

  function collectIds(obj, ids) {
    for (const val of Object.values(obj)) {
      if (typeof val === 'string') {
        ids.push(val);
      } else if (typeof val === 'object') {
        collectIds(val, ids);
      }
    }
  }

  async function handleSearch() {
    if (!query.trim()) return alert('검색어를 입력해주세요');
    if (selectedDistricts.length === 0) return alert('지역을 선택해주세요');

    const regionIds = getAllRegionIds();
    if (regionIds.length === 0) return alert('선택한 지역에 데이터가 없습니다');

    loading = true;
    error = null;
    searchResults = null;

    try {
      const params = new URLSearchParams({ query: query.trim(), regions: regionIds.join(',') });
      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) throw new Error(`검색 실패 (${res.status})`);
      searchResults = await res.json();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function isSelected(province, district) {
    return selectedDistricts.some(d => d.province === province && d.district === district);
  }
</script>

<main>
  <header>
    <h1>🥕 당근검색기</h1>
    <p>여러 지역 매물을 한번에</p>
  </header>

  <div class="container">
    <!-- 검색바 -->
    <form class="search-bar" on:submit|preventDefault={handleSearch}>
      <input type="text" bind:value={query} placeholder="검색어 입력" disabled={loading} />
      <button type="submit" disabled={loading}>검색</button>
    </form>

    <!-- 지역 선택 -->
    <div class="region-section">
      <button class="region-toggle" on:click={() => showRegionPicker = !showRegionPicker}>
        📍 지역 선택 {selectedDistricts.length > 0 ? `(${selectedDistricts.length}개)` : ''}
        <span class="arrow">{showRegionPicker ? '▲' : '▼'}</span>
      </button>

      {#if selectedDistricts.length > 0}
        <div class="selected-tags">
          {#each selectedDistricts as { province, district }}
            <span class="tag">
              {district}
              <button class="tag-remove" on:click={() => removeDistrict(province, district)}>×</button>
            </span>
          {/each}
          <button class="clear-btn" on:click={clearAll}>전체 해제</button>
        </div>
      {/if}

      {#if showRegionPicker}
        <div class="region-picker">
          <div class="province-list">
            {#each provinces as province}
              <button
                class="province-btn"
                class:active={selectedProvince === province}
                on:click={() => selectedProvince = province}
              >
                {province}
              </button>
            {/each}
          </div>

          {#if selectedProvince}
            <div class="district-list">
              {#each districts as district}
                <label class="district-item">
                  <input
                    type="checkbox"
                    checked={isSelected(selectedProvince, district)}
                    on:change={() => toggleDistrict(selectedProvince, district)}
                  />
                  <span>{district}</span>
                </label>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- 에러 -->
    {#if error}
      <div class="error">⚠️ {error}</div>
    {/if}

    <!-- 로딩 -->
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>검색 중... (지역이 많으면 시간이 걸려요)</p>
      </div>
    {/if}

    <!-- 결과 -->
    {#if searchResults}
      <div class="results">
        <div class="results-header">
          <span class="results-query">"{searchResults.query}"</span>
          <span>{searchResults.totalItems}개 매물</span>
        </div>

        {#if searchResults.items?.length > 0}
          <div class="items">
            {#each searchResults.items as item}
              <a class="item" href={item.link} target="_blank" rel="noopener">
                {#if item.thumbnail}
                  <img src={item.thumbnail} alt="" loading="lazy" />
                {:else}
                  <div class="no-img">🖼️</div>
                {/if}
                <div class="item-info">
                  <div class="item-title">{item.title}</div>
                  <div class="item-price">{item.price || '가격 미정'}</div>
                  <div class="item-meta">
                    <span>{item.location}</span>
                    {#if item.time}<span>· {item.time}</span>{/if}
                  </div>
                </div>
              </a>
            {/each}
          </div>
        {:else}
          <div class="empty">검색 결과가 없습니다 😅</div>
        {/if}
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f7f7f7;
    color: #333;
  }
  :global(*) { box-sizing: border-box; }

  header {
    background: #ff6f00;
    color: white;
    text-align: center;
    padding: 1.5rem 1rem;
  }
  header h1 { margin: 0; font-size: 1.5rem; }
  header p { margin: 0.25rem 0 0; opacity: 0.9; font-size: 0.9rem; }

  .container { max-width: 600px; margin: 0 auto; padding: 1rem; }

  .search-bar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .search-bar input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
  }
  .search-bar input:focus { outline: none; border-color: #ff6f00; }
  .search-bar button {
    padding: 0.75rem 1.25rem;
    background: #ff6f00;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }
  .search-bar button:hover { background: #e65100; }
  .search-bar button:disabled { background: #ccc; }

  .region-section {
    background: white;
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }

  .region-toggle {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: none;
    border: none;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    color: #333;
  }
  .arrow { font-size: 0.8rem; color: #999; }

  .selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
    align-items: center;
  }
  .tag {
    background: #ff6f00;
    color: white;
    padding: 0.3rem 0.6rem;
    border-radius: 16px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .tag-remove {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    line-height: 1;
  }
  .clear-btn {
    background: none;
    border: 1px solid #ddd;
    color: #999;
    padding: 0.3rem 0.6rem;
    border-radius: 16px;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .region-picker {
    margin-top: 1rem;
    border-top: 1px solid #eee;
    padding-top: 1rem;
  }
  .province-list {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  .province-btn {
    padding: 0.4rem 0.8rem;
    border: 1px solid #ddd;
    border-radius: 20px;
    background: white;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .province-btn.active {
    background: #ff6f00;
    color: white;
    border-color: #ff6f00;
  }

  .district-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.25rem;
  }
  .district-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .district-item:hover { background: #f5f5f5; }
  .district-item input[type="checkbox"] { accent-color: #ff6f00; }

  .error {
    background: #fff3e0;
    color: #e65100;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #999;
  }
  .spinner {
    width: 32px; height: 32px;
    border: 3px solid #eee;
    border-top-color: #ff6f00;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 0.75rem;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .results { margin-top: 0.5rem; }
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    color: #666;
  }
  .results-query {
    background: #fff3e0;
    color: #ff6f00;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-weight: 500;
  }

  .items { display: flex; flex-direction: column; gap: 0.75rem; }
  .item {
    display: flex;
    gap: 0.75rem;
    background: white;
    border-radius: 10px;
    padding: 0.75rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    text-decoration: none;
    color: inherit;
    transition: box-shadow 0.2s;
  }
  .item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
  .item img {
    width: 90px; height: 90px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .no-img {
    width: 90px; height: 90px;
    border-radius: 8px;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  .item-info { flex: 1; min-width: 0; }
  .item-title {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 0.3rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item-price {
    color: #ff6f00;
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 0.3rem;
  }
  .item-meta { font-size: 0.8rem; color: #999; }

  .empty {
    text-align: center;
    padding: 2rem;
    color: #999;
    background: white;
    border-radius: 10px;
  }
</style>
