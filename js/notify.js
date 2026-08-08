// =====================================================
// CANTEENGO — CROSS-PAGE READY NOTIFICATION
// Listens to localStorage events and shows a popup
// on whichever page the student is on.
// =====================================================

(function initCrossPageNotify() {

  // ── CREATE POPUP DOM (once) ──────────────────────
  function createPopup() {
    if (document.getElementById('readyPopup')) return;
    const el = document.createElement('div');
    el.id = 'readyPopup';
    el.className = 'ready-popup hidden';
    el.innerHTML = `
      <div class="ready-popup-inner">
        <div class="ready-popup-icon">🍱</div>
        <div class="ready-popup-body">
          <div class="ready-popup-title">Your order is ready!</div>
          <div class="ready-popup-sub" id="readyPopupSub">Queue #041 · Rice Station</div>
        </div>
        <div class="ready-popup-actions">
          <a href="queue.html" class="ready-popup-btn">View →</a>
          <button class="ready-popup-dismiss" onclick="dismissReadyPopup()">✕</button>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  function showReadyPopup(queueNumber, stallName) {
    createPopup();
    const el  = document.getElementById('readyPopup');
    const sub = document.getElementById('readyPopupSub');
    if (sub) sub.textContent = `Queue #${String(queueNumber).padStart(3,'0')} · ${stallName}`;
    if (el)  { el.classList.remove('hidden'); el.classList.add('visible'); }
    // Auto-dismiss after 30s
    clearTimeout(window._readyPopupTimeout);
    window._readyPopupTimeout = setTimeout(dismissReadyPopup, 30000);
  }

  window.dismissReadyPopup = function () {
    const el = document.getElementById('readyPopup');
    if (el) { el.classList.remove('visible'); el.classList.add('hidden'); }
  };

  // ── LISTEN FOR storage EVENTS (cross-tab) ────────
  window.addEventListener('storage', e => {
    if (e.key === 'cg_ready_signal' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        showReadyPopup(data.queueNumber, data.stallName);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('CanteenGo — Order Ready! 🍱', {
            body: `Queue #${String(data.queueNumber).padStart(3,'0')} at ${data.stallName} — pick it up now!`
          });
        }
      } catch {}
    }
  });

  // ── ALSO POLL for same-tab readiness ─────────────
  // (storage events don't fire in the same tab that set the value)
  let lastKnownStatuses = {};

  function pollActiveOrders() {
    if (typeof Store === 'undefined') return;
    const orders = Store.getActiveOrders();
    orders.forEach(order => {
      const prev = lastKnownStatuses[order.id];
      if (prev === 'preparing' && order.status === 'ready') {
        showReadyPopup(order.queueNumber, order.stallName);
      }
      lastKnownStatuses[order.id] = order.status;
    });
  }

  // Start polling after Store is available
  document.addEventListener('DOMContentLoaded', () => {
    // Seed initial statuses
    if (typeof Store !== 'undefined') {
      Store.getActiveOrders().forEach(o => { lastKnownStatuses[o.id] = o.status; });
    }
    setInterval(pollActiveOrders, 3000);

    // Check on load — if any order is already ready and on a non-queue page
    if (!window.location.pathname.endsWith('queue.html')) {
      if (typeof Store !== 'undefined') {
        Store.getActiveOrders().forEach(o => {
          if (o.status === 'ready') showReadyPopup(o.queueNumber, o.stallName);
        });
      }
    }
  });

})();
