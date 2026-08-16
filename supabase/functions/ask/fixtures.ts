/**
 * The canned responses.
 *
 * Two jobs, not one:
 *
 *  1. When `ANTHROPIC_API_KEY` is unset — which is how this repo ships, and how
 *     it should stay until somebody deliberately sets it — every question is
 *     answered from here. That makes the whole chat surface exercisable without
 *     a key, a bill or a network call.
 *  2. The peptide and pregnancy answers are used **whether or not a key is
 *     set**. Those two questions are refused by the server before the model
 *     runs, so the wording of the refusal lives here rather than being
 *     something the model improvises differently each time.
 *
 * The three products named below come from migrations 0021 and 0022, which are
 * written and not applied. `buildCards` resolves them against the live
 * catalogue first and falls back to the copies here, so the stub renders a
 * complete card either way — with real timing and evidence once those
 * migrations have been run, and without them until then.
 */

import type { AskCitation, AskErrorBody, AskScope, CatalogueEntry, RequestedCard } from './lib.ts';

export interface AnswerFixture {
  answer: string;
  cards: RequestedCard[];
  /** stand-in glossary rows, used only when the slug is not in the catalogue */
  products: CatalogueEntry[];
  citations: Record<string, AskCitation[]>;
}

export interface ErrorFixture {
  status: number;
  body: AskErrorBody;
}

export type AnswerFixtureKey = 'normal' | 'peptide' | 'pregnancy';
export type ErrorFixtureKey = 'rate_limit' | 'server_error';
export type FixtureKey = AnswerFixtureKey | ErrorFixtureKey;

/**
 * Phrases that drive the stub into its two error states. They are read **only
 * when there is no API key**, so they cannot exist in a deployment that is
 * actually answering questions. Without them the only way to see the rate-limit
 * screen is to ask fifteen questions, and the only way to see the error screen
 * is to break the server.
 */
export const STUB_TRIGGERS: Record<ErrorFixtureKey, string> = {
  rate_limit: 'test rate limit',
  server_error: 'test server error',
};

const SKIN: string[] = ['Skin'];

function product(
  slug: string,
  name: string,
  brand: string,
  form: string,
  mechanism: string,
  labelUrl: string,
): CatalogueEntry {
  return {
    slug,
    name,
    brand,
    product_form: form,
    goal_tags: SKIN,
    kind: 'supplement',
    // The 176 products in 0021 carry no timing or evidence — the 74 older rows
    // are the only ones with those columns filled in. Null here is what the
    // database would return, not a gap in the fixture.
    timing: null,
    timing_note: null,
    evidence: null,
    mechanism_summary: mechanism,
    label_url: labelUrl,
    ods_url: null,
  };
}

