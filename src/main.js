import './style.css';
import { supabase } from './supabase.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderCalendar } from './pages/calendar.js';
import { renderTeam } from './pages/team.js';
import { renderAdmin } from './pages/admin.js';

let currentUser = null;
let currentProfile = null;
let routerRunning = false;

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function router() {
  if (routerRunning) return;
  routerRunning = true;
  try {
    const hash = window.location.hash.replace('#/', '') || 'dashboard';

    if (!currentUser) {
      renderLogin();
      return;
    }

    if (!currentProfile) {
      currentProfile = await getProfile(currentUser.id);
      if (!currentProfile) {
        renderLogin();
        return;
      }
    }

    const routes = {
      dashboard: () => renderDashboard(currentProfile),
      calendar:  () => renderCalendar(currentProfile),
      team:      () => renderTeam(currentProfile),
      admin:     () => renderAdmin(currentProfile),
    };

    const render = routes[hash] || routes['dashboard'];
    await render();
  } catch (err) {
    console.error('Router-Fehler:', err);
    document.getElementById('app').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px">
        <p style="color:var(--text-muted)">Seite konnte nicht geladen werden. Bitte neu laden.</p>
        <button onclick="location.reload()" style="padding:8px 20px;border-radius:8px;border:none;background:var(--primary);color:#fff;cursor:pointer">Neu laden</button>
      </div>`;
  } finally {
    routerRunning = false;
  }
}

supabase.auth.onAuthStateChange(async (event, session) => {
  // INITIAL_SESSION wird unten via getSession() behandelt — kein doppelter Aufruf
  if (event === 'INITIAL_SESSION') return;

  // Token-Erneuerung transparent im Hintergrund — kein Re-Render nötig
  if (event === 'TOKEN_REFRESHED') {
    currentUser = session?.user ?? null;
    return;
  }

  currentUser    = session?.user ?? null;
  currentProfile = null;
  await router();
});

window.addEventListener('hashchange', router);

// Einmaliger Start-Check
const { data: { session } } = await supabase.auth.getSession();
currentUser = session?.user ?? null;
await router();
