<script>
  import { onMount } from 'svelte';
  import MapSelector from './lib/MapSelector.svelte';
  import CustomAlert from './lib/CustomAlert.svelte';

  let userName = '';
  let isLoggedIn = false;
  let regions = {};
  let selectedRegions = []; // [{province, district, regionId}]
  let query = '';
  let loading = false;
  let error = null;
  let searchResults = null;
  let selectedProvince = '';
  let showRegionPicker = false;
  let cooldown = 0;
  let cooldownTimer = null;
  let itemsPerPage = 20;
  let currentPage = 1;
  let searchWithinQuery = '';
  let filterRegion = '';
  let viewMode = 'list'; // 'list' | 'map'

  // Custom Alert
  let showAlert = false;
  let alertTitle = '';
  let alertMessage = '';
  let alertType = 'alert';
  let alertOnConfirm = () => {};
  let alertOnCancel = () => {};

  function customAlert(message, title = '') {
    alertMessage = message;
    alertTitle = title;
    alertType = 'alert';
    showAlert = true;
    return new Promise(resolve => {
      alertOnConfirm = () => resolve(true);
    });
  }

  function customConfirm(message, title = '') {
    alertMessage = message;
    alertTitle = title;
    alertType = 'confirm';
    showAlert = true;
    return new Promise(resolve => {
      alertOnConfirm = () => resolve(true);
      alertOnCancel = () => resolve(false);
    });
  }

  $: provinces = Object.keys(regions);
  $: districts = selectedProvince ? Object.entries(regions[selectedProvince] || {}) : [];

  $: filteredItems = (searchResults?.items || [])
    .filter(item => {
      if (searchWithinQuery && !item.title.toLowerCase().includes(searchWithinQuery.toLowerCase()) &&
          !item.location.toLowerCase().includes(searchWithinQuery.toLowerCase())) return false;
      if (filterRegion && item.location !== filterRegion) return false;
      return true;
    });

  $: uniqueRegions = [...new Set(searchResults?.items.map(i => i.location) || [])];
  $: totalPages = Math.ceil((filteredItems?.length || 0) / itemsPerPage);
  $: paginatedItems = filteredItems?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  $: if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

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

  async function handleLogin() {
    if (!userName.trim()) {
      await customAlert('이름을 입력해주세요', '⚠️ 입력 필요');
      return;
    }
    isLoggedIn = true;
  }

  function isAllSelected(province) {
    const ids = Object.values(regions[province] || {});
    return ids.length > 0 && ids.every(id => isSelected(id));
  }

  function toggleAllDistricts(province) {
    const districts = regions[province] || {};
    if (isAllSelected(province)) {
      // 모두 해제
      selectedRegions = selectedRegions.filter(
        r => !Object.values(districts).includes(r.regionId)
      );
    } else {
      // 모두 선택 (기존 체크 상관없이 전부 선택)
      const districtIds = Object.values(districts);
      selectedRegions = selectedRegions.filter(
        r => !districtIds.includes(r.regionId)
      );
      Object.entries(districts).forEach(([name, id]) => {
        selectedRegions = [...selectedRegions, { province, district: name, regionId: id }];
      });
    }
  }

  function startCooldown() {
    cooldown = 60;
    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
      cooldown--;
      if (cooldown <= 0) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
      }
    }, 1000);
  }

  function resetFilters() {
    searchWithinQuery = '';
    filterRegion = '';
    currentPage = 1;
  }

  async function handleSearch() {
    if (!query.trim()) {
      await customAlert('검색어를 입력해주세요', '⚠️ 입력 필요');
      return;
    }
    if (selectedRegions.length === 0) {
      await customAlert('지역을 선택해주세요', '⚠️ 지역 선택 필요');
      return;
    }
    if (selectedRegions.length > 20) {
      const confirmed = await customConfirm(
        '지역이 20개 이상입니다. 검색 시간이 오래 걸릴 수 있습니다. 계속할까요?',
        '⚠️ 확인 필요'
      );
      if (!confirmed) return;
    }

    loading = true;
    error = null;
    searchResults = null;

    try {
      const ids = selectedRegions.map(r => r.regionId).join(',');
      const params = new URLSearchParams({ query: query.trim(), regions: ids });
      const res = await fetch(`/api/search?${params}`);
      if (res.status === 429) {
        const d = await res.json();
        startCooldown();
        throw new Error(d.error || '검색 횟수 초과! 잠시 후 다시 시도해주세요.');
      }
      if (!res.ok) throw new Error(`검색 실패 (${res.status})`);
      searchResults = await res.json();
      resetFilters();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
      if (!error) startCooldown();
    }
  }
</script>

