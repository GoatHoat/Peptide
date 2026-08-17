import { useState } from 'react';
import { computeRecon, drawFitsSyringe, type ReconInputs } from '../lib/recon';
import { NAME } from '../lib/brand';

/**
 * Three numbers in, one volume out.
 *
 * The person supplies what is in their vial, how much water they added, and the
 * dose they had already decided on. This converts between the units those are
 * written in. It suggests nothing, it is not attached to any product in the
 * catalogue, and it saves nothing — see `lib/recon.ts` for why each of those is
 * load-bearing rather than an omission.
 */
export function ReconCalculator() {
  const [inputs, setInputs] = useState<ReconInputs>({
    vialMg: '',
    diluentMl: '',
    doseAmount: '',
    doseUnit: 'mcg',
  });

  const set = (patch: Partial<ReconInputs>) => setInputs((prev) => ({ ...prev, ...patch }));
  const result = computeRecon(inputs);

  return (
    <div>
      <p className="t-body" style={{ color: 'var(--t2)', marginBottom: 18 }}>
        Your vial, your water, your dose. {NAME} converts between them and suggests none of them.
      </p>

      <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label className="t-label" htmlFor="recon-vial">
            In the vial
          </label>
          <div className="recon-input-row">
            <input
              id="recon-vial"
              className="field-input"
              inputMode="decimal"
              autoComplete="off"
              value={inputs.vialMg}
              onChange={(e) => set({ vialMg: e.target.value })}
              placeholder="5"
            />
            <span className="recon-unit">mg</span>
          </div>
        </div>

        <div className="field">
          <label className="t-label" htmlFor="recon-diluent">
            Water you added
          </label>
          <div className="recon-input-row">
            <input
              id="recon-diluent"
              className="field-input"
              inputMode="decimal"
              autoComplete="off"
              value={inputs.diluentMl}
              onChange={(e) => set({ diluentMl: e.target.value })}
              placeholder="2"
            />
            <span className="recon-unit">mL</span>
          </div>
        </div>

        <div className="field">
          <label className="t-label" htmlFor="recon-dose">
            Your dose
          </label>
          <div className="recon-input-row">
            <input
              id="recon-dose"
              className="field-input"
              inputMode="decimal"
              autoComplete="off"
              value={inputs.doseAmount}
              onChange={(e) => set({ doseAmount: e.target.value })}
              placeholder="250"
            />
            <div className="recon-unit-toggle" role="group" aria-label="Dose unit">
              {(['mcg', 'mg'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className={`recon-unit-btn ${inputs.doseUnit === unit ? 'active' : ''}`}
                  aria-pressed={inputs.doseUnit === unit}
                  onClick={() => set({ doseUnit: unit })}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>

      {/* The result block is rendered either way, at the height it will be, so
          the sheet does not grow under the finger as the third field is
          filled. */}
      <div className="recon-result" aria-live="polite">
        {result ? (
          <>
            <div className="recon-result-row">
              <span className="t-caption" style={{ color: 'var(--t3)' }}>
                Concentration
              </span>
              <span className="t-body-m">{result.concentrationMcgPerMl.toFixed(1)} mcg/mL</span>
            </div>
            <div className="recon-result-row">
              <span className="t-caption" style={{ color: 'var(--t3)' }}>
                Draw
              </span>
              <span className="t-body-m">{result.drawMl.toFixed(3)} mL</span>
            </div>
            <div className="recon-result-row">
              <span className="t-caption" style={{ color: 'var(--t3)' }}>
                On a U-100 syringe
              </span>
              <span className="recon-big">{result.units100.toFixed(1)} units</span>
            </div>
            {/* About the barrel, not about the dose. A tenth of a unit cannot
                be read off one and 120 does not fit in one, and both are worth
                knowing before drawing rather than after. */}
            {!drawFitsSyringe(result.units100) && (
              <p className="recon-note t-caption">
                {result.units100 > 100
                  ? 'That is more than one U-100 syringe holds.'
                  : 'That is below the smallest mark on a U-100 syringe.'}
              </p>
            )}
          </>
        ) : (
          <p className="recon-empty t-body">
            Fill in all three and the draw volume appears here.
          </p>
        )}
      </div>
    </div>
  );
}
