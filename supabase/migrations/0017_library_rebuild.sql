-- Library rebuild.
--
-- Fixes three things reported against the shipped data:
--   1. the 24 supplements went in under generic ingredient names ("Zinc")
--      because an earlier draft of 0016 was applied. They are branded now.
--   2. 24 entries carried a single article, 22 of them with no URL at all, so
--      the link was dead. Every entry now carries five with a working link.
--   3. adds 50 further branded vitamin and mineral products.
--
-- PRODUCTS come from the NIH Dietary Supplement Label Database: brand, product
-- name and form are what DSLD returned for that filing, and label_url points at
-- it. No brand is invented.
--
-- ARTICLES come from the PubMed E-utilities API: esearch returned the PMID and
-- esummary returned the title, journal and year for that record.
--
-- REFERENCE INTAKES come from the NIH Office of Dietary Supplements, stored per
-- age band and sex with the fact sheet URL. Where no value has been set --
-- biotin has no upper limit, boron has no requirement -- the column is null and
-- the app renders that rather than inventing a number.

-- Age and sex drive the personalised intake on the supplement sheet. They are
-- collected in onboarding and were only being held in localStorage.
alter table public.profiles
  add column if not exists age integer,
  add column if not exists sex text;
alter table public.profiles drop constraint if exists profiles_sex_check;
alter table public.profiles add constraint profiles_sex_check
  check (sex is null or sex in ('m','f','na'));

alter table public.glossary
  add column if not exists brand text,
  add column if not exists product_form text,
  add column if not exists label_url text,
  add column if not exists timing text,
  add column if not exists timing_note text,
  add column if not exists evidence text,
  add column if not exists ods_url text;

alter table public.glossary drop constraint if exists glossary_timing_check;
alter table public.glossary add constraint glossary_timing_check
  check (timing is null or timing in ('with_food','empty','evening','any'));
alter table public.glossary drop constraint if exists glossary_evidence_check;
alter table public.glossary add constraint glossary_evidence_check
  check (evidence is null or evidence in ('strong','mixed','thin'));

-- Reference intakes vary by age band and sex, so they cannot live on the entry.
create table if not exists public.nutrient_reference (
  id uuid primary key default gen_random_uuid(),
  glossary_id uuid not null references public.glossary (id) on delete cascade,
  age_band text not null check (age_band in ('14-18','19-50','51+')),
  sex text not null check (sex in ('m','f','any')),
  rda numeric,           -- null where none is established
  ul numeric,            -- null where none is established
  unit text not null check (unit in ('mg','mcg','g','IU')),
  unique (glossary_id, age_band, sex)
);
alter table public.nutrient_reference enable row level security;
drop policy if exists "nutrient_reference: public read" on public.nutrient_reference;
create policy "nutrient_reference: public read"
  on public.nutrient_reference for select using (true);

-- ── the 24 existing supplements, given their real product identity ──
update public.glossary set name = 'Vital Proteins Collagen Peptides', brand = 'Vital Proteins', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/246526' where slug = 'collagen-peptides';
update public.glossary set name = 'Finest Nutrition Biotin 5,000 mcg', brand = 'Finest Nutrition', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/60867' where slug = 'biotin';
update public.glossary set name = 'Gematria Vitamin C Complex', brand = 'Gematria', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/3254' where slug = 'vitamin-c';
update public.glossary set name = 'New Sun Hyaluronic Acid +', brand = 'New Sun', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/217946' where slug = 'hyaluronic-acid';
update public.glossary set name = 'Vinco''s Magnesium Glycinate', brand = 'Vinco''s', product_form = 'Powder', label_url = 'https://dsld.od.nih.gov/label/33919' where slug = 'magnesium-glycinate';
update public.glossary set name = 'Village Vitality Sleep with Valerian & Melatonin', brand = 'Village Vitality', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/216782' where slug = 'melatonin';
update public.glossary set name = 'Woodstock Vitamins L-Theanine 200 mg', brand = 'Woodstock Vitamins', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/263070' where slug = 'l-theanine';
update public.glossary set name = 'Protocol For Life Balance Glycine', brand = 'Protocol For Life Balance', product_form = 'Powder', label_url = 'https://dsld.od.nih.gov/label/14922' where slug = 'glycine';
update public.glossary set name = 'Pure Advantage Creatine Monohydrate', brand = 'Pure Advantage', product_form = 'Powder', label_url = 'https://dsld.od.nih.gov/label/231495' where slug = 'creatine-monohydrate';
update public.glossary set name = 'BulkSupplements.com Vitamin B12 1% (Methylcobalamin)', brand = 'BulkSupplements.com', product_form = 'Powder', label_url = 'https://dsld.od.nih.gov/label/311774' where slug = 'vitamin-b12';
update public.glossary set name = 'Thorne Iron Bisglycinate', brand = 'Thorne', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/321969' where slug = 'iron-bisglycinate';
update public.glossary set name = 'OL Olympian Labs Ubiquinol', brand = 'OL Olympian Labs', product_form = 'Softgel Capsule', label_url = 'https://dsld.od.nih.gov/label/9928' where slug = 'coq10';
update public.glossary set name = 'DEVA Vegan Omega-3 DHA-EPA', brand = 'DEVA', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/304315' where slug = 'omega-3';
update public.glossary set name = 'AOR Advanced Orthomolecular Research Citicoline', brand = 'AOR Advanced Orthomolecular Research', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/305918' where slug = 'citicoline';
update public.glossary set name = 'SuperSmart Bacopa Monnieri', brand = 'SuperSmart', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/250150' where slug = 'bacopa-monnieri';
update public.glossary set name = 'Nutracraft Rhodiola Rosea', brand = 'Nutracraft', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/246565' where slug = 'rhodiola-rosea';
update public.glossary set name = 'Biochem 100% Whey Isolate Protein Chocolate Peppermint', brand = 'Biochem', product_form = 'Powder', label_url = 'https://dsld.od.nih.gov/label/258811' where slug = 'whey-protein';
update public.glossary set name = 'NOW Sports Beta-Alanine Powder', brand = 'NOW Sports', product_form = 'Powder', label_url = 'https://dsld.od.nih.gov/label/314248' where slug = 'beta-alanine';
update public.glossary set name = 'NutraKey Health Performance L-Citrulline Malate', brand = 'NutraKey Health Performance', product_form = 'Powder', label_url = 'https://dsld.od.nih.gov/label/240137' where slug = 'l-citrulline';
update public.glossary set name = 'Protocol For Life Balance High Potency D3 10,000 IU Cholecalciferol', brand = 'Protocol For Life Balance', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/72917' where slug = 'vitamin-d3';
update public.glossary set name = 'AOR Advanced Orthomolecular Research Premium Zinc-Copper Balance', brand = 'AOR Advanced Orthomolecular Research Premium', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/214713' where slug = 'zinc';
update public.glossary set name = 'Nobi Nutrition Sambucus Elderberry', brand = 'Nobi Nutrition', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/246787' where slug = 'elderberry';
update public.glossary set name = 'Allergy Research Group Lactobacillus', brand = 'Allergy Research Group', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/233241' where slug = 'probiotics';
update public.glossary set name = 'Pure Encapsulations Selenium (Selenomethionine)', brand = 'Pure Encapsulations', product_form = 'Capsule', label_url = 'https://dsld.od.nih.gov/label/184923' where slug = 'selenium';

