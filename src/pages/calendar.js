import { supabase } from '../supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { getBWHolidays, getBWSchulferien, getSchulferienName, isWeekend, dateKey } from '../holidays.js';
import { DAY_TYPES } from '../calculator.js';
import { getMonthState, setMonthState } from '../monthState.js';

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAY_NAMES = ['Mo','Di','Mi','Do','Fr','Sa','So'];

let currentYear, currentMonth;
let entries = [];
let profile = null;
let holidayMap = new Map();
let schulferienList = [];

export async function renderCalendar(prof) {
  profile = prof;
  ({ year: currentYear, month: currentMonth } = getMonthState());
  document.getElementById('app').innerHTML = `
    <div id="navbar" class="navbar"></div>
    <div class="page fade-in">
      <div class="container">
        <div class="page-header flex-between">
          <div>
            <h1 class="page-title">📅 Mein Kalender</h1>
            <p class="page-subtitle">Klicke auf einen Tag um den Typ einzutragen</p>
          </div>
          <div class="month-selector">
            <button class="month-btn" id="btn-prev">‹</button>
            <span class="month-display" id="month-display"></span>
            <button class="month-btn" id="btn-next">›</button>
          </div>
        </div>
        <div class="layout-calendar-sidebar">
          <div class="card" style="padding:20px;height:100%;box-sizing:border-box">
            <div id="calendar-grid"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div class="card">
              <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Legende</h3>
              <div class="legend" style="flex-direction:column">
                ${Object.entries(DAY_TYPES).filter(([k]) => k !== 'HOLIDAY').map(([k,v]) => `
                  <div class="legend-item">
                    <div class="legend-dot" style="background:${v.color}"></div>
                    <span>${v.emoji} ${v.label}</span>
                    ${v.reducesRequired ? '<span class="text-xs text-muted">(–Pflicht)</span>' : ''}
                    ${v.countsAsPresent ? '<span class="text-xs text-success">(+Präsenz)</span>' : ''}
                  </div>`).join('')}
                <div class="legend-item">
                  <div class="legend-dot" style="background:#8b5cf6"></div>
                  <span>🎉 Feiertag <em style="font-size:11px;font-style:normal;color:var(--text-muted)">(automatisch)</em></span>
                  <span class="text-xs text-muted">(–Pflicht)</span>
                </div>
              </div>
            </div>
            <div class="card">
              <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Feiertage (BW)</h3>
              <div id="holiday-list" class="text-sm text-muted">Lade…</div>
            </div>
            <div class="card" style="flex:1">
              <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Schulferien (BW)</h3>
              <div id="schulferien-list" class="text-sm text-muted">Lade…</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="day-modal"></div>
  `;

  renderNavbar(profile, 'calendar');
  document.getElementById('btn-prev').onclick = () => { currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} setMonthState(currentYear, currentMonth); loadCalendar(); };
  document.getElementById('btn-next').onclick = () => { currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} setMonthState(currentYear, currentMonth); loadCalendar(); };
  await loadCalendar();
}

async function loadCalendar() {
  holidayMap = getBWHolidays(currentYear);
  // Schulferien für aktuelles Jahr + Vorjahr laden (Dezember-Ferien reichen ins Folgejahr)
  schulferienList = [...getBWSchulferien(currentYear - 1), ...getBWSchulferien(currentYear)];
  document.getElementById('month-display').textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  const start = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-01`;
  const end   = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${new Date(currentYear,currentMonth+1,0).getDate()}`;

  const { data } = await supabase.from('attendance').select('*')
    .eq('member_id', profile.id).gte('date', start).lte('date', end);
  entries = data || [];

  renderGrid();
  renderHolidays();
}

