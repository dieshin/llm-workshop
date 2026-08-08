// ===== CART =====

function addToCart(itemId) {
  const cart = Store.getCart();
  const existing = cart.find(c => c.id === itemId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: itemId, qty: 1 });
  }
  Store.saveCart(cart);
  updateCartBadge();
  renderMenu();
  renderCartDrawer();
  showToast('Added to cart 🛒');
}

function changeQty(itemId, delta) {
  const cart = Store.getCart();
  const idx = cart.findIndex(c => c.id === itemId);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  Store.saveCart(cart);
  updateCartBadge();
  renderMenu();
  renderCartDrawer();
}

function removeFromCart(itemId) {
  const cart = Store.getCart().filter(c => c.id !== itemId);
  Store.saveCart(cart);
  updateCartBadge();
  renderMenu();
  renderCartDrawer();
}

function updateCartBadge() {
  const cart = Store.getCart();
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = totalQty;
}

function renderCartDrawer() {
  const cart = Store.getCart();
  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <span>🛒</span>
        <p>Nothing here yet.<br/>Add something delicious!</p>
      </div>`;
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = cart.map(c => {
    const item = MENU_ITEMS.find(m => m.id === c.id);
    if (!item) return '';
    return `
      <div class="cart-item">
        <span class="cart-item-emoji">${item.emoji}</span>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${Store.formatPrice(item.price)} each</div>
        </div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
          <span class="cart-qty-num">${c.qty}</span>
          <button class="cart-qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
        </div>
      </div>`;
  }).join('');

  const total = Store.cartTotal(cart);
  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = Store.formatPrice(total);
  if (footerEl) footerEl.style.display = 'block';
}

function openCart() {
  renderCartDrawer();
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

function goCheckout() {
  closeCart();
  openCheckout();
}
