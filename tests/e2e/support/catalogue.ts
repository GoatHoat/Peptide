/**
 * The rows the stubbed Supabase serves.
 *
 * Deliberately tiny and deliberately obvious — every product is branded "Test
 * Brand" so that if one of these ever appears in the real app it is recognised
 * as fixture data on sight rather than mistaken for the catalogue. Shapes
 * mirror `supabase/migrations/0017_library_rebuild.sql`; no URL is invented,
 * so anything the UI would link out to is null.
 */

export type Row = Record<string, unknown>;

/** Same derivation as `toISODate` in src/lib/date.ts — local date, not UTC. */
function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const STUB_USER_ID = '00000000-0000-4000-8000-0000000000a1';
export const STUB_EMAIL = 'smoke@pepstack.test';

/** The product Today's seeded schedule item points at. */
export const SCHEDULED_PRODUCT = 'Test Brand Vitamin D3 2000 IU';

/**
 * Tagged for goals the onboarding run does not pick, so that when it turns up
 * first on the recommendations screen the only thing that can have put it
 * there is the no-meat rule in `src/lib/recommend.ts`.
 */
export const B12_PRODUCT = 'Test Brand Vitamin B12 Methylcobalamin';

const glossary: Row[] = [
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    slug: 'test-vitamin-d3',
    name: SCHEDULED_PRODUCT,
    category: 'other',
    mechanism_summary: 'A fat-soluble secosteroid involved in calcium absorption and immune signalling.',
    storage_notes: 'Store cool and dry.',
    route: 'oral',
    research_summary: 'Fixture row. Not a real label filing.',
    goal_tags: ['Skin', 'Immune'],
    search_keywords: ['vitamin d', 'd3'],
    kind: 'supplement',
    brand: 'Test Brand',
    product_form: 'Softgel Capsule',
    label_url: null,
    timing: 'with_food',
    timing_note: 'Fat-soluble, so it goes with a meal.',
    evidence: 'strong',
    ods_url: null,
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000002',
    slug: 'test-vitamin-e',
    name: 'Test Brand Vitamin E 400 IU',
    category: 'other',
    mechanism_summary: 'A family of tocopherols acting as chain-breaking antioxidants in cell membranes.',
    storage_notes: 'Store cool and dry. Protect from light.',
    route: 'oral',
    research_summary: 'Fixture row. Not a real label filing.',
    goal_tags: ['Anti-Aging', 'Skin'],
    search_keywords: ['vitamin e', 'tocopherol'],
    kind: 'supplement',
    brand: 'Test Brand',
    product_form: 'Softgel Capsule',
    label_url: null,
    timing: 'with_food',
    timing_note: null,
    evidence: 'mixed',
    ods_url: null,
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000003',
    slug: 'test-collagen',
    name: 'Test Brand Collagen Peptides Powder',
    category: 'cosmetic',
    mechanism_summary: 'Hydrolysed collagen, supplying glycine, proline and hydroxyproline.',
    storage_notes: 'Reseal after use.',
    route: 'oral',
    research_summary: 'Fixture row. Not a real label filing.',
    goal_tags: ['Skin', 'Anti-Aging'],
    search_keywords: ['collagen'],
    kind: 'supplement',
    brand: 'Test Brand',
    product_form: 'Powder',
    label_url: null,
    timing: 'any',
    timing_note: null,
    evidence: 'thin',
    ods_url: null,
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000004',
    slug: 'test-magnesium',
    name: 'Test Brand Magnesium Glycinate 200 mg',
    category: 'other',
    mechanism_summary: 'A chelated magnesium salt, used as a cofactor across several hundred enzymes.',
    storage_notes: 'Store cool and dry.',
    route: 'oral',
    research_summary: 'Fixture row. Not a real label filing.',
    goal_tags: ['Sleep', 'Mood'],
    search_keywords: ['magnesium', 'glycinate'],
    kind: 'supplement',
    brand: 'Test Brand',
    product_form: 'Capsule',
    label_url: null,
    timing: 'evening',
    timing_note: null,
    evidence: 'strong',
    ods_url: null,
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000005',
    slug: 'test-vitamin-b12',
    name: B12_PRODUCT,
    category: 'other',
    mechanism_summary: 'Cobalamin, a cofactor for methionine synthase and methylmalonyl-CoA mutase.',
    storage_notes: 'Store cool and dry. Protect from light.',
    route: 'oral',
    research_summary: 'Fixture row. Not a real label filing.',
    goal_tags: ['Energy', 'Focus'],
    search_keywords: ['b12', 'cobalamin'],
    kind: 'supplement',
    brand: 'Test Brand',
    product_form: 'Powder',
    label_url: null,
    timing: 'any',
    timing_note: null,
    evidence: 'strong',
    ods_url: null,
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000001',
    slug: 'test-peptide-recovery',
    name: 'Test Peptide (recovery)',
    category: 'healing',
    mechanism_summary: 'Fixture row so the Peptides tab has something to render.',
    storage_notes: 'Refrigerate once reconstituted.',
    route: 'injected',
    research_summary: 'Fixture row. Reference only — the app holds no amount for peptides.',
    goal_tags: ['Recovery', 'Injury'],
    search_keywords: ['recovery'],
    kind: 'peptide',
    brand: null,
    product_form: null,
    label_url: null,
    timing: null,
    timing_note: null,
    evidence: 'thin',
    ods_url: null,
  },
];

