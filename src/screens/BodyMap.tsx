import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getInjectionSiteStats, type InjectionSiteStat } from '../lib/api';

/** Schematic, not anatomical — approximate marker positions on a simple front-view figure. */
const SITES: { key: string; label: string; x: number; y: number }[] = [
  { key: 'shoulder', label: 'Shoulder', x: 120, y: 58 },
  { key: 'upper arm', label: 'Upper arm', x: 122, y: 92 },
  { key: 'abdomen', label: 'Abdomen', x: 80, y: 112 },
  { key: 'glute', label: 'Glute', x: 58, y: 146 },
  { key: 'thigh', label: 'Thigh', x: 92, y: 172 },
];

function recencyLabel(stat: InjectionSiteStat | undefined): string {
  if (!stat) return 'Not used recently';
  const days = Math.round((Date.now() - new Date(stat.lastUsed + 'T00:00:00').getTime()) / 86_400_000);
  const when = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`;
  return `${when} · ${stat.count30d}× in 30 days`;
}

/** 0 (unused) to 1 (used today) — drives marker intensity. */
function recencyWeight(stat: InjectionSiteStat | undefined): number {
  if (!stat) return 0;
  const days = Math.round(
    (Date.now() - new Date(stat.lastUsed + 'T00:00:00').getTime()) / 86_400_000,
  );
  if (days <= 0) return 1;
  if (days >= 14) return 0.15;
  return 1 - (days / 14) * 0.85;
}

export function BodyMap() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, InjectionSiteStat> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (user) getInjectionSiteStats(user.id).then(setStats);
  }, [user?.id]);

  if (!user) return null;

  const active = selected ? SITES.find((s) => s.key === selected) : null;
  const activeStat = active ? stats?.[active.key] : undefined;

  return (
    <>
      <div className="divider">
        <span className="divider-line" />
        <span className="divider-text t-section">Injection Sites</span>
        <span className="divider-line" />
      </div>

      <div className="bodymap-card">
        <svg viewBox="0 0 160 260" className="bodymap-figure" aria-hidden>
          <circle cx="80" cy="24" r="16" fill="none" stroke="var(--t4)" strokeWidth="2" />
          <rect x="56" y="44" width="48" height="90" rx="20" fill="none" stroke="var(--t4)" strokeWidth="2" />
          <rect x="30" y="50" width="16" height="80" rx="8" fill="none" stroke="var(--t4)" strokeWidth="2" />
          <rect x="114" y="50" width="16" height="80" rx="8" fill="none" stroke="var(--t4)" strokeWidth="2" />
          <rect x="58" y="134" width="20" height="110" rx="10" fill="none" stroke="var(--t4)" strokeWidth="2" />
          <rect x="82" y="134" width="20" height="110" rx="10" fill="none" stroke="var(--t4)" strokeWidth="2" />

          {SITES.map((site) => {
            const weight = recencyWeight(stats?.[site.key]);
            const isSelected = selected === site.key;
            return (
              <g
                key={site.key}
                onClick={() => setSelected(isSelected ? null : site.key)}
                style={{ cursor: 'pointer' }}
              >
                {weight > 0 && (
                  <circle cx={site.x} cy={site.y} r="11" fill="var(--purple)" opacity={weight * 0.35} />
                )}
                <circle
                  cx={site.x}
                  cy={site.y}
                  r={isSelected ? 7 : 5.5}
                  fill={weight > 0 ? 'var(--purple)' : 'var(--card-hi)'}
                  opacity={weight > 0 ? Math.max(weight, 0.4) : 1}
                  stroke={isSelected ? 'var(--t1)' : 'none'}
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>

        <div className="bodymap-legend">
          {SITES.map((site) => (
            <button
              key={site.key}
              className={`bodymap-chip pressable ${selected === site.key ? 'active' : ''}`}
              onClick={() => setSelected(selected === site.key ? null : site.key)}
            >
              {site.label}
            </button>
          ))}
        </div>

        {active && (
          <div className="bodymap-detail t-caption">
            <strong>{active.label}</strong> — {recencyLabel(activeStat)}
          </div>
        )}
      </div>
    </>
  );
}
