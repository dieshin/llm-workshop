// =====================================================
// CANTEENGO — CHECKOUT
// Splits cart by stall → one queue entry per stall
// =====================================================

let selectedPayment = 'paynow';
let redeemingPoints = false;
let pointsToRedeem = 0;

function openCheckout() {
  const cart = Store.getCart();
  if (!cart.length) { showToast('Your cart is empty!'); return; }
  redeemingPoints = false; pointsToRedeem = 0;
  renderCheckoutSummary();
  document.getElementById('checkoutOverlay').classList.add('show');
}
function closeCheckout() { document.getElementById('checkoutOverlay').classList.remove('show'); }

// ── Group cart by stall ──────────────────────────
function groupCartByStall(cart) {
  const groups = {};
  cart.forEach(c => {
    const item = MENU_ITEMS.find(m => m.id === c.id);
    if (!item) return;
    if (!groups[item.stall]) groups[item.stall] = { stallKey: item.stall, stallName: item.stallName, items: [] };
    groups[item.stall].items.push({ ...item, qty: c.qty });
  });
  return Object.values(groups);
}

function renderCheckoutSummary() {
  const cart = Store.getCart();
  const groups = groupCartByStall(cart);
  const summaryEl = document.getElementById('orderSummary');
  if (summaryEl) {
    summaryEl.innerHTML = groups.map(g => `
      <div class="checkout-stall-group">
        <div class="checkout-stall-label">${STALLS[g.stallKey]?.icon || '🍽️'} ${g.stallName}
          <span class="checkout-stall-eta">~${Store.computeStallEta(1, g.stallKey)} min</span>
        </div>
        ${g.items.map(i => `
          <div class="summary-item">
            <span>${i.emoji} ${i.name} × ${i.qty}</span>
            <span>${Store.formatPrice(i.price * i.qty)}</span>
          </div>`).join('')}
      </div>`).join('');
  }
  updateCheckoutTotals();
  renderPointsRedeemSection();
}

function updateCheckoutTotals() {
  const cart = Store.getCart();
  const subtotal = Store.cartTotal(cart);
  const spinDiscount = Store.getActiveSpinDiscount();
  const comboDiscount = Store.getActiveDiscount().type === 'combo' ? Store.getActiveDiscount().amount : 0;
  const pointsDiscount = redeemingPoints ? pointsToRedeem / POINTS_REDEEM_RATE : 0;
  const totalDiscount = spinDiscount + comboDiscount + pointsDiscount;
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('checkoutSubtotal', Store.formatPrice(subtotal));
  set('checkoutTotal', Store.formatPrice(finalTotal));
  set('checkoutCals', `${Store.cartCalories(cart)} cal total`);
  set('checkoutPtsEarn', `+${Store.cartPointsEarned(cart)} pts after order`);

  const discountRow = document.getElementById('discountRow');
  if (discountRow) {
    if (totalDiscount > 0) {
      const parts = [];
      if (spinDiscount > 0)   parts.push(`Spin S$${spinDiscount.toFixed(2)}`);
      if (comboDiscount > 0)  parts.push(`Combo S$${comboDiscount.toFixed(2)}`);
      if (pointsDiscount > 0) parts.push(`Points S$${pointsDiscount.toFixed(2)}`);
      discountRow.style.display = 'flex';
      set('discountLabel', `Discount (${parts.join(' + ')})`);
      set('discountAmount', `−${Store.formatPrice(totalDiscount)}`);
    } else { discountRow.style.display = 'none'; }
  }
  return finalTotal;
}

function renderPointsRedeemSection() {
  const el = document.getElementById('pointsRedeemSection'); if (!el) return;
  const pts = Store.getPoints();
  if (pts < POINTS_REDEEM_RATE) {
    el.innerHTML = `<div class="points-info-row"><span>🏅 ${pts} pts</span><span class="points-muted">Need ${POINTS_REDEEM_RATE - pts} more pts to redeem</span></div>`;
    return;
  }
  el.innerHTML = `
    <div class="points-redeem-row">
      <div class="points-info-row">
        <span>🏅 <strong>${pts} pts</strong></span>
        <span class="points-muted">= up to S$${Store.maxRedeemDiscount()}.00 off</span>
      </div>
      <div class="points-slider-wrap">
        <input type="range" id="pointsSlider" min="0" max="${Math.min(pts,500)}" step="${POINTS_REDEEM_RATE}" value="${redeemingPoints ? pointsToRedeem : 0}" oninput="onPointsSlider(this.value)" />
        <div class="points-slider-label">Redeeming <strong id="pointsRedeemDisplay">${redeemingPoints ? pointsToRedeem : 0} pts</strong> = <strong id="pointsRedeemValue">S$${redeemingPoints ? (pointsToRedeem/POINTS_REDEEM_RATE).toFixed(2) : '0.00'} off</strong></div>
      </div>
    </div>`;
}

