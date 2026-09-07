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
        <button class="btn btn-setup-logout" style="width:100%;margin-top:4px;background:none;border:none;color:var(--text-muted);font-size:13px;cursor:pointer;padding:8px" onclick="navigate('dashboard')">Später entscheiden</button>
        <button class="btn btn-setup-logout" style="width:100%;margin-top:0;background:none;border:none;color:var(--text-muted);font-size:13px;cursor:pointer;padding:8px" onclick="doLogoutFromSetup()">Abmelden</button>
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
      <div class="form-group">
        <label class="form-label">Anwesenheitsquote</label>
        <div style="display:flex;gap:8px">
          ${[40,50,60].map(v => `
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:all .15s" id="lbl-target-${v}">
              <input type="radio" name="presence-target" value="${v}" ${v===50?'checked':''} style="display:none" onchange="highlightTargetLabel()">
              ${v}%
            </label>`).join('')}
          <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:all .15s" id="lbl-target-custom">
            <input type="radio" name="presence-target" value="custom" style="display:none" onchange="highlightTargetLabel()">
            Individuell
          </label>
        </div>
        <div id="custom-target-wrap" style="display:none;margin-top:8px">
          <input type="number" id="inp-custom-target" class="form-input" min="1" max="100" placeholder="z.B. 45" style="text-align:center" />
        </div>
      </div>
      <div id="setup-error" class="form-error mb-8"></div>
      <button class="btn btn-primary btn-lg" style="width:100%" id="btn-erstellen" onclick="doCreateTeam()">
        Team erstellen →
      </button>
    `;
    document.getElementById('inp-teamname').addEventListener('keydown', e => {
      if (e.key === 'Enter') doCreateTeam();
    });
    highlightTargetLabel();
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

window.highlightTargetLabel = function() {
  const allKeys = [40, 50, 60, 'custom'];
  allKeys.forEach(v => {
    const lbl = document.getElementById(`lbl-target-${v}`);
    if (!lbl) return;
    const checked = lbl.querySelector('input').checked;
    lbl.style.borderColor = checked ? 'var(--primary)' : 'var(--border)';
    lbl.style.background  = checked ? 'rgba(99,102,241,0.08)' : '';
    lbl.style.color       = checked ? 'var(--primary)' : '';
  });
  const customChecked = document.querySelector('input[name="presence-target"][value="custom"]')?.checked;
  const wrap = document.getElementById('custom-target-wrap');
  if (wrap) wrap.style.display = customChecked ? 'block' : 'none';
};

window.doCreateTeam = async function() {
  const name   = document.getElementById('inp-teamname').value.trim();
  const errEl  = document.getElementById('setup-error');
  const btn    = document.getElementById('btn-erstellen');
  const selectedVal = document.querySelector('input[name="presence-target"]:checked')?.value || '50';
  const rawTarget = selectedVal === 'custom'
    ? parseInt(document.getElementById('inp-custom-target')?.value || '50')
    : parseInt(selectedVal);
  if (isNaN(rawTarget) || rawTarget < 1 || rawTarget > 100) {
    errEl.textContent = 'Bitte eine gültige Quote zwischen 1 und 100 eingeben.';
    return;
  }
  const target = rawTarget / 100;

  if (!name) { errEl.textContent = 'Bitte einen Teamnamen eingeben.'; return; }

  btn.textContent = 'Wird erstellt…'; btn.disabled = true;

  const { error } = await supabase.rpc('create_team', { p_name: name, p_target: target });

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
