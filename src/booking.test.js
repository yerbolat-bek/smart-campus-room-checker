import { describe, it, expect } from 'vitest';
import { canBook, checkBooking, BOOKING_REASON } from './booking.js';

function fixture(overrides = {}) {
  return {
    now: 540,
    blocked: false,
    bookings: [{ start: 600, end: 660 }],
    ...overrides,
  };
}

describe('canBook', () => {
  it('T01: 660-720 true — touches existing booking endpoint, no overlap (AC4)', () => {
    expect(canBook(fixture({ start: 660, end: 720 }))).toBe(true);
  });

  it('T02: 540-570 false — start equals now, not after (AC1)', () => {
    expect(canBook(fixture({ start: 540, end: 570 }))).toBe(false);
  });

  it('T03: 720-720 false — start equals end (AC1)', () => {
    expect(canBook(fixture({ start: 720, end: 720 }))).toBe(false);
  });

  it('T04: 750-720 false — start after end (AC1)', () => {
    expect(canBook(fixture({ start: 750, end: 720 }))).toBe(false);
  });

  it('T05: 1380-1441 false — end exceeds 1440 (AC1)', () => {
    expect(canBook(fixture({ start: 1380, end: 1441 }))).toBe(false);
  });

  it('T06: 720-840 true — duration exactly 120 min, no overlap (AC2)', () => {
    expect(canBook(fixture({ start: 720, end: 840 }))).toBe(true);
  });

  it('T07: 720-841 false — duration 121 min exceeds 120 (AC2)', () => {
    expect(canBook(fixture({ start: 720, end: 841 }))).toBe(false);
  });

  it('T08: 570-600 true — touches existing booking start endpoint (AC4)', () => {
    expect(canBook(fixture({ start: 570, end: 600 }))).toBe(true);
  });

  it('T09: 630-690 false — overlaps existing booking (AC4)', () => {
    expect(canBook(fixture({ start: 630, end: 690 }))).toBe(false);
  });

  it('T10: 570-690 false — spans across existing booking (AC4)', () => {
    expect(canBook(fixture({ start: 570, end: 690 }))).toBe(false);
  });

  it('T11: 615-645 false — fully inside existing booking (AC4)', () => {
    expect(canBook(fixture({ start: 615, end: 645 }))).toBe(false);
  });

  it('T12: 600-660 false — identical to existing booking (AC4)', () => {
    expect(canBook(fixture({ start: 600, end: 660 }))).toBe(false);
  });

  it('T13: 660-720 blocked=true false — room is blocked (AC3)', () => {
    expect(canBook(fixture({ start: 660, end: 720, blocked: true }))).toBe(false);
  });

  it('T14: 630-690 bookings=[] true — no bookings to overlap (AC4)', () => {
    expect(canBook(fixture({ start: 630, end: 690, bookings: [] }))).toBe(true);
  });

  it('T15: 541-600 true — starts 1 minute after now (AC1)', () => {
    expect(canBook(fixture({ start: 541, end: 600 }))).toBe(true);
  });

  it('T16: 1380-1440 true — ends exactly at day end (AC1)', () => {
    expect(canBook(fixture({ start: 1380, end: 1440 }))).toBe(true);
  });

  it('T17: bookings array unchanged after call (AC5)', () => {
    const bookings = [{ start: 600, end: 660 }];
    const before = JSON.stringify(bookings);
    canBook({ start: 660, end: 720, now: 540, blocked: false, bookings });
    const after = JSON.stringify(bookings);
    expect(after).toBe(before);
  });

  it('T18: 541-661 true — start = now+1 with exactly 120 min duration, no bookings (AC1+AC2)', () => {
    expect(canBook(fixture({ start: 541, end: 661, bookings: [] }))).toBe(true);
  });

  it('T19: 660-720 true — fits exactly between two bookings (AC4)', () => {
    expect(
      canBook(
        fixture({
          start: 660,
          end: 720,
          bookings: [
            { start: 600, end: 660 },
            { start: 720, end: 780 },
          ],
        })
      )
    ).toBe(true);
  });

  it('T20: 700-740 false — overlaps only the second booking (AC4)', () => {
    expect(
      canBook(
        fixture({
          start: 700,
          end: 740,
          bookings: [
            { start: 600, end: 660 },
            { start: 720, end: 780 },
          ],
        })
      )
    ).toBe(false);
  });

  it('T21: 660-720 blocked=true bookings=[] false — blocked rejects even with no bookings (AC3)', () => {
    expect(
      canBook(fixture({ start: 660, end: 720, blocked: true, bookings: [] }))
    ).toBe(false);
  });
});

