// ===== MENU PAGE =====
let currentStallFilter = 'all';
let stallBusyness = {};

// ===== WEATHER DRINK SUGGESTION =====
function renderWeatherBanner() {
  const banner = document.getElementById('weatherBanner');
  if (!banner) return;
  const hour = new Date().getHours();
  // Simulate weather by time of day
  let icon, msg, drinkId, drinkName;
  if (hour >= 11 && hour <= 16) {
    icon = '☀️'; msg = "It's warm out — stay hydrated!";
    drinkId = 10; drinkName = 'Iced Lemon Tea';
  } else if (hour >= 17 && hour <= 20) {
    icon = '🌆'; msg = "Long day? Treat yourself.";
    drinkId = 8; drinkName = 'Milo Dinosaur';
  } else {
    icon = '🌙'; msg = "Late night study sesh?";
    drinkId = 5; drinkName = 'Teh Tarik';
  }
  banner.innerHTML = `
    <span class="weather-icon">${icon}</span>
    <span class="weather-msg">${msg} Try <strong>${drinkName}</strong></span>
    <button class="weather-add-btn" onclick="addToCart(${drinkId}); this.textContent='Added ✓'; this.disabled=true;">+ Add</button>
  `;
}

// ===== ORDER AGAIN STRIP =====
function renderOrderAgain() {
  const strip = document.getElementById('orderAgainStrip');
  if (!strip) return;
  const history = Store.getHistory();
  if (!history.length) { strip.style.display = 'none'; return; }
  const last = history[0];
  strip.style.display = 'flex';
  const names = last.items.slice(0, 2).map(i => `${i.emoji} ${i.name}`).join(', ');
  const more = last.items.length > 2 ? ` +${last.items.length - 2} more` : '';
  document.getElementById('orderAgainLabel').textContent = `Last order: ${names}${more}`;
}

function reorderLast() {
  const history = Store.getHistory();
  if (!history.length) return;
  const last = history[0];
  const cart = [];
  last.items.forEach(i => {
    const menuItem = MENU_ITEMS.find(m => m.id === i.id);
    if (menuItem && !menuItem.soldOut) cart.push({ id: i.id, qty: i.qty });
  });
  Store.saveCart(cart);
  updateCartBadge();
  renderMenu();
  renderCartDrawer();
  showToast('Last order added to cart 🔁');
  openCart();
}

// ===== COMBOS =====
function renderCombos() {
  const el = document.getElementById('comboStrip');
  if (!el) return;
  el.innerHTML = STUDY_COMBOS.map(combo => {
    const items = combo.itemIds.map(id => MENU_ITEMS.find(m => m.id === id)).filter(Boolean);
    const total = items.reduce((s, i) => s + i.price, 0);
    const discounted = (total - combo.discount).toFixed(2);
    const itemNames = items.map(i => i.emoji).join('');
    return `
      <div class="combo-card" onclick="addCombo('${combo.id}')">
        <div class="combo-emoji">${combo.emoji}</div>
        <div class="combo-info">
          <div class="combo-name">${combo.name}</div>
          <div class="combo-desc">${combo.desc} · ${itemNames}</div>
        </div>
        <div class="combo-price">
          <span class="combo-old">S$${total.toFixed(2)}</span>
          <span class="combo-new">S$${discounted}</span>
        </div>
      </div>`;
  }).join('');
}

function addCombo(comboId) {
  const combo = STUDY_COMBOS.find(c => c.id === comboId);
  if (!combo) return;
  const cart = Store.getCart();
  combo.itemIds.forEach(id => {
    const existing = cart.find(c => c.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ id, qty: 1 });
  });
  // Apply combo discount as a temporary discount
  Store.setActiveDiscount('combo', combo.discount);
  Store.saveCart(cart);
  updateCartBadge();
  renderMenu();
  renderCartDrawer();
  showToast(`${combo.emoji} ${combo.name} combo added! Saving S$${combo.discount.toFixed(2)}`);
  openCart();
}

