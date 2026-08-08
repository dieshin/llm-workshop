// =====================================================
// CANTEENGO — QUEUE TRACKER
// Fixes: timer persistence, status sync, multi-stall,
//        photo upload, feedback modal, ready broadcast
// =====================================================

// Active order being viewed (index into activeOrders array)
let viewingOrderIdx = 0;
let queueIntervals = {};  // orderId → intervalId
let countdownIntervals = {}; // orderId → intervalId
let accordionOpen = true;

// ── INIT ─────────────────────────────────────────
function initQueuePage() {
  updateCartBadge();
  const orders = Store.getActiveOrders();

  if (!orders.length) {
    document.getElementById('noOrderState').style.display = 'block';
    document.getElementById('activeOrderState').style.display = 'none';
    return;
  }

  document.getElementById('noOrderState').style.display = 'none';
  document.getElementById('activeOrderState').style.display = 'block';

  // Build stall tabs if multiple stalls
  buildStallTabs(orders);
  viewOrder(0);
}

// ── STALL TABS (multi-stall) ─────────────────────
function buildStallTabs(orders) {
  const tabWrap = document.getElementById('stallTabsWrap');
  if (!tabWrap) return;
  if (orders.length <= 1) { tabWrap.style.display = 'none'; return; }
  tabWrap.style.display = 'flex';
  tabWrap.innerHTML = orders.map((o, i) => `
    <button class="stall-tab-btn${i === 0 ? ' active' : ''}"
      onclick="switchStallTab(${i})" id="stallTab${i}">
      ${STALLS[o.stallKey]?.icon || '🍽️'} ${o.stallName}
      <span class="stall-tab-status stall-tab-${o.status}">${statusDotHtml(o.status)}</span>
    </button>`).join('');
}

