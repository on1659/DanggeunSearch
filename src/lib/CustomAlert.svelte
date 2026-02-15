<script>
  export let show = false;
  export let title = '';
  export let message = '';
  export let type = 'alert'; // 'alert' or 'confirm'
  export let onConfirm = () => {};
  export let onCancel = () => {};

  function handleConfirm() {
    onConfirm();
    show = false;
  }

  function handleCancel() {
    onCancel();
    show = false;
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }
</script>

{#if show}
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal-box">
      <div class="modal-icon">
        {#if type === 'confirm'}
          ⚠️
        {:else}
          ℹ️
        {/if}
      </div>

      {#if title}
        <h3 class="modal-title">{title}</h3>
      {/if}

      <p class="modal-message">{message}</p>

      <div class="modal-buttons">
        {#if type === 'confirm'}
          <button class="btn-cancel" on:click={handleCancel}>취소</button>
          <button class="btn-confirm" on:click={handleConfirm}>확인</button>
        {:else}
          <button class="btn-ok" on:click={handleConfirm}>확인</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-box {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
    text-align: center;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    animation: bounce 0.5s ease;
  }

  @keyframes bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .modal-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: #333;
    margin: 0 0 0.5rem;
  }

  .modal-message {
    font-size: 1rem;
    color: #666;
    line-height: 1.6;
    margin: 0 0 1.5rem;
    white-space: pre-line;
  }

  .modal-buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .btn-ok,
  .btn-confirm,
  .btn-cancel {
    padding: 0.75rem 2rem;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-ok,
  .btn-confirm {
    background: #ff6f00;
    color: white;
    min-width: 120px;
  }

  .btn-ok:hover,
  .btn-confirm:hover {
    background: #e65100;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 111, 0, 0.3);
  }

  .btn-cancel {
    background: #f5f5f5;
    color: #666;
    min-width: 120px;
  }

  .btn-cancel:hover {
    background: #e0e0e0;
    transform: translateY(-2px);
  }

  .btn-ok:active,
  .btn-confirm:active,
  .btn-cancel:active {
    transform: translateY(0);
  }
</style>
