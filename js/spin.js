// ===== LUCKY SPIN WHEEL =====
const SPIN_PRIZES = [
  { label: 'S$0.50 off', value: 0.50, color: '#FF6B35', textColor: '#fff' },
  { label: 'No luck 😅', value: 0,    color: '#E5E7EB', textColor: '#6B7280' },
  { label: 'S$1.00 off', value: 1.00, color: '#FF8C42', textColor: '#fff' },
  { label: '+20 pts',    value: 0,    color: '#FFB347', textColor: '#fff', pts: 20 },
  { label: 'S$0.30 off', value: 0.30, color: '#FF6B35', textColor: '#fff' },
  { label: 'No luck 😅', value: 0,    color: '#E5E7EB', textColor: '#6B7280' },
  { label: 'S$2.00 off', value: 2.00, color: '#e5521e', textColor: '#fff' },
  { label: '+50 pts',    value: 0,    color: '#FFD700', textColor: '#333', pts: 50 },
];

const SEGMENT_COUNT = SPIN_PRIZES.length;
const ARC = (2 * Math.PI) / SEGMENT_COUNT;
let isSpinning = false;

function openSpinWheel() {
  if (!Store.canSpinToday()) {
    showToast("You've already spun today! Come back tomorrow 🌅");
    return;
  }
  const overlay = document.getElementById('spinOverlay');
  if (overlay) {
    overlay.classList.add('show');
    drawWheel(0);
  }
}

function closeSpinWheel() {
  const overlay = document.getElementById('spinOverlay');
  if (overlay) overlay.classList.remove('show');
}

function drawWheel(rotation) {
  const canvas = document.getElementById('spinCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const cx = W / 2, cy = W / 2, r = W / 2 - 6;

  ctx.clearRect(0, 0, W, W);

  SPIN_PRIZES.forEach((prize, i) => {
    const startAngle = rotation + i * ARC;
    const endAngle = startAngle + ARC;

    // Segment
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = prize.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + ARC / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = prize.textColor;
    ctx.font = `bold ${W < 280 ? 10 : 12}px Inter, sans-serif`;
    ctx.fillText(prize.label, r - 10, 4);
    ctx.restore();
  });

  // Center cap
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#FF6B35';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#FF6B35';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GO!', cx, cy);
}

function spinWheel() {
  if (isSpinning || !Store.canSpinToday()) return;
  isSpinning = true;

  const spinBtn = document.getElementById('doSpinBtn');
  if (spinBtn) { spinBtn.disabled = true; spinBtn.textContent = 'Spinning...'; }

  // Pick random winner
  const winnerIndex = Math.floor(Math.random() * SEGMENT_COUNT);
  // Spin multiple full rotations + land on winner
  const extraSpins = 5 + Math.floor(Math.random() * 3); // 5–7 full spins
  const targetAngle = (2 * Math.PI * extraSpins) + (2 * Math.PI - winnerIndex * ARC - ARC / 2);

  let currentAngle = 0;
  let startTime = null;
  const duration = 4000; // ms

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const t = Math.min(elapsed / duration, 1);
    currentAngle = easeOut(t) * targetAngle;
    drawWheel(currentAngle);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      // Spin done
      isSpinning = false;
      const prize = SPIN_PRIZES[winnerIndex];
      handleSpinResult(prize, spinBtn);
    }
  }

  requestAnimationFrame(animate);
}

function handleSpinResult(prize, spinBtn) {
  // Save spin state
  Store.saveSpinState({ lastSpin: new Date().toISOString(), discount: prize.value });

  // Apply bonus points if any
  if (prize.pts) Store.addPoints(prize.pts);

  // Apply discount if any
  if (prize.value > 0) Store.setActiveDiscount('spin', prize.value);

  // Show result
  const resultEl = document.getElementById('spinResult');
  if (resultEl) {
    if (prize.value > 0) {
      resultEl.innerHTML = `<div class="spin-win">🎉 You won <strong>S$${prize.value.toFixed(2)} off</strong> your next order!</div>`;
    } else if (prize.pts) {
      resultEl.innerHTML = `<div class="spin-win">⭐ You earned <strong>+${prize.pts} bonus points!</strong></div>`;
    } else {
      resultEl.innerHTML = `<div class="spin-lose">Better luck tomorrow! 🍀</div>`;
    }
    resultEl.style.display = 'block';
  }

  if (spinBtn) {
    spinBtn.textContent = 'Done!';
    spinBtn.onclick = () => { closeSpinWheel(); if (typeof renderSpinBtn === 'function') renderSpinBtn(); if (typeof renderPointsBadge === 'function') renderPointsBadge(); };
  }

  showToast(prize.value > 0
    ? `🎰 You won S$${prize.value.toFixed(2)} off! Discount applied.`
    : prize.pts
      ? `⭐ +${prize.pts} bonus points added!`
      : "Better luck tomorrow! 🍀", 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('spinOverlay');
  if (overlay) {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeSpinWheel(); });
  }
  drawWheel(0); // pre-draw static wheel if canvas exists
});
