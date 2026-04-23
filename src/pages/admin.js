import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { calculateMonthStats } from '../calculator.js';
import { showToast } from '../components/toast.js';

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let profile = null;

export async function renderAdmin(prof) {
  profile = prof;

  if (!profile.is_admin) {
    document.getElementById('app').innerHTML = `
      <div id="navbar" class="navbar"></div>
      <div class="page"><div class="container"><div class="empty-state mt-24">
        <div class="empty-icon">🔒</div>
        <p>Kein Zugriff – nur für Administratoren.</p>
      </div></div></div>`;
    renderNavbar(profile, 'admin');
    return;
  }

  document.getElementById('app').innerHTML = `
    <div id="navbar" class="navbar"></div>
    <div class="page fade-in">
      <div class="container">
        <div class="page-header flex-between">
          <div>
            <h1 class="page-title">⚙️ Admin-Panel</h1>
            <p class="page-subtitle">Vollständige Übersicht aller Teammitglieder</p>
          </div>
          <div style="display:flex;gap:12px;align-items:center">
            <div class="month-selector">
              <button class="month-btn" id="btn-prev">‹</button>
              <span class="month-display" id="month-display"></span>
              <button class="month-btn" id="btn-next">›</button>
            </div>
          </div>
        </div>
        <div id="admin-content"><div class="loader-wrap"><div class="loader"></div></div></div>
      </div>
    </div>
  `;

  renderNavbar(profile, 'admin');
  document.getElementById('btn-prev').onclick = () => { currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} loadAdmin(); };
  document.getElementById('btn-next').onclick = () => { currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} loadAdmin(); };
  await loadAdmin();
}

async function loadAdmin() {
  document.getElementById('month-display').textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  // Load all profiles
  const { data: profiles, error: profError } = await supabase.from('profiles').select('*').order('name');
  if (profError) { document.getElementById('admin-content').innerHTML = `<div class="alert alert-warning">Fehler beim Laden der Profile.</div>`; return; }

  const start = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-01`;
  const end   = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${new Date(currentYear,currentMonth+1,0).getDate()}`;

  // Load ALL attendance for this month (admin sees all)
  const { data: allAttendance } = await supabase.from('attendance').select('*').gte('date', start).lte('date', end);

  // Compute stats per member
  const memberStats = profiles.map(p => {
    const memberEntries = (allAttendance || []).filter(e => e.member_id === p.id);
    const stats = calculateMonthStats(memberEntries, currentYear, currentMonth);
    return { profile: p, stats };
  });

  const above = memberStats.filter(m => m.stats.targetMet).length;
  const avg   = memberStats.length > 0
    ? Math.round(memberStats.reduce((s,m) => s + m.stats.percentage, 0) / memberStats.length) : 0;

  document.getElementById('admin-content').innerHTML = `
    <div class="grid grid-3 mb-24">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value text-accent">${profiles.length}</div>
        <div class="stat-label">Teammitglieder</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value text-success">${above} / ${profiles.length}</div>
        <div class="stat-label">Ziel erreicht</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-value" style="color:${avg>=50?'#10b981':avg>=35?'#f59e0b':'#ef4444'}">${avg}%</div>
        <div class="stat-label">Ø Team-Anwesenheit</div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <h3 style="font-size:16px;font-weight:700">Alle Mitglieder – ${MONTH_NAMES[currentMonth]} ${currentYear}</h3>
        <button class="btn btn-ghost btn-sm" onclick="exportCSV()">📥 CSV Export</button>
      </div>
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>🏢 Büro</th>
              <th>🏠 Mobil</th>
              <th>🌴 Urlaub</th>
              <th>⏰ Gleit</th>
              <th>🤒 Krank</th>
              <th>Netto-AT</th>
              <th>Erforderlich</th>
              <th>Anwesenheit</th>
              <th>Status</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            ${memberStats.map(({ profile: p, stats: s }) => {
              const pct = s.percentage;
              const color = pct >= 50 ? '#10b981' : pct >= 35 ? '#f59e0b' : '#ef4444';
              const badge = s.targetMet
                ? '<span class="badge badge-success">✅ OK</span>'
                : pct >= 35
                  ? '<span class="badge badge-warning">⚠️ Knapp</span>'
                  : '<span class="badge badge-danger">❌ Fehlt</span>';
              return `
                <tr>
                  <td><strong>${p.name}</strong><br><span class="text-xs text-muted">${p.is_admin?'Admin':'Mitglied'}</span></td>
                  <td><strong>${s.counts.OFFICE}</strong></td>
                  <td>${s.counts.REMOTE}</td>
                  <td>${s.counts.VACATION}</td>
                  <td>${s.counts.FLEX}</td>
                  <td>${s.counts.SICK}</td>
                  <td>${s.netWorkingDays}</td>
                  <td>${s.requiredDays}</td>
                  <td><strong style="color:${color}">${pct}%</strong>
                    <div class="team-bar-bg" style="margin-top:4px;width:80px">
                      <div class="team-bar-fill" style="width:${Math.min(pct,100)}%;background:${color}"></div>
                    </div>
                  </td>
                  <td>${badge}</td>
                  <td>
                    <button class="btn btn-sm ${p.is_admin?'btn-danger':'btn-ghost'}"
                      onclick="toggleAdmin('${p.id}','${p.name}',${p.is_admin})">
                      ${p.is_admin ? 'Entfernen' : 'Ernennen'}
                    </button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Store for CSV export
  window._adminExportData = memberStats;
}

window.toggleAdmin = async function(userId, name, isAdmin) {
  const confirm = window.confirm(`${isAdmin ? 'Admin-Rechte von' : 'Admin-Rechte an'} "${name}" ${isAdmin ? 'entziehen' : 'vergeben'}?`);
  if (!confirm) return;
  const { error } = await supabase.from('profiles').update({ is_admin: !isAdmin }).eq('id', userId);
  if (error) { showToast('❌ Fehler beim Aktualisieren', 'error'); return; }
  showToast(`✅ Admin-Rechte ${isAdmin ? 'entzogen' : 'vergeben'}.`, 'success');
  await loadAdmin();
};

window.exportCSV = function() {
  const data = window._adminExportData || [];
  const month = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
  const rows = [
    ['Name', 'Büro', 'Mobil', 'Urlaub', 'Gleittag', 'Krank', 'Netto-AT', 'Erforderlich', 'Anwesenheit%', 'Ziel erreicht'],
    ...data.map(({ profile: p, stats: s }) => [
      p.name, s.counts.OFFICE, s.counts.REMOTE, s.counts.VACATION, s.counts.FLEX,
      s.counts.SICK, s.netWorkingDays, s.requiredDays, s.percentage + '%', s.targetMet ? 'Ja' : 'Nein'
    ])
  ];
  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Anwesenheit_${month.replace(' ','_')}.csv`;
  a.click();
  showToast('📥 CSV heruntergeladen', 'success');
};
