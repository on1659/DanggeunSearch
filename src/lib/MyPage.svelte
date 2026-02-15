<script>
  import { onMount } from 'svelte';
  
  export let userName = '';

  let activeTab = 'clicked'; // 'clicked' | 'bookmarks'
  let clickedItems = [];
  let bookmarks = [];
  let loading = false;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    try {
      // 클릭 기록 로드
      const clickedRes = await fetch(`/api/clicked-items/${encodeURIComponent(userName)}`);
      if (clickedRes.ok) {
        clickedItems = await clickedRes.json();
      }

      // 북마크 로드
      const bookmarkRes = await fetch(`/api/bookmarks/${encodeURIComponent(userName)}`);
      if (bookmarkRes.ok) {
        bookmarks = await bookmarkRes.json();
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      loading = false;
    }
  }

  async function removeBookmark(itemLink, event) {
    event.preventDefault();
    try {
      const res = await fetch(`/api/bookmarks/${encodeURIComponent(userName)}/${encodeURIComponent(itemLink)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        bookmarks = bookmarks.filter(b => b.item_link !== itemLink);
      }
    } catch (err) {
      console.error('북마크 삭제 실패:', err);
    }
  }
</script>

<div class="mypage">
  <div class="mypage-header">
    <h2>👤 {userName}님의 페이지</h2>
  </div>

  <div class="tabs">
    <button 
      class:active={activeTab === 'clicked'}
      on:click={() => activeTab = 'clicked'}
    >
      📜 최근 본 매물 ({clickedItems.length}/30)
    </button>
    <button 
      class:active={activeTab === 'bookmarks'}
      on:click={() => activeTab = 'bookmarks'}
    >
      ⭐ 북마크 ({bookmarks.length}/10)
    </button>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>불러오는 중...</p>
    </div>
  {:else if activeTab === 'clicked'}
    {#if clickedItems.length === 0}
      <div class="empty">아직 본 매물이 없습니다</div>
    {:else}
      <div class="items">
        {#each clickedItems as item}
          <a class="item" href={item.item_link} target="_blank" rel="noopener">
            {#if item.item_thumbnail}
              <img src={item.item_thumbnail} alt="" loading="lazy" />
            {:else}
              <div class="no-img">🖼️</div>
            {/if}
            <div class="info">
              <div class="title">{item.item_title}</div>
              <div class="price">{item.item_price}</div>
              <div class="meta">{item.item_location}</div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  {:else}
    {#if bookmarks.length === 0}
      <div class="empty">북마크한 매물이 없습니다</div>
    {:else}
      <div class="items">
        {#each bookmarks as item}
          <a class="item" href={item.item_link} target="_blank" rel="noopener">
            {#if item.item_thumbnail}
              <img src={item.item_thumbnail} alt="" loading="lazy" />
            {:else}
              <div class="no-img">🖼️</div>
            {/if}
            <div class="info">
              <div class="title">{item.item_title}</div>
              <div class="price">{item.item_price}</div>
              <div class="meta">{item.item_location}</div>
            </div>
            <button 
              class="remove-btn" 
              on:click={(e) => removeBookmark(item.item_link, e)}
              title="북마크 삭제"
            >
              ✕
            </button>
          </a>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .mypage {
    max-width:640px;
    margin:0 auto;
    padding:1rem;
  }

  .mypage-header {
    background:white;
    border-radius:20px;
    padding:1.5rem;
    margin-bottom:1rem;
    box-shadow:0 2px 12px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.02);
    text-align:center;
  }

  .mypage-header h2 {
    margin:0;
    font-size:1.4rem;
    font-weight:700;
    color:#212121;
    letter-spacing:-0.5px;
  }

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

  @keyframes spin {
    to { transform:rotate(360deg); }
  }

  .empty {
    text-align:center;
    padding:3rem 1rem;
    color:#9e9e9e;
    background:white;
    border-radius:20px;
    box-shadow:0 2px 8px rgba(0,0,0,.04);
    font-size:1rem;
  }

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
    position:relative;
  }

  .item:hover {
    transform:translateY(-2px);
    box-shadow:0 4px 16px rgba(0,0,0,.1), 0 0 0 1px rgba(0,0,0,.04);
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

  .title {
    font-weight:600;
    font-size:.95rem;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    letter-spacing:-0.2px;
    color:#212121;
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

  .remove-btn {
    position:absolute;
    top:.8rem;
    right:.8rem;
    background:rgba(0,0,0,0.5);
    color:white;
    border:none;
    width:28px;
    height:28px;
    border-radius:50%;
    font-size:1rem;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    transition:all .2s;
  }

  .remove-btn:hover {
    background:rgba(0,0,0,0.7);
    transform:scale(1.1);
  }
</style>