function onPointsSlider(val) {
  pointsToRedeem = parseInt(val, 10); redeemingPoints = pointsToRedeem > 0;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('pointsRedeemDisplay', `${pointsToRedeem} pts`);
  set('pointsRedeemValue', `S$${(pointsToRedeem / POINTS_REDEEM_RATE).toFixed(2)} off`);
  updateCheckoutTotals();
}

function selectPayment(el) {
  document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
  el.classList.add('active'); selectedPayment = el.dataset.method;
  const ew = document.getElementById('ewalletSection');
  if (ew) ew.style.display = selectedPayment === 'paynow' ? 'block' : 'none';
}

// ── PLACE ORDER ──────────────────────────────────
function placeOrder() {
  const cart = Store.getCart();
  if (!cart.length) return;
  const nameInput = document.getElementById('customerName');
  const name = (nameInput?.value.trim()) || 'Student';
  if (!name) { showToast('Please enter your name!'); nameInput?.focus(); return; }

  const btn = document.getElementById('placeOrderBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Placing order...'; }

  setTimeout(() => {
    const finalTotal = updateCheckoutTotals();
    const groups = groupCartByStall(cart);
    const queueState = Store.getQueueState();
    const ptsEarned = Store.cartPointsEarned(cart);
    const totalCal = Store.cartCalories(cart);

    // Apply points
    if (redeemingPoints && pointsToRedeem > 0) Store.redeemPoints(pointsToRedeem);
    Store.addPoints(ptsEarned);
    Store.clearActiveDiscount();

    // Proportion total by stall subtotal
    const cartTotal = Store.cartTotal(cart);
    const newOrders = [];

    groups.forEach((g, i) => {
      const qNum = Store.generateQueueNumber();
      const position = Math.max(1, qNum - queueState.nowServing);
      const eta = Store.computeStallEta(position, g.stallKey);
      const stallSubtotal = g.items.reduce((s, it) => s + it.price * it.qty, 0);
      const stallTotal = cartTotal > 0 ? (stallSubtotal / cartTotal) * finalTotal : stallSubtotal;
      const stallCal = g.items.reduce((s, it) => s + it.cal * it.qty, 0);
      const stallPts = Math.round((stallSubtotal / cartTotal) * ptsEarned);

      const order = {
        id: `ORD-${Date.now()}-${i}`,
        queueNumber: qNum,
        name,
        items: g.items.map(it => ({ id: it.id, qty: it.qty, name: it.name, price: it.price, emoji: it.emoji, cal: it.cal })),
        total: Math.round(stallTotal * 100) / 100,
        stallKey: g.stallKey,
        stallName: g.stallName,
        stall: g.stallName, // legacy compat
        status: 'preparing',
        placedAt: Date.now(),
        eta, position,
        paymentMethod: selectedPayment,
        ptsEarned: stallPts,
        totalCal: stallCal
      };

      // Save timer state immediately so it survives page nav
      Store.saveTimerState(order.id, {
        countdownSeconds: eta * 60,
        totalSeconds: eta * 60,
        savedAt: Date.now()
      });

      Store.saveActiveOrder(order);
      Store.addToHistory({ ...order });
      newOrders.push(order);
    });

    Store.clearCart();
    closeCheckout();
    updateCartBadge();
    if (typeof renderMenu === 'function') renderMenu();
    if (typeof renderPointsBadge === 'function') renderPointsBadge();
    if (typeof renderSpinBtn === 'function') renderSpinBtn();

    // Success modal — show all stall queue numbers
    const successOverlay = document.getElementById('successOverlay');
    if (successOverlay) {
      const primary = newOrders[0];
      document.getElementById('successQueueNum').textContent = newOrders.map(o => `#${String(o.queueNumber).padStart(3,'0')}`).join(' · ');
      document.getElementById('successStall').textContent = newOrders.map(o => `${STALLS[o.stallKey]?.icon} ${o.stallName}`).join(', ');
      document.getElementById('successEta').textContent = Math.max(...newOrders.map(o => o.eta)) + ' mins';
      document.getElementById('successPtsEarned').textContent = `+${ptsEarned} pts earned! (Balance: ${Store.getPoints()} pts)`;
      successOverlay.classList.add('show');
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Place Order 🚀'; }
  }, 1200);
}

function goToQueue() {
  document.getElementById('successOverlay').classList.remove('show');
  window.location.href = 'queue.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const co = document.getElementById('checkoutOverlay');
  if (co) co.addEventListener('click', e => { if (e.target === co) closeCheckout(); });
  const so = document.getElementById('successOverlay');
  if (so) so.addEventListener('click', e => { if (e.target === so) so.classList.remove('show'); });
});
