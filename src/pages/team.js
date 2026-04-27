import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { getWorkingDays } from '../holidays.js';
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

  // Aggregierte Tagestypen für die Balkenübersicht
  const { data: statsData, error } = await supabase.rpc('get_team_stats', {
    p_year: currentYear, p_month: currentMonth + 1
  });

  // Pro-Mitglied anonyme Rohdaten (office + absence Tage)
  const { data: rawStats } = await supabase.rpc('get_team_member_stats', {
    p_year: currentYear, p_month: currentMonth + 1
  });

  if (error) {
    document.getElementById('team-content').innerHTML = `
      <div class="alert alert-warning">⚠️ Team-Daten konnten nicht geladen werden. Bitte prüfe die Datenbankfunktionen.</div>`;
    return;
  }

  const today = new Date();
  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
  const todayStr = today.toISOString().slice(0, 10);

  const allWorkingDays = getWorkingDays(currentYear, currentMonth);
  const workingDays    = allWorkingDays.length;
  const workingDaysMTD = isCurrentMonth
    ? allWorkingDays.filter(d => d <= todayStr).length
    : workingDays;

  function calcMembers(wDays) {
    return (rawStats || []).map(m => {
      const net = Math.max(wDays - Number(m.absence_days), 0);
      return { percentage: net > 0 ? Math.round(Number(m.office_days) / net * 100) : 0 };
    });
  }

  const members    = calcMembers(workingDays);
  const membersMTD = isCurrentMonth ? calcMembers(workingDaysMTD) : null;

  const typeCounts = {};
  (statsData || []).forEach(row => { typeCounts[row.type] = parseInt(row.total_days); });

  function teamSummary(mems) {
    const above = mems.filter(m => m.percentage >= 50).length;
    const below = mems.filter(m => m.percentage < 50).length;
    const avg   = mems.length > 0
      ? Math.round(mems.reduce((s, m) => s + m.percentage, 0) / mems.length)
      : 0;
    return { above, below, avg };
  }

  const summary    = teamSummary(members);
  const summaryMTD = membersMTD ? teamSummary(membersMTD) : null;

  const avgColor = summary.avg >= 50 ? '#10b981' : summary.avg >= 35 ? '#f59e0b' : '#ef4444';

  document.getElementById('team-content').innerHTML = `
    <div class="grid grid-3 team-stat-grid mb-24">
      <div class="stat-card" style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.05))">
        <div class="stat-icon">📊</div>
        <div class="stat-value" style="color:${avgColor}">${summary.avg}%</div>
        <div class="stat-label">Team-Durchschnitt</div>
        ${summaryMTD ? renderMTDBadge(summaryMTD.avg, summary.avg, '%') : ''}
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05))">
        <div class="stat-icon">✅</div>
        <div class="stat-value text-success">${summary.above}</div>
        <div class="stat-label">Mitglieder ≥ 50%</div>
        ${summaryMTD ? renderMTDBadge(summaryMTD.above, summary.above, '') : ''}
      </div>
      <div class="stat-card" style="background:linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value text-danger">${summary.below}</div>
        <div class="stat-label">Mitglieder < 50%</div>
        ${summaryMTD ? renderMTDBadge(summaryMTD.below, summary.below, '') : ''}
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:20px">Anwesenheitsverteilung (anonym)${summaryMTD ? ' <span style="font-size:12px;font-weight:500;color:var(--text-muted)">· Bis heute</span>' : ''}</h3>
        ${(membersMTD || members).length === 0
          ? `<div class="empty-state"><div class="empty-icon">📭</div>Noch keine Daten für diesen Monat</div>`
          : (membersMTD || members).sort((a,b) => b.percentage - a.percentage).map((m, i) => {
            const pct = Math.min(m.percentage, 100);
            const color = pct >= 50 ? '#10b981' : pct >= 35 ? '#f59e0b' : '#ef4444';
            const fullPct = members[i] ? Math.min(members[i].percentage, 100) : pct;
            return `
              <div style="margin-bottom:14px">
                <div class="flex-between text-sm mb-8">
                  <span class="text-muted">Mitglied ${i+1}</span>
                  <span class="fw-bold" style="color:${color}">${m.percentage}%${summaryMTD && members[i] ? ` <span style="font-size:11px;color:var(--text-muted);font-weight:400">/ ${members[i].percentage}% Monat</span>` : ''}</span>
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

    <div class="card mt-24" style="background:linear-gradient(135deg,rgba(99,102,241,0.06),rgba(99,102,241,0.02))">
      <h3 style="font-size:16px;font-weight:700;margin-bottom:20px">📐 So wird die Anwesenheitsquote berechnet</h3>
      <div class="grid grid-2" style="gap:24px;margin-bottom:20px">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Schritt für Schritt</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="min-width:24px;height:24px;border-radius:50%;background:rgba(99,102,241,0.15);color:#6366f1;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center">1</div>
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--text-primary)">Arbeitstage zählen</div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:2px">Alle Montag–Freitag im Monat, ohne gesetzliche Feiertage (BW)</div>
              </div>
            </div>
            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="min-width:24px;height:24px;border-radius:50%;background:rgba(99,102,241,0.15);color:#6366f1;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center">2</div>
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--text-primary)">Abwesenheiten abziehen</div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:2px">Urlaub, Gleittage und Kranktage verringern die Pflichtanwesenheit</div>
              </div>
            </div>
            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="min-width:24px;height:24px;border-radius:50%;background:rgba(99,102,241,0.15);color:#6366f1;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center">3</div>
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--text-primary)">Quote berechnen</div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:2px">Bürotage ÷ Netto-Arbeitstage × 100</div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Beispiel</div>
          <div style="background:var(--bg-secondary);border-radius:10px;padding:16px;font-size:13px;line-height:1.8">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Arbeitstage im Monat</span><span style="font-weight:600">23</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">− Urlaub / Gleittag / Krank</span><span style="font-weight:600">− 5</span></div>
            <div style="border-top:1px solid var(--border);margin:6px 0"></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">= Netto-Arbeitstage</span><span style="font-weight:600">18</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Bürotage (eingetragen)</span><span style="font-weight:600">9</span></div>
            <div style="border-top:1px solid var(--border);margin:6px 0"></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-primary);font-weight:700">= Anwesenheitsquote</span><span style="color:#10b981;font-weight:700">9 ÷ 18 = <strong>50 %</strong></span></div>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:16px;border-top:1px solid var(--border)">
        <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:#6366f1;display:inline-block"></span>🏢 Büro zählt als Anwesenheit</div>
        <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:5px;margin-left:8px"><span style="width:10px;height:10px;border-radius:2px;background:#64748b;display:inline-block"></span>🏠 Mobiles Arbeiten zählt <em>nicht</em></div>
        <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:5px;margin-left:8px"><span style="width:10px;height:10px;border-radius:2px;background:#f59e0b;display:inline-block"></span>🌴 Urlaub, ⏰ Gleittag, 🤒 Krank reduzieren Pflicht-AT</div>
        <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:5px;margin-left:8px"><span style="width:10px;height:10px;border-radius:2px;background:#8b5cf6;display:inline-block"></span>🎉 Feiertage werden automatisch rausgerechnet</div>
      </div>
    </div>
  `;
}

function renderMTDBadge(mtdVal, fullVal, suffix) {
  return `
    <div class="mtd-badges">
      <span class="mtd-badge">Bis heute: <strong style="color:var(--text-primary)">${mtdVal}${suffix}</strong></span>
      <span class="mtd-badge">Monat: <strong style="color:var(--text-primary)">${fullVal}${suffix}</strong></span>
    </div>`;
}
