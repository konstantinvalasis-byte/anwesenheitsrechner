import { getBWHolidays, isWeekend, dateKey } from './holidays.js';

export const DAY_TYPES = {
  OFFICE:   { label: 'Büro',         emoji: '🏢', color: '#6366f1', countsAsPresent: true,  reducesRequired: false },
  REMOTE:   { label: 'Mobil',        emoji: '🏠', color: '#64748b', countsAsPresent: false, reducesRequired: false },
  VACATION: { label: 'Urlaub',       emoji: '🌴', color: '#f59e0b', countsAsPresent: false, reducesRequired: true  },
  HOLIDAY:  { label: 'Feiertag',     emoji: '🎉', color: '#8b5cf6', countsAsPresent: false, reducesRequired: true  },
  FLEX:     { label: 'Gleittag',     emoji: '⏰', color: '#06b6d4', countsAsPresent: false, reducesRequired: true  },
  SICK:     { label: 'Krank',        emoji: '🤒', color: '#ef4444', countsAsPresent: false, reducesRequired: true  },
};

export const PRESENCE_TARGET = 0.5; // 50%

/**
 * Calculate attendance statistics for a given month
 * @param {Array} entries - Array of { date: 'YYYY-MM-DD', type: string }
 * @param {number} year
 * @param {number} month - 0-indexed
 */
export function calculateMonthStats(entries, year, month, toDate = null, workDays = [1,2,3,4,5]) {
  const holidayMap = getBWHolidays(year);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let totalWorkingDays = 0;
  let autoHolidays = [];

  // Count working days and find auto-holidays (bis toDate wenn angegeben)
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = dateKey(date);
    if (toDate && dateStr > toDate) break;
    const dayOfWeek = date.getDay();

    if (!workDays.includes(dayOfWeek)) continue; // skip non-working days (Wochenende + Teilzeit-freie Tage)

    if (holidayMap.has(dateStr)) {
      autoHolidays.push(dateStr);
    } else {
      totalWorkingDays++;
    }
  }

  // Count entries by type (nur bis toDate wenn angegeben)
  const counts = {
    OFFICE: 0,
    REMOTE: 0,
    VACATION: 0,
    HOLIDAY: 0,
    FLEX: 0,
    SICK: 0,
  };

  const entryMap = {};
  (entries || []).forEach(e => {
    if (toDate && e.date > toDate) return;
    if (counts.hasOwnProperty(e.type)) {
      counts[e.type]++;
    }
    entryMap[e.date] = e.type;
  });

  // Net working days = total working days - absence days (Feiertage werden automatisch über holidayMap berechnet)
  const absenceDays = counts.VACATION + counts.FLEX + counts.SICK;
  const netWorkingDays = Math.max(0, totalWorkingDays - absenceDays);

  // Required presence days (rounded up)
  const requiredDays = Math.ceil(netWorkingDays * PRESENCE_TARGET);

  // Actual presence days
  const actualDays = counts.OFFICE;

  // Percentage (of net working days)
  const percentage = netWorkingDays > 0 ? (actualDays / netWorkingDays) * 100 : 0;

  // Met target?
  const targetMet = actualDays >= requiredDays;

  return {
    totalWorkingDays,
    absenceDays,
    netWorkingDays,
    requiredDays,
    actualDays,
    percentage: Math.round(percentage),
    targetMet,
    counts,
    autoHolidays,
    entryMap,
  };
}

/**
 * Get display data for a day
 */
export function getDayDisplay(dateStr, entries, holidayMap) {
  const entry = entries.find(e => e.date === dateStr);
  const isHol = holidayMap.has(dateStr);
  const isWknd = isWeekend(dateStr);

  if (isWknd) return { type: 'WEEKEND', label: '', color: 'transparent' };
  if (isHol && !entry) return { type: 'HOLIDAY', label: holidayMap.get(dateStr), color: DAY_TYPES.HOLIDAY.color };
  if (entry) return { ...DAY_TYPES[entry.type], type: entry.type };
  return { type: 'NONE', label: '', color: 'transparent' };
}
