<script>
  import { createEventDispatcher } from 'svelte';

  export let disabled = false;

  const dispatch = createEventDispatcher();

  let query = '';
  let category = '';
  let minPrice = '';
  let maxPrice = '';
  let showAdvanced = false;

  const categories = [
    { id: '', label: '전체 카테고리' },
    { id: '1', label: '디지털기기' },
    { id: '172', label: '생활가전' },
    { id: '8', label: '가구/인테리어' },
    { id: '7', label: '생활/가공식품' },
    { id: '9', label: '유아동' },
    { id: '6', label: '여성의류' },
    { id: '10', label: '남성패션/잡화' },
    { id: '11', label: '뷰티/미용' },
    { id: '2', label: '스포츠/레저' },
    { id: '12', label: '취미/게임/음반' },
    { id: '13', label: '도서' },
    { id: '14', label: '티켓/교환권' },
    { id: '3', label: '가공식품' },
    { id: '4', label: '반려동물용품' },
    { id: '5', label: '식물' },
    { id: '15', label: '기타 중고물품' }
  ];

  function handleSubmit(event) {
    event.preventDefault();
    
    if (!query.trim()) {
      alert('검색어를 입력해주세요.');
      return;
    }

    // 가격 유효성 검사
    if (minPrice && maxPrice) {
      const min = parseInt(minPrice);
      const max = parseInt(maxPrice);
      if (min >= max) {
        alert('최소 가격은 최대 가격보다 작아야 합니다.');
        return;
      }
    }

    dispatch('search', {
      query: query.trim(),
      category,
      minPrice,
      maxPrice
    });
  }

  function toggleAdvanced() {
    showAdvanced = !showAdvanced;
  }
</script>

<div class="search-form">
  <h2>검색 조건</h2>
  
  <form on:submit={handleSubmit}>
    <!-- 검색어 입력 -->
    <div class="form-group">
      <label for="query">검색어</label>
      <div class="search-input-group">
        <input
          id="query"
          type="text"
          bind:value={query}
          placeholder="예: 아이폰, 맥북, 의자..."
          {disabled}
          required
        />
        <button type="submit" class="search-btn" {disabled}>
          🔍 검색
        </button>
      </div>
    </div>

    <!-- 고급 옵션 토글 -->
    <button
      type="button"
      class="advanced-toggle"
      on:click={toggleAdvanced}
      {disabled}
    >
      {showAdvanced ? '▼' : '▶'} 상세 필터
    </button>

    {#if showAdvanced}
      <div class="advanced-options">
        <!-- 카테고리 선택 -->
        <div class="form-group">
          <label for="category">카테고리</label>
          <select id="category" bind:value={category} {disabled}>
            {#each categories as cat}
              <option value={cat.id}>{cat.label}</option>
            {/each}
          </select>
        </div>

        <!-- 가격 범위 -->
        <div class="form-group">
          <label>가격 범위</label>
          <div class="price-range">
            <div class="price-input-group">
              <input
                type="number"
                bind:value={minPrice}
                placeholder="최소 가격"
                min="0"
                step="1000"
                {disabled}
              />
              <span class="currency">원</span>
            </div>
            <span class="range-separator">~</span>
            <div class="price-input-group">
              <input
                type="number"
                bind:value={maxPrice}
                placeholder="최대 가격"
                min="0"
                step="1000"
                {disabled}
              />
              <span class="currency">원</span>
            </div>
          </div>
          <div class="price-presets">
            <button
              type="button"
              on:click={() => { minPrice = ''; maxPrice = '50000'; }}
              {disabled}
            >
              5만원 이하
            </button>
            <button
              type="button"
              on:click={() => { minPrice = '50000'; maxPrice = '100000'; }}
              {disabled}
            >
              5-10만원
            </button>
            <button
              type="button"
              on:click={() => { minPrice = '100000'; maxPrice = ''; }}
              {disabled}
            >
              10만원 이상
            </button>
          </div>
        </div>
      </div>
    {/if}
  </form>
</div>

<style>
  .search-form {
    margin-bottom: 1.5rem;
  }

  .search-form h2 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1.2rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #555;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .search-input-group {
    display: flex;
    gap: 0.75rem;
  }

  input[type="text"],
  input[type="number"],
  select {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  input[type="text"]:focus,
  input[type="number"]:focus,
  select:focus {
    outline: none;
    border-color: #ff6f00;
    box-shadow: 0 0 0 3px rgba(255, 111, 0, 0.1);
  }

  input:disabled,
  select:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .search-btn {
    background: #ff6f00;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    white-space: nowrap;
  }

  .search-btn:hover:not(:disabled) {
    background: #e65100;
  }

  .search-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .advanced-toggle {
    background: none;
    border: 1px solid #e0e0e0;
    color: #666;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    margin-bottom: 1rem;
    transition: all 0.2s;
  }

  .advanced-toggle:hover:not(:disabled) {
    background: #f5f5f5;
    border-color: #ccc;
  }

  .advanced-toggle:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .advanced-options {
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
  }

  .price-range {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .price-input-group {
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 150px;
  }

  .currency {
    margin-left: 0.5rem;
    color: #666;
    font-size: 0.9rem;
  }

  .range-separator {
    color: #666;
    font-weight: 500;
  }

  .price-presets {
    width: 100%;
    margin-top: 0.75rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .price-presets button {
    background: none;
    border: 1px solid #ddd;
    color: #666;
    padding: 0.375rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .price-presets button:hover:not(:disabled) {
    background: #ff6f00;
    color: white;
    border-color: #ff6f00;
  }

  .price-presets button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 768px) {
    .search-input-group {
      flex-direction: column;
    }

    .search-btn {
      width: 100%;
    }

    .price-range {
      flex-direction: column;
      align-items: stretch;
    }

    .price-input-group {
      min-width: unset;
    }

    .range-separator {
      text-align: center;
      margin: 0.25rem 0;
    }

    .price-presets {
      justify-content: center;
    }
  }
</style>