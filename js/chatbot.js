// =====================================================
// CANTEENGO — AI ASSISTANT CHATBOT
// Floating widget on all student pages.
// Handles food Q&A, order help, refunds, escalation.
// =====================================================

const BOT_NAME = 'CG Assist';
const HUMAN_TRIGGER_PHRASES = ['human', 'agent', 'staff', 'person', 'real person', 'help me', 'not helpful', 'useless', 'speak to someone', 'talk to someone'];

// ── KNOWLEDGE BASE ────────────────────────────────
const BOT_KB = [
  // Food recommendations
  { patterns: ['healthy','low cal','diet','light'],
    reply: "Try the **Wonton Noodle Soup** (480 cal) or **Egg Sandwich** (340 cal) — both light and filling. For drinks, **Iced Lemon Tea** is only 90 cal! 🥗" },
  { patterns: ['spicy','kick','heat'],
    reply: "Spicy picks: 🍛 Nasi Lemak Special, 🥘 Char Kway Teow, and 🥟 Curry Puff. All have a good kick!" },
  { patterns: ['cheap','budget','cheapest','affordable','save'],
    reply: "Best budget picks: 🥟 Curry Puff (S$1.20), 🫓 Roti Prata (S$1.80), 🧋 Teh Tarik (S$1.50). Under S$2 each! 💰" },
  { patterns: ['fast','quick','fastest','5 min','five min'],
    reply: "Fastest items: anything from **Drinks** or **Snack Corner** — they're ready in ~2 mins. Try Teh Tarik or Curry Puff. ⚡" },
  { patterns: ['popular','best','recommend','good','nice'],
    reply: "Top picks right now: 🍛 Nasi Lemak Special, 🥘 Char Kway Teow, 🍚 Chicken Rice, and 🥛 Milo Dinosaur. All crowd favourites! ⭐" },
  { patterns: ['combo','bundle','deal','discount'],
    reply: "Check out the **Study Break Combos** on the menu page — Brain Fuel, Quick Bite, Exam Warrior, and Afternoon Slump. Each saves you S$0.30–S$0.80! 📚" },
  { patterns: ['vegetarian','vegan','no meat','meatless'],
    reply: "Vegetarian-friendly: 🫓 Roti Prata, 🧋 Teh Tarik, 🍋 Iced Lemon Tea, 🥛 Milo Dinosaur, and 🥟 Curry Puff. Just note curry puff may have traces of meat. 🌿" },
  { patterns: ['drink','drinks','thirsty','beverage'],
    reply: "Drinks stall has: 🧋 Teh Tarik (S$1.50), 🥛 Milo Dinosaur (S$2.00), 🍋 Iced Lemon Tea (S$1.80). Hot or cold depending on mood! ☕" },
  // Order help
  { patterns: ['queue','wait','how long','waiting','time'],
    reply: "Your wait time = your queue position × prep time. Drinks/Snacks: ~2 min per order. Rice/Noodles: ~3 min. Check **My Queue** for your live countdown! ⏱️" },
  { patterns: ['cancel','cancell'],
    reply: "Orders can't be cancelled once placed as they go straight to the stall. For urgent issues, please speak to the stall staff directly or use **Refund/Issue** below. 😔" },
  { patterns: ['refund','wrong order','mistake','incorrect'],
    reply: "Sorry about that! For a refund or wrong order:\n1. Go to **Orders** page\n2. Find the order\n3. Tell staff at the stall counter\n\nNeed more help? I can connect you to our support team. Just say **'connect me to support'**. 🔄" },
  { patterns: ['points','loyalty','reward'],
    reply: "You earn points on every order — tap the 🏅 in the navbar to see your balance. **50 pts = S$1 off** at checkout using the redemption slider. Spin the wheel daily for bonus points! 🎰" },
  { patterns: ['spin','wheel','lucky'],
    reply: "The 🎰 Daily Lucky Spin gives you one spin per day. Win S$0.30–S$2.00 off, or bonus points (+20/+50). Tap the 🏅 badge in the top nav to spin! 🍀" },
  { patterns: ['password','forgot','login','account','sign in','register'],
    reply: "For account issues: go to the **Sign In** page → click **Forgot password?** to get a reset link. If you're stuck, say **'connect me to support'** and I'll escalate to the team. 🔑" },
  { patterns: ['hours','open','close','timing'],
    reply: "Canteen is typically open 7am–8pm on weekdays, 8am–4pm on weekends. Individual stalls may vary — check the **Stall Busyness** panel on the menu page. 🕐" },
  // Escalation
  { patterns: ['connect me to support','human support','speak to','talk to','real agent','escalate'],
    reply: null, type: 'escalate' },
];