-- ── 50 further vitamin and mineral products ──
insert into public.glossary (slug, name, category, mechanism_summary, storage_notes, route, research_summary, goal_tags, kind, brand, product_form, label_url)
values
  ('vitamin-a', 'Sundown Naturals Vitamin A 10,000 IU', 'other',
   'Retinol and its esters, a fat-soluble vitamin required for vision, epithelial differentiation and immune function.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for skin, immune. This entry is the Sundown Naturals Vitamin A 10,000 IU label as filed with the NIH Dietary Supplement Label Database.', array['Skin', 'Immune'], 'supplement',
   'Sundown Naturals', 'Softgel Capsule',
   'https://dsld.od.nih.gov/label/69557'),

  ('vitamin-e', 'Vitamin World Natural E-400 IU D-Alpha Tocopherol', 'other',
   'A family of fat-soluble tocopherols acting as chain-breaking antioxidants in cell membranes.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for anti-aging, skin. This entry is the Vitamin World Natural E-400 IU D-Alpha Tocopherol label as filed with the NIH Dietary Supplement Label Database.', array['Anti-Aging', 'Skin'], 'supplement',
   'Vitamin World', 'Softgel Capsule',
   'https://dsld.od.nih.gov/label/60526'),

  ('vitamin-k2', 'Douglas Laboratories Vitamin K2 Menaquinone-7', 'other',
   'Menaquinone-7, a cofactor for the carboxylation of osteocalcin and matrix Gla protein.', 'Store cool and dry.', 'oral',
   'Commonly studied for anti-aging, muscle. This entry is the Douglas Laboratories Vitamin K2 Menaquinone-7 label as filed with the NIH Dietary Supplement Label Database.', array['Anti-Aging', 'Muscle'], 'supplement',
   'Douglas Laboratories', 'Capsule',
   'https://dsld.od.nih.gov/label/244758'),

  ('thiamine', 'BulkSupplements.com Vitamin B1 (Thiamine Mononitrate)', 'other',
   'A cofactor for pyruvate dehydrogenase and transketolase, central to carbohydrate metabolism.', 'Store cool and dry.', 'oral',
   'Commonly studied for energy, focus. This entry is the BulkSupplements.com Vitamin B1 (Thiamine Mononitrate) label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Focus'], 'supplement',
   'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/294344'),

  ('riboflavin', 'Nature''s Way Riboflavin Vitamin B2 100 mg', 'other',
   'Precursor to FAD and FMN, the flavin cofactors used throughout the electron transport chain.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for energy. This entry is the Nature''s Way Riboflavin Vitamin B2 100 mg label as filed with the NIH Dietary Supplement Label Database.', array['Energy'], 'supplement',
   'Nature''s Way', 'Capsule',
   'https://dsld.od.nih.gov/label/328040'),

  ('niacin', 'Bluebonnet Niacin 100 mg', 'other',
   'Precursor to NAD and NADP, the pyridine nucleotides used in several hundred redox reactions.', 'Store cool and dry.', 'oral',
   'Commonly studied for energy, anti-aging. This entry is the Bluebonnet Niacin 100 mg label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Anti-Aging'], 'supplement',
   'Bluebonnet', 'Capsule',
   'https://dsld.od.nih.gov/label/268249'),

  ('pantothenic-acid', 'BulkSupplements.com Pantothenic Acid Vitamin B5 Powder 500 mg', 'other',
   'Precursor to coenzyme A, required for fatty acid synthesis and oxidation.', 'Store cool and dry.', 'oral',
   'Commonly studied for energy, skin. This entry is the BulkSupplements.com Pantothenic Acid Vitamin B5 Powder 500 mg label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Skin'], 'supplement',
   'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/331066'),

  ('vitamin-b6', 'SuperiorLabs Vitamin B6', 'other',
   'Pyridoxal-5-phosphate, the active form, a cofactor for over a hundred transaminase reactions.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for mood, energy. This entry is the SuperiorLabs Vitamin B6 label as filed with the NIH Dietary Supplement Label Database.', array['Mood', 'Energy'], 'supplement',
   'SuperiorLabs', 'Capsule',
   'https://dsld.od.nih.gov/label/74396'),

  ('folate', 'Advanced Nutrition by Zahler Methylfolate', 'other',
   'The methylated form of vitamin B9, a one-carbon donor in nucleotide synthesis and homocysteine remethylation.', 'Store cool and dry.', 'oral',
   'Commonly studied for energy, mood. This entry is the Advanced Nutrition by Zahler Methylfolate label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Mood'], 'supplement',
   'Advanced Nutrition by Zahler', 'Capsule',
   'https://dsld.od.nih.gov/label/260230'),

  ('choline', 'KRK Supplements Choline Bitartrate', 'cognitive',
   'An essential nutrient and precursor to acetylcholine and phosphatidylcholine.', 'Store cool and dry.', 'oral',
   'Commonly studied for focus. This entry is the KRK Supplements Choline Bitartrate label as filed with the NIH Dietary Supplement Label Database.', array['Focus'], 'supplement',
   'KRK Supplements', 'Capsule',
   'https://dsld.od.nih.gov/label/337329'),

  ('inositol', 'Pure Myo-Inositol', 'other',
   'A carbocyclic sugar acting as a second-messenger precursor in insulin and neurotransmitter signalling.', 'Store cool and dry.', 'oral',
   'Commonly studied for mood, sleep. This entry is the Pure Myo-Inositol label as filed with the NIH Dietary Supplement Label Database.', array['Mood', 'Sleep'], 'supplement',
   'Pure', 'Capsule',
   'https://dsld.od.nih.gov/label/248703'),

  ('calcium-citrate', 'NutriCology Calcium Citrate', 'other',
   'Calcium bound to citrate, studied for absorption independent of stomach acid.', 'Store cool and dry.', 'oral',
   'Commonly studied for muscle, anti-aging. This entry is the NutriCology Calcium Citrate label as filed with the NIH Dietary Supplement Label Database.', array['Muscle', 'Anti-Aging'], 'supplement',
   'NutriCology', 'Capsule',
   'https://dsld.od.nih.gov/label/234781'),

  ('potassium', 'NutriCology Potassium Citrate', 'other',
   'The principal intracellular cation, central to membrane potential and blood pressure regulation.', 'Store cool and dry.', 'oral',
   'Commonly studied for muscle, energy. This entry is the NutriCology Potassium Citrate label as filed with the NIH Dietary Supplement Label Database.', array['Muscle', 'Energy'], 'supplement',
   'NutriCology', 'Capsule',
   'https://dsld.od.nih.gov/label/234783'),

  ('iodine', 'Hi-Tech Pharmaceuticals Potassium Iodide 130 mg', 'other',
   'A trace element incorporated into thyroid hormone.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for energy, immune. This entry is the Hi-Tech Pharmaceuticals Potassium Iodide 130 mg label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Immune'], 'supplement',
   'Hi-Tech Pharmaceuticals', 'Capsule',
   'https://dsld.od.nih.gov/label/1982'),

  ('copper', 'Thorne Copper Bisglycinate', 'other',
   'A trace mineral cofactor for cytochrome c oxidase, lysyl oxidase and superoxide dismutase.', 'Store cool and dry.', 'oral',
   'Commonly studied for immune, skin. This entry is the Thorne Copper Bisglycinate label as filed with the NIH Dietary Supplement Label Database.', array['Immune', 'Skin'], 'supplement',
   'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/291778'),

  ('manganese', 'Trace Minerals Research Ionic Manganese 10 mg', 'other',
   'A trace mineral cofactor for manganese superoxide dismutase and several glycosyltransferases.', 'Store cool and dry.', 'oral',
   'Commonly studied for muscle, anti-aging. This entry is the Trace Minerals Research Ionic Manganese 10 mg label as filed with the NIH Dietary Supplement Label Database.', array['Muscle', 'Anti-Aging'], 'supplement',
   'Trace Minerals Research', 'Liquid',
   'https://dsld.od.nih.gov/label/78968'),

  ('chromium', 'EnergyFirst Chromium Picolinate', 'other',
   'A trace mineral studied for its association with insulin signalling.', 'Store cool and dry.', 'oral',
   'Commonly studied for energy. This entry is the EnergyFirst Chromium Picolinate label as filed with the NIH Dietary Supplement Label Database.', array['Energy'], 'supplement',
   'EnergyFirst', 'Capsule',
   'https://dsld.od.nih.gov/label/57662'),

  ('molybdenum', 'Allergy Research Group Liquid Molybdenum', 'other',
   'A trace mineral cofactor for sulfite oxidase and xanthine oxidase.', 'Store cool and dry.', 'oral',
   'Commonly studied for immune. This entry is the Allergy Research Group Liquid Molybdenum label as filed with the NIH Dietary Supplement Label Database.', array['Immune'], 'supplement',
   'Allergy Research Group', 'Liquid',
   'https://dsld.od.nih.gov/label/233165'),

  ('boron', 'NOW Boron 3 mg', 'other',
   'A trace element studied for its association with bone metabolism and steroid hormone handling.', 'Store cool and dry.', 'oral',
   'Commonly studied for muscle, anti-aging. This entry is the NOW Boron 3 mg label as filed with the NIH Dietary Supplement Label Database.', array['Muscle', 'Anti-Aging'], 'supplement',
   'NOW', 'Capsule',
   'https://dsld.od.nih.gov/label/244909'),

  ('magnesium-citrate', 'NutriCology Magnesium Citrate', 'other',
   'Magnesium bound to citrate, studied for solubility and its osmotic effect in the gut.', 'Store cool and dry.', 'oral',
   'Commonly studied for sleep, recovery. This entry is the NutriCology Magnesium Citrate label as filed with the NIH Dietary Supplement Label Database.', array['Sleep', 'Recovery'], 'supplement',
   'NutriCology', 'Capsule',
   'https://dsld.od.nih.gov/label/235550'),

  ('magnesium-threonate', 'Teraputics Pure Life Magnesium L-Threonate', 'cognitive',
   'Magnesium bound to threonic acid, studied for its handling relative to other magnesium salts.', 'Store cool and dry.', 'oral',
   'Commonly studied for focus, sleep. This entry is the Teraputics Pure Life Magnesium L-Threonate label as filed with the NIH Dietary Supplement Label Database.', array['Focus', 'Sleep'], 'supplement',
   'Teraputics Pure Life', 'Capsule',
   'https://dsld.od.nih.gov/label/245277'),

  ('nac', 'NHC Natural Healthy Concepts N-Acetyl Cysteine', 'other',
   'A cysteine donor and rate-limiting precursor to glutathione.', 'Store cool and dry.', 'oral',
   'Commonly studied for immune, anti-aging. This entry is the NHC Natural Healthy Concepts N-Acetyl Cysteine label as filed with the NIH Dietary Supplement Label Database.', array['Immune', 'Anti-Aging'], 'supplement',
   'NHC Natural Healthy Concepts', 'Capsule',
   'https://dsld.od.nih.gov/label/230819'),

  ('taurine', 'BulkSupplements.com Taurine', 'other',
   'A sulfur-containing amino acid concentrated in muscle, heart and retina, studied for osmoregulation and calcium handling.', 'Store cool and dry.', 'oral',
   'Commonly studied for energy, muscle. This entry is the BulkSupplements.com Taurine label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Muscle'], 'supplement',
   'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/294525'),

  ('l-tyrosine', 'NOW L-Tyrosine', 'cognitive',
   'An amino acid precursor to dopamine, noradrenaline and thyroid hormone.', 'Store cool and dry.', 'oral',
   'Commonly studied for focus, mood. This entry is the NOW L-Tyrosine label as filed with the NIH Dietary Supplement Label Database.', array['Focus', 'Mood'], 'supplement',
   'NOW', 'Powder',
   'https://dsld.od.nih.gov/label/244425'),

  ('l-lysine', 'SuperiorLabs L-Lysine', 'other',
   'An essential amino acid required for collagen crosslinking and carnitine synthesis.', 'Store cool and dry.', 'oral',
   'Commonly studied for immune, skin. This entry is the SuperiorLabs L-Lysine label as filed with the NIH Dietary Supplement Label Database.', array['Immune', 'Skin'], 'supplement',
   'SuperiorLabs', 'Capsule',
   'https://dsld.od.nih.gov/label/255999'),

  ('l-arginine', 'MyTrition L-Arginine', 'other',
   'A conditionally essential amino acid and substrate for nitric oxide synthase.', 'Store cool and dry.', 'oral',
   'Commonly studied for muscle, recovery. This entry is the MyTrition L-Arginine label as filed with the NIH Dietary Supplement Label Database.', array['Muscle', 'Recovery'], 'supplement',
   'MyTrition', 'Capsule',
   'https://dsld.od.nih.gov/label/81308'),

  ('alpha-lipoic-acid', 'BulkSupplements.com Alpha Lipoic Acid', 'other',
   'A dithiol compound acting as a mitochondrial enzyme cofactor and a redox-cycling antioxidant.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for energy, anti-aging. This entry is the BulkSupplements.com Alpha Lipoic Acid label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Anti-Aging'], 'supplement',
   'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/310640'),

  ('quercetin', 'ProCaps Laboratories Quercetin 500', 'other',
   'A flavonol studied for mast-cell stabilisation and, in preclinical work, senolytic activity.', 'Store cool and dry.', 'oral',
   'Commonly studied for immune, anti-aging. This entry is the ProCaps Laboratories Quercetin 500 label as filed with the NIH Dietary Supplement Label Database.', array['Immune', 'Anti-Aging'], 'supplement',
   'ProCaps Laboratories', 'Capsule',
   'https://dsld.od.nih.gov/label/320266'),

  ('curcumin', 'Natures Craft Turmeric Curcumin', 'other',
   'The principal curcuminoid of turmeric, studied for NF-kB signalling, with poor native bioavailability.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for recovery, injury. This entry is the Natures Craft Turmeric Curcumin label as filed with the NIH Dietary Supplement Label Database.', array['Recovery', 'Injury'], 'supplement',
   'Natures Craft', 'Capsule',
   'https://dsld.od.nih.gov/label/228793'),

  ('resveratrol', 'Herbadiet Trans-Resveratrol', 'other',
   'A stilbenoid polyphenol studied for sirtuin and AMPK signalling.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for anti-aging. This entry is the Herbadiet Trans-Resveratrol label as filed with the NIH Dietary Supplement Label Database.', array['Anti-Aging'], 'supplement',
   'Herbadiet', 'Capsule',
   'https://dsld.od.nih.gov/label/258199'),

  ('berberine', 'Codeage Berberine Phytosome+', 'other',
   'An isoquinoline alkaloid studied for AMPK activation and glucose handling.', 'Store cool and dry.', 'oral',
   'Commonly studied for energy, gut health. This entry is the Codeage Berberine Phytosome+ label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Gut Health'], 'supplement',
   'Codeage', 'Capsule',
   'https://dsld.od.nih.gov/label/333404'),

  ('milk-thistle', 'Wonder Laboratories Silymarin Milk Thistle', 'other',
   'Silymarin, a flavonolignan complex studied for hepatocyte membrane effects.', 'Store cool and dry.', 'oral',
   'Commonly studied for anti-aging, gut health. This entry is the Wonder Laboratories Silymarin Milk Thistle label as filed with the NIH Dietary Supplement Label Database.', array['Anti-Aging', 'Gut Health'], 'supplement',
   'Wonder Laboratories', 'Softgel Capsule',
   'https://dsld.od.nih.gov/label/262670'),

  ('ashwagandha', 'Oregon''s Wild Harvest Ashwagandha', 'other',
   'An adaptogenic root whose withanolides are studied for cortisol response and sleep measures.', 'Store cool and dry.', 'oral',
   'Commonly studied for sleep, mood. This entry is the Oregon''s Wild Harvest Ashwagandha label as filed with the NIH Dietary Supplement Label Database.', array['Sleep', 'Mood'], 'supplement',
   'Oregon''s Wild Harvest', 'Capsule',
   'https://dsld.od.nih.gov/label/323200'),

  ('ginkgo', 'Havasu Nutrition Ginkgo Biloba + Phosphatidylserine', 'cognitive',
   'A standardised leaf extract studied for cerebral blood flow and platelet-activating factor.', 'Store cool and dry.', 'oral',
   'Commonly studied for focus. This entry is the Havasu Nutrition Ginkgo Biloba + Phosphatidylserine label as filed with the NIH Dietary Supplement Label Database.', array['Focus'], 'supplement',
   'Havasu Nutrition', 'Capsule',
   'https://dsld.od.nih.gov/label/214644'),

  ('panax-ginseng', 'Herbadiet Panax Ginseng Extract', 'cognitive',
   'A root extract whose ginsenosides are studied for fatigue and cognitive measures.', 'Store cool and dry.', 'oral',
   'Commonly studied for energy, focus. This entry is the Herbadiet Panax Ginseng Extract label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Focus'], 'supplement',
   'Herbadiet', 'Powder',
   'https://dsld.od.nih.gov/label/244376'),

  ('green-tea-extract', 'AOR Advanced Orthomolecular Research Advanced Active Green Tea', 'other',
   'A catechin-standardised extract, principally epigallocatechin gallate.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for energy, anti-aging. This entry is the AOR Advanced Orthomolecular Research Advanced Active Green Tea label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Anti-Aging'], 'supplement',
   'AOR Advanced Orthomolecular Research Advanced', 'Capsule',
   'https://dsld.od.nih.gov/label/214415'),

  ('garlic-extract', 'Wakunaga of America Kyolic Aged Garlic Extract', 'other',
   'An aged preparation studied for its organosulfur compounds and cardiovascular measures.', 'Store cool and dry.', 'oral',
   'Commonly studied for immune. This entry is the Wakunaga of America Kyolic Aged Garlic Extract label as filed with the NIH Dietary Supplement Label Database.', array['Immune'], 'supplement',
   'Wakunaga of America', 'Liquid',
   'https://dsld.od.nih.gov/label/81014'),

  ('saw-palmetto', 'ZHOU Saw Palmetto', 'other',
   'A berry extract studied for 5-alpha-reductase activity.', 'Store cool and dry.', 'oral',
   'Commonly studied for skin. This entry is the ZHOU Saw Palmetto label as filed with the NIH Dietary Supplement Label Database.', array['Skin'], 'supplement',
   'ZHOU', 'Capsule',
   'https://dsld.od.nih.gov/label/71374'),

  ('lutein', 'Health Thru Nutrition Naturally Lutein With Zeaxanthin 20 mg', 'other',
   'Xanthophyll carotenoids concentrated in the macula, studied for macular pigment optical density.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for focus, anti-aging. This entry is the Health Thru Nutrition Naturally Lutein With Zeaxanthin 20 mg label as filed with the NIH Dietary Supplement Label Database.', array['Focus', 'Anti-Aging'], 'supplement',
   'Health Thru Nutrition Naturally', 'Softgel Capsule',
   'https://dsld.od.nih.gov/label/177738'),

  ('astaxanthin', 'Doctor''s Best Astaxanthin', 'other',
   'A ketocarotenoid studied for membrane-spanning antioxidant activity.', 'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for skin, recovery. This entry is the Doctor''s Best Astaxanthin label as filed with the NIH Dietary Supplement Label Database.', array['Skin', 'Recovery'], 'supplement',
   'Doctor''s Best', 'Softgel Capsule',
   'https://dsld.od.nih.gov/label/59912'),

  ('beta-glucan', 'Doctor''s Best Barley Beta-Glucan', 'other',
   'A polysaccharide from yeast or oats studied for innate immune receptor binding.', 'Store cool and dry.', 'oral',
   'Commonly studied for immune. This entry is the Doctor''s Best Barley Beta-Glucan label as filed with the NIH Dietary Supplement Label Database.', array['Immune'], 'supplement',
   'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/59950'),

  ('psyllium', 'Vitamin World Acidophilus & Psyllium Husk', 'other',
   'A soluble gel-forming fibre studied for stool form and lipid handling.', 'Store cool and dry.', 'oral',
   'Commonly studied for gut health. This entry is the Vitamin World Acidophilus & Psyllium Husk label as filed with the NIH Dietary Supplement Label Database.', array['Gut Health'], 'supplement',
   'Vitamin World', 'Capsule',
   'https://dsld.od.nih.gov/label/21135'),

  ('digestive-enzymes', 'GNC Beyond Raw Digestive Enzymes', 'other',
   'A blend of protease, amylase and lipase studied for macronutrient digestion.', 'Store cool and dry.', 'oral',
   'Commonly studied for gut health. This entry is the GNC Beyond Raw Digestive Enzymes label as filed with the NIH Dietary Supplement Label Database.', array['Gut Health'], 'supplement',
   'GNC Beyond Raw', 'Capsule',
   'https://dsld.od.nih.gov/label/80096'),

  ('msm', 'BulkSupplements.com MSM (Methylsulfonylmethane) 1500 mg', 'other',
   'Methylsulfonylmethane, an organosulfur compound studied for joint comfort and exercise recovery.', 'Store cool and dry.', 'oral',
   'Commonly studied for injury, recovery. This entry is the BulkSupplements.com MSM (Methylsulfonylmethane) 1500 mg label as filed with the NIH Dietary Supplement Label Database.', array['Injury', 'Recovery'], 'supplement',
   'BulkSupplements.com', 'Capsule',
   'https://dsld.od.nih.gov/label/311064'),

  ('glucosamine', 'Carlson Glucosamine Sulfate', 'other',
   'An amino sugar and substrate for the cartilage matrix.', 'Store cool and dry.', 'oral',
   'Commonly studied for injury, recovery. This entry is the Carlson Glucosamine Sulfate label as filed with the NIH Dietary Supplement Label Database.', array['Injury', 'Recovery'], 'supplement',
   'Carlson', 'Capsule',
   'https://dsld.od.nih.gov/label/24983'),

  ('chondroitin', 'ProCaps Laboratories Chondroitin Sulfate 1200', 'other',
   'A sulfated glycosaminoglycan of cartilage, usually studied alongside glucosamine.', 'Store cool and dry.', 'oral',
   'Commonly studied for injury. This entry is the ProCaps Laboratories Chondroitin Sulfate 1200 label as filed with the NIH Dietary Supplement Label Database.', array['Injury'], 'supplement',
   'ProCaps Laboratories', 'Capsule',
   'https://dsld.od.nih.gov/label/248425'),

  ('spirulina', 'Healths Harmony California Spirulina', 'other',
   'A cyanobacterium studied for its phycocyanin content and protein density.', 'Store cool and dry.', 'oral',
   'Commonly studied for immune, energy. This entry is the Healths Harmony California Spirulina label as filed with the NIH Dietary Supplement Label Database.', array['Immune', 'Energy'], 'supplement',
   'Healths Harmony', 'Capsule',
   'https://dsld.od.nih.gov/label/318355'),

  ('pqq', 'Quality Of Life Labs VitaPQQ Pyrroloquinoline Quinone', 'other',
   'A redox cofactor studied for mitochondrial biogenesis signalling.', 'Store cool and dry.', 'oral',
   'Commonly studied for energy, anti-aging. This entry is the Quality Of Life Labs VitaPQQ Pyrroloquinoline Quinone label as filed with the NIH Dietary Supplement Label Database.', array['Energy', 'Anti-Aging'], 'supplement',
   'Quality Of Life Labs', 'Capsule',
   'https://dsld.od.nih.gov/label/1700'),

  ('betaine-tmg', 'GNC Beyond Raw Chemistry Labs Betaine Anhydrous 2.5 grams', 'other',
   'Trimethylglycine, a methyl donor in homocysteine remethylation and an osmolyte.', 'Store cool and dry.', 'oral',
   'Commonly studied for muscle, energy. This entry is the GNC Beyond Raw Chemistry Labs Betaine Anhydrous 2.5 grams label as filed with the NIH Dietary Supplement Label Database.', array['Muscle', 'Energy'], 'supplement',
   'GNC Beyond Raw Chemistry Labs', 'Powder',
   'https://dsld.od.nih.gov/label/69302'),

  ('zinc-picolinate', 'Pure Prescriptions Zinc Picolinate', 'other',
   'Zinc chelated to picolinic acid, studied for absorption relative to other zinc salts.', 'Store cool and dry.', 'oral',
   'Commonly studied for immune, skin. This entry is the Pure Prescriptions Zinc Picolinate label as filed with the NIH Dietary Supplement Label Database.', array['Immune', 'Skin'], 'supplement',
   'Pure Prescriptions', 'Capsule',
   'https://dsld.od.nih.gov/label/248640')
on conflict (slug) do update set
  name = excluded.name, brand = excluded.brand, product_form = excluded.product_form,
  label_url = excluded.label_url, kind = excluded.kind, goal_tags = excluded.goal_tags;

-- ── articles ──
-- The dead rows first: 22 citations were written with no URL when the paper
-- could not be confirmed. They are replaced below rather than left in place.
delete from public.glossary_research where url is null;

