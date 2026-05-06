import { supabase } from '../supabase.js';
import { showToast } from '../components/toast.js';

let currentTab = 'login';

export function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-page fade-in">

      <!-- ── Left: Hero ── -->
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
          <h1 class="login-headline">Deine Büropräsenz.<br><em>Immer im Blick.</em></h1>
          <p class="login-hero-sub">Tracke deine 50%-Präsenzpflicht automatisch – ohne Excel, ohne Aufwand, DSGVO-konform.</p>
          <ul class="login-features">
            <li><span class="feat-check">✓</span>Automatische Feiertage &amp; Schulferien (BW)</li>
            <li><span class="feat-check">✓</span>Echtzeit-Fortschritt mit Monats-Prognose</li>
            <li><span class="feat-check">✓</span>Anonyme Team-Übersicht ohne Datenschutzrisiko</li>
            <li><span class="feat-check">✓</span>Teilzeit &amp; individuelle Arbeitstage unterstützt</li>
          </ul>
          <div class="login-preview">
            <div class="preview-label">Live-Vorschau</div>
            <div class="preview-card">
              <div class="preview-ring-wrap">
                <svg viewBox="0 0 80 80" class="preview-ring">
                  <circle cx="40" cy="40" r="30" stroke="rgba(255,255,255,0.07)" stroke-width="7" fill="none"/>
                  <circle cx="40" cy="40" r="30" stroke="url(#previewGrad)" stroke-width="7" fill="none"
                    stroke-dasharray="188.5" stroke-dashoffset="84.8"
                    stroke-linecap="round" transform="rotate(-90 40 40)" class="preview-ring-fill"/>
                  <defs>
                    <linearGradient id="previewGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#6366f1"/>
                      <stop offset="100%" stop-color="#10b981"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div class="preview-ring-pct">55%</div>
              </div>
              <div class="preview-stats">
                <div class="preview-stat">
                  <span class="ps-num">11</span>
                  <span class="ps-lbl">Bürotage</span>
                </div>
                <div class="preview-stat">
                  <span class="ps-num">20</span>
                  <span class="ps-lbl">Netto-AT</span>
                </div>
                <div class="preview-stat ps-ok">
                  <span class="ps-num ps-check">✓</span>
                  <span class="ps-lbl">Ziel erfüllt</span>
                </div>
              </div>
              <div class="preview-badge">MTD · Mai 2025</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Right: Login Form ── -->
      <div class="login-form-panel">
        <div class="login-card">
          <div class="login-logo">📊</div>
          <h2 class="login-title">Willkommen zurück</h2>
          <p class="login-subtitle">Melde dich an oder erstelle ein Konto.</p>
          <div class="login-tabs">
            <button class="login-tab active" id="tab-login" onclick="switchTab('login')">Anmelden</button>
            <button class="login-tab" id="tab-register" onclick="switchTab('register')">Registrieren</button>
          </div>
          <div id="login-form-wrap"></div>
        </div>
      </div>

    </div>
  `;
  renderLoginForm();
}

function renderLoginForm() {
  const wrap = document.getElementById('login-form-wrap');
  if (currentTab === 'login') {
    wrap.innerHTML = `
      <div class="form-group">
        <label class="form-label">E-Mail</label>
        <input type="email" class="form-input" id="inp-email" placeholder="dein@name.de" autocomplete="email" />
      </div>
      <div class="form-group">
        <label class="form-label">Passwort</label>
        <input type="password" class="form-input" id="inp-pass" placeholder="••••••••" autocomplete="current-password" />
      </div>
      <div id="login-error" class="form-error mb-8"></div>
      <button class="btn btn-primary btn-lg" style="width:100%" id="btn-login" onclick="doLogin()">
        Anmelden →
      </button>
    `;
    document.getElementById('inp-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  } else {
    wrap.innerHTML = `
      <div class="form-group">
        <label class="form-label">Vollständiger Name</label>
        <input type="text" class="form-input" id="inp-name" placeholder="Max Mustermann" />
      </div>
      <div class="form-group">
        <label class="form-label">E-Mail</label>
        <input type="email" class="form-input" id="inp-email" placeholder="dein@name.de" autocomplete="email" />
      </div>
      <div class="form-group">
        <label class="form-label">Passwort</label>
        <input type="password" class="form-input" id="inp-pass" placeholder="Mindestens 6 Zeichen" autocomplete="new-password" />
      </div>
      <div id="login-error" class="form-error mb-8"></div>
      <button class="btn btn-primary btn-lg" style="width:100%" id="btn-register" onclick="doRegister()">
        Konto erstellen →
      </button>
    `;
  }
}

window.switchTab = function(tab) {
  currentTab = tab;
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  renderLoginForm();
};

window.doLogin = async function() {
  const email = document.getElementById('inp-email').value.trim();
  const pass  = document.getElementById('inp-pass').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('btn-login');

  if (!email || !pass) { errEl.textContent = 'Bitte E-Mail und Passwort eingeben.'; return; }

  btn.textContent = 'Wird angemeldet…'; btn.disabled = true;
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    errEl.textContent = 'Anmeldung fehlgeschlagen: ' + (error.message === 'Invalid login credentials' ? 'Falsche E-Mail oder Passwort.' : error.message);
    btn.textContent = 'Anmelden →'; btn.disabled = false;
  }
  // Auth state change triggers router
};

window.doRegister = async function() {
  const name  = document.getElementById('inp-name').value.trim();
  const email = document.getElementById('inp-email').value.trim();
  const pass  = document.getElementById('inp-pass').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('btn-register');

  if (!name || !email || !pass) { errEl.textContent = 'Bitte alle Felder ausfüllen.'; return; }
  if (pass.length < 6) { errEl.textContent = 'Passwort muss mindestens 6 Zeichen haben.'; return; }

  btn.textContent = 'Wird erstellt…'; btn.disabled = true;

  const { error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: { data: { name } },
  });
  if (error) {
    errEl.textContent = 'Fehler: ' + error.message;
    btn.textContent = 'Konto erstellen →'; btn.disabled = false;
    return;
  }

  showToast('✅ Konto erstellt! Du kannst dich jetzt anmelden.', 'success');
  setTimeout(() => window.switchTab('login'), 1500);
};
