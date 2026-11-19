import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkBooking, BOOKING_REASON } from '@/booking.js';
import {
  validateExplainInput,
  buildFallbackExplanation,
  validateExplanation,
  REASON_CODES,
} from '@/lib/explain';
import { createMockAdapter, explainWithFallback, ADAPTER_TIMEOUT_MS } from '@/lib/llmAdapter';

function fixture(overrides = {}) {
  return {
    roomLabel: 'Smart Campus Room',
    startLabel: '11:00',
    endLabel: '12:00',
    isAvailable: true,
    reasonCode: 'OK',
    ...overrides,
  };
}

describe('validateExplainInput', () => {
  it('E01: accepts a valid input', () => {
    const result = validateExplainInput(fixture());
    expect(result.ok).toBe(true);
  });

  it('E02: rejects empty roomLabel', () => {
    expect(validateExplainInput(fixture({ roomLabel: '' })).ok).toBe(false);
  });

  it('E03: rejects non-string startLabel', () => {
    expect(validateExplainInput(fixture({ startLabel: 600 })).ok).toBe(false);
  });

  it('E04: rejects empty endLabel', () => {
    expect(validateExplainInput(fixture({ endLabel: '   ' })).ok).toBe(false);
  });

  it('E05: rejects roomLabel over 50 characters', () => {
    expect(validateExplainInput(fixture({ roomLabel: 'x'.repeat(51) })).ok).toBe(false);
  });

  it('E06: accepts roomLabel of exactly 50 characters', () => {
    expect(validateExplainInput(fixture({ roomLabel: 'x'.repeat(50) })).ok).toBe(true);
  });

  it('E07: rejects an unknown reasonCode', () => {
    expect(validateExplainInput(fixture({ reasonCode: 'MAYBE' })).ok).toBe(false);
  });

  it('E08: rejects isAvailable=true when reasonCode is not OK', () => {
    expect(validateExplainInput(fixture({ isAvailable: true, reasonCode: 'TOO_LONG' })).ok).toBe(false);
  });

  it('E09: rejects isAvailable=false when reasonCode is OK', () => {
    expect(validateExplainInput(fixture({ isAvailable: false })).ok).toBe(false);
  });

  it('E10: rejects non-boolean isAvailable', () => {
    expect(validateExplainInput(fixture({ isAvailable: 'yes' })).ok).toBe(false);
  });

  it('E11: rejects null input', () => {
    expect(validateExplainInput(null).ok).toBe(false);
  });
});

describe('buildFallbackExplanation', () => {
  it('E12: OK produces the available text', () => {
    const text = buildFallbackExplanation(fixture());
    expect(text).toContain('free');
    expect(text).toContain('11:00');
  });

  it.each(REASON_CODES.filter((c) => c !== 'OK'))(
    'E13: %s produces the unavailable text',
    (code) => {
      const text = buildFallbackExplanation(
        fixture({ reasonCode: code, isAvailable: false, conflict: { start: 600, end: 660 } })
      );
      expect(text).toContain('unavailable');
    }
  );

  it('E14: invalid input produces the deterministic generic text', () => {
    const text = buildFallbackExplanation(fixture({ reasonCode: 'NOPE' }));
    expect(text).toBe('This room is unavailable for the requested time slot.');
  });
});

describe('validateExplanation', () => {
  it('E15: accepts a valid one-sentence explanation', () => {
    const result = validateExplanation('The room is available all morning.', fixture());
    expect(result.ok).toBe(true);
  });

  it('E16: rejects an empty explanation', () => {
    expect(validateExplanation('   ', fixture()).ok).toBe(false);
  });

  it('E17: rejects an explanation over 300 characters', () => {
    expect(validateExplanation('a'.repeat(301), fixture()).ok).toBe(false);
  });

  it('E18: accepts an explanation of exactly 300 characters', () => {
    expect(validateExplanation(`Available. ${'a'.repeat(289)}`, fixture()).ok).toBe(true);
  });

  it('E19: rejects more than 2 sentences', () => {
    expect(validateExplanation('One. Two. Three.', fixture()).ok).toBe(false);
  });

  it('E20: accepts exactly 2 sentences', () => {
    expect(validateExplanation('The room is available. It is free.', fixture()).ok).toBe(true);
  });

  it('E21: rejects available text when isAvailable is false', () => {
    const result = validateExplanation('The room is available now.', fixture({ isAvailable: false, reasonCode: 'BLOCKED' }));
    expect(result.ok).toBe(false);
  });

  it('E22: rejects unavailable text when isAvailable is true', () => {
    const result = validateExplanation('The room is unavailable.', fixture());
    expect(result.ok).toBe(false);
  });
});

