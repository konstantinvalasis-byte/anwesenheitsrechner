/**
 * Baden-Württemberg Holiday Calculator
 * Includes all BW-specific public holidays
 */

/**
 * Calculates Easter Sunday using the Anonymous Gregorian Algorithm
 */
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns a Set of holiday date strings (YYYY-MM-DD) for Baden-Württemberg
 */
export function getBWHolidays(year) {
  const easter = calculateEaster(year);

  const holidays = [
    { date: new Date(year, 0, 1),   name: 'Neujahr' },
    { date: new Date(year, 0, 6),   name: 'Heilige Drei Könige' },
    { date: addDays(easter, -2),    name: 'Karfreitag' },
    { date: easter,                  name: 'Ostersonntag' },
    { date: addDays(easter, 1),     name: 'Ostermontag' },
    { date: new Date(year, 4, 1),   name: 'Tag der Arbeit' },
    { date: addDays(easter, 39),    name: 'Christi Himmelfahrt' },
    { date: addDays(easter, 49),    name: 'Pfingstsonntag' },
    { date: addDays(easter, 50),    name: 'Pfingstmontag' },
    { date: addDays(easter, 60),    name: 'Fronleichnam' },
    { date: new Date(year, 9, 3),   name: 'Tag der Deutschen Einheit' },
    { date: new Date(year, 10, 1),  name: 'Allerheiligen' },
    { date: new Date(year, 11, 25), name: '1. Weihnachtstag' },
    { date: new Date(year, 11, 26), name: '2. Weihnachtstag' },
  ];

  const map = new Map();
  holidays.forEach(h => map.set(dateKey(h.date), h.name));
  return map;
}

/**
 * Checks if a given date string (YYYY-MM-DD) is a BW holiday
 */
export function isHoliday(dateStr, holidayMap) {
  return holidayMap.has(dateStr);
}

/**
 * Returns the name of a BW holiday, or null
 */
export function getHolidayName(dateStr, holidayMap) {
  return holidayMap.get(dateStr) || null;
}

/**
 * Checks if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Returns all working days (Mon-Fri, excluding BW holidays) in a given month
 */
export function getWorkingDays(year, month) {
  const holidayMap = getBWHolidays(year);
  const days = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = dateKey(date);
    const dayOfWeek = date.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayMap.has(dateStr)) {
      days.push(dateStr);
    }
  }

  return days;
}

/**
 * BW Schulferien — hardcodierte Daten (offiziell für 2024/2025, vorläufig für 2026)
 */
const BW_SCHULFERIEN = [
  // 2024
  { name: 'Weihnachtsferien', start: '2024-12-23', end: '2025-01-04' },
  // 2025
  { name: 'Fastnachtsferien', start: '2025-03-03', end: '2025-03-05' },
  { name: 'Osterferien',       start: '2025-04-14', end: '2025-04-25' },
  { name: 'Pfingstferien',     start: '2025-06-07', end: '2025-06-21' },
  { name: 'Sommerferien',      start: '2025-07-31', end: '2025-09-13' },
  { name: 'Herbstferien',      start: '2025-10-27', end: '2025-10-31' },
  { name: 'Weihnachtsferien',  start: '2025-12-22', end: '2026-01-05' },
  // 2026 (vorläufig)
  { name: 'Fastnachtsferien', start: '2026-02-16', end: '2026-02-18' },
  { name: 'Osterferien',       start: '2026-03-30', end: '2026-04-11' },
  { name: 'Pfingstferien',     start: '2026-05-26', end: '2026-06-06' },
  { name: 'Sommerferien',      start: '2026-07-30', end: '2026-09-12' },
  { name: 'Herbstferien',      start: '2026-10-26', end: '2026-10-30' },
  { name: 'Weihnachtsferien',  start: '2026-12-23', end: '2027-01-04' },
  // 2027
  { name: 'Osterferien',       start: '2027-03-30', end: '2027-04-03' },
  { name: 'Pfingstferien',     start: '2027-05-18', end: '2027-05-29' },
  { name: 'Sommerferien',      start: '2027-07-29', end: '2027-09-11' },
  { name: 'Herbstferien',      start: '2027-11-02', end: '2027-11-06' },
  { name: 'Weihnachtsferien',  start: '2027-12-23', end: '2028-01-08' },
  // 2028
  { name: 'Osterferien',       start: '2028-04-18', end: '2028-04-22' },
  { name: 'Pfingstferien',     start: '2028-06-06', end: '2028-06-17' },
  { name: 'Sommerferien',      start: '2028-07-27', end: '2028-09-09' },
  { name: 'Herbstferien',      start: '2028-10-30', end: '2028-11-03' },
  { name: 'Weihnachtsferien',  start: '2028-12-23', end: '2029-01-05' },
];

/**
 * Gibt alle Schulferienperioden zurück, die das angegebene Jahr berühren
 */
export function getBWSchulferien(year) {
  return BW_SCHULFERIEN.filter(f => f.start.startsWith(`${year}`) || f.end.startsWith(`${year}`));
}

/**
 * Gibt den Feriennamen zurück, wenn dateStr in einer Ferienperiode liegt, sonst null
 */
export function getSchulferienName(dateStr, schulferienList) {
  for (const f of schulferienList) {
    if (dateStr >= f.start && dateStr <= f.end) return f.name;
  }
  return null;
}

export { dateKey };
