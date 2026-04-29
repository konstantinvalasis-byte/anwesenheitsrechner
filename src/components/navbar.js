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
    </nav>
    <div class="navbar-actions">
      <div class="user-badge" onclick="navigate('settings')" style="cursor:pointer" title="Einstellungen">
        <div class="avatar">${initials}</div>
        <span>${profile?.name || 'Benutzer'}</span>
      </div>
      ${isAdmin ? `<button class="navbar-admin-btn ${activePage==='admin'?'active':''}" onclick="navigate('admin')" title="Adminbereich">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>` : ''}
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
      <span class="nav-icon">🏠</span><span class="nav-label">Dashboard</span>
    </button>
    <button class="bottom-nav-btn ${activePage==='calendar'?'active':''}" onclick="navigate('calendar')">
      <span class="nav-icon">📅</span><span class="nav-label">Kalender</span>
    </button>
    <button class="bottom-nav-btn ${activePage==='team'?'active':''}" onclick="navigate('team')">
      <span class="nav-icon">👥</span><span class="nav-label">Team</span>
    </button>
    <button class="bottom-nav-btn ${activePage==='settings'?'active':''}" onclick="navigate('settings')">
      <span class="nav-icon">⚙️</span><span class="nav-label">Einstellungen</span>
    </button>
    <button class="bottom-nav-btn" onclick="doLogout()">
      <span class="nav-icon">🚪</span><span class="nav-label">Abmelden</span>
    </button>
    ${isAdmin ? `<button class="bottom-nav-btn bottom-nav-admin ${activePage==='admin'?'active':''}" onclick="navigate('admin')" title="Adminbereich">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </button>` : ''}
  `;
}

window.navigate = function(page) {
  window.location.hash = '#/' + page;
};

window.doLogout = async function() {
  await supabase.auth.signOut();
  showToast('👋 Erfolgreich abgemeldet.', 'info');
};
