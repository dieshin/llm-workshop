// =====================================================
// CANTEENGO — STORE  (localStorage mock backend)
// =====================================================

const Store = {

  // ── CART ────────────────────────────────────────
  getCart()        { return JSON.parse(localStorage.getItem('cg_cart') || '[]'); },
  saveCart(cart)   { localStorage.setItem('cg_cart', JSON.stringify(cart)); },
  clearCart()      { localStorage.removeItem('cg_cart'); },

  // ── ACTIVE ORDERS (array — one per stall) ───────
  // Each entry: { id, queueNumber, stallKey, stallName, items, total, status,
  //               placedAt, eta, position, name, paymentMethod, ptsEarned, totalCal }
  getActiveOrders() {
    return JSON.parse(localStorage.getItem('cg_active_orders') || '[]');
  },
  saveActiveOrders(orders) {
    localStorage.setItem('cg_active_orders', JSON.stringify(orders));
  },
  clearActiveOrders() { localStorage.removeItem('cg_active_orders'); },

  // Legacy single-order shim (queue.js reads this)
  getActiveOrder() {
    const orders = this.getActiveOrders();
    return orders.length ? orders[0] : null;
  },
  saveActiveOrder(order) {
    // Replace or insert into array by id
    const orders = this.getActiveOrders();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) orders[idx] = order; else orders.unshift(order);
    this.saveActiveOrders(orders);
  },
  clearActiveOrder() { this.clearActiveOrders(); },

  // ── TIMER STATE (persisted so page nav doesn't reset it) ──
  getTimerState(orderId) {
    const key = `cg_timer_${orderId}`;
    return JSON.parse(localStorage.getItem(key) || 'null');
  },
  saveTimerState(orderId, state) {
    localStorage.setItem(`cg_timer_${orderId}`, JSON.stringify(state));
  },
  clearTimerState(orderId) {
    localStorage.removeItem(`cg_timer_${orderId}`);
  },

  // ── ORDER HISTORY ────────────────────────────────
  getHistory()       { return JSON.parse(localStorage.getItem('cg_history') || '[]'); },
  addToHistory(order) {
    const h = this.getHistory(); h.unshift(order);
    localStorage.setItem('cg_history', JSON.stringify(h));
  },
  clearHistory()     { localStorage.removeItem('cg_history'); },
  updateHistoryStatus(orderId, status, extra = {}) {
    const h = this.getHistory();
    const idx = h.findIndex(o => o.id === orderId);
    if (idx >= 0) { Object.assign(h[idx], { status }, extra); localStorage.setItem('cg_history', JSON.stringify(h)); }
  },

  // ── QUEUE STATE ──────────────────────────────────
  getQueueState() {
    return JSON.parse(localStorage.getItem('cg_queue_state') || '{"counter":40,"nowServing":38}');
  },
  saveQueueState(state) { localStorage.setItem('cg_queue_state', JSON.stringify(state)); },
  generateQueueNumber() {
    const s = this.getQueueState(); s.counter += 1;
    this.saveQueueState(s); return s.counter;
  },

  // ── READY BROADCAST (cross-tab via storage event) ──
  broadcastReady(order) {
    localStorage.setItem('cg_ready_signal', JSON.stringify({ orderId: order.id, queueNumber: order.queueNumber, stallName: order.stallName, at: Date.now() }));
    // Remove immediately so next set triggers storage event again
    setTimeout(() => localStorage.removeItem('cg_ready_signal'), 100);
  },

  // ── LOYALTY POINTS ───────────────────────────────
  getPoints()      { return parseInt(localStorage.getItem('cg_points') || '0', 10); },
  addPoints(pts)   { const n = this.getPoints() + pts; localStorage.setItem('cg_points', String(n)); return n; },
  redeemPoints(pts){ const n = Math.max(0, this.getPoints() - pts); localStorage.setItem('cg_points', String(n)); return n; },
  maxRedeemDiscount() { return Math.floor(this.getPoints() / POINTS_REDEEM_RATE); },
  pointsForDiscount(a){ return Math.ceil(a * POINTS_REDEEM_RATE); },
  pointsEarned(total)  { return Math.floor(total * POINTS_PER_DOLLAR); },

  // ── SPIN WHEEL ───────────────────────────────────
  getSpinState()  { return JSON.parse(localStorage.getItem('cg_spin') || '{"lastSpin":null,"discount":0}'); },
  saveSpinState(s){ localStorage.setItem('cg_spin', JSON.stringify(s)); },
  canSpinToday()  { const s = this.getSpinState(); if (!s.lastSpin) return true; return new Date(s.lastSpin).toDateString() !== new Date().toDateString(); },
  getActiveSpinDiscount() {
    const s = this.getSpinState();
    if (!s.lastSpin) return 0;
    return new Date(s.lastSpin).toDateString() === new Date().toDateString() ? s.discount : 0;
  },

  // ── ACTIVE DISCOUNT ──────────────────────────────
  getActiveDiscount()       { return JSON.parse(localStorage.getItem('cg_active_discount') || '{"type":"none","amount":0}'); },
  setActiveDiscount(t, amt) { localStorage.setItem('cg_active_discount', JSON.stringify({ type: t, amount: amt })); },
  clearActiveDiscount()     { localStorage.removeItem('cg_active_discount'); },

  // ── FEEDBACK ─────────────────────────────────────
  saveFeedback(fb) {
    const all = JSON.parse(localStorage.getItem('cg_feedback') || '[]');
    all.unshift(fb); localStorage.setItem('cg_feedback', JSON.stringify(all));
  },

  // ── PHOTO ────────────────────────────────────────
  saveOrderPhoto(orderId, dataUrl) { localStorage.setItem(`cg_photo_${orderId}`, dataUrl); },
  getOrderPhoto(orderId)           { return localStorage.getItem(`cg_photo_${orderId}`) || null; },

  // ── FORMAT / COMPUTE ─────────────────────────────
  formatPrice(amount) { return `S$${Number(amount).toFixed(2)}`; },

  cartTotal(cart) {
    return cart.reduce((s, i) => { const m = MENU_ITEMS.find(x => x.id === i.id); return s + (m ? m.price * i.qty : 0); }, 0);
  },
  cartCalories(cart) {
    return cart.reduce((s, i) => { const m = MENU_ITEMS.find(x => x.id === i.id); return s + (m ? m.cal * i.qty : 0); }, 0);
  },
  cartPointsEarned(cart) {
    return cart.reduce((s, i) => { const m = MENU_ITEMS.find(x => x.id === i.id); return s + (m ? m.points * i.qty : 0); }, 0);
  },
  computeEta(position) { return Math.max(1, position * PREP_TIME_PER_ORDER); },

  // ── STALL-SPECIFIC ETA override ──────────────────
  // Drinks: 2 min/order, snacks: 2 min, rice/noodles: 3 min
  stallPrepTime(stallKey) {
    return { drinks: 2, snacks: 2, rice: 3, noodles: 3 }[stallKey] || PREP_TIME_PER_ORDER;
  },
  computeStallEta(position, stallKey) {
    return Math.max(1, position * this.stallPrepTime(stallKey));
  }
};

// ── TOAST ────────────────────────────────────────
function showToast(msg, duration = 2500) {
  let t = document.getElementById('globalToast');
  if (!t) { t = document.createElement('div'); t.id = 'globalToast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), duration);
}
