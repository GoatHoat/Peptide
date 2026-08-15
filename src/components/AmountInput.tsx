import { useState } from 'react';

const UNITS = ['mcg', 'mg', 'ml', 'units'] as const;
type Unit = (typeof UNITS)[number];

/**
 * Generic round numbers, identical regardless of which peptide is selected —
 * a tap-to-fill convenience, the same idea as a calculator's preset
 * percentages. Never framed as "typical" or "recommended": these aren't
 * doses the app is suggesting, they're numbers it's faster to tap than type.
 * Free entry is always available too.
 */
const QUICK_PICKS: Record<Unit, number[]> = {
  mcg: [50, 100, 150, 200, 250, 300, 500, 750, 1000],
  mg: [0.1, 0.25, 0.5, 1, 2, 5, 10],
  ml: [0.05, 0.1, 0.15, 0.2, 0.25, 0.5, 1],
  units: [5, 10, 15, 20, 25, 50],
};

function parseValue(value: string): { number: string; unit: Unit } {
  const match = value.trim().match(/^([\d.]*)\s*(mcg|mg|ml|units)?$/i);
  if (match && match[1]) {
    const unit = (match[2]?.toLowerCase() as Unit | undefined) ?? 'mcg';
    return { number: match[1], unit: UNITS.includes(unit) ? unit : 'mcg' };
  }
  return { number: '', unit: 'mcg' };
}

/** Strips anything that isn't a digit or a single decimal point — the fix for free text ("random letters") silently being accepted as a dose amount. */
function cleanNumber(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
}

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function AmountInput({ id, label, value, onChange }: Props) {
  const initial = parseValue(value);
  const [number, setNumber] = useState(initial.number);
  const [unit, setUnit] = useState<Unit>(initial.unit);

  const commit = (nextNumber: string, nextUnit: Unit) => {
    onChange(nextNumber ? `${nextNumber} ${nextUnit}` : '');
  };

  return (
    <div className="field">
      <label className="t-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field-input"
        inputMode="decimal"
        value={number}
        onChange={(e) => {
          const next = cleanNumber(e.target.value);
          setNumber(next);
          commit(next, unit);
        }}
        placeholder="0"
        required
      />

      <div className="stack-pick-row" style={{ marginTop: 4 }}>
        {UNITS.map((u) => (
          <button
            type="button"
            key={u}
            className={`stack-pick-chip pressable ${unit === u ? 'active' : ''}`}
            onClick={() => {
              setUnit(u);
              commit(number, u);
            }}
          >
            {u}
          </button>
        ))}
      </div>

      <div className="t-label" style={{ color: 'var(--t3)', marginTop: 12 }}>
        Quick picks
      </div>
      <div className="stack-pick-row" style={{ marginTop: 8 }}>
        {QUICK_PICKS[unit].map((q) => (
          <button
            type="button"
            key={q}
            className={`stack-pick-chip pressable ${number === String(q) ? 'active' : ''}`}
            onClick={() => {
              const next = String(q);
              setNumber(next);
              commit(next, unit);
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
