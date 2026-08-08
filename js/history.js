// ===== ORDER HISTORY =====

function renderHistory() {
  const history = Store.getHistory();
  const listEl = document.getElementById('historyList');
  const emptyEl = document.getElementById('historyEmpty');

  if (!listEl) return;

  if (history.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  listEl.innerHTML = history.map(order => {
    const date = new Date(order.placedAt);
    const dateStr = date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });

    const itemsSummary = order.items
      .map(i => `${i.emoji} ${i.name} ×${i.qty}`)
      .join(' · ');

    const statusLabel = {
      preparing: 'Preparing',
      ready: 'Ready',
      collected: 'Collected'
    }[order.status] || order.status;

    return `
      <div class="history-card">
        <div class="history-card-header">
          <div>
            <div class="history-queue">#${String(order.queueNumber).padStart(3,'0')}</div>
            <div class="history-date">${dateStr} · ${timeStr}</div>
          </div>
          <span class="history-status ${order.status}">${statusLabel}</span>
        </div>
        <div class="history-items">${itemsSummary}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <div class="history-total">${Store.formatPrice(order.total)}</div>
          <button class="btn-reorder" onclick="reorder(${JSON.stringify(order.items).replace(/"/g, '&quot;')})">
            🔁 Reorder
          </button>
        </div>
      </div>`;
  }).join('');
}

function reorder(items) {
  // Add items back to cart
  const cart = [];
  items.forEach(i => {
    const menuItem = MENU_ITEMS.find(m => m.id === i.id);
    if (menuItem && !menuItem.soldOut) {
      cart.push({ id: i.id, qty: i.qty });
    }
  });
  Store.saveCart(cart);
  showToast('Items added to cart! 🛒');
  setTimeout(() => window.location.href = 'index.html', 1000);
}

function clearHistory() {
  if (!confirm('Clear all order history?')) return;
  Store.clearHistory();
  renderHistory();
  showToast('History cleared');
}

document.addEventListener('DOMContentLoaded', renderHistory);
