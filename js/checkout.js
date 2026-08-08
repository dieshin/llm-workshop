// ===== CHECKOUT =====
let selectedPayment = 'ewallet';

function openCheckout() {
  const cart = Store.getCart();
  if (cart.length === 0) { showToast('Your cart is empty!'); return; }

  // Render order summary
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

  const total = Store.cartTotal(cart);
  const totalEl = document.getElementById('checkoutTotal');
  if (totalEl) totalEl.textContent = Store.formatPrice(total);

  document.getElementById('checkoutOverlay').classList.add('show');
}

function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('show');
}

function selectPayment(el) {
  document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  selectedPayment = el.dataset.method;
  const ewalletSection = document.getElementById('ewalletSection');
  if (ewalletSection) {
    ewalletSection.style.display = selectedPayment === 'ewallet' ? 'block' : 'none';
  }
}

function placeOrder() {
  const cart = Store.getCart();
  if (cart.length === 0) return;

  const nameInput = document.getElementById('customerName');
  const name = nameInput ? nameInput.value.trim() : 'Student';
  if (!name) { showToast('Please enter your name!'); nameInput && nameInput.focus(); return; }

  const btn = document.getElementById('placeOrderBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Placing order...'; }

  // Simulate payment processing
  setTimeout(() => {
    const queueNum = Store.generateQueueNumber();
    const queueState = Store.getQueueState();
    const position = queueNum - queueState.nowServing;
    const eta = Store.computeEta(position);

    // Determine primary stall from most items
    const stallCount = {};
    cart.forEach(c => {
      const item = MENU_ITEMS.find(m => m.id === c.id);
      if (item) stallCount[item.stallName] = (stallCount[item.stallName] || 0) + c.qty;
    });
    const primaryStall = Object.entries(stallCount).sort((a, b) => b[1] - a[1])[0][0];

    const order = {
      id: `ORD-${Date.now()}`,
      queueNumber: queueNum,
      name,
      items: cart.map(c => {
        const item = MENU_ITEMS.find(m => m.id === c.id);
        return { id: c.id, qty: c.qty, name: item.name, price: item.price, emoji: item.emoji };
      }),
      total: Store.cartTotal(cart),
      stall: primaryStall,
      status: 'preparing', // preparing | ready | collected
      placedAt: Date.now(),
      eta,
      position,
      paymentMethod: selectedPayment
    };

    Store.saveActiveOrder(order);
    Store.addToHistory({ ...order });
    Store.clearCart();

    closeCheckout();
    updateCartBadge();
    renderMenu();

    // Show success modal
    const successOverlay = document.getElementById('successOverlay');
    if (successOverlay) {
      document.getElementById('successQueueNum').textContent = `#${String(queueNum).padStart(3, '0')}`;
      document.getElementById('successStall').textContent = primaryStall;
      document.getElementById('successEta').textContent = `${eta} mins`;
      successOverlay.classList.add('show');
    }

    if (btn) { btn.disabled = false; btn.textContent = 'Place Order 🚀'; }
  }, 1200);
}

function goToQueue() {
  document.getElementById('successOverlay').classList.remove('show');
  window.location.href = 'queue.html';
}

// Close modals on overlay click
document.addEventListener('DOMContentLoaded', () => {
  const checkoutOverlay = document.getElementById('checkoutOverlay');
  if (checkoutOverlay) {
    checkoutOverlay.addEventListener('click', e => {
      if (e.target === checkoutOverlay) closeCheckout();
    });
  }
  const successOverlay = document.getElementById('successOverlay');
  if (successOverlay) {
    successOverlay.addEventListener('click', e => {
      if (e.target === successOverlay) successOverlay.classList.remove('show');
    });
  }
});
