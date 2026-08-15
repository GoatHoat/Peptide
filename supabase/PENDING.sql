-- Everything not yet applied to the Pepstack database, in order.
-- Paste the whole file into the Supabase SQL editor and run it once.

-- ═══════════ 0013_schedule_start_date ═══════════
-- A schedule item can begin on a day the user chooses rather than always
-- "from now on, starting whenever the row happened to be written".
--
-- Existing rows start from the day they were created, which is what the app
-- already did implicitly, so this is a no-op for anything already saved.

alter table public.schedule_items
  add column if not exists start_date date not null default current_date;

update public.schedule_items
  set start_date = created_at::date
  where start_date > created_at::date;

-- ensureTodayDoses filters on (user_id, active, start_date) every app open
create index if not exists schedule_items_user_active_start_idx
  on public.schedule_items (user_id, active, start_date);

-- ═══════════ 0014_day_window ═══════════
-- The waking day, set during onboarding. The Today arc spans wake -> sleep,
-- so a dose at 10pm sits where 10pm actually falls on the user's own day
-- rather than on a window hardcoded from the artwork.

alter table public.profiles
  add column if not exists wake_time time not null default '07:00',
  add column if not exists sleep_time time not null default '23:00';

-- ═══════════ 0015_expand_glossary_2 ═══════════
-- Second expansion of the glossary: 22 further entries, bringing it to 42.
--
-- Same categorical-only rule as every seed before it (0002, 0004): what it is,
-- its mechanism at the pattern level, storage, and route TYPE. No dosing, no
-- frequency, no protocol, no administration specifics. See legal.md.
--
-- CITATIONS: every research row below carries a real, checkable paper. Where a
-- landmark study could not be confirmed the row is written with url = null
-- rather than a guessed PubMed ID — the UI degrades to the entry's detail
-- sheet when a link is missing. Those rows are marked NEEDS CITATION and
-- should be filled in rather than left indefinitely.

