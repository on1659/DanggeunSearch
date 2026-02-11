<script>
  import { onMount } from 'svelte';

  let regions = {};
  let selectedRegions = []; // [{province, district, regionId}]
  let query = '';
  let loading = false;
  let error = null;
  let searchResults = null;
  let selectedProvince = '';
  let showRegionPicker = false;

  $: provinces = Object.keys(regions);
  $: districts = selectedProvince ? Object.entries(regions[selectedProvince] || {}) : [];

  onMount(async () => {
    try {
      const res = await fetch('/api/regions');
      regions = await res.json();
    } catch { error = '지역 데이터 로드 실패'; }
  });

  function toggleDistrict(province, district, regionId) {
    const exists = selectedRegions.find(r => r.regionId === regionId);
    if (exists) {
      selectedRegions = selectedRegions.filter(r => r.regionId !== regionId);
    } else {
      selectedRegions = [...selectedRegions, { province, district, regionId }];
    }
  }

  function removeRegion(regionId) {
    selectedRegions = selectedRegions.filter(r => r.regionId !== regionId);
  }

  function isSelected(regionId) {
    return selectedRegions.some(r => r.regionId === regionId);
  }

  async function handleSearch() {
    if (!query.trim()) return alert('검색어를 입력해주세요');
    if (selectedRegions.length === 0) return alert('지역을 선택해주세요');

    loading = true;
    error = null;
    searchResults = null;

    try {
      const ids = selectedRegions.map(r => r.regionId).join(',');
      const params = new URLSearchParams({ query: query.trim(), regions: ids });
      const res = await fetch(`/api/search?${params}`);
      if (res.status === 429) {
        const d = await res.json();
        throw new Error(d.error || '검색 횟수 초과! 잠시 후 다시 시도해주세요.');
      }
      if (!res.ok) throw new Error(`검색 실패 (${res.status})`);
      searchResults = await res.json();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<main>
  <header>
    <h1>🥕 당근검색기</h1>
    <p>여러 지역 매물을 한번에</p>
  </header>

  <div class="container">
    <form class="search-bar" on:submit|preventDefault={handleSearch}>
      <input type="text" bind:value={query} placeholder="검색어 입력" disabled={loading} />
      <button type="submit" disabled={loading || selectedRegions.length === 0}>
        {loading ? '검색중...' : '검색'}
      </button>
    </form>

    <!-- 지역 선택 -->
    <div class="region-section">
      <button class="region-toggle" on:click={() => showRegionPicker = !showRegionPicker}>
        📍 지역 선택
        {#if selectedRegions.length > 0}
          <span class="badge">{selectedRegions.length}</span>
        {/if}
        <span class="arrow">{showRegionPicker ? '▲' : '▼'}</span>
      </button>

      {#if selectedRegions.length > 0}
        <div class="selected-tags">
          {#each selectedRegions as r}
            <span class="tag">
              {r.district}
              <button class="tag-x" on:click={() => removeRegion(r.regionId)}>×</button>
            </span>
          {/each}
          <button class="tag-clear" on:click={() => selectedRegions = []}>초기화</button>
        </div>
      {/if}

      {#if showRegionPicker}
        <div class="picker">
          <div class="provinces">
            {#each provinces as prov}
              <button
                class:active={selectedProvince === prov}
                on:click={() => selectedProvince = prov}
              >{prov}</button>
            {/each}
          </div>

          {#if selectedProvince}
            <div class="districts">
              {#each districts as [name, id]}
                <label class:checked={isSelected(id)}>
                  <input type="checkbox"
                    checked={isSelected(id)}
                    on:change={() => toggleDistrict(selectedProvince, name, id)}
                  />
                  {name}
                </label>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    {#if error}
      <div class="error">⚠️ {error}</div>
    {/if}

    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>검색 중...</p>
      </div>
    {/if}

    {#if searchResults}
      <div class="results-header">
        "{searchResults.query}" · {searchResults.totalItems}개
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
              <div class="info">
                <div class="title">{item.title}</div>
                <div class="price">{item.price}</div>
                <div class="meta">{item.location} · {item.time}</div>
              </div>
            </a>
          {/each}
        </div>
      {:else}
        <div class="empty">검색 결과가 없어요 😅</div>
      {/if}
    {/if}
  </div>
</main>

<style>
  :global(body) { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f7f7f7; color:#333; }
  :global(*) { box-sizing:border-box; }

  header { background:#ff6f00; color:white; text-align:center; padding:1.2rem 1rem; }
  header h1 { margin:0; font-size:1.4rem; }
  header p { margin:.2rem 0 0; opacity:.9; font-size:.85rem; }

  .container { max-width:600px; margin:0 auto; padding:.75rem; }

  .search-bar { display:flex; gap:.5rem; margin-bottom:.75rem; }
  .search-bar input { flex:1; padding:.7rem; border:2px solid #ddd; border-radius:8px; font-size:1rem; }
  .search-bar input:focus { outline:none; border-color:#ff6f00; }
  .search-bar button { padding:.7rem 1.2rem; background:#ff6f00; color:white; border:none; border-radius:8px; font-size:.95rem; font-weight:600; cursor:pointer; }
  .search-bar button:disabled { background:#ccc; }

  .region-section { background:white; border-radius:10px; padding:.8rem; margin-bottom:.75rem; box-shadow:0 1px 3px rgba(0,0,0,.06); }
  .region-toggle { width:100%; display:flex; align-items:center; gap:.5rem; background:none; border:none; font-size:.95rem; font-weight:600; cursor:pointer; padding:0; color:#333; }
  .badge { background:#ff6f00; color:white; border-radius:10px; padding:0 .5rem; font-size:.8rem; }
  .arrow { margin-left:auto; font-size:.75rem; color:#999; }

  .selected-tags { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.6rem; align-items:center; }
  .tag { background:#ff6f00; color:white; padding:.2rem .5rem; border-radius:12px; font-size:.8rem; display:flex; align-items:center; gap:.2rem; }
  .tag-x { background:none; border:none; color:white; cursor:pointer; font-size:.9rem; padding:0; }
  .tag-clear { background:none; border:1px solid #ccc; color:#999; padding:.2rem .5rem; border-radius:12px; font-size:.75rem; cursor:pointer; }

  .picker { margin-top:.8rem; border-top:1px solid #eee; padding-top:.8rem; }
  .provinces { display:flex; gap:.4rem; flex-wrap:wrap; margin-bottom:.6rem; }
  .provinces button { padding:.35rem .7rem; border:1px solid #ddd; border-radius:16px; background:white; cursor:pointer; font-size:.82rem; }
  .provinces button.active { background:#ff6f00; color:white; border-color:#ff6f00; }

  .districts { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:.2rem; }
  .districts label { display:flex; align-items:center; gap:.35rem; padding:.45rem .4rem; border-radius:6px; cursor:pointer; font-size:.88rem; }
  .districts label:hover { background:#f5f5f5; }
  .districts label.checked { background:#fff3e0; font-weight:500; }
  .districts input[type="checkbox"] { accent-color:#ff6f00; }

  .error { background:#fff3e0; color:#e65100; padding:.6rem; border-radius:8px; margin-bottom:.75rem; font-size:.9rem; }

  .loading { text-align:center; padding:2rem; color:#999; }
  .spinner { width:28px; height:28px; border:3px solid #eee; border-top-color:#ff6f00; border-radius:50%; animation:spin .7s linear infinite; margin:0 auto .5rem; }
  @keyframes spin { to { transform:rotate(360deg); } }

  .results-header { font-size:.85rem; color:#888; margin-bottom:.5rem; }

  .items { display:flex; flex-direction:column; gap:.6rem; }
  .item { display:flex; gap:.6rem; background:white; border-radius:10px; padding:.6rem; box-shadow:0 1px 3px rgba(0,0,0,.05); text-decoration:none; color:inherit; }
  .item:active { background:#fafafa; }
  .item img { width:80px; height:80px; border-radius:8px; object-fit:cover; flex-shrink:0; }
  .no-img { width:80px; height:80px; border-radius:8px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; }
  .info { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; }
  .title { font-weight:600; font-size:.9rem; margin-bottom:.2rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .price { color:#ff6f00; font-weight:700; font-size:.95rem; margin-bottom:.15rem; }
  .meta { font-size:.78rem; color:#999; }

  .empty { text-align:center; padding:2rem; color:#999; background:white; border-radius:10px; }
</style>
