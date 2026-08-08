// ===== QUEUE TRACKER =====
let queueInterval = null;
let countdownSeconds = 0;
let totalSeconds = 0;
let accordionOpen = true;

function initQueuePage() {
  updateCartBadge();
  const order = Store.getActiveOrder();

  if (!order) {
    document.getElementById('noOrderState').style.display = 'block';
    document.getElementById('activeOrderState').style.display = 'none';
    return;
  }

  document.getElementById('noOrderState').style.display = 'none';
  document.getElementById('activeOrderState').style.display = 'block';

  // Populate static info
  document.getElementById('queueNumberDisplay').textContent = `#${String(order.queueNumber).padStart(3, '0')}`;
  document.getElementById('queueStallDisplay').textContent = order.stall;

  // Populate order items
  const itemsEl = document.getElementById('queueOrderItems');
  if (itemsEl) {
    itemsEl.innerHTML = order.items.map(i => `
      <div class="summary-item" style="padding: 6px 0; font-size: 0.875rem; display: flex; justify-content: space-between;">
        <span>${i.emoji} ${i.name} × ${i.qty}</span>
        <span>${Store.formatPrice(i.price * i.qty)}</span>
      </div>`).join('');
    document.getElementById('queueOrderTotal').textContent = Store.formatPrice(order.total);
  }

  if (order.status === 'ready') {
    showReadyState(order);
    return;
  }
  if (order.status === 'collected') {
    showCollectedState(order);
    return;
  }

  // Start live simulation
  startQueueSimulation(order);
}

function startQueueSimulation(order) {
  const queueState = Store.getQueueState();
  countdownSeconds = order.eta * 60;
  totalSeconds = countdownSeconds;

  updateQueueDisplay(order, queueState);
  generateFeed(order.queueNumber, queueState.nowServing);

  // Advance queue every 8 seconds (simulation speed)
  queueInterval = setInterval(() => {
    const state = Store.getQueueState();
    const liveOrder = Store.getActiveOrder();
    if (!liveOrder || liveOrder.status !== 'preparing') {
      clearInterval(queueInterval);
      return;
    }

    // Advance the now-serving counter occasionally
    if (Math.random() > 0.4 && state.nowServing < liveOrder.queueNumber - 1) {
      state.nowServing += 1;
      Store.saveQueueState(state);
    }

    // Recalculate position
    const newPosition = Math.max(0, liveOrder.queueNumber - state.nowServing);
    liveOrder.position = newPosition;
    liveOrder.eta = Store.computeEta(newPosition);
    Store.saveActiveOrder(liveOrder);

    // Countdown
    countdownSeconds = Math.max(0, countdownSeconds - 8);

    updateQueueDisplay(liveOrder, state);
    updateFeed(liveOrder.queueNumber, state.nowServing);

    // Check if ready
    if (newPosition <= 0) {
      clearInterval(queueInterval);
      liveOrder.status = 'ready';
      Store.saveActiveOrder(liveOrder);
      // Update history too
      updateHistoryStatus(liveOrder.id, 'ready');
      setTimeout(() => showReadyState(liveOrder), 500);
      triggerNotification(liveOrder.queueNumber);
    }
  }, 8000);

  // Countdown timer (every second)
  setInterval(() => {
    if (countdownSeconds > 0) countdownSeconds--;
    updateCountdown();
  }, 1000);
}

function updateQueueDisplay(order, queueState) {
  const position = Math.max(0, order.queueNumber - queueState.nowServing);
  const ahead = Math.max(0, position - 1);
  const eta = Store.computeEta(position);

  // Ring
  const maxPos = 10;
  const pct = Math.max(0, 1 - (position / maxPos));
  const dashOffset = 314 * (1 - pct);
  const ring = document.getElementById('ringProgress');
  if (ring) ring.style.strokeDashoffset = dashOffset;

  const ringPos = document.getElementById('ringPosition');
  if (ringPos) ringPos.textContent = ahead;

  // Stats
  setText('statAhead', ahead);
  setText('statEta', eta > 0 ? `${eta}m` : 'Soon!');
  setText('statCurrent', `#${String(queueState.nowServing).padStart(3, '0')}`);

  // Status banner
  const statusText = document.getElementById('statusText');
  const statusDot = document.getElementById('statusDot');
  if (ahead === 0) {
    if (statusText) statusText.textContent = '⚡ You\'re next! Get ready to pick up.';
    if (statusDot) statusDot.className = 'status-dot ready';
  } else if (ahead <= 2) {
    if (statusText) statusText.textContent = `🔥 Almost your turn — ${ahead} order${ahead > 1 ? 's' : ''} ahead!`;
    if (statusDot) statusDot.style.background = '#F59E0B';
  } else {
    if (statusText) statusText.textContent = `👨‍🍳 Preparing your order — ${ahead} order${ahead > 1 ? 's' : ''} ahead`;
  }

  // Timer hint
  const hint = document.getElementById('timerHint');
  if (hint) hint.textContent = ahead <= 1 ? '⚡ Almost ready!' : 'Queue is moving...';

  totalSeconds = Math.max(totalSeconds, eta * 60);
}