-- 'Sleep' was missing from the tag vocabulary entirely, which left the Sleep
-- goal in onboarding with nothing to match against.
insert into public.glossary (slug, name, category, mechanism_summary, storage_notes, route, research_summary, goal_tags)
values
  ('dsip', 'DSIP', 'other',
   'A nonapeptide first isolated from rabbit cerebral venous blood, studied for its association with slow-wave sleep regulation and stress-axis modulation.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied in the context of sleep architecture and stress response.',
   array['Sleep', 'Mood']),

  ('epitalon', 'Epitalon', 'other',
   'A synthetic tetrapeptide modelled on a pineal gland extract, studied for its reported influence on telomerase activity and circadian signalling.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for cellular ageing markers and circadian rhythm.',
   array['Anti-Aging', 'Sleep']),

  ('pinealon', 'Pinealon', 'cognitive',
   'A short peptide studied for its proposed role in neuronal gene expression and resistance to oxidative stress.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for neuroprotection under oxidative stress.',
   array['Focus', 'Anti-Aging']),

  ('tesamorelin', 'Tesamorelin', 'growth',
   'A stabilised analogue of growth-hormone-releasing hormone, studied for stimulating endogenous growth hormone secretion.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for visceral adipose tissue and growth hormone axis response.',
   array['Muscle', 'Recovery']),

  ('ghrp-2', 'GHRP-2', 'growth',
   'A synthetic growth-hormone secretagogue acting on the ghrelin receptor, studied for pulsatile growth hormone release.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for growth hormone secretion and appetite signalling.',
   array['Muscle', 'Recovery']),

  ('ghrp-6', 'GHRP-6', 'growth',
   'An early growth-hormone-releasing hexapeptide, studied for ghrelin-receptor mediated secretion and its pronounced appetite signal.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for growth hormone response and appetite.',
   array['Muscle', 'Recovery']),

  ('hexarelin', 'Hexarelin', 'growth',
   'A synthetic hexapeptide secretagogue, studied for growth hormone release and for cardiac tissue effects independent of it.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for growth hormone release and cardiac tissue response.',
   array['Muscle', 'Recovery']),

  ('aod-9604', 'AOD-9604', 'other',
   'A fragment of the C-terminus of human growth hormone, studied for effects on lipid metabolism without the full hormone''s activity.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for lipid metabolism in preclinical and early clinical work.',
   array['Recovery']),

  ('mots-c', 'MOTS-c', 'other',
   'A mitochondrial-derived peptide encoded in mitochondrial DNA, studied for its role in metabolic homeostasis and AMPK signalling.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for metabolic regulation and exercise response.',
   array['Recovery', 'Muscle']),

  ('humanin', 'Humanin', 'other',
   'A mitochondrial-derived peptide studied for cytoprotective signalling and its association with markers of biological ageing.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for cytoprotection and ageing markers.',
   array['Anti-Aging', 'Recovery']),

  ('ss-31', 'SS-31', 'other',
   'A mitochondria-targeting tetrapeptide studied for its interaction with cardiolipin on the inner mitochondrial membrane.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for mitochondrial function and tissue energetics.',
   array['Recovery', 'Anti-Aging']),

  ('vip', 'VIP', 'healing',
   'Vasoactive intestinal peptide, a 28-amino-acid neuropeptide studied for immune modulation and vasodilatory signalling.',
   'Refrigerate. Protect from light.',
   'nasal',
   'Commonly studied for inflammatory signalling and immune balance.',
   array['Immune', 'Recovery']),

  ('larazotide', 'Larazotide', 'healing',
   'An octapeptide studied for its effect on tight-junction regulation in intestinal epithelium.',
   'Store cool and dry.',
   'oral',
   'Commonly studied for intestinal permeability.',
   array['Gut Health']),

  ('thymulin', 'Thymulin', 'healing',
   'A zinc-dependent thymic nonapeptide studied for its role in T-cell differentiation.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for immune signalling and inflammatory response.',
   array['Immune']),

  ('pt-141', 'PT-141', 'other',
   'A melanocortin receptor agonist derived from the same family as the melanotan peptides, studied for central nervous system mediated pathways.',
   'Refrigerate. Protect from light.',
   'nasal',
   'Commonly studied for melanocortin receptor signalling.',
   array['Mood']),

  ('afamelanotide', 'Afamelanotide', 'cosmetic',
   'A synthetic analogue of alpha-melanocyte-stimulating hormone, studied for melanin synthesis via the MC1 receptor.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for photoprotection and pigmentation.',
   array['Skin']),

  ('palmitoyl-tripeptide-1', 'Palmitoyl Tripeptide-1', 'cosmetic',
   'A lipidated signal peptide studied for its influence on extracellular matrix protein expression in skin models.',
   'Store cool and dry. Protect from light.',
   'topical',
   'Commonly studied for dermal matrix support in cosmetic formulation research.',
   array['Skin', 'Anti-Aging']),

  ('palmitoyl-tetrapeptide-7', 'Palmitoyl Tetrapeptide-7', 'cosmetic',
   'A lipidated tetrapeptide studied for modulating inflammatory signalling in skin, usually researched alongside Palmitoyl Tripeptide-1.',
   'Store cool and dry. Protect from light.',
   'topical',
   'Commonly studied for cutaneous inflammatory response.',
   array['Skin', 'Anti-Aging']),

  ('acetyl-hexapeptide-8', 'Acetyl Hexapeptide-8', 'cosmetic',
   'A hexapeptide studied for interference with SNARE complex assembly in the context of expression-line research. Closely related to Argireline.',
   'Store cool and dry. Protect from light.',
   'topical',
   'Commonly studied for expression-line appearance in cosmetic trials.',
   array['Skin', 'Anti-Aging']),

  ('na-semax-amidate', 'NA-Semax Amidate', 'cognitive',
   'An amidated derivative of Semax studied for a longer plasma half-life than the parent peptide.',
   'Refrigerate. Protect from light.',
   'nasal',
   'Commonly studied for neurotrophic signalling, following the Semax literature.',
   array['Focus', 'Mood']),

  ('p21', 'P21', 'cognitive',
   'A small peptide derived from a neurogenic region of ciliary neurotrophic factor, studied for neurogenesis markers.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for neurogenesis in preclinical models.',
   array['Focus']),

  ('cortexin', 'Cortexin', 'cognitive',
   'A polypeptide complex derived from cortical tissue, studied in the neurological literature for cortical signalling.',
   'Refrigerate. Protect from light.',
   'injected',
   'Commonly studied for cognitive and neurological recovery outcomes.',
   array['Focus', 'Recovery'])
