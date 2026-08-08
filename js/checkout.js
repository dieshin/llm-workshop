// ===== CHECKOUT =====
let selectedPayment = 'paynow';
let redeemingPoints = false;
let pointsToRedeem = 0;

function openCheckout() {
  const cart = Store.getCart();
  if (cart.length === 0) { showToast('Your cart is empty!'); return; }

  redeemingPoints = false;
  pointsToRedeem = 0;
  renderCheckoutSummary();
  document.getElementById('checkoutOverlay').classList.add('show');
}

function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('show');
}

function renderCheckoutSummary() {
  const cart = Store.getCart();
  const summaryEl = document.getElementById('orderSummary');
  if (summaryEl) {
    summaryEl.innerHTML = cart.map(c => {
      const item = MENU_ITEMS.find(m => m.id === c.id);
      if (!item) return '';
      return `<div class="summary-item">
        <span>${item.emoji} ${item.name} × ${c.qty}</span>
        <span>${Store.formatPrice(item.price * c.qty)}</span>
      </div>`;
    }).join('');
  }
  updateCheckoutTotals();
  renderPointsRedeemSection();
}

function updateCheckoutTotals() {
  const cart = Store.getCart();
  const subtotal = Store.cartTotal(cart);

  // Collect all discounts
  const spinDiscount = Store.getActiveSpinDiscount();
  const comboDiscount = Store.getActiveDiscount().type === 'combo'
    ? Store.getActiveDiscount().amount : 0;
  const pointsDiscount = redeemingPoints
    ? (pointsToRedeem / POINTS_REDEEM_RATE) : 0;

  const totalDiscount = spinDiscount + comboDiscount + pointsDiscount;
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  // Update DOM
  const subtotalEl = document.getElementById('checkoutSubtotal');
  if (subtotalEl) subtotalEl.textContent = Store.formatPrice(subtotal);

  const discountRow = document.getElementById('discountRow');
  if (discountRow) {
    if (totalDiscount > 0) {
      discountRow.style.display = 'flex';
      const parts = [];
      if (spinDiscount > 0)  parts.push(`Spin S$${spinDiscount.toFixed(2)}`);
      if (comboDiscount > 0) parts.push(`Combo S$${comboDiscount.toFixed(2)}`);
      if (pointsDiscount > 0) parts.push(`Points S$${pointsDiscount.toFixed(2)}`);
      document.getElementById('discountLabel').textContent = `Discount (${parts.join(' + ')})`;
      document.getElementById('discountAmount').textContent = `−${Store.formatPrice(totalDiscount)}`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  const totalEl = document.getElementById('checkoutTotal');
  if (totalEl) totalEl.textContent = Store.formatPrice(finalTotal);

  // Points to earn
  const ptsEarned = Store.cartPointsEarned(cart);
  const earnEl = document.getElementById('checkoutPtsEarn');
  if (earnEl) earnEl.textContent = `+${ptsEarned} pts after order`;

  // Calories
  const cals = Store.cartCalories(cart);
  const calEl = document.getElementById('checkoutCals');
  if (calEl) calEl.textContent = `${cals} cal total`;

  return finalTotal;
}

function renderPointsRedeemSection() {
  const el = document.getElementById('pointsRedeemSection');
  if (!el) return;
  const pts = Store.getPoints();
  const maxDiscount = Store.maxRedeemDiscount();

  if (pts < POINTS_REDEEM_RATE) {
    el.innerHTML = `<div class="points-info-row">
      <span>🏅 ${pts} pts</span>
      <span class="points-muted">Need ${POINTS_REDEEM_RATE - pts} more pts to redeem</span>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div class="points-redeem-row">
      <div class="points-info-row">
        <span>🏅 <strong>${pts} pts</strong></span>
        <span class="points-muted">= up to S$${maxDiscount}.00 off</span>
      </div>
      <div class="points-slider-wrap">
        <input type="range" id="pointsSlider" min="0" max="${Math.min(pts, 500)}"
          step="${POINTS_REDEEM_RATE}" value="${redeemingPoints ? pointsToRedeem : 0}"
          oninput="onPointsSlider(this.value)" />
        <div class="points-slider-label">
          Redeeming <strong id="pointsRedeemDisplay">${redeemingPoints ? pointsToRedeem : 0} pts</strong>
          = <strong id="pointsRedeemValue">S$${redeemingPoints ? (pointsToRedeem / POINTS_REDEEM_RATE).toFixed(2) : '0.00'} off</strong>
        </div>
      </div>
    </div>`;
}

function onPointsSlider(val) {
  pointsToRedeem = parseInt(val, 10);
  redeemingPoints = pointsToRedeem > 0;
  const displayEl = document.getElementById('pointsRedeemDisplay');
  const valueEl = document.getElementById('pointsRedeemValue');
  if (displayEl) displayEl.textContent = `${pointsToRedeem} pts`;
  if (valueEl) valueEl.textContent = `S$${(pointsToRedeem / POINTS_REDEEM_RATE).toFixed(2)} off`;
  updateCheckoutTotals();
}

function selectPayment(el) {
  document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  selectedPayment = el.dataset.method;
  const ewalletSection = document.getElementById('ewalletSection');
  if (ewalletSection) {
    ewalletSection.style.display = selectedPayment === 'paynow' ? 'block' : 'none';
  }
}

function placeOrder() {
  const cart = Store.getCart();
  if (cart.length === 0) return;

  const nameInput = document.getElementById('customerName');
  const name = (nameInput ? nameInput.value.trim() : '') || 'Student';
  if (!name) { showToast('Please enter your name!'); nameInput && nameInput.focus(); return; }

  const btn = document.getElementById('placeOrderBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Placing order...'; }

  setTimeout(() => {
    const finalTotal = updateCheckoutTotals();
    const queueNum = Store.generateQueueNumber();
    const queueState = Store.getQueueState();
    const position = queueNum - queueState.nowServing;
    const eta = Store.computeEta(position);

    // Determine primary stall
    const stallCount = {};
    cart.forEach(c => {
      const item = MENU_ITEMS.find(m => m.id === c.id);
      if (item) stallCount[item.stallName] = (stallCount[item.stallName] || 0) + c.qty;
    });
    const primaryStall = Object.entries(stallCount).sort((a, b) => b[1] - a[1])[0][0];

    // Points earned & spent
    const ptsEarned = Store.cartPointsEarned(cart);
    if (redeemingPoints && pointsToRedeem > 0) {
      Store.redeemPoints(pointsToRedeem);
    }
    Store.addPoints(ptsEarned);

    // Clear discounts
    Store.clearActiveDiscount();

    const order = {
      id: `ORD-${Date.now()}`,
      queueNumber: queueNum,
      name,
      items: cart.map(c => {
        const item = MENU_ITEMS.find(m => m.id === c.id);
        return { id: c.id, qty: c.qty, name: item.name, price: item.price, emoji: item.emoji, cal: item.cal };
      }),
      total: finalTotal,
      stall: primaryStall,
      status: 'preparing',
      placedAt: Date.now(),
      eta, position,
      paymentMethod: selectedPayment,
      ptsEarned,
      ptsRedeemed: redeemingPoints ? pointsToRedeem : 0,
      totalCal: Store.cartCalories(cart)
    };

    Store.saveActiveOrder(order);
    Store.addToHistory({ ...order });
    Store.clearCart();

    closeCheckout();
    updateCartBadge();
    if (typeof renderMenu === 'function') renderMenu();
    if (typeof renderPointsBadge === 'function') renderPointsBadge();
    if (typeof renderSpinBtn === 'function') renderSpinBtn();

    // Success modal
    const successOverlay = document.getElementById('successOverlay');
    if (successOverlay) {
      document.getElementById('successQueueNum').textContent = `#${String(queueNum).padStart(3, '0')}`;
      document.getElementById('successStall').textContent = primaryStall;
      document.getElementById('successEta').textContent = `${eta} mins`;
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
  const checkoutOverlay = document.getElementById('checkoutOverlay');
  if (checkoutOverlay) checkoutOverlay.addEventListener('click', e => { if (e.target === checkoutOverlay) closeCheckout(); });
  const successOverlay = document.getElementById('successOverlay');
  if (successOverlay) successOverlay.addEventListener('click', e => { if (e.target === successOverlay) successOverlay.classList.remove('show'); });
});
