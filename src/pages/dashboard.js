import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { calculateMonthStats, DAY_TYPES } from '../calculator.js';
import { getBWHolidays } from '../holidays.js';
import { getMonthState, setMonthState } from '../monthState.js';

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

let currentYear, currentMonth;

export async function renderDashboard(profile) {
  ({ year: currentYear, month: currentMonth } = getMonthState());
  document.getElementById('app').innerHTML = `
    <div id="navbar" class="navbar"></div>
    <div class="page fade-in">
      <div class="container">
        <div class="page-header flex-between">
          <div>
            <h1 class="page-title">Mein Dashboard</h1>
            <p class="page-subtitle">Deine persönliche Anwesenheitsübersicht</p>
          </div>
          <div class="month-selector">
            <button class="month-btn" id="btn-prev-month">‹</button>
            <span class="month-display" id="month-display"></span>
            <button class="month-btn" id="btn-next-month">›</button>
          </div>
        </div>
        <div id="dashboard-content">
          <div class="loader-wrap"><div class="loader"></div></div>
        </div>
      </div>
    </div>
  `;

  renderNavbar(profile, 'dashboard');

  document.getElementById('btn-prev-month').onclick = () => {
    currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    setMonthState(currentYear, currentMonth);
    loadData(profile);
  };
  document.getElementById('btn-next-month').onclick = () => {
    currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    setMonthState(currentYear, currentMonth);
    loadData(profile);
  };

  await loadData(profile);
}

async function loadData(profile) {
  document.getElementById('month-display').textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  const startDate = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-01`;
  const endDate   = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${new Date(currentYear, currentMonth+1, 0).getDate()}`;

  const { data: entries } = await supabase
    .from('attendance')
    .select('*')
    .eq('member_id', profile.id)
    .gte('date', startDate)
    .lte('date', endDate);

  const today = new Date();
  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
  const todayStr = today.toISOString().slice(0, 10);

  const statsFullMonth = calculateMonthStats(entries || [], currentYear, currentMonth);
  const statsMTD = isCurrentMonth
    ? calculateMonthStats(entries || [], currentYear, currentMonth, todayStr)
    : null;

  renderStats(statsFullMonth, statsMTD, profile);
}

