import Chart from 'chart.js/auto';
import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { PRESENCE_TARGET } from '../calculator.js';
import { getBWHolidays } from '../holidays.js';

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const MONTH_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

let currentYear;
let profile = null;
let chartInstance = null;

export async function renderTeamYearOverview(prof) {
  profile = prof;
  currentYear = new Date().getFullYear();
  document.getElementById('app').innerHTML = `
    <div id="navbar" class="navbar"></div>
    <div class="page fade-in">
      <div class="container">
        <div class="page-header flex-between">
          <div>
            <h1 class="page-title">📊 Team-Statistiken</h1>
            <p class="page-subtitle">Anonyme Anwesenheitsquote des Teams pro Monat – keine individuellen Daten sichtbar</p>
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div class="view-toggle">
              <button class="view-toggle-btn" onclick="navigate('year')">👤 Persönlich</button>
              <button class="view-toggle-btn active">👥 Team</button>
            </div>
            <div class="month-selector">
              <button class="month-btn" id="btn-prev-year">‹</button>
              <span class="month-display" id="year-display"></span>
              <button class="month-btn" id="btn-next-year">›</button>
            </div>
          </div>
        </div>
        <div id="year-content"><div class="loader-wrap"><div class="loader"></div></div></div>
      </div>
    </div>
  `;

  renderNavbar(profile, 'year');
  document.getElementById('btn-prev-year').onclick = () => { currentYear--; loadYear(); };
  document.getElementById('btn-next-year').onclick = () => { currentYear++; loadYear(); };
  await loadYear();
}

async function loadYear() {
  document.getElementById('year-display').textContent = `${currentYear}`;

  const holidays = [...getBWHolidays(currentYear).keys()];

  const [{ data: rows, error }, { data: weekdayRows, error: weekdayError }, { data: teamData, error: teamError }] = await Promise.all([
    supabase.rpc('get_team_year_stats', { p_year: currentYear, p_holidays: holidays }),
    supabase.rpc('get_team_weekday_stats', { p_year: currentYear, p_holidays: holidays }),
    profile.team_id
      ? supabase.from('teams').select('presence_target').eq('id', profile.team_id).single()
      : Promise.resolve({ data: null }),
  ]);

  if (error || weekdayError || teamError) {
    document.getElementById('year-content').innerHTML =
      '<div class="alert alert-warning">⚠️ Team-Daten konnten nicht geladen werden. Bitte versuche es erneut.</div>';
    return;
  }

  const presenceTarget = teamData?.presence_target ?? PRESENCE_TARGET;
  const targetPct = Math.round(presenceTarget * 100);
  const today = new Date();

  const byMonth = {};
  (rows || []).forEach(r => { byMonth[r.month] = r; });

  const monthStats = [];
  let totalRemoteDays = 0, totalVacationDays = 0, totalFlexDays = 0, totalSickDays = 0, totalOfficeDays = 0;
  for (let m = 0; m < 12; m++) {
    const isFuture = currentYear > today.getFullYear() ||
      (currentYear === today.getFullYear() && m > today.getMonth());
    const row = byMonth[m + 1];
    const officeDays = row ? Number(row.office_days) : 0;
    const absenceDays = row ? Number(row.absence_days) : 0;
    const requiredDays = row ? Number(row.required_days) : 0;
    const netDays = Math.max(0, requiredDays - absenceDays);
    const percentage = netDays > 0 ? Math.round(officeDays / netDays * 100) : 0;
    const hasData = officeDays + absenceDays > 0;
    monthStats.push({ month: m, isFuture, hasData, percentage, targetMet: netDays > 0 && percentage >= targetPct });
    totalOfficeDays += officeDays;
    totalRemoteDays += row ? Number(row.remote_days) : 0;
    totalVacationDays += row ? Number(row.vacation_days) : 0;
    totalFlexDays += row ? Number(row.flex_days) : 0;
    totalSickDays += row ? Number(row.sick_days) : 0;
  }

  const weekdayOffice = [0,0,0,0,0,0,0];
  (weekdayRows || []).forEach(r => { weekdayOffice[r.weekday % 7] = Number(r.office_days); });

  const totals = { totalOfficeDays, totalRemoteDays, totalVacationDays, totalFlexDays, totalSickDays };
  renderContent(monthStats, targetPct, totals, weekdayOffice);
}

const WEEKDAY_NAMES = ['So','Mo','Di','Mi','Do','Fr','Sa'];

