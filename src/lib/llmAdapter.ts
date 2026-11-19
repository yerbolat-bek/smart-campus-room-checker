import { buildFallbackExplanation, toExplainResult, validateExplanation, type ExplainInput } from '@/lib/explain';

export const ADAPTER_TIMEOUT_MS = 3000;

export interface LlmAdapter {
  name: string;
  explain(input: ExplainInput): Promise<string>;
}

export interface MockAdapterOptions {
  /** When true, the adapter simulates a failure for tests. */
  fail?: boolean;
  /** When set, the adapter returns this raw text instead of building one, for output-validation tests. */
  rawOutput?: string;
  /** When set, overrides the simulated latency in ms. */
  delayMs?: number;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs} ms.`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * MOCK adapter — labeled mock, never calls a real API.
 * Builds the explanation deterministically from the structured data only.
 * Invalid or contradictory output falls back to the deterministic text.
 */
export function createMockAdapter(options: MockAdapterOptions = {}): LlmAdapter {
  return {
    name: 'mock',
    async explain(input: ExplainInput): Promise<string> {
      const run = (async () => {
        await delay(options.delayMs ?? 0);
        if (options.fail) {
          return buildFallbackExplanation(input);
        }
        const candidate = options.rawOutput ?? buildCandidateText(input);
        const validation = validateExplanation(candidate, input);
        if (!validation.ok) {
          return buildFallbackExplanation(input);
        }
        return validation.value;
      })();
      return withTimeout(run, ADAPTER_TIMEOUT_MS, 'Mock adapter');
    },
  };
}

/**
 * explainWithFallback — calls the adapter and falls back to the deterministic
 * text on any error, including a timeout. Rejects only if the fallback itself fails.
 */
export async function explainWithFallback(adapter: LlmAdapter, input: ExplainInput): Promise<string> {
  try {
    return await withTimeout(adapter.explain(input), ADAPTER_TIMEOUT_MS, `${adapter.name} adapter`);
  } catch {
    return buildFallbackExplanation(input);
  }
}

function buildCandidateText(input: ExplainInput): string {
  const result = toExplainResult(input);
  const room = result.roomLabel;
  switch (input.reasonCode) {
    case 'OK':
      return `The room ${room} is available from ${result.startLabel} to ${result.endLabel} because it does not overlap any existing booking.`;
    case 'IN_PAST':
      return `The room ${room} is not available from ${result.startLabel} to ${result.endLabel} because the start time is not after the current time.`;
    case 'INVALID_RANGE':
      return `The room ${room} is not available from ${result.startLabel} to ${result.endLabel} because the times do not form a valid interval.`;
    case 'END_OF_DAY':
      return `The room ${room} is not available from ${result.startLabel} to ${result.endLabel} because the end time is beyond the end of the day.`;
    case 'TOO_LONG':
      return `The room ${room} is not available from ${result.startLabel} to ${result.endLabel} because it exceeds the 120-minute maximum.`;
    case 'BLOCKED':
      return `The room ${room} is not available from ${result.startLabel} to ${result.endLabel} because the room is blocked.`;
    case 'OVERLAP':
      return `The room ${room} is not available from ${result.startLabel} to ${result.endLabel} because it overlaps an existing booking${result.conflictLabel ? ` (${result.conflictLabel})` : ''}.`;
    default:
      return buildFallbackExplanation(input);
  }
}
