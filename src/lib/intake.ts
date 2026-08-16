import type { GlossaryEntry, NutrientReference } from './api';
import { isIron } from './recommend';

/**
 * Which reference intake applies to a person, and the one case where the app
 * does not know.
 *
 * Pure and synchronous, like `recommend.ts` — rows in, a figure out, no
 * fetching and nothing that cannot be read off the page.
 *
 * Iron is the one entry in the catalogue whose figure turns on something the
 * app is not told: 18 mg for someone who menstruates, 8 mg for someone who
 * does not. `age >= 51` used to stand in for that, which is wrong for anyone
 * 45-50, anyone with early menopause and anyone on continuous hormonal
 * contraception — and wrong in the direction that matters, because it halves
 * the figure. So the app says it depends, shows both, and offers the question
 * on the entry itself where the reason for asking is next to the number.
 */

/* ── the row that applies ────────────────────────────────────────────── */

/**
 * The row that applies to this person. Sex-specific first, then the 'any' row,
 * so a nutrient that differs by sex uses the right one and a nutrient that does
 * not still resolves.
 */
export function pickReference(
  rows: NutrientReference[] | undefined,
  age: number | null | undefined,
  sex: 'm' | 'f' | 'na' | null | undefined,
): NutrientReference | null {
  if (!rows?.length) return null;
  const band = age == null ? '19-50' : age < 19 ? '14-18' : age < 51 ? '19-50' : '51+';
  const s = sex === 'm' || sex === 'f' ? sex : 'any';
  return (
    rows.find((r) => r.age_band === band && r.sex === s) ??
    rows.find((r) => r.age_band === band && r.sex === 'any') ??
    rows.find((r) => r.age_band === '19-50' && r.sex === s) ??
    rows.find((r) => r.age_band === '19-50' && r.sex === 'any') ??
    null
  );
}

/* ── menstrual status ────────────────────────────────────────────────── */

/**
 * Whether to offer the question on this entry.
 *
 * Iron only, because nothing else in the catalogue has a figure that turns on
 * it. Not for men. Not for 13-18 year olds either: that band's figures carry
 * adolescent growth as well as menstruation, so there is no published "does
 * not menstruate" figure to pair with them and the app would be inventing one.
 *
 * Offered at 51+ as well as under it, even though the age proxy is usually
 * right there — someone who still menstruates at 52 is exactly the person the
 * proxy fails, and if the control is hidden they have no way to say so.
 */
export function offersMenstrualStatus(
  entry: GlossaryEntry,
  age: number | null | undefined,
  sex: 'm' | 'f' | 'na' | null | undefined,
): boolean {
  return isIron(entry) && sex !== 'm' && (age == null || age >= 19);
}

/**
 * Whether the figure is two figures. True where the question applies, we have
 * not been told, and the age proxy would otherwise pick the higher of the two.
 *
 * An unstated age counts, because every other figure in the app reads an
 * unstated age as 19-50. Unstated *sex* counts too: iron's rows are
 * sex-specific, so "prefer not to say" resolves to no figure at all today and
 * the entry reads "no set intake" — two figures are more use than none, and
 * both of them are right for someone.
 */
export function figureDependsOnMenstruation(
  entry: GlossaryEntry,
  age: number | null | undefined,
  sex: 'm' | 'f' | 'na' | null | undefined,
  menstruates: boolean | null | undefined,
): boolean {
  return menstruates == null && offersMenstrualStatus(entry, age, sex) && (age == null || age < 51);
}

/* ── the figure ──────────────────────────────────────────────────────── */

export interface Intake {
  /** the figure that applies, or null where none is established */
  rda: number | null;
  /**
   * The second figure, set only where menstrual status decides between two and
   * we have not been told which. `rda` is then the menstruating one.
   */
  rdaIfNot: number | null;
  ul: number | null;
  unit: string;
}

const NONE: Intake = { rda: null, rdaIfNot: null, ul: null, unit: '' };

const of = (row: NutrientReference): Intake => ({
  rda: row.rda,
  rdaIfNot: null,
  ul: row.ul,
  unit: row.unit,
});

export function resolveIntake(
  entry: GlossaryEntry,
  rows: NutrientReference[] | undefined,
  age: number | null | undefined,
  sex: 'm' | 'f' | 'na' | null | undefined,
  menstruates: boolean | null | undefined,
): Intake {
  if (!rows?.length) return NONE;

  if (offersMenstrualStatus(entry, age, sex)) {
    /* The two published figures. ODS drops the female RDA from 18 mg to 8 mg
       at 51 for one reason — menstruation has stopped — so the 51+ row is the
       same body without it, and an answer picks between them at any age. */
    const yes = rows.find((r) => r.age_band === '19-50' && r.sex === 'f');
    const no = rows.find((r) => r.age_band === '51+' && r.sex === 'f');
    if (yes?.rda != null && no?.rda != null) {
      if (menstruates === true) return of(yes);
      if (menstruates === false) return of(no);
      // Unanswered and under 51: both, rather than the higher one by default.
      // At 51+ the age proxy is left to stand — it is right for most people
      // there, and the control above is how the rest correct it.
      if (age == null || age < 51) return { rda: yes.rda, rdaIfNot: no.rda, ul: yes.ul, unit: yes.unit };
    }
  }

  const row = pickReference(rows, age, sex);
  return row ? of(row) : NONE;
}

/* ── how it reads ────────────────────────────────────────────────────── */

const amount = (n: number, unit: string) => `${n} ${unit}`;

/** "18 mg", or "18 or 8 mg" where we have not been told which applies. */
export function intakeLabel(intake: Intake): string | null {
  if (intake.rda == null) return null;
  return intake.rdaIfNot == null
    ? amount(intake.rda, intake.unit)
    : `${intake.rda} or ${amount(intake.rdaIfNot, intake.unit)}`;
}

export function limitLabel(intake: Intake): string | null {
  return intake.ul == null ? null : amount(intake.ul, intake.unit);
}

/**
 * The full sentence for the open card, which is where there is room to say it
 * depends. Same pattern as biotin's "no established upper limit" — the app is
 * allowed to say it does not know.
 */
export function intakeSentence(intake: Intake): string | null {
  if (intake.rda == null) return null;
  const target =
    intake.rdaIfNot == null
      ? `Daily target — ${amount(intake.rda, intake.unit)}.`
      : `Daily target — ${amount(intake.rda, intake.unit)} if you menstruate · ${amount(
          intake.rdaIfNot,
          intake.unit,
        )} if you don’t.`;
  const limit = limitLabel(intake);
  return limit ? `${target} Upper limit ${limit}.` : target;
}

/**
 * The question itself. Kept here with the rule that needs it, the way each
 * rule in `recommend.ts` carries its own reason — the answer is worth nothing
 * without the sentence saying why it was asked for.
 */
export const MENSTRUAL_QUESTION = {
  ask: 'Which applies to you?',
  options: [
    { id: 'yes', label: 'I menstruate', value: true },
    { id: 'no', label: 'I don’t', value: false },
    // Stored as null, the same as never having answered — both render the two
    // figures, and neither is a guess.
    { id: 'na', label: 'Prefer not to say', value: null },
  ],
  why: 'Iron is the only figure this changes. Age is a poor guess at it, so we ask instead of assuming.',
} as const;
