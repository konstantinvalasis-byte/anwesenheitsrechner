import { supabase } from '../supabase.js';
import { showToast } from './toast.js';

export function renderNavbar(profile, activePage) {
  const isAdmin = profile?.is_admin;
  const initials = (profile?.name || 'U').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  const navEl = document.getElementById('navbar');
  if (!navEl) return;

  navEl.innerHTML = `
    <a class="navbar-brand" href="#/dashboard">
      <div class="logo">📊</div>
      Anwesenheit
    </a>
    <nav class="navbar-nav">
      <button class="nav-link ${activePage==='dashboard'?'active':''}" onclick="navigate('dashboard')">🏠 Dashboard</button>
      <button class="nav-link ${activePage==='calendar'?'active':''}" onclick="navigate('calendar')">📅 Kalender</button>
      <button class="nav-link ${activePage==='team'?'active':''}" onclick="navigate('team')">👥 Team</button>
      ${isAdmin ? `<button class="nav-link ${activePage==='admin'?'active':''}" onclick="navigate('admin')">⚙️ Admin</button>` : ''}
    </nav>
    <div class="navbar-actions">
      <div class="user-badge">
        <div class="avatar">${initials}</div>
        <span>${profile?.name || 'Benutzer'}</span>
      </div>
      <button class="btn btn-ghost btn-sm" id="btn-logout" onclick="doLogout()">Abmelden</button>
    </div>
  `;

  // Bottom-Nav für Mobile
  let bottomNav = document.getElementById('bottom-nav');
  if (!bottomNav) {
    bottomNav = document.createElement('nav');
    bottomNav.id = 'bottom-nav';
    bottomNav.className = 'bottom-nav';
    document.body.appendChild(bottomNav);
  }
  bottomNav.innerHTML = `
    <button class="bottom-nav-btn ${activePage==='dashboard'?'active':''}" onclick="navigate('dashboard')">
      <span class="nav-icon">🏠</span>Dashboard
    </button>
    <button class="bottom-nav-btn ${activePage==='calendar'?'active':''}" onclick="navigate('calendar')">
      <span class="nav-icon">📅</span>Kalender
    </button>
    <button class="bottom-nav-btn ${activePage==='team'?'active':''}" onclick="navigate('team')">
      <span class="nav-icon">👥</span>Team
    </button>
    ${isAdmin ? `<button class="bottom-nav-btn ${activePage==='admin'?'active':''}" onclick="navigate('admin')">
      <span class="nav-icon">⚙️</span>Admin
    </button>` : ''}
    <button class="bottom-nav-btn" onclick="doLogout()">
      <span class="nav-icon">🚪</span>Abmelden
    </button>
  `;
}

window.navigate = function(page) {
  window.location.hash = '#/' + page;
};

window.doLogout = async function() {
  await supabase.auth.signOut();
  showToast('👋 Erfolgreich abgemeldet.', 'info');
};
