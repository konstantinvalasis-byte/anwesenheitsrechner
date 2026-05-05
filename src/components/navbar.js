import { supabase } from '../supabase.js';
import { showToast } from './toast.js';

export function renderNavbar(profile, activePage) {
  const isErsteller = profile?.role === 'ersteller';
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
      ${isErsteller ? `<button class="navbar-admin-btn ${activePage==='team-manage'?'active':''}" onclick="navigate('team-manage')" title="Team verwalten">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
    ${isErsteller ? `<button class="bottom-nav-btn bottom-nav-admin ${activePage==='team-manage'?'active':''}" onclick="navigate('team-manage')" title="Team verwalten">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
