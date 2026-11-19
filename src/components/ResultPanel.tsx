import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { validateExplainInput, buildFallbackExplanation, type ExplainInput } from '@/lib/explain';
import { createMockAdapter, explainWithFallback } from '@/lib/llmAdapter';

interface ResultPanelProps {
  available: boolean;
  reason: string;
  reasonCode: string;
  conflict?: { start: number; end: number };
  startLabel: string;
  endLabel: string;
}

export function ResultPanel({ available, reason, reasonCode, conflict, startLabel, endLabel }: ResultPanelProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    setLoading(true);
    setExplainError(null);
    setExplanation(null);

    const input: ExplainInput = {
      roomLabel: 'Smart Campus Room',
      startLabel,
      endLabel,
      isAvailable: available,
      reasonCode,
      conflict,
    };

    try {
      const check = validateExplainInput(input);
      if (!check.ok) {
        setExplanation('This room is unavailable for the requested time slot.');
        return;
      }
      const adapter = createMockAdapter();
      let text: string;
      try {
        text = await explainWithFallback(adapter, check.value);
      } catch {
        text = buildFallbackExplanation(check.value);
      }
      setExplanation(text);
    } catch {
      setExplainError('Could not generate the explanation. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={[
        'animate-[fadeInUp_0.3s_ease-out] rounded-xl border p-5',
        available ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            available ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white',
          ].join(' ')}
        >
          {available ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={[
              'text-lg font-bold',
              available ? 'text-emerald-900' : 'text-red-900',
            ].join(' ')}
          >
            {available ? 'Available' : 'Unavailable'}
          </p>
          <p
            className={[
              'mt-0.5 text-sm leading-relaxed',
              available ? 'text-emerald-700' : 'text-red-700',
            ].join(' ')}
          >
            {reason}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium',
                available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
              ].join(' ')}
            >
              <Clock size={13} />
              {startLabel}–{endLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleExplain}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {loading ? 'Generating…' : 'Explain availability'}
          </button>

          {(explanation || explainError) && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                AI-generated explanation (Mock mode), not a booking confirmation
              </p>
              {explainError ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-relaxed text-amber-700">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  {explainError}
                </p>
              ) : (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{explanation}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
