import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';

export async function renderTeamManage(profile) {
  if (profile.role !== 'ersteller') {
    window.location.hash = '#/dashboard';
    return;
  }

  const [{ data: team, error }, { data: members, error: membersError }] = await Promise.all([
    supabase.from('teams').select('name, invite_code').eq('id', profile.team_id).single(),
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
