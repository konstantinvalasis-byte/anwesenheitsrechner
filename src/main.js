import './style.css';
import { supabase } from './supabase.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderCalendar } from './pages/calendar.js';
import { renderTeam } from './pages/team.js';
import { renderSettings } from './pages/settings.js';
import { renderTeamSetup } from './pages/team-setup.js';
import { renderTeamManage } from './pages/team-manage.js';
import { renderAbout } from './pages/about.js';
import { showToast } from './components/toast.js';

function renderPasswordResetForm() {
  document.getElementById('app').innerHTML = `
    <div class="login-page fade-in">
      <div class="login-hero">
        <div class="login-hero-bg">
          <div class="hero-orb hero-orb-1"></div>
          <div class="hero-orb hero-orb-2"></div>
          <div class="hero-grid"></div>
        </div>
        <div class="login-hero-content">
          <div class="login-brand">
            <div class="login-logo-sm">📊</div>
            <span class="login-brand-name">Anwesenheitsrechner</span>
          </div>
          <h1 class="login-headline">Neues Passwort<br><em>setzen.</em></h1>
        </div>
      </div>
      <div class="login-form-panel">
        <div class="login-card">
          <div class="login-logo">🔒</div>
          <h2 class="login-title">Neues Passwort</h2>
          <p class="login-subtitle">Wähle ein neues Passwort für dein Konto.</p>
          <div class="form-group">
            <label class="form-label">Neues Passwort</label>
            <input type="password" class="form-input" id="inp-new-pass" placeholder="Mindestens 6 Zeichen" autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label class="form-label">Passwort bestätigen</label>
            <input type="password" class="form-input" id="inp-new-pass2" placeholder="••••••••" autocomplete="new-password" />
          </div>
          <div id="reset-error" class="form-error mb-8"></div>
          <button class="btn btn-primary btn-lg" style="width:100%" id="btn-reset" onclick="doSetNewPassword()">
            Passwort speichern →
          </button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('inp-new-pass2').addEventListener('keydown', e => { if (e.key === 'Enter') window.doSetNewPassword(); });
}

window.doSetNewPassword = async function() {
  const pass  = document.getElementById('inp-new-pass').value;
  const pass2 = document.getElementById('inp-new-pass2').value;
  const errEl = document.getElementById('reset-error');
  const btn   = document.getElementById('btn-reset');

  if (!pass || !pass2) { errEl.textContent = 'Bitte beide Felder ausfüllen.'; return; }
  if (pass.length < 6) { errEl.textContent = 'Passwort muss mindestens 6 Zeichen haben.'; return; }
  if (pass !== pass2)  { errEl.textContent = 'Passwörter stimmen nicht überein.'; return; }

  btn.textContent = 'Wird gespeichert…'; btn.disabled = true;

  const { error } = await supabase.auth.updateUser({ password: pass });
  if (error) {
    errEl.textContent = 'Fehler: ' + error.message;
    btn.textContent = 'Passwort speichern →'; btn.disabled = false;
    return;
  }

  showToast('✅ Passwort erfolgreich geändert!', 'success');
  currentProfile = null;
  window.location.hash = '#/dashboard';
};

// Sofort Lade-Indikator — #app bleibt nie leer
document.getElementById('app').innerHTML =
  '<div class="loader-wrap" style="height:100vh"><div class="loader"></div></div>';

let currentUser = null;
let currentProfile = null;
let renderSeq = 0;
let authReady = false;

async function getProfile(userId) {
  const result = await Promise.race([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('getProfile Timeout')), 8000)),
  ]);
  return result?.data ?? null;
}

async function router() {
  const seq = ++renderSeq;

  try {
    const hash = window.location.hash.replace('#/', '') || 'dashboard';

    if (hash === 'about') {
      renderAbout(currentProfile);
      return;
    }

    if (!currentUser) {
      renderLogin();
      return;
    }

    if (!currentProfile || window.__profileNeedsRefresh) {
      window.__profileNeedsRefresh = false;
      const profile = await getProfile(currentUser.id);
      if (seq !== renderSeq) return;
      if (!profile) { renderLogin(); return; }
      currentProfile = profile;
    }

    if (seq !== renderSeq) return;

    // Neuer User ohne Team → zum Onboarding
    if (!currentProfile.team_id && hash !== 'team-setup') {
      window.location.hash = '#/team-setup';
      return;
    }

    const routes = {
      dashboard:     () => renderDashboard(currentProfile),
      calendar:      () => renderCalendar(currentProfile),
      team:          () => renderTeam(currentProfile),
      settings:      () => renderSettings(currentProfile),
      'team-setup':  () => renderTeamSetup(currentProfile),
      'team-manage': () => renderTeamManage(currentProfile),
      about:         () => renderAbout(currentProfile),
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
  if (event === 'TOKEN_REFRESHED') {
    currentUser = session?.user ?? null;
    return;
  }

  if (event === 'PASSWORD_RECOVERY') {
    authReady = true;
    currentUser = session?.user ?? null;
    renderPasswordResetForm();
    return;
  }

  // SIGNED_IN = echter Login ODER automatischer Token-Refresh (_recoverAndRefresh)
  // Token-Refresh erkennen: noch vor INITIAL_SESSION (!authReady) ODER Session war bereits aktiv (currentUser gesetzt)
  if (event === 'SIGNED_IN' && (!authReady || currentUser)) {
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