insert into public.glossary_research (glossary_id, title, meta, url)
select g.id, t.title, t.meta, t.url
from public.glossary g
join (values
  ('vitamin-a', 'Zinc Supplementation Reduces Common Cold Duration among Healthy Adults: A Systematic Review of Randomized Controlled Trials with Micronutrients Supplementation', '1/5 · Efficacy · Am J Trop Med Hyg, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32342851/'),
  ('vitamin-a', 'Cosmeceuticals in photoaging: A review', '2/5 · Mechanism · Skin Res Technol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39233460/'),
  ('vitamin-a', 'SUPPLEMENT ARTICLE: Retinol: The Ideal Retinoid for Cosmetic Solutions', '3/5 · Safety · J Drugs Dermatol, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35816071/'),
  ('vitamin-a', 'Iron bioavailability and dietary reference values', '4/5 · Practical · Am J Clin Nutr, 2010', 'https://pubmed.ncbi.nlm.nih.gov/20200263/'),
  ('vitamin-a', 'A Narrative Review of Vitamin A Supplementation in Preterm and Term Infants', '5/5 · Interactions · Cureus, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36381685/'),
  ('vitamin-e', 'Vitamin C and E antioxidant supplementation may significantly reduce pain symptoms in endometriosis: A systematic review and meta-analysis of randomized controlled trials', '1/5 · Efficacy · PLoS One, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38820340/'),
  ('vitamin-e', 'Reactive oxygen species, toxicity, oxidative stress, and antioxidants: chronic diseases and aging', '2/5 · Mechanism · Arch Toxicol, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37597078/'),
  ('vitamin-e', 'Tolerance and safety of vitamin E: a toxicological position report', '3/5 · Safety · Free Radic Biol Med, 1992', 'https://pubmed.ncbi.nlm.nih.gov/1628854/'),
  ('vitamin-e', 'Multi-functional chitosan copolymer modified nanocrystals as oral andrographolide delivery systems for enhanced bioavailability and anti-inflammatory efficacy', '4/5 · Practical · Drug Deliv, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36447367/'),
  ('vitamin-e', 'Vitamin E supplementation is associated with lower levels of C-reactive protein only in higher dosages and combined with other antioxidants: The Cooperative Health Research in the Region of Augsburg (KORA) F4 study', '5/5 · Interactions · Br J Nutr, 2015', 'https://pubmed.ncbi.nlm.nih.gov/25895432/'),
  ('vitamin-k2', 'Vitamin K2 in Managing Nocturnal Leg Cramps: A Randomized Clinical Trial', '1/5 · Efficacy · JAMA Intern Med, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39466236/'),
  ('vitamin-k2', 'Effective management of atherosclerosis progress and hyperlipidemia with nattokinase: A clinical study with 1,062 participants', '2/5 · Safety · Front Cardiovasc Med, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36072877/'),
  ('vitamin-k2', 'Mechanistic insights into UV-A mediated bacterial disinfection via endogenous photosensitizers', '3/5 · Interactions · J Photochem Photobiol B, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32485344/'),
  ('vitamin-k2', 'Efficacy of vitamin K2 in the prevention and treatment of postmenopausal osteoporosis: A systematic review and meta-analysis of randomized controlled trials', '4/5 · Further reading · Front Public Health, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36033779/'),
  ('vitamin-k2', 'The combination effect of vitamin K and vitamin D on human bone quality: a meta-analysis of randomized controlled trials', '5/5 · Further reading · Food Funct, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32219282/'),
  ('thiamine', 'Impact of Vitamin B1 and Vitamin B2 Supplementation on Anxiety, Stress, and Sleep Quality: A Randomized, Double-Blind, Placebo-Controlled Trial', '1/5 · Efficacy · Nutrients, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40507089/'),
  ('thiamine', 'Thiamine (Vitamin B1)-An Essential Health Regulator', '2/5 · Mechanism · Nutrients, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40647310/'),
  ('thiamine', 'Pharmacological and dietary treatments for developmental stuttering: A systematic review', '3/5 · Safety · Neurosci Biobehav Rev, 2025', 'https://pubmed.ncbi.nlm.nih.gov/41106650/'),
  ('thiamine', '[Iatrogenic deficits of micronutrients]', '4/5 · Interactions · Vopr Pitan, 2021', 'https://pubmed.ncbi.nlm.nih.gov/34538035/'),
  ('thiamine', 'Vitamin Supplementation and Dementia: A Systematic Review', '5/5 · Further reading · Nutrients, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35268010/'),
  ('riboflavin', 'Effect of Vitamin B2 supplementation on migraine prophylaxis: a systematic review and meta-analysis', '1/5 · Efficacy · Nutr Neurosci, 2022', 'https://pubmed.ncbi.nlm.nih.gov/33779525/'),
  ('riboflavin', 'B Vitamins and the Brain: Mechanisms, Dose and Efficacy--A Review', '2/5 · Mechanism · Nutrients, 2016', 'https://pubmed.ncbi.nlm.nih.gov/26828517/'),
  ('riboflavin', 'Nutraceuticals and Headache 2024: Riboflavin, Coenzyme Q10, Feverfew, Magnesium, Melatonin, and Butterbur', '3/5 · Safety · Curr Pain Headache Rep, 2025', 'https://pubmed.ncbi.nlm.nih.gov/39853578/'),
  ('riboflavin', 'Riboflavin: The Health Benefits of a Forgotten Natural Vitamin', '4/5 · Interactions · Int J Mol Sci, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32023913/'),
  ('riboflavin', 'A systematic review and meta-analysis of the effects of pasteurization on milk vitamins, and evidence for raw milk consumption and other health-related outcomes', '5/5 · Further reading · J Food Prot, 2011', 'https://pubmed.ncbi.nlm.nih.gov/22054181/'),
  ('niacin', 'Improvement in inner retinal function in glaucoma with nicotinamide (vitamin B3) supplementation: A crossover randomized clinical trial', '1/5 · Efficacy · Clin Exp Ophthalmol, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32721104/'),
  ('niacin', 'Nicotinamide: A Multifaceted Molecule in Skin Health and Beyond', '2/5 · Mechanism · Medicina (Kaunas), 2025', 'https://pubmed.ncbi.nlm.nih.gov/40005371/'),
  ('niacin', 'Four-year overall survival update from the phase III HIMALAYA study of tremelimumab plus durvalumab in unresectable hepatocellular carcinoma', '3/5 · Safety · Ann Oncol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38382875/'),
  ('niacin', 'Nicotinamide riboside and pterostilbene reduces frequency and severity of undesirable symptoms of the menopause transition: an open-label, pilot clinical trial', '4/5 · Interactions · Front Aging, 2026', 'https://pubmed.ncbi.nlm.nih.gov/42211736/'),
  ('niacin', 'Intake and adequacy of the vegan diet. A systematic review of the evidence', '5/5 · Further reading · Clin Nutr, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33341313/'),
  ('pantothenic-acid', 'Vitamin B5 supplementation enhances intestinal development and alters microbes in weaned piglets', '1/5 · Efficacy · Anim Biotechnol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38587818/'),
  ('pantothenic-acid', 'B Vitamins and the Brain: Mechanisms, Dose and Efficacy--A Review', '2/5 · Mechanism · Nutrients, 2016', 'https://pubmed.ncbi.nlm.nih.gov/26828517/'),
  ('pantothenic-acid', 'Randomized Trial to Assess the Safety and Tolerability of Daily Intake of an Allulose Amino Acid-Based Hydration Beverage in Men and Women', '3/5 · Safety · Nutrients, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38892699/'),
  ('pantothenic-acid', 'Effect of biotin and pantothenic acid on performance and concentrations of avidin-binding substances in blood and milk of lactating dairy cows', '4/5 · Interactions · J Dairy Sci, 2015', 'https://pubmed.ncbi.nlm.nih.gov/26117345/'),
  ('pantothenic-acid', 'Safety and efficacy of vitamin B in cancer treatments: A systematic review', '5/5 · Further reading · J Oncol Pharm Pract, 2024', 'https://pubmed.ncbi.nlm.nih.gov/37231628/'),
  ('vitamin-b6', 'Effect of magnesium and vitamin B6 supplementation on mental health and quality of life in stressed healthy adults: Post-hoc analysis of a randomised controlled trial', '1/5 · Efficacy · Stress Health, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33864354/'),
  ('vitamin-b6', 'Mechanisms of action of vitamin B1 (thiamine), B6 (pyridoxine), and B12 (cobalamin) in pain: a narrative review', '2/5 · Mechanism · Nutr Neurosci, 2023', 'https://pubmed.ncbi.nlm.nih.gov/35156556/'),
  ('vitamin-b6', 'Five-year efficacy and safety of asfotase alfa therapy for adults and adolescents with hypophosphatasia', '3/5 · Safety · Bone, 2019', 'https://pubmed.ncbi.nlm.nih.gov/30576866/'),
  ('vitamin-b6', 'Maternal folic acid and multivitamin supplementation: International clinical evidence with considerations for the prevention of folate-sensitive birth defects', '4/5 · Practical · Prev Med Rep, 2021', 'https://pubmed.ncbi.nlm.nih.gov/34976673/'),
  ('vitamin-b6', 'Superiority of magnesium and vitamin B6 over magnesium alone on severe stress in healthy adults with low magnesemia: A randomized, single-blind clinical trial', '5/5 · Interactions · PLoS One, 2018', 'https://pubmed.ncbi.nlm.nih.gov/30562392/'),
  ('folate', 'Efficacy of oral folinic acid supplementation in children with autism spectrum disorder: a randomized double-blind, placebo-controlled trial', '1/5 · Efficacy · Eur J Pediatr, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39243316/'),
  ('folate', 'Nutrients, foods, and colorectal cancer prevention', '2/5 · Mechanism · Gastroenterology, 2015', 'https://pubmed.ncbi.nlm.nih.gov/25575572/'),
  ('folate', 'Efficacy and Safety of Mirvetuximab Soravtansine in Patients With Platinum-Resistant Ovarian Cancer With High Folate Receptor Alpha Expression: Results From the SORAYA Study', '3/5 · Safety · J Clin Oncol, 2023', 'https://pubmed.ncbi.nlm.nih.gov/36716407/'),
  ('folate', 'Vitamin B(12) deficiency from the perspective of a practicing hematologist', '4/5 · Practical · Blood, 2017', 'https://pubmed.ncbi.nlm.nih.gov/28360040/'),
  ('folate', 'Folic acid supplementation and malaria susceptibility and severity among people taking antifolate antimalarial drugs in endemic areas', '5/5 · Interactions · Cochrane Database Syst Rev, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36321557/'),
  ('choline', 'Maternal choline supplementation during the third trimester of pregnancy improves infant information processing speed: a randomized, double-blind, controlled feeding study', '1/5 · Efficacy · FASEB J, 2018', 'https://pubmed.ncbi.nlm.nih.gov/29217669/'),
  ('choline', 'An Update on Fetal Alcohol Syndrome-Pathogenesis, Risks, and Treatment', '2/5 · Mechanism · Alcohol Clin Exp Res, 2016', 'https://pubmed.ncbi.nlm.nih.gov/27375266/'),
  ('choline', 'Serious adverse events following treatment of visceral leishmaniasis: A systematic review and meta-analysis', '3/5 · Safety · PLoS Negl Trop Dis, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33780461/'),
  ('choline', 'Maternal folic acid and multivitamin supplementation: International clinical evidence with considerations for the prevention of folate-sensitive birth defects', '4/5 · Practical · Prev Med Rep, 2021', 'https://pubmed.ncbi.nlm.nih.gov/34976673/'),
  ('choline', 'Combined in ovo and post-hatch choline supplementation enhances growth and muscle development in goslings', '5/5 · Interactions · Poult Sci, 2026', 'https://pubmed.ncbi.nlm.nih.gov/42202563/'),
  ('inositol', 'Myo-inositol Supplementation to Prevent Pregnancy Complications in Polycystic Ovary Syndrome: A Randomized Clinical Trial', '1/5 · Efficacy · JAMA, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40920401/'),
  ('inositol', 'Metabolic transcriptional memory', '2/5 · Mechanism · Mol Metab, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32240621/'),
  ('inositol', 'Metformin and Myo-Inositol: A Comparative Analysis', '3/5 · Safety · Gynecol Obstet Invest, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41269915/'),
  ('inositol', 'Iron bioavailability and dietary reference values', '4/5 · Practical · Am J Clin Nutr, 2010', 'https://pubmed.ncbi.nlm.nih.gov/20200263/'),
  ('inositol', 'The loop-tail mouse model displays open and closed caudal neural tube defects', '5/5 · Interactions · Dis Model Mech, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37589570/'),
  ('calcium-citrate', 'Urate-lowering effect of calcium supplementation: Analyses of a randomized controlled trial', '1/5 · Efficacy · Clin Nutr ESPEN, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35623880/'),
  ('calcium-citrate', '36th International Symposium on Intensive Care and Emergency Medicine : Brussels, Belgium. 15-18 March 2016', '2/5 · Mechanism · Crit Care, 2016', 'https://pubmed.ncbi.nlm.nih.gov/27885969/'),
  ('calcium-citrate', 'Evaluating adherence, tolerability and safety of oral calcium citrate in elderly osteopenic subjects: a real-life non-interventional, prospective, multicenter study', '3/5 · Safety · Aging Clin Exp Res, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38345765/'),
  ('calcium-citrate', 'Effect of estrogen treatment and vitamin D status on differing bioavailabilities of calcium carbonate and calcium citrate', '4/5 · Interactions · J Clin Pharmacol, 2002', 'https://pubmed.ncbi.nlm.nih.gov/12412824/'),
  ('calcium-citrate', 'Effect of Calcium Citrate Versus Calcium Carbonate on Parathyroid Hormone Levels in Patients Undergoing Bariatric Surgery: A Systematic Review and Meta-Analysis of Randomized Controlled Trials', '5/5 · Further reading · Obes Surg, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41806228/'),
  ('potassium', 'Potassium Intake and Blood Pressure: A Dose-Response Meta-Analysis of Randomized Controlled Trials', '1/5 · Efficacy · J Am Heart Assoc, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32500831/'),
  ('potassium', 'Lactic acid and exercise performance : culprit or friend?', '2/5 · Mechanism · Sports Med, 2006', 'https://pubmed.ncbi.nlm.nih.gov/16573355/'),
  ('potassium', 'Vonoprazan: A New Potassium-Competitive Acid Blocker', '3/5 · Safety · J Pharm Technol, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37323765/'),
  ('potassium', 'Effect of meal timing on pharmacokinetics and pharmacodynamics of tegoprazan in healthy male volunteers', '4/5 · Practical · Clin Transl Sci, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33382926/'),
  ('potassium', 'Diuretics in critically ill patients: a narrative review of their mechanisms and applications', '5/5 · Interactions · Br J Anaesth, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40221314/'),
  ('iodine', 'Selenium Supplementation in Patients with Hashimoto Thyroiditis: A Systematic Review and Meta-Analysis of Randomized Clinical Trials', '1/5 · Efficacy · Thyroid, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38243784/'),
  ('iodine', 'Toward High-Energy-Density Aqueous Zinc-Iodine Batteries: Multielectron Pathways', '2/5 · Mechanism · ACS Nano, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39383309/'),
  ('iodine', 'Povidone-Iodine Adverse Effects and Alternatives for Ocular Procedures', '3/5 · Safety · J Ocul Pharmacol Ther, 2023', 'https://pubmed.ncbi.nlm.nih.gov/36763602/'),
  ('iodine', 'A concise review of Hashimoto thyroiditis (HT) and the importance of iodine, selenium, vitamin D and gluten on the autoimmunity and dietary management of HT patients.Points that need more investigation', '4/5 · Interactions · Hell J Nucl Med, 2017', 'https://pubmed.ncbi.nlm.nih.gov/28315909/'),
  ('iodine', 'The Influence of Nutritional Intervention in the Treatment of Hashimoto''s Thyroiditis-A Systematic Review', '5/5 · Further reading · Nutrients, 2023', 'https://pubmed.ncbi.nlm.nih.gov/36839399/'),
  ('copper', 'A randomized, placebo-controlled, clinical trial of high-dose supplementation with vitamins C and E, beta carotene, and zinc for age-related macular degeneration and vision loss: AREDS report no. 8', '1/5 · Efficacy · Arch Ophthalmol, 2001', 'https://pubmed.ncbi.nlm.nih.gov/11594942/'),
  ('copper', 'The molecular mechanism and therapeutic landscape of copper and cuproptosis in cancer', '2/5 · Mechanism · Signal Transduct Target Ther, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40341098/'),
  ('copper', 'Zinc Toxicity: Understanding the Limits', '3/5 · Safety · Molecules, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38999082/'),
  ('copper', 'The Combined Effects of Cr(III) Supplementation and Iron Deficiency on the Copper and Zinc Status in Wistar Rats', '4/5 · Interactions · Biol Trace Elem Res, 2019', 'https://pubmed.ncbi.nlm.nih.gov/30430418/'),
  ('copper', 'ATP7A-related copper transport disorders: A systematic review and definition of the clinical subtypes', '5/5 · Further reading · J Inherit Metab Dis, 2023', 'https://pubmed.ncbi.nlm.nih.gov/36692329/'),
  ('manganese', 'Efficacy of extracorporeal shock wave therapy and nutraceutical supplementation in the treatment of lateral epicondylitis: a randomized controlled trial', '1/5 · Efficacy · Front Rehabil Sci, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40567345/'),
  ('manganese', 'Mitochondrial Sirtuins and Doxorubicin-induced Cardiotoxicity', '2/5 · Mechanism · Cardiovasc Toxicol, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33438065/'),
  ('manganese', 'First-in-Human Safety, Tolerability, Efficacy, and Pharmacokinetics of Pegfosimer Manganese (SN132D) for Contrast-Enhanced MRI of Breast Cancer', '3/5 · Safety · Invest Radiol, 2025', 'https://pubmed.ncbi.nlm.nih.gov/39946211/'),
  ('manganese', 'Combined cadmium-zinc interactions alter manganese, lead, copper uptake by Melissa officinalis', '4/5 · Interactions · Sci Rep, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32015369/'),
  ('manganese', 'Nutrition, Obesity, and Seborrheic Dermatitis: Systematic Review', '5/5 · Further reading · JMIR Dermatol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39102684/'),
  ('chromium', 'Chromium supplementation and type 2 diabetes mellitus: an extensive systematic review', '1/5 · Efficacy · Environ Geochem Health, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39541030/'),
  ('chromium', 'Chromium picolinate and biotin combination improves glucose metabolism in treated, uncontrolled overweight to obese patients with type 2 diabetes', '2/5 · Safety · Diabetes Metab Res Rev, 2008', 'https://pubmed.ncbi.nlm.nih.gov/17506119/'),
  ('chromium', 'Interaction Between Chromium Picolinate Supplementation and Strength Training Modifies Cardiomyocyte Relaxation in Obese Rats', '3/5 · Interactions · Biomedicines, 2026', 'https://pubmed.ncbi.nlm.nih.gov/42351674/'),
  ('chromium', 'Systematic Review of the Effects of Chromium(III) on Chickens', '4/5 · Further reading · Biol Trace Elem Res, 2019', 'https://pubmed.ncbi.nlm.nih.gov/30430417/'),
  ('chromium', 'A pilot study of chromium picolinate for weight loss', '5/5 · Further reading · J Altern Complement Med, 2010', 'https://pubmed.ncbi.nlm.nih.gov/20192914/'),
  ('molybdenum', 'Lung cancer chemoprevention: a randomized, double-blind trial in Linxian, China', '1/5 · Efficacy · Cancer Epidemiol Biomarkers Prev, 2006', 'https://pubmed.ncbi.nlm.nih.gov/16896051/'),
  ('molybdenum', 'Optimizing nutrient transporters to enhance disease resistance in rice', '2/5 · Mechanism · J Exp Bot, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38437153/'),
  ('molybdenum', 'Effect of tiomolibdate choline on copper balance in patients with Wilson disease: An open-label phase 2 trial', '3/5 · Safety · Hepatol Commun, 2026', 'https://pubmed.ncbi.nlm.nih.gov/42155004/'),
  ('molybdenum', 'X-ray absorption spectroscopy of copper and iron in sheep digesta', '4/5 · Interactions · J Trace Elem Med Biol, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35504155/'),
  ('molybdenum', 'A systematic review on black pepper (Piper nigrum L.): from folk uses to pharmacological applications', '5/5 · Further reading · Crit Rev Food Sci Nutr, 2019', 'https://pubmed.ncbi.nlm.nih.gov/30740986/'),
  ('boron', 'Assessment of boron-containing compounds and oleoylethanolamide supplementation on the recovery trend in patients with COVID-19: A structured summary of a study protocol for a randomized controlled trial', '1/5 · Efficacy · Trials, 2020', 'https://pubmed.ncbi.nlm.nih.gov/33109244/'),
  ('boron', 'Metallic Nanoislands on Graphene for Biomechanical Sensing', '2/5 · Mechanism · ACS Omega, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32656394/'),
  ('boron', 'Cefepime-Taniborbactam: A Novel Cephalosporin/β-Lactamase Inhibitor Combination', '3/5 · Safety · Drugs, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39214942/'),
  ('boron', 'Strategic foliar nutrition with Sorbitol, Mannitol, and Boron improves physiological performance and yield in Faba beans on reclaimed sandy soil', '4/5 · Interactions · Sci Rep, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41571771/'),
  ('boron', 'Efficacy and safety of Boron Neutron Capture Therapy: a systematic review', '5/5 · Further reading · Int J Radiat Biol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39401330/'),
  ('magnesium-citrate', 'Effects of Magnesium Citrate, Magnesium Oxide, and Magnesium Sulfate Supplementation on Arterial Stiffness: A Randomized, Double-Blind, Placebo-Controlled Intervention Trial', '1/5 · Efficacy · J Am Heart Assoc, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35253448/'),
  ('magnesium-citrate', 'Potassium Magnesium Citrate Is Superior to Potassium Chloride in Reversing Metabolic Side Effects of Chlorthalidone', '2/5 · Safety · Hypertension, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37846572/'),
  ('magnesium-citrate', 'Magnesium in Migraine Prophylaxis-Is There an Evidence-Based Rationale? A Systematic Review', '3/5 · Further reading · Headache, 2018', 'https://pubmed.ncbi.nlm.nih.gov/29131326/'),
  ('magnesium-citrate', 'Magnesium bioavailability from magnesium citrate and magnesium oxide', '4/5 · Further reading · J Am Coll Nutr, 1990', 'https://pubmed.ncbi.nlm.nih.gov/2407766/'),
  ('magnesium-citrate', 'Systematic review and meta-analysis: Sodium picosulphate with magnesium citrate as bowel preparation for colonoscopy', '5/5 · Further reading · United European Gastroenterol J, 2017', 'https://pubmed.ncbi.nlm.nih.gov/29163958/'),
  ('magnesium-threonate', 'Magnesium-L-threonate improves sleep quality and daytime functioning in adults with self-reported sleep problems: A randomized controlled trial', '1/5 · Efficacy · Sleep Med X, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39252819/'),
  ('magnesium-threonate', 'Recent advances in pharmacological management of attention-deficit/hyperactivity disorder: moving beyond stimulants', '2/5 · Safety · Expert Opin Pharmacother, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38771653/'),
  ('magnesium-threonate', 'A Magtein(®), Magnesium L-Threonate, -Based Formula Improves Brain Cognitive Functions in Healthy Chinese Adults', '3/5 · Further reading · Nutrients, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36558392/'),
  ('magnesium-threonate', 'L-Threonic Acid Magnesium Salt Supplementation in ADHD: An Open-Label Pilot Study', '4/5 · Further reading · J Diet Suppl, 2021', 'https://pubmed.ncbi.nlm.nih.gov/32162987/'),
  ('magnesium-threonate', 'Targeting the NMDA receptor subunit NR2B for treating or preventing age-related memory decline', '5/5 · Further reading · Expert Opin Ther Targets, 2014', 'https://pubmed.ncbi.nlm.nih.gov/25152202/'),
  ('nac', 'Supplementing Glycine and N-Acetylcysteine (GlyNAC) in Older Adults Improves Glutathione Deficiency, Oxidative Stress, Mitochondrial Dysfunction, Inflammation, Physical Function, and Aging Hallmarks: A Randomized Clinical Trial', '1/5 · Efficacy · J Gerontol A Biol Sci Med Sci, 2023', 'https://pubmed.ncbi.nlm.nih.gov/35975308/'),
  ('nac', 'NAC, NAC, Knockin'' on Heaven''s door: Interpreting the mechanism of action of N-acetylcysteine in tumor and immune cells', '2/5 · Mechanism · Redox Biol, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36242913/'),
  ('nac', 'Intravenous N-acetylcysteine improves transplant-free survival in early stage non-acetaminophen acute liver failure', '3/5 · Safety · Gastroenterology, 2009', 'https://pubmed.ncbi.nlm.nih.gov/19524577/'),
  ('nac', 'Combined Metabolic Activators Decrease Liver Steatosis by Activating Mitochondrial Metabolism in Hamsters Fed with a High-Fat Diet', '4/5 · Interactions · Biomedicines, 2021', 'https://pubmed.ncbi.nlm.nih.gov/34680557/'),
  ('nac', 'Triple-Negative Breast Cancer and Predictive Markers of Response to Neoadjuvant Chemotherapy: A Systematic Review', '5/5 · Further reading · Int J Mol Sci, 2023', 'https://pubmed.ncbi.nlm.nih.gov/36769287/'),
  ('taurine', 'Efficacy and tolerability of an oral supplement containing amino acids, iron, selenium, and marine hydrolyzed collagen in subjects with hair loss (androgenetic alopecia, AGA or FAGA or telogen effluvium). A prospective, randomized, 3-month, controlled, assessor-blinded study', '1/5 · Efficacy · Skin Res Technol, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37357646/'),
  ('taurine', 'Taurine, energy drinks, and neuroendocrine effects', '2/5 · Mechanism · Cleve Clin J Med, 2016', 'https://pubmed.ncbi.nlm.nih.gov/27938518/'),
  ('taurine', 'Energy Drinks Induce Acute Cardiovascular and Metabolic Changes Pointing to Potential Risks for Young Adults: A Randomized Controlled Trial', '3/5 · Safety · J Nutr, 2019', 'https://pubmed.ncbi.nlm.nih.gov/30805607/'),
  ('taurine', 'Caffeine and taurine: a systematic review and network meta-analysis of their individual and combined effects on physical capacity, cognitive function, and physiological markers', '4/5 · Interactions · J Int Soc Sports Nutr, 2025', 'https://pubmed.ncbi.nlm.nih.gov/41032459/'),
  ('taurine', 'Pharmacotherapy for Alcohol Use Disorder: A Systematic Review and Meta-Analysis', '5/5 · Further reading · JAMA, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37934220/'),
  ('l-tyrosine', 'Safety and efficacy of rilzabrutinib vs placebo in adults with immune thrombocytopenia: the phase 3 LUNA3 study', '1/5 · Efficacy · Blood, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40090011/'),
  ('l-tyrosine', 'Preeclampsia-Pathophysiology and Clinical Presentations: JACC State-of-the-Art Review', '2/5 · Mechanism · J Am Coll Cardiol, 2020', 'https://pubmed.ncbi.nlm.nih.gov/33004135/'),
  ('l-tyrosine', 'Safety and efficacy of continuous subcutaneous foslevodopa-foscarbidopa in patients with advanced Parkinson''s disease: a randomised, double-blind, active-controlled, phase 3 trial', '3/5 · Safety · Lancet Neurol, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36402160/'),
  ('l-tyrosine', 'Severe Impact of Omeprazole Timing on pH-Sensitive Dasatinib Absorption: Unveiling Substantial Drug-Drug Interaction', '4/5 · Practical · J Clin Pharmacol, 2025', 'https://pubmed.ncbi.nlm.nih.gov/39726232/'),
  ('l-tyrosine', 'Safety and efficacy of continuous subcutaneous levodopa-carbidopa infusion (ND0612) for Parkinson''s disease with motor fluctuations (BouNDless): a phase 3, randomised, double-blind, double-dummy, multicentre trial', '5/5 · Interactions · Lancet Neurol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38499015/'),
  ('l-lysine', 'Effect of lutein supplementation on blood lipids and advanced glycation end products in adults with central obesity: a double-blind randomized controlled trial', '1/5 · Efficacy · Food Funct, 2025', 'https://pubmed.ncbi.nlm.nih.gov/39964702/'),
  ('l-lysine', 'Lactate-Lactylation Hands between Metabolic Reprogramming and Immunosuppression', '2/5 · Mechanism · Int J Mol Sci, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36233246/'),
  ('l-lysine', 'Dietary glycation compounds - implications for human health', '3/5 · Safety · Crit Rev Toxicol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39150724/'),
  ('l-lysine', 'Anti-AGEing defences against Alzheimer''s disease', '4/5 · Interactions · Biochem Soc Trans, 2003', 'https://pubmed.ncbi.nlm.nih.gov/14641072/'),
  ('l-lysine', 'Safety assessment of L-lysine oral intake: a systematic review', '5/5 · Further reading · Amino Acids, 2019', 'https://pubmed.ncbi.nlm.nih.gov/30661148/'),
  ('l-arginine', 'Effect of food sources of nitrate, polyphenols, L-arginine and L-citrulline on endurance exercise performance: a systematic review and meta-analysis of randomised controlled trials', '1/5 · Efficacy · J Int Soc Sports Nutr, 2021', 'https://pubmed.ncbi.nlm.nih.gov/34965876/'),
  ('l-arginine', 'Dietary Nitrate and Physical Performance', '2/5 · Mechanism · Annu Rev Nutr, 2018', 'https://pubmed.ncbi.nlm.nih.gov/30130468/'),
  ('l-arginine', 'Paracetamol: mechanism of action, applications and safety concern', '3/5 · Safety · Acta Pol Pharm, 2014', 'https://pubmed.ncbi.nlm.nih.gov/24779190/'),
  ('l-arginine', 'Biomimetic Viruslike and Charge Reversible Nanoparticles to Sequentially Overcome Mucus and Epithelial Barriers for Oral Insulin Delivery', '4/5 · Practical · ACS Appl Mater Interfaces, 2018', 'https://pubmed.ncbi.nlm.nih.gov/29504398/'),
  ('l-arginine', 'The Emerging Role of L-Arginine and Creatine Supplementation Combined with Exercise on Hippocampal Neurogenesis, Spatial Learning, and Cognitive Flexibility in Aging and Neurodegenerative Diseases', '5/5 · Interactions · Mol Neurobiol, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41514140/'),
  ('alpha-lipoic-acid', 'Micronutrient Supplementation to Reduce Cardiovascular Risk', '1/5 · Efficacy · J Am Coll Cardiol, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36480969/'),
  ('alpha-lipoic-acid', 'ALSUntangled #79: alpha-lipoic acid', '2/5 · Mechanism · Amyotroph Lateral Scler Frontotemporal Degener, 2026', 'https://pubmed.ncbi.nlm.nih.gov/40411245/'),
  ('alpha-lipoic-acid', 'Diabetic Peripheral Neuropathy: Prevention and Treatment', '3/5 · Safety · Am Fam Physician, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38574212/'),
  ('alpha-lipoic-acid', 'Diabetes and the associated complications: The role of antioxidants in diabetes therapy and care', '4/5 · Interactions · Biomed Pharmacother, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39541789/'),
  ('alpha-lipoic-acid', 'Effects of Oral Alpha-Lipoic Acid Treatment on Diabetic Polyneuropathy: A Meta-Analysis and Systematic Review', '5/5 · Further reading · Nutrients, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37630823/'),
  ('quercetin', 'Micronutrient Supplementation to Reduce Cardiovascular Risk', '1/5 · Efficacy · J Am Coll Cardiol, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36480969/'),
  ('quercetin', 'Quercetin, Inflammation and Immunity', '2/5 · Mechanism · Nutrients, 2016', 'https://pubmed.ncbi.nlm.nih.gov/26999194/'),
  ('quercetin', 'Senolytics dasatinib and quercetin in idiopathic pulmonary fibrosis: results of a phase I, single-blind, single-center, randomized, placebo-controlled pilot trial on feasibility and tolerability', '3/5 · Safety · EBioMedicine, 2023', 'https://pubmed.ncbi.nlm.nih.gov/36857968/'),
  ('quercetin', 'Effects of Quercetin Glycoside Supplementation Combined With Low-Intensity Resistance Training on Muscle Quantity and Stiffness: A Randomized, Controlled Trial', '4/5 · Interactions · Front Nutr, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35873410/'),
  ('quercetin', 'Improving quercetin bioavailability: A systematic review and meta-analysis of human intervention studies', '5/5 · Further reading · Food Chem, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40037045/'),
  ('curcumin', 'Efficacy and Safety of Curcumin and Curcuma longa Extract in the Treatment of Arthritis: A Systematic Review and Meta-Analysis of Randomized Controlled Trial', '1/5 · Efficacy · Front Immunol, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35935936/'),
  ('curcumin', 'Use of Nutritional Strategies, Bioactive Compounds, and Dietary Supplements in Young Athletes: From Evidence to Potential Risks-A Narrative Review', '2/5 · Mechanism · Nutrients, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40647297/'),
  ('curcumin', 'Safety and efficacy of curcumin versus diclofenac in knee osteoarthritis: a randomized open-label parallel-arm study', '3/5 · Safety · Trials, 2019', 'https://pubmed.ncbi.nlm.nih.gov/30975196/'),
  ('curcumin', 'A Randomized Controlled Trial to Determine the Effects of Curcumin and Epigallocatechin-3-Gallate Supplementation on Serum Brain-Derived Neurotrophic Factor and Mood Disturbance in Adults', '4/5 · Interactions · Nutrients, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41830024/'),
  ('curcumin', 'Effect of curcumin on rheumatoid arthritis: a systematic review and meta-analysis', '5/5 · Further reading · Front Immunol, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37325651/'),
  ('resveratrol', 'Role of resveratrol supplementation in regulation of glucose hemostasis, inflammation and oxidative stress in patients with diabetes mellitus type 2: A randomized, placebo-controlled trial', '1/5 · Efficacy · Complement Ther Med, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35240291/'),
  ('resveratrol', 'Aging and age-related diseases: from mechanisms to therapeutic strategies', '2/5 · Mechanism · Biogerontology, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33502634/'),
  ('resveratrol', 'Resveratrol (RV): A pharmacological review and call for further research', '3/5 · Safety · Biomed Pharmacother, 2021', 'https://pubmed.ncbi.nlm.nih.gov/34649335/'),
  ('resveratrol', 'Potential Adverse Effects of Resveratrol: A Literature Review', '4/5 · Interactions · Int J Mol Sci, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32197410/'),
  ('resveratrol', 'Resveratrol and Female Fertility: A Systematic Review', '5/5 · Further reading · Int J Mol Sci, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39684501/'),
  ('berberine', 'The effect of berberine supplementation on obesity parameters, inflammation and liver function enzymes: A systematic review and meta-analysis of randomized controlled trials', '1/5 · Efficacy · Clin Nutr ESPEN, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32690176/'),
  ('berberine', 'Biological properties and clinical applications of berberine', '2/5 · Mechanism · Front Med, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32335802/'),
  ('berberine', 'Efficacy and safety of HIMABERB® Berberine on glycemic control in patients with prediabetes: double-blind, placebo-controlled, and randomized pilot trial', '3/5 · Safety · BMC Endocr Disord, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37679692/'),
  ('berberine', 'Berberine suppresses colon inflammation via integrated modulation of host metabolism, microbial ecology, and innate immune signaling', '4/5 · Interactions · Theranostics, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41356191/'),
  ('berberine', 'The effect of Berberine on weight loss in order to prevent obesity: A systematic review', '5/5 · Further reading · Biomed Pharmacother, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32353823/'),
  ('milk-thistle', 'Effects of Silybum marianum, Pueraria lobate, combined with Salvia miltiorrhiza tablets on non-alcoholic fatty liver disease in adults: A triple-blind, randomized, placebo-controlled clinical trial', '1/5 · Efficacy · Clin Nutr ESPEN, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38879879/'),
  ('milk-thistle', 'Exploring the Protective Effects of Taxifolin in Cardiovascular Health: A Comprehensive Review', '2/5 · Mechanism · Int J Mol Sci, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40869372/'),
  ('milk-thistle', 'Safety and toxicity of silymarin, the major constituent of milk thistle extract: An updated review', '3/5 · Safety · Phytother Res, 2019', 'https://pubmed.ncbi.nlm.nih.gov/31069872/'),
  ('milk-thistle', 'Silibinin Suppresses Tumor Cell-Intrinsic Resistance to Nintedanib and Enhances Its Clinical Activity in Lung Cancer', '4/5 · Interactions · Cancers (Basel), 2021', 'https://pubmed.ncbi.nlm.nih.gov/34439322/'),
  ('milk-thistle', 'Administration of silymarin in NAFLD/NASH: A systematic review and meta-analysis', '5/5 · Further reading · Ann Hepatol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38579127/'),
  ('ashwagandha', 'Does Ashwagandha supplementation have a beneficial effect on the management of anxiety and stress? A systematic review and meta-analysis of randomized controlled trials', '1/5 · Efficacy · Phytother Res, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36017529/'),
  ('ashwagandha', 'Withania somnifera (Ashwagandha) supplementation: a review of its mechanisms, health benefits, and role in sports performance', '2/5 · Mechanism · Nutr Metab (Lond), 2025', 'https://pubmed.ncbi.nlm.nih.gov/39910586/'),
  ('ashwagandha', 'Safety of Ashwagandha Root Extract: A Randomized, Placebo-Controlled, study in Healthy Volunteers', '3/5 · Safety · Complement Ther Med, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33338583/'),
  ('ashwagandha', 'Impact of ashwagandha (Withania somnifera L.) supplementation on serum lipid concentrations and anthropometric parameters in adults with overweight and obesity: a double-blind, placebo-controlled pilot study', '4/5 · Interactions · Nutr Metab (Lond), 2025', 'https://pubmed.ncbi.nlm.nih.gov/41204297/'),
  ('ashwagandha', 'Effects of Ashwagandha (Withania Somnifera) on stress and anxiety: A systematic review and meta-analysis', '5/5 · Further reading · Explore (NY), 2024', 'https://pubmed.ncbi.nlm.nih.gov/39348746/'),
  ('ginkgo', 'A randomized, double-blind, placebo-controlled study of Cistanche tubulosa and Ginkgo biloba extracts for the improvement of cognitive function in middle-aged and elderly people', '1/5 · Efficacy · Phytother Res, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38972848/'),
  ('ginkgo', 'Ginkgo biloba: indications, mechanisms, and safety', '2/5 · Mechanism · Psychiatr Clin North Am, 2013', 'https://pubmed.ncbi.nlm.nih.gov/23538078/'),
  ('ginkgo', 'Medicinal herbs for the treatment of anxiety: A systematic review and network meta-analysis', '3/5 · Safety · Pharmacol Res, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35378276/'),
  ('ginkgo', 'Combining a high DHA multi-nutrient supplement with aerobic exercise: Protocol for a randomised controlled study assessing mobility and cognitive function in older women', '4/5 · Interactions · Prostaglandins Leukot Essent Fatty Acids, 2019', 'https://pubmed.ncbi.nlm.nih.gov/30975379/'),
  ('ginkgo', 'Efficacy and adverse effects of ginkgo biloba for cognitive impairment and dementia: a systematic review and meta-analysis', '5/5 · Further reading · J Alzheimers Dis, 2015', 'https://pubmed.ncbi.nlm.nih.gov/25114079/'),
  ('panax-ginseng', 'Vitamin E and ginseng supplementation to enhance female sexual function: a randomized, double-blind, placebo-controlled, clinical trial', '1/5 · Efficacy · Women Health, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32893745/'),
  ('panax-ginseng', 'Overview of Panax ginseng and its active ingredients protective mechanism on cardiovascular diseases', '2/5 · Mechanism · J Ethnopharmacol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38964625/'),
  ('panax-ginseng', 'Safety and tolerability of Panax ginseng root extract: a randomized, placebo-controlled, clinical trial in healthy Korean volunteers', '3/5 · Safety · J Altern Complement Med, 2012', 'https://pubmed.ncbi.nlm.nih.gov/22909282/'),
  ('panax-ginseng', 'Panax ginseng and aging related disorders: A systematic review', '4/5 · Further reading · Exp Gerontol, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35143871/'),
  ('panax-ginseng', 'Interactions between herbal medicines and prescribed drugs: an updated systematic review', '5/5 · Further reading · Drugs, 2009', 'https://pubmed.ncbi.nlm.nih.gov/19719333/'),
  ('green-tea-extract', 'Synergistic Effects of Green Tea Extract and Ginger Supplementation on Endurance Performance and Thermal Perception in Normothermic and Cold Environments: A Randomized, Placebo-Controlled, Double-Blind Crossover Trial', '1/5 · Efficacy · Nutrients, 2025', 'https://pubmed.ncbi.nlm.nih.gov/41010475/'),
  ('green-tea-extract', '36th International Symposium on Intensive Care and Emergency Medicine : Brussels, Belgium. 15-18 March 2016', '2/5 · Mechanism · Crit Care, 2016', 'https://pubmed.ncbi.nlm.nih.gov/27885969/'),
  ('green-tea-extract', 'Therapeutic effect of high-dose green tea extract on weight reduction: A randomized, double-blind, placebo-controlled clinical trial', '3/5 · Safety · Clin Nutr, 2016', 'https://pubmed.ncbi.nlm.nih.gov/26093535/'),
  ('green-tea-extract', 'Timing-dependent effects of green tea supplementation and exercise intensity on oxidative stress in diabetic rats: a 2 × 2 × 2 factorial study', '4/5 · Interactions · Front Sports Act Living, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41930287/'),
  ('green-tea-extract', 'Green tea effects on cognition, mood and human brain function: A systematic review', '5/5 · Further reading · Phytomedicine, 2017', 'https://pubmed.ncbi.nlm.nih.gov/28899506/'),
  ('garlic-extract', 'Antihypertensive Effects of an Optimized Aged Garlic Extract in Subjects with Grade I Hypertension and Antihypertensive Drug Therapy: A Randomized, Triple-Blind Controlled Trial', '1/5 · Efficacy · Nutrients, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37686723/'),
  ('garlic-extract', 'Enhanced immunocompetence by garlic: role in bladder cancer and other malignancies', '2/5 · Mechanism · J Nutr, 2001', 'https://pubmed.ncbi.nlm.nih.gov/11238818/'),
  ('garlic-extract', 'Nutraceuticals and Blood Pressure Control: Results from Clinical Trials and Meta-Analyses', '3/5 · Safety · High Blood Press Cardiovasc Prev, 2015', 'https://pubmed.ncbi.nlm.nih.gov/25788027/'),
  ('garlic-extract', 'Effects of aged garlic extract on blood pressure in hypertensive patients: A systematic review and meta-analysis of randomized controlled trials', '4/5 · Further reading · Prostaglandins Other Lipid Mediat, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39437887/'),
  ('garlic-extract', 'LDL-Cholesterol-Lowering Effects of a Dietary Supplement Containing Onion and Garlic Extract Used in Healthy Volunteers', '5/5 · Further reading · Nutrients, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39203947/'),
  ('saw-palmetto', 'Impact of a Novel Dietary Supplement on Efficacy of Pharmacological Treatments for Androgenic Alopecia: A Real-Life, Multicenter, Randomized, Assessor-Blinded Trial on 225 Subjects', '1/5 · Efficacy · J Cosmet Dermatol, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40853071/'),
  ('saw-palmetto', 'Herbal Remedies for Hair Loss: A Review of Efficacy and Safety', '2/5 · Mechanism · Skin Appendage Disord, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40771449/'),
  ('saw-palmetto', 'Natural Hair Supplement: Friend or Foe? Saw Palmetto, a Systematic Review in Alopecia', '3/5 · Safety · Skin Appendage Disord, 2020', 'https://pubmed.ncbi.nlm.nih.gov/33313047/'),
  ('saw-palmetto', 'Saw palmetto extracts for treatment of benign prostatic hyperplasia: a systematic review', '4/5 · Further reading · JAMA, 1998', 'https://pubmed.ncbi.nlm.nih.gov/9820264/'),
  ('saw-palmetto', 'Oral and Topical Administration of a Standardized Saw Palmetto Oil Reduces Hair Fall and Improves the Hair Growth in Androgenetic Alopecia Subjects - A 16-Week Randomized, Placebo-Controlled Study', '5/5 · Further reading · Clin Cosmet Investig Dermatol, 2023', 'https://pubmed.ncbi.nlm.nih.gov/38021422/'),
  ('lutein', 'Lutein + zeaxanthin and omega-3 fatty acids for age-related macular degeneration: the Age-Related Eye Disease Study 2 (AREDS2) randomized clinical trial', '1/5 · Efficacy · JAMA, 2013', 'https://pubmed.ncbi.nlm.nih.gov/23644932/'),
  ('lutein', 'Cataracts: we have perfected the surgery, but is it time for prevention?', '2/5 · Mechanism · Curr Opin Ophthalmol, 2011', 'https://pubmed.ncbi.nlm.nih.gov/21150604/'),
  ('lutein', 'The effects of lutein/ zeaxanthin (Lute-gen(®)) on eye health, eye strain, sleep quality, and attention in high electronic screen users: a randomized, double-blind, placebo-controlled study', '3/5 · Safety · Front Nutr, 2025', 'https://pubmed.ncbi.nlm.nih.gov/39963662/'),
  ('lutein', 'The effect of lutein and zeaxanthin supplementation on metabolites of these carotenoids in the serum of persons aged 60 or older', '4/5 · Interactions · Invest Ophthalmol Vis Sci, 2006', 'https://pubmed.ncbi.nlm.nih.gov/17122108/'),
  ('lutein', 'The Effect of Lutein/Zeaxanthin Intake on Human Macular Pigment Optical Density: A Systematic Review and Meta-Analysis', '5/5 · Further reading · Adv Nutr, 2021', 'https://pubmed.ncbi.nlm.nih.gov/34157098/'),
  ('astaxanthin', 'The Protective Role of Astaxanthin for UV-Induced Skin Deterioration in Healthy People-A Randomized, Double-Blind, Placebo-Controlled Trial', '1/5 · Efficacy · Nutrients, 2018', 'https://pubmed.ncbi.nlm.nih.gov/29941810/'),
  ('astaxanthin', 'Astaxanthin in Skin Health, Repair, and Disease: A Comprehensive Review', '2/5 · Mechanism · Nutrients, 2018', 'https://pubmed.ncbi.nlm.nih.gov/29690549/'),
  ('astaxanthin', 'A nutraceutical approach (Armolipid Plus) to reduce total and LDL cholesterol in individuals with mild to moderate dyslipidemia: Review of the clinical evidence', '3/5 · Safety · Atheroscler Suppl, 2017', 'https://pubmed.ncbi.nlm.nih.gov/27998714/'),
  ('astaxanthin', 'Bioavailability of astaxanthin in Haematococcus algal extract: the effects of timing of diet and smoking habits', '4/5 · Practical · Biosci Biotechnol Biochem, 2009', 'https://pubmed.ncbi.nlm.nih.gov/19734684/'),
  ('astaxanthin', 'Benefits of Exercise and Astaxanthin Supplementation: Are There Additive or Synergistic Effects?', '5/5 · Interactions · Antioxidants (Basel), 2021', 'https://pubmed.ncbi.nlm.nih.gov/34071514/'),
  ('beta-glucan', 'Effects of Oat Beta-Glucan Intake on Lipid Profiles in Hypercholesterolemic Adults: A Systematic Review and Meta-Analysis of Randomized Controlled Trials', '1/5 · Efficacy · Nutrients, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35631184/'),
  ('beta-glucan', 'Effects of beta-glucans on the immune system', '2/5 · Mechanism · Medicina (Kaunas), 2007', 'https://pubmed.ncbi.nlm.nih.gov/17895634/'),
  ('beta-glucan', 'Immunogenicity, safety, and tolerability of a β-glucan-CpG-adjuvanted respiratory syncytial virus vaccine in Japanese healthy participants aged 60 to 80 years: A phase 2, randomized, double-blind, dose-finding study', '3/5 · Safety · Hum Vaccin Immunother, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40257186/'),
  ('beta-glucan', 'Interaction effects of dietary supplementation of heat-killed Lactobacillus plantarum and β-glucan on growth performance, digestibility and immune response of juvenile red sea bream, Pagrus major', '4/5 · Interactions · Fish Shellfish Immunol, 2015', 'https://pubmed.ncbi.nlm.nih.gov/25661844/'),
  ('beta-glucan', 'The effect of oat β-glucan on LDL-cholesterol, non-HDL-cholesterol and apoB for CVD risk reduction: a systematic review and meta-analysis of randomised-controlled trials', '5/5 · Further reading · Br J Nutr, 2016', 'https://pubmed.ncbi.nlm.nih.gov/27724985/'),
  ('psyllium', 'Effects of dietary fibers or probiotics on functional constipation symptoms and roles of gut microbiota: a double-blinded randomized placebo trial', '1/5 · Efficacy · Gut Microbes, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37078654/'),
  ('psyllium', 'Psyllium Husk: A Comprehensive Review of its Functional Properties, Health Benefits, Mechanisms of Action, and Potential Adverse Effects', '2/5 · Mechanism · Curr Nutr Rep, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41697448/'),
  ('psyllium', 'The long-term safety and tolerability of ispaghula husk', '3/5 · Safety · J R Soc Promot Health, 2000', 'https://pubmed.ncbi.nlm.nih.gov/10944885/'),
  ('psyllium', 'What is the efficacy of dietary, nutraceutical, and probiotic interventions for the management of gastroesophageal reflux disease symptoms? A systematic literature review and meta-analysis', '4/5 · Further reading · Clin Nutr ESPEN, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36513474/'),
  ('psyllium', 'The Effect of Psyllium Husk on Intestinal Microbiota in Constipated Patients and Healthy Controls', '5/5 · Further reading · Int J Mol Sci, 2019', 'https://pubmed.ncbi.nlm.nih.gov/30669509/'),
  ('digestive-enzymes', 'The effect of berberine supplementation on obesity parameters, inflammation and liver function enzymes: A systematic review and meta-analysis of randomized controlled trials', '1/5 · Efficacy · Clin Nutr ESPEN, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32690176/'),
  ('digestive-enzymes', 'Serotonin, tryptophan metabolism and the brain-gut-microbiome axis', '2/5 · Mechanism · Behav Brain Res, 2015', 'https://pubmed.ncbi.nlm.nih.gov/25078296/'),
  ('digestive-enzymes', 'Liraglutide safety and efficacy in patients with non-alcoholic steatohepatitis (LEAN): a multicentre, double-blind, randomised, placebo-controlled phase 2 study', '3/5 · Safety · Lancet, 2016', 'https://pubmed.ncbi.nlm.nih.gov/26608256/'),
  ('digestive-enzymes', 'Food and drug interactions: a general review', '4/5 · Practical · Acta Sci Pol Technol Aliment, 2014', 'https://pubmed.ncbi.nlm.nih.gov/24583386/'),
  ('digestive-enzymes', 'Innovative concepts in diet therapies in disorders of gut-brain interaction', '5/5 · Interactions · JGH Open, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39027160/'),
  ('msm', 'Effect of Flaxseed Supplementation on Headache Characteristics and Quality of Life in Patients with Migraine: A Randomized Controlled Trial', '1/5 · Efficacy · J Nutr, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41478596/'),
  ('msm', 'Epileptogenesis meets Occam''s Razor', '2/5 · Mechanism · Curr Opin Pharmacol, 2017', 'https://pubmed.ncbi.nlm.nih.gov/28781107/'),
  ('msm', 'Oral gepotidacin for the treatment of uncomplicated urogenital gonorrhoea (EAGLE-1): a phase 3 randomised, open-label, non-inferiority, multicentre study', '3/5 · Safety · Lancet, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40245902/'),
  ('msm', 'Oral pre-exposure prophylaxis (PrEP) to prevent HIV: a systematic review and meta-analysis of clinical effectiveness, safety, adherence and risk compensation in all populations', '4/5 · Further reading · BMJ Open, 2022', 'https://pubmed.ncbi.nlm.nih.gov/35545381/'),
  ('msm', 'Cabotegravir for HIV Prevention in Cisgender Men and Transgender Women', '5/5 · Further reading · N Engl J Med, 2021', 'https://pubmed.ncbi.nlm.nih.gov/34379922/'),
  ('glucosamine', 'Efficacy and tolerability of an undenatured type II collagen supplement in modulating knee osteoarthritis symptoms: a multicenter randomized, double-blind, placebo-controlled study', '1/5 · Efficacy · Nutr J, 2016', 'https://pubmed.ncbi.nlm.nih.gov/26822714/'),
  ('glucosamine', 'The multifaceted role of intracellular glycosylation in cytoprotection and heart disease', '2/5 · Mechanism · J Biol Chem, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38641064/'),
  ('glucosamine', 'Effectiveness and Safety of Glucosamine in Osteoarthritis: A Systematic Review', '3/5 · Safety · Pharmacy (Basel), 2023', 'https://pubmed.ncbi.nlm.nih.gov/37489348/'),
  ('glucosamine', 'Association Between Glucosamine Use and the Risk of Incident Heart Failure: The UK Biobank Cohort Study and Mendelian Randomization Analysis', '4/5 · Interactions · Mayo Clin Proc, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37422736/'),
  ('glucosamine', 'The Safety and Efficacy of Glucosamine and/or Chondroitin in Humans: A Systematic Review', '5/5 · Further reading · Nutrients, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40647198/'),
  ('chondroitin', 'Efficacy and tolerability of an undenatured type II collagen supplement in modulating knee osteoarthritis symptoms: a multicenter randomized, double-blind, placebo-controlled study', '1/5 · Efficacy · Nutr J, 2016', 'https://pubmed.ncbi.nlm.nih.gov/26822714/'),
  ('chondroitin', 'Traumatic Spinal Cord Injury: An Overview of Pathophysiology, Models and Acute Injury Mechanisms', '2/5 · Mechanism · Front Neurol, 2019', 'https://pubmed.ncbi.nlm.nih.gov/30967837/'),
  ('chondroitin', 'The Safety and Efficacy of Glucosamine and/or Chondroitin in Humans: A Systematic Review', '3/5 · Safety · Nutrients, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40647198/'),
  ('chondroitin', 'Nano-elemental selenium particle developed via supramolecular self-assembly of chondroitin sulfate A and Na(2)SeO(3) to repair cartilage lesions', '4/5 · Interactions · Carbohydr Polym, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37321739/'),
  ('chondroitin', 'Evaluation of efficacy and safety of glucosamine sulfate, chondroitin sulfate, and their combination regimen in the management of knee osteoarthritis: a systematic review and meta-analysis', '5/5 · Further reading · Inflammopharmacology, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38581640/'),
  ('spirulina', 'Commentary: Effect of high-dose Spirulina supplementation on hospitalized adults with COVID-19: a randomized controlled trial', '1/5 · Efficacy · Front Immunol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39281675/'),
  ('spirulina', 'The antioxidant, immunomodulatory, and anti-inflammatory activities of Spirulina: an overview', '2/5 · Mechanism · Arch Toxicol, 2016', 'https://pubmed.ncbi.nlm.nih.gov/27259333/'),
  ('spirulina', 'Efficacy and Safety of Relamorelin in Diabetics With Symptoms of Gastroparesis: A Randomized, Placebo-Controlled Study', '3/5 · Safety · Gastroenterology, 2017', 'https://pubmed.ncbi.nlm.nih.gov/28760384/'),
  ('spirulina', 'Effects of 8 Weeks of High-Intensity Interval Training and Spirulina Supplementation on Immunoglobin Levels, Cardio-Respiratory Fitness, and Body Composition of Overweight and Obese Women', '4/5 · Interactions · Biology (Basel), 2022', 'https://pubmed.ncbi.nlm.nih.gov/35205063/'),
  ('spirulina', 'Spirulina supplementation and anthropometric indices: A systematic review and meta-analysis of controlled clinical trials', '5/5 · Further reading · Phytother Res, 2021', 'https://pubmed.ncbi.nlm.nih.gov/32967062/'),
  ('pqq', 'The impact of six-week dihydrogen-pyrroloquinoline quinone supplementation on mitochondrial biomarkers, brain metabolism, and cognition in elderly individuals with mild cognitive impairment: a randomized controlled trial', '1/5 · Efficacy · J Nutr Health Aging, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38908296/'),
  ('pqq', 'Dehydrogenases of acetic acid bacteria', '2/5 · Mechanism · Biotechnol Adv, 2022', 'https://pubmed.ncbi.nlm.nih.gov/34793881/'),
  ('pqq', 'Modulation of morphine tolerance and dependence by pyrroloquinoline quinone in mice: Insights into mechanistic bridge from N-methyl-D-aspartate receptors-calcium/calmodulin-dependent protein kinase II signaling to oxidative neuroinflammation', '3/5 · Safety · J Pharmacol Exp Ther, 2026', 'https://pubmed.ncbi.nlm.nih.gov/42391961/'),
  ('pqq', 'The effects of pyrroloquinoline quinone and nicotinamide mononucleotide supplementation on interoception following acute exhaustive exercise: a randomised, double-blind, placebo-controlled study', '4/5 · Interactions · Sci Rep, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41651893/'),
  ('pqq', 'Effect of Dietary Pyrroloquinoline Quinone Disodium Salt on Cognitive Function in Healthy Volunteers: A Randomized, Double-Blind, Placebo-Controlled, Parallel-Group Study', '5/5 · Further reading · J Am Nutr Assoc, 2022', 'https://pubmed.ncbi.nlm.nih.gov/34415830/'),
  ('betaine-tmg', 'Betaine Supplementation Improves 60 km Cycling Time Trial Performance and One-Carbon Metabolism in Cyclists During Recovery', '1/5 · Efficacy · Nutrients, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40944155/'),
  ('betaine-tmg', 'Betaine and aging: A narrative review of findings, possible mechanisms, research perspectives, and practical recommendations', '2/5 · Mechanism · Ageing Res Rev, 2025', 'https://pubmed.ncbi.nlm.nih.gov/39647584/'),
  ('betaine-tmg', 'Reproductive safety evaluation of L-Ergothioneine', '3/5 · Safety · Food Chem Toxicol, 2015', 'https://pubmed.ncbi.nlm.nih.gov/25736892/'),
  ('betaine-tmg', 'Effects of betaine supplementation on endurance exercise performance: a systematic review', '4/5 · Interactions · Phys Act Nutr, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40765066/'),
  ('betaine-tmg', 'Effects of chronic betaine supplementation on exercise performance: Systematic review and meta-analysis', '5/5 · Further reading · J Sports Sci, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39514262/'),
  ('zinc-picolinate', 'Chromium supplementation and type 2 diabetes mellitus: an extensive systematic review', '1/5 · Efficacy · Environ Geochem Health, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39541030/'),
  ('zinc-picolinate', 'The kynurenine pathway in brain tumor pathogenesis', '2/5 · Mechanism · Cancer Res, 2012', 'https://pubmed.ncbi.nlm.nih.gov/23144293/'),
  ('zinc-picolinate', 'Safety and Efficacy of NC120 for Improving Lipid Profile: A Double Blind Randomized Controlled Trial', '3/5 · Safety · Acta Med Indones, 2019', 'https://pubmed.ncbi.nlm.nih.gov/31073102/'),
  ('zinc-picolinate', 'Effects of combined chromium picolinate and sodium bicarbonate supplementation on growth performance, rumen fermentation, nutrient digestibility, protozoal population, and carcass traits in lambs fed high-concentrate diets', '4/5 · Interactions · Trop Anim Health Prod, 2026', 'https://pubmed.ncbi.nlm.nih.gov/42329543/'),
  ('zinc-picolinate', 'Dynamic changes in kynurenine pathway metabolites in multiple sclerosis: A systematic review', '5/5 · Further reading · Front Immunol, 2022', 'https://pubmed.ncbi.nlm.nih.gov/36426364/'),
  ('aod-9604', 'Obesity drugs in clinical development', '1/5 · Further reading · Curr Opin Investig Drugs, 2006', 'https://pubmed.ncbi.nlm.nih.gov/16625817/'),
  ('aod-9604', 'Effect of an antilipogenic fragment of human growth hormone on glucose transport in rat adipocytes', '2/5 · Further reading · Biochem Mol Biol Int, 1993', 'https://pubmed.ncbi.nlm.nih.gov/8118430/'),
  ('aod-9604', 'Reduction of cumulative body weight gain and adipose tissue mass in obese mice: response to chronic treatment with synthetic hGH 177-191 peptide', '3/5 · Further reading · Biochem Mol Biol Int, 1994', 'https://pubmed.ncbi.nlm.nih.gov/7987248/'),
  ('aod-9604', 'Effects of oral administration of a synthetic fragment of human growth hormone on lipid metabolism', '4/5 · Further reading · Am J Physiol Endocrinol Metab, 2000', 'https://pubmed.ncbi.nlm.nih.gov/10950816/'),
  ('aod-9604', 'Molecular and cellular actions of a structural domain of human growth hormone (AOD9401) on lipid metabolism in Zucker fatty rats', '5/5 · Further reading · J Mol Endocrinol, 2000', 'https://pubmed.ncbi.nlm.nih.gov/11116208/'),
  ('acetyl-hexapeptide-8', 'The anti-wrinkle efficacy of argireline, a synthetic hexapeptide, in Chinese subjects: a randomized, placebo-controlled study', '1/5 · Further reading · Am J Clin Dermatol, 2013', 'https://pubmed.ncbi.nlm.nih.gov/23417317/'),
  ('acetyl-hexapeptide-8', 'A synthetic hexapeptide (Argireline) with antiwrinkle activity', '2/5 · Further reading · Int J Cosmet Sci, 2002', 'https://pubmed.ncbi.nlm.nih.gov/18498523/'),
  ('acetyl-hexapeptide-8', 'The anti wrinkle efficacy of synthetic hexapeptide (Argireline) in Chinese Subjects', '3/5 · Further reading · J Cosmet Laser Ther, 2013', 'https://pubmed.ncbi.nlm.nih.gov/23607739/'),
  ('acetyl-hexapeptide-8', 'Public Interest in Acetyl Hexapeptide-8: Longitudinal Analysis', '4/5 · Further reading · JMIR Dermatol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38376906/'),
  ('acetyl-hexapeptide-8', 'Polydioxanone Bioactive Sutures-Acetyl Hexapeptide-8 (Argireline): An Intelligent System for Controlled Release in Facial Harmonization', '5/5 · Further reading · J Cutan Aesthet Surg, 2023', 'https://pubmed.ncbi.nlm.nih.gov/38314369/'),
  ('afamelanotide', 'Polymorphism of Melanocortin Receptor Genes-Association with Inflammatory Traits and Diseases', '1/5 · Mechanism · Diseases, 2025', 'https://pubmed.ncbi.nlm.nih.gov/41002740/'),
  ('afamelanotide', 'Afamelanotide: A Review in Erythropoietic Protoporphyria', '2/5 · Safety · Am J Clin Dermatol, 2016', 'https://pubmed.ncbi.nlm.nih.gov/26979527/'),
  ('afamelanotide', 'Pharmacokinetics and Pharmacodynamics of Afamelanotide and its Clinical Use in Treating Dermatologic Disorders', '3/5 · Further reading · Clin Pharmacokinet, 2017', 'https://pubmed.ncbi.nlm.nih.gov/28063031/'),
  ('afamelanotide', 'Afamelanotide in protoporphyria and other skin diseases: a review', '4/5 · Further reading · Postepy Dermatol Alergol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38784937/'),
  ('afamelanotide', 'A gel-forming α-MSH analog promotes lasting melanogenesis', '5/5 · Further reading · Eur J Pharmacol, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37673364/'),
  ('cortexin', '[Cortexin in the comprehensive treatment of neurological complications of type 2 diabetes mellitus. (Results of the DIACORT multicenter randomized clinical trial)]', '1/5 · Safety · Zh Nevrol Psikhiatr Im S S Korsakova, 2026', 'https://pubmed.ncbi.nlm.nih.gov/42133422/'),
  ('cortexin', '[Therapeutic equivalence of intravenous and intramuscular dosage forms of Cortexin in ischemic strokes]', '2/5 · Further reading · Zh Nevrol Psikhiatr Im S S Korsakova, 2025', 'https://pubmed.ncbi.nlm.nih.gov/41524350/'),
  ('cortexin', '[Targets of rational neuroprotection in the therapy of chronic cerebral ischemia and the possibilities of achieving them]', '3/5 · Further reading · Zh Nevrol Psikhiatr Im S S Korsakova, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40879235/'),
  ('cortexin', 'The TREM2-APOE Pathway Drives the Transcriptional Phenotype of Dysfunctional Microglia in Neurodegenerative Diseases', '4/5 · Further reading · Immunity, 2017', 'https://pubmed.ncbi.nlm.nih.gov/28930663/'),
  ('cortexin', 'Meningeal lymphatics affect microglia responses and anti-Aβ immunotherapy', '5/5 · Further reading · Nature, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33911285/'),
  ('dsip', 'Glucocorticoid replacement is permissive for rapid eye movement sleep and sleep consolidation in patients with adrenal insufficiency', '1/5 · Efficacy · J Clin Endocrinol Metab, 2000', 'https://pubmed.ncbi.nlm.nih.gov/11095454/'),
  ('dsip', 'Delta-sleep-inducing peptide (DSIP): an update', '2/5 · Mechanism · Peptides, 1986', 'https://pubmed.ncbi.nlm.nih.gov/3550726/'),
  ('dsip', 'Study of delta sleep-inducing peptide efficacy in improving sleep on short-term administration to chronic insomniacs', '3/5 · Further reading · Int J Clin Pharmacol Res, 1987', 'https://pubmed.ncbi.nlm.nih.gov/3583493/'),
  ('dsip', 'Delta sleep-inducing peptide', '4/5 · Further reading · Eur J Anaesthesiol, 2001', 'https://pubmed.ncbi.nlm.nih.gov/11437870/'),
  ('dsip', 'Phosphorylated delta sleep inducing peptide restores spatial memory and p-CREB expression by improving sleep architecture at high altitude', '5/5 · Further reading · Life Sci, 2018', 'https://pubmed.ncbi.nlm.nih.gov/30107169/'),
  ('dihexa', 'The Brain Hepatocyte Growth Factor/c-Met Receptor System: A New Target for the Treatment of Alzheimer''s Disease', '1/5 · Further reading · J Alzheimers Dis, 2015', 'https://pubmed.ncbi.nlm.nih.gov/25649658/'),
  ('dihexa', 'The Case for a Novel Therapeutic Approach to Dementia: Small Molecule Hepatocyte Growth Factor (HGF/MET) Positive Modulators', '2/5 · Further reading · J Alzheimers Dis, 2023', 'https://pubmed.ncbi.nlm.nih.gov/36683507/'),
  ('dihexa', 'GLP-1 and GIP agonism has no direct actions in human hepatocytes or hepatic stellate cells', '3/5 · Further reading · Cell Mol Life Sci, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39607493/'),
  ('dihexa', 'Associations of the cerebrospinal fluid hepatocyte growth factor with Alzheimer''s disease pathology and cognitive function', '4/5 · Further reading · BMC Neurol, 2021', 'https://pubmed.ncbi.nlm.nih.gov/34615471/'),
  ('dihexa', '[Ischemic brain injury and hepatocyte growth factor]', '5/5 · Further reading · Yakugaku Zasshi, 2007', 'https://pubmed.ncbi.nlm.nih.gov/17978557/'),
  ('epitalon', 'Overview of Epitalon-Highly Bioactive Pineal Tetrapeptide with Promising Properties', '1/5 · Mechanism · Int J Mol Sci, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40141333/'),
  ('epitalon', 'The role of pineal gland in breast cancer development', '2/5 · Further reading · Crit Rev Oncol Hematol, 2003', 'https://pubmed.ncbi.nlm.nih.gov/12791421/'),
  ('epitalon', 'Effects of pineal peptide preparation Epithalamin on free-radical processes in humans and animals', '3/5 · Further reading · Neuro Endocrinol Lett, 2001', 'https://pubmed.ncbi.nlm.nih.gov/11335874/'),
  ('epitalon', 'Pineal peptide preparation epithalamin increases the lifespan of fruit flies, mice and rats', '4/5 · Further reading · Mech Ageing Dev, 1998', 'https://pubmed.ncbi.nlm.nih.gov/9701766/'),
  ('epitalon', 'Effect of melatonin and pineal peptide preparation epithalamin on life span and free radical oxidation in Drosophila melanogaster', '5/5 · Further reading · Mech Ageing Dev, 1997', 'https://pubmed.ncbi.nlm.nih.gov/9226628/'),
  ('ghrp-2', 'Oral estradiol administration modulates continuous intravenous growth hormone (GH)-releasing peptide-2-driven GH secretion in postmenopausal women', '1/5 · Efficacy · J Clin Endocrinol Metab, 2000', 'https://pubmed.ncbi.nlm.nih.gov/10946861/'),
  ('ghrp-2', 'Interactive regulation of postmenopausal growth hormone insulin-like growth factor axis by estrogen and growth hormone-releasing peptide-2', '2/5 · Mechanism · Endocrine, 2001', 'https://pubmed.ncbi.nlm.nih.gov/11322501/'),
  ('ghrp-2', 'Short-term estradiol supplementation augments growth hormone (GH) secretory responsiveness to dose-varying GH-releasing peptide infusions in healthy postmenopausal women', '3/5 · Interactions · J Clin Endocrinol Metab, 2001', 'https://pubmed.ncbi.nlm.nih.gov/11158008/'),
  ('ghrp-2', 'Pralmorelin: GHRP 2, GPA 748, growth hormone-releasing peptide 2, KP-102 D, KP-102 LN, KP-102D, KP-102LN', '4/5 · Further reading · Drugs R D, 2004', 'https://pubmed.ncbi.nlm.nih.gov/15230633/'),
  ('ghrp-2', 'The Safety and Efficacy of Growth Hormone Secretagogues', '5/5 · Further reading · Sex Med Rev, 2018', 'https://pubmed.ncbi.nlm.nih.gov/28400207/'),
  ('ghrp-6', 'Growth hormone response in man to L-692,429, a novel nonpeptide mimic of growth hormone-releasing peptide-6', '1/5 · Safety · J Clin Endocrinol Metab, 1993', 'https://pubmed.ncbi.nlm.nih.gov/8077339/'),
  ('ghrp-6', 'Pharmacokinetic study of Growth Hormone-Releasing Peptide 6 (GHRP-6) in nine male healthy volunteers', '2/5 · Further reading · Eur J Pharm Sci, 2013', 'https://pubmed.ncbi.nlm.nih.gov/23099431/'),
  ('ghrp-6', 'Growth hormone-releasing peptide (GHRP)', '3/5 · Further reading · Cell Mol Life Sci, 1998', 'https://pubmed.ncbi.nlm.nih.gov/9893708/'),
  ('ghrp-6', 'Growth hormone-releasing peptide 6 (GHRP-6) hydrogel for acute kidney injury therapy via metabolic regulation', '4/5 · Further reading · J Nanobiotechnology, 2025', 'https://pubmed.ncbi.nlm.nih.gov/41327290/'),
  ('ghrp-6', 'Ipamorelin, the first selective growth hormone secretagogue', '5/5 · Further reading · Eur J Endocrinol, 1998', 'https://pubmed.ncbi.nlm.nih.gov/9849822/'),
  ('hexarelin', 'Central control of penile erection: role of the paraventricular nucleus of the hypothalamus', '1/5 · Mechanism · Prog Neurobiol, 2005', 'https://pubmed.ncbi.nlm.nih.gov/16043278/'),
  ('hexarelin', 'Growth hormone-releasing activity of hexarelin in humans. A dose-response study', '2/5 · Further reading · Eur J Clin Pharmacol, 1994', 'https://pubmed.ncbi.nlm.nih.gov/7957536/'),
  ('hexarelin', 'The Safety and Efficacy of Growth Hormone Secretagogues', '3/5 · Further reading · Sex Med Rev, 2018', 'https://pubmed.ncbi.nlm.nih.gov/28400207/'),
  ('hexarelin', 'The cardiovascular action of hexarelin', '4/5 · Further reading · J Geriatr Cardiol, 2014', 'https://pubmed.ncbi.nlm.nih.gov/25278975/'),
  ('hexarelin', 'Cardiac and peripheral actions of growth hormone and its releasing peptides: relevance for the treatment of cardiomyopathies', '5/5 · Further reading · Cardiovasc Res, 2006', 'https://pubmed.ncbi.nlm.nih.gov/16219302/'),
  ('humanin', 'Humanin: A mitochondrial-derived peptide in the treatment of apoptosis-related diseases', '1/5 · Mechanism · Life Sci, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33130077/'),
  ('humanin', 'Humanin and Its Pathophysiological Roles in Aging: A Systematic Review', '2/5 · Further reading · Biology (Basel), 2023', 'https://pubmed.ncbi.nlm.nih.gov/37106758/'),
  ('humanin', 'The mitochondrial derived peptide humanin is a regulator of lifespan and healthspan', '3/5 · Further reading · Aging (Albany NY), 2020', 'https://pubmed.ncbi.nlm.nih.gov/32575074/'),
  ('humanin', 'Humanin Promotes Tumor Progression in Experimental Triple Negative Breast Cancer', '4/5 · Further reading · Sci Rep, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32444831/'),
  ('humanin', 'Role of humanin, a mitochondrial-derived peptide, in cardiovascular disorders', '5/5 · Further reading · Arch Cardiovasc Dis, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32680738/'),
  ('larazotide', 'The Therapeutic use of the Zonulin Inhibitor AT-1001 (Larazotide) for a Variety of Acute and Chronic Inflammatory Diseases', '1/5 · Mechanism · Curr Med Chem, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33397225/'),
  ('larazotide', 'Larazotide acetate for persistent symptoms of celiac disease despite a gluten-free diet: a randomized controlled trial', '2/5 · Further reading · Gastroenterology, 2015', 'https://pubmed.ncbi.nlm.nih.gov/25683116/'),
  ('larazotide', 'Larazotide acetate: a pharmacological peptide approach to tight junction regulation', '3/5 · Further reading · Am J Physiol Gastrointest Liver Physiol, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33881350/'),
  ('larazotide', 'Zonulin and its regulation of intestinal barrier function: the biological door to inflammation, autoimmunity, and cancer', '4/5 · Further reading · Physiol Rev, 2011', 'https://pubmed.ncbi.nlm.nih.gov/21248165/'),
  ('larazotide', 'Leaky gut and autoimmune diseases', '5/5 · Further reading · Clin Rev Allergy Immunol, 2012', 'https://pubmed.ncbi.nlm.nih.gov/22109896/'),
  ('mots-c', 'MOTS-c: A promising mitochondrial-derived peptide for therapeutic exploitation', '1/5 · Mechanism · Front Endocrinol (Lausanne), 2023', 'https://pubmed.ncbi.nlm.nih.gov/36761202/'),
  ('mots-c', 'The correlation between mitochondrial derived peptide (MDP) and metabolic states: a systematic review and meta-analysis', '2/5 · Further reading · Diabetol Metab Syndr, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39160573/'),
  ('mots-c', 'The Mitochondrial-Derived Peptide MOTS-c May Refine Mortality and Cardiovascular Risk Prediction in Chronic Hemodialysis Patients: A Multicenter Cohort Study', '3/5 · Further reading · Blood Purif, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39111290/'),
  ('mots-c', 'A pro-diabetogenic mtDNA polymorphism in the mitochondrial-derived peptide, MOTS-c', '4/5 · Further reading · Aging (Albany NY), 2021', 'https://pubmed.ncbi.nlm.nih.gov/33468709/'),
  ('mots-c', 'Mitochondrial-Encoded Peptide MOTS-c, Diabetes, and Aging-Related Diseases', '5/5 · Further reading · Diabetes Metab J, 2023', 'https://pubmed.ncbi.nlm.nih.gov/36824008/'),
  ('na-semax-amidate', '[Effectiveness of semax in acute period of hemispheric ischemic stroke (a clinical and electrophysiological study)]', '1/5 · Further reading · Zh Nevrol Psikhiatr Im S S Korsakova, 1997', 'https://pubmed.ncbi.nlm.nih.gov/11517472/'),
  ('na-semax-amidate', '[POSSIBLE ROLE OF TRANSTHYRETIN IN THE BIOLOGICAL MECHANISM OF THE REGULATORY PEPTIDE NEUROPROTECTION.]', '2/5 · Further reading · Mol Gen Mikrobiol Virusol, 2016', 'https://pubmed.ncbi.nlm.nih.gov/30383932/'),
  ('na-semax-amidate', 'Semax, synthetic ACTH(4-10) analogue, attenuates behavioural and neurochemical alterations following early-life fluvoxamine exposure in white rats', '3/5 · Further reading · Neuropeptides, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33418449/'),
  ('na-semax-amidate', 'Semax, an analog of ACTH(4-10) with cognitive effects, regulates BDNF and trkB expression in the rat hippocampus', '4/5 · Further reading · Brain Res, 2006', 'https://pubmed.ncbi.nlm.nih.gov/16996037/'),
  ('na-semax-amidate', '[Chronotropic activity of semax]', '5/5 · Further reading · Eksp Klin Farmakol, 2008', 'https://pubmed.ncbi.nlm.nih.gov/18488900/'),
  ('p21', 'Effects of a ciliary neurotrophic factor (CNTF) small-molecule peptide mimetic in an in vitro and in vivo model of CDKL5 deficiency disorder', '1/5 · Further reading · J Neurodev Disord, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39592934/'),
  ('p21', 'Neurotrophic factor small-molecule mimetics mediated neuroregeneration and synaptic repair: emerging therapeutic modality for Alzheimer''s disease', '2/5 · Further reading · Mol Neurodegener, 2016', 'https://pubmed.ncbi.nlm.nih.gov/27400746/'),
  ('p21', 'A Brain-Derived Neurotrophic Factor Mimetic Is Sufficient to Restore Cone Photoreceptor Visual Function in an Inherited Blindness Model', '3/5 · Further reading · Sci Rep, 2017', 'https://pubmed.ncbi.nlm.nih.gov/28900183/'),
  ('p21', 'Neurotrophic Treatment Initiated During Early Postnatal Development Prevents the Alzheimer-Like Behavior and Synaptic Dysfunction', '4/5 · Further reading · J Alzheimers Dis, 2021', 'https://pubmed.ncbi.nlm.nih.gov/34057082/'),
  ('p21', 'Empty mesoporous silica particles significantly delay disease progression and extend survival in a mouse model of ALS', '5/5 · Further reading · Sci Rep, 2020', 'https://pubmed.ncbi.nlm.nih.gov/33244084/'),
  ('pt-141', 'An evaluation of bremelanotide injection for the treatment of hypoactive sexual desire disorder', '1/5 · Mechanism · Expert Opin Pharmacother, 2023', 'https://pubmed.ncbi.nlm.nih.gov/36242769/'),
  ('pt-141', 'Bremelanotide for the Treatment of Hypoactive Sexual Desire Disorder: Two Randomized Phase 3 Trials', '2/5 · Safety · Obstet Gynecol, 2019', 'https://pubmed.ncbi.nlm.nih.gov/31599840/'),
  ('pt-141', 'Bremelanotide: New Drug Approved for Treating Hypoactive Sexual Desire Disorder', '3/5 · Further reading · Ann Pharmacother, 2020', 'https://pubmed.ncbi.nlm.nih.gov/31893927/'),
  ('pt-141', 'Bremelanotide: First Approval', '4/5 · Further reading · Drugs, 2019', 'https://pubmed.ncbi.nlm.nih.gov/31429064/'),
  ('pt-141', 'Re-Analyzing Phase III Bremelanotide Trials for ''Hypoactive Sexual Desire Disorder'' in Women', '5/5 · Further reading · J Sex Res, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33678061/'),
  ('palmitoyl-tetrapeptide-7', 'Comprehensive evaluation of the efficacy and safety of a new multi-component anti-aging topical eye cream', '1/5 · Further reading · Skin Res Technol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38932444/'),
  ('palmitoyl-tetrapeptide-7', 'Usage of Synthetic Peptides in Cosmetics for Sensitive Skin', '2/5 · Further reading · Pharmaceuticals (Basel), 2021', 'https://pubmed.ncbi.nlm.nih.gov/34451799/'),
  ('palmitoyl-tetrapeptide-7', 'Potential anti-aging applications of microbial-derived surfactantsin cosmetic formulations', '3/5 · Further reading · Crit Rev Biotechnol, 2025', 'https://pubmed.ncbi.nlm.nih.gov/39294002/'),
  ('palmitoyl-tetrapeptide-7', 'Immunomodulatory Role of Microbial Surfactants, with Special Emphasis on Fish', '4/5 · Further reading · Int J Mol Sci, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32977579/'),
  ('palmitoyl-tetrapeptide-7', 'Antifouling Compounds from Marine Macroalgae', '5/5 · Further reading · Mar Drugs, 2017', 'https://pubmed.ncbi.nlm.nih.gov/28846625/'),
  ('palmitoyl-tripeptide-1', 'Comprehensive evaluation of the efficacy and safety of a new multi-component anti-aging topical eye cream', '1/5 · Further reading · Skin Res Technol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38932444/'),
  ('palmitoyl-tripeptide-1', 'Topically applied GHK as an anti-wrinkle peptide: Advantages, problems and prospective', '2/5 · Further reading · Bioimpacts, 2025', 'https://pubmed.ncbi.nlm.nih.gov/39963574/'),
  ('palmitoyl-tripeptide-1', 'Topical palmitoyl pentapeptide provides improvement in photoaged human facial skin', '3/5 · Further reading · Int J Cosmet Sci, 2005', 'https://pubmed.ncbi.nlm.nih.gov/18492182/'),
  ('palmitoyl-tripeptide-1', 'Bioactive Glycyrrhizic Acid Ionic Liquid Self-Assembled Nanomicelles for Enhanced Transdermal Delivery of Anti-Photoaging Signal Peptides', '4/5 · Further reading · Adv Sci (Weinh), 2025', 'https://pubmed.ncbi.nlm.nih.gov/39783908/'),
  ('palmitoyl-tripeptide-1', 'Proline-containing peptides-New insight and implications: A Review', '5/5 · Further reading · Biofactors, 2019', 'https://pubmed.ncbi.nlm.nih.gov/31430415/'),
  ('pinealon', '[Neuroprotective effects of peptides bioregulators in people of various age]', '1/5 · Further reading · Adv Gerontol, 2013', 'https://pubmed.ncbi.nlm.nih.gov/24738258/'),
  ('pinealon', 'Promotion of astrocyte-neuron glutamate-glutamine shuttle by SCFA contributes to the alleviation of Alzheimer''s disease', '2/5 · Further reading · Redox Biol, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37018970/'),
  ('pinealon', 'Oxytocin Improves Intracerebral Hemorrhage Outcomes by Suppressing Neuronal Pyroptosis and Mitochondrial Fission', '3/5 · Further reading · Stroke, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37317879/'),
  ('pinealon', '36th International Symposium on Intensive Care and Emergency Medicine : Brussels, Belgium. 15-18 March 2016', '4/5 · Further reading · Crit Care, 2016', 'https://pubmed.ncbi.nlm.nih.gov/27885969/'),
  ('pinealon', 'A PEDF-Derived Short Peptide Prevents Sodium Iodate-Induced Retinal Degeneration in Rats by Activating the SLC7A11/GSH/GPX4 Pathway in the RPE Cells', '5/5 · Further reading · J Cell Mol Med, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40703032/'),
  ('snap-8', 'Efficacy of bioactive peptides loaded on hyaluronic acid microneedle patches: A monocentric clinical study', '1/5 · Further reading · J Cosmet Dermatol, 2020', 'https://pubmed.ncbi.nlm.nih.gov/31134751/'),
  ('snap-8', 'Clinical Safety and Efficacy Evaluation of a Dissolving Microneedle Patch Having Dual Anti-Wrinkle Effects With Safe and Long-Term Activities', '2/5 · Further reading · Ann Dermatol, 2024', 'https://pubmed.ncbi.nlm.nih.gov/39082657/'),
  ('snap-8', 'A synthetic hexapeptide (Argireline) with antiwrinkle activity', '3/5 · Further reading · Int J Cosmet Sci, 2002', 'https://pubmed.ncbi.nlm.nih.gov/18498523/'),
  ('snap-8', 'Design and validation of neuronal exocytosis blocking peptides as potential novel antiperspirants', '4/5 · Further reading · Exp Dermatol, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37009806/'),
  ('snap-8', 'Release of proteolytic activity following reduction in therapeutic human serum albumin containing products: detection with a new neoepitope endopeptidase immunoassay', '5/5 · Further reading · J Pharm Biomed Anal, 2011', 'https://pubmed.ncbi.nlm.nih.gov/20832960/'),
  ('ss-31', 'Elamipretide: A Review of Its Structure, Mechanism of Action, and Therapeutic Potential', '1/5 · Mechanism · Int J Mol Sci, 2025', 'https://pubmed.ncbi.nlm.nih.gov/39940712/'),
  ('ss-31', 'First-in-class cardiolipin-protective compound as a therapeutic agent to restore mitochondrial bioenergetics', '2/5 · Further reading · Br J Pharmacol, 2014', 'https://pubmed.ncbi.nlm.nih.gov/24117165/'),
  ('ss-31', 'Elamipretide in the Management of Barth Syndrome: Current Evidence and a Case Report', '3/5 · Further reading · Mol Genet Metab, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40816230/'),
  ('ss-31', 'Barth syndrome cardiomyopathy: targeting the mitochondria with elamipretide', '4/5 · Further reading · Heart Fail Rev, 2021', 'https://pubmed.ncbi.nlm.nih.gov/33001359/'),
  ('ss-31', 'Contemporary insights into elamipretide''s mitochondrial mechanism of action and therapeutic effects', '5/5 · Further reading · Biomed Pharmacother, 2025', 'https://pubmed.ncbi.nlm.nih.gov/40294492/'),
  ('tesamorelin', 'Growth hormone-releasing hormone effects on brain γ-aminobutyric acid levels in mild cognitive impairment and healthy aging', '1/5 · Efficacy · JAMA Neurol, 2013', 'https://pubmed.ncbi.nlm.nih.gov/23689947/'),
  ('tesamorelin', 'Pathophysiology of GHRH-growth hormone-IGF1 axis in HIV/AIDS', '2/5 · Mechanism · Rev Endocr Metab Disord, 2013', 'https://pubmed.ncbi.nlm.nih.gov/23657561/'),
  ('tesamorelin', 'Efficacy and safety of tesamorelin in people with HIV on integrase inhibitors', '3/5 · Safety · AIDS, 2024', 'https://pubmed.ncbi.nlm.nih.gov/38905488/'),
  ('tesamorelin', 'Body composition, hepatic fat, metabolic, and safety outcomes of Tesamorelin, a GHRH analogue, in HIV-associated lipodystrophy: A meta-analysis of randomized controlled trials', '4/5 · Further reading · Obes Res Clin Pract, 2026', 'https://pubmed.ncbi.nlm.nih.gov/41545261/'),
  ('tesamorelin', 'Effects of tesamorelin on hepatic transcriptomic signatures in HIV-associated NAFLD', '5/5 · Further reading · JCI Insight, 2020', 'https://pubmed.ncbi.nlm.nih.gov/32701508/'),
  ('thymulin', 'Benefit of oral zinc supplementation as an adjunct to zidovudine (AZT) therapy against opportunistic infections in AIDS', '1/5 · Efficacy · Int J Immunopharmacol, 1995', 'https://pubmed.ncbi.nlm.nih.gov/8582783/'),
  ('thymulin', 'Effects of zinc-fortified drinking skim milk (as functional food) on cytokine release and thymic hormone activity in very old persons: a pilot study', '2/5 · Further reading · Age (Dordr), 2014', 'https://pubmed.ncbi.nlm.nih.gov/24771015/'),
  ('thymulin', 'The thymus-neuroendocrine axis: physiology, molecular biology, and therapeutic potential of the thymic peptide thymulin', '3/5 · Further reading · Ann N Y Acad Sci, 2009', 'https://pubmed.ncbi.nlm.nih.gov/19236333/'),
  ('thymulin', 'Thymulin, a zinc-dependent hormone', '4/5 · Further reading · Med Oncol Tumor Pharmacother, 1989', 'https://pubmed.ncbi.nlm.nih.gov/2657247/'),
  ('thymulin', 'A zinc-dependent epitope on the molecule of thymulin, a thymic hormone', '5/5 · Further reading · Proc Natl Acad Sci U S A, 1985', 'https://pubmed.ncbi.nlm.nih.gov/2413455/'),
  ('vip', 'Intravenous aviptadil and remdesivir for treatment of COVID-19-associated hypoxaemic respiratory failure in the USA (TESICO): a randomised, placebo-controlled trial', '1/5 · Efficacy · Lancet Respir Med, 2023', 'https://pubmed.ncbi.nlm.nih.gov/37348524/'),
  ('vip', 'Proinflammatory cytokines and neuropeptides in psoriasis, depression, and anxiety', '2/5 · Mechanism · Acta Physiol (Oxf), 2025', 'https://pubmed.ncbi.nlm.nih.gov/39960105/'),
  ('vip', 'SOP conservative (medical and mechanical) treatment of erectile dysfunction', '3/5 · Safety · J Sex Med, 2013', 'https://pubmed.ncbi.nlm.nih.gov/23343170/'),
  ('vip', 'Vasoactive intestinal Peptide as a diagnostic or prognostic biomarker in multiple sclerosis: A systematic review', '4/5 · Further reading · Mult Scler Relat Disord, 2026', 'https://pubmed.ncbi.nlm.nih.gov/42447728/'),
  ('vip', '36th International Symposium on Intensive Care and Emergency Medicine : Brussels, Belgium. 15-18 March 2016', '5/5 · Further reading · Crit Care, 2016', 'https://pubmed.ncbi.nlm.nih.gov/27885969/')
) as t(slug, title, meta, url) on t.slug = g.slug
where not exists (
  select 1 from public.glossary_research r where r.glossary_id = g.id and r.url = t.url
);

