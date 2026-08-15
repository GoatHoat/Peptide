export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Monday-start week containing `d`. */
export function startOfWeekMonday(d: Date): Date {
  const c = startOfDay(d);
  const dow = c.getDay(); // 0 = Sunday
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(c, -back);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (toISODate(d) === toISODate(new Date())) return 'Today';
  if (toISODate(d) === toISODate(addDays(new Date(), -1))) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Sunday-start weeks spanning the whole month, for a calendar grid. */
export function computeMonthGrid(monthDate: Date): Date[][] {
  const first = startOfMonth(monthDate);
  const gridStart = addDays(first, -first.getDay());
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const gridEnd = addDays(last, 6 - last.getDay());

  const rows: Date[][] = [];
  let cur = gridStart;
  while (cur <= gridEnd) {
    const row: Date[] = [];
    for (let i = 0; i < 7; i++) {
      row.push(cur);
      cur = addDays(cur, 1);
    }
    rows.push(row);
  }
  return rows;
}

export function parseHour(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

export function formatTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
