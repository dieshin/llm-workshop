// =====================================================
// CANTEENGO — PROFILE EDITOR
// Works for both student and staff roles
// =====================================================

const STALL_NAMES = { rice:'Rice Station', noodles:'Noodle Bar', snacks:'Snack Corner', drinks:'Drinks' };
const STALL_ICONS = { rice:'🍚', noodles:'🍜', snacks:'🥪', drinks:'🧋' };

document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth(); // any role
  if (!session) return;

  renderNavSession();
  populateNavLinks(session.role);
  loadProfile(session);
});

function populateNavLinks(role) {
  const linksEl = document.getElementById('profileNavLinks');
  if (!linksEl) return;
  if (role === 'staff') {
    linksEl.innerHTML = `<a href="stall.html" class="nav-link">Dashboard</a>`;
  } else {
    linksEl.innerHTML = `
      <a href="index.html"   class="nav-link">Menu</a>
      <a href="queue.html"   class="nav-link">My Queue</a>
      <a href="history.html" class="nav-link">Orders</a>`;
  }
}

function loadProfile(session) {
  const user = AuthStore.findById(session.userId);
  if (!user) return;

  // Avatar
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const avatarEl = document.getElementById('profileAvatarBig');
  if (avatarEl) avatarEl.textContent = initials;

  // Name display
  const nameEl = document.getElementById('profileNameDisplay');
  if (nameEl) nameEl.textContent = user.name;

  // Role badge
  const roleEl = document.getElementById('profileRoleDisplay');
  if (roleEl) {
    const isStaff = user.role === 'staff';
    roleEl.textContent = isStaff
      ? `👨‍🍳 Stall Staff · ${user.stallName || ''}`
      : '🎒 Student';
    roleEl.className = `profile-role-display ${isStaff ? 'staff' : 'student'}`;
  }

  // Fill form
  const nameInput  = document.getElementById('profileName');
  const emailInput = document.getElementById('profileEmail');
  if (nameInput)  nameInput.value  = user.name;
  if (emailInput) emailInput.value = user.email;

  // Staff stall section
  if (user.role === 'staff') {
    const stallSection = document.getElementById('stallSection');
    if (stallSection) stallSection.style.display = 'block';

    // Mark current stall
    const radios = document.querySelectorAll('input[name="profileStall"]');
    radios.forEach(r => {
      r.checked = (r.value === user.stall);
      r.closest('.stall-sel-option').classList.toggle('active', r.value === user.stall);
      r.addEventListener('change', () => {
        document.querySelectorAll('.stall-sel-option').forEach(el => el.classList.remove('active'));
        r.closest('.stall-sel-option').classList.add('active');
      });
    });
  }
}

function saveProfile(e) {
  e.preventDefault();
  const errorEl = document.getElementById('profileSaveError');
  if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }

  const session = AuthStore.getSession();
  if (!session) return;

  const newName  = document.getElementById('profileName')?.value.trim();
  const newEmail = document.getElementById('profileEmail')?.value.trim().toLowerCase();

  if (!newName)  { showFieldError('profileSaveError', 'Name cannot be empty.'); return; }
  if (!newEmail) { showFieldError('profileSaveError', 'Email cannot be empty.'); return; }

  // Check email uniqueness (allow same email as self)
  const existing = AuthStore.findByEmail(newEmail);
  if (existing && existing.id !== session.userId) {
    showFieldError('profileSaveError', 'That email is already in use by another account.'); return;
  }

  const user = AuthStore.findById(session.userId);
  if (!user) return;

  user.name  = newName;
  user.email = newEmail;

  // Staff: update stall
  if (user.role === 'staff') {
    const selectedStall = document.querySelector('input[name="profileStall"]:checked')?.value;
    if (selectedStall) {
      user.stall     = selectedStall;
      user.stallName = STALL_NAMES[selectedStall] || '';
    }
  }

  AuthStore.saveUser(user);

  // Update session
  AuthStore.setSession(user, session.remember);

  // Update avatar + display
  const initials = user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const avatarEl = document.getElementById('profileAvatarBig');
  if (avatarEl) avatarEl.textContent = initials;
  const nameEl = document.getElementById('profileNameDisplay');
  if (nameEl) nameEl.textContent = user.name;
  const roleEl = document.getElementById('profileRoleDisplay');
  if (roleEl) {
    roleEl.textContent = user.role === 'staff'
      ? `👨‍🍳 Stall Staff · ${user.stallName}`
      : '🎒 Student';
  }

  renderNavSession();
  showToast('Profile updated! ✅');
}

function changePassword(e) {
  e.preventDefault();
  const errEl = document.getElementById('pwChangeError');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

  const currentPw = document.getElementById('currentPw')?.value;
  const newPw     = document.getElementById('newPw')?.value;
  const confirmPw = document.getElementById('confirmPw')?.value;

  const session = AuthStore.getSession();
  if (!session) return;
  const user = AuthStore.findById(session.userId);
  if (!user) return;

  if (user.password !== hashPassword(currentPw)) {
    showFieldError('pwChangeError', 'Current password is incorrect.'); return;
  }
  if (newPw.length < 6) {
    showFieldError('pwChangeError', 'New password must be at least 6 characters.'); return;
  }
  if (newPw !== confirmPw) {
    showFieldError('pwChangeError', 'New passwords do not match.'); return;
  }

  user.password = hashPassword(newPw);
  AuthStore.saveUser(user);

  // Clear inputs
  ['currentPw','newPw','confirmPw'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });

  showToast('Password changed successfully! 🔐');
}

function deleteAccount() {
  if (!confirm('Delete your account permanently? This cannot be undone.')) return;
  const session = AuthStore.getSession();
  if (!session) return;

  const users = AuthStore.getUsers().filter(u => u.id !== session.userId);
  localStorage.setItem('cg_users', JSON.stringify(users));
  AuthStore.clearSession();

  showToast('Account deleted.');
  setTimeout(() => window.location.href = 'auth.html', 1200);
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function showToast(msg) {
  let t = document.getElementById('globalToast');
  if (!t) { t = document.createElement('div'); t.id = 'globalToast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2500);
}