const nutrient_reference: Row[] = [
  { glossary_id: glossary[0].id, age_band: '19-50', sex: 'any', rda: 15, ul: 100, unit: 'mcg' },
  { glossary_id: glossary[0].id, age_band: '51+', sex: 'any', rda: 20, ul: 100, unit: 'mcg' },
  { glossary_id: glossary[3].id, age_band: '19-50', sex: 'any', rda: 400, ul: 350, unit: 'mg' },
];

/** The row the DB trigger would have created at signup. */
const profiles: Row[] = [
  {
    id: STUB_USER_ID,
    display_name: 'Smoke',
    notifications_per_day: 3,
    reduce_motion: false,
    larger_text: false,
    subscription_tier: 'free',
    blood_test_reminder: false,
    age: 34,
    sex: 'f',
    wake_time: '07:00:00',
    sleep_time: '23:00:00',
  },
];

/**
 * Every table the app reads, including the ones that are legitimately empty.
 * A table missing from here is reported as an unhandled call rather than
 * quietly answered with [], which is the whole point of the stub.
 */
export function makeTables(): Record<string, Row[]> {
  return {
    glossary: glossary.map((r) => ({ ...r })),
    glossary_research: [],
    nutrient_reference: nutrient_reference.map((r) => ({ ...r })),
    goal_synonyms: [],
    profiles: profiles.map((r) => ({ ...r })),
    doses: [],
    schedule_items: [],
    stacks: [],
    stack_items: [],
    progress_notes: [],
  };
}

/**
 * Column defaults the real tables fill in and an insert therefore omits.
 * Without these an inserted schedule item has no `active`, and every query
 * filtering on `active=eq.true` misses it — which looks exactly like the app
 * failing to save.
 */
export const INSERT_DEFAULTS: Record<string, Row> = {
  schedule_items: { active: true, injection_site: null, scheduled_time: null, glossary_id: null },
  doses: { taken: false, taken_at: null, notes: null, injection_site: null, schedule_item_id: null, glossary_id: null },
};

/** An active schedule item, so Today has something to materialise a dose from. */
export function seededScheduleItem(): Row {
  return {
    id: 'cccccccc-0000-4000-8000-000000000001',
    user_id: STUB_USER_ID,
    glossary_id: glossary[0].id,
    name: SCHEDULED_PRODUCT,
    amount: '15 mcg',
    scheduled_time: '08:00:00',
    injection_site: null,
    active: true,
    created_at: `${todayISO()}T06:00:00.000Z`,
    start_date: todayISO(),
  };
}