function switchStallTab(idx) {
  viewingOrderIdx = idx;
  document.querySelectorAll('.stall-tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
  viewOrder(idx);
}

function statusDotHtml(status) {
  if (status === 'ready')     return '✅';
  if (status === 'collected') return '📦';
  return '🔄';
}

// ── VIEW AN ORDER ────────────────────────────────
function viewOrder(idx) {
  const orders = Store.getActiveOrders();
  if (!orders[idx]) return;
  const order = orders[idx];

  setText('queueNumberDisplay', `#${String(order.queueNumber).padStart(3,'0')}`);
  setText('queueStallDisplay',  `${STALLS[order.stallKey]?.icon || ''} ${order.stallName}`);

  // Items
  const itemsEl = document.getElementById('queueOrderItems');
  if (itemsEl) {
    itemsEl.innerHTML = order.items.map(i => `
      <div class="summary-item" style="padding:6px 0;font-size:.875rem;display:flex;justify-content:space-between;">
        <span>${i.emoji} ${i.name} × ${i.qty}</span>
        <span>${Store.formatPrice(i.price * i.qty)}</span>
      </div>`).join('');
    setText('queueOrderTotal', Store.formatPrice(order.total));
  }

  if (order.status === 'ready') {
    showReadyState(order);
    stopSimulation(order.id);
    return;
  }
  if (order.status === 'collected') {
    showCollectedState(order);
    stopSimulation(order.id);
    return;
  }

  // Restore or start timer
  startOrRestoreTimer(order);
}

// ── TIMER — PERSIST & RESTORE ────────────────────
function startOrRestoreTimer(order) {
  const saved = Store.getTimerState(order.id);
  let countdownSeconds, totalSeconds;

  if (saved) {
    // Calculate how many real seconds have elapsed since we saved
    const elapsedSec = Math.floor((Date.now() - saved.savedAt) / 1000);
    countdownSeconds = Math.max(0, saved.countdownSeconds - elapsedSec);
    totalSeconds = saved.totalSeconds;
  } else {
    countdownSeconds = order.eta * 60;
    totalSeconds = countdownSeconds;
    Store.saveTimerState(order.id, { countdownSeconds, totalSeconds, savedAt: Date.now() });
  }

  const queueState = Store.getQueueState();
  updateQueueDisplay(order, queueState);
  generateFeed(order.queueNumber, queueState.nowServing);
  renderCountdown(order.id, countdownSeconds, totalSeconds);

  // Stop any existing simulation for this order
  stopSimulation(order.id);

  // Queue advance simulation — every 8s
  queueIntervals[order.id] = setInterval(() => {
    const state = Store.getQueueState();
    const liveOrders = Store.getActiveOrders();
    const liveOrder = liveOrders.find(o => o.id === order.id);
    if (!liveOrder || liveOrder.status !== 'preparing') {
      stopSimulation(order.id); return;
    }

    // Advance now-serving
    if (Math.random() > 0.4 && state.nowServing < liveOrder.queueNumber - 1) {
      state.nowServing += 1; Store.saveQueueState(state);
    }

    const newPosition = Math.max(0, liveOrder.queueNumber - state.nowServing);
    liveOrder.position = newPosition;
    liveOrder.eta = Store.computeStallEta(newPosition, liveOrder.stallKey);
    Store.saveActiveOrder(liveOrder);
    // Sync to history
    Store.updateHistoryStatus(liveOrder.id, 'preparing', { position: newPosition, eta: liveOrder.eta });

    if (viewingOrderIdx === (Store.getActiveOrders().indexOf(liveOrder))) {
      updateQueueDisplay(liveOrder, state);
      updateFeed(liveOrder.queueNumber, state.nowServing);
    }

    if (newPosition <= 0) {
      stopSimulation(liveOrder.id);
      liveOrder.status = 'ready';
      Store.saveActiveOrder(liveOrder);
      Store.updateHistoryStatus(liveOrder.id, 'ready');
      Store.clearTimerState(liveOrder.id);
      Store.broadcastReady(liveOrder);
      triggerNotification(liveOrder.queueNumber, liveOrder.stallName);
      // Refresh view
      buildStallTabs(Store.getActiveOrders());
      if (viewingOrderIdx === Store.getActiveOrders().findIndex(o => o.id === liveOrder.id)) {
        showReadyState(liveOrder);
      }
    }
  }, 8000);

  // Countdown — every second, save every 5s
  let tickCount = 0;
  let localCountdown = countdownSeconds;
  countdownIntervals[order.id] = setInterval(() => {
    if (localCountdown > 0) localCountdown--;
    tickCount++;
    if (tickCount % 5 === 0) {
      Store.saveTimerState(order.id, { countdownSeconds: localCountdown, totalSeconds, savedAt: Date.now() });
    }
    if (viewingOrderIdx === Store.getActiveOrders().findIndex(o => o.id === order.id)) {
      renderCountdown(order.id, localCountdown, totalSeconds);
    }
    if (localCountdown <= 0) {
      clearInterval(countdownIntervals[order.id]);
    }
  }, 1000);
}

function stopSimulation(orderId) {
  if (queueIntervals[orderId])    { clearInterval(queueIntervals[orderId]);    delete queueIntervals[orderId]; }
  if (countdownIntervals[orderId]){ clearInterval(countdownIntervals[orderId]); delete countdownIntervals[orderId]; }
}

function renderCountdown(orderId, countdownSeconds, totalSeconds) {
  const m = Math.floor(countdownSeconds / 60);
  const s = countdownSeconds % 60;
  setText('countdown', `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
  const bar = document.getElementById('timerBar');
  if (bar && totalSeconds > 0) {
    bar.style.width = `${Math.max(0, 100 - (countdownSeconds / totalSeconds) * 100)}%`;
  }
}

// ── QUEUE DISPLAY ────────────────────────────────
function updateQueueDisplay(order, queueState) {
  const position = Math.max(0, order.queueNumber - queueState.nowServing);
  const ahead = Math.max(0, position - 1);
  const eta = Store.computeStallEta(position, order.stallKey);

  const maxPos = 10;
  const pct = Math.max(0, 1 - position / maxPos);
  const ring = document.getElementById('ringProgress');
  if (ring) ring.style.strokeDashoffset = 314 * (1 - pct);
  setText('ringPosition', ahead);
  setText('statAhead',  ahead);
  setText('statEta',    eta > 0 ? `${eta}m` : 'Soon!');
  setText('statCurrent', `#${String(queueState.nowServing).padStart(3,'0')}`);

  const statusText = document.getElementById('statusText');
  const statusDot  = document.getElementById('statusDot');
  if (ahead === 0) {
    if (statusText) statusText.textContent = "⚡ You're next! Get ready.";
    if (statusDot)  { statusDot.className = 'status-dot ready'; }
  } else if (ahead <= 2) {
    if (statusText) statusText.textContent = `🔥 Almost your turn — ${ahead} order${ahead>1?'s':''} ahead!`;
    if (statusDot)  statusDot.style.background = 'var(--yellow)';
  } else {
    if (statusText) statusText.textContent = `👨‍🍳 Preparing — ${ahead} order${ahead>1?'s':''} ahead`;
  }
  const hint = document.getElementById('timerHint');
  if (hint) hint.textContent = ahead <= 1 ? '⚡ Almost ready!' : 'Queue is moving...';
}

// ── FEED ─────────────────────────────────────────
const feedItems = [];
function generateFeed(myQueue, nowServing) {
  feedItems.length = 0;
  for (let n = nowServing; n <= Math.min(nowServing + 5, myQueue + 2); n++) {
    feedItems.push({ num: n, status: n < nowServing ? 'Served ✓' : n === nowServing ? 'Serving now' : 'Waiting' });
  }
  renderFeed(myQueue);
}
function updateFeed(myQueue, nowServing) {
  feedItems.forEach(f => {
    if (f.num < nowServing) f.status = 'Served ✓';
    if (f.num === nowServing) f.status = 'Serving now';
  });
  renderFeed(myQueue);
}
function renderFeed(myQueue) {
  const el = document.getElementById('feedList'); if (!el) return;
  el.innerHTML = feedItems.slice(0,5).map(f => `
    <div class="feed-item${f.status==='Served ✓'?' served':''}${f.num===myQueue?' yours':''}">
      <span class="feed-num">#${String(f.num).padStart(3,'0')}</span>
      <span class="feed-status">${f.num===myQueue ? '⭐ You' : f.status}</span>
      <span class="feed-time">${f.status==='Serving now'?'🟢 Now':''}</span>
    </div>`).join('');
}

// ── READY STATE ───────────────────────────────────
function showReadyState(order) {
  const timerCard = document.getElementById('timerCard');
  const readyCard = document.getElementById('readyCard');
  if (timerCard) timerCard.style.display = 'none';
  if (readyCard) {
    readyCard.style.display = 'block';
    setText('readyStall', `${STALLS[order.stallKey]?.icon || ''} ${order.stallName}`);
  }
  const statusText = document.getElementById('statusText');
  const statusDot  = document.getElementById('statusDot');
  if (statusText) statusText.textContent = '✅ Order ready for pickup!';
  if (statusDot)  { statusDot.className = 'status-dot ready'; statusDot.style.animation = 'none'; }
  setText('countdown', '00:00');
  setText('statEta', 'Ready!');

  // Build photo upload section inside ready card
  renderPhotoUpload(order.id);
}

function showCollectedState(order) {
  const statusText = document.getElementById('statusText');
  const statusDot  = document.getElementById('statusDot');
  if (statusText) statusText.textContent = '📦 Order collected. Enjoy!';
  if (statusDot)  { statusDot.className = 'status-dot done'; }
  const timerCard = document.getElementById('timerCard');
  if (timerCard) timerCard.style.display = 'none';
  const readyCard = document.getElementById('readyCard');
  if (readyCard) readyCard.style.display = 'none';
}

// ── PHOTO UPLOAD ─────────────────────────────────
function renderPhotoUpload(orderId) {
  const rc = document.getElementById('readyCard'); if (!rc) return;
  if (rc.querySelector('.photo-upload-wrap')) return; // already rendered

  const existing = Store.getOrderPhoto(orderId);
  const div = document.createElement('div');
  div.className = 'photo-upload-wrap';
  div.innerHTML = `
    <p class="photo-upload-label">📸 Snap a pic of your meal <span class="photo-optional">(optional)</span></p>
    ${existing
      ? `<div class="photo-preview-wrap">
           <img src="${existing}" class="photo-preview" id="mealPhotoPreview" alt="meal photo"/>
           <button class="photo-remove-btn" onclick="removePhoto('${orderId}')">✕ Remove</button>
         </div>`
      : `<div class="photo-preview-wrap" id="photoPreviewWrap" style="display:none">
           <img src="" class="photo-preview" id="mealPhotoPreview" alt="meal photo"/>
           <button class="photo-remove-btn" onclick="removePhoto('${orderId}')">✕ Remove</button>
         </div>`
    }
    <label class="photo-upload-btn" for="mealPhotoInput">
      📷 Choose Photo
      <input type="file" id="mealPhotoInput" accept="image/*" capture="environment"
        onchange="handlePhotoUpload(event, '${orderId}')" style="display:none"/>
    </label>`;

  // Insert before collect button
  const collectBtn = rc.querySelector('.btn-collected');
  if (collectBtn) rc.insertBefore(div, collectBtn);
  else rc.appendChild(div);
}

function handlePhotoUpload(event, orderId) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    Store.saveOrderPhoto(orderId, dataUrl);
    const preview = document.getElementById('mealPhotoPreview');
    const wrap    = document.getElementById('photoPreviewWrap');
    if (preview) preview.src = dataUrl;
    if (wrap)    wrap.style.display = 'block';
    showToast('Photo saved! 📸');
  };
  reader.readAsDataURL(file);
}

