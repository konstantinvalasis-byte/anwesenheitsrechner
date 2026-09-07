import Chart from 'chart.js/auto';
import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { calculateMonthStats, PRESENCE_TARGET } from '../calculator.js';
import { dateKey } from '../holidays.js';

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const MONTH_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

let currentYear;
let profile = null;
let chartInstance = null;

export async function renderYearOverview(prof) {
  profile = prof;
  currentYear = new Date().getFullYear();
  document.getElementById('app').innerHTML = `
    <div id="navbar" class="navbar"></div>
    <div class="page fade-in">
      <div class="container">
        <div class="page-header flex-between">
          <div>
            <h1 class="page-title">📊 Meine Statistiken</h1>
            <p class="page-subtitle">Deine persönliche Anwesenheitsquote im Jahresverlauf – z.B. als Nachweis für die Steuererklärung</p>
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            ${prof.team_id ? `
            <div class="view-toggle">
              <button class="view-toggle-btn active">👤 Persönlich</button>
              <button class="view-toggle-btn" onclick="navigate('team-year')">👥 Team</button>
            </div>` : ''}
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

  const [{ data: entries, error: entriesError }, { data: teamData, error: teamError }] = await Promise.all([
    supabase.from('attendance').select('*').eq('member_id', profile.id)
      .gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`),
    profile.team_id
      ? supabase.from('teams').select('presence_target').eq('id', profile.team_id).single()
      : Promise.resolve({ data: null }),
  ]);

  if (entriesError || teamError) {
    document.getElementById('year-content').innerHTML =
      '<div class="alert alert-warning">⚠️ Daten konnten nicht geladen werden. Bitte versuche es erneut.</div>';
    return;
  }

  const presenceTarget = teamData?.presence_target ?? PRESENCE_TARGET;
  const targetPct = Math.round(presenceTarget * 100);
  const workDays = profile.work_days || [1,2,3,4,5];

  const today = new Date();
  const todayStr = dateKey(today);

  const monthStats = [];
  for (let m = 0; m < 12; m++) {
    const isFuture = currentYear > today.getFullYear() ||
      (currentYear === today.getFullYear() && m > today.getMonth());
    const toDate = (currentYear === today.getFullYear() && m === today.getMonth()) ? todayStr : null;
    const stats = calculateMonthStats(entries || [], currentYear, m, toDate, workDays, presenceTarget);
    const hasData = stats.counts.OFFICE + stats.counts.REMOTE + stats.counts.VACATION + stats.counts.FLEX + stats.counts.SICK > 0;
    monthStats.push({ ...stats, month: m, isFuture, hasData });
  }

  renderContent(monthStats, targetPct, entries || []);
}

const WEEKDAY_NAMES = ['So','Mo','Di','Mi','Do','Fr','Sa'];

function renderContent(monthStats, targetPct, entries) {
  const pastOrCurrent = monthStats.filter(s => !s.isFuture && s.hasData);
  const avg = pastOrCurrent.length > 0
    ? Math.round(pastOrCurrent.reduce((sum, s) => sum + s.percentage, 0) / pastOrCurrent.length)
    : 0;
  const monthsAboveTarget = pastOrCurrent.filter(s => s.targetMet).length;
  const bestMonth = pastOrCurrent.reduce((best, s) => (!best || s.percentage > best.percentage) ? s : best, null);
  const worstMonth = pastOrCurrent.reduce((worst, s) => (!worst || s.percentage < worst.percentage) ? s : worst, null);
  const avgColor = avg >= targetPct ? '#10b981' : avg >= targetPct * 0.7 ? '#f59e0b' : '#ef4444';
  const totalOfficeDays = monthStats.reduce((sum, s) => sum + s.counts.OFFICE, 0);
  const totalRemoteDays = monthStats.reduce((sum, s) => sum + s.counts.REMOTE, 0);
  const totalVacationDays = monthStats.reduce((sum, s) => sum + s.counts.VACATION, 0);
  const totalSickDays = monthStats.reduce((sum, s) => sum + s.counts.SICK, 0);
  const totalFlexDays = monthStats.reduce((sum, s) => sum + s.counts.FLEX, 0);
  const homeOfficeQuote = (totalOfficeDays + totalRemoteDays) > 0
    ? Math.round(totalRemoteDays / (totalOfficeDays + totalRemoteDays) * 100)
    : 0;

  // Bürotage nach Wochentag (aus den Rohdaten, damit auch weniger häufige Muster sichtbar werden)
  const weekdayOffice = [0,0,0,0,0,0,0];
  entries.forEach(e => {
    if (e.type !== 'OFFICE') return;
    const dow = new Date(e.date + 'T12:00:00').getDay();
    weekdayOffice[dow]++;
  });
  const maxWeekday = Math.max(...[1,2,3,4,5].map(d => weekdayOffice[d]), 1);

  document.getElementById('year-content').innerHTML = `
    <div class="card mb-24">
      <div class="kpi-bar">
        <div class="kpi-item">
          <div class="kpi-item-value" style="color:${avgColor}">${avg}%</div>
          <div class="kpi-item-label">Ø Anwesenheit${pastOrCurrent.length > 0 ? ` · ${pastOrCurrent.length} Mo.` : ''}</div>
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
          <div class="kpi-item-value">${totalOfficeDays}</div>
          <div class="kpi-item-label">Bürotage im Jahr</div>
        </div>
        <div class="kpi-item" title="${homeOfficeQuote}% aller genutzten Anwesenheitstage">
          <div class="kpi-item-value">${totalRemoteDays}</div>
          <div class="kpi-item-label">Home-Office-Tage</div>
        </div>
        <div class="kpi-item" title="${totalVacationDays} Urlaub · ${totalSickDays} Krank · ${totalFlexDays} Gleittag">
          <div class="kpi-item-value">${totalVacationDays + totalSickDays + totalFlexDays}</div>
          <div class="kpi-item-label">Abwesenheiten</div>
        </div>
      </div>
    </div>

    <div class="layout-stats-sidebar">
      <div class="card">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:20px">Anwesenheitsquote pro Monat</h3>
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
          label: 'Anwesenheit %',
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
