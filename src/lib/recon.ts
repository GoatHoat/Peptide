/**
 * Unit conversion, and deliberately nothing else.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LINE THIS FILE MUST NOT CROSS. Every number here comes from the person
 * using the app: how much is in their vial, how much water they added, and the
 * dose they had already decided on before they opened this screen. The app
 * converts between the units those three numbers are expressed in. It does not
 * suggest any of them, it does not know what is in the vial, and it does not
 * store the answer.
 *
 * `legal.md` records why that distinction is the whole thing: the version that
 * was rejected served *protocols* — reconstitution ratios and amounts attached
 * to named peptides, so the app was the source of "how much". It was retried
 * with personal-use framing, with disclaimers, with direct study quotes and
 * behind an in-app browser, and every variation failed, because what is
 * evaluated is the function rather than the wording.
 *
 * A converter has no such function. It has no substance in it at all. Keep it
 * that way: no peptide argument, no default, no suggested range, no persistence.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** How much peptide ends up in each millilitre, in micrograms. */
export function computeConcentrationMcgPerMl(vialMg: number, diluentMl: number): number {
  return (vialMg * 1000) / diluentMl;
}

/** Millilitres to draw for a dose the user chose. */
export function computeDrawMl(
  vialMg: number,
  diluentMl: number,
  doseAmount: number,
  doseUnit: 'mcg' | 'mg',
): number {
  const concentration = computeConcentrationMcgPerMl(vialMg, diluentMl);
  const doseMcg = doseUnit === 'mg' ? doseAmount * 1000 : doseAmount;
  return doseMcg / concentration;
}

/**
 * The three inputs, read from what was typed.
 *
 * Returns null the moment anything is missing, zero, negative or not a number,
 * so a half-filled form shows nothing rather than `NaN`, `Infinity`, or a
 * confident figure derived from one field.
 */
export interface ReconInputs {
  vialMg: string;
  diluentMl: string;
  doseAmount: string;
  doseUnit: 'mcg' | 'mg';
}

export interface ReconResult {
  concentrationMcgPerMl: number;
  drawMl: number;
  /** the same volume on a U-100 insulin syringe, which is what is marked on it */
  units100: number;
}

const positive = (raw: string): number | null => {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function computeRecon(inputs: ReconInputs): ReconResult | null {
  const vial = positive(inputs.vialMg);
  const diluent = positive(inputs.diluentMl);
  const dose = positive(inputs.doseAmount);
  if (vial === null || diluent === null || dose === null) return null;

  const concentrationMcgPerMl = computeConcentrationMcgPerMl(vial, diluent);
  const drawMl = computeDrawMl(vial, diluent, dose, inputs.doseUnit);
  if (!Number.isFinite(concentrationMcgPerMl) || !Number.isFinite(drawMl)) return null;

  return { concentrationMcgPerMl, drawMl, units100: drawMl * 100 };
}

/**
 * Whether the draw is small enough to measure on the syringe it is marked for.
 *
 * Not a safety opinion about the dose — the app has none and must not acquire
 * one. It is a statement about the equipment: under a fifth of a unit cannot be
 * read off a U-100 barrel, and over 100 units does not fit in one.
 */
export function drawFitsSyringe(units100: number): boolean {
  return units100 >= 0.2 && units100 <= 100;
}