function matchKB(input) {
  const lower = input.toLowerCase();
  for (const entry of BOT_KB) {
    if (entry.patterns.some(p => lower.includes(p))) return entry;
  }
  return null;
}

function isEscalateRequest(input) {
  const lower = input.toLowerCase();
  return HUMAN_TRIGGER_PHRASES.some(p => lower.includes(p));
}

// ── BUILD WIDGET ──────────────────────────────────
function buildChatbot() {
  if (document.getElementById('chatbotWidget')) return;
  const el = document.createElement('div');
  el.id = 'chatbotWidget';
  el.innerHTML = `
    <!-- Floating button -->
    <button class="chat-fab" id="chatFab" onclick="toggleChatbot()" aria-label="Open Assistant">
      <span class="chat-fab-icon" id="chatFabIcon">💬</span>
      <span class="chat-fab-badge hidden" id="chatFabBadge">1</span>
    </button>

    <!-- Chat window -->
    <div class="chat-window hidden" id="chatWindow">
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-avatar">🤖</div>
          <div>
            <div class="chat-title">${BOT_NAME}</div>
            <div class="chat-subtitle" id="chatStatus">Online · replies instantly</div>
          </div>
        </div>
        <button class="chat-close" onclick="toggleChatbot()">✕</button>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-quick-btns" id="chatQuickBtns">
        <button class="chat-quick" onclick="sendQuick('What should I eat?')">🍽️ Food recs</button>
        <button class="chat-quick" onclick="sendQuick('How do points work?')">🏅 Points</button>
        <button class="chat-quick" onclick="sendQuick('I want a refund')">💸 Refund</button>
        <button class="chat-quick" onclick="sendQuick('How long is my wait?')">⏱️ Wait time</button>
      </div>
      <div class="chat-input-row">
        <input class="chat-input" id="chatInput" type="text" placeholder="Ask me anything…" onkeydown="if(event.key==='Enter')sendChat()" maxlength="200" />
        <button class="chat-send" onclick="sendChat()">➤</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  // Greet after 2s
  setTimeout(() => {
    const session = typeof AuthStore !== 'undefined' ? AuthStore.getSession() : null;
    const name = session ? session.name.split(' ')[0] : 'there';
    botMessage(`Hey ${name}! 👋 I'm ${BOT_NAME}. Ask me about the menu, your order, points, or refunds — or just say **"What should I eat?"**`);
    showFabBadge();
  }, 2000);
}

let chatOpen = false;
let isEscalated = false;
const chatLog = [];

function toggleChatbot() {
  chatOpen = !chatOpen;
  const win  = document.getElementById('chatWindow');
  const icon = document.getElementById('chatFabIcon');
  if (win)  win.classList.toggle('hidden', !chatOpen);
  if (icon) icon.textContent = chatOpen ? '✕' : '💬';
  if (chatOpen) hideFabBadge();
}

function showFabBadge() {
  if (chatOpen) return;
  const b = document.getElementById('chatFabBadge');
  if (b) b.classList.remove('hidden');
}
function hideFabBadge() {
  const b = document.getElementById('chatFabBadge');
  if (b) b.classList.add('hidden');
}

// ── MESSAGES ─────────────────────────────────────
function botMessage(text, extra = '') {
  appendMessage('bot', text, extra);
}
function userMessage(text) {
  appendMessage('user', text);
}

