import { useState } from 'react';
import { Building2, CalendarCheck, Clock3, CheckCircle2 } from 'lucide-react';
import { BOOKING_REASON, checkBooking } from '@/booking.js';
import { MAX_DURATION_MINUTES, minutesToTime, timeToMinutes } from '@/lib/availability';
import { TimeInput } from '@/components/TimeInput';
import { ResultPanel } from '@/components/ResultPanel';

const NOW_MINUTES = 540;
const NOW_LABEL = '09:00';
const SAMPLE_BOOKING = { start: 600, end: 660 };
const SAMPLE_BOOKING_LABEL = '10:00–11:00';

interface FieldErrors {
  start?: string;
  end?: string;
}

interface CheckResult {
  available: boolean;
  reason: string;
  reasonCode: string;
  conflict?: { start: number; end: number };
  startLabel: string;
  endLabel: string;
}

interface BookingCheck {
  code: string;
  conflict?: { start: number; end: number };
}

function validateFields(startStr: string, endStr: string): FieldErrors {
  const errors: FieldErrors = {};

  const startMin = timeToMinutes(startStr);
  if (startMin === null) {
    errors.start = 'Enter a time in HH:MM format (e.g. 11:00).';
  }

  const endMin = timeToMinutes(endStr);
  if (endMin === null) {
    errors.end = 'Enter a time in HH:MM format (e.g. 12:00).';
  }

  if (startMin !== null && endMin !== null && !errors.start && !errors.end) {
    if (endMin <= startMin) {
      errors.end = 'End time must be later than start time.';
    }
  }

  return errors;
}

function buildReason(check: BookingCheck, startMin: number, endMin: number): string {
  switch (check.code) {
    case BOOKING_REASON.OK:
      return `Available for a ${endMin - startMin}-minute booking from ${minutesToTime(startMin)} to ${minutesToTime(endMin)}.`;
    case BOOKING_REASON.INVALID_RANGE:
      return 'Start time must be earlier than end time.';
    case BOOKING_REASON.IN_PAST:
      return `Start time must be after the current time (${NOW_LABEL} — ${minutesToTime(NOW_MINUTES)}).`;
    case BOOKING_REASON.END_OF_DAY:
      return 'End time exceeds 24:00 (1440 minutes). Please use a valid time.';
    case BOOKING_REASON.TOO_LONG:
      return `Booking duration is ${endMin - startMin} minutes, which exceeds the ${MAX_DURATION_MINUTES}-minute maximum.`;
    case BOOKING_REASON.OVERLAP:
      return `The requested interval overlaps with the existing booking ${SAMPLE_BOOKING_LABEL} (${minutesToTime(check.conflict!.start)}–${minutesToTime(check.conflict!.end)}).`;
    default:
      return 'This room is unavailable for the requested time slot.';
  }
}

function App() {
  const [startStr, setStartStr] = useState('11:00');
  const [endStr, setEndStr] = useState('12:00');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<CheckResult | null>(null);

  const startMin = timeToMinutes(startStr);
  const endMin = timeToMinutes(endStr);
  const duration =
    startMin !== null && endMin !== null && endMin > startMin ? endMin - startMin : null;

  const handleCheck = () => {
    const fieldErrors = validateFields(startStr, endStr);
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setResult(null);
      return;
    }

    const s = timeToMinutes(startStr)!;
    const e = timeToMinutes(endStr)!;

    const check: BookingCheck = checkBooking({
      start: s,
      end: e,
      now: NOW_MINUTES,
      blocked: false,
      bookings: [SAMPLE_BOOKING],
    });

    setResult({
      available: check.code === BOOKING_REASON.OK,
      reason: buildReason(check, s, e),
      reasonCode: check.code,
      conflict: check.conflict,
      startLabel: startStr,
      endLabel: endStr,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <header className="mb-8 text-center sm:mb-10">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Smart Campus Room Availability
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Check whether the room is free for your requested time slot.
          </p>
        </header>

        {/* Main card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {/* Time inputs */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Clock3 size={17} className="text-slate-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Time Interval
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TimeInput
                label="Start time"
                value={startStr}
                onChange={(v) => {
                  setStartStr(v);
                  setErrors((e) => ({ ...e, start: undefined }));
                  setResult(null);
                }}
                placeholder="HH:MM"
                hint={startMin !== null ? `${minutesToTime(startMin)}${duration !== null ? ` · ${duration} min long` : ''}` : 'e.g. 11:00'}
                error={errors.start}
              />
              <TimeInput
                label="End time"
                value={endStr}
                onChange={(v) => {
                  setEndStr(v);
                  setErrors((e) => ({ ...e, end: undefined }));
                  setResult(null);
                }}
                placeholder="HH:MM"
                hint={endMin !== null ? `${minutesToTime(endMin)}${duration !== null ? ` · ${duration} min long` : ''}` : 'e.g. 12:00'}
                error={errors.end}
              />
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 px-3.5 py-2.5">
              <p className="text-xs text-slate-500">
                Current time is fixed at <span className="font-semibold text-slate-700">{NOW_LABEL}</span>.
                Start must be after this. Maximum booking duration is 120 minutes.
              </p>
            </div>

            {duration !== null && duration > MAX_DURATION_MINUTES && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                Duration is {duration} min — bookings longer than {MAX_DURATION_MINUTES} minutes will be rejected.
              </p>
            )}
          </section>

          {/* Check button */}
          <button
            type="button"
            onClick={handleCheck}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <CalendarCheck size={18} />
            Check availability
          </button>

          {/* Result */}
          {result && (
            <div className="mt-5">
              <ResultPanel
                available={result.available}
                reason={result.reason}
                reasonCode={result.reasonCode}
                conflict={result.conflict}
                startLabel={result.startLabel}
                endLabel={result.endLabel}
              />
            </div>
          )}
        </div>

        {/* Existing bookings */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-sm font-semibold text-slate-700">
            Current Schedule
          </h3>
          <ul className="mt-3 space-y-2">
            <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5">
              <span className="text-sm font-medium text-slate-700">Sample Booking</span>
              <span className="flex items-center gap-1.5 text-xs tabular-nums text-slate-500">
                <CheckCircle2 size={13} className="text-slate-300" />
                {SAMPLE_BOOKING_LABEL} · {minutesToTime(SAMPLE_BOOKING.start)}–{minutesToTime(SAMPLE_BOOKING.end)}
              </span>
            </li>
          </ul>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          All data is fictional sample data for demonstration purposes.
        </p>
      </div>
    </div>
  );
}

export default App;