// ===== CROWD HEATMAP =====
function getBusynessLabel(level) {
  if (level >= 8) return { label: 'Very Busy', color: '#EF4444', dot: '🔴' };
  if (level >= 5) return { label: 'Moderate',  color: '#F59E0B', dot: '🟡' };
  return              { label: 'Quiet',       color: '#10B981', dot: '🟢' };
}

function renderStallBusyness() {
  stallBusyness = getStallBusyness();
  const el = document.getElementById('stallHeatmap');
  if (!el) return;
  el.innerHTML = Object.entries(STALLS).map(([key, stall]) => {
    const level = stallBusyness[key] || 3;
    const { label, dot } = getBusynessLabel(level);
    const bars = Math.round(level / 2); // 1–5 bars
    return `
      <div class="heatmap-item">
        <span class="heatmap-stall">${stall.icon} ${stall.name}</span>
        <div class="heatmap-bars">
          ${[1,2,3,4,5].map(b => `<span class="heatmap-bar${b <= bars ? ' active' : ''}" style="${b <= bars ? `background:${getBusynessLabel(level).color}` : ''}"></span>`).join('')}
        </div>
        <span class="heatmap-label">${dot} ${label}</span>
      </div>`;
  }).join('');
}

// ===== POINTS BADGE IN NAV =====
function renderPointsBadge() {
  const el = document.getElementById('pointsBadge');
  if (!el) return;
  const pts = Store.getPoints();
  el.textContent = `${pts} pts`;
}

// ===== SPIN WHEEL BUTTON =====
function renderSpinBtn() {
  const btn = document.getElementById('spinBtn');
  if (!btn) return;
  const canSpin = Store.canSpinToday();
  const activeDiscount = Store.getActiveSpinDiscount();
  if (activeDiscount > 0) {
    btn.innerHTML = `🎰 Discount Active: <strong>S$${activeDiscount.toFixed(2)} off</strong>`;
    btn.classList.add('spin-active');
  } else if (canSpin) {
    btn.innerHTML = `🎰 Daily Lucky Spin — Available!`;
    btn.classList.remove('spin-active');
  } else {
    btn.innerHTML = `🎰 Next spin tomorrow`;
    btn.disabled = true;
    btn.classList.add('spin-used');
  }
}

// ===== MENU RENDER =====
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
    const busyness = stallBusyness[item.stall] || 3;
    const { dot } = getBusynessLabel(busyness);

    return `
      <div class="menu-card${item.soldOut ? ' sold-out' : ''}" id="menuCard${item.id}">
        <div class="menu-card-img emoji-img">${item.emoji}</div>
        <div class="menu-card-body">
          <div class="menu-card-name">${item.name}</div>
          <div class="menu-card-meta">
            <span class="menu-card-stall">${dot} ${item.stallName}</span>
            <span class="menu-card-cal">🔥 ${item.cal} cal</span>
          </div>
          <div class="menu-card-price">${Store.formatPrice(item.price)}
            <span class="points-earn">+${item.points}pts</span>
          </div>
        </div>
        <div class="menu-card-footer">
          ${item.soldOut
            ? `<div class="sold-out-badge">Sold Out</div>`
            : qty === 0
              ? `<button class="btn-add" onclick="addToCart(${item.id})"><span>+</span> Add</button>`
              : `<div class="qty-controls">
                  <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                  <span class="qty-count">${qty}</span>
                  <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                </div>`
          }
        </div>
      </div>`;
  }).join('');
}

function filterStall(el) {
  document.querySelectorAll('.stall-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentStallFilter = el.dataset.stall;
  renderMenu();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderStallBusyness();
  renderWeatherBanner();
  renderOrderAgain();
  renderCombos();
  renderMenu();
  renderPointsBadge();
  renderSpinBtn();
  updateCartBadge();
});
