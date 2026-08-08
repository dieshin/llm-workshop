// =====================================================
// CANTEENGO — AI ASSISTANT CHATBOT
// Clean DOM-based rendering — no raw HTML injection
// =====================================================

const BOT_NAME = 'CG Assist';

const HUMAN_TRIGGER_PHRASES = [
  'human', 'agent', 'real person', 'speak to someone',
  'talk to someone', 'connect me', 'escalate', 'not helpful', 'useless'
];

const BOT_KB = [
  { p: ['healthy','low cal','diet','light'],
    r: 'Try the Wonton Noodle Soup (480 cal) or Egg Sandwich (340 cal) — both light and filling. Iced Lemon Tea is only 90 cal! 🥗' },
  { p: ['spicy','kick','heat'],
    r: 'Spicy picks: 🍛 Nasi Lemak Special, 🥘 Char Kway Teow, 🥟 Curry Puff. All have a good kick!' },
  { p: ['cheap','budget','affordable','save money'],
    r: 'Best budget picks: 🥟 Curry Puff (S$1.20), 🫓 Roti Prata (S$1.80), 🧋 Teh Tarik (S$1.50). All under S$2! 💰' },
  { p: ['fast','quick','fastest','2 min','5 min'],
    r: 'Fastest items come from Drinks or Snack Corner — ready in ~2 mins. Try Teh Tarik or Curry Puff. ⚡' },
  { p: ['popular','best','recommend','what should i eat','good','nice'],
    r: 'Top picks: 🍛 Nasi Lemak Special, 🥘 Char Kway Teow, 🍚 Chicken Rice, 🥛 Milo Dinosaur. All crowd favourites! ⭐' },
  { p: ['combo','bundle','deal','discount'],
    r: 'Check the Study Break Combos on the menu page — Brain Fuel, Quick Bite, Exam Warrior, Afternoon Slump. Each saves S$0.30–S$0.80! 📚' },
  { p: ['vegetarian','vegan','no meat','meatless'],
    r: 'Vegetarian-friendly: 🫓 Roti Prata, 🧋 Teh Tarik, 🍋 Iced Lemon Tea, 🥛 Milo Dinosaur, 🥟 Curry Puff. 🌿' },
  { p: ['drink','drinks','thirsty','beverage'],
    r: 'Drinks stall: 🧋 Teh Tarik (S$1.50), 🥛 Milo Dinosaur (S$2.00), 🍋 Iced Lemon Tea (S$1.80). Hot or cold! ☕' },
  { p: ['queue','wait','how long','waiting time'],
    r: 'Wait time = queue position × prep time. Drinks/Snacks: ~2 min/order. Rice/Noodles: ~3 min/order. Check My Queue for your live countdown! ⏱️' },
  { p: ['cancel'],
    r: "Orders can't be cancelled once placed — they go straight to the stall. For urgent cases speak to staff directly. 😔" },
  { p: ['refund','wrong order','mistake','incorrect'],
    r: 'For a refund or wrong order: go to Orders page, find the order, then speak to the stall counter. Need more help? Say "connect me to support". 🔄' },
  { p: ['points','loyalty','reward'],
    r: 'Earn points on every order. 50 pts = S$1 off at checkout using the redemption slider. Spin the daily wheel for bonus points! 🎰' },
  { p: ['spin','wheel','lucky spin'],
    r: 'Daily Lucky Spin: one spin per day. Win S$0.30–S$2.00 off or +20/+50 bonus points. Tap the 🏅 in the nav to spin! 🍀' },
  { p: ['password','forgot','login','account','sign in'],
    r: 'For account issues: go to Sign In → Forgot password? for a reset link. Still stuck? Say "connect me to support". 🔑' },
  { p: ['edit profile','change name','update profile','profile'],
    r: 'You can edit your profile from the nav — tap your avatar/name at the top right and select Edit Profile. 👤' },
  { p: ['hours','open','close','timing'],
    r: 'Canteen is typically open 7am–8pm weekdays, 8am–4pm weekends. Check the Stall Busyness panel on the menu page for live status. 🕐' },
];

function matchKB(input) {
  const low = input.toLowerCase();
  for (const e of BOT_KB) {
    if (e.p.some(p => low.includes(p))) return e.r;
  }
  return null;
}