function renderGrid() {
  const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Mon=0
  const today = dateKey(new Date());

  const entryMap = {};
  entries.forEach(e => entryMap[e.date] = e.type);

  let html = `<div class="calendar-grid">`;
  DAY_NAMES.forEach(d => { html += `<div class="cal-header">${d}</div>`; });

  for (let i = 0; i < firstDayOfWeek; i++) html += `<div class="cal-day cal-empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    const ds = dateKey(date);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    const isWknd = dow === 0 || dow === 6;
    const isHol = holidayMap.has(ds);
    const type = (isHol && !isWknd) ? 'HOLIDAY' : (entryMap[ds] || null);
    const isToday = ds === today;

    const ferienName = getSchulferienName(ds, schulferienList);

    let classes = 'cal-day';
    if (isWknd) classes += ' cal-weekend';
    if (ferienName && !isHol) classes += ' cal-schulferien';
    if (isToday) classes += ' cal-today';
    if (type) classes += ` has-entry type-${type}`;

    const emoji = type && DAY_TYPES[type] ? DAY_TYPES[type].emoji : (isHol && !isWknd ? '🎉' : '');
    const titleAttr = isHol ? holidayMap.get(ds) : (ferienName ? `Schulferien: ${ferienName}` : '');

    html += `<div class="${classes}" ${!isWknd && !isHol ? `onclick="openDayModal('${ds}')"` : ''} title="${titleAttr}">
      <span class="cal-day-num">${d}</span>
      ${emoji ? `<span class="cal-day-emoji">${emoji}</span>` : ''}
      ${ferienName && !isHol && !type ? `<span class="cal-ferien-dot" title="${ferienName}"></span>` : ''}
    </div>`;
  }

  const lastDow = (new Date(currentYear, currentMonth, daysInMonth).getDay() + 6) % 7;
  for (let i = lastDow + 1; i < 7; i++) html += `<div class="cal-day cal-empty"></div>`;
  html += `</div>`;
  document.getElementById('calendar-grid').innerHTML = html;
}

function renderHolidays() {
  const monthPrefix = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}`;

  // Feiertage
  const monthHols = [...holidayMap.entries()].filter(([d]) => d.startsWith(monthPrefix));
  const holEl = document.getElementById('holiday-list');
  if (!monthHols.length) { holEl.innerHTML = '<div style="color:var(--text-muted)">Keine Feiertage</div>'; }
  else holEl.innerHTML = monthHols.map(([d, name]) => {
    const date = new Date(d + 'T12:00:00');
    return `<div style="margin-bottom:8px"><div style="font-weight:600;color:var(--text-primary)">${name}</div><div class="text-xs text-muted">${date.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})}</div></div>`;
  }).join('');

  // Schulferien — alle Perioden die in den aktuellen Monat reichen
  const monthStart = `${monthPrefix}-01`;
  const monthEnd   = `${monthPrefix}-${new Date(currentYear, currentMonth+1, 0).getDate()}`;
  const ferienImMonat = schulferienList.filter(f => f.start <= monthEnd && f.end >= monthStart);
  const ferienEl = document.getElementById('schulferien-list');
  if (!ferienImMonat.length) {
    ferienEl.innerHTML = '<div style="color:var(--text-muted)">Keine Schulferien</div>';
  } else {
    ferienEl.innerHTML = ferienImMonat.map(f => {
      const start = new Date(f.start + 'T12:00:00');
      const end   = new Date(f.end   + 'T12:00:00');
      const fmt = d => d.toLocaleDateString('de-DE', { day:'numeric', month:'short' });
      return `<div style="margin-bottom:8px;display:flex;align-items:flex-start;gap:8px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ferien-color,#f59e0b);margin-top:4px;flex-shrink:0"></span>
        <div><div style="font-weight:600;color:var(--text-primary)">${f.name}</div><div class="text-xs text-muted">${fmt(start)} – ${fmt(end)}</div></div>
      </div>`;
    }).join('');
  }
}

window.openDayModal = function(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const isHol = holidayMap.has(dateStr);
  const entry = entries.find(e => e.date === dateStr);
  const currentType = entry?.type || (isHol ? 'HOLIDAY' : null);

  const formatted = date.toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // Feiertage sind fix — kein manuelles Bearbeiten erlaubt
  if (isHol) {
    document.getElementById('day-modal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)closeDayModal()">
        <div class="modal slide-up">
          <div class="modal-title">🎉 Feiertag</div>
          <div class="modal-date">${formatted}</div>
          <div style="text-align:center;padding:16px 0;color:var(--text-muted);font-size:14px">
            <strong style="color:var(--text-primary)">${holidayMap.get(dateStr)}</strong><br>
            Dieser Tag wird automatisch als Feiertag gezählt.
          </div>
          <button class="btn btn-ghost" onclick="closeDayModal()" style="width:100%">Schließen</button>
        </div>
      </div>`;
    return;
  }

  // Nur nicht-Feiertag-Typen anzeigen
  const selectableTypes = Object.entries(DAY_TYPES).filter(([k]) => k !== 'HOLIDAY');

  document.getElementById('day-modal').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeDayModal()">
      <div class="modal slide-up">
        <div class="modal-title">Tag eintragen</div>
        <div class="modal-date">${formatted}</div>
        <div class="type-grid">
          ${selectableTypes.map(([k,v]) => `
            <button class="type-btn ${currentType===k?'active':''}" onclick="setDayType('${dateStr}','${k}')">
              <span class="type-emoji">${v.emoji}</span>${v.label}
            </button>`).join('')}
        </div>
        ${entry ? `<button class="btn-clear" onclick="clearDay('${dateStr}')">🗑 Eintrag löschen</button>` : ''}
      </div>
    </div>`;
};

window.closeDayModal = function() { document.getElementById('day-modal').innerHTML = ''; };

window.setDayType = async function(dateStr, type) {
  if (type === 'HOLIDAY' || holidayMap.has(dateStr)) { showToast('❌ Feiertage können nicht manuell eingetragen werden', 'error'); return; }
  const { error } = await supabase.from('attendance').upsert({
    member_id: profile.id, date: dateStr, type
  }, { onConflict: 'member_id,date' });

  if (error) { showToast('❌ Fehler beim Speichern', 'error'); return; }

  const idx = entries.findIndex(e => e.date === dateStr);
  if (idx >= 0) entries[idx].type = type; else entries.push({ date: dateStr, type });
  showToast(`✅ ${DAY_TYPES[type].emoji} ${DAY_TYPES[type].label} gespeichert`, 'success');
  closeDayModal();
  renderGrid();
};

window.clearDay = async function(dateStr) {
  const { error } = await supabase.from('attendance')
    .delete().eq('member_id', profile.id).eq('date', dateStr);
  if (error) { showToast('❌ Fehler beim Löschen', 'error'); return; }
  entries = entries.filter(e => e.date !== dateStr);
  showToast('🗑 Eintrag gelöscht', 'info');
  closeDayModal();
  renderGrid();
};
