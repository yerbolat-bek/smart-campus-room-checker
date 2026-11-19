export const MIN_START_MINUTE = 0;
export const MIN_END_MINUTE = 1;
export const MINUTES_IN_DAY = 1440;
export const MAX_START_MINUTE = MINUTES_IN_DAY - 1;
export const MAX_DURATION_MINUTES = 120;

export function minutesToTime(min: number): string {
  const clamped = Math.max(MIN_START_MINUTE, Math.min(MINUTES_IN_DAY, Math.round(min)));
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export function timeToMinutes(hhmm: string): number | null {
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function isNumericInput(value: string): boolean {
  return value !== '' && /^\d+$/.test(value);
}