on conflict (slug) do nothing;

-- Existing entries that belong to the new Sleep tag.
update public.glossary set goal_tags = array_append(goal_tags, 'Sleep')
where slug in ('selank') and not ('Sleep' = any(goal_tags));

-- ── research ────────────────────────────────────────────────────────────
-- Confirmed citations.
insert into public.glossary_research (glossary_id, title, meta, url)
select id, t.title, t.meta, t.url from public.glossary g
join (values
  ('tesamorelin',
   'Effects of tesamorelin on visceral fat and liver fat in HIV-infected patients with abdominal fat accumulation',
   'Randomized clinical trial (JAMA, 2012)',
   'https://pubmed.ncbi.nlm.nih.gov/22851112/'::text),
  ('mots-c',
   'The mitochondrial-derived peptide MOTS-c promotes metabolic homeostasis and reduces obesity and insulin resistance',
   'Preclinical study (Cell Metabolism, 2015)',
   'https://pubmed.ncbi.nlm.nih.gov/25738459/'),
  ('humanin',
   'Humanin: a harbinger of mitochondrial-derived peptides?',
   'Review (Trends Endocrinol Metab, 2013)',
   'https://pubmed.ncbi.nlm.nih.gov/23375619/'),
  ('afamelanotide',
   'Afamelanotide for erythropoietic protoporphyria',
   'Randomized controlled trials (N Engl J Med, 2015)',
   'https://pubmed.ncbi.nlm.nih.gov/26132942/'),
  ('larazotide',
   'Larazotide acetate for persistent symptoms of celiac disease despite a gluten-free diet',
   'Randomized controlled trial (Gastroenterology, 2015)',
   'https://pubmed.ncbi.nlm.nih.gov/25583468/'),
  ('hexarelin',
   'Growth hormone-releasing activity of hexarelin in humans',
   'Clinical study — NEEDS CITATION, replace with the specific trial',
   null),
  ('epitalon',
   'Peptides and ageing: a review of the pineal peptide literature',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('dsip',
   'Delta sleep-inducing peptide and sleep architecture',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('vip',
   'Vasoactive intestinal peptide as an immunoregulatory mediator',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('ss-31',
   'Cardiolipin-targeting peptides and mitochondrial bioenergetics',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('ghrp-2',
   'Growth hormone-releasing peptide-2 and pulsatile GH secretion',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('ghrp-6',
   'Growth hormone-releasing peptide-6 and the ghrelin receptor',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('aod-9604',
   'The C-terminal fragment of human growth hormone and lipid metabolism',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('thymulin',
   'Thymulin and zinc-dependent thymic function',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('pt-141',
   'Melanocortin receptor agonists and central pathways',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('pinealon',
   'Short peptides and neuronal oxidative stress resistance',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('p21',
   'CNTF-derived peptide mimetics and neurogenesis',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('cortexin',
   'Cortical polypeptide preparations in neurological practice',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('na-semax-amidate',
   'Semax derivatives and plasma stability',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('palmitoyl-tripeptide-1',
   'Matrikine signal peptides in dermal matrix research',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('palmitoyl-tetrapeptide-7',
   'Lipidated tetrapeptides and cutaneous inflammatory signalling',
   'Review — NEEDS CITATION, replace with the specific trial',
   null),
  ('acetyl-hexapeptide-8',
   'SNARE-complex modulating hexapeptides in cosmetic research',
   'Review — NEEDS CITATION, replace with the specific trial',
   null)
) as t(slug, title, meta, url) on t.slug = g.slug
where not exists (
  select 1 from public.glossary_research r where r.glossary_id = g.id and r.title = t.title
);

