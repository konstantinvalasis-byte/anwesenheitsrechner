import './style.css';
import { supabase } from './supabase.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderCalendar } from './pages/calendar.js';
import { renderTeam } from './pages/team.js';
import { renderAdmin } from './pages/admin.js';

// Sofort Lade-Indikator — #app bleibt nie leer
document.getElementById('app').innerHTML =
  '<div class="loader-wrap" style="height:100vh"><div class="loader"></div></div>';

let currentUser = null;
let currentProfile = null;
let renderSeq = 0;
let authReady = false;

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function router() {
  const seq = ++renderSeq;

  try {
    const hash = window.location.hash.replace('#/', '') || 'dashboard';

    if (!currentUser) {
      renderLogin();
      return;
    }

    if (!currentProfile) {
      const profile = await getProfile(currentUser.id);
      if (seq !== renderSeq) return;
      if (!profile) { renderLogin(); return; }
      currentProfile = profile;
    }

    if (seq !== renderSeq) return;

    const routes = {
      dashboard: () => renderDashboard(currentProfile),
      calendar:  () => renderCalendar(currentProfile),
      team:      () => renderTeam(currentProfile),
      admin:     () => renderAdmin(currentProfile),
    };

    await (routes[hash] || routes['dashboard'])();
  } catch (err) {
    if (seq !== renderSeq) return;
    console.error('[Router] Fehler:', err);
    document.getElementById('app').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px">
        <p style="color:var(--text-muted)">Seite konnte nicht geladen werden. Bitte neu laden.</p>
        <button onclick="location.reload()" style="padding:8px 20px;border-radius:8px;border:none;background:var(--primary);color:#fff;cursor:pointer">Neu laden</button>
      </div>`;
  }
}

supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('[Auth]', event, session?.user?.email ?? 'kein Nutzer');

  if (event === 'TOKEN_REFRESHED') {
    currentUser = session?.user ?? null;
    return;
  }

  authReady = true;
  currentUser    = session?.user ?? null;
  currentProfile = null;
  await router();
});

window.addEventListener('hashchange', router);

// Fallback: falls onAuthStateChange nicht feuert (z.B. Browser-Cache-Problem),
// holen wir die Session manuell nach 300ms
setTimeout(async () => {
  if (authReady) return;
  console.warn('[Auth] onAuthStateChange nicht gefeuert — manueller Fallback via getSession()');
  const { data: { session } } = await supabase.auth.getSession();
  if (authReady) return; // inzwischen doch gefeuert
  currentUser = session?.user ?? null;
  await router();
}, 300);