describe('mock adapter', () => {
  it('E23: builds an explanation from structured data only', async () => {
    const adapter = createMockAdapter();
    const text = await adapter.explain(fixture());
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
    expect(adapter.name).toBe('mock');
  });

  it('E24: simulated failure falls back to the deterministic text', async () => {
    const adapter = createMockAdapter({ fail: true });
    const text = await adapter.explain(fixture());
    expect(text).toBe(buildFallbackExplanation(fixture()));
  });

  it('E25: invalid model output falls back to the deterministic text', async () => {
    const adapter = createMockAdapter({ rawOutput: 'The room is unavailable.' });
    const text = await adapter.explain(fixture());
    expect(text).toBe(buildFallbackExplanation(fixture()));
  });

  it('E26: an adapter slower than the timeout rejects', async () => {
    const adapter = createMockAdapter({ delayMs: ADAPTER_TIMEOUT_MS + 50 });
    await expect(adapter.explain(fixture())).rejects.toThrow(/timed out/);
  }, 10000);

  it('E27: the timeout constant is 3 seconds', () => {
    expect(ADAPTER_TIMEOUT_MS).toBe(3000);
  });
});

describe('new review tests', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('E31a: mock adapter text for each non-OK reason code passes validation and is returned, not the fallback', async () => {
    for (const code of REASON_CODES.filter((c) => c !== 'OK')) {
      const input = fixture({
        reasonCode: code,
        isAvailable: false,
        conflict: { start: 600, end: 660 },
      });
      const adapter = createMockAdapter();
      const text = await adapter.explain(input);
      expect(validateExplanation(text, input).ok).toBe(true);
      expect(text).not.toBe(buildFallbackExplanation(input));
    }
  });

  it('E31b: "The room is not available." is rejected when isAvailable is true', () => {
    const result = validateExplanation('The room is not available.', fixture());
    expect(result.ok).toBe(false);
  });

  it('E31c: an OK text using "free" is accepted', () => {
    const result = validateExplanation('The room is free at that time.', fixture());
    expect(result.ok).toBe(true);
  });

  it('E31d: explainWithFallback returns the fallback when the adapter rejects', async () => {
    const failing = {
      name: 'failing',
      explain: () => Promise.reject(new Error('boom')),
    };
    const input = fixture({ reasonCode: 'BLOCKED', isAvailable: false });
    const text = await explainWithFallback(failing, input);
    expect(text).toBe(buildFallbackExplanation(input));
  });

  it('E31e: explainWithFallback returns the fallback on timeout', async () => {
    vi.useFakeTimers();
    const slow = {
      name: 'slow',
      explain: (input) => new Promise((resolve) => setTimeout(() => resolve('The room is available.'), ADAPTER_TIMEOUT_MS + 1000)),
    };
    const input = fixture({ reasonCode: 'BLOCKED', isAvailable: false });
    const promise = explainWithFallback(slow, input);
    await vi.advanceTimersByTimeAsync(ADAPTER_TIMEOUT_MS + 1100);
    const text = await promise;
    expect(text).toBe(buildFallbackExplanation(input));
  });
});

describe('checkBooking unchanged', () => {
  it('E28: OK case output shape is unchanged', () => {
    expect(
      checkBooking({ start: 660, end: 720, now: 540, blocked: false, bookings: [{ start: 600, end: 660 }] })
    ).toEqual({ code: BOOKING_REASON.OK });
  });

  it('E29: OVERLAP case output shape is unchanged', () => {
    const result = checkBooking({ start: 630, end: 690, now: 540, blocked: false, bookings: [{ start: 600, end: 660 }] });
    expect(result.code).toBe(BOOKING_REASON.OVERLAP);
    expect(result.conflict).toEqual({ start: 600, end: 660 });
  });

  it('E30: every reason code still resolves as before', () => {
    const base = { now: 540, blocked: false, bookings: [{ start: 600, end: 660 }] };
    expect(checkBooking({ ...base, start: 540, end: 570 }).code).toBe(BOOKING_REASON.IN_PAST);
    expect(checkBooking({ ...base, start: 750, end: 720 }).code).toBe(BOOKING_REASON.INVALID_RANGE);
    expect(checkBooking({ ...base, start: 1380, end: 1441 }).code).toBe(BOOKING_REASON.END_OF_DAY);
    expect(checkBooking({ ...base, start: 720, end: 841 }).code).toBe(BOOKING_REASON.TOO_LONG);
    expect(checkBooking({ ...base, start: 660, end: 720, blocked: true }).code).toBe(BOOKING_REASON.BLOCKED);
  });
});
