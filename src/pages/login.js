import { supabase } from '../supabase.js';
import { showToast } from '../components/toast.js';

let currentTab = 'login';

export function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-page fade-in">
      <div class="login-card">
        <div class="login-logo">📊</div>
        <h1 class="login-title">Anwesenheits&shy;rechner</h1>
        <p class="login-subtitle">Tracke deine 50%-Präsenzpflicht – einfach & datenschutzfreundlich</p>
        <div class="login-tabs">
          <button class="login-tab active" id="tab-login" onclick="switchTab('login')">Anmelden</button>
          <button class="login-tab" id="tab-register" onclick="switchTab('register')">Registrieren</button>
        </div>
        <div id="login-form-wrap"></div>
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
