import { supabase } from '../supabase.js';
import { showToast } from '../components/toast.js';

let currentTab = 'login';
let forgotSent = false;

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
          <h1 class="login-headline">Deine Büropräsenz.<br><em>Einfach im Griff.</em></h1>
          <p class="login-hero-sub">Eine private Initiative von Konstantin Valasis — entstanden aus dem Wunsch, die eigene Präsenzpflicht unkompliziert zu tracken, ohne ständig Excel-Tabellen zu pflegen.</p>
          <ul class="login-features">
            <li><span class="feat-check">✓</span>Privat entwickelt, extern gehostet — keine Verbindung zu Mercedes</li>
            <li><span class="feat-check">✓</span>Nur für den eigenen Überblick — kein Gedanke daran, andere zu tracken</li>
            <li><span class="feat-check">✓</span>Kein Anspruch, Führungskräfte-Aufgaben zu ersetzen — reine Selbsthilfe</li>
            <li><span class="feat-check">✓</span>Team-Funktion optional: gemeinsam den Überblick behalten, anonym</li>
          </ul>
          <div class="login-resources">
            <div class="preview-label">Ressourcen</div>
            <div class="login-resource-links">
              <a href="/docs/praesentation.html" target="_blank" class="resource-link resource-link-pres">
                <span class="resource-icon">🎯</span>
                <span class="resource-text">
                  <span class="resource-title">Präsentation</span>
                  <span class="resource-sub">Für die Team-Einführung</span>
                </span>
                <span class="resource-arrow">↗</span>
              </a>
              <a href="/docs/schulung.html" target="_blank" class="resource-link resource-link-schulung">
                <span class="resource-icon">📖</span>
                <span class="resource-text">
                  <span class="resource-title">Schulungsunterlage</span>
                  <span class="resource-sub">Schritt-für-Schritt-Guide</span>
                </span>
                <span class="resource-arrow">↗</span>
              </a>
            </div>
          </div>

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
          <a href="#/about" style="display:block;text-align:right;font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;text-decoration:none" onclick="navigate('about')">Über die App</a>
          <div class="login-logo">📊</div>
          <h2 class="login-title">Willkommen zurück</h2>
          <p class="login-subtitle">Melde dich an oder erstelle ein Konto.</p>
          <div class="login-tabs" id="login-tabs">
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
      <div style="text-align:center;margin-top:12px">
        <button type="button" onclick="switchTab('forgot')" style="background:none;border:none;color:var(--text-muted);font-size:0.85rem;cursor:pointer;text-decoration:underline;padding:0">
          Passwort vergessen?
        </button>
      </div>
    `;
    document.getElementById('inp-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  } else if (currentTab === 'forgot') {
    wrap.innerHTML = forgotSent ? `
      <div class="form-success" style="text-align:center;padding:16px 0">
        <div style="font-size:2rem;margin-bottom:8px">📬</div>
        <p style="color:var(--text);margin-bottom:4px">E-Mail verschickt!</p>
        <p style="color:var(--text-muted);font-size:0.875rem">Bitte prüfe dein Postfach und klicke auf den Link, um ein neues Passwort zu setzen.</p>
        <button type="button" onclick="switchTab('login')" style="margin-top:16px;background:none;border:none;color:var(--primary);font-size:0.875rem;cursor:pointer;text-decoration:underline;padding:0">
          Zurück zur Anmeldung
        </button>
      </div>
    ` : `
      <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:16px">Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link zum Zurücksetzen deines Passworts.</p>
      <div class="form-group">
        <label class="form-label">E-Mail</label>
        <input type="email" class="form-input" id="inp-email" placeholder="dein@name.de" autocomplete="email" />
      </div>
      <div id="login-error" class="form-error mb-8"></div>
      <button class="btn btn-primary btn-lg" style="width:100%" id="btn-forgot" onclick="doForgotPassword()">
        Reset-Link anfordern →
      </button>
      <div style="text-align:center;margin-top:12px">
        <button type="button" onclick="switchTab('login')" style="background:none;border:none;color:var(--text-muted);font-size:0.85rem;cursor:pointer;text-decoration:underline;padding:0">
          Zurück zur Anmeldung
        </button>
      </div>
    `;
    if (!forgotSent) {
      document.getElementById('inp-email').addEventListener('keydown', e => { if (e.key === 'Enter') doForgotPassword(); });
    }
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
  if (tab === 'forgot') forgotSent = false;
  const tabs = document.getElementById('login-tabs');
  if (tabs) tabs.style.display = tab === 'forgot' ? 'none' : '';
  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  if (tabLogin)    tabLogin.classList.toggle('active', tab === 'login');
  if (tabRegister) tabRegister.classList.toggle('active', tab === 'register');
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

window.doForgotPassword = async function() {
  const email = document.getElementById('inp-email').value.trim();
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('btn-forgot');

  if (!email) { errEl.textContent = 'Bitte E-Mail-Adresse eingeben.'; return; }

  btn.textContent = 'Wird gesendet…'; btn.disabled = true;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });

  if (error) {
    errEl.textContent = 'Fehler: ' + error.message;
    btn.textContent = 'Reset-Link anfordern →'; btn.disabled = false;
    return;
  }

  forgotSent = true;
  renderLoginForm();
};