function isEscalate(input) {
  return HUMAN_TRIGGER_PHRASES.some(p => input.toLowerCase().includes(p));
}

// ── STATE ─────────────────────────────────────────
let chatOpen = false;
let isEscalated = false;

// ── BUILD WIDGET ──────────────────────────────────
function buildChatbot() {
  if (document.getElementById('chatbotWidget')) return;

  const widget = document.createElement('div');
  widget.id = 'chatbotWidget';
  document.body.appendChild(widget);

  // FAB
  const fab = document.createElement('button');
  fab.className = 'chat-fab';
  fab.id = 'chatFab';
  fab.setAttribute('aria-label', 'Open Assistant');
  fab.innerHTML = '<span id="chatFabIcon">💬</span>';
  const badge = document.createElement('span');
  badge.id = 'chatFabBadge';
  badge.className = 'chat-fab-badge hidden';
  badge.textContent = '1';
  fab.appendChild(badge);
  fab.addEventListener('click', toggleChatbot);
  widget.appendChild(fab);

  // Window
  const win = document.createElement('div');
  win.className = 'chat-window hidden';
  win.id = 'chatWindow';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'chat-header';
  hdr.innerHTML = `
    <div class="chat-header-info">
      <div class="chat-avatar-wrap">
        <div class="chat-avatar-dot"></div>
        🤖
      </div>
      <div>
        <div class="chat-title">${BOT_NAME}</div>
        <div class="chat-subtitle" id="chatStatus">Online · replies instantly</div>
      </div>
    </div>`;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'chat-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', toggleChatbot);
  hdr.appendChild(closeBtn);
  win.appendChild(hdr);

  // Messages
  const msgs = document.createElement('div');
  msgs.className = 'chat-messages';
  msgs.id = 'chatMessages';
  win.appendChild(msgs);

  // Quick buttons
  const qb = document.createElement('div');
  qb.className = 'chat-quick-btns';
  qb.id = 'chatQuickBtns';
  const quickOptions = [
    { icon: '🍽️', text: 'What should I eat?'  },
    { icon: '🏅', text: 'How do points work?' },
    { icon: '💸', text: 'I need a refund'     },
    { icon: '⏱️', text: 'How long is my wait?' },
  ];
  quickOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'chat-quick';
    btn.textContent = `${opt.icon} ${opt.text}`;
    btn.addEventListener('click', () => sendMessage(opt.text));
    qb.appendChild(btn);
  });
  win.appendChild(qb);

  // Input row
  const inputRow = document.createElement('div');
  inputRow.className = 'chat-input-row';
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'chat-input'; inp.id = 'chatInput';
  inp.placeholder = 'Ask me anything…'; inp.maxLength = 200;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(inp.value); });
  const sendBtn = document.createElement('button');
  sendBtn.className = 'chat-send'; sendBtn.textContent = '➤';
  sendBtn.addEventListener('click', () => sendMessage(inp.value));
  inputRow.appendChild(inp);
  inputRow.appendChild(sendBtn);
  win.appendChild(inputRow);

  widget.appendChild(win);

  // Greet after 2.5s
  setTimeout(() => {
    const session = (typeof AuthStore !== 'undefined') ? AuthStore.getSession() : null;
    const firstName = session ? session.name.split(' ')[0] : 'there';
    addBotMsg(`Hey ${firstName}! 👋 I'm ${BOT_NAME}. Ask me about the menu, your order, points, refunds — or just tap a button below!`);
    showBadge();
  }, 2500);
}

function toggleChatbot() {
  chatOpen = !chatOpen;
  const win  = document.getElementById('chatWindow');
  const icon = document.getElementById('chatFabIcon');
  if (win)  win.classList.toggle('hidden', !chatOpen);
  if (icon) icon.textContent = chatOpen ? '✕' : '💬';
  if (chatOpen) hideBadge();
}

function showBadge() {
  if (chatOpen) return;
  const b = document.getElementById('chatFabBadge');
  if (b) b.classList.remove('hidden');
}
function hideBadge() {
  const b = document.getElementById('chatFabBadge');
  if (b) b.classList.add('hidden');
}

