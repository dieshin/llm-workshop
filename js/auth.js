// =====================================================
// CANTEENGO — AUTH MODULE
// Mock auth using localStorage. No real server.
// =====================================================

// ── CONSTANTS ─────────────────────────────────────
const AUTH_USERS_KEY   = 'cg_users';
const AUTH_SESSION_KEY = 'cg_session';
const AUTH_RESET_KEY   = 'cg_reset_tokens';

// ── SEED DEMO ACCOUNTS (runs after AuthStore defined below) ──
function seedDemoAccounts() {
  const users = AuthStore.getUsers();
  const hasStudent = users.find(u => u.email === 'student@demo.sg');
  const hasStaff   = users.find(u => u.email === 'staff@demo.sg');

  if (!hasStudent) {
    AuthStore.saveUser({
      id:        'demo-student',
      name:      'Alex (Student)',
      email:     'student@demo.sg',
      password:  hashPassword('demo1234'),
      role:      'student',
      stall:     null,
      createdAt: Date.now()
    });
  }
  if (!hasStaff) {
    AuthStore.saveUser({
      id:        'demo-staff',
      name:      'Auntie Rosnah',
      email:     'staff@demo.sg',
      password:  hashPassword('demo1234'),
      role:      'staff',
      stall:     'rice',
      stallName: 'Rice Station',
      createdAt: Date.now()
    });
  }
}

// ── AUTH STORE ────────────────────────────────────
const AuthStore = {
  getUsers() {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
  },
  saveUser(user) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  },
  findByEmail(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  findById(id) {
    return this.getUsers().find(u => u.id === id) || null;
  },

  // Session
  getSession() {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null');
  },
  setSession(user, remember = false) {
    const session = {
      userId:    user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      stall:     user.stall     || null,
      stallName: user.stallName || null,
      loginAt:   Date.now(),
      remember
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    return session;
  },
  clearSession() {
    localStorage.removeItem(AUTH_SESSION_KEY);
  },
  isLoggedIn() {
    return !!this.getSession();
  },

  // Reset tokens
  getResetTokens() {
    return JSON.parse(localStorage.getItem(AUTH_RESET_KEY) || '{}');
  },
  createResetToken(email) {
    const tokens = this.getResetTokens();
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    tokens[token] = { email: email.toLowerCase(), expiresAt: Date.now() + 15 * 60 * 1000 }; // 15 min
    localStorage.setItem(AUTH_RESET_KEY, JSON.stringify(tokens));
    return token;
  },
  validateResetToken(token) {
    const tokens = this.getResetTokens();
    const entry = tokens[token];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { delete tokens[token]; localStorage.setItem(AUTH_RESET_KEY, JSON.stringify(tokens)); return null; }
    return entry.email;
  },
  consumeResetToken(token) {
    const tokens = this.getResetTokens();
    delete tokens[token];
    localStorage.setItem(AUTH_RESET_KEY, JSON.stringify(tokens));
  }
};

// ── SIMPLE HASH (NOT cryptographic — mock only) ────
function hashPassword(pw) {
  let hash = 0;
  for (let i = 0; i < pw.length; i++) {
    hash = ((hash << 5) - hash) + pw.charCodeAt(i);
    hash |= 0;
  }
  return 'h' + Math.abs(hash).toString(16) + pw.length;
}

// ── AUTH GUARD (call on every protected page) ─────
function requireAuth(allowedRoles) {
  const session = AuthStore.getSession();
  if (!session) {
    window.location.href = 'auth.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    // Staff trying to access student pages → redirect to stall dashboard
    if (session.role === 'staff') {
      window.location.href = 'stall.html';
    } else {
      window.location.href = 'index.html';
    }
    return null;
  }
  return session;
}

// ── NAVBAR SESSION RENDERING ──────────────────────
function renderNavSession() {
  const session = AuthStore.getSession();
  const wrap = document.getElementById('navUserWrap');
  if (!wrap || !session) return;
  const initials = session.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = session.role === 'staff' ? '👨‍🍳 Staff' : '🎒 Student';
  const roleCls   = session.role === 'staff' ? 'role-badge-staff' : 'role-badge-student';
  wrap.innerHTML = `
    <div class="nav-user" onclick="toggleUserMenu()">
      <div class="nav-avatar">${initials}</div>
      <div class="nav-user-info">
        <span class="nav-user-name">${session.name.split(' ')[0]}</span>
        <span class="nav-role-badge ${roleCls}">${roleLabel}</span>
      </div>
      <span class="nav-chevron">▾</span>
    </div>
    <div class="user-menu hidden" id="userMenu">
      <div class="user-menu-header">
        <div class="user-menu-name">${session.name}</div>
        <div class="user-menu-email">${session.email}</div>
      </div>
      ${session.role === 'staff' ? `<a class="user-menu-item" href="stall.html">📋 Stall Dashboard</a>` : ''}
      ${session.role === 'student' ? `<a class="user-menu-item" href="history.html">📦 My Orders</a>` : ''}
      <a class="user-menu-item" href="profile.html">✏️ Edit Profile</a>
      <button class="user-menu-item danger" onclick="logout()">🚪 Sign Out</button>
    </div>`;
}

function toggleUserMenu() {
  const menu = document.getElementById('userMenu');
  if (menu) menu.classList.toggle('hidden');
}

// Close menu when clicking outside
document.addEventListener('click', e => {
  const wrap = document.getElementById('navUserWrap');
  const menu = document.getElementById('userMenu');
  if (menu && wrap && !wrap.contains(e.target)) menu.classList.add('hidden');
});

function logout() {
  AuthStore.clearSession();
  window.location.href = 'auth.html';
}

// ── UI HELPERS ────────────────────────────────────
function switchTab(tab) {
  ['login','register','forgot','reset'].forEach(t => {
    const panel = document.getElementById(`panel${cap(t)}`);
    const tabBtn = document.getElementById(`tab${cap(t)}`);
    if (panel) panel.classList.add('hidden');
    if (tabBtn) tabBtn.classList.remove('active');
  });
  const active = document.getElementById(`panel${cap(tab)}`);
  const activeTab = document.getElementById(`tab${cap(tab)}`);
  if (active) active.classList.remove('hidden');
  if (activeTab) activeTab.classList.add('active');
  clearErrors();
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
}
function clearErrors() {
  ['loginError','registerError','forgotError','resetError'].forEach(id => setError(id, ''));
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait...' : btn.dataset.label || btn.textContent;
}

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁'; }
}

