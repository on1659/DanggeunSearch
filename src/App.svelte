<script>
  import { onMount } from 'svelte';
  import MapSelector from './lib/MapSelector.svelte';
  import CustomAlert from './lib/CustomAlert.svelte';
  import MyPage from './lib/MyPage.svelte';

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
  let hideSoldOut = false; // 판매완료 제외
  let lastCenterItemId = null; // 현재 화면 중앙 아이템 추적
  let hasSeenWarning = false; // 세션당 한 번만 경고 표시
  let currentPage_mode = 'search'; // 'search' | 'mypage'
  let bookmarkedLinks = new Set(); // 북마크된 아이템 링크
  let recentRegions = []; // 최근 사용 지역 3개
  let searchHistory = []; // 최근 검색 기록

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

  $: allFilteredItems = (searchResults?.items || [])
    .filter(item => {
      if (searchWithinQuery && !item.title.toLowerCase().includes(searchWithinQuery.toLowerCase()) &&
          !item.location.toLowerCase().includes(searchWithinQuery.toLowerCase())) return false;
      if (filterRegion && item.location !== filterRegion) return false;
      // Ongoing = 판매중, Reserved = 예약중, 그 외 = 판매완료
      if (hideSoldOut && item.status && item.status !== 'Ongoing' && item.status !== 'Reserved') return false;
      return true;
    });

  $: filteredItems = allFilteredItems;

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

    // 전역 alert 이벤트 리스너
    window.addEventListener('showAlert', (e) => {
      customAlert(e.detail.message, e.detail.title || '⚠️ 알림');
    });
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
    // 동기화를 위해 강제 업데이트
    selectedRegions = [...selectedRegions];
  }

  function isSelected(regionId) {
    return selectedRegions.some(r => r.regionId === regionId);
  }

  // 북마크 로드
  async function loadBookmarks() {
    try {
      const res = await fetch(`/api/bookmarks/${encodeURIComponent(userName.trim())}`);
      if (res.ok) {
        const bookmarks = await res.json();
        bookmarkedLinks = new Set(bookmarks.map(b => b.item_link));
      }
    } catch (err) {
      console.error('북마크 로드 실패:', err);
    }
  }

  // 최근 지역 저장 (최대 3개, 중복 제거)
  function saveRecentRegions() {
    if (selectedRegions.length === 0) return;
    
    // 현재 선택된 지역 ID 목록
    const currentRegionIds = selectedRegions.map(r => r.regionId);
    
    // localStorage에서 기존 기록 불러오기
    let recent = [];
    try {
      const saved = localStorage.getItem(`recentRegions_${userName}`);
      if (saved) recent = JSON.parse(saved);
    } catch (e) {}
    
    // 현재 선택된 지역들을 최근 목록에 추가 (중복 제거)
    for (const region of selectedRegions) {
      // 기존 목록에서 같은 지역 제거
      recent = recent.filter(r => r.regionId !== region.regionId);
      // 맨 앞에 추가
      recent.unshift(region);
    }
    
    // 최대 3개만 유지
    recent = recent.slice(0, 3);
    
    // 저장
    localStorage.setItem(`recentRegions_${userName}`, JSON.stringify(recent));
    recentRegions = recent;
  }

  // 최근 지역 불러오기
  function loadRecentRegions() {
    try {
      const saved = localStorage.getItem(`recentRegions_${userName}`);
      if (saved) {
        recentRegions = JSON.parse(saved);
      }
    } catch (e) {
      console.error('최근 지역 불러오기 실패:', e);
    }
    
    // viewMode 불러오기
    try {
      const savedMode = localStorage.getItem(`viewMode_${userName}`);
      if (savedMode === 'list' || savedMode === 'map') {
        viewMode = savedMode;
      }
    } catch (e) {
      console.error('viewMode 불러오기 실패:', e);
    }
  }

  // viewMode 저장
  function saveViewMode(mode) {
    viewMode = mode;
    try {
      localStorage.setItem(`viewMode_${userName}`, mode);
    } catch (e) {
      console.error('viewMode 저장 실패:', e);
    }
  }

  // 최근 검색 기록 불러오기 (search_logs에서)
  async function loadSearchHistory() {
    try {
      const res = await fetch(`/api/search-logs/user/${encodeURIComponent(userName)}?limit=20`);
      if (res.ok) {
        const logs = await res.json();
        // 중복 제거: 같은 검색어는 최근 것만 표시
        const uniqueQueries = new Map();
        for (const log of logs) {
          if (!uniqueQueries.has(log.query)) {
            uniqueQueries.set(log.query, log);
          }
        }
        searchHistory = Array.from(uniqueQueries.values()).slice(0, 5);
      }
    } catch (err) {
      console.error('검색 기록 불러오기 실패:', err);
    }
  }

  // 검색 기록에서 복원
  async function restoreFromHistory(historyItem) {
    // 안내 팝업 표시
    const confirmed = await customConfirm(
      `"${historyItem.query}" 검색을 실시간으로 다시 불러옵니다.\n\n최신 매물 정보를 확인하시겠습니까?`,
      '🔄 검색 기록 불러오기'
    );
    
    if (!confirmed) return;
    
    query = historyItem.query;
    
    // 지역 복원
    try {
      const savedRegions = JSON.parse(historyItem.regions);
      if (Array.isArray(savedRegions)) {
        selectedRegions = [];
        for (const regionId of savedRegions) {
          for (const [province, districts] of Object.entries(regions)) {
            for (const [district, id] of Object.entries(districts)) {
              if (id === regionId) {
                selectedRegions.push({ province, district, regionId: id });
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('지역 복원 실패:', err);
    }
    
    // 재검색 (과거 기록 플래그 설정)
    await handleSearch(true);
  }

  // 북마크 토글
  async function toggleBookmark(item, event) {
    event.preventDefault();
    event.stopPropagation();

    const isCurrentlyBookmarked = bookmarkedLinks.has(item.link);

    try {
      if (isCurrentlyBookmarked) {
        // 북마크 삭제
        const res = await fetch(`/api/bookmarks/${encodeURIComponent(userName)}/${encodeURIComponent(item.link)}`, {
          method: 'DELETE'
        });
        const result = await res.json();
        if (result.success) {
          bookmarkedLinks.delete(item.link);
          bookmarkedLinks = bookmarkedLinks; // Svelte 반응성 트리거
        }
      } else {
        // 북마크 추가
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName, item })
        });
        const result = await res.json();
        if (result.success) {
          bookmarkedLinks.add(item.link);
          bookmarkedLinks = bookmarkedLinks; // Svelte 반응성 트리거
        } else {
          await customAlert(result.error || '북마크 추가 실패', '⚠️ 오류');
        }
      }
    } catch (err) {
      console.error('북마크 토글 실패:', err);
      await customAlert('북마크 처리 중 오류가 발생했습니다', '⚠️ 오류');
    }
  }

  // 아이템 클릭 저장
  async function trackItemClick(item) {
    try {
      await fetch('/api/clicked-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, item })
      });
    } catch (err) {
      console.error('클릭 기록 저장 실패:', err);
    }
  }

  function handleLogout() {
    // 상태 초기화
    isLoggedIn = false;
    userName = '';
    query = '';
    selectedRegions = [];
    searchResults = null;
    bookmarkedLinks = new Set();
    currentPage_mode = 'search';
    hasSeenWarning = false;
    recentRegions = [];
    searchHistory = [];
  }

  async function handleLogin() {
    if (!userName.trim()) {
      await customAlert('이름을 입력해주세요', '⚠️ 입력 필요');
      return;
    }
    
    // 로그인 기록 저장
    try {
      await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: userName.trim() })
      });
    } catch (err) {
      console.error('로그인 기록 저장 실패:', err);
    }
    
    // 로그인 성공
    isLoggedIn = true;
    
    // 북마크 로드
    await loadBookmarks();
    
    // 최근 지역 로드
    loadRecentRegions();
    
    // 검색 기록 로드
    await loadSearchHistory();
    
    // 이전 검색 기록 불러오기
    try {
      const res = await fetch(`/api/search-logs/user/${encodeURIComponent(userName.trim())}?limit=1`);
      if (res.ok) {
        const logs = await res.json();
        if (logs.length > 0) {
          const lastSearch = logs[0];
          // 검색어 복원
          query = lastSearch.query;
          
          // 지역 복원
          try {
            const savedRegions = JSON.parse(lastSearch.regions);
            if (Array.isArray(savedRegions)) {
              // 지역 ID를 기반으로 selectedRegions 복원
              selectedRegions = [];
              for (const regionId of savedRegions) {
                // regions 객체에서 해당 ID를 찾아서 복원
                for (const [province, districts] of Object.entries(regions)) {
                  for (const [district, id] of Object.entries(districts)) {
                    if (id === regionId) {
                      selectedRegions.push({ province, district, regionId: id });
                      break;
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('지역 복원 실패:', err);
          }
        }
      }
    } catch (err) {
      console.error('검색 기록 불러오기 실패:', err);
    }
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
    lastCenterItemId = null;
  }

  // 필터 변경 시 현재 중앙 아이템 기준으로 페이지 유지
  function handleFilterChange() {
    // 다음 틱까지 기다려서 allFilteredItems가 업데이트되도록
    setTimeout(() => {
      if (!lastCenterItemId || !allFilteredItems.length) {
        currentPage = 1;
        return;
      }

      // 필터링 후 중앙 아이템 찾기
      const newIndex = allFilteredItems.findIndex(item => item.link === lastCenterItemId);
      
      if (newIndex === -1) {
        currentPage = 1;
      } else {
        // 해당 아이템이 보이도록 페이지 계산
        const newPage = Math.floor(newIndex / itemsPerPage) + 1;
        const maxPage = Math.ceil(allFilteredItems.length / itemsPerPage);
        currentPage = Math.min(Math.max(1, newPage), maxPage || 1);
      }
    }, 0);
  }

  // 현재 페이지의 중앙 아이템 추적
  $: if (paginatedItems && paginatedItems.length > 0) {
    const centerIndex = Math.floor(paginatedItems.length / 2);
    const centerItem = paginatedItems[centerIndex];
    if (centerItem) {
      lastCenterItemId = centerItem.link;
    }
  }

  async function handleSearch(isFromHistory = false) {
    if (!query.trim()) {
      await customAlert('검색어를 입력해주세요', '⚠️ 입력 필요');
      return;
    }
    if (selectedRegions.length === 0) {
      await customAlert('지역을 선택해주세요', '⚠️ 지역 선택 필요');
      return;
    }
    
    // 검색 전 필수 안내 (세션당 최초 1회만)
    if (!hasSeenWarning) {
      const warningMessage = `이 검색기는 당근마켓 웹사이트를 크롤링하는 보조 도구입니다.

⚠️ 주의사항:
• 이 도구를 맹신하지 마세요
• 과도한 사용 시 당근마켓으로부터 검색 차단(블랙리스트)될 수 있습니다
• 검색 후 60초 쿨타임은 차단 방지를 위한 것이니 양해 부탁드립니다
• 개인적, 비상업적 용도로만 사용해주세요
• 검색만 가능하며, 채팅 등 다른 기능은 지원하지 않습니다

검색을 계속하시겠습니까?`;
      
      const confirmed = await customConfirm(warningMessage, '⚠️ 검색 전 필수 안내');
      if (!confirmed) return;
      
      hasSeenWarning = true;
    }
    
    if (selectedRegions.length > 20) {
      const confirmed2 = await customConfirm(
        '지역이 20개 이상입니다. 검색 시간이 오래 걸릴 수 있습니다. 계속할까요?',
        '⚠️ 확인 필요'
      );
      if (!confirmed2) return;
    }

    loading = true;
    error = null;
    searchResults = null;

    try {
      const ids = selectedRegions.map(r => r.regionId).join(',');
      const params = new URLSearchParams({
        query: query.trim(),
        regions: ids,
        userName: userName || 'Anonymous'
      });
      const res = await fetch(`/api/search?${params}`);
      if (res.status === 429) {
        const d = await res.json();
        startCooldown();
        throw new Error(d.error || '검색 횟수 초과! 잠시 후 다시 시도해주세요.');
      }
      if (!res.ok) throw new Error(`검색 실패 (${res.status})`);
      searchResults = await res.json();
      searchResults.isFromHistory = isFromHistory;
      resetFilters();
      
      // 검색 성공 시 최근 지역 저장
      if (!isFromHistory) {
        saveRecentRegions();
        // 검색 기록 새로고침
        setTimeout(() => loadSearchHistory(), 1000);
      }
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
      <div class="header-left">
        <button class="back-btn" class:visible={currentPage_mode === 'mypage'} on:click={() => currentPage_mode = 'search'}>
          ← 검색
        </button>
      </div>
      <div class="header-center">
        <h1>🥕 당근검색기</h1>
        <p>여러 지역 매물을 한번에</p>
      </div>
      <div class="header-right">
        {#if currentPage_mode === 'mypage'}
          <button class="logout-btn" on:click={handleLogout}>
            로그아웃
          </button>
        {:else}
          <button class="mypage-btn" on:click={() => currentPage_mode = 'mypage'}>
            👤
          </button>
        {/if}
      </div>
    </header>

    {#if currentPage_mode === 'mypage'}
      <MyPage {userName} />
    {:else}
    <div class="container">
    
    <!-- 최근 검색 기록 -->
    {#if searchHistory.length > 0 && !searchResults}
      <div class="search-history-section">
        <h3>최근 검색</h3>
        <div class="history-list">
          {#each searchHistory as history}
            <button class="history-item" on:click={() => restoreFromHistory(history)}>
              <div class="history-query">{history.query}</div>
              <div class="history-meta">
                {history.region_count}개 지역 · {new Date(history.timestamp).toLocaleDateString('ko-KR')}
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}
    
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

      <!-- 최근 사용 지역 (최대 3개) -->
      {#if recentRegions.length > 0 && selectedRegions.length === 0 && !showRegionPicker}
        <div class="recent-regions">
          <div class="recent-label">최근 사용 지역</div>
          <div class="recent-tags">
            {#each recentRegions as region}
              <button 
                class="recent-tag" 
                on:click={() => {
                  selectedRegions = [region];
                }}
              >
                {region.district}
              </button>
            {/each}
          </div>
        </div>
      {/if}

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
              on:click={() => saveViewMode('list')}
            >목록 선택</button>
            <button
              class:active={viewMode === 'map'}
              on:click={() => saveViewMode('map')}
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
        {#if searchResults.isFromHistory}
          <span class="history-badge">📜 과거 기록</span>
        {/if}
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
            <option value={100}>100개씩</option>
          </select>
          <label>
            <input
              type="checkbox"
              bind:checked={hideSoldOut}
              on:change={handleFilterChange}
            />
            판매완료 제외
          </label>
          <div class="filter-info">
            {filteredItems.length}개 표시 중
          </div>
        </div>

        <div class="items">
          {#each paginatedItems as item}
            <a 
              class="item" 
              class:sold-out={item.status && item.status !== 'Ongoing' && item.status !== 'Reserved'} 
              href={item.link} 
              target="_blank" 
              rel="noopener"
              on:click={() => trackItemClick(item)}
            >
              {#if item.thumbnail}
                <img src={item.thumbnail} alt="" loading="lazy" />
              {:else}
                <div class="no-img">🖼️</div>
              {/if}
              <div class="info">
                <div class="title-row">
                  <div class="title">{item.title}</div>
                  <button 
                    class="bookmark-btn" 
                    class:bookmarked={bookmarkedLinks.has(item.link)}
                    on:click={(e) => toggleBookmark(item, e)}
                    title={bookmarkedLinks.has(item.link) ? '북마크 해제' : '북마크 추가'}
                  >
                    {bookmarkedLinks.has(item.link) ? '★' : '☆'}
                  </button>
                  {#if item.status}
                    <span class="status-badge {item.status.toLowerCase()}">
                      {item.status === 'Ongoing' ? '판매중' :
                       item.status === 'Reserved' ? '예약중' : '판매완료'}
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
  :global(body) { 
    margin:0; 
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif; 
    background:linear-gradient(180deg, #fff5eb 0%, #fafafa 100%);
    color:#212121; 
    -webkit-font-smoothing:antialiased;
    overflow-x:hidden;
  }
  :global(html) {
    overflow-x:hidden;
  }
  :global(*) { box-sizing:border-box; }
  
  main {
    min-height:100vh;
    overflow-x:hidden;
    width:100%;
  }

  /* 로그인 화면 */
  .login-screen { 
    min-height:100vh; 
    display:flex; 
    align-items:center; 
    justify-content:center; 
    background:linear-gradient(135deg, #ff6f00 0%, #ff8e53 100%);
    padding:1rem;
  }
  .login-box { 
    background:rgba(255,255,255,0.98);
    backdrop-filter:blur(10px);
    border-radius:24px; 
    padding:3rem 2rem; 
    box-shadow:0 20px 60px rgba(0,0,0,.15), 0 0 0 1px rgba(255,255,255,.5);
    text-align:center; 
    max-width:420px; 
    width:100%;
    animation:fadeInUp .5s ease;
  }
  @keyframes fadeInUp {
    from { opacity:0; transform:translateY(20px); }
    to { opacity:1; transform:translateY(0); }
  }
  .login-box h1 { 
    margin:0 0 .5rem; 
    font-size:2.5rem; 
    color:#ff6f00; 
    font-weight:700;
    letter-spacing:-0.5px;
  }
  .login-box p { 
    margin:0 0 2.5rem; 
    color:#666; 
    font-size:1rem; 
    letter-spacing:-0.2px;
  }
  .login-box input { 
    width:100%; 
    padding:1.1rem 1.2rem; 
    border:2px solid #e0e0e0; 
    border-radius:16px; 
    font-size:1.05rem; 
    margin-bottom:1.5rem; 
    background:white; 
    color:#212121;
    transition:all .3s ease;
  }
  .login-box input::placeholder { color:#bdbdbd; }
  .login-box input:focus { 
    outline:none; 
    border-color:#ff6f00;
    box-shadow:0 0 0 4px rgba(255,111,0,0.1);
    transform:translateY(-2px);
  }
  .login-box button { 
    width:100%; 
    padding:1.1rem; 
    background:linear-gradient(135deg, #ff6f00 0%, #ff8e53 100%);
    color:white; 
    border:none; 
    border-radius:16px; 
    font-size:1.05rem; 
    font-weight:700; 
    cursor:pointer; 
    transition:all .3s ease;
    box-shadow:0 4px 12px rgba(255,111,0,0.3);
    letter-spacing:0.5px;
  }
  .login-box button:hover { 
    transform:translateY(-2px);
    box-shadow:0 6px 20px rgba(255,111,0,0.4);
  }
  .login-box button:active {
    transform:translateY(0);
  }

  /* 헤더 */
  header { 
    background:linear-gradient(135deg, #ff6f00 0%, #ff8e53 100%);
    color:white; 
    padding:1.5rem 1rem;
    box-shadow:0 2px 12px rgba(0,0,0,.08);
    display:flex;
    align-items:center;
    justify-content:space-between;
    position:relative;
  }
  .header-left,
  .header-right {
    width:50px;
    flex-shrink:0;
  }
  .header-center {
    flex:1;
    text-align:center;
  }
  header h1 { 
    margin:0; 
    font-size:1.6rem; 
    font-weight:700;
    letter-spacing:-0.5px;
  }
  header p { 
    margin:.3rem 0 0; 
    opacity:.95; 
    font-size:.9rem; 
    letter-spacing:0.2px;
  }
  .back-btn,
  .mypage-btn {
    background:rgba(255,255,255,0.2);
    border:none;
    color:white;
    padding:.6rem .8rem;
    border-radius:10px;
    font-size:.9rem;
    font-weight:600;
    cursor:pointer;
    transition:all .2s;
    backdrop-filter:blur(10px);
  }
  .back-btn {
    opacity:0;
    pointer-events:none;
  }
  .back-btn.visible {
    opacity:1;
    pointer-events:all;
  }
  .back-btn:hover,
  .mypage-btn:hover,
  .logout-btn:hover {
    background:rgba(255,255,255,0.3);
    transform:translateY(-1px);
  }
  .logout-btn {
    background:rgba(255,255,255,0.2);
    border:none;
    color:white;
    padding:.6rem .8rem;
    border-radius:10px;
    font-size:.85rem;
    font-weight:600;
    cursor:pointer;
    transition:all .2s;
    backdrop-filter:blur(10px);
    white-space:nowrap;
  }

  /* 컨테이너 */
  .container { 
    max-width:640px; 
    margin:0 auto; 
    padding:1rem;
    overflow-x:hidden;
    width:100%;
  }

  /* 검색바 */
  .search-bar { 
    display:flex; 
    gap:.75rem; 
    margin-bottom:1rem;
  }
  .search-bar input { 
    flex:1; 
    padding:1rem 1.2rem; 
    border:none; 
    border-radius:16px; 
    font-size:1rem; 
    background:white; 
    color:#212121;
    box-shadow:0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04);
    transition:all .3s ease;
  }
  .search-bar input::placeholder { color:#bdbdbd; }
  .search-bar input:focus { 
    outline:none; 
    box-shadow:0 4px 16px rgba(255,111,0,.15), 0 0 0 2px rgba(255,111,0,.2);
    transform:translateY(-1px);
  }
  .search-bar input:disabled { 
    background:#f5f5f5; 
    color:#9e9e9e; 
    cursor:not-allowed; 
  }
  .search-bar button { 
    padding:1rem 1.8rem; 
    background:linear-gradient(135deg, #ff6f00 0%, #ff8e53 100%);
    color:white; 
    border:none; 
    border-radius:16px; 
    font-size:1rem; 
    font-weight:700; 
    cursor:pointer; 
    transition:all .3s ease;
    box-shadow:0 4px 12px rgba(255,111,0,0.25);
    white-space:nowrap;
    letter-spacing:0.3px;
  }
  .search-bar button:hover:not(:disabled) { 
    transform:translateY(-2px);
    box-shadow:0 6px 20px rgba(255,111,0,0.35);
  }
  .search-bar button:active:not(:disabled) {
    transform:translateY(0);
  }
  .search-bar button:disabled { 
    background:#e0e0e0; 
    cursor:not-allowed;
    box-shadow:none;
  }

  /* 지역 섹션 */
  .region-section { 
    background:white; 
    border-radius:20px; 
    padding:1.2rem; 
    margin-bottom:1rem; 
    box-shadow:0 2px 12px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.02);
  }
  .region-toggle { 
    width:100%; 
    display:flex; 
    align-items:center; 
    gap:.6rem; 
    background:none; 
    border:none; 
    font-size:1.05rem; 
    font-weight:700; 
    cursor:pointer; 
    padding:0; 
    color:#212121;
    letter-spacing:-0.3px;
  }
  .badge { 
    background:linear-gradient(135deg, #ff6f00 0%, #ff8e53 100%);
    color:white; 
    border-radius:12px; 
    padding:.2rem .6rem; 
    font-size:.85rem;
    font-weight:700;
    box-shadow:0 2px 6px rgba(255,111,0,0.25);
  }
  .arrow { 
    margin-left:auto; 
    font-size:.8rem; 
    color:#9e9e9e;
    transition:transform .3s ease;
  }

  /* 선택된 태그 */
  .selected-tags { 
    display:flex; 
    flex-wrap:wrap; 
    gap:.6rem; 
    margin-top:1rem; 
    align-items:center; 
  }
  .tag { 
    background:linear-gradient(135deg, #ff6f00 0%, #ff8e53 100%);
    color:white; 
    padding:.5rem .8rem; 
    border-radius:16px; 
    font-size:.85rem; 
    font-weight:600;
    display:flex; 
    align-items:center; 
    gap:.4rem;
    box-shadow:0 2px 8px rgba(255,111,0,0.2);
    animation:slideIn .3s ease;
  }
  @keyframes slideIn {
    from { opacity:0; transform:scale(0.8); }
    to { opacity:1; transform:scale(1); }
  }
  .tag-x { 
    background:rgba(255,255,255,0.3); 
    border:none; 
    color:white; 
    cursor:pointer; 
    font-size:1rem; 
    padding:.1rem .3rem;
    border-radius:8px;
    transition:background .2s;
  }
  .tag-x:hover { background:rgba(255,255,255,0.4); }
  .tag-clear { 
    background:white; 
    border:2px solid #e0e0e0; 
    color:#757575; 
    padding:.5rem .8rem; 
    border-radius:16px; 
    font-size:.85rem; 
    font-weight:600;
    cursor:pointer; 
    transition:all .3s ease;
  }
  .tag-clear:hover { 
    background:#fafafa; 
    border-color:#bdbdbd; 
    color:#424242;
    transform:translateY(-1px);
  }

  /* 피커 */
  .picker { 
    margin-top:1.2rem; 
    border-top:2px solid #f5f5f5; 
    padding-top:1.2rem; 
  }

  /* 탭 */
  .tabs { 
    display:flex; 
    gap:.6rem; 
    margin-bottom:1rem;
    background:#f5f5f5;
    padding:.4rem;
    border-radius:14px;
  }
  .tabs button { 
    flex:1; 
    padding:.8rem; 
    border:none; 
    background:transparent; 
    color:#757575; 
    border-radius:10px; 
    cursor:pointer; 
    font-size:.95rem; 
    font-weight:600; 
    transition:all .3s ease;
    letter-spacing:-0.2px;
  }
  .tabs button:hover:not(.active) { 
    background:rgba(255,111,0,0.05);
    color:#ff6f00;
  }
  .tabs button.active { 
    background:white; 
    color:#ff6f00;
    box-shadow:0 2px 8px rgba(0,0,0,.08);
  }

  /* 시/도 버튼 */
  .provinces { 
    display:flex; 
    gap:.6rem; 
    flex-wrap:wrap; 
    margin-bottom:1rem; 
  }
  .provinces button { 
    padding:.7rem 1.2rem; 
    border:2px solid #e0e0e0; 
    border-radius:20px; 
    background:white; 
    color:#424242; 
    cursor:pointer; 
    font-size:.9rem;
    font-weight:600;
    transition:all .3s ease;
    letter-spacing:-0.2px;
  }
  .provinces button:hover:not(.active) { 
    background:#fafafa; 
    border-color:#bdbdbd;
    transform:translateY(-2px);
    box-shadow:0 2px 8px rgba(0,0,0,.06);
  }
  .provinces button.active { 
    background:linear-gradient(135deg, #ff6f00 0%, #ff8e53 100%);
    color:white; 
    border-color:transparent;
    box-shadow:0 4px 12px rgba(255,111,0,0.3);
  }

  /* 구/군 체크박스 */
  .districts { 
    display:grid; 
    grid-template-columns:repeat(2, 1fr); 
    gap:.5rem; 
  }
  .districts label { 
    display:flex; 
    align-items:center; 
    gap:.6rem; 
    padding:.8rem .7rem; 
    border-radius:12px; 
    cursor:pointer; 
    font-size:.9rem;
    font-weight:500;
    transition:all .2s ease;
    border:2px solid transparent;
  }
  .districts label:hover { 
    background:#fff8f0;
    border-color:#ffe0b2;
  }
  .districts label.checked { 
    background:#fff3e0; 
    font-weight:600;
    border-color:#ffb74d;
  }
  .districts .select-all { 
    grid-column:1/-1; 
    background:#f9f9f9; 
    border:2px solid #e0e0e0; 
    margin-bottom:.6rem;
    font-weight:700;
  }
  .districts .select-all:hover {
    background:#fff8f0;
    border-color:#ffcc80;
  }
  .districts .select-all.checked { 
    background:#ffe0b2; 
    border-color:#ff8e53;
  }
  .districts input[type="checkbox"] { 
    accent-color:#ff6f00;
    width:18px;
    height:18px;
  }

  /* 에러 */
  .error { 
    background:#fff3e0; 
    color:#e65100; 
    padding:1rem 1.2rem; 
    border-radius:16px; 
    margin-bottom:1rem; 
    font-size:.95rem;
    border-left:4px solid #ff6f00;
    box-shadow:0 2px 8px rgba(230,81,0,0.1);
  }

  /* 로딩 */
  .loading { 
    text-align:center; 
    padding:3rem; 
    color:#9e9e9e; 
  }
  .spinner { 
    width:32px; 
    height:32px; 
    border:3px solid #f5f5f5; 
    border-top-color:#ff6f00; 
    border-radius:50%; 
    animation:spin .6s linear infinite; 
    margin:0 auto .8rem; 
  }
  @keyframes spin { to { transform:rotate(360deg); } }

  /* 결과 헤더 */
  .results-header { 
    font-size:.95rem; 
    color:#757575; 
    margin-bottom:.8rem;
    font-weight:600;
    letter-spacing:-0.2px;
    display:flex;
    align-items:center;
    gap:.5rem;
    flex-wrap:wrap;
  }

  .history-badge {
    background:linear-gradient(135deg, #ff6f00 0%, #ff8e53 100%);
    color:white;
    padding:.3rem .6rem;
    border-radius:12px;
    font-size:.75rem;
    font-weight:700;
    letter-spacing:0.3px;
  }

  /* 최근 검색 기록 */
  .search-history-section {
    background:white;
    border-radius:20px;
    padding:1.2rem;
    margin-bottom:1rem;
    box-shadow:0 2px 12px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.02);
  }

  .search-history-section h3 {
    margin:0 0 .8rem;
    font-size:1.05rem;
    font-weight:700;
    color:#212121;
    letter-spacing:-0.3px;
  }

  .history-list {
    display:flex;
    flex-direction:column;
    gap:.5rem;
  }

  .history-item {
    background:#f9f9f9;
    border:2px solid #e0e0e0;
    border-radius:12px;
    padding:.8rem 1rem;
    text-align:left;
    cursor:pointer;
    transition:all .2s ease;
    width:100%;
  }

  .history-item:hover {
    background:#fff8f0;
    border-color:#ffb74d;
    transform:translateX(4px);
  }

  .history-query {
    font-size:.95rem;
    font-weight:600;
    color:#212121;
    margin-bottom:.3rem;
  }

  .history-meta {
    font-size:.8rem;
    color:#9e9e9e;
  }

  /* 최근 사용 지역 */
  .recent-regions {
    margin-top:.8rem;
    padding-top:.8rem;
    border-top:1px solid #f5f5f5;
  }

  .recent-label {
    font-size:.85rem;
    color:#757575;
    margin-bottom:.5rem;
    font-weight:600;
  }

  .recent-tags {
    display:flex;
    gap:.5rem;
    flex-wrap:wrap;
  }

  .recent-tag {
    background:linear-gradient(135deg, #fff8f0 0%, #fff3e0 100%);
    border:2px solid #ffcc80;
    color:#ff6f00;
    padding:.5rem .9rem;
    border-radius:16px;
    font-size:.85rem;
    font-weight:600;
    cursor:pointer;
    transition:all .2s ease;
  }

  .recent-tag:hover {
    background:linear-gradient(135deg, #ff6f00 0%, #ff8e53 100%);
    color:white;
    border-color:transparent;
    transform:translateY(-2px);
    box-shadow:0 4px 12px rgba(255,111,0,0.3);
  }

  /* 아이템 리스트 */
  .items { 
    display:flex; 
    flex-direction:column; 
    gap:.8rem; 
  }
  .item { 
    display:flex; 
    gap:.8rem; 
    background:white; 
    border-radius:16px; 
    padding:1rem; 
    box-shadow:0 2px 8px rgba(0,0,0,.05), 0 0 0 1px rgba(0,0,0,.02);
    text-decoration:none; 
    color:inherit;
    transition:all .3s ease;
  }
  .item:hover {
    transform:translateY(-2px);
    box-shadow:0 4px 16px rgba(0,0,0,.1), 0 0 0 1px rgba(0,0,0,.04);
  }
  .item:active { 
    transform:translateY(0);
  }
  .item.sold-out { 
    opacity:0.5; 
  }
  .item.sold-out .title { 
    text-decoration:line-through; 
  }
  .item img { 
    width:90px; 
    height:90px; 
    border-radius:12px; 
    object-fit:cover; 
    flex-shrink:0;
    background:#f5f5f5;
  }
  .no-img { 
    width:90px; 
    height:90px; 
    border-radius:12px; 
    background:linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%);
    display:flex; 
    align-items:center; 
    justify-content:center; 
    font-size:1.5rem; 
    flex-shrink:0; 
  }
  .info { 
    flex:1; 
    min-width:0; 
    display:flex; 
    flex-direction:column; 
    justify-content:center;
    gap:.3rem;
  }
  .title-row { 
    display:flex; 
    align-items:center; 
    gap:.5rem; 
  }
  .title { 
    font-weight:600; 
    font-size:.95rem; 
    overflow:hidden; 
    text-overflow:ellipsis; 
    white-space:nowrap; 
    flex:1; 
    min-width:0;
    letter-spacing:-0.2px;
    color:#212121;
  }
  .bookmark-btn {
    background:none;
    border:none;
    font-size:1.3rem;
    cursor:pointer;
    padding:.2rem;
    line-height:1;
    color:#ddd;
    transition:all .2s ease;
    flex-shrink:0;
  }
  .bookmark-btn:hover {
    transform:scale(1.2);
    color:#ffb300;
  }
  .bookmark-btn.bookmarked {
    color:#ff6f00;
    animation:bookmarkPop .3s ease;
  }
  @keyframes bookmarkPop {
    0%, 100% { transform:scale(1); }
    50% { transform:scale(1.3); }
  }
  .status-badge { 
    padding:.3rem .6rem; 
    border-radius:10px; 
    font-size:.7rem; 
    font-weight:700; 
    white-space:nowrap; 
    flex-shrink:0;
    letter-spacing:0.3px;
  }
  .status-badge.ongoing { 
    background:#4caf50; 
    color:white; 
  }
  .status-badge.reserved { 
    background:#2196f3; 
    color:white; 
  }
  .status-badge.soldout,
  .status-badge.completed { 
    background:#9e9e9e; 
    color:white; 
  }
  .price { 
    color:#ff6f00; 
    font-weight:700; 
    font-size:1.05rem;
    letter-spacing:-0.3px;
  }
  .meta { 
    font-size:.8rem; 
    color:#9e9e9e;
    letter-spacing:-0.1px;
  }

  /* 빈 결과 */
  .empty { 
    text-align:center; 
    padding:3rem 1rem; 
    color:#9e9e9e; 
    background:white; 
    border-radius:20px;
    box-shadow:0 2px 8px rgba(0,0,0,.04);
    font-size:1rem;
  }

  /* 필터 컨트롤 */
  .filter-controls { 
    display:flex; 
    gap:.6rem; 
    margin-bottom:1rem; 
    flex-wrap:wrap; 
    align-items:center;
    background:white;
    padding:1rem;
    border-radius:16px;
    box-shadow:0 2px 8px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.02);
  }
  .filter-controls input { 
    flex:1; 
    min-width:160px; 
    padding:.8rem 1rem; 
    border:2px solid #e0e0e0; 
    border-radius:12px; 
    font-size:.9rem; 
    color:#212121; 
    background:white;
    transition:all .3s ease;
  }
  .filter-controls input::placeholder { color:#bdbdbd; }
  .filter-controls input:focus {
    outline:none;
    border-color:#ff6f00;
    box-shadow:0 0 0 3px rgba(255,111,0,0.1);
  }
  .filter-controls select { 
    padding:.8rem 1rem; 
    border:2px solid #e0e0e0; 
    border-radius:12px; 
    font-size:.9rem; 
    background:white; 
    color:#424242; 
    cursor:pointer;
    font-weight:500;
    transition:all .3s ease;
  }
  .filter-controls select:hover {
    border-color:#bdbdbd;
  }
  .filter-controls select:focus {
    outline:none;
    border-color:#ff6f00;
    box-shadow:0 0 0 3px rgba(255,111,0,0.1);
  }
  .filter-controls select option { 
    background:white; 
    color:#212121; 
    padding:.5rem;
  }
  .filter-controls label { 
    display:flex; 
    align-items:center; 
    gap:.5rem; 
    font-size:.9rem; 
    color:#424242; 
    cursor:pointer; 
    white-space:nowrap;
    font-weight:600;
    padding:.4rem .8rem;
    border-radius:12px;
    transition:all .2s ease;
  }
  .filter-controls label:hover { 
    background:#fff8f0;
    color:#ff6f00; 
  }
  .filter-controls input[type="checkbox"] { 
    accent-color:#ff6f00; 
    cursor:pointer;
    width:18px;
    height:18px;
  }
  .filter-info { 
    font-size:.9rem; 
    color:#757575; 
    padding:.5rem .8rem;
    font-weight:600;
  }

  /* 페이지네이션 */
  .pagination { 
    display:flex; 
    gap:.5rem; 
    justify-content:center; 
    margin-top:1.5rem; 
    flex-wrap:wrap; 
  }
  .pagination button { 
    padding:.7rem 1rem; 
    border:2px solid #e0e0e0; 
    background:white; 
    color:#424242; 
    border-radius:12px; 
    cursor:pointer; 
    font-size:.9rem; 
    min-width:44px;
    font-weight:600;
    transition:all .3s ease;
  }
  .pagination button:hover:not(:disabled) { 
    background:#fafafa;
    border-color:#bdbdbd;
    transform:translateY(-2px);
    box-shadow:0 2px 8px rgba(0,0,0,.06);
  }
  .pagination button:disabled { 
    opacity:.3; 
    cursor:not-allowed; 
  }
  .pagination button.active { 
    background:linear-gradient(135deg, #ff6f00 0%, #ff8e53 100%);
    color:white; 
    border-color:transparent;
    box-shadow:0 4px 12px rgba(255,111,0,0.3);
  }
  .pagination span { 
    padding:.7rem; 
    color:#bdbdbd;
    font-weight:700;
  }
</style>