export const ANSWER_FIXTURES: Record<AnswerFixtureKey, AnswerFixture> = {
  // The app's first example prompt is "What should I take for hair thinning?",
  // so this is the answer to that. A stub that answers a question nobody asked
  // reads as broken.
  normal: {
    answer:
      'Hair thinning has several common causes and the useful supplement depends on which one you have — low iron and thyroid are the two worth ruling out with your doctor first, and I cannot see either. These are what the library holds for hair. The honest summary is that biotin only helps people who are short of it, and saw palmetto has the most direct trials in pattern hair loss.',
    cards: [
      {
        slug: 'bulksupplements-saw-palmetto-extract-320-mg',
        reason: 'The one here with trials in pattern hair loss rather than in nails.',
      },
      {
        slug: 'thorne-biotin-8000-mcg',
        reason: 'The keratin cofactor, and worth trying mainly if you are short of it.',
      },
      {
        slug: 'nature-made-hair-skin-nails',
        reason: 'Biotin with the zinc and copper the same pathway uses, in one capsule.',
      },
    ],
    products: [
      product(
        'bulksupplements-saw-palmetto-extract-320-mg',
        'BulkSupplements.com Saw Palmetto Extract 320 mg',
        'BulkSupplements.com',
        'Softgel',
        'Saw palmetto berry extract, studied for its effect on the enzyme that converts testosterone to DHT.',
        'https://dsld.od.nih.gov/label/294541',
      ),
      product(
        'thorne-biotin-8000-mcg',
        'Thorne Biotin 8000 mcg',
        'Thorne',
        'Capsule',
        'Vitamin B7, a cofactor for the carboxylase enzymes involved in building keratin.',
        'https://dsld.od.nih.gov/label/336328',
      ),
      product(
        'nature-made-hair-skin-nails',
        'Nature Made Hair-Skin-Nails',
        'Nature Made',
        'Softgel',
        'Biotin with vitamins A and C, zinc and copper — the cofactors keratin and collagen synthesis draw on.',
        'https://dsld.od.nih.gov/label/271631',
      ),
    ],
    // Verbatim from migration 0022, which took every one of them from PubMed
    // esummary. Nothing here is invented.
    citations: {
      'bulksupplements-saw-palmetto-extract-320-mg': [
        {
          title: 'Serenoa repens for benign prostatic hyperplasia',
          meta: 'Meta-analysis (Cochrane Database Syst Rev, 2009)',
          url: 'https://pubmed.ncbi.nlm.nih.gov/19370565/',
        },
        {
          title: 'Saw palmetto extracts for treatment of benign prostatic hyperplasia: a systematic review',
          meta: 'Meta-analysis (JAMA, 1998)',
          url: 'https://pubmed.ncbi.nlm.nih.gov/9820264/',
        },
      ],
      'thorne-biotin-8000-mcg': [
        {
          title: 'Biotin for the treatment of nail disease: what is the evidence?',
          meta: 'Review (J Dermatolog Treat, 2018)',
          url: 'https://pubmed.ncbi.nlm.nih.gov/29057689/',
        },
        {
          title: 'Effect of biotin on hair roots and sebum excretion in women with diffuse alopecia',
          meta: 'Clinical trial (Pol Med J, 1966)',
          url: 'https://pubmed.ncbi.nlm.nih.gov/4223823/',
        },
      ],
      'nature-made-hair-skin-nails': [
        {
          title:
            'Dietary supplements in dermatology: A review of the evidence for zinc, biotin, vitamin D, nicotinamide, and Polypodium',
          meta: 'Review (J Am Acad Dermatol, 2021)',
          url: 'https://pubmed.ncbi.nlm.nih.gov/32360756/',
        },
        {
          title: 'Zinc aspartate, biotin, and clobetasol propionate in the treatment of alopecia areata in childhood',
          meta: 'Clinical trial (Pediatr Dermatol, 1999)',
          url: 'https://pubmed.ncbi.nlm.nih.gov/10515774/',
        },
      ],
    },
  },

  peptide: {
    answer:
      'I do not advise on peptides — not doses, not protocols, not where to get them. The library carries a reference entry for most of them with the papers attached, and that is as far as this app goes. Anything else in your stack I can talk through.',
    cards: [],
    products: [],
    citations: {},
  },

  pregnancy: {
    answer:
      'Anything you take while pregnant or breastfeeding is a question for your midwife, doctor or pharmacist rather than for me. They can see your bloods and your history, and the answer turns on both. Once you have their list I can help you fit it around your day.',
    cards: [],
    products: [],
    citations: {},
  },
};

export const ERROR_FIXTURES: Record<ErrorFixtureKey, ErrorFixture> = {
  rate_limit: {
    status: 429,
    body: {
      error: {
        code: 'rate_limited',
        message: 'That is the hourly limit for questions. It frees up again shortly.',
        retry_after: 900,
      },
    },
  },
  server_error: {
    status: 500,
    body: {
      error: {
        code: 'server_error',
        message: 'Something went wrong at our end. Try that again.',
      },
    },
  },
};

/**
 * Which fixture answers this question. Scope has already been decided by
 * `classifyScope`, so this only has to handle the two stub-only triggers and
 * the default.
 */
export function pickFixture(question: string, scope: AskScope): FixtureKey {
  const normalised = question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (normalised.includes(STUB_TRIGGERS.rate_limit)) return 'rate_limit';
  if (normalised.includes(STUB_TRIGGERS.server_error)) return 'server_error';
  if (scope === 'peptide') return 'peptide';
  if (scope === 'pregnancy') return 'pregnancy';
  return 'normal';
}
