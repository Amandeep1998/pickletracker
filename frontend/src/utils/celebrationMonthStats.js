/** Parse YYYY-MM-DD (or ISO prefix) as a local calendar date — avoids UTC shift from `new Date("2026-05-03")`. */
export function parseLocalYmd(iso) {
  if (!iso) return null;
  const part = String(iso).split('T')[0];
  const [yStr, mStr, dStr] = part.split('-');
  const y = Number(yStr);
  const mo = Number(mStr) - 1;
  const da = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return null;
  const d = new Date(y, mo, da);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== da) return null;
  return d;
}

function inCalendarMonth(d, year, monthIndex) {
  return d && d.getFullYear() === year && d.getMonth() === monthIndex;
}

/**
 * Tournament spend & prizes for the calendar month of `refDate`, counting every
 * tournament that has at least one category day in that month.
 * Spend = sum of entry fees on days in that month + linked travel (once per tournament).
 * Prizes = sum of prize amounts on category days in that month.
 */
export function getCalendarMonthTournamentSpendTotals(tournaments, refDate = new Date()) {
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  let spend = 0;
  let prizeMoney = 0;
  let count = 0;

  for (const t of tournaments || []) {
    const cats = t.categories || [];
    let touchesMonth = false;
    let entryInMonth = 0;
    let prizeInMonth = 0;
    for (const c of cats) {
      const d = parseLocalYmd(c.date);
      if (!inCalendarMonth(d, y, m)) continue;
      touchesMonth = true;
      entryInMonth += Number(c.entryFee) || 0;
      prizeInMonth += Number(c.prizeAmount) || 0;
    }
    if (!touchesMonth) continue;
    count += 1;
    const travel = Number(t.travelExpense?.amount) || 0;
    spend += entryInMonth + travel;
    prizeMoney += prizeInMonth;
  }

  return { spend, prizeMoney, count };
}

/** Casual + drill session costs for the calendar month of `refDate` (excludes legacy `tournament` session type). */
export function getCalendarMonthCasualDrillSpendTotals(sessions, refDate = new Date()) {
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  let cost = 0;
  let count = 0;

  for (const s of sessions || []) {
    if (s.type !== 'casual' && s.type !== 'practice') continue;
    const d = parseLocalYmd(s.date);
    if (!inCalendarMonth(d, y, m)) continue;
    count += 1;
    cost += (Number(s.courtFee) || 0) + (Number(s.coachFee) || 0) + (Number(s.travelExpense?.total) || 0);
  }

  return { cost, count };
}

export function formatCelebrationMonthLabel(refDate = new Date()) {
  return refDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** First category day (local); used so celebration matches the tournament’s month, not “today”. */
export function celebrationMonthRefFromCategories(categories) {
  const dates = (categories || [])
    .map((c) => parseLocalYmd(c?.date))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return new Date();
  return dates[0];
}

/** Session row date → month for casual/drill totals copy. */
export function celebrationMonthRefFromSessionDate(dateStr) {
  return parseLocalYmd(dateStr) || new Date();
}