function removePhoto(orderId) {
  localStorage.removeItem(`cg_photo_${orderId}`);
  const wrap = document.getElementById('photoPreviewWrap');
  if (wrap) wrap.style.display = 'none';
  const input = document.getElementById('mealPhotoInput');
  if (input) input.value = '';
  showToast('Photo removed');
}

// ── MARK COLLECTED ────────────────────────────────
function markCollected() {
  const orders = Store.getActiveOrders();
  const order = orders[viewingOrderIdx];
  if (!order) return;

  order.status = 'collected';
  Store.saveActiveOrder(order);
  Store.updateHistoryStatus(order.id, 'collected');
  Store.clearTimerState(order.id);
  stopSimulation(order.id);

  // Remove from active orders
  const remaining = Store.getActiveOrders().filter(o => o.id !== order.id || o.status !== 'collected');
  // Actually keep collected ones out of active
  const stillActive = Store.getActiveOrders().filter(o => o.id !== order.id);
  Store.saveActiveOrders(stillActive);

  // Show feedback modal then redirect
  showFeedbackModal(order);
}

// ── FEEDBACK MODAL ────────────────────────────────
function showFeedbackModal(order) {
  let modal = document.getElementById('feedbackModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'feedbackModal';
    modal.className = 'modal-overlay center-modal show';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal feedback-modal">
      <div class="modal-header">
        <h2>How was your meal? 😋</h2>
      </div>
      <div class="modal-body feedback-body">
        <p class="feedback-stall">${STALLS[order.stallKey]?.icon || ''} ${order.stallName}</p>
        <div class="star-rating" id="starRating">
          ${[1,2,3,4,5].map(n => `<button class="star-btn" data-val="${n}" onclick="selectStar(${n})">★</button>`).join('')}
        </div>
        <div class="feedback-tags" id="feedbackTags">
          <button class="feedback-tag" onclick="toggleTag(this)">Tasty 😋</button>
          <button class="feedback-tag" onclick="toggleTag(this)">Fast ⚡</button>
          <button class="feedback-tag" onclick="toggleTag(this)">Good value 💰</button>
          <button class="feedback-tag" onclick="toggleTag(this)">Friendly staff 😊</button>
          <button class="feedback-tag" onclick="toggleTag(this)">Portion too small 😅</button>
          <button class="feedback-tag" onclick="toggleTag(this)">Too slow 🐢</button>
        </div>
        <textarea class="feedback-comment" id="feedbackComment" placeholder="Anything else? (optional)" rows="2"></textarea>
        <div id="feedbackStarError" class="feedback-error" style="display:none">Please select a rating first.</div>
      </div>
      <div class="modal-footer" style="display:flex;gap:8px;">
        <button class="btn-auth secondary" style="flex:1" onclick="skipFeedback()">Skip</button>
        <button class="btn-auth" style="flex:2" onclick="submitFeedback('${order.id}', '${order.stallKey}', '${order.stallName}')">Submit ✓</button>
      </div>
    </div>`;
  modal.style.display = 'flex';
}

let selectedStars = 0;
function selectStar(val) {
  selectedStars = val;
  document.querySelectorAll('.star-btn').forEach((b, i) => b.classList.toggle('active', i < val));
}
function toggleTag(btn) { btn.classList.toggle('active'); }

function submitFeedback(orderId, stallKey, stallName) {
  if (!selectedStars) { document.getElementById('feedbackStarError').style.display = 'block'; return; }
  const tags    = [...document.querySelectorAll('.feedback-tag.active')].map(t => t.textContent.trim());
  const comment = document.getElementById('feedbackComment')?.value.trim() || '';
  Store.saveFeedback({ orderId, stallKey, stallName, stars: selectedStars, tags, comment, at: Date.now() });
  selectedStars = 0;
  showToast('Thanks for the feedback! 🙏');
  closeFeedbackAndRedirect();
}

function skipFeedback() { closeFeedbackAndRedirect(); }

function closeFeedbackAndRedirect() {
  const modal = document.getElementById('feedbackModal');
  if (modal) modal.remove();
  if (typeof window._feedbackRedirectOverride === 'function') {
    window._feedbackRedirectOverride();
    window._feedbackRedirectOverride = null;
    return;
  }
  const remaining = Store.getActiveOrders();
  if (!remaining.length) {
    window.location.href = 'history.html';
  } else {
    viewingOrderIdx = 0;
    buildStallTabs(remaining);
    viewOrder(0);
  }
}

// ── ACCORDION ────────────────────────────────────
function toggleAccordion() {
  accordionOpen = !accordionOpen;
  const body  = document.getElementById('accordionBody');
  const arrow = document.getElementById('accordionArrow');
  if (body)  body.style.display  = accordionOpen ? 'block' : 'none';
  if (arrow) arrow.textContent   = accordionOpen ? '▼' : '▶';
}

// ── NOTIFICATION ─────────────────────────────────
function triggerNotification(queueNum, stallName) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`CanteenGo — Order Ready! 🍱`, {
      body: `Queue #${String(queueNum).padStart(3,'0')} at ${stallName} — head to the counter!`
    });
  }
  showToast(`🔔 #${String(queueNum).padStart(3,'0')} at ${stallName} is ready!`, 6000);
}

// ── UTILITY ──────────────────────────────────────
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ── INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initQueuePage();
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
});
