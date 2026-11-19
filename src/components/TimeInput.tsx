interface TimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
}

export function TimeInput({ label, value, onChange, placeholder = 'HH:MM', hint, error }: TimeInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={label} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={label}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={[
            'w-full rounded-lg border px-3.5 py-2.5 text-sm tabular-nums transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'placeholder:text-slate-300',
            error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white',
          ].join(' ')}
        />
      </div>
      {error ? (
        <p className="text-xs font-medium text-red-500">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}
