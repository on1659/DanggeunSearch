<script>
  import { onMount } from 'svelte';
  import RegionSelector from './lib/RegionSelector.svelte';
  import SearchForm from './lib/SearchForm.svelte';
  import SearchResults from './lib/SearchResults.svelte';
  import LoadingSpinner from './lib/LoadingSpinner.svelte';

  let regions = {};
  let selectedRegions = [];
  let searchResults = null;
  let loading = false;
  let error = null;

  onMount(async () => {
    try {
      const response = await fetch('/api/regions');
      regions = await response.json();
    } catch (err) {
      console.error('Failed to load regions:', err);
      error = '지역 데이터를 불러오는데 실패했습니다.';
    }
  });

  async function handleSearch(searchData) {
    if (selectedRegions.length === 0) {
      alert('검색할 지역을 선택해주세요.');
      return;
    }

    loading = true;
    error = null;
    searchResults = null;

    try {
      const params = new URLSearchParams({
        query: searchData.query,
        regions: selectedRegions.join(','),
      });

      if (searchData.category) {
        params.append('category', searchData.category);
      }

      if (searchData.minPrice) {
        params.append('minPrice', searchData.minPrice);
      }

      if (searchData.maxPrice) {
        params.append('maxPrice', searchData.maxPrice);
      }

      const response = await fetch(`/api/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`검색 실패: ${response.status}`);
      }

      searchResults = await response.json();
    } catch (err) {
      console.error('Search failed:', err);
      error = err.message || '검색 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  }

  function handleRegionChange(event) {
    selectedRegions = event.detail.selectedRegions;
  }
</script>

<main class="app">
  <header class="header">
    <div class="container">
      <h1>🥕 당근마켓 다중지역 검색</h1>
      <p>여러 지역의 중고거래 매물을 한번에 검색하세요</p>
    </div>
  </header>

  <div class="container">
    {#if error}
      <div class="error-message">
        ⚠️ {error}
      </div>
    {/if}

    <div class="search-section">
      <SearchForm on:search={handleSearch} disabled={loading} />
      
      <RegionSelector 
        {regions} 
        on:change={handleRegionChange}
        disabled={loading}
      />

      {#if selectedRegions.length > 0}
        <div class="selected-regions">
          <h3>선택된 지역 ({selectedRegions.length}개)</h3>
          <div class="region-tags">
            {#each selectedRegions as region}
              <span class="region-tag">{region.split('-')[0]}</span>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    {#if loading}
      <LoadingSpinner message="검색 중..." />
    {/if}

    {#if searchResults}
      <SearchResults results={searchResults} />
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    background-color: #f5f5f5;
    color: #333;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .app {
    min-height: 100vh;
  }

  .header {
    background: linear-gradient(135deg, #ff6f00, #ff9900);
    color: white;
    padding: 2rem 0;
    text-align: center;
    box-shadow: 0 2px 10px rgba(255, 111, 0, 0.2);
  }

  .header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: bold;
  }

  .header p {
    margin: 0;
    font-size: 1.1rem;
    opacity: 0.9;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .search-section {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin: 2rem 0;
    padding: 2rem;
  }

  .selected-regions {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e0e0e0;
  }

  .selected-regions h3 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1.1rem;
  }

  .region-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .region-tag {
    background: #ff6f00;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
    border-left: 4px solid #c62828;
  }

  @media (max-width: 768px) {
    .header h1 {
      font-size: 1.5rem;
    }

    .header p {
      font-size: 1rem;
    }

    .search-section {
      margin: 1rem 0;
      padding: 1.5rem;
      border-radius: 8px;
    }

    .container {
      padding: 0 0.75rem;
    }
  }
</style>