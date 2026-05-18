import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';

let _teamId = null;

export async function renderTeamManage(profile) {
  _teamId = profile.team_id;
  if (profile.role !== 'ersteller') {
    window.location.hash = '#/dashboard';
    return;
  }

  const [{ data: team, error }, { data: members, error: membersError }] = await Promise.all([
    supabase.from('teams').select('name, invite_code, presence_target').eq('id', profile.team_id).single(),
    supabase.rpc('get_team_members'),
  ]);

  if (membersError) console.error('[TeamManage] Mitglieder konnten nicht geladen werden:', membersError);
  const memberList = members || [];

  document.getElementById('app').innerHTML = `
    <div id="navbar" class="navbar"></div>
    <div class="page fade-in">
      <div class="container" style="max-width:520px">
        <div class="page-header">
          <h1 class="page-title">Team verwalten</h1>
          <p class="page-subtitle">${error || !team ? 'Team konnte nicht geladen werden.' : escapeHtml(team.name)}</p>
        </div>

        ${error || !team ? '' : `
        <div class="card" style="margin-bottom:16px">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:6px">Einladungscode</h3>
          <p class="text-muted text-sm" style="margin-bottom:16px">
            Teile diesen Code mit Personen, die deinem Team beitreten sollen.
          </p>
          <div style="display:flex;align-items:center;gap:12px">
            <div style="
              flex:1;
              background:var(--bg-secondary);
              border:1px solid var(--border);
              border-radius:10px;
              padding:14px 18px;
              font-size:22px;
              font-weight:700;
              letter-spacing:0.15em;
              color:var(--text-primary);
              font-family:monospace;
            ">${escapeHtml(team.invite_code)}</div>
            <button class="btn btn-primary" onclick="copyInviteCode('${escapeHtml(team.invite_code)}')" style="white-space:nowrap">
              Kopieren
            </button>
          </div>
        </div>

        <div class="card" style="margin-bottom:16px">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:6px">Anwesenheitsquote</h3>
          <p class="text-muted text-sm" style="margin-bottom:16px">
            Legt fest, wie viele Bürotage pro Monat für alle Teammitglieder erforderlich sind.
          </p>
          <div style="display:flex;gap:8px;margin-bottom:16px">
            ${(() => {
              const current = Math.round((team.presence_target || 0.5) * 100);
              const isCustom = ![40,50,60].includes(current);
              return [40,50,60].map(v => `
                <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid ${current===v?'var(--primary)':'var(--border)'};border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:all .15s;background:${current===v?'rgba(99,102,241,0.08)':''};color:${current===v?'var(--primary)':''}" id="lbl-manage-target-${v}">
                  <input type="radio" name="manage-presence-target" value="${v}" ${current===v?'checked':''} style="display:none" onchange="highlightManageTargetLabel()">
                  ${v}%
                </label>`).join('') + `
                <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid ${isCustom?'var(--primary)':'var(--border)'};border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:all .15s;background:${isCustom?'rgba(99,102,241,0.08)':''};color:${isCustom?'var(--primary)':''}" id="lbl-manage-target-custom">
                  <input type="radio" name="manage-presence-target" value="custom" ${isCustom?'checked':''} style="display:none" onchange="highlightManageTargetLabel()">
                  Individuell
                </label>`;
            })()}
          </div>
          <div id="manage-custom-target-wrap" style="display:${![40,50,60].includes(Math.round((team.presence_target||0.5)*100))?'block':'none'};margin-bottom:16px">
            <input type="number" id="inp-manage-custom-target" class="form-input" min="1" max="100" value="${![40,50,60].includes(Math.round((team.presence_target||0.5)*100))?Math.round((team.presence_target||0.5)*100):''}" placeholder="z.B. 45" style="text-align:center" />
          </div>
          <div id="manage-target-error" class="form-error mb-8"></div>
          <button class="btn btn-primary" style="width:100%" onclick="savePresenceTarget()">Speichern</button>
        </div>

        <div class="card">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:6px">Teammitglieder</h3>
          <p class="text-muted text-sm" style="margin-bottom:16px">${memberList.length} ${memberList.length === 1 ? 'Person' : 'Personen'} im Team</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${memberList.map(m => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-secondary);border-radius:8px;">
                <span style="font-size:14px;font-weight:500;color:var(--text-primary)">${escapeHtml(m.name)}</span>
                <span style="font-size:12px;color:var(--text-muted);background:var(--bg-primary);border:1px solid var(--border);border-radius:20px;padding:2px 10px">${m.role === 'ersteller' ? 'Ersteller' : 'Mitglied'}</span>
              </div>`).join('')}
          </div>
        </div>
        `}
      </div>
    </div>
  `;

  renderNavbar(profile, 'team-manage');
}

window.highlightManageTargetLabel = function() {
  [40, 50, 60, 'custom'].forEach(v => {
    const lbl = document.getElementById(`lbl-manage-target-${v}`);
    if (!lbl) return;
    const checked = lbl.querySelector('input').checked;
    lbl.style.borderColor = checked ? 'var(--primary)' : 'var(--border)';
    lbl.style.background  = checked ? 'rgba(99,102,241,0.08)' : '';
    lbl.style.color       = checked ? 'var(--primary)' : '';
  });
  const customChecked = document.querySelector('input[name="manage-presence-target"][value="custom"]')?.checked;
  const wrap = document.getElementById('manage-custom-target-wrap');
  if (wrap) wrap.style.display = customChecked ? 'block' : 'none';
};

window.savePresenceTarget = async function() {
  const errEl  = document.getElementById('manage-target-error');
  const btn    = document.querySelector('[onclick="savePresenceTarget()"]');
  const selectedVal = document.querySelector('input[name="manage-presence-target"]:checked')?.value || '50';
  const rawTarget = selectedVal === 'custom'
    ? parseInt(document.getElementById('inp-manage-custom-target')?.value || '50')
    : parseInt(selectedVal);
  if (isNaN(rawTarget) || rawTarget < 1 || rawTarget > 100) {
    errEl.textContent = 'Bitte eine gültige Quote zwischen 1 und 100 eingeben.';
    btn.textContent = 'Speichern'; btn.disabled = false;
    return;
  }
  const target = rawTarget / 100;

  btn.textContent = 'Wird gespeichert…'; btn.disabled = true;

  const { error } = await supabase
    .from('teams')
    .update({ presence_target: target })
    .eq('id', _teamId);

  if (error) {
    errEl.textContent = 'Fehler beim Speichern: ' + error.message;
    btn.textContent = 'Speichern'; btn.disabled = false;
    return;
  }

  showToast('✅ Quote gespeichert!', 'success');
  btn.textContent = 'Speichern'; btn.disabled = false;
};

window.copyInviteCode = async function(code) {
  try {
    await navigator.clipboard.writeText(code);
    showToast('✅ Code kopiert!', 'success');
  } catch {
    showToast('Code: ' + code, 'info');
  }
};

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
