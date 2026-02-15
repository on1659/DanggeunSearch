<script>
  import { mapPaths } from './data/map-paths.js';

  export let regions = {}; // { province: { district: regionId } }
  export let selectedRegions = [];
  export let onToggle; // (province, district, regionId) => void

  let hoveredRegion = null;

  function isSelected(regionId) {
    return selectedRegions.some(r => r.regionId === regionId);
  }

  function handleClick(province, district) {
    const regionId = regions[province]?.[district];
    if (regionId && onToggle) {
      onToggle(province, district, regionId);
    }
  }
</script>

<div class="map-container">
  <svg viewBox="0 0 560 560" xmlns="http://www.w3.org/2000/svg">
    {#each Object.entries(mapPaths) as [province, districts]}
      {#each Object.entries(districts) as [district, { path, center }]}
        {@const regionId = regions[province]?.[district]}
        {#if regionId}
          <path
            d={path}
            class:selected={isSelected(regionId)}
            class:hovered={hoveredRegion === `${province}-${district}`}
            on:click={() => handleClick(province, district)}
            on:mouseenter={() => hoveredRegion = `${province}-${district}`}
            on:mouseleave={() => hoveredRegion = null}
            role="button"
            tabindex="0"
            aria-label={district}
          />
          {#if hoveredRegion === `${province}-${district}`}
            <text x={center[0]} y={center[1]} class="district-label">
              {district}
            </text>
          {/if}
        {/if}
      {/each}
    {/each}
  </svg>
  <div class="map-legend">
    <div class="legend-item">
      <div class="color-box unselected"></div>
      <span>미선택</span>
    </div>
    <div class="legend-item">
      <div class="color-box selected"></div>
      <span>선택됨</span>
    </div>
  </div>
</div>

<style>
  .map-container {
    background: white;
    border-radius: 10px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,.06);
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
  }

  path {
    fill: #eee;
    stroke: #999;
    stroke-width: 1;
    cursor: pointer;
    transition: all 0.2s;
  }

  path:hover {
    fill: #ffd54f;
    stroke: #ff6f00;
    stroke-width: 2;
  }

  path.selected {
    fill: #ff6f00;
    stroke: #e65100;
    stroke-width: 2;
  }

  path.selected:hover {
    fill: #ff8f00;
  }

  .district-label {
    font-size: 10px;
    font-weight: 600;
    fill: #333;
    text-anchor: middle;
    pointer-events: none;
    user-select: none;
  }

  .map-legend {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid #eee;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
  }

  .color-box {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid #999;
  }

  .color-box.unselected {
    background: #eee;
  }

  .color-box.selected {
    background: #ff6f00;
    border-color: #e65100;
  }
</style>