describe('checkBooking reason codes', () => {
  it('R01: 660-720 returns OK with no conflict (AC4 touching endpoint)', () => {
    expect(checkBooking(fixture({ start: 660, end: 720 }))).toEqual({ code: 'OK' });
  });

  it('R02: 660-720 blocked returns BLOCKED (AC3)', () => {
    expect(checkBooking(fixture({ start: 660, end: 720, blocked: true })).code).toBe(BOOKING_REASON.BLOCKED);
  });

  it('R03: 720-720 returns INVALID_RANGE (AC1 start must be before end)', () => {
    expect(checkBooking(fixture({ start: 720, end: 720 })).code).toBe(BOOKING_REASON.INVALID_RANGE);
  });

  it('R04: 750-720 reversed interval returns INVALID_RANGE (AC1)', () => {
    expect(checkBooking(fixture({ start: 750, end: 720 })).code).toBe(BOOKING_REASON.INVALID_RANGE);
  });

  it('R05: 540-570 start equals now returns IN_PAST (AC1)', () => {
    expect(checkBooking(fixture({ start: 540, end: 570 })).code).toBe(BOOKING_REASON.IN_PAST);
  });

  it('R06: 500-530 start before now returns IN_PAST (AC1 past time)', () => {
    expect(checkBooking(fixture({ start: 500, end: 530 })).code).toBe(BOOKING_REASON.IN_PAST);
  });

  it('R07: 1380-1441 returns END_OF_DAY (AC1)', () => {
    expect(checkBooking(fixture({ start: 1380, end: 1441 })).code).toBe(BOOKING_REASON.END_OF_DAY);
  });

  it('R08: 720-841 121-minute duration returns TOO_LONG (AC2)', () => {
    expect(checkBooking(fixture({ start: 720, end: 841 })).code).toBe(BOOKING_REASON.TOO_LONG);
  });

  it('R09: 720-840 exactly 120 minutes returns OK (AC2 boundary)', () => {
    expect(checkBooking(fixture({ start: 720, end: 840 })).code).toBe(BOOKING_REASON.OK);
  });

  it('R10: 630-690 overlap returns OVERLAP with the conflicting booking (AC4)', () => {
    const result = checkBooking(fixture({ start: 630, end: 690 }));
    expect(result.code).toBe(BOOKING_REASON.OVERLAP);
    expect(result.conflict).toEqual({ start: 600, end: 660 });
  });

  it('R11: 570-600 touching the start of a booking returns OK (AC4 touching endpoint)', () => {
    expect(checkBooking(fixture({ start: 570, end: 600 })).code).toBe(BOOKING_REASON.OK);
  });

  it('R12: blocked is checked before range and past rules (AC3)', () => {
    expect(checkBooking(fixture({ start: 750, end: 720, blocked: true })).code).toBe(BOOKING_REASON.BLOCKED);
  });

  it('R13: past time 500-530 is rejected by canBook (AC1 regression)', () => {
    expect(canBook(fixture({ start: 500, end: 530 }))).toBe(false);
  });

  it('R14: reversed interval 750-720 is rejected by canBook (AC1 regression)', () => {
    expect(canBook(fixture({ start: 750, end: 720 }))).toBe(false);
  });

  it('R15: 121-minute duration 720-841 is rejected by canBook (AC2 regression)', () => {
    expect(canBook(fixture({ start: 720, end: 841 }))).toBe(false);
  });

  it('R16: blocked room 660-720 is rejected by canBook (AC3 regression)', () => {
    expect(canBook(fixture({ start: 660, end: 720, blocked: true }))).toBe(false);
  });

  it('R17: overlap 630-690 is rejected by canBook (AC4 regression)', () => {
    expect(canBook(fixture({ start: 630, end: 690 }))).toBe(false);
  });

  it('R18: touching endpoints 660-720 are accepted by canBook (AC4 regression)', () => {
    expect(canBook(fixture({ start: 660, end: 720 }))).toBe(true);
  });

  it('R19: checkBooking does not mutate bookings or the conflict object (AC5)', () => {
    const list = [{ start: 600, end: 660 }];
    const before = JSON.stringify(list);
    const result = checkBooking({ start: 630, end: 690, now: 540, blocked: false, bookings: list });
    expect(JSON.stringify(list)).toBe(before);
    expect(result.conflict).toBe(list[0]);
  });

  it('R20: canBook returns only a boolean (AC5 output shape)', () => {
    expect(typeof canBook(fixture({ start: 660, end: 720 }))).toBe('boolean');
    expect(typeof canBook(fixture({ start: 630, end: 690 }))).toBe('boolean');
  });

  it('R21: fixture bookings are unchanged after an overlap check (AC5 regression)', () => {
    const list = [{ start: 600, end: 660 }, { start: 720, end: 780 }];
    const before = JSON.stringify(list);
    canBook({ start: 700, end: 740, now: 540, blocked: false, bookings: list });
    expect(JSON.stringify(list)).toBe(before);
  });
});
