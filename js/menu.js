// ===== MENU PAGE =====
let currentStallFilter = 'all';

function renderMenu() {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;

  const cart = Store.getCart();
  const items = currentStallFilter === 'all'
    ? MENU_ITEMS
    : MENU_ITEMS.filter(i => i.stall === currentStallFilter);

  grid.innerHTML = items.map(item => {
    const cartItem = cart.find(c => c.id === item.id);
    const qty = cartItem ? cartItem.qty : 0;

    return `
      <div class="menu-card${item.soldOut ? ' sold-out' : ''}" id="menuCard${item.id}">
        <div class="menu-card-img emoji-img" style="font-size:3.5rem">${item.emoji}</div>
        <div class="menu-card-body">
          <div class="menu-card-name">${item.name}</div>
          <div class="menu-card-stall">${item.stallName}</div>
          <div class="menu-card-price">${Store.formatPrice(item.price)}</div>
        </div>
        <div class="menu-card-footer">
          ${item.soldOut
            ? `<div class="sold-out-badge">Sold Out</div>`
            : qty === 0
              ? `<button class="btn-add" onclick="addToCart(${item.id})">
                  <span>+</span> Add
                </button>`
              : `<div class="qty-controls">
                  <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                  <span class="qty-count">${qty}</span>
                  <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                </div>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function filterStall(el) {
  document.querySelectorAll('.stall-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentStallFilter = el.dataset.stall;
  renderMenu();
}

// Init menu on load
document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  updateCartBadge();
});
