import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthStats } from '../src/calculator.js';

test('ignoriert Büroeinträge an Feiertagen und Wochenenden', () => {
  const stats = calculateMonthStats([
    { date: '2026-05-01', type: 'OFFICE' },
    { date: '2026-05-02', type: 'OFFICE' },
    { date: '2026-05-04', type: 'OFFICE' },
  ], 2026, 4);
  assert.equal(stats.actualDays, 1);
});

test('zählt doppelte Datumswerte höchstens einmal', () => {
  const stats = calculateMonthStats([
    { date: '2026-08-03', type: 'OFFICE' },
    { date: '2026-08-03', type: 'OFFICE' },
  ], 2026, 7);
  assert.equal(stats.actualDays, 1);
});

test('ignoriert andere Monate und freie Teilzeittage', () => {
  const stats = calculateMonthStats([
    { date: '2026-08-03', type: 'OFFICE' },
    { date: '2026-08-04', type: 'OFFICE' },
    { date: '2026-09-01', type: 'OFFICE' },
  ], 2026, 7, null, [1]);
  assert.equal(stats.actualDays, 1);
});

test('verwendet die konfigurierte Zielquote', () => {
  const stats = calculateMonthStats([], 2026, 7, null, [1,2,3,4,5], 0.6);
  assert.equal(stats.requiredDays, Math.ceil(stats.netWorkingDays * 0.6));
});
