import './style.css';
import { supabase } from './supabase.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderCalendar } from './pages/calendar.js';
import { renderTeam } from './pages/team.js';
import { renderAdmin } from './pages/admin.js';

let currentUser = null;
let currentProfile = null;

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function router() {
  const hash = window.location.hash.replace('#/', '') || 'dashboard';

  if (!currentUser) {
    renderLogin();
    return;
  }

  if (!currentProfile) {
    currentProfile = await getProfile(currentUser.id);
    if (!currentProfile) {
      // Profile might not exist yet (email not confirmed / race condition)
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
}

// Auth state change listener
supabase.auth.onAuthStateChange(async (_event, session) => {
  currentUser    = session?.user ?? null;
  currentProfile = null; // reset on auth change
  await router();
});

// Hash-based routing
window.addEventListener('hashchange', router);

// Initial check
const { data: { session } } = await supabase.auth.getSession();
currentUser = session?.user ?? null;
await router();