<main>
  {#if !isLoggedIn}
    <!-- 이름 입력 화면 -->
    <div class="login-screen">
      <div class="login-box">
        <h1>🥕 당근검색기</h1>
        <p>여러 지역 매물을 한번에</p>
        <input
          type="text"
          bind:value={userName}
          placeholder="이름을 입력해주세요"
          on:keypress={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button on:click={handleLogin}>시작하기</button>
      </div>
    </div>
  {:else}
    <!-- 기존 메인 화면 -->
    <header>
      <h1>🥕 당근검색기</h1>
      <p>여러 지역 매물을 한번에</p>
    </header>

    <div class="container">
    <form class="search-bar" on:submit|preventDefault={handleSearch}>
      <input type="text" bind:value={query} placeholder="검색어 입력" disabled={loading || cooldown > 0} />
      <button type="submit" disabled={loading || selectedRegions.length === 0 || cooldown > 0}>
        {loading ? '검색중...' : cooldown > 0 ? `${cooldown}초 후 재검색` : '검색'}
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
          <!-- 탭 선택 -->
          <div class="tabs">
            <button
              class:active={viewMode === 'list'}
              on:click={() => viewMode = 'list'}
            >목록 선택</button>
            <button
              class:active={viewMode === 'map'}
              on:click={() => viewMode = 'map'}
            >지도 선택</button>
          </div>

          {#if viewMode === 'list'}
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
              <label class="select-all" class:checked={isAllSelected(selectedProvince)}>
                <input
                  type="checkbox"
                  checked={isAllSelected(selectedProvince)}
                  on:change={() => toggleAllDistricts(selectedProvince)}
                />
                <strong>{isAllSelected(selectedProvince) ? '모두 해제' : '모두 선택'}</strong>
              </label>
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
          {:else}
            <!-- 지도 선택 모드 -->
            <MapSelector
              {regions}
              {selectedRegions}
              onToggle={toggleDistrict}
            />
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
        <!-- 필터 컨트롤 -->
        <div class="filter-controls">
          <input
            type="text"
            bind:value={searchWithinQuery}
            placeholder="결과 내 검색..."
            on:input={() => currentPage = 1}
          />
          <select bind:value={filterRegion} on:change={() => currentPage = 1}>
            <option value="">모든 지역</option>
            {#each uniqueRegions as region}
              <option value={region}>{region}</option>
            {/each}
          </select>
          <select bind:value={itemsPerPage} on:change={() => currentPage = 1}>
            <option value={10}>10개씩</option>
            <option value={20}>20개씩</option>
            <option value={50}>50개씩</option>
          </select>
          <div class="filter-info">
            {filteredItems.length}개 표시 중
          </div>
        </div>

        <div class="items">
          {#each paginatedItems as item}
            <a class="item" class:sold-out={item.status === 'SOLD_OUT'} href={item.link} target="_blank" rel="noopener">
              {#if item.thumbnail}
                <img src={item.thumbnail} alt="" loading="lazy" />
              {:else}
                <div class="no-img">🖼️</div>
              {/if}
              <div class="info">
                <div class="title-row">
                  <div class="title">{item.title}</div>
                  {#if item.status}
                    <span class="status-badge {item.status.toLowerCase()}">
                      {item.status === 'SELLING' ? '판매중' :
                       item.status === 'RESERVED' ? '예약중' : '판매완료'}
                    </span>
                  {/if}
                </div>
                <div class="price">{item.price}</div>
                <div class="meta">{item.location} · {item.time}</div>
              </div>
            </a>
          {/each}
        </div>

        <!-- 페이지네이션 -->
        {#if totalPages > 1}
          <div class="pagination">
            <button
              disabled={currentPage === 1}
              on:click={() => currentPage = 1}
            >&lt;&lt;</button>
            <button
              disabled={currentPage === 1}
              on:click={() => currentPage--}
            >&lt;</button>

            {#each Array(totalPages) as _, i}
              {#if i + 1 === 1 || i + 1 === totalPages || Math.abs(i + 1 - currentPage) <= 2}
                <button
                  class:active={currentPage === i + 1}
                  on:click={() => currentPage = i + 1}
                >{i + 1}</button>
              {:else if i + 1 === currentPage - 3 || i + 1 === currentPage + 3}
                <span>...</span>
              {/if}
            {/each}

            <button
              disabled={currentPage === totalPages}
              on:click={() => currentPage++}
            >&gt;</button>
            <button
              disabled={currentPage === totalPages}
              on:click={() => currentPage = totalPages}
            >&gt;&gt;</button>
          </div>
        {/if}
      {:else}
        <div class="empty">검색 결과가 없어요 😅</div>
      {/if}
    {/if}
    </div>
  {/if}
</main>

<!-- Custom Alert Modal -->
<CustomAlert
  bind:show={showAlert}
  {alertTitle}
  message={alertMessage}
  type={alertType}
  onConfirm={alertOnConfirm}
  onCancel={alertOnCancel}
/>

<style>
  :global(body) { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f7f7f7; color:#333; }
  :global(*) { box-sizing:border-box; }

  .login-screen { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg, #ff6f00 0%, #ff8f00 100%); }
  .login-box { background:white; border-radius:20px; padding:2.5rem 2rem; box-shadow:0 10px 40px rgba(0,0,0,.2); text-align:center; max-width:400px; width:90%; }
  .login-box h1 { margin:0 0 .5rem; font-size:2rem; color:#ff6f00; }
  .login-box p { margin:0 0 2rem; color:#666; font-size:.95rem; }
  .login-box input { width:100%; padding:.9rem; border:2px solid #ddd; border-radius:10px; font-size:1rem; margin-bottom:1rem; }
  .login-box input:focus { outline:none; border-color:#ff6f00; }
  .login-box button { width:100%; padding:.9rem; background:#ff6f00; color:white; border:none; border-radius:10px; font-size:1rem; font-weight:600; cursor:pointer; transition:background .2s; }
  .login-box button:hover { background:#e65100; }

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

  .tabs { display:flex; gap:.5rem; margin-bottom:.8rem; }
  .tabs button { flex:1; padding:.6rem; border:1px solid #ddd; background:white; color:#333; border-radius:8px; cursor:pointer; font-size:.9rem; font-weight:500; transition:all .2s; }
  .tabs button:hover { background:#f5f5f5; }
  .tabs button.active { background:#ff6f00; color:white; border-color:#ff6f00; }

  .provinces { display:flex; gap:.4rem; flex-wrap:wrap; margin-bottom:.6rem; }
  .provinces button { padding:.35rem .7rem; border:1px solid #ddd; border-radius:16px; background:white; color:#333; cursor:pointer; font-size:.82rem; }
  .provinces button.active { background:#ff6f00; color:white; border-color:#ff6f00; }

  .districts { display:grid; grid-template-columns:repeat(2, 1fr); gap:.2rem; max-width:100%; }
  .districts label { display:flex; align-items:center; gap:.35rem; padding:.45rem .4rem; border-radius:6px; cursor:pointer; font-size:.88rem; }
  .districts label:hover { background:#f5f5f5; }
  .districts label.checked { background:#fff3e0; font-weight:500; }
  .districts .select-all { grid-column:1/-1; background:#f9f9f9; border:1px solid #e0e0e0; margin-bottom:.3rem; }
  .districts .select-all.checked { background:#ffe0b2; border-color:#ff6f00; }
  .districts input[type="checkbox"] { accent-color:#ff6f00; }

  .error { background:#fff3e0; color:#e65100; padding:.6rem; border-radius:8px; margin-bottom:.75rem; font-size:.9rem; }

  .loading { text-align:center; padding:2rem; color:#999; }
  .spinner { width:28px; height:28px; border:3px solid #eee; border-top-color:#ff6f00; border-radius:50%; animation:spin .7s linear infinite; margin:0 auto .5rem; }
  @keyframes spin { to { transform:rotate(360deg); } }

  .results-header { font-size:.85rem; color:#888; margin-bottom:.5rem; }

  .items { display:flex; flex-direction:column; gap:.6rem; }
  .item { display:flex; gap:.6rem; background:white; border-radius:10px; padding:.6rem; box-shadow:0 1px 3px rgba(0,0,0,.05); text-decoration:none; color:inherit; }
  .item:active { background:#fafafa; }
  .item.sold-out { opacity:0.6; }
  .item.sold-out .title { text-decoration:line-through; }
  .item img { width:80px; height:80px; border-radius:8px; object-fit:cover; flex-shrink:0; }
  .no-img { width:80px; height:80px; border-radius:8px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; }
  .info { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; }
  .title-row { display:flex; align-items:center; gap:.4rem; margin-bottom:.2rem; }
  .title { font-weight:600; font-size:.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; }
  .status-badge { padding:.15rem .4rem; border-radius:8px; font-size:.7rem; font-weight:600; white-space:nowrap; flex-shrink:0; }
  .status-badge.selling { background:#4caf50; color:white; }
  .status-badge.reserved { background:#2196f3; color:white; }
  .status-badge.sold_out { background:#999; color:white; }
  .price { color:#ff6f00; font-weight:700; font-size:.95rem; margin-bottom:.15rem; }
  .meta { font-size:.78rem; color:#999; }

  .empty { text-align:center; padding:2rem; color:#999; background:white; border-radius:10px; }

  .filter-controls { display:flex; gap:.5rem; margin-bottom:.75rem; flex-wrap:wrap; align-items:center; }
  .filter-controls input { flex:1; min-width:150px; padding:.5rem; border:1px solid #ddd; border-radius:6px; font-size:.85rem; }
  .filter-controls select { padding:.5rem; border:1px solid #ddd; border-radius:6px; font-size:.85rem; background:white; }
  .filter-info { font-size:.85rem; color:#666; padding:.5rem; }

  .pagination { display:flex; gap:.3rem; justify-content:center; margin-top:1rem; flex-wrap:wrap; }
  .pagination button { padding:.4rem .7rem; border:1px solid #ddd; background:white; border-radius:6px; cursor:pointer; font-size:.85rem; min-width:40px; }
  .pagination button:hover:not(:disabled) { background:#f5f5f5; }
  .pagination button:disabled { opacity:.3; cursor:not-allowed; }
  .pagination button.active { background:#ff6f00; color:white; border-color:#ff6f00; font-weight:600; }
  .pagination span { padding:.4rem; color:#999; }
</style>
