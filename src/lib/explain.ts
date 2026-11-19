import { minutesToTime } from '@/lib/availability';

export interface ExplainInput {
  roomLabel: string;
  startLabel: string;
  endLabel: string;
  isAvailable: boolean;
  reasonCode: string;
  conflict?: { start: number; end: number };
}

export interface ExplainResult {
  input: ExplainInput;
  available: boolean;
  startLabel: string;
  endLabel: string;
  roomLabel: string;
  conflictLabel: string | null;
}

export const REASON_CODES = ['OK', 'IN_PAST', 'INVALID_RANGE', 'END_OF_DAY', 'TOO_LONG', 'BLOCKED', 'OVERLAP'] as const;

export const MAX_ROOM_LABEL_LENGTH = 50;
export const MAX_EXPLANATION_LENGTH = 300;
export const MAX_SENTENCES = 2;

export function validateExplainInput(input: unknown): { ok: true; value: ExplainInput } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Input must be an object.' };
  }
  const data = input as Record<string, unknown>;

  for (const key of ['roomLabel', 'startLabel', 'endLabel', 'reasonCode'] as const) {
    const value = data[key];
    if (typeof value !== 'string' || value.trim() === '') {
      return { ok: false, error: `${key} must be a non-empty string.` };
    }
  }
  if (typeof data.isAvailable !== 'boolean') {
    return { ok: false, error: 'isAvailable must be a boolean.' };
  }
  if (typeof data.roomLabel === 'string' && data.roomLabel.length > MAX_ROOM_LABEL_LENGTH) {
    return { ok: false, error: `roomLabel must be at most ${MAX_ROOM_LABEL_LENGTH} characters.` };
  }
  if (!(REASON_CODES as readonly string[]).includes(data.reasonCode as string)) {
    return { ok: false, error: `reasonCode must be one of: ${REASON_CODES.join(', ')}.` };
  }
  const isAvailable = data.isAvailable as boolean;
  const reasonCode = data.reasonCode as string;
  if (isAvailable !== (reasonCode === 'OK')) {
    return { ok: false, error: 'isAvailable must match reasonCode === OK.' };
  }
  if (reasonCode === 'OVERLAP') {
    const conflict = data.conflict as { start?: unknown; end?: unknown } | undefined;
    if (
      !conflict ||
      typeof conflict !== 'object' ||
      typeof conflict.start !== 'number' ||
      typeof conflict.end !== 'number'
    ) {
      return { ok: false, error: 'OVERLAP requires a conflict with numeric start and end.' };
    }
  }

  return { ok: true, value: input as ExplainInput };
}

export function toExplainResult(input: ExplainInput): ExplainResult {
  return {
    input,
    available: input.isAvailable,
    startLabel: input.startLabel,
    endLabel: input.endLabel,
    roomLabel: input.roomLabel,
    conflictLabel:
      input.reasonCode === 'OVERLAP' && input.conflict
        ? `${minutesToTime(input.conflict.start)}–${minutesToTime(input.conflict.end)}`
        : null,
  };
}

const FALLBACK_TEXT: Record<string, (r: ExplainResult) => string> = {
  OK: (r) =>
    `The room ${r.roomLabel} is free from ${r.startLabel} to ${r.endLabel}. It does not overlap any existing booking.`,
  IN_PAST: (r) =>
    `The start time for ${r.roomLabel} is not after the current time, so the slot from ${r.startLabel} to ${r.endLabel} is unavailable.`,
  INVALID_RANGE: (r) =>
    `The start and end times for ${r.roomLabel} do not form a valid interval, so the slot from ${r.startLabel} to ${r.endLabel} is unavailable.`,
  END_OF_DAY: (r) =>
    `The end time for ${r.roomLabel} is beyond the end of the day, so the slot from ${r.startLabel} to ${r.endLabel} is unavailable.`,
  TOO_LONG: (r) =>
    `The slot from ${r.startLabel} to ${r.endLabel} is longer than the 120-minute maximum for ${r.roomLabel}, so it is unavailable.`,
  BLOCKED: (r) =>
    `The room ${r.roomLabel} is blocked, so the slot from ${r.startLabel} to ${r.endLabel} is unavailable.`,
  OVERLAP: (r) =>
    `The slot from ${r.startLabel} to ${r.endLabel} overlaps an existing booking${r.conflictLabel ? ` (${r.conflictLabel})` : ''} in ${r.roomLabel}, so it is unavailable.`,
};

export function buildFallbackExplanation(input: ExplainInput): string {
  const check = validateExplainInput(input);
  if (!check.ok) {
    return 'This room is unavailable for the requested time slot.';
  }
  const result = toExplainResult(check.value);
  const builder = FALLBACK_TEXT[check.value.reasonCode];
  return builder ? builder(result) : 'This room is unavailable for the requested time slot.';
}

function countSentences(text: string): number {
  return text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length;
}

export function validateExplanation(
  text: string,
  input: ExplainInput
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'Explanation must be a non-empty string.' };
  }
  if (text.length > MAX_EXPLANATION_LENGTH) {
    return { ok: false, error: `Explanation must be at most ${MAX_EXPLANATION_LENGTH} characters.` };
  }
  if (countSentences(text) > MAX_SENTENCES) {
    return { ok: false, error: `Explanation must be at most ${MAX_SENTENCES} sentences.` };
  }
  const lower = text.toLowerCase();
  const hasNegative =
    lower.includes('unavailable') ||
    lower.includes('not available') ||
    lower.includes('not free');
  const saysAvailable = !hasNegative && (lower.includes('available') || lower.includes('free'));
  if (saysAvailable !== input.isAvailable) {
    return { ok: false, error: 'Explanation contradicts the availability status.' };
  }
  return { ok: true, value: text.trim() };
}