function renderContent(monthStats, targetPct, totals, weekdayOffice) {
  const pastOrCurrent = monthStats.filter(s => !s.isFuture && s.hasData);
  const avg = pastOrCurrent.length > 0
    ? Math.round(pastOrCurrent.reduce((sum, s) => sum + s.percentage, 0) / pastOrCurrent.length)
    : 0;
  const monthsAboveTarget = pastOrCurrent.filter(s => s.targetMet).length;
  const bestMonth = pastOrCurrent.reduce((best, s) => (!best || s.percentage > best.percentage) ? s : best, null);
  const worstMonth = pastOrCurrent.reduce((worst, s) => (!worst || s.percentage < worst.percentage) ? s : worst, null);
  const avgColor = avg >= targetPct ? '#10b981' : avg >= targetPct * 0.7 ? '#f59e0b' : '#ef4444';
  const { totalOfficeDays, totalRemoteDays, totalVacationDays, totalFlexDays, totalSickDays } = totals;
  const homeOfficeQuote = (totalOfficeDays + totalRemoteDays) > 0
    ? Math.round(totalRemoteDays / (totalOfficeDays + totalRemoteDays) * 100)
    : 0;
  const maxWeekday = Math.max(...[1,2,3,4,5].map(d => weekdayOffice[d]), 1);

  document.getElementById('year-content').innerHTML = `
    <div class="card mb-24">
      <div class="kpi-bar">
        <div class="kpi-item">
          <div class="kpi-item-value" style="color:${avgColor}">${avg}%</div>
          <div class="kpi-item-label">Ø Team-Anwesenheit${pastOrCurrent.length > 0 ? ` · ${pastOrCurrent.length} Mo.` : ''}</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-item-value text-success">${monthsAboveTarget}</div>
          <div class="kpi-item-label">Monate ≥ ${targetPct}%-Ziel</div>
        </div>
        <div class="kpi-item" title="${bestMonth ? MONTH_NAMES[bestMonth.month] : ''}">
          <div class="kpi-item-value text-accent">${bestMonth ? `${bestMonth.percentage}%` : '–'}</div>
          <div class="kpi-item-label">Bester: ${bestMonth ? MONTH_SHORT[bestMonth.month] : '–'}</div>
        </div>
        <div class="kpi-item" title="${worstMonth ? MONTH_NAMES[worstMonth.month] : ''}">
          <div class="kpi-item-value text-danger">${worstMonth ? `${worstMonth.percentage}%` : '–'}</div>
          <div class="kpi-item-label">Schwächster: ${worstMonth ? MONTH_SHORT[worstMonth.month] : '–'}</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-item-value">${homeOfficeQuote}%</div>
          <div class="kpi-item-label">Home-Office-Quote</div>
        </div>
        <div class="kpi-item" title="${totalVacationDays} Urlaub · ${totalSickDays} Krank · ${totalFlexDays} Gleittag">
          <div class="kpi-item-value">${totalVacationDays + totalSickDays + totalFlexDays}</div>
          <div class="kpi-item-label">Abwesenheiten</div>
        </div>
      </div>
    </div>

    <div class="layout-stats-sidebar">
      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:20px">Team-Anwesenheitsquote pro Monat</h3>
        <div style="position:relative;height:300px">
          <canvas id="year-chart"></canvas>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:20px">Bürotage nach Wochentag</h3>
        ${[1,2,3,4,5].map(d => `
          <div style="margin-bottom:12px">
            <div class="flex-between text-sm mb-8">
              <span>${WEEKDAY_NAMES[d]}</span>
              <span class="fw-bold">${weekdayOffice[d]}</span>
            </div>
            <div class="team-bar-bg">
              <div class="team-bar-fill" style="width:${Math.round(weekdayOffice[d] / maxWeekday * 100)}%;background:#6366f1"></div>
            </div>
          </div>`).join('')}
        <div class="alert alert-info mt-16" style="margin-bottom:0;font-size:11px">
          🔒 Anonym &amp; aggregiert
        </div>
      </div>
    </div>
  `;

  // Führende Monate ohne Daten (z.B. vor Nutzungsbeginn) im Chart nicht als leere Balken zeigen
  const firstDataIdx = monthStats.findIndex(s => s.hasData);
  const chartStats = firstDataIdx > 0 ? monthStats.slice(firstDataIdx) : monthStats;
  drawChart(chartStats, targetPct);
}

function drawChart(monthStats, targetPct) {
  const ctx = document.getElementById('year-chart');
  if (!ctx) return;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const gridColor = 'rgba(255,255,255,0.06)';
  const tickColor = '#7c8fa6';

  const barColors = monthStats.map(s => {
    if (s.isFuture) return 'rgba(255,255,255,0.06)';
    if (!s.hasData) return 'rgba(255,255,255,0.08)';
    if (s.targetMet) return '#10b981';
    if (s.percentage >= targetPct * 0.7) return '#f59e0b';
    return '#ef4444';
  });

  chartInstance = new Chart(ctx, {
    data: {
      labels: monthStats.map(s => MONTH_SHORT[s.month]),
      datasets: [
        {
          type: 'bar',
          label: 'Team-Anwesenheit %',
          data: monthStats.map(s => s.hasData || !s.isFuture ? s.percentage : null),
          backgroundColor: barColors,
          borderRadius: 6,
          maxBarThickness: 40,
        },
        {
          type: 'line',
          label: `Ziel (${targetPct}%)`,
          data: monthStats.map(() => targetPct),
          borderColor: 'rgba(245,158,11,0.7)',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: tickColor, boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: (item) => item.datasetIndex === 0 ? `${item.formattedValue}%` : `Ziel: ${item.formattedValue}%`,
          },
        },
      },
      scales: {
        y: { min: 0, max: 100, ticks: { color: tickColor, callback: v => v + '%' }, grid: { color: gridColor } },
        x: { ticks: { color: tickColor }, grid: { display: false } },
      },
    },
  });
}
