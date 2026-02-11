<script>
  import { createEventDispatcher } from 'svelte';

  export let regions = {};
  export let disabled = false;

  const dispatch = createEventDispatcher();

  let selectedProvince = '';
  let selectedDistrict = '';
  let selectedRegions = [];
  let isOpen = false;

  $: provinces = Object.keys(regions);
  $: districts = selectedProvince ? Object.keys(regions[selectedProvince] || {}) : [];
  $: dongs = (selectedProvince && selectedDistrict) 
    ? Object.keys(regions[selectedProvince]?.[selectedDistrict] || {}) 
    : [];

  function selectProvince(province) {
    selectedProvince = province;
    selectedDistrict = '';
    isOpen = true;
  }

  function selectDistrict(district) {
    selectedDistrict = district;
  }

  function selectDong(dong) {
    if (!selectedProvince || !selectedDistrict) return;

    const regionId = regions[selectedProvince][selectedDistrict][dong];
    
    if (!selectedRegions.includes(regionId)) {
      selectedRegions = [...selectedRegions, regionId];
      dispatch('change', { selectedRegions });
    }
  }

  function removeRegion(regionId) {
    selectedRegions = selectedRegions.filter(id => id !== regionId);
    dispatch('change', { selectedRegions });
  }

  function clearAll() {
    selectedRegions = [];
    dispatch('change', { selectedRegions });
  }

  function getRegionDisplayName(regionId) {
    // regionId 형식: "동이름-ID"
    return regionId.split('-')[0];
  }
</script>

<div class="region-selector">
  <h2>지역 선택</h2>
  
  <div class="selector-grid">
    <!-- 시/도 선택 -->
    <div class="selector-column">
      <h3>시/도</h3>
      <div class="options-list">
        {#each provinces as province}
          <button
            type="button"
            class="option-item"
            class:active={selectedProvince === province}
            on:click={() => selectProvince(province)}
            {disabled}
          >
            {province}
          </button>
        {/each}
      </div>
    </div>

    <!-- 구/군 선택 -->
    <div class="selector-column">
      <h3>구/군</h3>
      <div class="options-list">
        {#if selectedProvince}
          {#each districts as district}
            <button
              type="button"
              class="option-item"
              class:active={selectedDistrict === district}
              on:click={() => selectDistrict(district)}
              {disabled}
            >
              {district}
            </button>
          {/each}
        {:else}
          <div class="placeholder">시/도를 먼저 선택해주세요</div>
        {/if}
      </div>
    </div>

    <!-- 동 선택 -->
    <div class="selector-column">
      <h3>동/읍/면</h3>
      <div class="options-list">
        {#if selectedProvince && selectedDistrict}
          {#each dongs as dong}
            <button
              type="button"
              class="option-item"
              on:click={() => selectDong(dong)}
              {disabled}
            >
              {dong}
            </button>
          {/each}
        {:else if selectedProvince}
          <div class="placeholder">구/군을 먼저 선택해주세요</div>
        {:else}
          <div class="placeholder">시/도를 먼저 선택해주세요</div>
        {/if}
      </div>
    </div>
  </div>

  {#if selectedRegions.length > 0}
    <div class="selected-regions">
      <div class="selected-header">
        <span>선택된 지역 ({selectedRegions.length}개)</span>
        <button type="button" class="clear-btn" on:click={clearAll} {disabled}>
          모두 제거
        </button>
      </div>
      <div class="selected-list">
        {#each selectedRegions as regionId}
          <div class="selected-region">
            <span>{getRegionDisplayName(regionId)}</span>
            <button
              type="button"
              class="remove-btn"
              on:click={() => removeRegion(regionId)}
              {disabled}
              title="제거"
            >
              ×
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .region-selector {
    margin-bottom: 1.5rem;
  }

  .region-selector h2 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1.2rem;
  }

  .selector-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .selector-column {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    background: #fafafa;
  }

  .selector-column h3 {
    margin: 0;
    padding: 0.75rem 1rem;
    background: #f0f0f0;
    font-size: 0.9rem;
    font-weight: 600;
    border-bottom: 1px solid #e0e0e0;
    color: #555;
  }

  .options-list {
    max-height: 200px;
    overflow-y: auto;
    background: white;
  }

  .option-item {
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    background: white;
    text-align: left;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .option-item:hover {
    background: #f5f5f5;
  }

  .option-item.active {
    background: #fff3e0;
    color: #ff6f00;
    font-weight: 500;
  }

  .option-item:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .placeholder {
    padding: 0.75rem 1rem;
    color: #999;
    font-style: italic;
    font-size: 0.9rem;
    text-align: center;
  }

  .selected-regions {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
  }

  .selected-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    font-weight: 600;
    color: #333;
  }

  .clear-btn {
    background: none;
    border: 1px solid #ff6f00;
    color: #ff6f00;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-btn:hover {
    background: #ff6f00;
    color: white;
  }

  .clear-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .selected-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .selected-region {
    display: flex;
    align-items: center;
    background: #ff6f00;
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
  }

  .remove-btn {
    background: none;
    border: none;
    color: white;
    margin-left: 0.5rem;
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .remove-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .remove-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 768px) {
    .selector-grid {
      grid-template-columns: 1fr;
    }

    .selected-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .options-list {
      max-height: 150px;
    }
  }
</style>