function appendMessage(role, text, extra = '') {
  const msgs = document.getElementById('chatMessages'); if (!msgs) return;
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg-${role}`;
  // Convert **bold** markdown
  const html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  div.innerHTML = `<div class="chat-bubble">${html}</div>${extra}`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  chatLog.push({ role, text });
}

function typingIndicator(show) {
  const msgs = document.getElementById('chatMessages'); if (!msgs) return;
  const existing = document.getElementById('chatTyping');
  if (show && !existing) {
    const d = document.createElement('div');
    d.id = 'chatTyping'; d.className = 'chat-msg chat-msg-bot';
    d.innerHTML = `<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  } else if (!show && existing) { existing.remove(); }
}

// ── SEND ─────────────────────────────────────────
function sendQuick(text) {
  const inp = document.getElementById('chatInput');
  if (inp) inp.value = text;
  sendChat();
}

function sendChat() {
  const inp = document.getElementById('chatInput'); if (!inp) return;
  const text = inp.value.trim(); if (!text) return;
  inp.value = '';
  userMessage(text);

  // Hide quick buttons after first message
  const qb = document.getElementById('chatQuickBtns');
  if (qb) qb.style.display = 'none';

  typingIndicator(true);
  setTimeout(() => {
    typingIndicator(false);
    processMessage(text);
  }, 700 + Math.random() * 500);
}

function processMessage(text) {
  if (isEscalated) {
    handleEscalated(text); return;
  }

  // Check escalation request
  if (isEscalateRequest(text)) {
    escalateToHuman(); return;
  }

  const match = matchKB(text);
  if (match) {
    if (match.type === 'escalate') { escalateToHuman(); return; }
    botMessage(match.reply);
    return;
  }

  // Fallback
  botMessage(
    "I'm not sure about that one! Here's what I can help with:",
    `<div class="chat-suggest-btns">
      <button class="chat-quick" onclick="sendQuick('What\\'s the healthiest option?')">🥗 Healthy food</button>
      <button class="chat-quick" onclick="sendQuick('I want a refund')">💸 Refund</button>
      <button class="chat-quick" onclick="sendQuick('Connect me to support')">🧑‍💼 Human support</button>
    </div>`
  );
}

// ── ESCALATION ───────────────────────────────────
function escalateToHuman() {
  isEscalated = false; // Will set true after user confirms
  botMessage(
    "I'll connect you to our **human support team** now. 🧑‍💼\n\nPlease briefly describe your issue and someone will follow up via your registered email.",
    `<div class="chat-escalate-form">
      <textarea id="escalateMsg" class="chat-escalate-input" rows="2" placeholder="Describe your issue…" maxlength="300"></textarea>
      <button class="chat-quick primary" onclick="submitEscalation()">📨 Submit to Support</button>
    </div>`
  );
  const status = document.getElementById('chatStatus');
  if (status) status.textContent = 'Connecting to support…';
}

function submitEscalation() {
  const msgEl = document.getElementById('escalateMsg');
  const msg   = msgEl ? msgEl.value.trim() : '';
  if (!msg) { showToast('Please describe your issue first.'); return; }

  const session = typeof AuthStore !== 'undefined' ? AuthStore.getSession() : null;
  const ticket = {
    id:      'TKT-' + Date.now().toString(36).toUpperCase(),
    email:   session?.email || 'unknown',
    name:    session?.name  || 'Student',
    message: msg,
    at:      Date.now()
  };
  const tickets = JSON.parse(localStorage.getItem('cg_support_tickets') || '[]');
  tickets.unshift(ticket);
  localStorage.setItem('cg_support_tickets', JSON.stringify(tickets));

  isEscalated = true;
  botMessage(
    `✅ Ticket **${ticket.id}** submitted!\n\nOur support team will reach you at **${ticket.email}** within 24 hours. Is there anything else I can help with?`
  );
  const status = document.getElementById('chatStatus');
  if (status) status.textContent = 'Ticket submitted';
}

function handleEscalated(text) {
  // After escalation, still try KB
  const match = matchKB(text);
  if (match && match.type !== 'escalate') { botMessage(match.reply); return; }
  botMessage("Your support ticket is already logged. Our team will reach out soon! Anything else I can help with in the meantime? 😊");
}

// ── INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', buildChatbot);
