// ===== STORE (localStorage mock backend) =====

const Store = {
  // Cart
  getCart() {
    return JSON.parse(localStorage.getItem('cg_cart') || '[]');
  },
  saveCart(cart) {
    localStorage.setItem('cg_cart', JSON.stringify(cart));
  },
  clearCart() {
    localStorage.removeItem('cg_cart');
  },

  // Active Order
  getActiveOrder() {
    return JSON.parse(localStorage.getItem('cg_active_order') || 'null');
  },
  saveActiveOrder(order) {
    localStorage.setItem('cg_active_order', JSON.stringify(order));
  },
  clearActiveOrder() {
    localStorage.removeItem('cg_active_order');
  },

  // Order History
  getHistory() {
    return JSON.parse(localStorage.getItem('cg_history') || '[]');
  },
  addToHistory(order) {
    const history = this.getHistory();
    history.unshift(order);
    localStorage.setItem('cg_history', JSON.stringify(history));
  },
  clearHistory() {
    localStorage.removeItem('cg_history');
  },

  // Queue state
  getQueueState() {
    const defaults = { counter: 40, nowServing: 38 };
    return JSON.parse(localStorage.getItem('cg_queue_state') || JSON.stringify(defaults));
  },
  saveQueueState(state) {
    localStorage.setItem('cg_queue_state', JSON.stringify(state));
  },
  generateQueueNumber() {
    const state = this.getQueueState();
    state.counter += 1;
    this.saveQueueState(state);
    return state.counter;
  },

  // ===== LOYALTY POINTS =====
  getPoints() {
    return parseInt(localStorage.getItem('cg_points') || '0', 10);
  },
  addPoints(pts) {
    const current = this.getPoints();
    const newTotal = current + pts;
    localStorage.setItem('cg_points', String(newTotal));
    return newTotal;
  },
  redeemPoints(pts) {
    const current = this.getPoints();
    const after = Math.max(0, current - pts);
    localStorage.setItem('cg_points', String(after));
    return after;
  },
  // How many points to redeem for a given discount
  pointsForDiscount(discountAmt) {
    return Math.ceil(discountAmt * POINTS_REDEEM_RATE);
  },
  // Max redeemable discount from current points balance
  maxRedeemDiscount() {
    return Math.floor(this.getPoints() / POINTS_REDEEM_RATE);
  },
  // Points earned for an order total
  pointsEarned(total) {
    return Math.floor(total * POINTS_PER_DOLLAR);
  },

  // ===== SPIN WHEEL =====
  getSpinState() {
    return JSON.parse(localStorage.getItem('cg_spin') || '{"lastSpin":null,"discount":0}');
  },
  saveSpinState(state) {
    localStorage.setItem('cg_spin', JSON.stringify(state));
  },
  canSpinToday() {
    const state = this.getSpinState();
    if (!state.lastSpin) return true;
    const last = new Date(state.lastSpin);
    const now = new Date();
    return last.toDateString() !== now.toDateString();
  },
  getActiveSpinDiscount() {
    const state = this.getSpinState();
    if (!state.lastSpin) return 0;
    const last = new Date(state.lastSpin);
    const now = new Date();
    // Discount valid for today only
    if (last.toDateString() === now.toDateString()) return state.discount;
    return 0;
  },

  // ===== ACTIVE DISCOUNT (spin + points redeem) =====
  getActiveDiscount() {
    return JSON.parse(localStorage.getItem('cg_active_discount') || '{"type":"none","amount":0}');
  },
  setActiveDiscount(type, amount) {
    localStorage.setItem('cg_active_discount', JSON.stringify({ type, amount }));
  },
  clearActiveDiscount() {
    localStorage.removeItem('cg_active_discount');
  },

  // ===== FORMAT =====
  formatPrice(amount) {
    return `S$${Number(amount).toFixed(2)}`;
  },

  // Cart total (before discount)
  cartTotal(cart) {
    return cart.reduce((sum, item) => {
      const menuItem = MENU_ITEMS.find(m => m.id === item.id);
      return sum + (menuItem ? menuItem.price * item.qty : 0);
    }, 0);
  },

  // Cart total calories
  cartCalories(cart) {
    return cart.reduce((sum, item) => {
      const menuItem = MENU_ITEMS.find(m => m.id === item.id);
      return sum + (menuItem ? menuItem.cal * item.qty : 0);
    }, 0);
  },

  // Cart total points to be earned
  cartPointsEarned(cart) {
    return cart.reduce((sum, item) => {
      const menuItem = MENU_ITEMS.find(m => m.id === item.id);
      return sum + (menuItem ? menuItem.points * item.qty : 0);
    }, 0);
  },

  computeEta(position) {
    return Math.max(1, position * PREP_TIME_PER_ORDER);
  }
};

// ===== TOAST =====
function showToast(msg, duration = 2500) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), duration);
}