-- ── timing, evidence grade and the ODS fact sheet, per entry ──
update public.glossary set timing = 'any', timing_note = 'Absorption saturates, so a large single amount is largely excreted.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/VitaminC-Consumer/' where slug = 'vitamin-c';
update public.glossary set timing = 'with_food', timing_note = 'Fat soluble — taken with a meal containing fat it absorbs considerably better.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/VitaminD-Consumer/' where slug = 'vitamin-d3';
update public.glossary set timing = 'empty', timing_note = 'Absorbs best away from food, but take it with a meal if it upsets your stomach.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Zinc-Consumer/' where slug = 'zinc';
update public.glossary set timing = 'empty', timing_note = 'Absorbs best away from food, but take it with a meal if it upsets your stomach.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Zinc-Consumer/' where slug = 'zinc-picolinate';
update public.glossary set timing = 'empty', timing_note = 'Vitamin C alongside helps; tea, coffee and calcium hinder it.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Iron-Consumer/' where slug = 'iron-bisglycinate';
update public.glossary set timing = 'evening', timing_note = 'The upper limit applies to supplements only, not magnesium from food.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Magnesium-Consumer/' where slug = 'magnesium-glycinate';
update public.glossary set timing = 'evening', timing_note = 'The upper limit applies to supplements only, not magnesium from food.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Magnesium-Consumer/' where slug = 'magnesium-citrate';
update public.glossary set timing = 'evening', timing_note = 'The upper limit applies to supplements only, not magnesium from food.', evidence = 'mixed', ods_url = 'https://ods.od.nih.gov/factsheets/Magnesium-Consumer/' where slug = 'magnesium-threonate';
update public.glossary set timing = 'any', timing_note = 'No upper limit has been set — excess is excreted.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/VitaminB12-Consumer/' where slug = 'vitamin-b12';
update public.glossary set timing = 'with_food', timing_note = 'The gap between enough and too much is narrower than for most minerals.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Selenium-Consumer/' where slug = 'selenium';
update public.glossary set timing = 'any', timing_note = 'An adequate intake, not an RDA. No upper limit has been established.', evidence = 'mixed', ods_url = 'https://ods.od.nih.gov/factsheets/Biotin-Consumer/' where slug = 'biotin';
update public.glossary set timing = 'with_food', timing_note = 'Citrate absorbs without stomach acid, so it does not need a meal the way carbonate does.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Calcium-Consumer/' where slug = 'calcium-citrate';
update public.glossary set timing = 'with_food', timing_note = 'The upper limit covers preformed vitamin A only, not beta-carotene.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/VitaminA-Consumer/' where slug = 'vitamin-a';
update public.glossary set timing = 'with_food', timing_note = 'Fat soluble — take it with a meal.', evidence = 'mixed', ods_url = 'https://ods.od.nih.gov/factsheets/VitaminE-Consumer/' where slug = 'vitamin-e';
update public.glossary set timing = 'with_food', timing_note = 'An adequate intake, not an RDA. No upper limit has been established.', evidence = 'mixed', ods_url = 'https://ods.od.nih.gov/factsheets/VitaminK-Consumer/' where slug = 'vitamin-k2';
update public.glossary set timing = 'any', timing_note = 'No upper limit has been established.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Thiamin-Consumer/' where slug = 'thiamine';
update public.glossary set timing = 'any', timing_note = 'No upper limit has been established. Turns urine bright yellow, which is harmless.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Riboflavin-Consumer/' where slug = 'riboflavin';
update public.glossary set timing = 'with_food', timing_note = 'The upper limit applies to supplemental niacin, not niacin from food.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Niacin-Consumer/' where slug = 'niacin';
update public.glossary set timing = 'any', timing_note = 'An adequate intake, not an RDA. No upper limit has been established.', evidence = 'mixed', ods_url = 'https://ods.od.nih.gov/factsheets/PantothenicAcid-Consumer/' where slug = 'pantothenic-acid';
update public.glossary set timing = 'any', timing_note = 'Long-term intake well above the limit has been linked to nerve symptoms.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/VitaminB6-Consumer/' where slug = 'vitamin-b6';
update public.glossary set timing = 'any', timing_note = 'The upper limit covers supplemental folic acid, not folate from food.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Folate-Consumer/' where slug = 'folate';
update public.glossary set timing = 'any', timing_note = 'An adequate intake, not an RDA.', evidence = 'mixed', ods_url = 'https://ods.od.nih.gov/factsheets/Choline-Consumer/' where slug = 'choline';
update public.glossary set timing = 'any', timing_note = 'Both too little and too much affect the thyroid.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Iodine-Consumer/' where slug = 'iodine';
update public.glossary set timing = 'any', timing_note = 'Zinc taken in quantity over time depletes copper — the reason they are often paired.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Copper-Consumer/' where slug = 'copper';
update public.glossary set timing = 'any', timing_note = 'An adequate intake, not an RDA.', evidence = 'mixed', ods_url = 'https://ods.od.nih.gov/factsheets/Manganese-Consumer/' where slug = 'manganese';
update public.glossary set timing = 'with_food', timing_note = 'An adequate intake, not an RDA. No upper limit has been established.', evidence = 'thin', ods_url = 'https://ods.od.nih.gov/factsheets/Chromium-Consumer/' where slug = 'chromium';
update public.glossary set timing = 'any', timing_note = 'Deficiency is essentially unknown outside clinical settings.', evidence = 'thin', ods_url = 'https://ods.od.nih.gov/factsheets/Molybdenum-Consumer/' where slug = 'molybdenum';
update public.glossary set timing = 'with_food', timing_note = 'An adequate intake. No upper limit for healthy adults, but supplements are capped by law in many places.', evidence = 'strong', ods_url = 'https://ods.od.nih.gov/factsheets/Potassium-Consumer/' where slug = 'potassium';
update public.glossary set timing = 'any', timing_note = 'No requirement has been established; only an upper limit.', evidence = 'thin', ods_url = 'https://ods.od.nih.gov/factsheets/Boron-HealthProfessional/' where slug = 'boron';

