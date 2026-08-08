// =====================================================
// CANTEENGO — STALL STAFF DASHBOARD
// =====================================================

let currentFilter = 'preparing';
let stallOpen = true;
let session = null;

const STALL_ICONS = { rice:'🍚', noodles:'🍜', snacks:'🥪', drinks:'🧋' };

// ── INIT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  session = requireAuth(['staff']);
  if (!session) return;

  renderNavSession();
  setupStallHeader();
  renderOrders();
  renderQueuePanel();
  renderBroadcastHistory();
  updateStats();
  renderTodaySummary();

  // Auto-refresh every 5 seconds
  setInterval(() => {
    renderOrders();
    renderQueuePanel();
    updateStats();
  }, 5000);
});

// ── STALL HEADER ──────────────────────────────────
function setupStallHeader() {
  const stall = session.stall || 'rice';
  const stallName = session.stallName || 'My Stall';
  const icon = STALL_ICONS[stall] || '🍽️';

  const avatarEl = document.getElementById('stallAvatar');
  const titleEl  = document.getElementById('stallTitle');
  const nameEl   = document.getElementById('stallStaffName');
  if (avatarEl) avatarEl.textContent = icon;
  if (titleEl)  titleEl.textContent  = stallName;
  if (nameEl)   nameEl.textContent   = session.name;

  document.title = `${stallName} Dashboard — CanteenGo`;
}

// ── STALL OPEN/CLOSE TOGGLE ───────────────────────
function toggleStallOpen() {
  stallOpen = !stallOpen;
  const badge = document.getElementById('stallStatusBadge');
  const btn   = document.getElementById('toggleStallBtn');
  if (badge) {
    badge.textContent = stallOpen ? '● Open' : '● Closed';
    badge.className   = `stall-status-badge ${stallOpen ? 'open' : 'closed'}`;
  }
  if (btn) {
    btn.textContent  = stallOpen ? 'Close Stall' : 'Open Stall';
    btn.className    = `btn-toggle-stall ${stallOpen ? 'open' : 'closed'}`;
  }
  showToast(stallOpen ? '✅ Stall is now Open' : '🔴 Stall is now Closed');
}

// ── GET ALL ORDERS (for this stall) ──────────────
function getAllOrders() {
  const history = Store.getHistory();
  const active  = Store.getActiveOrder();
  const stall   = session.stall;
  const stallName = session.stallName;

  // Combine history + active order (deduplicated)
  const allIds = new Set();
  const orders = [];

  history.forEach(o => {
    // Match by stallName or include all if no stall filter
    const matches = !stallName || o.stall === stallName ||
      o.items.some(i => {
        const m = MENU_ITEMS.find(m => m.id === i.id);
        return m && m.stall === stall;
      });
    if (matches && !allIds.has(o.id)) {
      allIds.add(o.id);
      orders.push(o);
    }
  });

  return orders;
}

// ── RENDER ORDERS LIST ────────────────────────────
function renderOrders() {
  const list = document.getElementById('stallOrderList');
  if (!list) return;

  let orders = getAllOrders();
  if (currentFilter !== 'all') {
    orders = orders.filter(o => o.status === currentFilter);
  }

  if (orders.length === 0) {
    list.innerHTML = `
      <div class="stall-empty">
        <span>${currentFilter === 'preparing' ? '🎉' : '📭'}</span>
        <p>${currentFilter === 'preparing' ? 'No active orders right now.' : 'Nothing here yet.'}</p>
      </div>`;
    return;
  }

  list.innerHTML = orders.map(order => {
    const time = new Date(order.placedAt);
    const timeStr = time.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' });
    const elapsed = Math.floor((Date.now() - order.placedAt) / 60000);
    const urgency = elapsed > 10 ? 'urgent' : elapsed > 6 ? 'warning' : '';

    const statusConfig = {
      preparing: { label: 'Preparing',  cls: 'status-preparing' },
      ready:     { label: 'Ready ✓',    cls: 'status-ready'     },
      collected: { label: 'Collected',  cls: 'status-collected'  }
    };
    const sc = statusConfig[order.status] || statusConfig.preparing;
    const itemsSummary = order.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(', ');

    return `
      <div class="stall-order-card ${urgency}" onclick="openOrderDetail('${order.id}')">
        <div class="stall-order-top">
          <div class="stall-order-num">#${String(order.queueNumber).padStart(3,'0')}</div>
          <span class="stall-order-status ${sc.cls}">${sc.label}</span>
        </div>
        <div class="stall-order-customer">👤 ${order.name || 'Student'}</div>
        <div class="stall-order-items">${itemsSummary}</div>
        <div class="stall-order-footer">
          <span class="stall-order-time">🕐 ${timeStr} · ${elapsed}m ago</span>
          <span class="stall-order-total">${Store.formatPrice(order.total)}</span>
        </div>
        ${order.status === 'preparing' ? `
          <div class="stall-order-actions" onclick="event.stopPropagation()">
            <button class="btn-mark-ready" onclick="markOrderReady('${order.id}')">Mark Ready ✓</button>
          </div>` : ''}
        ${urgency === 'urgent' ? `<div class="urgent-badge">⚠️ ${elapsed}m — needs attention</div>` : ''}
      </div>`;
  }).join('');
}

