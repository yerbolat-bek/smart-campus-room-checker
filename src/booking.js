import { MAX_DURATION_MINUTES, MINUTES_IN_DAY } from '@/lib/availability';

export const BOOKING_REASON = Object.freeze({
  OK: 'OK',
  BLOCKED: 'BLOCKED',
  INVALID_RANGE: 'INVALID_RANGE',
  IN_PAST: 'IN_PAST',
  END_OF_DAY: 'END_OF_DAY',
  TOO_LONG: 'TOO_LONG',
  OVERLAP: 'OVERLAP',
});

/**
 * checkBooking — pure booking rule check returning a reason code.
 *
 * Rules (in order, first failure wins):
 * 1. BLOCKED: room is blocked.
 * 2. INVALID_RANGE: start >= end.
 * 3. IN_PAST: start <= now (start must be strictly after current time).
 * 4. END_OF_DAY: end > 1440.
 * 5. TOO_LONG: duration (end - start) > 120 minutes.
 * 6. OVERLAP: overlaps an existing booking. Overlap = start < b.end && end > b.start.
 *    Touching endpoints are allowed. `conflict` holds the first overlapping booking.
 * 7. OK: available.
 *
 * This function never mutates the bookings array.
 */
export function checkBooking({ start, end, now, blocked, bookings }) {
  if (blocked) return { code: BOOKING_REASON.BLOCKED };
  if (start >= end) return { code: BOOKING_REASON.INVALID_RANGE };
  if (start <= now) return { code: BOOKING_REASON.IN_PAST };
  if (end > MINUTES_IN_DAY) return { code: BOOKING_REASON.END_OF_DAY };
  if (end - start > MAX_DURATION_MINUTES) return { code: BOOKING_REASON.TOO_LONG };

  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    if (start < b.end && end > b.start) return { code: BOOKING_REASON.OVERLAP, conflict: b };
  }

  return { code: BOOKING_REASON.OK };
}

/**
 * canBook — pure booking availability check.
 *
 * @param {object} params
 * @param {number} params.start  - minutes after midnight
 * @param {number} params.end    - minutes after midnight
 * @param {number} params.now    - minutes after midnight (current time)
 * @param {boolean} params.blocked - room blocked flag
 * @param {Array<{start:number,end:number}>} params.bookings - existing bookings
 * @returns {boolean} true if the slot is available, false otherwise
 */
export function canBook(params) {
  return checkBooking(params).code === BOOKING_REASON.OK;
}
