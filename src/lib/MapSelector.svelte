<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import seoulGeo from './data/seoul-geo.json';
  import gyeonggiGeo from './data/gyeonggi-geo.json';

  export let regions = {}; // { province: { district: regionId } }
  export let selectedRegions = [];
  export let onToggle; // (province, district, regionId) => void

  let mapContainer;
  let map;
  let geoLayers = {};

  function isSelected(regionId) {
    return selectedRegions.some(r => r.regionId === regionId);
  }

  function handleClick(province, district) {
    const regionId = regions[province]?.[district];
    if (regionId && onToggle) {
      onToggle(province, district, regionId);
    }
  }

  function getColor(feature) {
    const province = feature.properties.province;
    const district = feature.properties.name;
    const regionId = regions[province]?.[district];

    return isSelected(regionId) ? '#ff6f00' : '#eeeeee';
  }

  function style(feature) {
    return {
      fillColor: getColor(feature),
      weight: 2,
      opacity: 1,
      color: '#999',
      fillOpacity: 0.7
    };
  }

  function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
      weight: 3,
      color: '#ff6f00',
      fillOpacity: 0.9
    });
    layer.bringToFront();
  }

  function resetHighlight(e) {
    const layer = e.target;
    const feature = layer.feature;
    layer.setStyle(style(feature));
  }

  function onEachFeature(feature, layer) {
    const province = feature.properties.province;
    const district = feature.properties.name;

    // 툴팁 추가
    layer.bindTooltip(district, {
      permanent: false,
      direction: 'center',
      className: 'district-tooltip'
    });

    // 이벤트 리스너
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: () => handleClick(province, district)
    });

    // 레이어 저장 (나중에 스타일 업데이트용)
    if (!geoLayers[province]) geoLayers[province] = {};
    geoLayers[province][district] = layer;
  }

  onMount(() => {
    // Leaflet 지도 초기화
    map = L.map(mapContainer, {
      zoomControl: true,
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: false
    }).setView([37.5, 127.0], 9);

    // 타일 레이어 추가 (기본 지도)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 13,
      minZoom: 8
    }).addTo(map);

    // GeoJSON 레이어 추가
    L.geoJSON(seoulGeo, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);

    L.geoJSON(gyeonggiGeo, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  // selectedRegions가 변경될 때마다 지도 스타일 업데이트
  $: if (map && Object.keys(geoLayers).length > 0) {
    Object.values(geoLayers).forEach(provinceLayers => {
      Object.values(provinceLayers).forEach(layer => {
        if (layer && layer.feature) {
          layer.setStyle(style(layer.feature));
        }
      });
    });
  }
</script>

<div class="map-wrapper">
  <div bind:this={mapContainer} class="map-container"></div>
  <div class="map-legend">
    <div class="legend-title">지도에서 지역을 클릭하세요</div>
    <div class="legend-items">
      <div class="legend-item">
        <div class="color-box unselected"></div>
        <span>미선택</span>
      </div>
      <div class="legend-item">
        <div class="color-box selected"></div>
        <span>선택됨</span>
      </div>
    </div>
    <div class="legend-hint">💡 마우스 휠로 확대/축소, 드래그로 이동</div>
  </div>
</div>

<style>
  .map-wrapper {
    background: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,.06);
  }

  .map-container {
    width: 100%;
    height: 500px;
    position: relative;
  }

  .map-legend {
    padding: 1rem;
    border-top: 1px solid #eee;
    background: #fafafa;
  }

  .legend-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.5rem;
  }

  .legend-items {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
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

  .legend-hint {
    font-size: 0.75rem;
    color: #666;
    margin-top: 0.5rem;
  }

  :global(.district-tooltip) {
    background: rgba(0, 0, 0, 0.8) !important;
    color: white !important;
    border: none !important;
    border-radius: 4px !important;
    padding: 4px 8px !important;
    font-size: 0.85rem !important;
    font-weight: 600 !important;
  }

  :global(.leaflet-control-attribution) {
    font-size: 0.7rem !important;
  }
</style>