// ── MESSAGE BUILDERS (DOM-only, no innerHTML injection) ──
function addBotMsg(text, extras) {
  const msgs = document.getElementById('chatMessages'); if (!msgs) return;
  const row = document.createElement('div');
  row.className = 'chat-msg chat-msg-bot';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  // Safe bold markdown
  bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  row.appendChild(bubble);
  if (extras) row.appendChild(extras);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

function addUserMsg(text) {
  const msgs = document.getElementById('chatMessages'); if (!msgs) return;
  const row = document.createElement('div');
  row.className = 'chat-msg chat-msg-user';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('chatMessages'); if (!msgs) return;
  if (document.getElementById('chatTyping')) return;
  const row = document.createElement('div');
  row.id = 'chatTyping'; row.className = 'chat-msg chat-msg-bot';
  row.innerHTML = '<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight;
}
function hideTyping() { const el = document.getElementById('chatTyping'); if (el) el.remove(); }

// ── SEND ─────────────────────────────────────────
function sendMessage(text) {
  if (!text || !text.trim()) return;
  const inp = document.getElementById('chatInput');
  if (inp) inp.value = '';
  text = text.trim();
  addUserMsg(text);

  // Hide quick btns after first use
  const qb = document.getElementById('chatQuickBtns');
  if (qb) qb.style.display = 'none';

  showTyping();
  setTimeout(() => {
    hideTyping();
    respond(text);
  }, 600 + Math.random() * 400);
}

function respond(text) {
  if (isEscalated) { respondEscalated(text); return; }
  if (isEscalate(text)) { showEscalation(); return; }

  const reply = matchKB(text);
  if (reply) { addBotMsg(reply); return; }

  // Fallback with suggestion buttons
  const suggestions = document.createElement('div');
  suggestions.className = 'chat-suggest-btns';
  [['🥗', 'Healthiest option?'], ['💸', 'I need a refund'], ['🧑‍💼', 'Talk to support']].forEach(([icon, label]) => {
    const btn = document.createElement('button');
    btn.className = 'chat-quick';
    btn.textContent = `${icon} ${label}`;
    btn.addEventListener('click', () => sendMessage(label));
    suggestions.appendChild(btn);
  });
  addBotMsg("I'm not sure about that one! Here's what I can help with:", suggestions);
}

function showEscalation() {
  const form = document.createElement('div');
  form.className = 'chat-escalate-form';

  const ta = document.createElement('textarea');
  ta.className = 'chat-escalate-input';
  ta.rows = 2; ta.maxLength = 300;
  ta.placeholder = 'Describe your issue briefly…';
  form.appendChild(ta);

  const submitBtn = document.createElement('button');
  submitBtn.className = 'chat-quick primary';
  submitBtn.textContent = '📨 Submit to Support';
  submitBtn.addEventListener('click', () => {
    const msg = ta.value.trim();
    if (!msg) { ta.style.border = '2px solid var(--red)'; return; }
    submitEscalation(msg);
    form.remove();
  });
  form.appendChild(submitBtn);

  addBotMsg("I'll connect you to our support team. 🧑‍💼\nBriefly describe your issue and someone will follow up via your email:", form);
  const status = document.getElementById('chatStatus');
  if (status) status.textContent = 'Connecting to support…';
}

function submitEscalation(msg) {
  const session = (typeof AuthStore !== 'undefined') ? AuthStore.getSession() : null;
  const ticket = {
    id:      'TKT-' + Date.now().toString(36).toUpperCase(),
    email:   session?.email || 'unknown',
    name:    session?.name  || 'Student',
    message: msg,
    at:      Date.now()
  };
  const all = JSON.parse(localStorage.getItem('cg_support_tickets') || '[]');
  all.unshift(ticket);
  localStorage.setItem('cg_support_tickets', JSON.stringify(all));
  isEscalated = true;
  addBotMsg(`✅ Ticket **${ticket.id}** submitted! Our team will reach you at **${ticket.email}** within 24 hours. Anything else I can help with?`);
  const status = document.getElementById('chatStatus');
  if (status) status.textContent = 'Ticket submitted ✓';
}

function respondEscalated(text) {
  const reply = matchKB(text);
  if (reply) { addBotMsg(reply); return; }
  addBotMsg('Your support ticket is already logged. The team will reach out soon! Anything else I can help with? 😊');
}

document.addEventListener('DOMContentLoaded', buildChatbot);
