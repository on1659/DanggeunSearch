<script>
  export let message = '로딩 중...';
</script>

<div class="loading-container">
  <div class="loading-spinner">
    <div class="spinner"></div>
  </div>
  <div class="loading-message">{message}</div>
  <div class="loading-submessage">
    여러 지역의 매물을 검색하고 있습니다...
  </div>
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin: 2rem 0;
  }

  .loading-spinner {
    margin-bottom: 1.5rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #f0f0f0;
    border-top: 4px solid #ff6f00;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-message {
    font-size: 1.2rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.5rem;
  }

  .loading-submessage {
    font-size: 0.9rem;
    color: #666;
    text-align: center;
  }

  @media (max-width: 768px) {
    .loading-container {
      padding: 2rem 1rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border-width: 3px;
    }

    .loading-message {
      font-size: 1.1rem;
    }

    .loading-submessage {
      font-size: 0.85rem;
    }
  }
</style>