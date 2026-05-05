import { supabase } from '../supabase.js';
import { showToast } from '../components/toast.js';

let currentTab = 'erstellen';

export function renderTeamSetup() {
  document.getElementById('app').innerHTML = `
    <div class="login-page fade-in">
      <div class="login-card">
        <div class="login-logo">👥</div>
        <h1 class="login-title">Team einrichten</h1>
        <p class="login-subtitle">Erstelle ein neues Team oder tritt einem bestehenden bei.</p>
        <div class="login-tabs">
          <button class="login-tab active" id="tab-erstellen" onclick="switchSetupTab('erstellen')">Team erstellen</button>
          <button class="login-tab" id="tab-beitreten" onclick="switchSetupTab('beitreten')">Team beitreten</button>
        </div>
        <div id="setup-form-wrap"></div>
        <button class="btn btn-setup-logout" style="width:100%;margin-top:12px;background:none;border:none;color:var(--text-muted);font-size:13px;cursor:pointer;padding:8px" onclick="doLogoutFromSetup()">Abmelden</button>
      </div>
    </div>
  `;
  renderSetupForm();
}

function renderSetupForm() {
  const wrap = document.getElementById('setup-form-wrap');
  if (currentTab === 'erstellen') {
    wrap.innerHTML = `
      <div class="form-group">
        <label class="form-label">Teamname</label>
        <input type="text" class="form-input" id="inp-teamname" placeholder="z.B. Team Entwicklung" maxlength="60" />
      </div>
      <div id="setup-error" class="form-error mb-8"></div>
      <button class="btn btn-primary btn-lg" style="width:100%" id="btn-erstellen" onclick="doCreateTeam()">
        Team erstellen →
      </button>
    `;
    document.getElementById('inp-teamname').addEventListener('keydown', e => {
      if (e.key === 'Enter') doCreateTeam();
    });
  } else {
    wrap.innerHTML = `
      <div class="form-group">
        <label class="form-label">Einladungscode</label>
        <input type="text" class="form-input" id="inp-code" placeholder="z.B. a3f9b2c1" maxlength="20"
          style="letter-spacing:0.1em;text-transform:lowercase" />
      </div>
      <div id="setup-error" class="form-error mb-8"></div>
      <button class="btn btn-primary btn-lg" style="width:100%" id="btn-beitreten" onclick="doJoinTeam()">
        Beitreten →
      </button>
    `;
    document.getElementById('inp-code').addEventListener('keydown', e => {
      if (e.key === 'Enter') doJoinTeam();
    });
  }
}

window.switchSetupTab = function(tab) {
  currentTab = tab;
  document.getElementById('tab-erstellen').classList.toggle('active', tab === 'erstellen');
  document.getElementById('tab-beitreten').classList.toggle('active', tab === 'beitreten');
  renderSetupForm();
};

window.doCreateTeam = async function() {
  const name = document.getElementById('inp-teamname').value.trim();
  const errEl = document.getElementById('setup-error');
  const btn   = document.getElementById('btn-erstellen');

  if (!name) { errEl.textContent = 'Bitte einen Teamnamen eingeben.'; return; }

  btn.textContent = 'Wird erstellt…'; btn.disabled = true;

  const { error } = await supabase.rpc('create_team', { p_name: name });

  if (error) {
    errEl.textContent = 'Fehler: ' + error.message;
    btn.textContent = 'Team erstellen →'; btn.disabled = false;
    return;
  }

  showToast('✅ Team erstellt!', 'success');
  window.__profileNeedsRefresh = true;
  setTimeout(() => { window.location.hash = '#/team-manage'; }, 600);
};

window.doLogoutFromSetup = async function() {
  await supabase.auth.signOut();
  // signOut() triggert onAuthStateChange → Router rendert automatisch Login
};

window.doJoinTeam = async function() {
  const code  = document.getElementById('inp-code').value.trim().toLowerCase();
  const errEl = document.getElementById('setup-error');
  const btn   = document.getElementById('btn-beitreten');

  if (!code) { errEl.textContent = 'Bitte den Einladungscode eingeben.'; return; }

  btn.textContent = 'Wird beigetreten…'; btn.disabled = true;

  const { data, error } = await supabase.rpc('join_team_by_code', { p_code: code });

  if (error || data === false) {
    errEl.textContent = 'Ungültiger Code. Bitte prüfe die Eingabe.';
    btn.textContent = 'Beitreten →'; btn.disabled = false;
    return;
  }

  showToast('✅ Team beigetreten!', 'success');
  window.__profileNeedsRefresh = true;
  setTimeout(() => { window.location.hash = '#/dashboard'; }, 600);
};
