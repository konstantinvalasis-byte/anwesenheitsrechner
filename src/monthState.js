// Geteilter Monat-Zustand — wird seitenübergreifend synchronisiert
const state = {
  year:  new Date().getFullYear(),
  month: new Date().getMonth(),
};

export function getMonthState() {
  return { year: state.year, month: state.month };
}

export function setMonthState(year, month) {
  state.year  = year;
  state.month = month;
}
