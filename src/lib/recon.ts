/** Pure unit-conversion math, shared by the reconstitution calculator and vial tracking — no substance-specific data, just arithmetic on numbers the user supplies. */
export function computeConcentrationMcgPerMl(vialMg: number, diluentMl: number): number {
  return (vialMg * 1000) / diluentMl;
}

export function computeDrawMl(vialMg: number, diluentMl: number, doseAmount: number, doseUnit: 'mcg' | 'mg'): number {
  const concentration = computeConcentrationMcgPerMl(vialMg, diluentMl);
  const doseMcg = doseUnit === 'mg' ? doseAmount * 1000 : doseAmount;
  return doseMcg / concentration;
}
