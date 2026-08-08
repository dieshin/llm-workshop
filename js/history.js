// =====================================================
// CANTEENGO — ORDER HISTORY
// Green collected cards, meal photo thumbnails
// =====================================================

function renderHistory() {
  const history = Store.getHistory();
  const listEl  = document.getElementById('historyList');
  const emptyEl = document.getElementById('historyEmpty');
  const statsEl = document.getElementById('historyStats');
  if (!listEl) return;

  if (!history.length) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    if (statsEl) statsEl.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  // Stats
  if (statsEl) {
    statsEl.style.display = 'grid';
    const totalSpent = history.reduce((s, o) => s + o.total, 0);
    document.getElementById('statTotalSpent').textContent  = Store.formatPrice(totalSpent);
    document.getElementById('statTotalOrders').textContent = String(history.length);
    document.getElementById('statTotalPts').textContent    = `${Store.getPoints()} pts`;
  }

  listEl.innerHTML = history.map(order => {
    const date       = new Date(order.placedAt);
    const dateStr    = date.toLocaleDateString('en-SG', { day:'numeric', month:'short', year:'numeric' });
    const timeStr    = date.toLocaleTimeString('en-SG', { hour:'2-digit', minute:'2-digit' });
    const items      = order.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(' · ');
    const stallLabel = { rice:'🍚', noodles:'🍜', snacks:'🥪', drinks:'🧋' }[order.stallKey] || '🍽️';

    const statusLabel = { preparing:'Preparing', ready:'Ready', collected:'Collected' }[order.status] || order.status;
    const isCollected = order.status === 'collected';

    const calInfo = order.totalCal ? `<span class="history-cal">🔥 ${order.totalCal} cal</span>` : '';
    const ptsInfo = order.ptsEarned ? `<span class="history-pts">+${order.ptsEarned} pts</span>` : '';

    // Photo thumbnail
    const photo    = Store.getOrderPhoto(order.id);
    const photoHtml = photo
      ? `<div class="history-photo-wrap"><img src="${photo}" class="history-photo-thumb" alt="meal photo"/></div>`
      : '';

    // Feedback badge
    const feedbackList = JSON.parse(localStorage.getItem('cg_feedback') || '[]');
    const hasFeedback  = feedbackList.some(f => f.orderId === order.id);
    const feedbackHtml = hasFeedback
      ? `<span class="history-feedback-badge">⭐ Reviewed</span>`
      : isCollected
        ? `<button class="history-feedback-btn" onclick="openHistoryFeedback('${order.id}','${order.stallKey || ''}','${(order.stallName||'').replace(/'/g,"\\'")}')">Rate meal</button>`
        : '';

    return `
      <div class="history-card${isCollected ? ' collected' : ''}" id="histCard-${order.id}">
        <div class="history-card-header">
          <div>
            <div class="history-queue${isCollected ? ' collected-num' : ''}">#${String(order.queueNumber).padStart(3,'0')}</div>
            <div class="history-date">${stallLabel} ${order.stallName || order.stall} · ${dateStr} ${timeStr}</div>
          </div>
          <span class="history-status ${order.status}">${statusLabel}</span>
        </div>
        ${photoHtml}
        <div class="history-items">${items}</div>
        <div class="history-card-footer">
          <div class="history-meta">${calInfo}${ptsInfo}</div>
          <div class="history-total">${Store.formatPrice(order.total)}</div>
        </div>
        <div class="history-card-actions">
          ${feedbackHtml}
          <button class="btn-reorder" onclick="reorder(${JSON.stringify(order.items).replace(/"/g,'&quot;')})">🔁 Order Again</button>
        </div>
      </div>`;
  }).join('');
}

function openHistoryFeedback(orderId, stallKey, stallName) {
  const order = { id: orderId, stallKey, stallName };
  // Reuse the queue page feedback modal logic
  if (typeof showFeedbackModal === 'function') {
    // Override redirect: after submit just re-render history
    showFeedbackModal(order);
    // Patch the redirect
    window._feedbackRedirectOverride = () => { renderHistory(); };
  } else {
    showToast('Please rate from the queue page after collection.');
  }
}

function reorder(items) {
  const cart = [];
  items.forEach(i => {
    const m = MENU_ITEMS.find(x => x.id === i.id);
    if (m && !m.soldOut) cart.push({ id: i.id, qty: i.qty });
  });
  Store.saveCart(cart);
  showToast('Items added to cart! 🛒');
  setTimeout(() => window.location.href = 'index.html', 900);
}

function clearHistory() {
  if (!confirm('Clear all order history?')) return;
  Store.clearHistory();
  renderHistory();
  showToast('History cleared');
}

document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  // Highlight recently collected order if redirected from queue
  const hash = window.location.hash;
  if (hash && hash.startsWith('#order-')) {
    const id = hash.slice(7);
    setTimeout(() => {
      const card = document.getElementById(`histCard-${id}`);
      if (card) { card.scrollIntoView({ behavior:'smooth', block:'center' }); card.classList.add('flash-highlight'); }
    }, 300);
  }
});