function renderStats(stats, statsMTD, profile) {
  const circumference = 2 * Math.PI * 90;
  const targetOffset = circumference - (50 / 100) * circumference;

  // Ring zeigt MTD wenn verfügbar, sonst Gesamtmonat
  const ringStats = statsMTD || stats;
  const pctRing = Math.min(ringStats.percentage, 100);
  const offsetRing = circumference - (pctRing / 100) * circumference;

  let statusClass = 'ok', statusText = '✅ Ziel erreicht!';
  if (ringStats.percentage < 35) { statusClass = 'bad'; statusText = '⚠️ Deutlich unter Ziel'; }
  else if (ringStats.percentage < 50) { statusClass = 'warn'; statusText = '🔶 Knapp unter 50%'; }

  const ringColor = ringStats.targetMet ? '#10b981' : (ringStats.percentage >= 35 ? '#f59e0b' : '#ef4444');

  const holidayMap = getBWHolidays(currentYear);
  const upcomingHolidays = [...holidayMap.entries()]
    .filter(([d]) => d >= `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-01` && d <= `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-31`)
    .slice(0, 4);

  document.getElementById('dashboard-content').innerHTML = `
    <div class="layout-dashboard mb-24">
      <!-- Progress Ring Card -->
      <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:36px">
        <div class="progress-ring-container" style="width:220px;height:220px">
          <svg class="progress-ring-svg" width="220" height="220" viewBox="0 0 220 220">
            <circle class="progress-ring-track" cx="110" cy="110" r="90" stroke-width="14"/>
            <!-- Target marker at 50% -->
            <circle cx="110" cy="110" r="90" fill="none" stroke="rgba(245,158,11,0.5)"
              stroke-width="14" stroke-dasharray="3 ${circumference-3}"
              stroke-dashoffset="${targetOffset}" stroke-linecap="round"
              style="transform:rotate(-90deg);transform-origin:center"/>
            <circle class="progress-ring-bar" cx="110" cy="110" r="90"
              stroke="${ringColor}" stroke-width="14"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offsetRing}"/>
          </svg>
          <div class="progress-ring-center" style="position:absolute;flex-direction:column;display:flex;align-items:center">
            <span class="ring-percent" style="color:${ringColor}">${ringStats.percentage}%</span>
            <span class="ring-label">${statsMTD ? 'Bis heute' : 'Anwesenheit'}</span>
            <span class="ring-status ${statusClass}">${statusText}</span>
          </div>
        </div>
        <div style="text-align:center">
          <div style="font-size:15px;font-weight:600">${ringStats.actualDays} von ${ringStats.requiredDays} Tagen</div>
          <div class="text-muted text-sm">Ziel: ${ringStats.requiredDays} Bürotage ${statsMTD ? 'bis heute' : 'diesen Monat'}</div>
        </div>
        ${statsMTD ? renderQuoteBadges(statsMTD, stats) : ''}
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-2" style="align-content:start">
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-value text-accent">${stats.totalWorkingDays}</div>
          <div class="stat-label">Arbeitstage gesamt</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏢</div>
          <div class="stat-value" style="color:#6366f1">${stats.counts.OFFICE}</div>
          <div class="stat-label">Bürotage</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏠</div>
          <div class="stat-value text-muted">${stats.counts.REMOTE}</div>
          <div class="stat-label">Mobiles Arbeiten</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🌴</div>
          <div class="stat-value" style="color:#f59e0b">${stats.counts.VACATION}</div>
          <div class="stat-label">Urlaubstage</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏰</div>
          <div class="stat-value" style="color:#06b6d4">${stats.counts.FLEX}</div>
          <div class="stat-label">Gleittage</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🤒</div>
          <div class="stat-value" style="color:#ef4444">${stats.counts.SICK}</div>
          <div class="stat-label">Kranktage</div>
        </div>
      </div>
    </div>

    <!-- Info row -->
    <div class="grid grid-2">
      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:16px">📊 Monatsübersicht</h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${renderBar('Bürotage (Präsenz)', stats.counts.OFFICE, stats.netWorkingDays, '#6366f1')}
          ${renderBar('Mobiles Arbeiten', stats.counts.REMOTE, stats.netWorkingDays, '#64748b')}
          ${renderBar('Abwesenheiten', stats.absenceDays, stats.totalWorkingDays, '#f59e0b')}
        </div>
        <div class="divider"></div>
        <div class="flex-between" style="font-size:14px">
          <span class="text-muted">Netto-Arbeitstage</span>
          <span class="fw-bold">${stats.netWorkingDays}</span>
        </div>
        <div class="flex-between mt-8" style="font-size:14px">
          <span class="text-muted">Erforderliche Präsenztage (50%)</span>
          <span class="fw-bold">${stats.requiredDays}</span>
        </div>
        <div class="flex-between mt-8" style="font-size:14px">
          <span class="text-muted">Noch benötigt</span>
          <span class="fw-bold ${stats.targetMet ? 'text-success' : 'text-warning'}">${Math.max(0, stats.requiredDays - stats.actualDays)} Tage</span>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:16px">🎉 Feiertage (BW) diesen Monat</h3>
        ${upcomingHolidays.length === 0
          ? `<div class="empty-state" style="padding:24px"><div class="empty-icon">😔</div>Keine Feiertage diesen Monat</div>`
          : upcomingHolidays.map(([date, name]) => `
            <div class="team-stat-row" style="margin-bottom:8px">
              <div style="font-size:20px">🎉</div>
              <div>
                <div style="font-size:14px;font-weight:600">${name}</div>
                <div class="text-muted text-xs">${formatDate(date)}</div>
              </div>
            </div>`).join('')}
        <div class="divider"></div>
        <div style="font-size:13px;color:var(--text-muted)">Feiertage werden automatisch als Ausfalltag gewertet und verringern deine Präsenzpflicht.</div>
      </div>
    </div>
  `;
}

function renderQuoteBadges(statsMTD, statsFullMonth) {
  function badge(label, s) {
    const color = s.targetMet ? '#10b981' : (s.percentage >= 35 ? '#f59e0b' : '#ef4444');
    const icon  = s.targetMet ? '✅' : (s.percentage >= 35 ? '⚠️' : '❌');
    return `
      <div style="flex:1;background:var(--bg-secondary);border-radius:12px;padding:12px 14px;text-align:center;min-width:120px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">${label}</div>
        <div style="font-size:22px;font-weight:800;color:${color};line-height:1">${s.percentage}%</div>
        <div style="font-size:12px;margin-top:4px">${icon} ${s.targetMet ? 'Ziel erreicht' : (s.percentage >= 35 ? 'Knapp drunter' : 'Unter Ziel')}</div>
      </div>`;
  }
  return `
    <div style="display:flex;gap:10px;width:100%;max-width:300px">
      ${badge('Bis heute', statsMTD)}
      ${badge('Gesamter Monat', statsFullMonth)}
    </div>`;
}

function renderBar(label, value, total, color) {
  const pct = total > 0 ? Math.round((value/total)*100) : 0;
  return `
    <div>
      <div class="flex-between text-sm mb-8">
        <span class="text-muted">${label}</span>
        <span class="fw-bold">${value} Tage (${pct}%)</span>
      </div>
      <div class="team-bar-bg">
        <div class="team-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}