// ── FILTER TABS ───────────────────────────────────
function filterOrders(btn) {
  document.querySelectorAll('.order-filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  renderOrders();
}

// ── MARK ORDER READY ──────────────────────────────
function markOrderReady(orderId) {
  const history = Store.getHistory();
  const idx = history.findIndex(o => o.id === orderId);
  if (idx < 0) return;
  history[idx].status = 'ready';
  localStorage.setItem('cg_history', JSON.stringify(history));

  // Also update active order if it matches
  const active = Store.getActiveOrder();
  if (active && active.id === orderId) {
    active.status = 'ready';
    Store.saveActiveOrder(active);
  }

  showToast(`✅ Order #${String(history[idx].queueNumber).padStart(3,'0')} marked as Ready`);
  renderOrders();
  updateStats();
  renderTodaySummary();
  closeOrderDetail();
}

function markAllReady() {
  const history = Store.getHistory();
  let count = 0;
  history.forEach(o => {
    if (o.status === 'preparing') { o.status = 'ready'; count++; }
  });
  localStorage.setItem('cg_history', JSON.stringify(history));
  showToast(`✅ ${count} order${count !== 1 ? 's' : ''} marked Ready`);
  renderOrders();
  updateStats();
}

function clearCollected() {
  if (!confirm('Remove all collected orders from the list?')) return;
  const history = Store.getHistory().filter(o => o.status !== 'collected');
  localStorage.setItem('cg_history', JSON.stringify(history));
  showToast('🗑 Collected orders cleared');
  renderOrders();
  updateStats();
}

// ── QUEUE PANEL ───────────────────────────────────
function renderQueuePanel() {
  const state = Store.getQueueState();
  const orders = getAllOrders().filter(o => o.status === 'preparing');

  const nowEl      = document.getElementById('nowServingNum');
  const nextEl     = document.getElementById('queueNext');
  const waitingEl  = document.getElementById('queueWaiting');
  const avgWaitEl  = document.getElementById('queueAvgWait');

  if (nowEl)     nowEl.textContent     = `#${String(state.nowServing).padStart(3,'0')}`;
  if (nextEl)    nextEl.textContent    = orders.length ? `#${String(state.nowServing + 1).padStart(3,'0')}` : '—';
  if (waitingEl) waitingEl.textContent = `${orders.length} order${orders.length !== 1 ? 's' : ''}`;
  if (avgWaitEl) avgWaitEl.textContent = `${orders.length * PREP_TIME_PER_ORDER} min`;
}

function callNext() {
  const state = Store.getQueueState();
  state.nowServing += 1;
  Store.saveQueueState(state);
  showToast(`📢 Now serving #${String(state.nowServing).padStart(3,'0')}`);
  renderQueuePanel();
}

function adjustServing(delta) {
  const state = Store.getQueueState();
  state.nowServing = Math.max(1, state.nowServing + delta);
  Store.saveQueueState(state);
  renderQueuePanel();
}

// ── STATS ─────────────────────────────────────────
function updateStats() {
  const orders = getAllOrders();
  const set = id => (el => el && (el.textContent = String(orders.filter(o => o.status === id).length)));

  set('preparing')(document.getElementById('statPreparing'));
  set('ready')(document.getElementById('statReady'));
  set('collected')(document.getElementById('statDone'));
  const pendingEl = document.getElementById('statPending');
  if (pendingEl) pendingEl.textContent = String(orders.filter(o => o.status === 'preparing').length);
}

function renderTodaySummary() {
  const orders  = getAllOrders();
  const today   = orders.filter(o => {
    const d = new Date(o.placedAt); const n = new Date();
    return d.toDateString() === n.toDateString();
  });
  const served  = today.filter(o => o.status === 'collected').length;
  const revenue = today.reduce((s, o) => s + o.total, 0);
  const avg     = served ? revenue / served : 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('todayServed',  String(served));
  set('todayRevenue', Store.formatPrice(revenue));
  set('todayAvg',     Store.formatPrice(avg));
}

// ── ORDER DETAIL MODAL ────────────────────────────
function openOrderDetail(orderId) {
  const history = Store.getHistory();
  const order   = history.find(o => o.id === orderId);
  if (!order) return;

  const title  = document.getElementById('orderDetailTitle');
  const body   = document.getElementById('orderDetailBody');
  const footer = document.getElementById('orderDetailFooter');
  if (title) title.textContent = `Order #${String(order.queueNumber).padStart(3,'0')}`;

  const elapsed = Math.floor((Date.now() - order.placedAt) / 60000);
  const timeStr = new Date(order.placedAt).toLocaleTimeString('en-SG', { hour:'2-digit', minute:'2-digit' });

  if (body) body.innerHTML = `
    <div class="order-detail-meta">
      <div class="detail-row"><span>Customer</span><strong>${order.name || 'Student'}</strong></div>
      <div class="detail-row"><span>Placed at</span><strong>${timeStr} (${elapsed}m ago)</strong></div>
      <div class="detail-row"><span>Payment</span><strong>${order.paymentMethod || '—'}</strong></div>
      <div class="detail-row"><span>Status</span>
        <span class="stall-order-status status-${order.status}">${order.status}</span>
      </div>
    </div>
    <div class="order-detail-items">
      <p class="detail-section-label">Items Ordered</p>
      ${order.items.map(i => `
        <div class="detail-item-row">
          <span>${i.emoji} ${i.name} × ${i.qty}</span>
          <span>${Store.formatPrice(i.price * i.qty)}</span>
        </div>`).join('')}
      <div class="detail-total-row">
        <span>Total</span>
        <strong>${Store.formatPrice(order.total)}</strong>
      </div>
    </div>`;

  if (footer) {
    footer.innerHTML = order.status === 'preparing'
      ? `<button class="btn-auth" onclick="markOrderReady('${order.id}')">✅ Mark as Ready</button>`
      : order.status === 'ready'
        ? `<button class="btn-auth secondary" onclick="forceCollect('${order.id}')">📦 Mark as Collected</button>`
        : `<p style="text-align:center;color:var(--muted);font-size:var(--text-sm)">Order completed</p>`;
  }

  document.getElementById('orderDetailOverlay').classList.add('show');
}

function forceCollect(orderId) {
  const history = Store.getHistory();
  const idx = history.findIndex(o => o.id === orderId);
  if (idx < 0) return;
  history[idx].status = 'collected';
  localStorage.setItem('cg_history', JSON.stringify(history));
  showToast('📦 Order marked as Collected');
  renderOrders(); updateStats(); renderTodaySummary(); closeOrderDetail();
}

function closeOrderDetail() {
  document.getElementById('orderDetailOverlay').classList.remove('show');
}
document.addEventListener('DOMContentLoaded', () => {
  const ov = document.getElementById('orderDetailOverlay');
  if (ov) ov.addEventListener('click', e => { if (e.target === ov) closeOrderDetail(); });
});

// ── BROADCAST ────────────────────────────────────
function sendBroadcast() {
  const input = document.getElementById('broadcastMsg');
  const msg   = input ? input.value.trim() : '';
  if (!msg) { showToast('Please type a message first.'); return; }

  const announcements = JSON.parse(localStorage.getItem('cg_announcements') || '[]');
  announcements.unshift({
    text:      msg,
    author:    session.name,
    stallName: session.stallName,
    at:        Date.now()
  });
  localStorage.setItem('cg_announcements', JSON.stringify(announcements.slice(0, 10)));
  if (input) input.value = '';
  showToast('📢 Announcement sent to students!');
  renderBroadcastHistory();
}

function renderBroadcastHistory() {
  const el = document.getElementById('broadcastHistory');
  if (!el) return;
  const announcements = JSON.parse(localStorage.getItem('cg_announcements') || '[]');
  if (!announcements.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<p class="broadcast-past-label">Recent</p>` +
    announcements.slice(0, 3).map(a => {
      const t = new Date(a.at).toLocaleTimeString('en-SG', { hour:'2-digit', minute:'2-digit' });
      return `<div class="broadcast-past-item"><span class="bc-time">${t}</span><span class="bc-text">${a.text}</span></div>`;
    }).join('');
}
