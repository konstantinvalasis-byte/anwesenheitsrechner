import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { getBWHolidays, dateKey } from '../holidays.js';
import { getMonthState, setMonthState } from '../monthState.js';

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAY_NAMES = ['Mo','Di','Mi','Do','Fr','Sa','So'];

let currentYear, currentMonth;
let profile = null;

export async function renderTeamCalendar(prof) {
  profile = prof;
  ({ year: currentYear, month: currentMonth } = getMonthState());
  document.getElementById('app').innerHTML = `
    <div id="navbar" class="navbar"></div>
    <div class="page fade-in">
      <div class="container">
        <div class="page-header flex-between">
          <div>
            <h1 class="page-title">🗓️ Team-Kalender</h1>
            <p class="page-subtitle">Anonyme Tagesübersicht – keine individuellen Daten sichtbar</p>
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="navigate('team')">← Team-Statistik</button>
            <div class="month-selector">
              <button class="month-btn" id="btn-prev">‹</button>
              <span class="month-display" id="month-display"></span>
              <button class="month-btn" id="btn-next">›</button>
            </div>
          </div>
        </div>
        <div class="card" style="padding:20px">
          <div id="team-cal-grid"><div class="loader-wrap"><div class="loader"></div></div></div>
        </div>
        <div class="alert alert-info mt-24" style="margin-bottom:0">
          🔒 Zellen zeigen nur die Gesamtzahl anwesender Teammitglieder pro Tag – keine Namen.
        </div>
      </div>
    </div>
  `;

  renderNavbar(profile, 'team');
  document.getElementById('btn-prev').onclick = () => { currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} setMonthState(currentYear, currentMonth); loadTeamCalendar(); };
  document.getElementById('btn-next').onclick = () => { currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} setMonthState(currentYear, currentMonth); loadTeamCalendar(); };
  await loadTeamCalendar();
}

async function loadTeamCalendar() {
  document.getElementById('month-display').textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  const holidayMap = getBWHolidays(currentYear);
  const monthPrefix = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-`;
  const holidays = [...holidayMap.keys()].filter(d => d.startsWith(monthPrefix));

  const { data, error } = await supabase.rpc('get_team_day_counts', {
    p_year: currentYear, p_month: currentMonth + 1, p_holidays: holidays,
  });

  if (error) {
    console.error('[TeamCalendar] Daten konnten nicht geladen werden:', error);
    document.getElementById('team-cal-grid').innerHTML =
      '<div class="alert alert-warning">⚠️ Team-Kalender konnte nicht geladen werden. Bitte versuche es erneut.</div>';
    return;
  }

  renderGrid(data || [], holidayMap);
}

function renderGrid(dayRows, holidayMap) {
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const today = dateKey(new Date());

  const dataByDate = {};
  dayRows.forEach(r => dataByDate[r.day] = r);

  let html = `<div class="calendar-grid">`;
  DAY_NAMES.forEach(d => { html += `<div class="cal-header">${d}</div>`; });
  for (let i = 0; i < firstDayOfWeek; i++) html += `<div class="cal-day cal-empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    const ds = dateKey(date);
    const dow = date.getDay();
    const isWknd = dow === 0 || dow === 6;
    const isHol = holidayMap.has(ds);
    const isToday = ds === today;
    const row = dataByDate[ds];
    const teamSize = row ? Number(row.team_size) : 0;
    const officeCount = row ? Number(row.office_count) : 0;
    const ratio = teamSize > 0 ? officeCount / teamSize : 0;

    let classes = 'cal-day';
    if (isWknd) classes += ' cal-weekend';
    if (isToday) classes += ' cal-today';

    const bgStyle = teamSize > 0 ? `background:rgba(99,102,241,${(0.12 + ratio * 0.6).toFixed(2)})` : '';
    const titleAttr = isHol ? holidayMap.get(ds) : (teamSize > 0 ? `${officeCount} von ${teamSize} im Büro` : 'Kein Arbeitstag für das Team');

    html += `<div class="${classes}" style="${bgStyle}" title="${titleAttr}">
      <span class="cal-day-num">${d}</span>
      ${teamSize > 0
        ? `<span style="font-size:11px;font-weight:700;color:var(--text-primary)">${officeCount}/${teamSize}</span>`
        : (isHol ? `<span class="cal-day-emoji">🎉</span>` : '')}
    </div>`;
  }

  const lastDow = (new Date(currentYear, currentMonth, daysInMonth).getDay() + 6) % 7;
  for (let i = lastDow + 1; i < 7; i++) html += `<div class="cal-day cal-empty"></div>`;
  html += `</div>`;
  document.getElementById('team-cal-grid').innerHTML = html;
}
