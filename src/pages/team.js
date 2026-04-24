import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { calculateMonthStats } from '../calculator.js';
import { getMonthState, setMonthState } from '../monthState.js';

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

let currentYear, currentMonth;
let profile = null;

export async function renderTeam(prof) {
  profile = prof;
  ({ year: currentYear, month: currentMonth } = getMonthState());
  document.getElementById('app').innerHTML = `
    <div id="navbar" class="navbar"></div>
    <div class="page fade-in">
      <div class="container">
        <div class="page-header flex-between">
          <div>
            <h1 class="page-title">👥 Team-Übersicht</h1>
            <p class="page-subtitle">Anonyme Team-Statistiken – keine individuellen Daten sichtbar</p>
          </div>
          <div class="month-selector">
            <button class="month-btn" id="btn-prev">‹</button>
            <span class="month-display" id="month-display"></span>
            <button class="month-btn" id="btn-next">›</button>
          </div>
        </div>
        <div id="team-content"><div class="loader-wrap"><div class="loader"></div></div></div>
      </div>
    </div>
  `;
  renderNavbar(profile, 'team');
  document.getElementById('btn-prev').onclick = () => { currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} setMonthState(currentYear, currentMonth); loadTeam(); };
  document.getElementById('btn-next').onclick = () => { currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} setMonthState(currentYear, currentMonth); loadTeam(); };
  await loadTeam();
}

async function loadTeam() {
  document.getElementById('month-display').textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  // Get team stats via RPC function
  const { data: statsData, error } = await supabase.rpc('get_team_stats', {
    p_year: currentYear, p_month: currentMonth + 1
  });

  // Get member count
  const { count: memberCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

  // Get per-member anonymous percentages
  const { data: perMember } = await supabase.rpc('get_team_member_percentages', {
    p_year: currentYear, p_month: currentMonth + 1
  });

  if (error) {
    document.getElementById('team-content').innerHTML = `
      <div class="alert alert-warning">⚠️ Team-Daten konnten nicht geladen werden. Bitte prüfe die Datenbankfunktionen.</div>`;
    return;
  }

  const typeCounts = {};
  (statsData || []).forEach(row => { typeCounts[row.type] = parseInt(row.total_days); });

  const members = perMember || [];
  const above = members.filter(m => m.percentage >= 50).length;
  const below = members.filter(m => m.percentage < 50).length;
  const avg = members.length > 0
    ? Math.round(members.reduce((s, m) => s + m.percentage, 0) / members.length)
    : 0;

  const avgColor = avg >= 50 ? '#10b981' : avg >= 35 ? '#f59e0b' : '#ef4444';

  document.getElementById('team-content').innerHTML = `
    <div class="grid grid-3 mb-24">
      <div class="stat-card" style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.05))">
        <div class="stat-icon">📊</div>
        <div class="stat-value" style="color:${avgColor}">${avg}%</div>
        <div class="stat-label">Team-Durchschnitt</div>
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05))">
        <div class="stat-icon">✅</div>
        <div class="stat-value text-success">${above}</div>
        <div class="stat-label">Mitglieder ≥ 50%</div>
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value text-danger">${below}</div>
        <div class="stat-label">Mitglieder < 50%</div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:20px">Anwesenheitsverteilung (anonym)</h3>
        ${members.length === 0
          ? `<div class="empty-state"><div class="empty-icon">📭</div>Noch keine Daten für diesen Monat</div>`
          : members.sort((a,b) => b.percentage - a.percentage).map((m, i) => {
            const pct = Math.min(m.percentage, 100);
            const color = pct >= 50 ? '#10b981' : pct >= 35 ? '#f59e0b' : '#ef4444';
            return `
              <div style="margin-bottom:14px">
                <div class="flex-between text-sm mb-8">
                  <span class="text-muted">Mitglied ${i+1}</span>
                  <span class="fw-bold" style="color:${color}">${m.percentage}%</span>
                </div>
                <div class="team-bar-bg">
                  <div class="team-bar-fill" style="width:${pct}%;background:${color}"></div>
                </div>
              </div>`;
          }).join('')}
        <div style="border-top:1px solid var(--border);margin-top:16px;padding-top:14px;display:flex;align-items:center;gap:8px">
          <div style="width:10px;height:3px;background:rgba(245,158,11,0.7);border-radius:2px"></div>
          <span class="text-xs text-muted">50%-Ziel</span>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:20px">Tagestypen im Team</h3>
        ${[
          { key:'OFFICE',   label:'🏢 Bürotage',          color:'#6366f1' },
          { key:'REMOTE',   label:'🏠 Mobiles Arbeiten',   color:'#64748b' },
          { key:'VACATION', label:'🌴 Urlaubstage',         color:'#f59e0b' },
          { key:'HOLIDAY',  label:'🎉 Feiertage',           color:'#8b5cf6' },
          { key:'FLEX',     label:'⏰ Gleittage',            color:'#06b6d4' },
          { key:'SICK',     label:'🤒 Kranktage',            color:'#ef4444' },
        ].map(t => {
          const val = typeCounts[t.key] || 0;
          const max = Math.max(...Object.values(typeCounts), 1);
          const pct = Math.round((val / max) * 100);
          return `
            <div style="margin-bottom:12px">
              <div class="flex-between text-sm mb-8">
                <span>${t.label}</span>
                <span class="fw-bold">${val} Einträge</span>
              </div>
              <div class="team-bar-bg">
                <div class="team-bar-fill" style="width:${pct}%;background:${t.color}"></div>
              </div>
            </div>`;
        }).join('')}
        <div class="alert alert-info mt-16" style="margin-bottom:0;font-size:12px">
          🔒 Alle Werte sind aggregiert – keine individuellen Daten sichtbar.
        </div>
      </div>
    </div>
  `;
}
