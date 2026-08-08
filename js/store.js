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

  // Queue state (global simulated queue)
  getQueueState() {
    const defaults = { counter: 40, nowServing: 38 };
    return JSON.parse(localStorage.getItem('cg_queue_state') || JSON.stringify(defaults));
  },
  saveQueueState(state) {
    localStorage.setItem('cg_queue_state', JSON.stringify(state));
  },

  // Generate queue number
  generateQueueNumber() {
    const state = this.getQueueState();
    state.counter += 1;
    this.saveQueueState(state);
    return state.counter;
  },

  // Format price
  formatPrice(amount) {
    return `RM ${Number(amount).toFixed(2)}`;
  },

  // Compute cart total
  cartTotal(cart) {
    return cart.reduce((sum, item) => {
      const menuItem = MENU_ITEMS.find(m => m.id === item.id);
      return sum + (menuItem ? menuItem.price * item.qty : 0);
    }, 0);
  },

  // Compute ETA in minutes
  computeEta(position) {
    return Math.max(1, position * PREP_TIME_PER_ORDER);
  }
};

// ===== TOAST UTILITY =====
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
