import { useState } from 'react';
import { computeConcentrationMcgPerMl, computeDrawMl } from '../lib/recon';

/**
 * Pure arithmetic on numbers the user supplies about their own vial and
 * their own already-decided dose — concentration and draw volume, nothing
 * more. The app has no opinion on vial size, diluent amount, or dose; it
 * only converts between units the user typed in. See legal.md.
 */
export function ReconCalculator() {
  const [vialMg, setVialMg] = useState('');
  const [diluentMl, setDiluentMl] = useState('');
  const [doseAmount, setDoseAmount] = useState('');
  const [doseUnit, setDoseUnit] = useState<'mcg' | 'mg'>('mcg');

  const vial = parseFloat(vialMg);
  const diluent = parseFloat(diluentMl);
  const dose = parseFloat(doseAmount);

  const valid = vial > 0 && diluent > 0 && dose > 0;

  let concentrationMcgPerMl = 0;
  let drawMl = 0;
  let units100 = 0;

  if (valid) {
    concentrationMcgPerMl = computeConcentrationMcgPerMl(vial, diluent);
    drawMl = computeDrawMl(vial, diluent, dose, doseUnit);
    units100 = drawMl * 100;
  }

  return (
    <div>
      <div className="t-body" style={{ color: 'var(--t2)', marginBottom: 18 }}>
        Enter your own vial size, how much you're diluting it with, and your own dose —
        this just does the math, it doesn't suggest any of these numbers.
      </div>

      <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label className="t-label" htmlFor="recon-vial">
            Peptide in the vial
          </label>
          <div className="recon-input-row">
            <input
              id="recon-vial"
              className="field-input"
              inputMode="decimal"
              value={vialMg}
              onChange={(e) => setVialMg(e.target.value)}
              placeholder="e.g. 5"
            />
            <span className="recon-unit">mg</span>
          </div>
        </div>

        <div className="field">
          <label className="t-label" htmlFor="recon-diluent">
            Diluent you're adding
          </label>
          <div className="recon-input-row">
            <input
              id="recon-diluent"
              className="field-input"
              inputMode="decimal"
              value={diluentMl}
              onChange={(e) => setDiluentMl(e.target.value)}
              placeholder="e.g. 2"
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
              value={doseAmount}
              onChange={(e) => setDoseAmount(e.target.value)}
              placeholder="e.g. 250"
            />
            <div className="recon-unit-toggle">
              <button
                type="button"
                className={`recon-unit-btn ${doseUnit === 'mcg' ? 'active' : ''}`}
                onClick={() => setDoseUnit('mcg')}
              >
                mcg
              </button>
              <button
                type="button"
                className={`recon-unit-btn ${doseUnit === 'mg' ? 'active' : ''}`}
                onClick={() => setDoseUnit('mg')}
              >
                mg
              </button>
            </div>
          </div>
        </div>
      </form>

      {valid ? (
        <div className="recon-result">
          <div className="recon-result-row">
            <span className="t-caption" style={{ color: 'var(--t3)' }}>
              Concentration
            </span>
            <span className="t-body-m">{concentrationMcgPerMl.toFixed(1)} mcg/mL</span>
          </div>
          <div className="recon-result-row">
            <span className="t-caption" style={{ color: 'var(--t3)' }}>
              Draw
            </span>
            <span className="t-body-m">{drawMl.toFixed(3)} mL</span>
          </div>
          <div className="recon-result-row">
            <span className="t-caption" style={{ color: 'var(--t3)' }}>
              On a U-100 insulin syringe
            </span>
            <span className="recon-big">{units100.toFixed(1)} units</span>
          </div>
        </div>
      ) : (
        <div className="empty-state t-body">Fill in all three to see your draw volume.</div>
      )}
    </div>
  );
}