function updateCountdown() {
  const el = document.getElementById('countdown');
  const bar = document.getElementById('timerBar');
  if (!el) return;

  const m = Math.floor(countdownSeconds / 60);
  const s = countdownSeconds % 60;
  el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  if (bar && totalSeconds > 0) {
    const pct = Math.max(0, 100 - (countdownSeconds / totalSeconds) * 100);
    bar.style.width = `${pct}%`;
  }
}

// ===== FEED =====
const feedItems = [];

function generateFeed(myQueue, nowServing) {
  feedItems.length = 0;
  for (let n = nowServing; n <= Math.min(nowServing + 5, myQueue + 2); n++) {
    feedItems.push({
      num: n,
      status: n < nowServing ? 'served' : n === nowServing ? 'Serving now' : 'Waiting',
      time: formatTimeAgo(nowServing - n)
    });
  }
  renderFeed(myQueue);
}

function updateFeed(myQueue, nowServing) {
  // Ensure nowServing is in feed
  const existing = feedItems.find(f => f.num === nowServing);
  if (!existing) {
    feedItems.unshift({ num: nowServing, status: 'Serving now', time: 'just now' });
    if (feedItems.length > 6) feedItems.pop();
  } else {
    feedItems.forEach(f => {
      if (f.num < nowServing) f.status = 'Served ✓';
      if (f.num === nowServing) f.status = 'Serving now';
    });
  }
  renderFeed(myQueue);
}

function renderFeed(myQueue) {
  const el = document.getElementById('feedList');
  if (!el) return;
  el.innerHTML = feedItems.slice(0, 5).map(f => `
    <div class="feed-item${f.status === 'Served ✓' ? ' served' : ''}${f.num === myQueue ? ' yours' : ''}">
      <span class="feed-num">#${String(f.num).padStart(3,'0')}</span>
      <span class="feed-status">${f.num === myQueue ? '⭐ You' : f.status}</span>
      <span class="feed-time">${f.status === 'Serving now' ? '🟢 Now' : ''}</span>
    </div>`).join('');
}

function formatTimeAgo(diff) {
  if (diff <= 0) return '';
  return `${diff * 3}m ago`;
}

// ===== READY STATE =====
function showReadyState(order) {
  const readyCard = document.getElementById('readyCard');
  const timerCard = document.getElementById('timerCard');
  if (readyCard) readyCard.style.display = 'block';
  if (timerCard) timerCard.style.display = 'none';

  const readyStall = document.getElementById('readyStall');
  if (readyStall) readyStall.textContent = order.stall;

  const statusText = document.getElementById('statusText');
  const statusDot = document.getElementById('statusDot');
  if (statusText) statusText.textContent = '✅ Your order is ready for pickup!';
  if (statusDot) { statusDot.className = 'status-dot ready'; statusDot.style.animation = 'none'; }

  setText('countdown', '00:00');
  setText('statEta', 'Ready!');
}

function showCollectedState(order) {
  const statusText = document.getElementById('statusText');
  const statusDot = document.getElementById('statusDot');
  if (statusText) statusText.textContent = '✅ Order collected. Enjoy your meal!';
  if (statusDot) { statusDot.className = 'status-dot done'; }
  const timerCard = document.getElementById('timerCard');
  if (timerCard) timerCard.style.display = 'none';
}

function markCollected() {
  const order = Store.getActiveOrder();
  if (!order) return;
  order.status = 'collected';
  updateHistoryStatus(order.id, 'collected');
  Store.clearActiveOrder();
  showToast('Enjoy your meal! 🍴');
  setTimeout(() => window.location.href = 'index.html', 1500);
}

// ===== ACCORDION =====
function toggleAccordion() {
  accordionOpen = !accordionOpen;
  const body = document.getElementById('accordionBody');
  const arrow = document.getElementById('accordionArrow');
  if (body) body.style.display = accordionOpen ? 'block' : 'none';
  if (arrow) arrow.textContent = accordionOpen ? '▼' : '▶';
}

// ===== NOTIFICATION =====
function triggerNotification(queueNum) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('CanteenGo — Order Ready! 🍱', {
      body: `Queue #${String(queueNum).padStart(3,'0')} — Head to the counter now!`,
      icon: 'assets/icon.png'
    });
  }
  showToast(`🔔 Queue #${String(queueNum).padStart(3,'0')} — Your food is ready!`, 5000);
}

// ===== UTILITY =====
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateHistoryStatus(orderId, status) {
  const history = Store.getHistory();
  const idx = history.findIndex(h => h.id === orderId);
  if (idx !== -1) {
    history[idx].status = status;
    localStorage.setItem('cg_history', JSON.stringify(history));
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initQueuePage();

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});