-- everything else gets a timing and an evidence grade but no intake values
update public.glossary set timing = coalesce(timing, 'any'), evidence = coalesce(evidence, 'mixed') where kind = 'supplement';
update public.glossary set evidence = coalesce(evidence, 'thin') where kind = 'peptide';

-- ── reference intakes, per age band and sex ──
insert into public.nutrient_reference (glossary_id, age_band, sex, rda, ul, unit)
select g.id, t.age_band, t.sex, t.rda, t.ul, t.unit
from public.glossary g
join (values
  ('vitamin-c', '19-50', 'm', 90::numeric, 2000::numeric, 'mg'),
  ('vitamin-c', '19-50', 'f', 75::numeric, 2000::numeric, 'mg'),
  ('vitamin-c', '51+', 'm', 90::numeric, 2000::numeric, 'mg'),
  ('vitamin-c', '51+', 'f', 75::numeric, 2000::numeric, 'mg'),
  ('vitamin-c', '14-18', 'm', 75::numeric, 1800::numeric, 'mg'),
  ('vitamin-c', '14-18', 'f', 65::numeric, 1800::numeric, 'mg'),
  ('vitamin-d3', '19-50', 'any', 15::numeric, 100::numeric, 'mcg'),
  ('vitamin-d3', '51+', 'any', 15::numeric, 100::numeric, 'mcg'),
  ('vitamin-d3', '14-18', 'any', 15::numeric, 100::numeric, 'mcg'),
  ('zinc', '19-50', 'm', 11::numeric, 40::numeric, 'mg'),
  ('zinc', '19-50', 'f', 8::numeric, 40::numeric, 'mg'),
  ('zinc', '51+', 'm', 11::numeric, 40::numeric, 'mg'),
  ('zinc', '51+', 'f', 8::numeric, 40::numeric, 'mg'),
  ('zinc', '14-18', 'm', 11::numeric, 34::numeric, 'mg'),
  ('zinc', '14-18', 'f', 9::numeric, 34::numeric, 'mg'),
  ('zinc-picolinate', '19-50', 'm', 11::numeric, 40::numeric, 'mg'),
  ('zinc-picolinate', '19-50', 'f', 8::numeric, 40::numeric, 'mg'),
  ('zinc-picolinate', '51+', 'm', 11::numeric, 40::numeric, 'mg'),
  ('zinc-picolinate', '51+', 'f', 8::numeric, 40::numeric, 'mg'),
  ('zinc-picolinate', '14-18', 'm', 11::numeric, 34::numeric, 'mg'),
  ('zinc-picolinate', '14-18', 'f', 9::numeric, 34::numeric, 'mg'),
  ('iron-bisglycinate', '19-50', 'm', 8::numeric, 45::numeric, 'mg'),
  ('iron-bisglycinate', '19-50', 'f', 18::numeric, 45::numeric, 'mg'),
  ('iron-bisglycinate', '51+', 'm', 8::numeric, 45::numeric, 'mg'),
  ('iron-bisglycinate', '51+', 'f', 8::numeric, 45::numeric, 'mg'),
  ('iron-bisglycinate', '14-18', 'm', 11::numeric, 45::numeric, 'mg'),
  ('iron-bisglycinate', '14-18', 'f', 15::numeric, 45::numeric, 'mg'),
  ('magnesium-glycinate', '19-50', 'm', 400::numeric, 350::numeric, 'mg'),
  ('magnesium-glycinate', '19-50', 'f', 310::numeric, 350::numeric, 'mg'),
  ('magnesium-glycinate', '51+', 'm', 420::numeric, 350::numeric, 'mg'),
  ('magnesium-glycinate', '51+', 'f', 320::numeric, 350::numeric, 'mg'),
  ('magnesium-glycinate', '14-18', 'm', 410::numeric, 350::numeric, 'mg'),
  ('magnesium-glycinate', '14-18', 'f', 360::numeric, 350::numeric, 'mg'),
  ('magnesium-citrate', '19-50', 'm', 400::numeric, 350::numeric, 'mg'),
  ('magnesium-citrate', '19-50', 'f', 310::numeric, 350::numeric, 'mg'),
  ('magnesium-citrate', '51+', 'm', 420::numeric, 350::numeric, 'mg'),
  ('magnesium-citrate', '51+', 'f', 320::numeric, 350::numeric, 'mg'),
  ('magnesium-citrate', '14-18', 'm', 410::numeric, 350::numeric, 'mg'),
  ('magnesium-citrate', '14-18', 'f', 360::numeric, 350::numeric, 'mg'),
  ('magnesium-threonate', '19-50', 'm', 400::numeric, 350::numeric, 'mg'),
  ('magnesium-threonate', '19-50', 'f', 310::numeric, 350::numeric, 'mg'),
  ('magnesium-threonate', '51+', 'm', 420::numeric, 350::numeric, 'mg'),
  ('magnesium-threonate', '51+', 'f', 320::numeric, 350::numeric, 'mg'),
  ('vitamin-b12', '19-50', 'any', 2.4::numeric, null::numeric, 'mcg'),
  ('vitamin-b12', '51+', 'any', 2.4::numeric, null::numeric, 'mcg'),
  ('vitamin-b12', '14-18', 'any', 2.4::numeric, null::numeric, 'mcg'),
  ('selenium', '19-50', 'any', 55::numeric, 400::numeric, 'mcg'),
  ('selenium', '51+', 'any', 55::numeric, 400::numeric, 'mcg'),
  ('selenium', '14-18', 'any', 55::numeric, 400::numeric, 'mcg'),
  ('biotin', '19-50', 'any', 30::numeric, null::numeric, 'mcg'),
  ('biotin', '51+', 'any', 30::numeric, null::numeric, 'mcg'),
  ('biotin', '14-18', 'any', 25::numeric, null::numeric, 'mcg'),
  ('calcium-citrate', '19-50', 'any', 1000::numeric, 2500::numeric, 'mg'),
  ('calcium-citrate', '51+', 'm', 1000::numeric, 2000::numeric, 'mg'),
  ('calcium-citrate', '51+', 'f', 1200::numeric, 2000::numeric, 'mg'),
  ('calcium-citrate', '14-18', 'any', 1300::numeric, 3000::numeric, 'mg'),
  ('vitamin-a', '19-50', 'm', 900::numeric, 3000::numeric, 'mcg'),
  ('vitamin-a', '19-50', 'f', 700::numeric, 3000::numeric, 'mcg'),
  ('vitamin-a', '51+', 'm', 900::numeric, 3000::numeric, 'mcg'),
  ('vitamin-a', '51+', 'f', 700::numeric, 3000::numeric, 'mcg'),
  ('vitamin-a', '14-18', 'm', 900::numeric, 2800::numeric, 'mcg'),
  ('vitamin-a', '14-18', 'f', 700::numeric, 2800::numeric, 'mcg'),
  ('vitamin-e', '19-50', 'any', 15::numeric, 1000::numeric, 'mg'),
  ('vitamin-e', '51+', 'any', 15::numeric, 1000::numeric, 'mg'),
  ('vitamin-e', '14-18', 'any', 15::numeric, 800::numeric, 'mg'),
  ('vitamin-k2', '19-50', 'm', 120::numeric, null::numeric, 'mcg'),
  ('vitamin-k2', '19-50', 'f', 90::numeric, null::numeric, 'mcg'),
  ('vitamin-k2', '51+', 'm', 120::numeric, null::numeric, 'mcg'),
  ('vitamin-k2', '51+', 'f', 90::numeric, null::numeric, 'mcg'),
  ('thiamine', '19-50', 'm', 1.2::numeric, null::numeric, 'mg'),
  ('thiamine', '19-50', 'f', 1.1::numeric, null::numeric, 'mg'),
  ('thiamine', '51+', 'm', 1.2::numeric, null::numeric, 'mg'),
  ('thiamine', '51+', 'f', 1.1::numeric, null::numeric, 'mg'),
  ('riboflavin', '19-50', 'm', 1.3::numeric, null::numeric, 'mg'),
  ('riboflavin', '19-50', 'f', 1.1::numeric, null::numeric, 'mg'),
  ('riboflavin', '51+', 'm', 1.3::numeric, null::numeric, 'mg'),
  ('riboflavin', '51+', 'f', 1.1::numeric, null::numeric, 'mg'),
  ('niacin', '19-50', 'm', 16::numeric, 35::numeric, 'mg'),
  ('niacin', '19-50', 'f', 14::numeric, 35::numeric, 'mg'),
  ('niacin', '51+', 'm', 16::numeric, 35::numeric, 'mg'),
  ('niacin', '51+', 'f', 14::numeric, 35::numeric, 'mg'),
  ('pantothenic-acid', '19-50', 'any', 5::numeric, null::numeric, 'mg'),
  ('pantothenic-acid', '51+', 'any', 5::numeric, null::numeric, 'mg'),
  ('vitamin-b6', '19-50', 'any', 1.3::numeric, 100::numeric, 'mg'),
  ('vitamin-b6', '51+', 'm', 1.7::numeric, 100::numeric, 'mg'),
  ('vitamin-b6', '51+', 'f', 1.5::numeric, 100::numeric, 'mg'),
  ('folate', '19-50', 'any', 400::numeric, 1000::numeric, 'mcg'),
  ('folate', '51+', 'any', 400::numeric, 1000::numeric, 'mcg'),
  ('folate', '14-18', 'any', 400::numeric, 800::numeric, 'mcg'),
  ('choline', '19-50', 'm', 550::numeric, 3500::numeric, 'mg'),
  ('choline', '19-50', 'f', 425::numeric, 3500::numeric, 'mg'),
  ('choline', '51+', 'm', 550::numeric, 3500::numeric, 'mg'),
  ('choline', '51+', 'f', 425::numeric, 3500::numeric, 'mg'),
  ('iodine', '19-50', 'any', 150::numeric, 1100::numeric, 'mcg'),
  ('iodine', '51+', 'any', 150::numeric, 1100::numeric, 'mcg'),
  ('iodine', '14-18', 'any', 150::numeric, 900::numeric, 'mcg'),
  ('copper', '19-50', 'any', 900::numeric, 10000::numeric, 'mcg'),
  ('copper', '51+', 'any', 900::numeric, 10000::numeric, 'mcg'),
  ('copper', '14-18', 'any', 890::numeric, 8000::numeric, 'mcg'),
  ('manganese', '19-50', 'm', 2.3::numeric, 11::numeric, 'mg'),
  ('manganese', '19-50', 'f', 1.8::numeric, 11::numeric, 'mg'),
  ('manganese', '51+', 'm', 2.3::numeric, 11::numeric, 'mg'),
  ('manganese', '51+', 'f', 1.8::numeric, 11::numeric, 'mg'),
  ('chromium', '19-50', 'm', 35::numeric, null::numeric, 'mcg'),
  ('chromium', '19-50', 'f', 25::numeric, null::numeric, 'mcg'),
  ('chromium', '51+', 'm', 30::numeric, null::numeric, 'mcg'),
  ('chromium', '51+', 'f', 20::numeric, null::numeric, 'mcg'),
  ('molybdenum', '19-50', 'any', 45::numeric, 2000::numeric, 'mcg'),
  ('molybdenum', '51+', 'any', 45::numeric, 2000::numeric, 'mcg'),
  ('potassium', '19-50', 'm', 3400::numeric, null::numeric, 'mg'),
  ('potassium', '19-50', 'f', 2600::numeric, null::numeric, 'mg'),
  ('potassium', '51+', 'm', 3400::numeric, null::numeric, 'mg'),
  ('potassium', '51+', 'f', 2600::numeric, null::numeric, 'mg'),
  ('boron', '19-50', 'any', null::numeric, 20::numeric, 'mg'),
  ('boron', '51+', 'any', null::numeric, 20::numeric, 'mg')
) as t(slug, age_band, sex, rda, ul, unit) on t.slug = g.slug
on conflict (glossary_id, age_band, sex) do update set
  rda = excluded.rda, ul = excluded.ul, unit = excluded.unit;