function fillDemo(email, password) {
  const emailInput = document.getElementById('loginEmail');
  const pwInput    = document.getElementById('loginPassword');
  if (emailInput) emailInput.value = email;
  if (pwInput)    pwInput.value    = password;
}

function selectRole(radio) {
  document.querySelectorAll('.role-option').forEach(el => el.classList.remove('active'));
  radio.closest('.role-option').classList.add('active');
  const stallGroup = document.getElementById('stallPickerGroup');
  if (stallGroup) stallGroup.style.display = radio.value === 'staff' ? 'block' : 'none';
}

// ── PASSWORD STRENGTH ─────────────────────────────
function checkStrength(pw) {
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

document.addEventListener('DOMContentLoaded', () => {
  const pwInput = document.getElementById('regPassword');
  if (pwInput) {
    pwInput.addEventListener('input', () => {
      const wrap = document.getElementById('pwStrengthWrap');
      const fill = document.getElementById('pwStrengthFill');
      const lbl  = document.getElementById('pwStrengthLabel');
      if (!wrap) return;
      const val = pwInput.value;
      if (!val) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'flex';
      const score = checkStrength(val);
      const levels = ['Weak','Fair','Good','Strong','Very Strong'];
      const colours = ['#ef4444','#f97316','#eab308','#22c55e','#16a34a'];
      const pct = (score / 5) * 100;
      fill.style.width = pct + '%';
      fill.style.background = colours[score - 1] || '#ef4444';
      lbl.textContent = levels[score - 1] || 'Weak';
      lbl.style.color = colours[score - 1] || '#ef4444';
    });
  }
});

// ── HANDLERS ─────────────────────────────────────

// LOGIN
function handleLogin(e) {
  e.preventDefault();
  clearErrors();
  const email = document.getElementById('loginEmail').value.trim();
  const pw    = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe')?.checked || false;

  const btn = document.getElementById('loginBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }

  setTimeout(() => {
    const user = AuthStore.findByEmail(email);
    if (!user || user.password !== hashPassword(pw)) {
      setError('loginError', 'Incorrect email or password.');
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
      return;
    }
    AuthStore.setSession(user, remember);
    // Role-based redirect
    window.location.href = user.role === 'staff' ? 'stall.html' : 'index.html';
  }, 600);
}

// REGISTER
function handleRegister(e) {
  e.preventDefault();
  clearErrors();
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const pw       = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;
  const roleEl   = document.querySelector('input[name="role"]:checked');
  const role     = roleEl ? roleEl.value : 'student';
  const stall    = role === 'staff' ? (document.getElementById('regStall')?.value || 'rice') : null;

  const STALL_NAMES = { rice:'Rice Station', noodles:'Noodle Bar', snacks:'Snack Corner', drinks:'Drinks' };

  if (pw !== confirm) { setError('registerError', 'Passwords do not match.'); return; }
  if (pw.length < 6)  { setError('registerError', 'Password must be at least 6 characters.'); return; }
  if (AuthStore.findByEmail(email)) { setError('registerError', 'An account with that email already exists.'); return; }

  const btn = document.getElementById('registerBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }

  setTimeout(() => {
    const user = {
      id:        'u-' + Date.now().toString(36),
      name,
      email:     email.toLowerCase(),
      password:  hashPassword(pw),
      role,
      stall,
      stallName: stall ? STALL_NAMES[stall] : null,
      createdAt: Date.now()
    };
    AuthStore.saveUser(user);
    AuthStore.setSession(user);
    window.location.href = role === 'staff' ? 'stall.html' : 'index.html';
  }, 700);
}

// FORGOT PASSWORD
function handleForgot(e) {
  e.preventDefault();
  clearErrors();
  const email = document.getElementById('forgotEmail').value.trim();
  const user  = AuthStore.findByEmail(email);

  // Always show success (don't reveal if email exists — security best practice)
  const token = user ? AuthStore.createResetToken(email) : null;

  document.getElementById('forgotFormWrap').style.display = 'none';
  const successDiv = document.getElementById('forgotSuccess');
  successDiv.classList.remove('hidden');
  document.getElementById('forgotSuccessEmail').textContent =
    `A reset link was sent to ${email}`;

  // Mock: surface the link in UI since we have no email server
  const mockBox = document.getElementById('mockResetBox');
  if (token && mockBox) {
    mockBox.innerHTML = `
      <p class="mock-label">🔧 Dev mode — click below to reset:</p>
      <button class="mock-reset-btn" onclick="openResetWithToken('${token}')">
        Reset password for ${email}
      </button>`;
  } else if (mockBox) {
    mockBox.innerHTML = `<p class="mock-label">No account found with that email.</p>`;
  }
}

function openResetWithToken(token) {
  const email = AuthStore.validateResetToken(token);
  if (!email) { alert('Reset link has expired.'); return; }
  // Store token in sessionStorage for the reset form
  sessionStorage.setItem('cg_reset_token', token);
  switchTab('reset');
}

// RESET PASSWORD
function handleReset(e) {
  e.preventDefault();
  clearErrors();
  const pw      = document.getElementById('resetPassword').value;
  const confirm = document.getElementById('resetConfirm').value;
  const token   = sessionStorage.getItem('cg_reset_token');

  if (pw !== confirm) { setError('resetError', 'Passwords do not match.'); return; }
  if (pw.length < 6)  { setError('resetError', 'Password must be at least 6 characters.'); return; }

  const email = AuthStore.validateResetToken(token);
  if (!email) { setError('resetError', 'Reset link is invalid or expired.'); return; }

  const users = AuthStore.getUsers();
  const idx   = users.findIndex(u => u.email === email);
  if (idx < 0) { setError('resetError', 'Account not found.'); return; }

  users[idx].password = hashPassword(pw);
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  AuthStore.consumeResetToken(token);
  sessionStorage.removeItem('cg_reset_token');

  showAuthToast('Password updated! Please sign in.');
  setTimeout(() => switchTab('login'), 1500);
}

// ── TOAST (auth page only) ─────────────────────────
function showAuthToast(msg) {
  let t = document.getElementById('authToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'authToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── REDIRECT ALREADY-LOGGED-IN USERS ─────────────
(function redirectIfLoggedIn() {
  if (window.location.pathname.endsWith('auth.html') || window.location.pathname === '/auth.html') {
    const session = AuthStore.getSession();
    if (session) {
      window.location.href = session.role === 'staff' ? 'stall.html' : 'index.html';
    }
  }
})();

// Seed demo accounts now that AuthStore is ready
seedDemoAccounts();
