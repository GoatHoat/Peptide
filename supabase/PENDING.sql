-- Not yet applied to the Pepstack database, in order.
--
-- 0026 IS URGENT. The Delete Account button is live in the shipped app and
-- calls public.delete_account(). Until this file is run it will error for
-- every user who taps it.
-- Paste the whole file into the Supabase SQL editor and run it once.
--
-- 0025 you have already run under its old name (0018_schedule_joins_stack).
-- It is fully guarded, so running it again changes nothing.

-- ═══════════ 0018_onboarding_answers ═══════════
-- The three personalisation questions asked during onboarding: what the user
-- does not eat, what has not agreed with them before, and which forms they
-- prefer to take.
--
-- They live on the profile rather than in localStorage because they decide
-- which product is suggested, not whether one is — a new device with an empty
-- localStorage would otherwise ask the same three questions again, and nothing
-- running server-side could see the answers at all.
--
-- reactions_note is free text from the "something else" field. It is context
-- for the assistant and is never read by a rule; a rule reading free text is
-- how you end up recommending on a typo.

alter table public.profiles
  add column if not exists diet           text[] not null default '{}',
  add column if not exists reactions      text[] not null default '{}',
  add column if not exists reactions_note text,
  add column if not exists form_prefs     text[] not null default '{}';

-- ═══════════ 0019_menstrual_status ═══════════
-- Iron is the one reference intake in the catalogue that turns on whether the
-- person menstruates: 18 mg if they do, 8 mg if they do not. The app was
-- deriving that from `age >= 51`, which is wrong for anyone 45-50, anyone with
-- early menopause and anyone on continuous hormonal contraception — and wrong
-- in the direction that matters, because it halves the figure.
--
-- Nullable with no default, and it stays null unless the person answers. Null
-- means "we were not told" and renders both figures rather than picking one;
-- "prefer not to say" writes null for the same reason. There is no question
-- about this in onboarding — it is asked on the iron entry itself, where the
-- reason for asking is next to the figure it changes.

alter table public.profiles
  add column if not exists menstruates boolean;

comment on column public.profiles.menstruates is
  'Null means unanswered, and renders the 18 mg / 8 mg range rather than a guess. Only the iron reference intake reads it.';

-- ═══════════ 0020_product_shaped_slugs ═══════════
-- Product-shaped slugs.
--
-- The 74 supplement slugs are ingredient-shaped: `magnesium-glycinate`,
-- `zinc`, `omega-3`. That works while the catalogue holds one product per
-- ingredient and stops working the moment it does not. The 176 products in
-- `CATALOG_BRANDED_176.md` include three collagens, four B-complexes and five
-- magnesiums, so `magnesium-glycinate` has to become a product identifier
-- before any of them can go in.
--
-- THE CONVENTION, written down here because the 176-product migration has to
-- follow it exactly:
--
--     slug = slugify(brand) || '-' || slugify(product name minus the brand)
--
--   slugify: lowercase; drop apostrophes outright (Vinco's -> vincos); drop a
--   .com/.co/.net suffix (BulkSupplements.com -> bulksupplements); & -> "and";
--   every other run of non-alphanumerics -> a single hyphen; trim hyphens.
--
--   The DSLD product name already begins with the brand in all 74 rows, so the
--   brand prefix is stripped from the name before joining and the slug says the
--   brand once. Strength and flavour stay in — they are what tells two filings
--   of the same product apart, which is the entire point.
--
--   Nothing is truncated. The longest is 67 characters
--   (`protocol-for-life-balance-high-potency-d3-10-000-iu-cholecalciferol`) and
--   a shortening rule is a collision rule nobody would remember to apply.
--
-- FOREIGN REFERENCES. There are none to update, which was worth confirming
-- rather than assuming. `stack_items`, `schedule_items`, `doses`,
-- `glossary_research` and `nutrient_reference` all reference `glossary.id`, a
-- uuid, and this migration updates a column on the row it keeps. Nothing in
-- `src/` reads a slug except `recommend.ts`, which folds it into the text it
-- matches nutrient rules against — and since every product name is
-- brand-prefixed, the new slug is exactly `slugify(name)`, so that text holds
-- no word it did not hold before. `match_goal` (migration 0009) searches name,
-- category, the two summaries, goal_tags and search_keywords, never the slug.
-- The tokens in `src/lib/conflicts.ts` — 'zinc', 'omega-3', 'glycine' — look
-- like slugs and are not; they are matched as substrings of the item name.
--
-- ORDER MATTERS. Migrations 0016 and 0017 insert `on conflict (slug)`. Once
-- this has run their conflict targets no longer exist, so re-running either of
-- them would insert the old ingredient-shaped rows a second time rather than
-- updating the existing ones. Apply in order and do not go back.

-- Named for this migration so `drop table if exists` can never reach a real
-- table. The unique constraint is the typo check: a mapping that repeats a
-- target refuses to load rather than renaming two products to one slug.
drop table if exists _slug_rename_0020;
create temporary table _slug_rename_0020 (
  old_slug text primary key,
  new_slug text not null unique
);

insert into _slug_rename_0020 (old_slug, new_slug) values
  -- the 24 from 0016, re-branded by 0017
  ('collagen-peptides', 'vital-proteins-collagen-peptides'),
  ('biotin', 'finest-nutrition-biotin-5-000-mcg'),
  ('vitamin-c', 'gematria-vitamin-c-complex'),
  ('hyaluronic-acid', 'new-sun-hyaluronic-acid'),
  ('magnesium-glycinate', 'vincos-magnesium-glycinate'),
  ('melatonin', 'village-vitality-sleep-with-valerian-and-melatonin'),
  ('l-theanine', 'woodstock-vitamins-l-theanine-200-mg'),
  ('glycine', 'protocol-for-life-balance-glycine'),
  ('creatine-monohydrate', 'pure-advantage-creatine-monohydrate'),
  ('vitamin-b12', 'bulksupplements-vitamin-b12-1-methylcobalamin'),
  ('iron-bisglycinate', 'thorne-iron-bisglycinate'),
  ('coq10', 'ol-olympian-labs-ubiquinol'),
  ('omega-3', 'deva-vegan-omega-3-dha-epa'),
  ('citicoline', 'aor-advanced-orthomolecular-research-citicoline'),
  ('bacopa-monnieri', 'supersmart-bacopa-monnieri'),
  ('rhodiola-rosea', 'nutracraft-rhodiola-rosea'),
  ('whey-protein', 'biochem-100-whey-isolate-protein-chocolate-peppermint'),
  ('beta-alanine', 'now-sports-beta-alanine-powder'),
  ('l-citrulline', 'nutrakey-health-performance-l-citrulline-malate'),
  ('vitamin-d3', 'protocol-for-life-balance-high-potency-d3-10-000-iu-cholecalciferol'),
  ('zinc', 'aor-advanced-orthomolecular-research-premium-zinc-copper-balance'),
  ('elderberry', 'nobi-nutrition-sambucus-elderberry'),
  ('probiotics', 'allergy-research-group-lactobacillus'),
  ('selenium', 'pure-encapsulations-selenium-selenomethionine'),

  -- the 50 added by 0017
  ('vitamin-a', 'sundown-naturals-vitamin-a-10-000-iu'),
  ('vitamin-e', 'vitamin-world-natural-e-400-iu-d-alpha-tocopherol'),
  ('vitamin-k2', 'douglas-laboratories-vitamin-k2-menaquinone-7'),
  ('thiamine', 'bulksupplements-vitamin-b1-thiamine-mononitrate'),
  ('riboflavin', 'natures-way-riboflavin-vitamin-b2-100-mg'),
  ('niacin', 'bluebonnet-niacin-100-mg'),
  ('pantothenic-acid', 'bulksupplements-pantothenic-acid-vitamin-b5-powder-500-mg'),
  ('vitamin-b6', 'superiorlabs-vitamin-b6'),
  ('folate', 'advanced-nutrition-by-zahler-methylfolate'),
  ('choline', 'krk-supplements-choline-bitartrate'),
  ('inositol', 'pure-myo-inositol'),
  ('calcium-citrate', 'nutricology-calcium-citrate'),
  ('potassium', 'nutricology-potassium-citrate'),
  ('iodine', 'hi-tech-pharmaceuticals-potassium-iodide-130-mg'),
  ('copper', 'thorne-copper-bisglycinate'),
  ('manganese', 'trace-minerals-research-ionic-manganese-10-mg'),
  ('chromium', 'energyfirst-chromium-picolinate'),
  ('molybdenum', 'allergy-research-group-liquid-molybdenum'),
  ('boron', 'now-boron-3-mg'),
  ('magnesium-citrate', 'nutricology-magnesium-citrate'),
  ('magnesium-threonate', 'teraputics-pure-life-magnesium-l-threonate'),
  ('nac', 'nhc-natural-healthy-concepts-n-acetyl-cysteine'),
  ('taurine', 'bulksupplements-taurine'),
  ('l-tyrosine', 'now-l-tyrosine'),
  ('l-lysine', 'superiorlabs-l-lysine'),
  ('l-arginine', 'mytrition-l-arginine'),
  ('alpha-lipoic-acid', 'bulksupplements-alpha-lipoic-acid'),
  ('quercetin', 'procaps-laboratories-quercetin-500'),
  ('curcumin', 'natures-craft-turmeric-curcumin'),
  ('resveratrol', 'herbadiet-trans-resveratrol'),
  ('berberine', 'codeage-berberine-phytosome'),
  ('milk-thistle', 'wonder-laboratories-silymarin-milk-thistle'),
  ('ashwagandha', 'oregons-wild-harvest-ashwagandha'),
  ('ginkgo', 'havasu-nutrition-ginkgo-biloba-phosphatidylserine'),
  ('panax-ginseng', 'herbadiet-panax-ginseng-extract'),
  ('green-tea-extract', 'aor-advanced-orthomolecular-research-advanced-active-green-tea'),
  ('garlic-extract', 'wakunaga-of-america-kyolic-aged-garlic-extract'),
  ('saw-palmetto', 'zhou-saw-palmetto'),
  ('lutein', 'health-thru-nutrition-naturally-lutein-with-zeaxanthin-20-mg'),
  ('astaxanthin', 'doctors-best-astaxanthin'),
  ('beta-glucan', 'doctors-best-barley-beta-glucan'),
  ('psyllium', 'vitamin-world-acidophilus-and-psyllium-husk'),
  ('digestive-enzymes', 'gnc-beyond-raw-digestive-enzymes'),
  ('msm', 'bulksupplements-msm-methylsulfonylmethane-1500-mg'),
  ('glucosamine', 'carlson-glucosamine-sulfate'),
  ('chondroitin', 'procaps-laboratories-chondroitin-sulfate-1200'),
  ('spirulina', 'healths-harmony-california-spirulina'),
  ('pqq', 'quality-of-life-labs-vitapqq-pyrroloquinoline-quinone'),
  ('betaine-tmg', 'gnc-beyond-raw-chemistry-labs-betaine-anhydrous-2-5-grams'),
  ('zinc-picolinate', 'pure-prescriptions-zinc-picolinate');

do $$
declare
  m record;
  total integer;
  renamed integer := 0;
  already integer := 0;
  missing integer := 0;
  left_behind text;
begin
  select count(*) into total from _slug_rename_0020;
  if total <> 74 then
    raise exception 'expected 74 renames, got %', total;
  end if;

  for m in select old_slug, new_slug from _slug_rename_0020 order by old_slug loop
    -- Both present is the one state this cannot resolve on its own: it means
    -- two rows now claim the same product, and picking which to keep is a
    -- judgement about user data hanging off the ids, not a migration.
    if exists (select 1 from public.glossary where slug = m.old_slug)
       and exists (select 1 from public.glossary where slug = m.new_slug) then
      raise exception
        'slug rename: % and % both exist — resolve by hand before re-running',
        m.old_slug, m.new_slug;
    end if;

    if exists (select 1 from public.glossary where slug = m.new_slug) then
      already := already + 1;                       -- already applied
    elsif exists (select 1 from public.glossary where slug = m.old_slug) then
      update public.glossary set slug = m.new_slug where slug = m.old_slug;
      renamed := renamed + 1;
    else
      -- Neither shape is present. Not fatal on its own — it means 0017 has not
      -- been applied to this database yet — but say so, loudly, because the
      -- alternative reading is that a product silently went missing.
      missing := missing + 1;
      raise notice 'slug rename: neither % nor % is present', m.old_slug, m.new_slug;
    end if;
  end loop;

  raise notice
    'product-shaped slugs: % renamed, % already renamed, % not in this database',
    renamed, already, missing;

  select string_agg(g.slug, ', ' order by g.slug) into left_behind
  from public.glossary g
  join _slug_rename_0020 r on r.old_slug = g.slug;

  if left_behind is not null then
    raise exception 'ingredient-shaped slugs left behind: %', left_behind;
  end if;
end $$;

drop table _slug_rename_0020;

-- ═══════════ 0021_catalogue_176 ═══════════
-- The 176 branded products from `CATALOG_BRANDED_176.md`.
--
-- Takes Vitamins & Minerals from 74 entries to 250. Nothing is removed and no
-- existing row is touched; this migration only inserts.
--
-- VERIFICATION. Every one of the 176 DSLD label ids was fetched from
-- `https://api.ods.od.nih.gov/dsld/v9/label/<id>` before this file was written.
-- All 176 returned HTTP 200 with a record, all 176 carry `offMarket: 0`, and
-- the 176 ids are distinct. Nothing was dropped and nothing was substituted.
--
-- WHERE THE FILE AND THE FILING DIVERGE. 42 rows have a shorter brand or
-- product name in the catalogue file than the API returns. Every one is the
-- same filing, not a different product, and the spec says brand, name and form
-- come from the file — so the file's wording is what goes in. Written down here
-- so the difference is auditable rather than invisible:
--
--   19 sub-brand vs parent brand: the file says Sports Research where DSLD says
--   `SR Sports Research` (3), Swanson where DSLD says `Swanson GreenFoods
--   Formulas` / `Superior Herbs` / `Premium Brand` (3), Host Defense where DSLD
--   says `Host Defense Mushrooms` and its `MycoBenefits` / `MycoBotanicals`
--   lines (12), and NOW where DSLD says `NOW Sports` (1, the tribulus).
--
--   17 flavour or pack descriptors the file drops: `Natural Raspberry Lemonade
--   Flavor`, `Alcohol & Sugar Free`, `5 Billion CFU` and so on. Dropped because
--   they name the tub, not the product, and two of them are longer than the
--   product name itself.
--
--   3 house prefixes the file drops: Doctor's Best files L-Tyrosine and Lithium
--   Aspartate as `Best ...`; NOW files the boswellia as `Extra Strength ...`.
--
--   3 one-off wordings: DSLD has a typo in the Solgar B12 (`Vitamon B12`), it
--   files the Solgar iron as `Earth Source Food` where the file says `Earth
--   Source`, and it writes the NOW tribulus as `1,000 mg` not `1000 mg`.
--
-- SLUGS follow the convention migration 0020 wrote down, with no exceptions:
-- `slugify(brand) || '-' || slugify(product name)`. All 176 are distinct from
-- each other and from the 74 slugs 0020 produces. Longest is 52 characters.
--
-- CATEGORY AND GOAL TAGS come from the section the product sits under in the
-- file, mapped onto the tag vocabulary migration 0003 established and the
-- goals in `src/onboarding/goals.tsx`: Skin & hair -> Skin/Anti-Aging, Sleep ->
-- Sleep/Mood, Energy -> Energy/Recovery, Focus -> Focus, Training ->
-- Muscle/Recovery/Injury, Immunity & gut -> Immune/Gut Health. Tags are per
-- product rather than per section where the product plainly reaches into a
-- second one.
--
-- MECHANISM SUMMARIES were written against the ingredient panel each label
-- actually declares, pulled from the same API call, not from the product name.
-- That mattered more than expected: Klean Focus reads like an omega-3 and
-- contains none, Klean Omega does not say omega anywhere on its panel and is a
-- marine EPA/DHA concentrate, and Pure Encapsulations Amino-NR declares a full
-- amino acid profile rather than nicotinamide riboside.
--
-- SEARCH KEYWORDS are the one column here the spec does not list. They are
-- included because `match_goal` (0009) searches them and `src/lib/recommend.ts`
-- folds them into the text it matches nutrient rules against, so a product
-- whose name does not say what it is would otherwise be invisible to both.
-- They name the active ingredient the product is sold as and nothing else — no
-- blend is given its constituents as keywords, or every multivitamin in here
-- would read as an iron product to the recommendation rules.
--
-- NOT APPLIED. Written to disk only, per the standing rule.

insert into public.glossary
  (slug, name, category, mechanism_summary, storage_notes, route, research_summary,
   goal_tags, search_keywords, kind, brand, product_form, label_url)
values
  -- Skin & hair (32)
  ('sports-research-marine-collagen-unflavored', 'Sports Research Marine Collagen Unflavored', 'cosmetic',
   'Hydrolysed collagen peptides from fish skin, cut short enough to cross the gut wall rather than be digested as ordinary protein.',
   'Store cool and dry.', 'oral',
   'Commonly studied for skin elasticity and hydration outcomes. This entry is the Sports Research Marine Collagen Unflavored label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['collagen', 'marine collagen', 'fish collagen'], 'supplement', 'Sports Research', 'Powder',
   'https://dsld.od.nih.gov/label/326266'),
  ('sports-research-hydrolyzed-collagen-peptides-vanilla', 'Sports Research Hydrolyzed Collagen Peptides Vanilla', 'cosmetic',
   'Hydrolysed bovine collagen peptides — the type I and III collagen that makes up most of the dermis and tendon.',
   'Store cool and dry.', 'oral',
   'Commonly studied for skin elasticity and joint comfort outcomes. This entry is the Sports Research Hydrolyzed Collagen Peptides Vanilla label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['collagen', 'bovine collagen'], 'supplement', 'Sports Research', 'Powder',
   'https://dsld.od.nih.gov/label/268450'),
  ('sports-research-collagen-peptides-matcha', 'Sports Research Collagen Peptides Matcha', 'cosmetic',
   'Hydrolysed bovine collagen peptides with matcha green tea, which brings its own catechins.',
   'Store cool and dry.', 'oral',
   'Commonly studied for skin elasticity outcomes. This entry is the Sports Research Collagen Peptides Matcha label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['collagen', 'bovine collagen', 'matcha'], 'supplement', 'Sports Research', 'Powder',
   'https://dsld.od.nih.gov/label/326246'),
  ('solgar-vegetal-silica', 'Solgar Vegetal Silica', 'cosmetic',
   'Plant-derived silicon, the trace element that cross-links the glycosaminoglycans giving hair and nail their structure.',
   'Store cool and dry.', 'oral',
   'Commonly studied for hair and nail strength. This entry is the Solgar Vegetal Silica label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['silica', 'silicon'], 'supplement', 'Solgar', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/216405'),
  ('swanson-bamboo-extract', 'Swanson Bamboo Extract', 'cosmetic',
   'Bamboo leaf and stem extract, the densest plant source of silica.',
   'Store cool and dry.', 'oral',
   'Commonly studied for hair and nail strength. This entry is the Swanson Bamboo Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['silica', 'silicon', 'bamboo'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/308476'),
  ('jarrow-formulas-hyaluronic-acid-120-mg', 'Jarrow Formulas Hyaluronic Acid 120 mg', 'cosmetic',
   'A glycosaminoglycan native to skin and connective tissue, taken orally rather than applied.',
   'Store cool and dry.', 'oral',
   'Commonly studied for skin hydration and joint comfort. This entry is the Jarrow Formulas Hyaluronic Acid 120 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['hyaluronic acid'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307599'),
  ('thorne-biotin-8000-mcg', 'Thorne Biotin 8000 mcg', 'cosmetic',
   'Vitamin B7, a cofactor for the carboxylase enzymes involved in building keratin.',
   'Store cool and dry.', 'oral',
   'Commonly studied for hair and nail outcomes, and for its well-documented interference with laboratory assays. This entry is the Thorne Biotin 8000 mcg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['biotin', 'vitamin b7'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/336328'),
  ('sports-research-biotin-2500-mcg', 'Sports Research Biotin 2500 mcg', 'cosmetic',
   'Vitamin B7 in a plant-based softgel, a cofactor for the carboxylase enzymes that build keratin.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for hair and nail outcomes, and for its interference with laboratory assays. This entry is the Sports Research Biotin 2500 mcg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['biotin', 'vitamin b7'], 'supplement', 'Sports Research', 'Veggie Softgel',
   'https://dsld.od.nih.gov/label/326240'),
  ('nature-made-hair-skin-nails', 'Nature Made Hair-Skin-Nails', 'cosmetic',
   'Biotin with vitamins A and C, zinc and copper — the cofactors keratin and collagen synthesis draw on.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for hair and nail outcomes. This entry is the Nature Made Hair-Skin-Nails label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['biotin', 'hair skin and nails'], 'supplement', 'Nature Made', 'Softgel',
   'https://dsld.od.nih.gov/label/271631'),
  ('life-extension-skin-restoring-ceramides', 'Life Extension Skin Restoring Ceramides', 'cosmetic',
   'Wheat-derived ceramides, the lipids that hold water in the outermost layer of skin.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for skin hydration. This entry is the Life Extension Skin Restoring Ceramides label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['ceramides', 'wheat ceramides'], 'supplement', 'Life Extension', 'Liquid Veg Capsule',
   'https://dsld.od.nih.gov/label/182373'),
  ('sports-research-astaxanthin-12-mg', 'Sports Research Astaxanthin 12 mg', 'cosmetic',
   'A red carotenoid from algae, one of the few that sits across the whole width of a cell membrane rather than at one face.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for skin elasticity and UV tolerance. This entry is the Sports Research Astaxanthin 12 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['astaxanthin', 'carotenoid'], 'supplement', 'Sports Research', 'Softgel',
   'https://dsld.od.nih.gov/label/326237'),
  ('pure-encapsulations-lycopene-20-mg', 'Pure Encapsulations Lycopene 20 mg', 'cosmetic',
   'The carotenoid that makes tomatoes red, which concentrates in skin and prostate tissue.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for skin and prostate outcomes. This entry is the Pure Encapsulations Lycopene 20 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['lycopene', 'carotenoid'], 'supplement', 'Pure Encapsulations', 'Softgel',
   'https://dsld.od.nih.gov/label/277768'),
  ('jarrow-formulas-carotenall', 'Jarrow Formulas CarotenAll', 'cosmetic',
   'Mixed carotenoids — lutein, zeaxanthin, lycopene, astaxanthin and alpha-carotene together rather than beta-carotene alone.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for skin, eye and antioxidant outcomes. This entry is the Jarrow Formulas CarotenAll label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['carotenoids', 'lutein', 'zeaxanthin', 'lycopene', 'astaxanthin'], 'supplement', 'Jarrow Formulas', 'Softgel',
   'https://dsld.od.nih.gov/label/307570'),
  ('thorne-niacinamide', 'Thorne Niacinamide', 'cosmetic',
   'The amide form of vitamin B3, which does not cause the flushing nicotinic acid does.',
   'Store cool and dry.', 'oral',
   'Commonly studied for skin barrier outcomes, and for the flushing difference between the two forms of B3. This entry is the Thorne Niacinamide label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['niacinamide', 'nicotinamide', 'vitamin b3'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/337868'),
  ('swanson-l-methionine-500-mg', 'Swanson L-Methionine 500 mg', 'cosmetic',
   'A sulphur-bearing essential amino acid, the methyl donor upstream of cysteine and glutathione.',
   'Store cool and dry.', 'oral',
   'Commonly studied for liver and antioxidant outcomes. This entry is the Swanson L-Methionine 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['methionine', 'amino acid'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/308438'),
  ('jarrow-formulas-evening-primrose-1300-mg', 'Jarrow Formulas Evening Primrose 1300 mg', 'cosmetic',
   'Evening primrose oil, a plant source of gamma-linolenic acid — the omega-6 the body otherwise makes in one slow step.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for skin barrier and inflammatory outcomes. This entry is the Jarrow Formulas Evening Primrose 1300 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['evening primrose oil', 'gla', 'gamma-linolenic acid'], 'supplement', 'Jarrow Formulas', 'Softgel',
   'https://dsld.od.nih.gov/label/307584'),
  ('jarrow-formulas-borage-seed-oil-1200-mg', 'Jarrow Formulas Borage Seed Oil 1200 mg', 'cosmetic',
   'Borage seed oil, the densest plant source of gamma-linolenic acid.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for skin barrier and inflammatory outcomes. This entry is the Jarrow Formulas Borage Seed Oil 1200 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['borage oil', 'gla', 'gamma-linolenic acid'], 'supplement', 'Jarrow Formulas', 'Softgel',
   'https://dsld.od.nih.gov/label/307565'),
  ('sports-research-evening-primrose-oil-500-mg', 'Sports Research Evening Primrose Oil 500 mg', 'cosmetic',
   'Evening primrose seed oil, carrying gamma-linolenic acid from a plant rather than a fish.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for skin barrier and inflammatory outcomes. This entry is the Sports Research Evening Primrose Oil 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['evening primrose oil', 'gla', 'gamma-linolenic acid'], 'supplement', 'Sports Research', 'Softgel',
   'https://dsld.od.nih.gov/label/268445'),
  ('now-gamma-e-tocopherols', 'NOW Gamma E Tocopherols', 'cosmetic',
   'Mixed tocopherols led by the gamma form, rather than the alpha-tocopherol most vitamin E products isolate.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for antioxidant and skin outcomes. This entry is the NOW Gamma E Tocopherols label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['vitamin e', 'tocopherols', 'gamma-tocopherol'], 'supplement', 'NOW', 'Softgel',
   'https://dsld.od.nih.gov/label/14558'),
  ('jarrow-formulas-opcs-95-100-mg', 'Jarrow Formulas OPCs + 95 100 mg', 'cosmetic',
   'Grape seed oligomeric proanthocyanidins, the polyphenols that bind and stabilise collagen fibres.',
   'Store cool and dry.', 'oral',
   'Commonly studied for vascular and skin outcomes. This entry is the Jarrow Formulas OPCs + 95 100 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['grape seed extract', 'opc', 'proanthocyanidins'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/211990'),
  ('bulksupplements-amla-extract', 'BulkSupplements.com Amla Extract', 'cosmetic',
   'Indian gooseberry fruit extract, one of the densest whole-food sources of vitamin C and its tannins.',
   'Store cool and dry.', 'oral',
   'Commonly studied for hair and antioxidant outcomes. This entry is the BulkSupplements.com Amla Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['amla', 'indian gooseberry', 'amalaki'], 'supplement', 'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/310652'),
  ('swanson-full-spectrum-gotu-kola-435-mg', 'Swanson Full Spectrum Gotu Kola 435 mg', 'cosmetic',
   'Centella asiatica leaf, whose triterpenes are studied for how they act on fibroblasts and wound repair.',
   'Store cool and dry.', 'oral',
   'Commonly studied for wound healing and vein outcomes. This entry is the Swanson Full Spectrum Gotu Kola 435 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['gotu kola', 'centella asiatica'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/308561'),
  ('swanson-full-spectrum-fo-ti-500-mg', 'Swanson Full Spectrum Fo-Ti 500 mg', 'cosmetic',
   'Polygonum multiflorum root, used in Chinese herbal practice for hair and studied far less than that use suggests.',
   'Store cool and dry.', 'oral',
   'Commonly studied for hair outcomes, on thin human evidence. This entry is the Swanson Full Spectrum Fo-Ti 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['fo-ti', 'he shou wu', 'polygonum multiflorum'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/308558'),
  ('swanson-black-cumin-seed-oil-500-mg', 'Swanson Black Cumin Seed Oil 500 mg', 'cosmetic',
   'Nigella sativa seed oil, whose thymoquinone fraction is the one most of the work is on.',
   'Store cool and dry.', 'oral',
   'Commonly studied for inflammatory and skin outcomes. This entry is the Swanson Black Cumin Seed Oil 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['black cumin seed oil', 'black seed oil', 'nigella sativa', 'thymoquinone'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/308482'),
  ('life-extension-black-cumin-seed-oil-and-bio-curcumin', 'Life Extension Black Cumin Seed Oil and Bio-Curcumin', 'cosmetic',
   'Nigella sativa seed oil with a curcumin extract formulated for absorption, since plain curcumin barely reaches the blood.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for inflammatory outcomes. This entry is the Life Extension Black Cumin Seed Oil and Bio-Curcumin label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['black cumin seed oil', 'nigella sativa', 'curcumin', 'turmeric'], 'supplement', 'Life Extension', 'Softgel',
   'https://dsld.od.nih.gov/label/209156'),
  ('thorne-broccoli-seed-extract', 'Thorne Broccoli Seed Extract', 'cosmetic',
   'Sulforaphane glucosinolate from broccoli seed with the mustard-seed myrosinase that converts it.',
   'Store cool and dry.', 'oral',
   'Commonly studied for phase II detoxification enzyme induction. This entry is the Thorne Broccoli Seed Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['sulforaphane', 'broccoli seed', 'glucoraphanin'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/328824'),
  ('swanson-sprouted-broccoli-seed-400-mg', 'Swanson Sprouted Broccoli Seed 400 mg', 'cosmetic',
   'Sprouted broccoli seed — the whole sprout rather than an isolated sulforaphane precursor.',
   'Store cool and dry.', 'oral',
   'Commonly studied for phase II detoxification enzyme induction. This entry is the Swanson Sprouted Broccoli Seed 400 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['sulforaphane', 'broccoli sprout', 'glucoraphanin'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/176236'),
  ('pure-encapsulations-ascorbyl-palmitate', 'Pure Encapsulations Ascorbyl Palmitate', 'cosmetic',
   'A fat-soluble ester of vitamin C, which partitions into membranes where ascorbic acid does not.',
   'Store cool and dry.', 'oral',
   'Commonly studied for antioxidant and skin outcomes. This entry is the Pure Encapsulations Ascorbyl Palmitate label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['vitamin c', 'ascorbyl palmitate', 'ascorbic acid'], 'supplement', 'Pure Encapsulations', 'Capsule',
   'https://dsld.od.nih.gov/label/293890'),
  ('now-acerola-4-1-extract-powder', 'NOW Acerola 4:1 Extract Powder', 'cosmetic',
   'Acerola cherry concentrate, a whole-fruit source of vitamin C rather than synthetic ascorbic acid.',
   'Store cool and dry.', 'oral',
   'Commonly studied for vitamin C status and collagen synthesis. This entry is the NOW Acerola 4:1 Extract Powder label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Immune'], array['acerola', 'vitamin c', 'ascorbic acid'], 'supplement', 'NOW', 'Powder',
   'https://dsld.od.nih.gov/label/313547'),
  ('life-extension-palmettoguard', 'Life Extension PalmettoGuard', 'cosmetic',
   'Saw palmetto fruit extract with beta-sitosterol and rosemary, standardised on its fatty acid fraction.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for prostate and hair follicle outcomes. This entry is the Life Extension PalmettoGuard label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['saw palmetto', 'serenoa repens', 'beta-sitosterol'], 'supplement', 'Life Extension', 'Softgel',
   'https://dsld.od.nih.gov/label/328635'),
  ('bulksupplements-saw-palmetto-extract-320-mg', 'BulkSupplements.com Saw Palmetto Extract 320 mg', 'cosmetic',
   'Saw palmetto berry extract, studied for its effect on the enzyme that converts testosterone to DHT.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for prostate and hair follicle outcomes. This entry is the BulkSupplements.com Saw Palmetto Extract 320 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin'], array['saw palmetto', 'serenoa repens'], 'supplement', 'BulkSupplements.com', 'Softgel',
   'https://dsld.od.nih.gov/label/294541'),
  ('swanson-rosemary-extract-500-mg', 'Swanson Rosemary Extract 500 mg', 'cosmetic',
   'Rosemary leaf extract, carrying the carnosic and rosmarinic acids that make it a food preservative as well as a herb.',
   'Store cool and dry.', 'oral',
   'Commonly studied for antioxidant outcomes. This entry is the Swanson Rosemary Extract 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Skin', 'Anti-Aging'], array['rosemary', 'carnosic acid', 'rosmarinic acid'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/176328'),

  -- Sleep (26)
  ('thorne-pharmagaba-250', 'Thorne PharmaGABA-250', 'other',
   'Gamma-aminobutyric acid made by fermentation — the brain’s main inhibitory transmitter, though how much of an oral dose reaches it is contested.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep latency and subjective calm. This entry is the Thorne PharmaGABA-250 label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['gaba', 'gamma-aminobutyric acid'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/284252'),
  ('thorne-theanine', 'Thorne Theanine', 'other',
   'L-theanine, the amino acid in green tea that raises alpha wave activity without sedating.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep quality and stress outcomes. This entry is the Thorne Theanine label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['l-theanine', 'theanine'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/298051'),
  ('jarrow-formulas-theanine-200-mg', 'Jarrow Formulas Theanine 200 mg', 'other',
   'L-theanine at 200 mg, the amount used in most of the trials.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep quality and stress outcomes. This entry is the Jarrow Formulas Theanine 200 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['l-theanine', 'theanine'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307738'),
  ('nature-made-l-theanine-chewable-200-mg', 'Nature Made L-Theanine Chewable 200 mg', 'other',
   'L-theanine in a chewable tablet, for people who would rather not swallow anything before bed.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep quality and stress outcomes. This entry is the Nature Made L-Theanine Chewable 200 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['l-theanine', 'theanine'], 'supplement', 'Nature Made', 'Tablet',
   'https://dsld.od.nih.gov/label/313831'),
  ('nature-made-melatonin-200-mg-l-theanine', 'Nature Made Melatonin + 200 mg L-Theanine', 'other',
   'Melatonin with L-theanine, pairing the circadian signal with the amino acid studied for settling before sleep.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for sleep latency and sleep quality. This entry is the Nature Made Melatonin + 200 mg L-Theanine label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['melatonin', 'l-theanine'], 'supplement', 'Nature Made', 'Softgel',
   'https://dsld.od.nih.gov/label/271095'),
  ('life-extension-fast-acting-liquid-melatonin', 'Life Extension Fast-Acting Liquid Melatonin', 'other',
   'Melatonin as a liquid — the hormone that signals darkness, not one that sedates.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for sleep latency and circadian shift. This entry is the Life Extension Fast-Acting Liquid Melatonin label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep'], array['melatonin'], 'supplement', 'Life Extension', 'Liquid',
   'https://dsld.od.nih.gov/label/328461'),
  ('now-melatonin-5-mg', 'NOW Melatonin 5 mg', 'other',
   'Melatonin at 5 mg, well above the amount most of the circadian work uses.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep latency and jet lag. This entry is the NOW Melatonin 5 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep'], array['melatonin'], 'supplement', 'NOW', 'Tablet',
   'https://dsld.od.nih.gov/label/313770'),
  ('klean-athlete-klean-melatonin', 'Klean Athlete Klean Melatonin', 'other',
   'Melatonin as a liquid, third-party tested for sport, where the dose can be measured out rather than fixed by the tablet.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for sleep latency and circadian shift. This entry is the Klean Athlete Klean Melatonin label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep'], array['melatonin'], 'supplement', 'Klean Athlete', 'Liquid',
   'https://dsld.od.nih.gov/label/237080'),
  ('life-extension-enhanced-sleep-without-melatonin', 'Life Extension Enhanced Sleep without Melatonin', 'other',
   'An ashwagandha and amla blend with a casein decapeptide, formulated for people who do not get on with melatonin.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep quality without a melatonin dose. This entry is the Life Extension Enhanced Sleep without Melatonin label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep'], array['ashwagandha', 'casein decapeptide'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328446'),
  ('thorne-glycine', 'Thorne Glycine', 'other',
   'The smallest amino acid, studied for the drop in core temperature that precedes sleep onset.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep onset and next-day alertness. This entry is the Thorne Glycine label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep'], array['glycine', 'amino acid'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/291783'),
  ('life-extension-glycine-1000-mg', 'Life Extension Glycine 1000 mg', 'other',
   'Glycine at 1 g, a third of the amount used in the sleep trials.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep onset and next-day alertness. This entry is the Life Extension Glycine 1000 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep'], array['glycine', 'amino acid'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328470'),
  ('pure-encapsulations-glycine', 'Pure Encapsulations Glycine', 'other',
   'Glycine, the amino acid the body uses in collagen and in the transmitter system that quietens the spinal cord.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep onset and next-day alertness. This entry is the Pure Encapsulations Glycine label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep'], array['glycine', 'amino acid'], 'supplement', 'Pure Encapsulations', 'Capsule',
   'https://dsld.od.nih.gov/label/277695'),
  ('jarrow-formulas-5-htp-100-mg', 'Jarrow Formulas 5-HTP 100 mg', 'other',
   '5-hydroxytryptophan, the step between tryptophan and serotonin, which skips the rate-limiting enzyme.',
   'Store cool and dry.', 'oral',
   'Commonly studied for mood and sleep outcomes. This entry is the Jarrow Formulas 5-HTP 100 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['5-htp', '5-hydroxytryptophan'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307544'),
  ('swanson-5-htp-50-mg', 'Swanson 5-HTP 50 mg', 'other',
   '5-hydroxytryptophan at 50 mg, the lower of the two amounts commonly sold.',
   'Store cool and dry.', 'oral',
   'Commonly studied for mood and sleep outcomes. This entry is the Swanson 5-HTP 50 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['5-htp', '5-hydroxytryptophan'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/308441'),
  ('pure-encapsulations-l-tryptophan', 'Pure Encapsulations L-Tryptophan', 'other',
   'The essential amino acid serotonin and melatonin are both built from, with the B6 that conversion needs.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep latency and mood outcomes. This entry is the Pure Encapsulations L-Tryptophan label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['l-tryptophan', 'tryptophan'], 'supplement', 'Pure Encapsulations', 'Capsule',
   'https://dsld.od.nih.gov/label/294000'),
  ('life-extension-l-tryptophan-500-mg', 'Life Extension L-Tryptophan 500 mg', 'other',
   'The essential amino acid serotonin and melatonin are both built from.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep latency and mood outcomes. This entry is the Life Extension L-Tryptophan 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['l-tryptophan', 'tryptophan'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328524'),
  ('doctors-best-l-tryptophan-500-mg', 'Doctor''s Best L-Tryptophan 500 mg', 'other',
   'L-tryptophan, which competes with other large neutral amino acids for the same transporter into the brain.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep latency and mood outcomes. This entry is the Doctor''s Best L-Tryptophan 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['l-tryptophan', 'tryptophan'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/302685'),
  ('thorne-magnesium-bisglycinate', 'Thorne Magnesium Bisglycinate', 'other',
   'Magnesium bound to glycine — the chelate absorbed without drawing water into the bowel the way citrate and oxide do.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep quality and magnesium repletion. This entry is the Thorne Magnesium Bisglycinate label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Recovery'], array['magnesium', 'magnesium glycinate', 'bisglycinate'], 'supplement', 'Thorne', 'Powder',
   'https://dsld.od.nih.gov/label/298074'),
  ('now-magnesium-malate-caps', 'NOW Magnesium Malate Caps', 'other',
   'Magnesium bound to malic acid, an intermediate in the same energy cycle the mineral is a cofactor for.',
   'Store cool and dry.', 'oral',
   'Commonly studied for magnesium repletion and muscle comfort. This entry is the NOW Magnesium Malate Caps label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Energy'], array['magnesium', 'magnesium malate'], 'supplement', 'NOW', 'Capsule',
   'https://dsld.od.nih.gov/label/313611'),
  ('life-extension-calm-mag', 'Life Extension Calm-Mag', 'other',
   'Magnesium acetyl taurate, a chelate studied for how much of it crosses into the central nervous system.',
   'Store cool and dry.', 'oral',
   'Commonly studied for stress and sleep outcomes. This entry is the Life Extension Calm-Mag label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['magnesium', 'magnesium acetyl taurate'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328306'),
  ('klean-athlete-klean-magnesium', 'Klean Athlete Klean Magnesium', 'other',
   'Magnesium as a chelate — the cofactor for more than three hundred enzymes, including the ones that make ATP.',
   'Store cool and dry.', 'oral',
   'Commonly studied for magnesium repletion and muscle comfort. This entry is the Klean Athlete Klean Magnesium label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Recovery'], array['magnesium'], 'supplement', 'Klean Athlete', 'Capsule',
   'https://dsld.od.nih.gov/label/244040'),
  ('swanson-full-spectrum-lavender-flower-400-mg', 'Swanson Full Spectrum Lavender Flower 400 mg', 'other',
   'Whole lavender flower; the linalool fraction is what the oral preparations are standardised on.',
   'Store cool and dry.', 'oral',
   'Commonly studied for anxiety and sleep quality outcomes. This entry is the Swanson Full Spectrum Lavender Flower 400 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['lavender', 'linalool'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/176109'),
  ('life-extension-optimized-saffron', 'Life Extension Optimized Saffron', 'other',
   'A standardised saffron stigma extract, one of the better-studied botanicals for mood.',
   'Store cool and dry.', 'oral',
   'Commonly studied for mood and appetite outcomes. This entry is the Life Extension Optimized Saffron label as filed with the NIH Dietary Supplement Label Database.',
   array['Mood', 'Sleep'], array['saffron', 'crocus sativus'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328617'),
  ('life-extension-tart-cherry-with-cherrypure', 'Life Extension Tart Cherry with CherryPURE', 'other',
   'Montmorency tart cherry concentrate, one of the few foods carrying measurable melatonin of its own.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep duration and exercise recovery. This entry is the Life Extension Tart Cherry with CherryPURE label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Recovery'], array['tart cherry', 'montmorency', 'cherry'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328723'),
  ('host-defense-reishi-extract', 'Host Defense Reishi Extract', 'other',
   'Ganoderma lucidum mycelium and fruit body extract — the mushroom used traditionally at night rather than in the morning.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for sleep and immune outcomes. This entry is the Host Defense Reishi Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Immune'], array['reishi', 'ganoderma lucidum'], 'supplement', 'Host Defense', 'Liquid',
   'https://dsld.od.nih.gov/label/312608'),
  ('host-defense-sleep', 'Host Defense Sleep', 'other',
   'Passion flower, lion’s mane and reishi with GABA and theanine.',
   'Store cool and dry.', 'oral',
   'Commonly studied for sleep quality. This entry is the Host Defense Sleep label as filed with the NIH Dietary Supplement Label Database.',
   array['Sleep', 'Mood'], array['passion flower', 'reishi', 'lions mane', 'gaba', 'l-theanine'], 'supplement', 'Host Defense', 'Capsule',
   'https://dsld.od.nih.gov/label/335821'),

  -- Energy (30)
  ('doctors-best-nmn-12000-400-mg', 'Doctor''s Best NMN 12000 400 mg', 'other',
   'Beta-nicotinamide mononucleotide, one step from NAD+ — the cofactor every energy-producing reaction in the cell depends on.',
   'Store cool and dry.', 'oral',
   'Commonly studied for NAD+ levels and age-related decline. This entry is the Doctor''s Best NMN 12000 400 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Anti-Aging'], array['nmn', 'nad'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/270688'),
  ('pure-encapsulations-amino-nr', 'Pure Encapsulations Amino-NR', 'other',
   'A full amino acid profile with alpha-lipoic acid and activated B6 and B12.',
   'Store cool and dry.', 'oral',
   'Commonly studied for amino acid status in people eating less protein than they need. This entry is the Pure Encapsulations Amino-NR label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Muscle'], array['amino acids', 'essential amino acids'], 'supplement', 'Pure Encapsulations', 'Capsule',
   'https://dsld.od.nih.gov/label/293887'),
  ('solgar-sublingual-methylcobalamin-b12-5000-mcg', 'Solgar Sublingual Methylcobalamin B12 5000 mcg', 'other',
   'Methylcobalamin, the coenzyme form of B12, dissolved under the tongue rather than swallowed.',
   'Store cool and dry.', 'oral',
   'Commonly studied for B12 status, particularly on plant-based diets. This entry is the Solgar Sublingual Methylcobalamin B12 5000 mcg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['vitamin b12', 'b-12', 'methylcobalamin'], 'supplement', 'Solgar', 'Sublingual',
   'https://dsld.od.nih.gov/label/201474'),
  ('doctors-best-fully-active-b12-1500-mcg', 'Doctor''s Best Fully Active B12 1500 mcg', 'other',
   'Vitamin B12 in a coenzyme form — the one vitamin no plant food reliably supplies.',
   'Store cool and dry.', 'oral',
   'Commonly studied for B12 status and homocysteine. This entry is the Doctor''s Best Fully Active B12 1500 mcg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['vitamin b12', 'b-12', 'cobalamin'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/269679'),
  ('nature-made-vitamin-b-12-500-mcg', 'Nature Made Vitamin B-12 500 mcg', 'other',
   'Vitamin B12, required for red cell formation and for myelin.',
   'Store cool and dry.', 'oral',
   'Commonly studied for B12 status and homocysteine. This entry is the Nature Made Vitamin B-12 500 mcg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['vitamin b12', 'b-12', 'cobalamin'], 'supplement', 'Nature Made', 'Tablet',
   'https://dsld.od.nih.gov/label/302756'),
  ('thorne-basic-b-complex', 'Thorne Basic B Complex', 'other',
   'The eight B vitamins together, several of them in activated coenzyme forms.',
   'Store cool and dry.', 'oral',
   'Commonly studied for B vitamin status and homocysteine. This entry is the Thorne Basic B Complex label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['b complex', 'b vitamins'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/284189'),
  ('doctors-best-fully-active-b-complex', 'Doctor''s Best Fully Active B Complex', 'other',
   'The eight B vitamins with vitamin C, in forms that need no conversion step.',
   'Store cool and dry.', 'oral',
   'Commonly studied for B vitamin status and homocysteine. This entry is the Doctor''s Best Fully Active B Complex label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['b complex', 'b vitamins'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/269680'),
  ('nature-made-super-b-complex', 'Nature Made Super B-Complex', 'other',
   'The eight B vitamins with vitamin C, at well above the reference intake.',
   'Store cool and dry.', 'oral',
   'Commonly studied for B vitamin status and homocysteine. This entry is the Nature Made Super B-Complex label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['b complex', 'b vitamins'], 'supplement', 'Nature Made', 'Tablet',
   'https://dsld.od.nih.gov/label/271526'),
  ('klean-athlete-klean-b-complex', 'Klean Athlete Klean B-Complex', 'other',
   'The eight B vitamins with choline, inositol and benfotiamine, third-party tested for sport.',
   'Store cool and dry.', 'oral',
   'Commonly studied for B vitamin status in people training hard. This entry is the Klean Athlete Klean B-Complex label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['b complex', 'b vitamins'], 'supplement', 'Klean Athlete', 'Capsule',
   'https://dsld.od.nih.gov/label/244203'),
  ('thorne-riboflavin-5-phosphate', 'Thorne Riboflavin 5''-Phosphate', 'other',
   'The activated form of vitamin B2 — the flavin half of the two carriers that move electrons in the mitochondria.',
   'Store cool and dry.', 'oral',
   'Commonly studied for migraine frequency and riboflavin status. This entry is the Thorne Riboflavin 5''-Phosphate label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['riboflavin', 'vitamin b2'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/288632'),
  ('now-b-2-100-mg', 'NOW B-2 100 mg', 'other',
   'Riboflavin at a large multiple of the reference intake, which is the amount the migraine work used.',
   'Store cool and dry.', 'oral',
   'Commonly studied for migraine frequency and riboflavin status. This entry is the NOW B-2 100 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['riboflavin', 'vitamin b2'], 'supplement', 'NOW', 'Capsule',
   'https://dsld.od.nih.gov/label/313570'),
  ('thorne-pantethine', 'Thorne Pantethine', 'other',
   'The disulphide form of pantothenic acid, one step closer to coenzyme A than B5 itself.',
   'Store cool and dry.', 'oral',
   'Commonly studied for lipid outcomes. This entry is the Thorne Pantethine label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['pantethine', 'vitamin b5', 'pantothenic acid'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/291791'),
  ('pure-encapsulations-pantothenic-acid', 'Pure Encapsulations Pantothenic Acid', 'other',
   'Vitamin B5, the backbone of coenzyme A, which carries every acyl group the cell moves.',
   'Store cool and dry.', 'oral',
   'Commonly studied for coenzyme A status and skin outcomes. This entry is the Pure Encapsulations Pantothenic Acid label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['pantothenic acid', 'vitamin b5'], 'supplement', 'Pure Encapsulations', 'Capsule',
   'https://dsld.od.nih.gov/label/278024'),
  ('thorne-acetyl-l-carnitine-500-mg', 'Thorne Acetyl-L-Carnitine 500 mg', 'other',
   'The acetylated form of carnitine, which crosses into the brain where plain carnitine largely does not.',
   'Store cool and dry.', 'oral',
   'Commonly studied for cognitive and fatigue outcomes. This entry is the Thorne Acetyl-L-Carnitine 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Focus'], array['acetyl-l-carnitine', 'alcar', 'carnitine'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/284202'),
  ('jarrow-formulas-l-carnitine-500-mg', 'Jarrow Formulas L-Carnitine 500 mg', 'other',
   'The carrier that moves long-chain fatty acids into the mitochondria to be burned.',
   'Store cool and dry.', 'oral',
   'Commonly studied for exercise recovery and fatigue. This entry is the Jarrow Formulas L-Carnitine 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Muscle'], array['l-carnitine', 'carnitine'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307636'),
  ('life-extension-acetyl-l-carnitine-arginate', 'Life Extension Acetyl-L-Carnitine Arginate', 'other',
   'Acetyl-L-carnitine bound to arginine, a form studied for nerve tissue specifically.',
   'Store cool and dry.', 'oral',
   'Commonly studied for nerve and cognitive outcomes. This entry is the Life Extension Acetyl-L-Carnitine Arginate label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Focus'], array['acetyl-l-carnitine', 'carnitine', 'arginine'], 'supplement', 'Life Extension', 'Capsule',
   'https://dsld.od.nih.gov/label/328274'),
  ('life-extension-d-ribose-powder', 'Life Extension D-Ribose Powder', 'other',
   'The five-carbon sugar in the backbone of ATP, taken to rebuild the cell’s energy pool rather than to spend it.',
   'Store cool and dry.', 'oral',
   'Commonly studied for recovery in heart failure and in fibromyalgia. This entry is the Life Extension D-Ribose Powder label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Recovery'], array['d-ribose', 'ribose'], 'supplement', 'Life Extension', 'Powder',
   'https://dsld.od.nih.gov/label/328437'),
  ('doctors-best-high-absorption-coq10-100-mg', 'Doctor''s Best High Absorption CoQ10 100 mg', 'other',
   'Ubiquinone with piperine — the electron carrier in the mitochondrial chain, and the one statins deplete.',
   'Store cool and dry.', 'oral',
   'Commonly studied for fatigue, statin-associated muscle symptoms and heart failure. This entry is the Doctor''s Best High Absorption CoQ10 100 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Anti-Aging'], array['coq10', 'coenzyme q10', 'ubiquinone'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/302671'),
  ('jarrow-formulas-qh-absorb-200-mg', 'Jarrow Formulas QH-absorb 200 mg', 'other',
   'Ubiquinol, the already-reduced form of CoQ10, which older adults convert less readily.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for fatigue and heart failure outcomes. This entry is the Jarrow Formulas QH-absorb 200 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Anti-Aging'], array['coq10', 'coenzyme q10', 'ubiquinol'], 'supplement', 'Jarrow Formulas', 'Softgel',
   'https://dsld.od.nih.gov/label/307715'),
  ('solgar-megasorb-coq-10-100-mg', 'Solgar Megasorb CoQ-10 100 mg', 'other',
   'Ubiquinone in an oil base, since CoQ10 is fat-soluble and absorbs poorly dry.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for fatigue and heart failure outcomes. This entry is the Solgar Megasorb CoQ-10 100 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Anti-Aging'], array['coq10', 'coenzyme q10', 'ubiquinone'], 'supplement', 'Solgar', 'Softgel',
   'https://dsld.od.nih.gov/label/201089'),
  ('jarrow-formulas-pqq-20-mg', 'Jarrow Formulas PQQ 20 mg', 'other',
   'Pyrroloquinoline quinone, studied for whether it prompts cells to build new mitochondria rather than run the existing ones harder.',
   'Store cool and dry.', 'oral',
   'Commonly studied for mitochondrial biogenesis and sleep quality. This entry is the Jarrow Formulas PQQ 20 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Anti-Aging'], array['pqq', 'pyrroloquinoline quinone'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307710'),
  ('doctors-best-stabilized-r-lipoic-acid-100-mg', 'Doctor''s Best Stabilized R-Lipoic Acid 100 mg', 'other',
   'The R isomer of lipoic acid — the one the body actually makes — stabilised so it survives storage.',
   'Store cool and dry.', 'oral',
   'Commonly studied for insulin sensitivity and neuropathy. This entry is the Doctor''s Best Stabilized R-Lipoic Acid 100 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Anti-Aging'], array['r-lipoic acid', 'alpha lipoic acid', 'lipoic acid'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/202942'),
  ('pure-encapsulations-alpha-lipoic-acid-600-mg', 'Pure Encapsulations Alpha Lipoic Acid 600 mg', 'other',
   'A cofactor for the enzyme complexes feeding the Krebs cycle, and one of the few antioxidants soluble in both water and fat.',
   'Store cool and dry.', 'oral',
   'Commonly studied for insulin sensitivity and neuropathy. This entry is the Pure Encapsulations Alpha Lipoic Acid 600 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Anti-Aging'], array['alpha lipoic acid', 'lipoic acid'], 'supplement', 'Pure Encapsulations', 'Capsule',
   'https://dsld.od.nih.gov/label/293885'),
  ('host-defense-cordyceps', 'Host Defense Cordyceps', 'other',
   'Cordyceps militaris mycelium, the mushroom studied for oxygen use during exercise.',
   'Store cool and dry.', 'oral',
   'Commonly studied for exercise capacity and fatigue. This entry is the Host Defense Cordyceps label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Recovery'], array['cordyceps'], 'supplement', 'Host Defense', 'Capsule',
   'https://dsld.od.nih.gov/label/312383'),
  ('host-defense-chaga-extract', 'Host Defense Chaga Extract', 'other',
   'Inonotus obliquus, a birch-borne fungus that carries betulinic acid over from its host tree.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for antioxidant and immune outcomes. This entry is the Host Defense Chaga Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Immune'], array['chaga', 'inonotus obliquus'], 'supplement', 'Host Defense', 'Liquid',
   'https://dsld.od.nih.gov/label/312381'),
  ('now-maca-500-mg', 'NOW Maca 500 mg', 'other',
   'Lepidium meyenii root, an Andean tuber eaten as a food and studied as an adaptogen at supplement amounts.',
   'Store cool and dry.', 'oral',
   'Commonly studied for energy, mood and libido outcomes. This entry is the NOW Maca 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Mood'], array['maca', 'lepidium meyenii'], 'supplement', 'NOW', 'Capsule',
   'https://dsld.od.nih.gov/label/313572'),
  ('pure-encapsulations-maca-3', 'Pure Encapsulations Maca-3', 'other',
   'Three maca extracts together — the yellow, red and black roots differ in their glucosinolate profile.',
   'Store cool and dry.', 'oral',
   'Commonly studied for energy, mood and libido outcomes. This entry is the Pure Encapsulations Maca-3 label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Mood'], array['maca', 'lepidium meyenii'], 'supplement', 'Pure Encapsulations', 'Capsule',
   'https://dsld.od.nih.gov/label/302462'),
  ('bulksupplements-astragalus-extract', 'BulkSupplements.com Astragalus Extract', 'other',
   'Astragalus membranaceus root, used in Chinese herbal practice as a tonic and studied mostly for immune measures.',
   'Store cool and dry.', 'oral',
   'Commonly studied for immune and fatigue outcomes. This entry is the BulkSupplements.com Astragalus Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Immune'], array['astragalus'], 'supplement', 'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/310661'),
  ('solgar-earth-source-fermented-koji-iron-27-mg', 'Solgar Earth Source Fermented Koji Iron 27 mg', 'other',
   'Iron grown into a koji culture rather than delivered as a salt, which is the usual reason for stomach upset.',
   'Store cool and dry.', 'oral',
   'Commonly studied for iron status and tolerability. This entry is the Solgar Earth Source Fermented Koji Iron 27 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy'], array['iron'], 'supplement', 'Solgar', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/304565'),
  ('klean-athlete-klean-electrolytes', 'Klean Athlete Klean Electrolytes', 'other',
   'Sodium, potassium, chloride, calcium and magnesium in roughly the ratio sweat carries them off in.',
   'Store cool and dry.', 'oral',
   'Commonly studied for hydration and cramp outcomes. This entry is the Klean Athlete Klean Electrolytes label as filed with the NIH Dietary Supplement Label Database.',
   array['Energy', 'Recovery'], array['electrolytes', 'sodium', 'potassium'], 'supplement', 'Klean Athlete', 'Capsule',
   'https://dsld.od.nih.gov/label/237074'),

  -- Focus (32)
  ('jarrow-formulas-alpha-gpc-300-mg', 'Jarrow Formulas Alpha GPC 300 mg', 'cognitive',
   'Alpha-glycerylphosphorylcholine, a phospholipid precursor studied for acetylcholine synthesis.',
   'Store cool and dry.', 'oral',
   'Commonly studied for attention and power output. This entry is the Jarrow Formulas Alpha GPC 300 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['alpha-gpc', 'gpc'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307550'),
  ('life-extension-citicoline-cdp-choline', 'Life Extension Citicoline (CDP-Choline)', 'cognitive',
   'Cytidine diphosphate choline, which supplies both halves of what a neuron needs to build membrane.',
   'Store cool and dry.', 'oral',
   'Commonly studied for attention and memory outcomes. This entry is the Life Extension Citicoline (CDP-Choline) label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['citicoline', 'cdp-choline'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328397'),
  ('jarrow-formulas-citicoline-cdp-choline-250-mg', 'Jarrow Formulas Citicoline CDP Choline 250 mg', 'cognitive',
   'Citicoline at 250 mg, half the amount most of the attention trials used.',
   'Store cool and dry.', 'oral',
   'Commonly studied for attention and memory outcomes. This entry is the Jarrow Formulas Citicoline CDP Choline 250 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['citicoline', 'cdp-choline'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/288780'),
  ('thorne-phosphatidylserine', 'Thorne Phosphatidylserine', 'cognitive',
   'The phospholipid concentrated on the inner face of neuronal membranes, studied for memory and for cortisol response.',
   'Store cool and dry.', 'oral',
   'Commonly studied for memory and cortisol outcomes. This entry is the Thorne Phosphatidylserine label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['phosphatidylserine'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/323123'),
  ('jarrow-formulas-ps100-100-mg', 'Jarrow Formulas PS100 100 mg', 'cognitive',
   'Phosphatidylserine, which makes up a measurable share of neuronal membrane.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for memory and cortisol outcomes. This entry is the Jarrow Formulas PS100 100 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['phosphatidylserine'], 'supplement', 'Jarrow Formulas', 'Softgel',
   'https://dsld.od.nih.gov/label/264981'),
  ('doctors-best-phosphatidyl-serine-with-serinaid-100-mg', 'Doctor''s Best Phosphatidyl Serine with SerinAid 100 mg', 'cognitive',
   'Soy-derived phosphatidylserine at 100 mg, the amount used in most of the memory work.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for memory and cortisol outcomes. This entry is the Doctor''s Best Phosphatidyl Serine with SerinAid 100 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['phosphatidylserine'], 'supplement', 'Doctor''s Best', 'Softgel',
   'https://dsld.od.nih.gov/label/209417'),
  ('now-extra-strength-lecithin', 'NOW Extra Strength Lecithin', 'cognitive',
   'Soy lecithin, a mixture of phospholipids led by phosphatidylcholine.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for lipid and membrane outcomes. This entry is the NOW Extra Strength Lecithin label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['lecithin', 'phospholipids'], 'supplement', 'NOW', 'Softgel',
   'https://dsld.od.nih.gov/label/13590'),
  ('life-extension-huperzine-a-200-mcg', 'Life Extension Huperzine A 200 mcg', 'cognitive',
   'An alkaloid from club moss that inhibits the enzyme breaking acetylcholine down.',
   'Store cool and dry.', 'oral',
   'Commonly studied for memory outcomes, mostly in older adults. This entry is the Life Extension Huperzine A 200 mcg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['huperzine a', 'huperzine'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328475'),
  ('swanson-huperzine-a-200-mcg', 'Swanson Huperzine A 200 mcg', 'cognitive',
   'Huperzine A, a cholinesterase inhibitor from Huperzia serrata, usually cycled rather than taken continuously.',
   'Store cool and dry.', 'oral',
   'Commonly studied for memory outcomes, mostly in older adults. This entry is the Swanson Huperzine A 200 mcg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['huperzine a', 'huperzine'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/308602'),
  ('host-defense-lions-mane', 'Host Defense Lion''s Mane', 'cognitive',
   'Hericium erinaceus, the mushroom studied for nerve growth factor expression.',
   'Store cool and dry.', 'oral',
   'Commonly studied for cognition and nerve growth factor. This entry is the Host Defense Lion''s Mane label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['lions mane', 'hericium erinaceus'], 'supplement', 'Host Defense', 'Capsule',
   'https://dsld.od.nih.gov/label/255174'),
  ('host-defense-lions-mane-extract', 'Host Defense Lion''s Mane Extract', 'cognitive',
   'Lion’s mane mycelium and fruit body as a liquid extract.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for cognition and nerve growth factor. This entry is the Host Defense Lion''s Mane Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['lions mane', 'hericium erinaceus'], 'supplement', 'Host Defense', 'Liquid',
   'https://dsld.od.nih.gov/label/312396'),
  ('host-defense-brain-energy', 'Host Defense Brain Energy', 'cognitive',
   'Lion’s mane with yerba mate and eleuthero — a mushroom, a caffeine source and an adaptogen together.',
   'Store cool and dry.', 'oral',
   'Commonly studied for alertness and cognition. This entry is the Host Defense Brain Energy label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Energy'], array['lions mane', 'yerba mate', 'eleuthero'], 'supplement', 'Host Defense', 'Powder',
   'https://dsld.od.nih.gov/label/312622'),
  ('doctors-best-bacopa-320-mg-with-synapsa', 'Doctor''s Best Bacopa 320 mg with Synapsa', 'cognitive',
   'A standardised Bacopa monnieri extract; the bacosides take weeks rather than hours to show anything.',
   'Store cool and dry.', 'oral',
   'Commonly studied for memory acquisition over eight to twelve weeks. This entry is the Doctor''s Best Bacopa 320 mg with Synapsa label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['bacopa', 'bacopa monnieri', 'brahmi'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/302639'),
  ('doctors-best-extra-strength-ginkgo-120-mg', 'Doctor''s Best Extra Strength Ginkgo 120 mg', 'cognitive',
   'Ginkgo biloba leaf standardised on its flavone glycosides and terpene lactones.',
   'Store cool and dry.', 'oral',
   'Commonly studied for cerebral blood flow and memory outcomes. This entry is the Doctor''s Best Extra Strength Ginkgo 120 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['ginkgo', 'ginkgo biloba'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/202811'),
  ('doctors-best-l-tyrosine-500-mg', 'Doctor''s Best L-Tyrosine 500 mg', 'cognitive',
   'The amino acid dopamine and noradrenaline are built from, studied where stress or sleep loss depletes them.',
   'Store cool and dry.', 'oral',
   'Commonly studied for cognition under stress and sleep deprivation. This entry is the Doctor''s Best L-Tyrosine 500 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['l-tyrosine', 'tyrosine'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/43427'),
  ('thorne-iodine-and-tyrosine', 'Thorne Iodine & Tyrosine', 'cognitive',
   'Iodine with tyrosine — the two halves the thyroid assembles its hormones from.',
   'Store cool and dry.', 'oral',
   'Commonly studied for thyroid hormone synthesis. This entry is the Thorne Iodine & Tyrosine label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Energy'], array['iodine', 'l-tyrosine', 'tyrosine'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/260453'),
  ('bulksupplements-phenylethylamine-hcl-pea', 'BulkSupplements.com Phenylethylamine HCl (PEA)', 'cognitive',
   'A trace amine the brain makes itself; monoamine oxidase clears an oral dose within minutes.',
   'Store cool and dry.', 'oral',
   'Commonly studied for mood, with short-lived effects. This entry is the BulkSupplements.com Phenylethylamine HCl (PEA) label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Mood'], array['phenylethylamine', 'pea'], 'supplement', 'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/294578'),
  ('doctors-best-lithium-aspartate', 'Doctor''s Best Lithium Aspartate', 'cognitive',
   'Lithium at a fraction of a psychiatric dose, studied as a trace element rather than as a medicine.',
   'Store cool and dry.', 'oral',
   'Commonly studied for mood, at doses far below prescription lithium. This entry is the Doctor''s Best Lithium Aspartate label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Mood'], array['lithium', 'lithium aspartate'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/25202'),
  ('life-extension-cognitex-elite', 'Life Extension Cognitex Elite', 'cognitive',
   'Wild blueberry polyphenols with ashwagandha, phosphatidylserine, uridine monophosphate and vinpocetine.',
   'Store cool and dry.', 'oral',
   'Commonly studied for memory and processing speed. This entry is the Life Extension Cognitex Elite label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Anti-Aging'], array['phosphatidylserine', 'uridine', 'vinpocetine', 'blueberry'], 'supplement', 'Life Extension', 'Veg Tablet',
   'https://dsld.od.nih.gov/label/328399'),
  ('life-extension-dopamine-advantage', 'Life Extension Dopamine Advantage', 'cognitive',
   'Phellodendron bark extract with B12, studied for how it acts on dopamine turnover.',
   'Store cool and dry.', 'oral',
   'Commonly studied for dopamine and mood outcomes. This entry is the Life Extension Dopamine Advantage label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Mood'], array['phellodendron', 'dopamine'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328435'),
  ('bulksupplements-mucuna-pruriens-extract', 'BulkSupplements.com Mucuna Pruriens Extract', 'cognitive',
   'Velvet bean, the only common food plant that carries L-dopa directly.',
   'Store cool and dry.', 'oral',
   'Commonly studied for dopamine and motor outcomes. This entry is the BulkSupplements.com Mucuna Pruriens Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Mood'], array['mucuna pruriens', 'velvet bean', 'l-dopa'], 'supplement', 'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/294799'),
  ('doctors-best-vegan-omega-3-2000-mg', 'Doctor''s Best Vegan Omega-3 2000 mg', 'cognitive',
   'EPA and DHA grown in algae — the same two fatty acids fish get by eating it.',
   'Refrigerate. Protect from light.', 'oral',
   'Commonly studied for cognition, mood and triglycerides. This entry is the Doctor''s Best Vegan Omega-3 2000 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Anti-Aging'], array['omega-3', 'epa', 'dha', 'algal oil', 'vegan'], 'supplement', 'Doctor''s Best', 'Softgel',
   'https://dsld.od.nih.gov/label/322517'),
  ('life-extension-mega-epa-dha', 'Life Extension Mega EPA/DHA', 'cognitive',
   'Concentrated fish oil, standardised on the two long-chain omega-3s rather than on total oil.',
   'Refrigerate. Protect from light.', 'oral',
   'Commonly studied for cognition, mood and triglycerides. This entry is the Life Extension Mega EPA/DHA label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Anti-Aging'], array['omega-3', 'epa', 'dha', 'fish oil'], 'supplement', 'Life Extension', 'Softgel',
   'https://dsld.od.nih.gov/label/328568'),
  ('thorne-super-epa-425-mg', 'Thorne Super EPA 425 mg', 'cognitive',
   'A fish oil weighted towards EPA, the omega-3 most of the mood and inflammation work uses.',
   'Refrigerate. Protect from light.', 'oral',
   'Commonly studied for mood and inflammatory markers. This entry is the Thorne Super EPA 425 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Mood'], array['omega-3', 'epa', 'dha', 'fish oil'], 'supplement', 'Thorne', 'Softgel',
   'https://dsld.od.nih.gov/label/313923'),
  ('klean-athlete-klean-omega', 'Klean Athlete Klean Omega', 'cognitive',
   'A marine triglyceride concentrate supplying EPA and DHA, third-party tested for sport.',
   'Refrigerate. Protect from light.', 'oral',
   'Commonly studied for cognition, mood and training recovery. This entry is the Klean Athlete Klean Omega label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Recovery'], array['omega-3', 'epa', 'dha', 'fish oil'], 'supplement', 'Klean Athlete', 'Softgel',
   'https://dsld.od.nih.gov/label/232697'),
  ('klean-athlete-klean-focus', 'Klean Athlete Klean Focus', 'cognitive',
   'Acetyl-L-carnitine and alpha-GPC with alpha-lipoic acid and a fruit polyphenol blend.',
   'Store cool and dry.', 'oral',
   'Commonly studied for attention and cognitive fatigue. This entry is the Klean Athlete Klean Focus label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus'], array['acetyl-l-carnitine', 'alpha-gpc', 'alpha lipoic acid'], 'supplement', 'Klean Athlete', 'Capsule',
   'https://dsld.od.nih.gov/label/237068'),
  ('sports-research-magnesium-l-threonate-2000-mg', 'Sports Research Magnesium L-Threonate 2000 mg', 'cognitive',
   'Magnesium bound to threonic acid, the chelate with the most evidence behind raising magnesium inside the brain.',
   'Store cool and dry.', 'oral',
   'Commonly studied for memory and cognition. This entry is the Sports Research Magnesium L-Threonate 2000 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Sleep'], array['magnesium', 'magnesium threonate', 'magtein'], 'supplement', 'Sports Research', 'Capsule',
   'https://dsld.od.nih.gov/label/334884'),
  ('doctors-best-fisetin-with-novusetin', 'Doctor''s Best Fisetin with Novusetin', 'cognitive',
   'A flavonol found in strawberries, studied for how it clears senescent cells.',
   'Store cool and dry.', 'oral',
   'Commonly studied for senescent cell clearance, largely outside humans so far. This entry is the Doctor''s Best Fisetin with Novusetin label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Anti-Aging'], array['fisetin', 'flavonol'], 'supplement', 'Doctor''s Best', 'Capsule',
   'https://dsld.od.nih.gov/label/81967'),
  ('swanson-fisetin-100-mg', 'Swanson Fisetin 100 mg', 'cognitive',
   'Fisetin at 100 mg, a fraction of the amount the senolytic protocols use.',
   'Store cool and dry.', 'oral',
   'Commonly studied for senescent cell clearance, largely outside humans so far. This entry is the Swanson Fisetin 100 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Anti-Aging'], array['fisetin', 'flavonol'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/265103'),
  ('supersmart-spermidine-3-mg', 'SuperSmart Spermidine 3 mg', 'cognitive',
   'A polyamine found in wheat germ, studied for its effect on autophagy.',
   'Store cool and dry.', 'oral',
   'Commonly studied for autophagy and cognition in older adults. This entry is the SuperSmart Spermidine 3 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Anti-Aging'], array['spermidine', 'polyamine'], 'supplement', 'SuperSmart', 'Capsule',
   'https://dsld.od.nih.gov/label/332497'),
  ('codeage-liposomal-urolithin-a', 'Codeage Liposomal Urolithin A', 'cognitive',
   'A gut metabolite of pomegranate ellagitannins — only some people carry the bacteria that make it — with resveratrol, betaine and CoQ10.',
   'Store cool and dry.', 'oral',
   'Commonly studied for mitophagy and muscle endurance. This entry is the Codeage Liposomal Urolithin A label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Anti-Aging'], array['urolithin a', 'pomegranate'], 'supplement', 'Codeage', 'Capsule',
   'https://dsld.od.nih.gov/label/333435'),
  ('life-extension-senolytic-activator', 'Life Extension Senolytic Activator', 'cognitive',
   'Fisetin, quercetin, theaflavins and apigenin together, taken weekly rather than daily by design.',
   'Store cool and dry.', 'oral',
   'Commonly studied for senescent cell clearance. This entry is the Life Extension Senolytic Activator label as filed with the NIH Dietary Supplement Label Database.',
   array['Focus', 'Anti-Aging'], array['fisetin', 'quercetin', 'apigenin', 'theaflavins'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328654'),

  -- Training (28)
  ('klean-athlete-klean-creatine', 'Klean Athlete Klean Creatine', 'growth',
   'Creatine monohydrate, which buffers the phosphate pool powering the first seconds of a hard effort.',
   'Store cool and dry.', 'oral',
   'Commonly studied for strength, power and lean mass — the most replicated result in sports nutrition. This entry is the Klean Athlete Klean Creatine label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['creatine', 'creatine monohydrate'], 'supplement', 'Klean Athlete', 'Powder',
   'https://dsld.od.nih.gov/label/276540'),
  ('life-extension-creatine-capsules', 'Life Extension Creatine Capsules', 'growth',
   'Creatine monohydrate with vitamin C, in capsules rather than a powder to mix.',
   'Store cool and dry.', 'oral',
   'Commonly studied for strength, power and lean mass. This entry is the Life Extension Creatine Capsules label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['creatine', 'creatine monohydrate'], 'supplement', 'Life Extension', 'Capsule',
   'https://dsld.od.nih.gov/label/328409'),
  ('klean-athlete-klean-essential-aminos-hmb', 'Klean Athlete Klean Essential Aminos + HMB', 'growth',
   'The nine essential amino acids with HMB, a leucine metabolite studied for muscle breakdown rather than synthesis.',
   'Store cool and dry.', 'oral',
   'Commonly studied for muscle protein balance during hard training. This entry is the Klean Athlete Klean Essential Aminos + HMB label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['essential amino acids', 'eaa', 'hmb', 'leucine'], 'supplement', 'Klean Athlete', 'Powder',
   'https://dsld.od.nih.gov/label/237098'),
  ('bulksupplements-l-leucine', 'BulkSupplements.com L-Leucine', 'growth',
   'The one amino acid that signals the mTOR pathway to start building protein.',
   'Store cool and dry.', 'oral',
   'Commonly studied for muscle protein synthesis. This entry is the BulkSupplements.com L-Leucine label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle'], array['leucine', 'bcaa', 'amino acid'], 'supplement', 'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/294896'),
  ('klean-athlete-klean-bcaa-peak-atp', 'Klean Athlete Klean BCAA + Peak ATP', 'growth',
   'The three branched-chain amino acids with an oral ATP ingredient.',
   'Store cool and dry.', 'oral',
   'Commonly studied for training fatigue and blood flow. This entry is the Klean Athlete Klean BCAA + Peak ATP label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['bcaa', 'leucine', 'isoleucine', 'valine'], 'supplement', 'Klean Athlete', 'Powder',
   'https://dsld.od.nih.gov/label/293246'),
  ('thorne-amino-complex-lemon', 'Thorne Amino Complex Lemon', 'growth',
   'A full essential amino acid profile weighted towards leucine.',
   'Store cool and dry.', 'oral',
   'Commonly studied for lean mass and training recovery. This entry is the Thorne Amino Complex Lemon label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['essential amino acids', 'eaa', 'amino acids'], 'supplement', 'Thorne', 'Powder',
   'https://dsld.od.nih.gov/label/323098'),
  ('klean-athlete-klean-isolate-chocolate', 'Klean Athlete Klean Isolate Chocolate', 'growth',
   'Whey protein isolate — the fast-digesting dairy fraction with most of the lactose filtered out.',
   'Store cool and dry.', 'oral',
   'Commonly studied for lean mass gain alongside resistance training. This entry is the Klean Athlete Klean Isolate Chocolate label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['whey protein', 'whey isolate', 'protein', 'dairy'], 'supplement', 'Klean Athlete', 'Powder',
   'https://dsld.od.nih.gov/label/243801'),
  ('klean-athlete-klean-casein-vanilla-custard', 'Klean Athlete Klean Casein Vanilla Custard', 'growth',
   'Casein, the slow-digesting dairy protein that releases amino acids over hours rather than minutes.',
   'Store cool and dry.', 'oral',
   'Commonly studied for overnight muscle protein balance. This entry is the Klean Athlete Klean Casein Vanilla Custard label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['casein', 'protein', 'dairy'], 'supplement', 'Klean Athlete', 'Powder',
   'https://dsld.od.nih.gov/label/293258'),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'Klean Athlete Klean Plant-Based Protein Vanilla', 'growth',
   'A plant protein blend with an added protease, formulated to close the leucine gap plant proteins have.',
   'Store cool and dry.', 'oral',
   'Commonly studied for lean mass gain on a plant-based diet. This entry is the Klean Athlete Klean Plant-Based Protein Vanilla label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['plant protein', 'protein'], 'supplement', 'Klean Athlete', 'Powder',
   'https://dsld.od.nih.gov/label/293425'),
  ('bulksupplements-rice-protein', 'BulkSupplements.com Rice Protein', 'growth',
   'Brown rice protein — low in lysine like most cereal proteins, and usually paired with a legume one.',
   'Store cool and dry.', 'oral',
   'Commonly studied for lean mass gain on a plant-based diet. This entry is the BulkSupplements.com Rice Protein label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle'], array['rice protein', 'plant protein', 'protein'], 'supplement', 'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/294543'),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'Sports Research Whey Protein Isolate Dutch Chocolate', 'growth',
   'Whey protein isolate, filtered to raise the protein fraction and drop the lactose and fat.',
   'Store cool and dry.', 'oral',
   'Commonly studied for lean mass gain alongside resistance training. This entry is the Sports Research Whey Protein Isolate Dutch Chocolate label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['whey protein', 'whey isolate', 'protein', 'dairy'], 'supplement', 'Sports Research', 'Powder',
   'https://dsld.od.nih.gov/label/268690'),
  ('klean-athlete-klean-glutamine', 'Klean Athlete Klean Glutamine', 'growth',
   'The most abundant free amino acid in muscle, and the main fuel of the cells lining the gut.',
   'Store cool and dry.', 'oral',
   'Commonly studied for gut barrier and recovery outcomes. This entry is the Klean Athlete Klean Glutamine label as filed with the NIH Dietary Supplement Label Database.',
   array['Recovery', 'Gut Health'], array['glutamine', 'l-glutamine'], 'supplement', 'Klean Athlete', 'Powder',
   'https://dsld.od.nih.gov/label/321195'),
  ('thorne-beta-alanine-sr', 'Thorne Beta Alanine-SR', 'growth',
   'Beta-alanine in a sustained-release tablet, which limits the tingling a single dose causes.',
   'Store cool and dry.', 'oral',
   'Commonly studied for carnosine loading and high-intensity endurance. This entry is the Thorne Beta Alanine-SR label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['beta-alanine', 'carnosine'], 'supplement', 'Thorne', 'Tablet',
   'https://dsld.od.nih.gov/label/291773'),
  ('klean-athlete-klean-sr-beta-alanine', 'Klean Athlete Klean SR Beta-Alanine', 'growth',
   'Sustained-release beta-alanine, third-party tested for sport.',
   'Store cool and dry.', 'oral',
   'Commonly studied for carnosine loading and high-intensity endurance. This entry is the Klean Athlete Klean SR Beta-Alanine label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['beta-alanine', 'carnosine'], 'supplement', 'Klean Athlete', 'Tablet',
   'https://dsld.od.nih.gov/label/237076'),
  ('doctors-best-l-citrulline-powder', 'Doctor''s Best L-Citrulline Powder', 'growth',
   'Citrulline, which raises blood arginine more reliably than arginine taken directly.',
   'Store cool and dry.', 'oral',
   'Commonly studied for blood flow and training volume. This entry is the Doctor''s Best L-Citrulline Powder label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle'], array['citrulline', 'l-citrulline'], 'supplement', 'Doctor''s Best', 'Powder',
   'https://dsld.od.nih.gov/label/302684'),
  ('thorne-l-arginine-plus', 'Thorne L-Arginine Plus', 'growth',
   'L-arginine with folate, green tea catechins and resveratrol.',
   'Store cool and dry.', 'oral',
   'Commonly studied for nitric oxide and vascular outcomes. This entry is the Thorne L-Arginine Plus label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle'], array['arginine', 'l-arginine'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/336346'),
  ('doctors-best-pure-l-arginine-powder', 'Doctor''s Best Pure L-Arginine Powder', 'growth',
   'L-arginine hydrochloride, the substrate nitric oxide synthase works on.',
   'Store cool and dry.', 'oral',
   'Commonly studied for nitric oxide and vascular outcomes. This entry is the Doctor''s Best Pure L-Arginine Powder label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle'], array['arginine', 'l-arginine'], 'supplement', 'Doctor''s Best', 'Powder',
   'https://dsld.od.nih.gov/label/203218'),
  ('life-extension-l-arginine-caps-700-mg', 'Life Extension L-Arginine Caps 700 mg', 'growth',
   'L-arginine with vitamin C, in capsules rather than a powder to weigh.',
   'Store cool and dry.', 'oral',
   'Commonly studied for nitric oxide and vascular outcomes. This entry is the Life Extension L-Arginine Caps 700 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle'], array['arginine', 'l-arginine'], 'supplement', 'Life Extension', 'Capsule',
   'https://dsld.od.nih.gov/label/328509'),
  ('life-extension-bio-collagen-with-patented-uc-ii-40-mg', 'Life Extension Bio-Collagen with Patented UC-II 40 mg', 'healing',
   'Undenatured type II collagen, taken in milligrams rather than grams because it works through oral tolerance rather than as a building block.',
   'Store cool and dry.', 'oral',
   'Commonly studied for joint comfort and range of motion. This entry is the Life Extension Bio-Collagen with Patented UC-II 40 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Injury', 'Recovery'], array['collagen', 'uc-ii', 'type ii collagen'], 'supplement', 'Life Extension', 'Capsule',
   'https://dsld.od.nih.gov/label/182041'),
  ('thorne-joint-support-nutrients', 'Thorne Joint Support Nutrients', 'healing',
   'MSM and glucosamine sulfate with boswellia, curcumin and bromelain.',
   'Store cool and dry.', 'oral',
   'Commonly studied for joint comfort. This entry is the Thorne Joint Support Nutrients label as filed with the NIH Dietary Supplement Label Database.',
   array['Injury', 'Recovery'], array['glucosamine', 'msm', 'boswellia', 'curcumin'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/284229'),
  ('thorne-boswellia-phytosome', 'Thorne Boswellia Phytosome', 'healing',
   'Boswellia serrata bound to phospholipid, which raises how much of the boswellic acid is absorbed.',
   'Store cool and dry.', 'oral',
   'Commonly studied for joint comfort and inflammatory markers. This entry is the Thorne Boswellia Phytosome label as filed with the NIH Dietary Supplement Label Database.',
   array['Injury', 'Recovery'], array['boswellia', 'indian frankincense', 'boswellic acid'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/284197'),
  ('swanson-boswellia-serrata-extract-125-mg', 'Swanson Boswellia serrata Extract 125 mg', 'healing',
   'A boswellia extract standardised on AKBA, the most active of the boswellic acids.',
   'Store cool and dry.', 'oral',
   'Commonly studied for joint comfort and inflammatory markers. This entry is the Swanson Boswellia serrata Extract 125 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Injury', 'Recovery'], array['boswellia', 'indian frankincense'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/308483'),
  ('now-boswellia-extract-plus-turmeric-root', 'NOW Boswellia Extract Plus Turmeric Root', 'healing',
   'Boswellia with turmeric root — two resins studied for the same inflammatory pathways.',
   'Store cool and dry.', 'oral',
   'Commonly studied for joint comfort and inflammatory markers. This entry is the NOW Boswellia Extract Plus Turmeric Root label as filed with the NIH Dietary Supplement Label Database.',
   array['Injury', 'Recovery'], array['boswellia', 'turmeric', 'curcumin'], 'supplement', 'NOW', 'Capsule',
   'https://dsld.od.nih.gov/label/13380'),
  ('thorne-curcumin-phytosome-1000-mg', 'Thorne Curcumin Phytosome 1000 mg', 'healing',
   'Curcumin bound to phospholipid, since plain curcumin is absorbed at a few percent.',
   'Store cool and dry.', 'oral',
   'Commonly studied for joint comfort and inflammatory markers. This entry is the Thorne Curcumin Phytosome 1000 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Injury', 'Recovery'], array['curcumin', 'turmeric', 'meriva'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/328826'),
  ('sports-research-turmeric-curcumin-c3-complex', 'Sports Research Turmeric Curcumin C3 Complex', 'healing',
   'A standardised curcuminoid extract with piperine, which slows how fast curcumin is cleared.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for joint comfort and inflammatory markers. This entry is the Sports Research Turmeric Curcumin C3 Complex label as filed with the NIH Dietary Supplement Label Database.',
   array['Injury', 'Recovery'], array['curcumin', 'turmeric'], 'supplement', 'Sports Research', 'Softgel',
   'https://dsld.od.nih.gov/label/317006'),
  ('klean-athlete-klean-endurance', 'Klean Athlete Klean Endurance', 'other',
   'D-ribose, the sugar in the ATP backbone, taken to refill the pool rather than to fuel the effort.',
   'Store cool and dry.', 'oral',
   'Commonly studied for recovery of the cellular energy pool after hard work. This entry is the Klean Athlete Klean Endurance label as filed with the NIH Dietary Supplement Label Database.',
   array['Recovery', 'Energy'], array['d-ribose', 'ribose'], 'supplement', 'Klean Athlete', 'Tablet',
   'https://dsld.od.nih.gov/label/243997'),
  ('now-tribulus-1000-mg', 'NOW Tribulus 1000 mg', 'growth',
   'Tribulus terrestris standardised on saponins; the human testosterone data does not support the reputation.',
   'Store cool and dry.', 'oral',
   'Commonly studied for testosterone and libido, with mostly null human results. This entry is the NOW Tribulus 1000 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle'], array['tribulus', 'tribulus terrestris'], 'supplement', 'NOW', 'Tablet',
   'https://dsld.od.nih.gov/label/28476'),
  ('klean-athlete-klean-multivitamin', 'Klean Athlete Klean Multivitamin', 'other',
   'A broad multivitamin and mineral formulated for athletes and third-party tested for sport.',
   'Store cool and dry.', 'oral',
   'Commonly studied for micronutrient gaps in people training hard. This entry is the Klean Athlete Klean Multivitamin label as filed with the NIH Dietary Supplement Label Database.',
   array['Muscle', 'Recovery'], array['multivitamin'], 'supplement', 'Klean Athlete', 'Tablet',
   'https://dsld.od.nih.gov/label/276544'),

  -- Immunity & gut (28)
  ('jarrow-formulas-colostrum-prime-life-400-mg', 'Jarrow Formulas Colostrum Prime Life 400 mg', 'other',
   'Bovine colostrum — the first milk, carrying immunoglobulins and growth factors.',
   'Store cool and dry.', 'oral',
   'Commonly studied for gut barrier and upper respiratory infection rates. This entry is the Jarrow Formulas Colostrum Prime Life 400 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune', 'Gut Health'], array['colostrum', 'immunoglobulins', 'dairy'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307574'),
  ('jarrow-formulas-lactoferrin-250-mg', 'Jarrow Formulas Lactoferrin 250 mg', 'other',
   'An iron-binding protein from milk, which works partly by starving bacteria of the iron they need.',
   'Store cool and dry.', 'oral',
   'Commonly studied for immune outcomes and iron status. This entry is the Jarrow Formulas Lactoferrin 250 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune', 'Gut Health'], array['lactoferrin', 'dairy'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/321954'),
  ('life-extension-lactoferrin-caps', 'Life Extension Lactoferrin Caps', 'other',
   'Lactoferrin from whey, one of the proteins that makes milk hostile to the bacteria in it.',
   'Store cool and dry.', 'oral',
   'Commonly studied for immune outcomes and iron status. This entry is the Life Extension Lactoferrin Caps label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune', 'Gut Health'], array['lactoferrin', 'dairy'], 'supplement', 'Life Extension', 'Capsule',
   'https://dsld.od.nih.gov/label/231972'),
  ('jarrow-formulas-beta-glucan-250-mg', 'Jarrow Formulas Beta Glucan 250 mg', 'other',
   'Beta-1,3/1,6-glucan from baker’s yeast — the cell wall fragment innate immune receptors recognise.',
   'Store cool and dry.', 'oral',
   'Commonly studied for innate immune response and infection rates. This entry is the Jarrow Formulas Beta Glucan 250 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['beta glucan', 'beta-glucan', 'yeast'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307558'),
  ('solgar-echinacea-herb-extract', 'Solgar Echinacea Herb Extract', 'other',
   'Echinacea aerial parts, standardised; species and plant part differ between products more than the labels suggest.',
   'Store cool and dry.', 'oral',
   'Commonly studied for cold duration and incidence. This entry is the Solgar Echinacea Herb Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['echinacea'], 'supplement', 'Solgar', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/216682'),
  ('life-extension-echinacea-elite', 'Life Extension Echinacea Elite', 'other',
   'Echinacea purpurea aerial parts with E. angustifolia root — the two species used together.',
   'Store cool and dry.', 'oral',
   'Commonly studied for cold duration and incidence. This entry is the Life Extension Echinacea Elite label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['echinacea'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328440'),
  ('life-extension-advanced-olive-leaf-vascular-support', 'Life Extension Advanced Olive Leaf Vascular Support', 'other',
   'Olive leaf standardised on oleuropein, with a second olive fruit extract.',
   'Store cool and dry.', 'oral',
   'Commonly studied for blood pressure and antioxidant outcomes. This entry is the Life Extension Advanced Olive Leaf Vascular Support label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune', 'Anti-Aging'], array['olive leaf', 'oleuropein'], 'supplement', 'Life Extension', 'Veg Capsule',
   'https://dsld.od.nih.gov/label/328278'),
  ('bulksupplements-olive-leaf-extract', 'BulkSupplements.com Olive Leaf Extract', 'other',
   'Olive leaf, whose oleuropein is the compound most of the antimicrobial work is on.',
   'Store cool and dry.', 'oral',
   'Commonly studied for antimicrobial and blood pressure outcomes. This entry is the BulkSupplements.com Olive Leaf Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['olive leaf', 'oleuropein'], 'supplement', 'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/294586'),
  ('swanson-oregano-oil-liquid-extract', 'Swanson Oregano Oil Liquid Extract', 'other',
   'Oregano essential oil, carrying the carvacrol and thymol that make it antimicrobial in a dish as well as in a capsule.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for antimicrobial activity, mostly in vitro. This entry is the Swanson Oregano Oil Liquid Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune', 'Gut Health'], array['oregano oil', 'carvacrol', 'thymol'], 'supplement', 'Swanson', 'Liquid',
   'https://dsld.od.nih.gov/label/308459'),
  ('host-defense-turkey-tail', 'Host Defense Turkey Tail', 'other',
   'Trametes versicolor, the mushroom whose polysaccharide fraction is a licensed adjuvant in Japan.',
   'Store cool and dry.', 'oral',
   'Commonly studied for immune markers alongside cancer treatment. This entry is the Host Defense Turkey Tail label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['turkey tail', 'trametes versicolor', 'coriolus'], 'supplement', 'Host Defense', 'Capsule',
   'https://dsld.od.nih.gov/label/255175'),
  ('host-defense-maitake-extract', 'Host Defense Maitake Extract', 'other',
   'Grifola frondosa mycelium and fruit body, studied for its beta-glucan fraction.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for immune markers. This entry is the Host Defense Maitake Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['maitake', 'grifola frondosa'], 'supplement', 'Host Defense', 'Liquid',
   'https://dsld.od.nih.gov/label/74123'),
  ('host-defense-shiitake-extract', 'Host Defense Shiitake Extract', 'other',
   'Lentinula edodes — the culinary mushroom whose lentinan fraction is the studied one.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for immune markers. This entry is the Host Defense Shiitake Extract label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['shiitake', 'lentinula edodes', 'lentinan'], 'supplement', 'Host Defense', 'Liquid',
   'https://dsld.od.nih.gov/label/200108'),
  ('host-defense-mycommunity', 'Host Defense MyCommunity', 'other',
   'Seventeen mushroom species together, the broadest blend in the range.',
   'Store cool and dry.', 'oral',
   'Commonly studied for immune markers. This entry is the Host Defense MyCommunity label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['mushroom blend', 'reishi', 'maitake', 'chaga', 'turkey tail'], 'supplement', 'Host Defense', 'Capsule',
   'https://dsld.od.nih.gov/label/312600'),
  ('host-defense-stamets-7-extracts', 'Host Defense Stamets 7 Extracts', 'other',
   'Seven mushroom mycelium and fruit body extracts in a liquid.',
   'Store cool and dry. Protect from light.', 'oral',
   'Commonly studied for immune markers. This entry is the Host Defense Stamets 7 Extracts label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune', 'Energy'], array['mushroom blend', 'reishi', 'maitake', 'cordyceps', 'chaga'], 'supplement', 'Host Defense', 'Liquid',
   'https://dsld.od.nih.gov/label/312613'),
  ('solgar-flavo-zinc-lozenge', 'Solgar Flavo-Zinc Lozenge', 'other',
   'Zinc as a lozenge — the form the cold-duration work used, because it acts in the throat rather than after absorption.',
   'Store cool and dry.', 'oral',
   'Commonly studied for cold duration when started within a day of onset. This entry is the Solgar Flavo-Zinc Lozenge label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['zinc'], 'supplement', 'Solgar', 'Lozenge',
   'https://dsld.od.nih.gov/label/240993'),
  ('klean-athlete-klean-zinc', 'Klean Athlete Klean Zinc', 'other',
   'Zinc as a chelate, third-party tested for sport.',
   'Store cool and dry.', 'oral',
   'Commonly studied for immune function and zinc status. This entry is the Klean Athlete Klean Zinc label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['zinc'], 'supplement', 'Klean Athlete', 'Tablet',
   'https://dsld.od.nih.gov/label/249882'),
  ('bulksupplements-bee-propolis-powder', 'BulkSupplements.com Bee Propolis Powder', 'other',
   'The resin bees seal a hive with, carrying flavonoids and caffeic acid esters.',
   'Store cool and dry.', 'oral',
   'Commonly studied for antimicrobial and oral health outcomes. This entry is the BulkSupplements.com Bee Propolis Powder label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['propolis', 'bee propolis'], 'supplement', 'BulkSupplements.com', 'Powder',
   'https://dsld.od.nih.gov/label/310672'),
  ('pure-encapsulations-cats-claw', 'Pure Encapsulations Cat''s Claw', 'other',
   'Uncaria tomentosa bark, used in Amazonian practice and studied mostly for immune measures.',
   'Store cool and dry.', 'oral',
   'Commonly studied for immune markers and joint comfort. This entry is the Pure Encapsulations Cat''s Claw label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['cats claw', 'uncaria tomentosa'], 'supplement', 'Pure Encapsulations', 'Capsule',
   'https://dsld.od.nih.gov/label/293929'),
  ('swanson-chinese-skullcap-400-mg', 'Swanson Chinese Skullcap 400 mg', 'other',
   'Scutellaria baicalensis root, whose baicalin is the flavone most of the work is on.',
   'Store cool and dry.', 'oral',
   'Commonly studied for inflammatory and antiviral markers. This entry is the Swanson Chinese Skullcap 400 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Immune'], array['chinese skullcap', 'scutellaria baicalensis', 'baicalin'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/308550'),
  ('jarrow-formulas-saccharomyces-boulardii-mos', 'Jarrow Formulas Saccharomyces boulardii + MOS', 'other',
   'A probiotic yeast rather than a bacterium, so a course of antibiotics does not touch it.',
   'Store cool and dry.', 'oral',
   'Commonly studied for antibiotic-associated and travellers diarrhoea. This entry is the Jarrow Formulas Saccharomyces boulardii + MOS label as filed with the NIH Dietary Supplement Label Database.',
   array['Gut Health'], array['saccharomyces boulardii', 'probiotic', 'yeast'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307728'),
  ('swanson-lactobacillus-rhamnosus-with-fos', 'Swanson Lactobacillus rhamnosus with FOS', 'other',
   'A single Lactobacillus rhamnosus strain with a prebiotic fibre to feed it.',
   'Refrigerate. Check the label — many strains require it.', 'oral',
   'Commonly studied for gut and immune outcomes, which are strain-specific. This entry is the Swanson Lactobacillus rhamnosus with FOS label as filed with the NIH Dietary Supplement Label Database.',
   array['Gut Health'], array['probiotic', 'lactobacillus rhamnosus', 'fos'], 'supplement', 'Swanson', 'Capsule',
   'https://dsld.od.nih.gov/label/308638'),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'Jarrow Formulas Jarro-Dophilus EPS 25 Billion', 'other',
   'Eight named strains in a coated capsule, so they pass the stomach rather than dying in it.',
   'Refrigerate. Check the label — many strains require it.', 'oral',
   'Commonly studied for gut outcomes, which are strain-specific. This entry is the Jarrow Formulas Jarro-Dophilus EPS 25 Billion label as filed with the NIH Dietary Supplement Label Database.',
   array['Gut Health'], array['probiotic', 'lactobacillus', 'bifidobacterium'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307632'),
  ('pure-encapsulations-probiotic-50b', 'Pure Encapsulations Probiotic 50B', 'other',
   'Five strains at 50 billion CFU, in the range most of the clinical work uses.',
   'Refrigerate. Check the label — many strains require it.', 'oral',
   'Commonly studied for gut outcomes, which are strain-specific. This entry is the Pure Encapsulations Probiotic 50B label as filed with the NIH Dietary Supplement Label Database.',
   array['Gut Health'], array['probiotic', 'lactobacillus', 'bifidobacterium'], 'supplement', 'Pure Encapsulations', 'Capsule',
   'https://dsld.od.nih.gov/label/294040'),
  ('thorne-florasport-20b', 'Thorne FloraSport 20B', 'other',
   'Four strains including a spore-forming Bacillus, shelf-stable and tested for sport.',
   'Store cool and dry.', 'oral',
   'Commonly studied for gut outcomes in athletes. This entry is the Thorne FloraSport 20B label as filed with the NIH Dietary Supplement Label Database.',
   array['Gut Health', 'Immune'], array['probiotic', 'bacillus subtilis', 'lactobacillus'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/298031'),
  ('jarrow-formulas-prebiotic-inulin-fos', 'Jarrow Formulas Prebiotic Inulin-FOS', 'other',
   'Inulin and fructo-oligosaccharides — the fibres gut bacteria ferment into short-chain fatty acids.',
   'Store cool and dry.', 'oral',
   'Commonly studied for bifidobacteria counts and short-chain fatty acid production. This entry is the Jarrow Formulas Prebiotic Inulin-FOS label as filed with the NIH Dietary Supplement Label Database.',
   array['Gut Health'], array['inulin', 'fos', 'prebiotic', 'fibre'], 'supplement', 'Jarrow Formulas', 'Powder',
   'https://dsld.od.nih.gov/label/307711'),
  ('swanson-inulin', 'Swanson Inulin', 'other',
   'Chicory root inulin, a fermentable fibre — which is also why it causes wind to begin with.',
   'Store cool and dry.', 'oral',
   'Commonly studied for bifidobacteria counts and bowel regularity. This entry is the Swanson Inulin label as filed with the NIH Dietary Supplement Label Database.',
   array['Gut Health'], array['inulin', 'prebiotic', 'fibre', 'chicory'], 'supplement', 'Swanson', 'Powder',
   'https://dsld.od.nih.gov/label/308631'),
  ('thorne-gi-relief', 'Thorne GI Relief', 'other',
   'Deglycyrrhizinated licorice with marshmallow root, slippery elm and aloe — demulcents that coat rather than act systemically.',
   'Store cool and dry.', 'oral',
   'Commonly studied for gastric comfort. This entry is the Thorne GI Relief label as filed with the NIH Dietary Supplement Label Database.',
   array['Gut Health'], array['dgl', 'licorice', 'slippery elm', 'marshmallow root', 'aloe'], 'supplement', 'Thorne', 'Capsule',
   'https://dsld.od.nih.gov/label/337861'),
  ('jarrow-formulas-mastic-gum-1000-mg', 'Jarrow Formulas Mastic Gum 1000 mg', 'other',
   'Resin from the Chios mastic tree, studied specifically against Helicobacter pylori.',
   'Store cool and dry.', 'oral',
   'Commonly studied for H. pylori eradication and dyspepsia. This entry is the Jarrow Formulas Mastic Gum 1000 mg label as filed with the NIH Dietary Supplement Label Database.',
   array['Gut Health'], array['mastic gum', 'pistacia lentiscus'], 'supplement', 'Jarrow Formulas', 'Capsule',
   'https://dsld.od.nih.gov/label/307649')
on conflict (slug) do update set
  name = excluded.name, category = excluded.category,
  mechanism_summary = excluded.mechanism_summary,
  storage_notes = excluded.storage_notes, route = excluded.route,
  research_summary = excluded.research_summary, goal_tags = excluded.goal_tags,
  search_keywords = excluded.search_keywords, kind = excluded.kind,
  brand = excluded.brand, product_form = excluded.product_form,
  label_url = excluded.label_url;

-- The count this migration is supposed to produce, checked rather than assumed.
-- Re-running is a no-op update, so the number holds on a second apply. It only
-- fails if an earlier migration in the chain has not run, which is the one case
-- worth stopping for: a partial catalogue is invisible in the app and reads as
-- products that were never chosen rather than products that went missing.
do $$
declare
  supplements integer;
  labelled integer;
begin
  select count(*) into supplements from public.glossary where kind = 'supplement';
  if supplements <> 250 then
    raise exception
      'expected 250 supplements after this migration, found % — apply 0016, 0017 and 0020 first',
      supplements;
  end if;

  select count(*) into labelled
  from public.glossary
  where kind = 'supplement' and label_url like 'https://dsld.od.nih.gov/label/%';

  raise notice 'catalogue: % supplements, % carrying a DSLD label', supplements, labelled;
end $$;

-- ═══════════ 0022_papers_part_one ═══════════
-- Papers, part one: the Skin & hair, Sleep and Energy products.
--
-- 440 `glossary_research` rows across the 88 products migration 0021
-- inserts for those three sections, drawn from 56 ingredient groups and
-- 278 distinct PubMed records.
--
-- WHERE THESE CAME FROM. `scripts/fetch_papers.py` queries the PubMed
-- E-utilities API — `esearch` for PMIDs, `esummary` for title, journal, year
-- and publication type — and writes `scripts/papers.json`. Every title,
-- journal and year below is copied from that file verbatim. Nothing here was
-- written from memory and nothing was adjusted to read better; where a title
-- is odd (`Cosmetic benefits of astaxanthin on humans subjects`) that is what
-- the record says. Re-run the script to regenerate this file.
--
-- SEARCHED ON THE INGREDIENT, NOT THE BRAND, as the spec requires: the 88
-- products reduce to 56 active ingredients, so the four melatonin products
-- share one set of melatonin papers rather than each getting its own search for
-- a brand name that returns nothing.
--
-- VERIFIED. `python scripts/fetch_papers.py --verify` re-fetches all
-- 278 distinct PMIDs through `esummary` and checks three things: the
-- record still exists, its title still matches the one stored here, and it
-- carries no retraction publication type. All pass. It also probes two
-- non-existent PMIDs and requires the API to reject them, so a check that has
-- silently stopped working cannot pass by accident.
--
-- The URL form is `https://pubmed.ncbi.nlm.nih.gov/<pmid>/`, per the spec. Note
-- for whoever applies this: an HTTP GET on those pages could NOT be used as the
-- check from the machine this ran on. pubmed.ncbi.nlm.nih.gov answers every
-- request from here with a JS cookie-challenge page and HTTP 203 — identically
-- for a real PMID and an invented one — so the status code proves nothing. The
-- API round-trip above is the stronger check anyway, since it also compares the
-- title, but a plain link-check from an ordinary network is worth doing once.
--
-- HOW A PAPER WAS REJECTED. Relevance was the hard part, not volume. Three
-- filters, all in the script: the title must name the ingredient; topical,
-- textile and animal work is dropped because every product here is swallowed;
-- and a hand-written block list carries the ones only reading catches, each
-- with its reason. The two failure modes worth knowing about, because both
-- nearly shipped: a paper about a different compound that contains the
-- ingredient's name (glycine propionyl-L-carnitine is not glycine, Glycine max
-- is a soybean, gabapentin is not GABA, S-adenosylmethionine is not
-- methionine), and a paper about the right compound by the wrong route
-- (rosemary oil rubbed on the scalp is not a capsule).
--
-- Every one of the 88 products carries five papers.
--
-- INGREDIENTS WHERE THE LITERATURE ITSELF RAN OUT before five, listed
-- because the spec asks for it even though no product ends up short:
--   casein-decapeptide — 4
--   The one case is a combination product, so it fills its remaining
--   slots from the other ingredient on its label rather than from
--   padding. What was rejected to get here is in the script's block
--   list: the searches keep returning lab characterisation of casein
--   peptides, and one trial that gave the peptide to foals.
--
-- IDEMPOTENT. Guarded on (glossary_id, url), so re-running inserts nothing and
-- a partially-applied run completes cleanly.
--
-- NOT APPLIED. Written to disk only, per the standing rule.

insert into public.glossary_research (glossary_id, title, meta, url)
select g.id, v.title, v.meta, v.url
from (values
  -- ============================================================ Skin & hair
  -- sports-research-marine-collagen-unflavored
  ('sports-research-marine-collagen-unflavored', 'Oral supplementation of specific collagen peptides has beneficial effects on human skin physiology: a double-blind, placebo-controlled study', 'Randomised controlled trial (Skin Pharmacol Physiol, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/23949208/'),
  ('sports-research-marine-collagen-unflavored', 'Oral Intake of Low-Molecular-Weight Collagen Peptide Improves Hydration, Elasticity, and Wrinkling in Human Skin: A Randomized, Double-Blind, Placebo-Controlled Study', 'Randomised controlled trial (Nutrients, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29949889/'),
  ('sports-research-marine-collagen-unflavored', 'Low-molecular-weight collagen peptides supplement promotes a healthy skin: A randomized, double-blinded, placebo-controlled study', 'Randomised controlled trial (J Cosmet Dermatol, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/37822045/'),
  ('sports-research-marine-collagen-unflavored', 'Skin Anti-Aging and Moisturizing Effects of Low-Molecular-Weight Collagen Peptide Supplementation in Healthy Adults: A Randomized, Double-Blind, Placebo-Controlled Clinical Trial', 'Randomised controlled trial (J Microbiol Biotechnol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40935395/'),
  ('sports-research-marine-collagen-unflavored', 'Influence of collagen peptide supplementation on visible signs of skin and nail health and -aging in an East Asian population: A double blind, randomized, placebo-controlled trial', 'Randomised controlled trial (J Cosmet Dermatol, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39143887/'),
  -- sports-research-hydrolyzed-collagen-peptides-vanilla
  ('sports-research-hydrolyzed-collagen-peptides-vanilla', 'Oral supplementation of specific collagen peptides has beneficial effects on human skin physiology: a double-blind, placebo-controlled study', 'Randomised controlled trial (Skin Pharmacol Physiol, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/23949208/'),
  ('sports-research-hydrolyzed-collagen-peptides-vanilla', 'Oral Intake of Low-Molecular-Weight Collagen Peptide Improves Hydration, Elasticity, and Wrinkling in Human Skin: A Randomized, Double-Blind, Placebo-Controlled Study', 'Randomised controlled trial (Nutrients, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29949889/'),
  ('sports-research-hydrolyzed-collagen-peptides-vanilla', 'Low-molecular-weight collagen peptides supplement promotes a healthy skin: A randomized, double-blinded, placebo-controlled study', 'Randomised controlled trial (J Cosmet Dermatol, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/37822045/'),
  ('sports-research-hydrolyzed-collagen-peptides-vanilla', 'Skin Anti-Aging and Moisturizing Effects of Low-Molecular-Weight Collagen Peptide Supplementation in Healthy Adults: A Randomized, Double-Blind, Placebo-Controlled Clinical Trial', 'Randomised controlled trial (J Microbiol Biotechnol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40935395/'),
  ('sports-research-hydrolyzed-collagen-peptides-vanilla', 'Influence of collagen peptide supplementation on visible signs of skin and nail health and -aging in an East Asian population: A double blind, randomized, placebo-controlled trial', 'Randomised controlled trial (J Cosmet Dermatol, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39143887/'),
  -- sports-research-collagen-peptides-matcha
  ('sports-research-collagen-peptides-matcha', 'Oral supplementation of specific collagen peptides has beneficial effects on human skin physiology: a double-blind, placebo-controlled study', 'Randomised controlled trial (Skin Pharmacol Physiol, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/23949208/'),
  ('sports-research-collagen-peptides-matcha', 'Oral Intake of Low-Molecular-Weight Collagen Peptide Improves Hydration, Elasticity, and Wrinkling in Human Skin: A Randomized, Double-Blind, Placebo-Controlled Study', 'Randomised controlled trial (Nutrients, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29949889/'),
  ('sports-research-collagen-peptides-matcha', 'Low-molecular-weight collagen peptides supplement promotes a healthy skin: A randomized, double-blinded, placebo-controlled study', 'Randomised controlled trial (J Cosmet Dermatol, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/37822045/'),
  ('sports-research-collagen-peptides-matcha', 'Skin Anti-Aging and Moisturizing Effects of Low-Molecular-Weight Collagen Peptide Supplementation in Healthy Adults: A Randomized, Double-Blind, Placebo-Controlled Clinical Trial', 'Randomised controlled trial (J Microbiol Biotechnol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40935395/'),
  ('sports-research-collagen-peptides-matcha', 'Influence of collagen peptide supplementation on visible signs of skin and nail health and -aging in an East Asian population: A double blind, randomized, placebo-controlled trial', 'Randomised controlled trial (J Cosmet Dermatol, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39143887/'),
  -- solgar-vegetal-silica
  ('solgar-vegetal-silica', 'Silicon Supplementation for Bone Health: An Umbrella Review Attempting to Translate from Animals to Humans', 'Systematic review (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38337624/'),
  ('solgar-vegetal-silica', 'Effect of oral intake of choline-stabilized orthosilicic acid on skin, nails and hair in women with photodamaged skin', 'Randomised controlled trial (Arch Dermatol Res, 2005)', 'https://pubmed.ncbi.nlm.nih.gov/16205932/'),
  ('solgar-vegetal-silica', 'Choline-stabilized orthosilicic acid supplementation as an adjunct to calcium/vitamin D3 stimulates markers of bone formation in osteopenic females: a randomized, placebo-controlled trial', 'Randomised controlled trial (BMC Musculoskelet Disord, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18547426/'),
  ('solgar-vegetal-silica', 'Effect of oral intake of choline-stabilized orthosilicic acid on hair tensile strength and morphology in women with fine hair', 'Randomised controlled trial (Arch Dermatol Res, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17960402/'),
  ('solgar-vegetal-silica', 'Absorption of silicon from artesian aquifer water and its impact on bone health in postmenopausal women: a 12 week pilot study', 'Randomised controlled trial (Nutr J, 2010)', 'https://pubmed.ncbi.nlm.nih.gov/20946656/'),
  -- swanson-bamboo-extract
  ('swanson-bamboo-extract', 'Silicon Supplementation for Bone Health: An Umbrella Review Attempting to Translate from Animals to Humans', 'Systematic review (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38337624/'),
  ('swanson-bamboo-extract', 'Effect of oral intake of choline-stabilized orthosilicic acid on skin, nails and hair in women with photodamaged skin', 'Randomised controlled trial (Arch Dermatol Res, 2005)', 'https://pubmed.ncbi.nlm.nih.gov/16205932/'),
  ('swanson-bamboo-extract', 'Choline-stabilized orthosilicic acid supplementation as an adjunct to calcium/vitamin D3 stimulates markers of bone formation in osteopenic females: a randomized, placebo-controlled trial', 'Randomised controlled trial (BMC Musculoskelet Disord, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18547426/'),
  ('swanson-bamboo-extract', 'Effect of oral intake of choline-stabilized orthosilicic acid on hair tensile strength and morphology in women with fine hair', 'Randomised controlled trial (Arch Dermatol Res, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17960402/'),
  ('swanson-bamboo-extract', 'Absorption of silicon from artesian aquifer water and its impact on bone health in postmenopausal women: a 12 week pilot study', 'Randomised controlled trial (Nutr J, 2010)', 'https://pubmed.ncbi.nlm.nih.gov/20946656/'),
  -- jarrow-formulas-hyaluronic-acid-120-mg
  ('jarrow-formulas-hyaluronic-acid-120-mg', 'Oral Hyaluronic Acid Supplement: Efficacy in Skin Hydration, Elasticity, and Wrinkle Depth Reduction', 'Meta-analysis (J Drugs Dermatol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40911749/'),
  ('jarrow-formulas-hyaluronic-acid-120-mg', 'Oral administration of hyaluronic acid to improve skin conditions via a randomized double-blind clinical test', 'Randomised controlled trial (Skin Res Technol, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/38009035/'),
  ('jarrow-formulas-hyaluronic-acid-120-mg', 'Oral sodium hyaluronate improves skin hydration, barrier function and signs of aging: a randomized, double-blind, placebo-controlled trial in 150 healthy adults', 'Randomised controlled trial (Sci Rep, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41422283/'),
  ('jarrow-formulas-hyaluronic-acid-120-mg', 'Oral intake of a new full-spectrum hyaluronan improves skin profilometry and ageing: a randomized, double-blind, placebo-controlled clinical trial', 'Randomised controlled trial (Eur J Dermatol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34933842/'),
  ('jarrow-formulas-hyaluronic-acid-120-mg', 'Ingestion of an Oral Hyaluronan Solution Improves Skin Hydration, Wrinkle Reduction, Elasticity, and Skin Roughness: Results of a Clinical Study', 'Study (J Evid Based Complementary Altern Med, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/29228816/'),
  -- thorne-biotin-8000-mcg
  ('thorne-biotin-8000-mcg', 'Treatment of brittle nail with a hydroxypropyl chitosan-based lacquer, alone or in combination with oral biotin: A randomized, assessor-blinded trial', 'Randomised controlled trial (Dermatol Ther, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31344296/'),
  ('thorne-biotin-8000-mcg', 'Effect of biotin on hair roots and sebum excretion in women with diffuse alopecia', 'Clinical trial (Pol Med J, 1966)', 'https://pubmed.ncbi.nlm.nih.gov/4223823/'),
  ('thorne-biotin-8000-mcg', 'Zinc aspartate, biotin, and clobetasol propionate in the treatment of alopecia areata in childhood', 'Clinical trial (Pediatr Dermatol, 1999)', 'https://pubmed.ncbi.nlm.nih.gov/10515774/'),
  ('thorne-biotin-8000-mcg', 'Biotin for the treatment of nail disease: what is the evidence?', 'Review (J Dermatolog Treat, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29057689/'),
  ('thorne-biotin-8000-mcg', 'Dietary supplements in dermatology: A review of the evidence for zinc, biotin, vitamin D, nicotinamide, and Polypodium', 'Review (J Am Acad Dermatol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/32360756/'),
  -- sports-research-biotin-2500-mcg
  ('sports-research-biotin-2500-mcg', 'Treatment of brittle nail with a hydroxypropyl chitosan-based lacquer, alone or in combination with oral biotin: A randomized, assessor-blinded trial', 'Randomised controlled trial (Dermatol Ther, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31344296/'),
  ('sports-research-biotin-2500-mcg', 'Effect of biotin on hair roots and sebum excretion in women with diffuse alopecia', 'Clinical trial (Pol Med J, 1966)', 'https://pubmed.ncbi.nlm.nih.gov/4223823/'),
  ('sports-research-biotin-2500-mcg', 'Zinc aspartate, biotin, and clobetasol propionate in the treatment of alopecia areata in childhood', 'Clinical trial (Pediatr Dermatol, 1999)', 'https://pubmed.ncbi.nlm.nih.gov/10515774/'),
  ('sports-research-biotin-2500-mcg', 'Biotin for the treatment of nail disease: what is the evidence?', 'Review (J Dermatolog Treat, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29057689/'),
  ('sports-research-biotin-2500-mcg', 'Dietary supplements in dermatology: A review of the evidence for zinc, biotin, vitamin D, nicotinamide, and Polypodium', 'Review (J Am Acad Dermatol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/32360756/'),
  -- nature-made-hair-skin-nails
  ('nature-made-hair-skin-nails', 'Treatment of brittle nail with a hydroxypropyl chitosan-based lacquer, alone or in combination with oral biotin: A randomized, assessor-blinded trial', 'Randomised controlled trial (Dermatol Ther, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31344296/'),
  ('nature-made-hair-skin-nails', 'Effect of biotin on hair roots and sebum excretion in women with diffuse alopecia', 'Clinical trial (Pol Med J, 1966)', 'https://pubmed.ncbi.nlm.nih.gov/4223823/'),
  ('nature-made-hair-skin-nails', 'Zinc aspartate, biotin, and clobetasol propionate in the treatment of alopecia areata in childhood', 'Clinical trial (Pediatr Dermatol, 1999)', 'https://pubmed.ncbi.nlm.nih.gov/10515774/'),
  ('nature-made-hair-skin-nails', 'Biotin for the treatment of nail disease: what is the evidence?', 'Review (J Dermatolog Treat, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29057689/'),
  ('nature-made-hair-skin-nails', 'Dietary supplements in dermatology: A review of the evidence for zinc, biotin, vitamin D, nicotinamide, and Polypodium', 'Review (J Am Acad Dermatol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/32360756/'),
  -- life-extension-skin-restoring-ceramides
  ('life-extension-skin-restoring-ceramides', 'Efficacy and Safety of Oral Administration of Wine Lees Extract (WLE)-Derived Ceramides and Glucosylceramides in Enhancing Skin Barrier Function: A Randomized, Double-Blind, Placebo-Controlled Study', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38999848/'),
  ('life-extension-skin-restoring-ceramides', 'Safety Evaluation of the Excessive Intake of Ceramide-Containing Acetic Acid Bacteria - A Randomized, Double-Blind, Placebo-Controlled Study Over a 4-week Period', 'Randomised controlled trial (J Oleo Sci, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33658470/'),
  ('life-extension-skin-restoring-ceramides', 'Safety and Efficacy of Oral Intake of Ceramide-Containing Acetic Acid Bacteria for Improving the Stratum Corneum Hydration: A Randomized, Double-Blind, Placebo-Controlled Study over 12 Weeks', 'Randomised controlled trial (J Oleo Sci, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/33055441/'),
  ('life-extension-skin-restoring-ceramides', 'Effect of Rice (Oryza sativa L.) Ceramides Supplementation on Improving Skin Barrier Functions and Depigmentation: An Open-Label Prospective Study', 'Clinical trial (Nutrients, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35807914/'),
  ('life-extension-skin-restoring-ceramides', 'Potential Applications of Phyto-Derived Ceramides in Improving Epidermal Barrier Function', 'Review (Skin Pharmacol Physiol, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28407621/'),
  -- sports-research-astaxanthin-12-mg
  ('sports-research-astaxanthin-12-mg', 'Systematic Review and Meta-Analysis on the Effects of Astaxanthin on Human Skin Ageing', 'Meta-analysis (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34578794/'),
  ('sports-research-astaxanthin-12-mg', 'The Protective Role of Astaxanthin for UV-Induced Skin Deterioration in Healthy People-A Randomized, Double-Blind, Placebo-Controlled Trial', 'Randomised controlled trial (Nutrients, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29941810/'),
  ('sports-research-astaxanthin-12-mg', 'Cosmetic benefits of astaxanthin on humans subjects', 'Randomised controlled trial (Acta Biochim Pol, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22428137/'),
  ('sports-research-astaxanthin-12-mg', 'Supplementating with dietary astaxanthin combined with collagen hydrolysate improves facial elasticity and decreases matrix metalloproteinase-1 and -12 expression: a comparative study with placebo', 'Randomised controlled trial (J Med Food, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24955642/'),
  ('sports-research-astaxanthin-12-mg', 'Health benefits of astaxanthin against age-related diseases of multiple organs: A comprehensive review', 'Review (Crit Rev Food Sci Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35708049/'),
  -- pure-encapsulations-lycopene-20-mg
  ('pure-encapsulations-lycopene-20-mg', 'The effect of tomato and lycopene on clinical characteristics and molecular markers of UV-induced skin deterioration: A systematic review and meta-analysis of intervention trials', 'Meta-analysis (Crit Rev Food Sci Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/36606553/'),
  ('pure-encapsulations-lycopene-20-mg', 'Skin lycopene is destroyed preferentially over beta-carotene during ultraviolet irradiation in humans', 'Randomised controlled trial (J Nutr, 1995)', 'https://pubmed.ncbi.nlm.nih.gov/7616301/'),
  ('pure-encapsulations-lycopene-20-mg', 'Association of Candidate Single-Nucleotide Polymorphism Genotypes With Plasma and Skin Carotenoid Concentrations in Adults Provided a Lycopene-Rich Juice', 'Randomised controlled trial (J Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38797482/'),
  ('pure-encapsulations-lycopene-20-mg', 'Lycopene not in pill, nor in natura has photoprotective systemic effect', 'Randomised controlled trial (Arch Dermatol Res, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/26024575/'),
  ('pure-encapsulations-lycopene-20-mg', 'Tomato Phytonutrients Balance UV Response: Results from a Double-Blind, Randomized, Placebo-Controlled Study', 'Randomised controlled trial (Skin Pharmacol Physiol, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30836363/'),
  -- jarrow-formulas-carotenall
  ('jarrow-formulas-carotenall', 'Skin Aging and Carotenoids: A Systematic Review of Their Multifaceted Protective Mechanisms', 'Systematic review (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40871623/'),
  ('jarrow-formulas-carotenall', 'Carotenoids and carotenoids plus vitamin E protect against ultraviolet light-induced erythema in humans', 'Randomised controlled trial (Am J Clin Nutr, 2000)', 'https://pubmed.ncbi.nlm.nih.gov/10702175/'),
  ('jarrow-formulas-carotenall', 'Supplementation with beta-carotene or a similar amount of mixed carotenoids protects humans from UV-induced erythema', 'Randomised controlled trial (J Nutr, 2003)', 'https://pubmed.ncbi.nlm.nih.gov/12514275/'),
  ('jarrow-formulas-carotenall', 'Orally administered mixed carotenoids protect human skin against ultraviolet A-induced skin pigmentation: A double-blind, placebo-controlled, randomized clinical trial', 'Randomised controlled trial (Photodermatol Photoimmunol Photomed, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32072695/'),
  ('jarrow-formulas-carotenall', 'Effect of beta-carotene supplementation on the human sunburn reaction', 'Randomised controlled trial (Exp Dermatol, 1995)', 'https://pubmed.ncbi.nlm.nih.gov/7640875/'),
  -- thorne-niacinamide
  ('thorne-niacinamide', 'Effect of Nicotinamide in Skin Cancer and Actinic Keratoses Chemoprophylaxis, and Adverse Effects Related to Nicotinamide: A Systematic Review and Meta-Analysis', 'Meta-analysis (J Cutan Med Surg, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35134311/'),
  ('thorne-niacinamide', 'The Role of Nicotinamide as Chemo-Preventive Agent in NMSCs: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/38201930/'),
  ('thorne-niacinamide', 'The adverse effects of oral niacin/nicotinamide - an overview of reviews', 'Systematic review (Eye (Lond), 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40999226/'),
  ('thorne-niacinamide', 'A Phase 3 Randomized Trial of Nicotinamide for Skin-Cancer Chemoprevention', 'Randomised controlled trial (N Engl J Med, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/26488693/'),
  ('thorne-niacinamide', 'Nicotinamide for Skin-Cancer Chemoprevention in Transplant Recipients', 'Randomised controlled trial (N Engl J Med, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36856616/'),
  -- swanson-l-methionine-500-mg
  ('swanson-l-methionine-500-mg', 'Metabolic Consequences of Supplemented Methionine in a Clinical Context', 'Review (J Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/33000166/'),
  ('swanson-l-methionine-500-mg', 'Methionine as a double-edged sword in health and disease: Current perspective and future challenges', 'Review (Ageing Res Rev, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34700006/'),
  ('swanson-l-methionine-500-mg', 'Comparative value of L-, and D-methionine supplementation of an oat-based diet for humans', 'Randomised controlled trial (J Nutr, 1975)', 'https://pubmed.ncbi.nlm.nih.gov/1138025/'),
  ('swanson-l-methionine-500-mg', 'Effect of Branched-Chain Amino Acid Supplementation Alone or Combined With Tryptophan or Methionine on Appetite Control and Related Health Outcomes in Older Adults: Protocol for a Randomized Controlled Trial', 'Randomised controlled trial (JMIR Res Protoc, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42166751/'),
  ('swanson-l-methionine-500-mg', 'Effect of L-methionine supplementation on plasma homocysteine and other free amino acids: a placebo-controlled double-blind cross-over study', 'Randomised controlled trial (Eur J Clin Nutr, 2005)', 'https://pubmed.ncbi.nlm.nih.gov/15870821/'),
  -- jarrow-formulas-evening-primrose-1300-mg
  ('jarrow-formulas-evening-primrose-1300-mg', 'Oral evening primrose oil and borage oil for eczema', 'Meta-analysis (Cochrane Database Syst Rev, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23633319/'),
  ('jarrow-formulas-evening-primrose-1300-mg', 'The effect of Oenothera biennis (Evening primrose) oil on inflammatory diseases: a systematic review of clinical trials', 'Systematic review (BMC Complement Med Ther, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38360611/'),
  ('jarrow-formulas-evening-primrose-1300-mg', 'Treatment of atopic eczema with evening primrose oil', 'Randomised controlled trial (Lancet, 1981)', 'https://pubmed.ncbi.nlm.nih.gov/6109930/'),
  ('jarrow-formulas-evening-primrose-1300-mg', 'Epogam evening primrose oil treatment in atopic dermatitis and asthma', 'Randomised controlled trial (Arch Dis Child, 1996)', 'https://pubmed.ncbi.nlm.nih.gov/9014601/'),
  ('jarrow-formulas-evening-primrose-1300-mg', 'Evening primrose oil is effective in atopic dermatitis: a randomized placebo-controlled trial', 'Randomised controlled trial (Indian J Dermatol Venereol Leprol, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/19052401/'),
  -- jarrow-formulas-borage-seed-oil-1200-mg
  ('jarrow-formulas-borage-seed-oil-1200-mg', 'Oral evening primrose oil and borage oil for eczema', 'Meta-analysis (Cochrane Database Syst Rev, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23633319/'),
  ('jarrow-formulas-borage-seed-oil-1200-mg', 'Intervention with flaxseed and borage oil supplements modulates skin condition in women', 'Randomised controlled trial (Br J Nutr, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/18761778/'),
  ('jarrow-formulas-borage-seed-oil-1200-mg', 'Double-blind, multicentre analysis of the efficacy of borage oil in patients with atopic eczema', 'Randomised controlled trial (Br J Dermatol, 1999)', 'https://pubmed.ncbi.nlm.nih.gov/10233322/'),
  ('jarrow-formulas-borage-seed-oil-1200-mg', 'Gamma-linolenic acid supplementation for prophylaxis of atopic dermatitis--a randomized controlled trial in infants at high familial risk', 'Randomised controlled trial (Am J Clin Nutr, 2003)', 'https://pubmed.ncbi.nlm.nih.gov/12663296/'),
  ('jarrow-formulas-borage-seed-oil-1200-mg', 'Atopic eczema unresponsive to evening primrose oil (linoleic and gamma-linolenic acids)', 'Randomised controlled trial (J Am Acad Dermatol, 1985)', 'https://pubmed.ncbi.nlm.nih.gov/3908514/'),
  -- sports-research-evening-primrose-oil-500-mg
  ('sports-research-evening-primrose-oil-500-mg', 'Oral evening primrose oil and borage oil for eczema', 'Meta-analysis (Cochrane Database Syst Rev, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23633319/'),
  ('sports-research-evening-primrose-oil-500-mg', 'The effect of Oenothera biennis (Evening primrose) oil on inflammatory diseases: a systematic review of clinical trials', 'Systematic review (BMC Complement Med Ther, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38360611/'),
  ('sports-research-evening-primrose-oil-500-mg', 'Treatment of atopic eczema with evening primrose oil', 'Randomised controlled trial (Lancet, 1981)', 'https://pubmed.ncbi.nlm.nih.gov/6109930/'),
  ('sports-research-evening-primrose-oil-500-mg', 'Epogam evening primrose oil treatment in atopic dermatitis and asthma', 'Randomised controlled trial (Arch Dis Child, 1996)', 'https://pubmed.ncbi.nlm.nih.gov/9014601/'),
  ('sports-research-evening-primrose-oil-500-mg', 'Evening primrose oil is effective in atopic dermatitis: a randomized placebo-controlled trial', 'Randomised controlled trial (Indian J Dermatol Venereol Leprol, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/19052401/'),
  -- now-gamma-e-tocopherols
  ('now-gamma-e-tocopherols', 'Effect of γ-tocopherol supplementation on premenstrual symptoms and natriuresis: a randomized, double-blind, placebo-controlled study', 'Randomised controlled trial (BMC Complement Med Ther, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37118716/'),
  ('now-gamma-e-tocopherols', 'Effects of gamma-tocopherol supplementation on thrombotic risk factors', 'Randomised controlled trial (Asia Pac J Clin Nutr, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17704022/'),
  ('now-gamma-e-tocopherols', 'γ-Tocopherol-rich supplementation additively improves vascular endothelial function during smoking cessation', 'Randomised controlled trial (Free Radic Biol Med, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/24075893/'),
  ('now-gamma-e-tocopherols', 'Gamma tocopherol-enriched supplement reduces sputum eosinophilia and endotoxin-induced sputum neutrophilia in volunteers with asthma', 'Randomised controlled trial (J Allergy Clin Immunol, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/28736267/'),
  ('now-gamma-e-tocopherols', 'Short course gamma tocopherol did not mitigate effects of ozone on airway inflammation in asthmatics', 'Randomised controlled trial (Inhal Toxicol, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32727225/'),
  -- jarrow-formulas-opcs-95-100-mg
  ('jarrow-formulas-opcs-95-100-mg', 'Prevention of dental caries by grape seed extract supplementation: A systematic review', 'Systematic review (Nutr Health, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31760860/'),
  ('jarrow-formulas-opcs-95-100-mg', 'Grape seed extract supplementation in non-alcoholic fatty liver disease', 'Randomised controlled trial (Int J Vitam Nutr Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38419408/'),
  ('jarrow-formulas-opcs-95-100-mg', 'Grape Seed Extract Positively Modulates Blood Pressure and Perceived Stress: A Randomized, Double-Blind, Placebo-Controlled Study in Healthy Volunteers', 'Randomised controlled trial (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33671310/'),
  ('jarrow-formulas-opcs-95-100-mg', 'Supplementation with grape seed polyphenols results in increased urinary excretion of 3-hydroxyphenylpropionic Acid, an important metabolite of proanthocyanidins in humans', 'Randomised controlled trial (J Agric Food Chem, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/15315398/'),
  ('jarrow-formulas-opcs-95-100-mg', 'Molecular mechanisms of cardioprotection by a novel grape seed proanthocyanidin extract', 'Review (Mutat Res, 2003)', 'https://pubmed.ncbi.nlm.nih.gov/12628506/'),
  -- bulksupplements-amla-extract
  ('bulksupplements-amla-extract', 'The impact of Emblica Officinalis (Amla) on lipid profile, glucose, and C-reactive protein: A systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Diabetes Metab Syndr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36934568/'),
  ('bulksupplements-amla-extract', 'Clinical effects of Emblica officinalis fruit consumption on cardiovascular disease risk factors: a systematic review and meta-analysis', 'Meta-analysis (BMC Complement Med Ther, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37296402/'),
  ('bulksupplements-amla-extract', 'Phyllanthus emblica fruits: a polyphenol-rich fruit with potential benefits for oral management', 'Systematic review (Food Funct, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37529983/'),
  ('bulksupplements-amla-extract', 'Potential effect of tropical fruits Phyllanthus emblica L. for the prevention and management of type 2 diabetic complications: a systematic review of recent advances', 'Systematic review (Eur J Nutr, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33439332/'),
  ('bulksupplements-amla-extract', 'Effects of 12 Weeks of Chromium, Phyllanthus emblica Fruit Extract, and Shilajit Supplementation on Markers of Cardiometabolic Health, Fitness, and Weight Loss in Men and Women with Risk Factors to Metabolic Syndrome Initiating an Exercise and Diet Intervention: A Randomized Double-Blind, Placebo-Controlled Trial', 'Randomised controlled trial (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40573153/'),
  -- swanson-full-spectrum-gotu-kola-435-mg
  ('swanson-full-spectrum-gotu-kola-435-mg', 'Efficacy and Safety of Centella Asiatica (L.) Urb. on Wrinkles: A Systematic Review of Published Data and Network Meta-Analysis', 'Systematic review (J Cosmet Sci, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/33413787/'),
  ('swanson-full-spectrum-gotu-kola-435-mg', 'A Randomized, Double-Blind, Placebo-Controlled Trial Assessing the Effects of Oral Centella asiatica Extract on Skin Aging-Related Parameters in Middle-Aged Korean Women', 'Randomised controlled trial (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42196964/'),
  ('swanson-full-spectrum-gotu-kola-435-mg', 'Titrated extract of Centella asiatica (TECA) in the treatment of venous insufficiency of the lower limbs', 'Randomised controlled trial (Angiology, 1987)', 'https://pubmed.ncbi.nlm.nih.gov/3544968/'),
  ('swanson-full-spectrum-gotu-kola-435-mg', 'Role of Centella asiatica and ceramide in skin barrier improvement: a double blind clinical trial of Indonesian batik workers', 'Randomised controlled trial (J Basic Clin Physiol Pharmacol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34214362/'),
  ('swanson-full-spectrum-gotu-kola-435-mg', 'The efficacy and side effects of oral Centella asiatica extract for wound healing promotion in diabetic wound patients', 'Randomised controlled trial (J Med Assoc Thai, 2010)', 'https://pubmed.ncbi.nlm.nih.gov/21298840/'),
  -- swanson-full-spectrum-fo-ti-500-mg
  ('swanson-full-spectrum-fo-ti-500-mg', '2,3,5,4''-Tetrahydroxystilbene-2-O-β-D-glucoside (TSG) from Polygonum multiflorum Thunb.: A Systematic Review on Anti-Aging', 'Systematic review (Int J Mol Sci, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40244282/'),
  ('swanson-full-spectrum-fo-ti-500-mg', 'Traditional usages, botany, phytochemistry, pharmacology and toxicology of Polygonum multiflorum Thunb.: a review', 'Systematic review (J Ethnopharmacol, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25449462/'),
  ('swanson-full-spectrum-fo-ti-500-mg', 'Attributes of Polygonum multiflorum to transfigure red biotechnology', 'Review (Appl Microbiol Biotechnol, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30895364/'),
  ('swanson-full-spectrum-fo-ti-500-mg', 'Research progress on hepatotoxicity mechanism of polygonum multiflorum and its main components', 'Review (Toxicon, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39038664/'),
  ('swanson-full-spectrum-fo-ti-500-mg', 'Polygonum multiflorum: Recent updates on newly isolated compounds, potential hepatotoxic compounds and their mechanisms', 'Review (J Ethnopharmacol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33485980/'),
  -- swanson-black-cumin-seed-oil-500-mg
  ('swanson-black-cumin-seed-oil-500-mg', 'The effect of Nigella sativa on the risk of mortality in patients with COVID-19: A systematic review and meta-analysis of randomized trials', 'Meta-analysis (Phytother Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/36757063/'),
  ('swanson-black-cumin-seed-oil-500-mg', 'Effects of Nigella sativa supplementation on lipid profiles in adults: An updated systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Clin Nutr ESPEN, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38777430/'),
  ('swanson-black-cumin-seed-oil-500-mg', 'The influence of Nigella sativa for asthma control: A meta-analysis', 'Meta-analysis (Am J Emerg Med, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31892440/'),
  ('swanson-black-cumin-seed-oil-500-mg', 'Does Nigella sativa supplementation improve cardiovascular disease risk factors? A comprehensive GRADE-assessed systematic review and dose-response meta-analysis of 82 randomized controlled trials', 'Meta-analysis (Pharmacol Res, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40714301/'),
  ('swanson-black-cumin-seed-oil-500-mg', 'The effect of Nigella sativa supplementation on glycemic status in adults: An updated systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Prostaglandins Other Lipid Mediat, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39181437/'),
  -- life-extension-black-cumin-seed-oil-and-bio-curcumin
  ('life-extension-black-cumin-seed-oil-and-bio-curcumin', 'The effect of Nigella sativa on the risk of mortality in patients with COVID-19: A systematic review and meta-analysis of randomized trials', 'Meta-analysis (Phytother Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/36757063/'),
  ('life-extension-black-cumin-seed-oil-and-bio-curcumin', 'Anti-inflammatory effects of oral supplementation with curcumin: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Nutr Rev, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34378053/'),
  ('life-extension-black-cumin-seed-oil-and-bio-curcumin', 'Effects of Nigella sativa supplementation on lipid profiles in adults: An updated systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Clin Nutr ESPEN, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38777430/'),
  ('life-extension-black-cumin-seed-oil-and-bio-curcumin', 'The effect of oral curcumin supplementation on health-related quality of life: A systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (J Affect Disord, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33038707/'),
  ('life-extension-black-cumin-seed-oil-and-bio-curcumin', 'The influence of Nigella sativa for asthma control: A meta-analysis', 'Meta-analysis (Am J Emerg Med, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31892440/'),
  -- thorne-broccoli-seed-extract
  ('thorne-broccoli-seed-extract', 'Effect of broccoli sprout extract and baseline gut microbiota on fasting blood glucose in prediabetes: a randomized, placebo-controlled trial', 'Randomised controlled trial (Nat Microbiol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39929977/'),
  ('thorne-broccoli-seed-extract', 'Randomized controlled trial of an adjunctive sulforaphane nutraceutical in schizophrenia', 'Randomised controlled trial (Schizophr Res, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33839372/'),
  ('thorne-broccoli-seed-extract', 'Improving insulin resistance by sulforaphane via activating the Bacteroides and Lactobacillus SCFAs-GPR-GLP1 signal axis', 'Randomised controlled trial (Food Funct, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39045769/'),
  ('thorne-broccoli-seed-extract', 'Randomized Phase II Clinical Trial of Sulforaphane in Former Smokers at High Risk for Lung Cancer', 'Randomised controlled trial (Cancer Prev Res (Phila), 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40041932/'),
  ('thorne-broccoli-seed-extract', 'Sulforaphane Adjunct to Methylphenidate for Attention-deficit/Hyperactivity Disorder: A Randomized, Double-blind, Placebo-controlled Trial', 'Randomised controlled trial (Clin Neuropharmacol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41604557/'),
  -- swanson-sprouted-broccoli-seed-400-mg
  ('swanson-sprouted-broccoli-seed-400-mg', 'Effect of broccoli sprout extract and baseline gut microbiota on fasting blood glucose in prediabetes: a randomized, placebo-controlled trial', 'Randomised controlled trial (Nat Microbiol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39929977/'),
  ('swanson-sprouted-broccoli-seed-400-mg', 'Randomized controlled trial of an adjunctive sulforaphane nutraceutical in schizophrenia', 'Randomised controlled trial (Schizophr Res, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33839372/'),
  ('swanson-sprouted-broccoli-seed-400-mg', 'Improving insulin resistance by sulforaphane via activating the Bacteroides and Lactobacillus SCFAs-GPR-GLP1 signal axis', 'Randomised controlled trial (Food Funct, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39045769/'),
  ('swanson-sprouted-broccoli-seed-400-mg', 'Randomized Phase II Clinical Trial of Sulforaphane in Former Smokers at High Risk for Lung Cancer', 'Randomised controlled trial (Cancer Prev Res (Phila), 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40041932/'),
  ('swanson-sprouted-broccoli-seed-400-mg', 'Sulforaphane Adjunct to Methylphenidate for Attention-deficit/Hyperactivity Disorder: A Randomized, Double-blind, Placebo-controlled Trial', 'Randomised controlled trial (Clin Neuropharmacol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41604557/'),
  -- pure-encapsulations-ascorbyl-palmitate
  ('pure-encapsulations-ascorbyl-palmitate', 'The Effects of Dietary Supplementation with Collagen and Vitamin C and Their Combination with Hyaluronic Acid on Skin Density, Texture and Other Parameters: A Randomised, Double-Blind, Placebo-Controlled Trial', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38931263/'),
  ('pure-encapsulations-ascorbyl-palmitate', 'The Roles of Vitamin C in Skin Health', 'Review (Nutrients, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28805671/'),
  ('pure-encapsulations-ascorbyl-palmitate', 'Ascorbic acid--scurvy', 'Review (Prog Food Nutr Sci, 1975)', 'https://pubmed.ncbi.nlm.nih.gov/772754/'),
  ('pure-encapsulations-ascorbyl-palmitate', 'Ascorbic acid and the biosynthesis of collagen and elastin', 'Review (Bibl Nutr Dieta, 1969)', 'https://pubmed.ncbi.nlm.nih.gov/4899166/'),
  ('pure-encapsulations-ascorbyl-palmitate', 'Vitamins and the skin: Vitamin C in dermatology', 'Review (Clin Dermatol, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41690651/'),
  -- now-acerola-4-1-extract-powder
  ('now-acerola-4-1-extract-powder', 'The Effects of Dietary Supplementation with Collagen and Vitamin C and Their Combination with Hyaluronic Acid on Skin Density, Texture and Other Parameters: A Randomised, Double-Blind, Placebo-Controlled Trial', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38931263/'),
  ('now-acerola-4-1-extract-powder', 'The Roles of Vitamin C in Skin Health', 'Review (Nutrients, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28805671/'),
  ('now-acerola-4-1-extract-powder', 'Ascorbic acid--scurvy', 'Review (Prog Food Nutr Sci, 1975)', 'https://pubmed.ncbi.nlm.nih.gov/772754/'),
  ('now-acerola-4-1-extract-powder', 'Ascorbic acid and the biosynthesis of collagen and elastin', 'Review (Bibl Nutr Dieta, 1969)', 'https://pubmed.ncbi.nlm.nih.gov/4899166/'),
  ('now-acerola-4-1-extract-powder', 'Vitamins and the skin: Vitamin C in dermatology', 'Review (Clin Dermatol, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41690651/'),
  -- life-extension-palmettoguard
  ('life-extension-palmettoguard', 'Is Serenoa repens effective for the treatment of chronic prostatitis/chronic pelvic pain syndrome (CP/CPPS)? A systematic review and meta-analysis', 'Meta-analysis (Asian J Surg, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35165019/'),
  ('life-extension-palmettoguard', 'Serenoa repens for benign prostatic hyperplasia', 'Meta-analysis (Cochrane Database Syst Rev, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19370565/'),
  ('life-extension-palmettoguard', 'Saw palmetto extracts for treatment of benign prostatic hyperplasia: a systematic review', 'Meta-analysis (JAMA, 1998)', 'https://pubmed.ncbi.nlm.nih.gov/9820264/'),
  ('life-extension-palmettoguard', 'Serenoa repens for benign prostatic hyperplasia', 'Meta-analysis (Cochrane Database Syst Rev, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/23235581/'),
  ('life-extension-palmettoguard', 'Efficacy and safety of a hexanic extract of Serenoa repens (Permixon(®) ) for the treatment of lower urinary tract symptoms associated with benign prostatic hyperplasia (LUTS/BPH): systematic review and meta-analysis of randomised controlled trials and observational studies', 'Meta-analysis (BJU Int, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29694707/'),
  -- bulksupplements-saw-palmetto-extract-320-mg
  ('bulksupplements-saw-palmetto-extract-320-mg', 'Is Serenoa repens effective for the treatment of chronic prostatitis/chronic pelvic pain syndrome (CP/CPPS)? A systematic review and meta-analysis', 'Meta-analysis (Asian J Surg, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35165019/'),
  ('bulksupplements-saw-palmetto-extract-320-mg', 'Serenoa repens for benign prostatic hyperplasia', 'Meta-analysis (Cochrane Database Syst Rev, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19370565/'),
  ('bulksupplements-saw-palmetto-extract-320-mg', 'Saw palmetto extracts for treatment of benign prostatic hyperplasia: a systematic review', 'Meta-analysis (JAMA, 1998)', 'https://pubmed.ncbi.nlm.nih.gov/9820264/'),
  ('bulksupplements-saw-palmetto-extract-320-mg', 'Serenoa repens for benign prostatic hyperplasia', 'Meta-analysis (Cochrane Database Syst Rev, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/23235581/'),
  ('bulksupplements-saw-palmetto-extract-320-mg', 'Efficacy and safety of a hexanic extract of Serenoa repens (Permixon(®) ) for the treatment of lower urinary tract symptoms associated with benign prostatic hyperplasia (LUTS/BPH): systematic review and meta-analysis of randomised controlled trials and observational studies', 'Meta-analysis (BJU Int, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29694707/'),
  -- swanson-rosemary-extract-500-mg
  ('swanson-rosemary-extract-500-mg', 'Pharmacological and biotechnological advances with Rosmarinus officinalis L', 'Systematic review (Expert Opin Ther Pat, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29633892/'),
  ('swanson-rosemary-extract-500-mg', 'Effects of Rosmarinus officinalis L. on memory performance, anxiety, depression, and sleep quality in university students: A randomized clinical trial', 'Randomised controlled trial (Complement Ther Clin Pract, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29389474/'),
  ('swanson-rosemary-extract-500-mg', 'Rosmarinus officinalis L. (rosemary) as therapeutic and prophylactic agent', 'Review (J Biomed Sci, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30621719/'),
  ('swanson-rosemary-extract-500-mg', 'Toxicity and safety of rosemary (Rosmarinus officinalis): a comprehensive review', 'Review (Naunyn Schmiedebergs Arch Pharmacol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39096378/'),
  ('swanson-rosemary-extract-500-mg', 'Review on rosmarinic acid extraction, fractionation and its anti-diabetic potential', 'Review (Food Chem Toxicol, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/30273632/'),
  -- ============================================================ Sleep
  -- thorne-pharmagaba-250
  ('thorne-pharmagaba-250', 'GABA Supplementation, Increased Heart-Rate Variability, Emotional Response, Sleep Efficiency and Reduced Depression in Sedentary Overweight Women Undergoing Physical Exercise: Placebo-Controlled, Randomized Clinical Trial', 'Randomised controlled trial (J Diet Suppl, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38321713/'),
  ('thorne-pharmagaba-250', 'Effect of a novel nutraceutical combination of EstroG-100 and γ-aminobutyric acid (GABA) in attenuating symptoms of menopause in healthy adult women: a randomized double-blinded placebo-controlled study', 'Randomised controlled trial (Menopause, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40663563/'),
  ('thorne-pharmagaba-250', 'Effects of γ-aminobutyric acid supplementation on glucose control in adults with prediabetes: A double-blind, randomized, placebo-controlled trial', 'Randomised controlled trial (Am J Clin Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37495019/'),
  ('thorne-pharmagaba-250', 'Oral intake of γ-aminobutyric acid affects mood and activities of central nervous system during stressed condition induced by mental tasks', 'Randomised controlled trial (Amino Acids, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22203366/'),
  ('thorne-pharmagaba-250', 'Growth hormone isoform responses to GABA ingestion at rest and after exercise', 'Randomised controlled trial (Med Sci Sports Exerc, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18091016/'),
  -- thorne-theanine
  ('thorne-theanine', 'Effects of Tea (Camellia sinensis) or its Bioactive Compounds l-Theanine or l-Theanine plus Caffeine on Cognition, Sleep, and Mood in Healthy Participants: A Systematic Review and Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (Nutr Rev, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40314930/'),
  ('thorne-theanine', 'The effects of L-theanine consumption on sleep outcomes: A systematic review and meta-analysis', 'Meta-analysis (Sleep Med Rev, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40056718/'),
  ('thorne-theanine', 'Acute effects of tea constituents L-theanine, caffeine, and epigallocatechin gallate on cognitive function and mood: a systematic review and meta-analysis', 'Meta-analysis (Nutr Rev, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24946991/'),
  ('thorne-theanine', 'The Effects of Green Tea Amino Acid L-Theanine Consumption on the Ability to Manage Stress and Anxiety Levels: a Systematic Review', 'Systematic review (Plant Foods Hum Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31758301/'),
  ('thorne-theanine', 'The effects of L-theanine supplementation on the outcomes of patients with mental disorders: a systematic review', 'Systematic review (BMC Psychiatry, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39633316/'),
  -- jarrow-formulas-theanine-200-mg
  ('jarrow-formulas-theanine-200-mg', 'Effects of Tea (Camellia sinensis) or its Bioactive Compounds l-Theanine or l-Theanine plus Caffeine on Cognition, Sleep, and Mood in Healthy Participants: A Systematic Review and Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (Nutr Rev, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40314930/'),
  ('jarrow-formulas-theanine-200-mg', 'The effects of L-theanine consumption on sleep outcomes: A systematic review and meta-analysis', 'Meta-analysis (Sleep Med Rev, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40056718/'),
  ('jarrow-formulas-theanine-200-mg', 'Acute effects of tea constituents L-theanine, caffeine, and epigallocatechin gallate on cognitive function and mood: a systematic review and meta-analysis', 'Meta-analysis (Nutr Rev, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24946991/'),
  ('jarrow-formulas-theanine-200-mg', 'The Effects of Green Tea Amino Acid L-Theanine Consumption on the Ability to Manage Stress and Anxiety Levels: a Systematic Review', 'Systematic review (Plant Foods Hum Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31758301/'),
  ('jarrow-formulas-theanine-200-mg', 'The effects of L-theanine supplementation on the outcomes of patients with mental disorders: a systematic review', 'Systematic review (BMC Psychiatry, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39633316/'),
  -- nature-made-l-theanine-chewable-200-mg
  ('nature-made-l-theanine-chewable-200-mg', 'Effects of Tea (Camellia sinensis) or its Bioactive Compounds l-Theanine or l-Theanine plus Caffeine on Cognition, Sleep, and Mood in Healthy Participants: A Systematic Review and Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (Nutr Rev, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40314930/'),
  ('nature-made-l-theanine-chewable-200-mg', 'The effects of L-theanine consumption on sleep outcomes: A systematic review and meta-analysis', 'Meta-analysis (Sleep Med Rev, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40056718/'),
  ('nature-made-l-theanine-chewable-200-mg', 'Acute effects of tea constituents L-theanine, caffeine, and epigallocatechin gallate on cognitive function and mood: a systematic review and meta-analysis', 'Meta-analysis (Nutr Rev, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24946991/'),
  ('nature-made-l-theanine-chewable-200-mg', 'The Effects of Green Tea Amino Acid L-Theanine Consumption on the Ability to Manage Stress and Anxiety Levels: a Systematic Review', 'Systematic review (Plant Foods Hum Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31758301/'),
  ('nature-made-l-theanine-chewable-200-mg', 'The effects of L-theanine supplementation on the outcomes of patients with mental disorders: a systematic review', 'Systematic review (BMC Psychiatry, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39633316/'),
  -- nature-made-melatonin-200-mg-l-theanine
  ('nature-made-melatonin-200-mg-l-theanine', 'Optimizing the Time and Dose of Melatonin as a Sleep-Promoting Drug: A Systematic Review of Randomized Controlled Trials and Dose-Response Meta-Analysis', 'Meta-analysis (J Pineal Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38888087/'),
  ('nature-made-melatonin-200-mg-l-theanine', 'Effects of Tea (Camellia sinensis) or its Bioactive Compounds l-Theanine or l-Theanine plus Caffeine on Cognition, Sleep, and Mood in Healthy Participants: A Systematic Review and Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (Nutr Rev, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40314930/'),
  ('nature-made-melatonin-200-mg-l-theanine', 'Meta-analysis: melatonin for the treatment of primary sleep disorders', 'Meta-analysis (PLoS One, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23691095/'),
  ('nature-made-melatonin-200-mg-l-theanine', 'The effects of L-theanine consumption on sleep outcomes: A systematic review and meta-analysis', 'Meta-analysis (Sleep Med Rev, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40056718/'),
  ('nature-made-melatonin-200-mg-l-theanine', 'Efficacy of melatonin for chronic insomnia: Systematic reviews and meta-analyses', 'Meta-analysis (Sleep Med Rev, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36179487/'),
  -- life-extension-fast-acting-liquid-melatonin
  ('life-extension-fast-acting-liquid-melatonin', 'Optimizing the Time and Dose of Melatonin as a Sleep-Promoting Drug: A Systematic Review of Randomized Controlled Trials and Dose-Response Meta-Analysis', 'Meta-analysis (J Pineal Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38888087/'),
  ('life-extension-fast-acting-liquid-melatonin', 'Meta-analysis: melatonin for the treatment of primary sleep disorders', 'Meta-analysis (PLoS One, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23691095/'),
  ('life-extension-fast-acting-liquid-melatonin', 'Efficacy of melatonin for chronic insomnia: Systematic reviews and meta-analyses', 'Meta-analysis (Sleep Med Rev, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36179487/'),
  ('life-extension-fast-acting-liquid-melatonin', 'Melatonin for sleep disorders in people with autism: Systematic review and meta-analysis', 'Meta-analysis (Prog Neuropsychopharmacol Biol Psychiatry, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36584862/'),
  ('life-extension-fast-acting-liquid-melatonin', 'Efficacy of melatonin and ramelteon for the acute and long-term management of insomnia disorder in adults: A systematic review and meta-analysis', 'Meta-analysis (J Sleep Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37434463/'),
  -- now-melatonin-5-mg
  ('now-melatonin-5-mg', 'Optimizing the Time and Dose of Melatonin as a Sleep-Promoting Drug: A Systematic Review of Randomized Controlled Trials and Dose-Response Meta-Analysis', 'Meta-analysis (J Pineal Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38888087/'),
  ('now-melatonin-5-mg', 'Meta-analysis: melatonin for the treatment of primary sleep disorders', 'Meta-analysis (PLoS One, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23691095/'),
  ('now-melatonin-5-mg', 'Efficacy of melatonin for chronic insomnia: Systematic reviews and meta-analyses', 'Meta-analysis (Sleep Med Rev, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36179487/'),
  ('now-melatonin-5-mg', 'Melatonin for sleep disorders in people with autism: Systematic review and meta-analysis', 'Meta-analysis (Prog Neuropsychopharmacol Biol Psychiatry, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36584862/'),
  ('now-melatonin-5-mg', 'Efficacy of melatonin and ramelteon for the acute and long-term management of insomnia disorder in adults: A systematic review and meta-analysis', 'Meta-analysis (J Sleep Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37434463/'),
  -- klean-athlete-klean-melatonin
  ('klean-athlete-klean-melatonin', 'Optimizing the Time and Dose of Melatonin as a Sleep-Promoting Drug: A Systematic Review of Randomized Controlled Trials and Dose-Response Meta-Analysis', 'Meta-analysis (J Pineal Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38888087/'),
  ('klean-athlete-klean-melatonin', 'Meta-analysis: melatonin for the treatment of primary sleep disorders', 'Meta-analysis (PLoS One, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23691095/'),
  ('klean-athlete-klean-melatonin', 'Efficacy of melatonin for chronic insomnia: Systematic reviews and meta-analyses', 'Meta-analysis (Sleep Med Rev, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36179487/'),
  ('klean-athlete-klean-melatonin', 'Melatonin for sleep disorders in people with autism: Systematic review and meta-analysis', 'Meta-analysis (Prog Neuropsychopharmacol Biol Psychiatry, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36584862/'),
  ('klean-athlete-klean-melatonin', 'Efficacy of melatonin and ramelteon for the acute and long-term management of insomnia disorder in adults: A systematic review and meta-analysis', 'Meta-analysis (J Sleep Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37434463/'),
  -- life-extension-enhanced-sleep-without-melatonin
  ('life-extension-enhanced-sleep-without-melatonin', 'Does Ashwagandha supplementation have a beneficial effect on the management of anxiety and stress? A systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Phytother Res, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36017529/'),
  ('life-extension-enhanced-sleep-without-melatonin', 'The impact of Alpha-s1 Casein hydrolysate on chronic insomnia: A randomized, double-blind controlled trial', 'Randomised controlled trial (Clin Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39541860/'),
  ('life-extension-enhanced-sleep-without-melatonin', 'Effects of Ashwagandha (Withania Somnifera) on stress and anxiety: A systematic review and meta-analysis', 'Meta-analysis (Explore (NY), 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39348746/'),
  ('life-extension-enhanced-sleep-without-melatonin', 'Efficacy of alphas1-casein hydrolysate on stress-related symptoms in women', 'Randomised controlled trial (Eur J Clin Nutr, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17136040/'),
  ('life-extension-enhanced-sleep-without-melatonin', 'Effect of Ashwagandha (Withania somnifera) extract on sleep: A systematic review and meta-analysis', 'Meta-analysis (PLoS One, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34559859/'),
  -- thorne-glycine
  ('thorne-glycine', 'The effect of glycine administration on the characteristics of physiological systems in human adults: A systematic review', 'Systematic review (Geroscience, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/37851316/'),
  ('thorne-glycine', 'Beneficial effects of glycine (bioglycin) on memory and attention in young and middle-aged adults', 'Randomised controlled trial (J Clin Psychopharmacol, 1999)', 'https://pubmed.ncbi.nlm.nih.gov/10587285/'),
  ('thorne-glycine', 'Dietary glycine improves urine storage symptoms in urology outpatients', 'Clinical trial (J Complement Integr Med, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33793143/'),
  ('thorne-glycine', 'New therapeutic strategy for amino acid medicine: glycine improves the quality of sleep', 'Review (J Pharmacol Sci, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22293292/'),
  ('thorne-glycine', 'Multifarious Beneficial Effect of Nonessential Amino Acid, Glycine: A Review', 'Review (Oxid Med Cell Longev, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28337245/'),
  -- life-extension-glycine-1000-mg
  ('life-extension-glycine-1000-mg', 'The effect of glycine administration on the characteristics of physiological systems in human adults: A systematic review', 'Systematic review (Geroscience, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/37851316/'),
  ('life-extension-glycine-1000-mg', 'Beneficial effects of glycine (bioglycin) on memory and attention in young and middle-aged adults', 'Randomised controlled trial (J Clin Psychopharmacol, 1999)', 'https://pubmed.ncbi.nlm.nih.gov/10587285/'),
  ('life-extension-glycine-1000-mg', 'Dietary glycine improves urine storage symptoms in urology outpatients', 'Clinical trial (J Complement Integr Med, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33793143/'),
  ('life-extension-glycine-1000-mg', 'New therapeutic strategy for amino acid medicine: glycine improves the quality of sleep', 'Review (J Pharmacol Sci, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22293292/'),
  ('life-extension-glycine-1000-mg', 'Multifarious Beneficial Effect of Nonessential Amino Acid, Glycine: A Review', 'Review (Oxid Med Cell Longev, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28337245/'),
  -- pure-encapsulations-glycine
  ('pure-encapsulations-glycine', 'The effect of glycine administration on the characteristics of physiological systems in human adults: A systematic review', 'Systematic review (Geroscience, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/37851316/'),
  ('pure-encapsulations-glycine', 'Beneficial effects of glycine (bioglycin) on memory and attention in young and middle-aged adults', 'Randomised controlled trial (J Clin Psychopharmacol, 1999)', 'https://pubmed.ncbi.nlm.nih.gov/10587285/'),
  ('pure-encapsulations-glycine', 'Dietary glycine improves urine storage symptoms in urology outpatients', 'Clinical trial (J Complement Integr Med, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33793143/'),
  ('pure-encapsulations-glycine', 'New therapeutic strategy for amino acid medicine: glycine improves the quality of sleep', 'Review (J Pharmacol Sci, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22293292/'),
  ('pure-encapsulations-glycine', 'Multifarious Beneficial Effect of Nonessential Amino Acid, Glycine: A Review', 'Review (Oxid Med Cell Longev, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28337245/'),
  -- jarrow-formulas-5-htp-100-mg
  ('jarrow-formulas-5-htp-100-mg', 'The impact of 5-hydroxytryptophan supplementation on sleep quality and gut microbiota composition in older adults: A randomized controlled trial', 'Randomised controlled trial (Clin Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38309227/'),
  ('jarrow-formulas-5-htp-100-mg', 'Effect of 5-Hydroxytryptophan on Fatigue in Quiescent Inflammatory Bowel Disease: A Randomized Controlled Trial', 'Randomised controlled trial (Gastroenterology, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35940251/'),
  ('jarrow-formulas-5-htp-100-mg', 'The Impact of 5-Hydroxytryptophan Supplementation on Cognitive Function and Mood in Singapore Older Adults: A Randomized Controlled Trial', 'Randomised controlled trial (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40944161/'),
  ('jarrow-formulas-5-htp-100-mg', 'Tryptophan-enriched diet or 5-hydroxytryptophan supplementation given in a randomized controlled trial impacts social cognition on a neural and behavioral level', 'Randomised controlled trial (Sci Rep, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34737364/'),
  ('jarrow-formulas-5-htp-100-mg', 'The effect of 5-hydroxytryptophan, a serotonin precursor, on adults with high levels of Attention Deficit Hyperactivity Disorder traits: A randomised, controlled trial', 'Randomised controlled trial (PLoS One, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42160304/'),
  -- swanson-5-htp-50-mg
  ('swanson-5-htp-50-mg', 'The impact of 5-hydroxytryptophan supplementation on sleep quality and gut microbiota composition in older adults: A randomized controlled trial', 'Randomised controlled trial (Clin Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38309227/'),
  ('swanson-5-htp-50-mg', 'Effect of 5-Hydroxytryptophan on Fatigue in Quiescent Inflammatory Bowel Disease: A Randomized Controlled Trial', 'Randomised controlled trial (Gastroenterology, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35940251/'),
  ('swanson-5-htp-50-mg', 'The Impact of 5-Hydroxytryptophan Supplementation on Cognitive Function and Mood in Singapore Older Adults: A Randomized Controlled Trial', 'Randomised controlled trial (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40944161/'),
  ('swanson-5-htp-50-mg', 'Tryptophan-enriched diet or 5-hydroxytryptophan supplementation given in a randomized controlled trial impacts social cognition on a neural and behavioral level', 'Randomised controlled trial (Sci Rep, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34737364/'),
  ('swanson-5-htp-50-mg', 'The effect of 5-hydroxytryptophan, a serotonin precursor, on adults with high levels of Attention Deficit Hyperactivity Disorder traits: A randomised, controlled trial', 'Randomised controlled trial (PLoS One, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42160304/'),
  -- pure-encapsulations-l-tryptophan
  ('pure-encapsulations-l-tryptophan', 'The impact of tryptophan supplementation on sleep quality: a systematic review, meta-analysis, and meta-regression', 'Meta-analysis (Nutr Rev, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/33942088/'),
  ('pure-encapsulations-l-tryptophan', 'A systematic review of the effect of L-tryptophan supplementation on mood and emotional functioning', 'Systematic review (J Diet Suppl, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/32272859/'),
  ('pure-encapsulations-l-tryptophan', 'L-Tryptophan and sleep in healthy man [proceedings]', 'Randomised controlled trial (Br J Clin Pharmacol, 1979)', 'https://pubmed.ncbi.nlm.nih.gov/444369/'),
  ('pure-encapsulations-l-tryptophan', 'Effects of Coenzyme Q10, Tryptophan, and Magnesium Supplementation on Fatigue in Patients with Fibromyalgia - A Randomized Trial', 'Randomised controlled trial (J Diet Suppl, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40151031/'),
  ('pure-encapsulations-l-tryptophan', 'Effects of stress and dietary tryptophan enhancement on craving for alcohol in binge and non-binge heavy drinkers', 'Randomised controlled trial (Behav Pharmacol, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/25036731/'),
  -- life-extension-l-tryptophan-500-mg
  ('life-extension-l-tryptophan-500-mg', 'The impact of tryptophan supplementation on sleep quality: a systematic review, meta-analysis, and meta-regression', 'Meta-analysis (Nutr Rev, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/33942088/'),
  ('life-extension-l-tryptophan-500-mg', 'A systematic review of the effect of L-tryptophan supplementation on mood and emotional functioning', 'Systematic review (J Diet Suppl, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/32272859/'),
  ('life-extension-l-tryptophan-500-mg', 'L-Tryptophan and sleep in healthy man [proceedings]', 'Randomised controlled trial (Br J Clin Pharmacol, 1979)', 'https://pubmed.ncbi.nlm.nih.gov/444369/'),
  ('life-extension-l-tryptophan-500-mg', 'Effects of Coenzyme Q10, Tryptophan, and Magnesium Supplementation on Fatigue in Patients with Fibromyalgia - A Randomized Trial', 'Randomised controlled trial (J Diet Suppl, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40151031/'),
  ('life-extension-l-tryptophan-500-mg', 'Effects of stress and dietary tryptophan enhancement on craving for alcohol in binge and non-binge heavy drinkers', 'Randomised controlled trial (Behav Pharmacol, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/25036731/'),
  -- doctors-best-l-tryptophan-500-mg
  ('doctors-best-l-tryptophan-500-mg', 'The impact of tryptophan supplementation on sleep quality: a systematic review, meta-analysis, and meta-regression', 'Meta-analysis (Nutr Rev, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/33942088/'),
  ('doctors-best-l-tryptophan-500-mg', 'A systematic review of the effect of L-tryptophan supplementation on mood and emotional functioning', 'Systematic review (J Diet Suppl, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/32272859/'),
  ('doctors-best-l-tryptophan-500-mg', 'L-Tryptophan and sleep in healthy man [proceedings]', 'Randomised controlled trial (Br J Clin Pharmacol, 1979)', 'https://pubmed.ncbi.nlm.nih.gov/444369/'),
  ('doctors-best-l-tryptophan-500-mg', 'Effects of Coenzyme Q10, Tryptophan, and Magnesium Supplementation on Fatigue in Patients with Fibromyalgia - A Randomized Trial', 'Randomised controlled trial (J Diet Suppl, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40151031/'),
  ('doctors-best-l-tryptophan-500-mg', 'Effects of stress and dietary tryptophan enhancement on craving for alcohol in binge and non-binge heavy drinkers', 'Randomised controlled trial (Behav Pharmacol, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/25036731/'),
  -- thorne-magnesium-bisglycinate
  ('thorne-magnesium-bisglycinate', 'Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis', 'Meta-analysis (BMC Complement Med Ther, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33865376/'),
  ('thorne-magnesium-bisglycinate', 'Effect of oral magnesium supplementation for relieving leg cramps during pregnancy: A meta-analysis of randomized controlled trials', 'Meta-analysis (Taiwan J Obstet Gynecol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34247796/'),
  ('thorne-magnesium-bisglycinate', 'The Role of Magnesium in Sleep Health: a Systematic Review of Available Literature', 'Systematic review (Biol Trace Elem Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35184264/'),
  ('thorne-magnesium-bisglycinate', 'Does Magnesium Provide a Protective Effect in Crohn''s Disease Remission? A Systematic Review of the Literature', 'Systematic review (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38892595/'),
  ('thorne-magnesium-bisglycinate', 'Magnesium supplementation for the treatment of restless legs syndrome and periodic limb movement disorder: A systematic review', 'Systematic review (Sleep Med Rev, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31678660/'),
  -- now-magnesium-malate-caps
  ('now-magnesium-malate-caps', 'Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis', 'Meta-analysis (BMC Complement Med Ther, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33865376/'),
  ('now-magnesium-malate-caps', 'Effect of oral magnesium supplementation for relieving leg cramps during pregnancy: A meta-analysis of randomized controlled trials', 'Meta-analysis (Taiwan J Obstet Gynecol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34247796/'),
  ('now-magnesium-malate-caps', 'The Role of Magnesium in Sleep Health: a Systematic Review of Available Literature', 'Systematic review (Biol Trace Elem Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35184264/'),
  ('now-magnesium-malate-caps', 'Does Magnesium Provide a Protective Effect in Crohn''s Disease Remission? A Systematic Review of the Literature', 'Systematic review (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38892595/'),
  ('now-magnesium-malate-caps', 'Magnesium supplementation for the treatment of restless legs syndrome and periodic limb movement disorder: A systematic review', 'Systematic review (Sleep Med Rev, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31678660/'),
  -- life-extension-calm-mag
  ('life-extension-calm-mag', 'Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis', 'Meta-analysis (BMC Complement Med Ther, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33865376/'),
  ('life-extension-calm-mag', 'Effect of oral magnesium supplementation for relieving leg cramps during pregnancy: A meta-analysis of randomized controlled trials', 'Meta-analysis (Taiwan J Obstet Gynecol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34247796/'),
  ('life-extension-calm-mag', 'The Role of Magnesium in Sleep Health: a Systematic Review of Available Literature', 'Systematic review (Biol Trace Elem Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35184264/'),
  ('life-extension-calm-mag', 'Does Magnesium Provide a Protective Effect in Crohn''s Disease Remission? A Systematic Review of the Literature', 'Systematic review (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38892595/'),
  ('life-extension-calm-mag', 'Magnesium supplementation for the treatment of restless legs syndrome and periodic limb movement disorder: A systematic review', 'Systematic review (Sleep Med Rev, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31678660/'),
  -- klean-athlete-klean-magnesium
  ('klean-athlete-klean-magnesium', 'Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis', 'Meta-analysis (BMC Complement Med Ther, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33865376/'),
  ('klean-athlete-klean-magnesium', 'Effect of oral magnesium supplementation for relieving leg cramps during pregnancy: A meta-analysis of randomized controlled trials', 'Meta-analysis (Taiwan J Obstet Gynecol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34247796/'),
  ('klean-athlete-klean-magnesium', 'The Role of Magnesium in Sleep Health: a Systematic Review of Available Literature', 'Systematic review (Biol Trace Elem Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35184264/'),
  ('klean-athlete-klean-magnesium', 'Does Magnesium Provide a Protective Effect in Crohn''s Disease Remission? A Systematic Review of the Literature', 'Systematic review (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38892595/'),
  ('klean-athlete-klean-magnesium', 'Magnesium supplementation for the treatment of restless legs syndrome and periodic limb movement disorder: A systematic review', 'Systematic review (Sleep Med Rev, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31678660/'),
  -- swanson-full-spectrum-lavender-flower-400-mg
  ('swanson-full-spectrum-lavender-flower-400-mg', 'Effects of lavender on anxiety: A systematic review and meta-analysis', 'Meta-analysis (Phytomedicine, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31655395/'),
  ('swanson-full-spectrum-lavender-flower-400-mg', 'Efficacy of Silexan in subthreshold anxiety: meta-analysis of randomised, placebo-controlled trials', 'Meta-analysis (Eur Arch Psychiatry Clin Neurosci, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/29150713/'),
  ('swanson-full-spectrum-lavender-flower-400-mg', 'Lavender Oil Preparation (Silexan) for Treating Anxiety: An Updated Meta-Analysis', 'Meta-analysis (J Clin Psychopharmacol, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/27861196/'),
  ('swanson-full-spectrum-lavender-flower-400-mg', 'Efficacy of Silexan in patients with anxiety disorders: a meta-analysis of randomized, placebo-controlled trials', 'Meta-analysis (Eur Arch Psychiatry Clin Neurosci, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36717399/'),
  ('swanson-full-spectrum-lavender-flower-400-mg', 'Effect of anxiolytic drug silexan on sleep - a narrative review', 'Meta-analysis (World J Biol Psychiatry, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36259937/'),
  -- life-extension-optimized-saffron
  ('life-extension-optimized-saffron', 'Effect of Saffron Versus Selective Serotonin Reuptake Inhibitors (SSRIs) in Treatment of Depression and Anxiety: A Meta-analysis of Randomized Controlled Trials', 'Meta-analysis (Nutr Rev, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/38913392/'),
  ('life-extension-optimized-saffron', 'The Efficacy of Saffron in the Treatment of Mild to Moderate Depression: A Meta-analysis', 'Meta-analysis (Planta Med, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30036891/'),
  ('life-extension-optimized-saffron', 'New horizons for the study of saffron (Crocus sativus L.) and its active ingredients in the management of neurological and psychiatric disorders: A systematic review of clinical evidence and mechanisms', 'Meta-analysis (Phytother Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38424688/'),
  ('life-extension-optimized-saffron', 'Crocus Sativus for Insomnia: A Systematic Review and Meta-Analysis', 'Meta-analysis (Int J Environ Res Public Health, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36141931/'),
  ('life-extension-optimized-saffron', 'Effect of saffron on depression, anxiety and mood disorder: a GRADE assessed systematic review and meta-analysis of 34 randomized controlled trials', 'Meta-analysis (Nutr Neurosci, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41693488/'),
  -- life-extension-tart-cherry-with-cherrypure
  ('life-extension-tart-cherry-with-cherrypure', 'Tart Cherry Supplementation and Recovery From Strenuous Exercise: A Systematic Review and Meta-Analysis', 'Meta-analysis (Int J Sport Nutr Exerc Metab, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33440334/'),
  ('life-extension-tart-cherry-with-cherrypure', 'The beneficial effect of tart cherry on plasma levels of inflammatory mediators (not recovery after exercise): A systematic review and meta-analysis on randomized clinical trials', 'Meta-analysis (Complement Ther Med, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35653966/'),
  ('life-extension-tart-cherry-with-cherrypure', 'Effect of tart cherry juice (Prunus cerasus) on melatonin levels and enhanced sleep quality', 'Randomised controlled trial (Eur J Nutr, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22038497/'),
  ('life-extension-tart-cherry-with-cherrypure', 'The effect of tart cherry juice compared to a sports drink on cycling exercise performance, substrate metabolism, and recovery', 'Randomised controlled trial (PLoS One, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39141644/'),
  ('life-extension-tart-cherry-with-cherrypure', 'Impact of Powdered Tart Cherry Supplementation on Performance Recovery Following Repeated Sprint Exercise', 'Randomised controlled trial (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41683264/'),
  -- host-defense-reishi-extract
  ('host-defense-reishi-extract', 'Ganoderma lucidum dry extract supplementation modulates T lymphocyte function in older women', 'Randomised controlled trial (Br J Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38800991/'),
  ('host-defense-reishi-extract', 'Ganoderma lucidum (''Lingzhi''); acute and short-term biomarker response to supplementation', 'Randomised controlled trial (Int J Food Sci Nutr, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/14630595/'),
  ('host-defense-reishi-extract', 'Efficacy of Lingzhi or Reishi Medicinal Mushroom Ganoderma lucidum (Agaricomycetes) Supplementation on Psychological Stress and Selective Fitness Profile Parameters in Female College Students in West Bengal, India', 'Randomised controlled trial (Int J Med Mushrooms, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39241163/'),
  ('host-defense-reishi-extract', 'Safety and efficacy of Ganoderma lucidum (lingzhi) and San Miao San supplementation in patients with rheumatoid arthritis: a double-blind, randomized, placebo-controlled pilot trial', 'Randomised controlled trial (Arthritis Rheum, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17907228/'),
  ('host-defense-reishi-extract', 'Effect of Ganoderma lucidum capsules on T lymphocyte subsets in football players on "living high-training low"', 'Randomised controlled trial (Br J Sports Med, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18048435/'),
  -- host-defense-sleep
  ('host-defense-sleep', 'Passiflora for anxiety disorder', 'Meta-analysis (Cochrane Database Syst Rev, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17253512/'),
  ('host-defense-sleep', 'Ganoderma lucidum dry extract supplementation modulates T lymphocyte function in older women', 'Randomised controlled trial (Br J Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38800991/'),
  ('host-defense-sleep', 'The Acute and Chronic Effects of Lion''s Mane Mushroom Supplementation on Cognitive Function, Stress and Mood in Young Adults: A Double-Blind, Parallel Groups, Pilot Study', 'Randomised controlled trial (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/38004235/'),
  ('host-defense-sleep', 'Passiflora incarnata in Neuropsychiatric Disorders-A Systematic Review', 'Systematic review (Nutrients, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/33352740/'),
  ('host-defense-sleep', 'Ganoderma lucidum (''Lingzhi''); acute and short-term biomarker response to supplementation', 'Randomised controlled trial (Int J Food Sci Nutr, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/14630595/'),
  -- ============================================================ Energy
  -- doctors-best-nmn-12000-400-mg
  ('doctors-best-nmn-12000-400-mg', 'Effects of Nicotinamide Mononucleotide on Glucose and Lipid Metabolism in Adults: A Systematic Review and Meta-analysis of Randomised Controlled Trials', 'Meta-analysis (Curr Diab Rep, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39531138/'),
  ('doctors-best-nmn-12000-400-mg', 'Efficacy of oral nicotinamide mononucleotide supplementation on glucose and lipid metabolism for adults: a systematic review with meta-analysis on randomized controlled trials', 'Meta-analysis (Crit Rev Food Sci Nutr, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39116016/'),
  ('doctors-best-nmn-12000-400-mg', 'Effects of Nicotinamide Mononucleotide Supplementation on Muscle and Liver Functions Among the Middle-aged and Elderly: A Systematic Review and Meta-analysis of Randomized Controlled Trials', 'Meta-analysis (Curr Pharm Biotechnol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39185644/'),
  ('doctors-best-nmn-12000-400-mg', 'The Effect of Nicotinamide Mononucleotide and Riboside on Skeletal Muscle Mass and Function: A Systematic Review and Meta-Analysis', 'Meta-analysis (J Cachexia Sarcopenia Muscle, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40275690/'),
  ('doctors-best-nmn-12000-400-mg', 'Safety and Metabolism-Related Outcomes of Oral Nicotinamide Mononucleotide Supplementation in Adults: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42514320/'),
  -- pure-encapsulations-amino-nr
  ('pure-encapsulations-amino-nr', 'Peri-operative protein or amino acid supplementation for total joint arthroplasty: a systematic review and meta-analysis', 'Meta-analysis (J Orthop Surg Res, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40317042/'),
  ('pure-encapsulations-amino-nr', 'Whey protein, amino acids, and vitamin D supplementation with physical activity increases fat-free mass and strength, functionality, and quality of life and decreases inflammation in sarcopenic elderly', 'Randomised controlled trial (Am J Clin Nutr, 2016)', 'https://pubmed.ncbi.nlm.nih.gov/26864356/'),
  ('pure-encapsulations-amino-nr', 'Dileucine-supplemented essential amino acids support whole-body anabolism after resistance exercise and serum-stimulated cell-based anabolism', 'Randomised controlled trial (J Int Soc Sports Nutr, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41321015/'),
  ('pure-encapsulations-amino-nr', 'Effects of Nutritional Support with a Leucine-Enriched Essential Amino Acid Supplement on Body Composition, Muscle Strength, and Physical Function in Stroke Patients Undergoing Rehabilitation', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39770886/'),
  ('pure-encapsulations-amino-nr', 'Combined resistance exercise and essential amino acid intake enhance follistatin/myostatin ratio and muscle fitness in older women: a randomized controlled trial', 'Randomised controlled trial (J Int Soc Sports Nutr, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41863133/'),
  -- solgar-sublingual-methylcobalamin-b12-5000-mcg
  ('solgar-sublingual-methylcobalamin-b12-5000-mcg', 'Vitamin B12 for cognition', 'Meta-analysis (Cochrane Database Syst Rev, 2003)', 'https://pubmed.ncbi.nlm.nih.gov/12918012/'),
  ('solgar-sublingual-methylcobalamin-b12-5000-mcg', 'Vitamin B-12 in Human Milk: A Systematic Review', 'Systematic review (Adv Nutr, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29846529/'),
  ('solgar-sublingual-methylcobalamin-b12-5000-mcg', 'Vitamin B12 sources in non-animal foods: a systematic review', 'Systematic review (Crit Rev Food Sci Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35343314/'),
  ('solgar-sublingual-methylcobalamin-b12-5000-mcg', 'Vitamin B-12 and the Gastrointestinal Microbiome: A Systematic Review', 'Systematic review (Adv Nutr, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34612492/'),
  ('solgar-sublingual-methylcobalamin-b12-5000-mcg', 'Relationship between vitamin B12 levels and motor development: A systematic review', 'Systematic review (Clin Nutr ESPEN, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38944829/'),
  -- doctors-best-fully-active-b12-1500-mcg
  ('doctors-best-fully-active-b12-1500-mcg', 'Vitamin B12 for cognition', 'Meta-analysis (Cochrane Database Syst Rev, 2003)', 'https://pubmed.ncbi.nlm.nih.gov/12918012/'),
  ('doctors-best-fully-active-b12-1500-mcg', 'Vitamin B-12 in Human Milk: A Systematic Review', 'Systematic review (Adv Nutr, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29846529/'),
  ('doctors-best-fully-active-b12-1500-mcg', 'Vitamin B12 sources in non-animal foods: a systematic review', 'Systematic review (Crit Rev Food Sci Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35343314/'),
  ('doctors-best-fully-active-b12-1500-mcg', 'Vitamin B-12 and the Gastrointestinal Microbiome: A Systematic Review', 'Systematic review (Adv Nutr, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34612492/'),
  ('doctors-best-fully-active-b12-1500-mcg', 'Relationship between vitamin B12 levels and motor development: A systematic review', 'Systematic review (Clin Nutr ESPEN, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38944829/'),
  -- nature-made-vitamin-b-12-500-mcg
  ('nature-made-vitamin-b-12-500-mcg', 'Vitamin B12 for cognition', 'Meta-analysis (Cochrane Database Syst Rev, 2003)', 'https://pubmed.ncbi.nlm.nih.gov/12918012/'),
  ('nature-made-vitamin-b-12-500-mcg', 'Vitamin B-12 in Human Milk: A Systematic Review', 'Systematic review (Adv Nutr, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29846529/'),
  ('nature-made-vitamin-b-12-500-mcg', 'Vitamin B12 sources in non-animal foods: a systematic review', 'Systematic review (Crit Rev Food Sci Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35343314/'),
  ('nature-made-vitamin-b-12-500-mcg', 'Vitamin B-12 and the Gastrointestinal Microbiome: A Systematic Review', 'Systematic review (Adv Nutr, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34612492/'),
  ('nature-made-vitamin-b-12-500-mcg', 'Relationship between vitamin B12 levels and motor development: A systematic review', 'Systematic review (Clin Nutr ESPEN, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38944829/'),
  -- thorne-basic-b-complex
  ('thorne-basic-b-complex', 'Effects of Vitamin B12 Supplementation on Cognitive Function, Depressive Symptoms, and Fatigue: A Systematic Review, Meta-Analysis, and Meta-Regression', 'Meta-analysis (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33809274/'),
  ('thorne-basic-b-complex', 'A Systematic Review and Meta-Analysis of B Vitamin Supplementation on Depressive Symptoms, Anxiety, and Stress: Effects on Healthy and ''At-Risk'' Individuals', 'Meta-analysis (Nutrients, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31527485/'),
  ('thorne-basic-b-complex', 'Effect of B-vitamin supplementation on stroke: a meta-analysis of randomized controlled trials', 'Meta-analysis (PLoS One, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/24282609/'),
  ('thorne-basic-b-complex', 'Potential mental and physical benefits of supplementation with a high-dose, B-complex multivitamin/mineral supplement: What is the evidence?', 'Systematic review (Nutr Hosp, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34530623/'),
  ('thorne-basic-b-complex', 'The impact of essential fatty acid, B vitamins, vitamin C, magnesium and zinc supplementation on stress levels in women: a systematic review', 'Systematic review (JBI Database System Rev Implement Rep, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28178022/'),
  -- doctors-best-fully-active-b-complex
  ('doctors-best-fully-active-b-complex', 'Effects of Vitamin B12 Supplementation on Cognitive Function, Depressive Symptoms, and Fatigue: A Systematic Review, Meta-Analysis, and Meta-Regression', 'Meta-analysis (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33809274/'),
  ('doctors-best-fully-active-b-complex', 'A Systematic Review and Meta-Analysis of B Vitamin Supplementation on Depressive Symptoms, Anxiety, and Stress: Effects on Healthy and ''At-Risk'' Individuals', 'Meta-analysis (Nutrients, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31527485/'),
  ('doctors-best-fully-active-b-complex', 'Effect of B-vitamin supplementation on stroke: a meta-analysis of randomized controlled trials', 'Meta-analysis (PLoS One, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/24282609/'),
  ('doctors-best-fully-active-b-complex', 'Potential mental and physical benefits of supplementation with a high-dose, B-complex multivitamin/mineral supplement: What is the evidence?', 'Systematic review (Nutr Hosp, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34530623/'),
  ('doctors-best-fully-active-b-complex', 'The impact of essential fatty acid, B vitamins, vitamin C, magnesium and zinc supplementation on stress levels in women: a systematic review', 'Systematic review (JBI Database System Rev Implement Rep, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28178022/'),
  -- nature-made-super-b-complex
  ('nature-made-super-b-complex', 'Effects of Vitamin B12 Supplementation on Cognitive Function, Depressive Symptoms, and Fatigue: A Systematic Review, Meta-Analysis, and Meta-Regression', 'Meta-analysis (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33809274/'),
  ('nature-made-super-b-complex', 'A Systematic Review and Meta-Analysis of B Vitamin Supplementation on Depressive Symptoms, Anxiety, and Stress: Effects on Healthy and ''At-Risk'' Individuals', 'Meta-analysis (Nutrients, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31527485/'),
  ('nature-made-super-b-complex', 'Effect of B-vitamin supplementation on stroke: a meta-analysis of randomized controlled trials', 'Meta-analysis (PLoS One, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/24282609/'),
  ('nature-made-super-b-complex', 'Potential mental and physical benefits of supplementation with a high-dose, B-complex multivitamin/mineral supplement: What is the evidence?', 'Systematic review (Nutr Hosp, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34530623/'),
  ('nature-made-super-b-complex', 'The impact of essential fatty acid, B vitamins, vitamin C, magnesium and zinc supplementation on stress levels in women: a systematic review', 'Systematic review (JBI Database System Rev Implement Rep, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28178022/'),
  -- klean-athlete-klean-b-complex
  ('klean-athlete-klean-b-complex', 'Effects of Vitamin B12 Supplementation on Cognitive Function, Depressive Symptoms, and Fatigue: A Systematic Review, Meta-Analysis, and Meta-Regression', 'Meta-analysis (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33809274/'),
  ('klean-athlete-klean-b-complex', 'A Systematic Review and Meta-Analysis of B Vitamin Supplementation on Depressive Symptoms, Anxiety, and Stress: Effects on Healthy and ''At-Risk'' Individuals', 'Meta-analysis (Nutrients, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31527485/'),
  ('klean-athlete-klean-b-complex', 'Effect of B-vitamin supplementation on stroke: a meta-analysis of randomized controlled trials', 'Meta-analysis (PLoS One, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/24282609/'),
  ('klean-athlete-klean-b-complex', 'Potential mental and physical benefits of supplementation with a high-dose, B-complex multivitamin/mineral supplement: What is the evidence?', 'Systematic review (Nutr Hosp, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34530623/'),
  ('klean-athlete-klean-b-complex', 'The impact of essential fatty acid, B vitamins, vitamin C, magnesium and zinc supplementation on stress levels in women: a systematic review', 'Systematic review (JBI Database System Rev Implement Rep, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28178022/'),
  -- thorne-riboflavin-5-phosphate
  ('thorne-riboflavin-5-phosphate', 'Effect of Vitamin B2 supplementation on migraine prophylaxis: a systematic review and meta-analysis', 'Meta-analysis (Nutr Neurosci, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/33779525/'),
  ('thorne-riboflavin-5-phosphate', 'Studies of biomarker responses to intervention with riboflavin: a systematic review', 'Systematic review (Am J Clin Nutr, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19403631/'),
  ('thorne-riboflavin-5-phosphate', 'Improvement of migraine symptoms with a proprietary supplement containing riboflavin, magnesium and Q10: a randomized, placebo-controlled, double-blind, multicenter trial', 'Randomised controlled trial (J Headache Pain, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25916335/'),
  ('thorne-riboflavin-5-phosphate', 'Riboflavin supplementation and preeclampsia', 'Randomised controlled trial (Int J Gynaecol Obstet, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16545814/'),
  ('thorne-riboflavin-5-phosphate', 'Impact of Vitamin B1 and Vitamin B2 Supplementation on Anxiety, Stress, and Sleep Quality: A Randomized, Double-Blind, Placebo-Controlled Trial', 'Randomised controlled trial (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40507089/'),
  -- now-b-2-100-mg
  ('now-b-2-100-mg', 'Effect of Vitamin B2 supplementation on migraine prophylaxis: a systematic review and meta-analysis', 'Meta-analysis (Nutr Neurosci, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/33779525/'),
  ('now-b-2-100-mg', 'Studies of biomarker responses to intervention with riboflavin: a systematic review', 'Systematic review (Am J Clin Nutr, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19403631/'),
  ('now-b-2-100-mg', 'Improvement of migraine symptoms with a proprietary supplement containing riboflavin, magnesium and Q10: a randomized, placebo-controlled, double-blind, multicenter trial', 'Randomised controlled trial (J Headache Pain, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25916335/'),
  ('now-b-2-100-mg', 'Riboflavin supplementation and preeclampsia', 'Randomised controlled trial (Int J Gynaecol Obstet, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16545814/'),
  ('now-b-2-100-mg', 'Impact of Vitamin B1 and Vitamin B2 Supplementation on Anxiety, Stress, and Sleep Quality: A Randomized, Double-Blind, Placebo-Controlled Trial', 'Randomised controlled trial (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40507089/'),
  -- thorne-pantethine
  ('thorne-pantethine', 'Physiological and performance responses to supplementation with thiamin and pantothenic acid derivatives', 'Randomised controlled trial (Eur J Appl Physiol Occup Physiol, 1998)', 'https://pubmed.ncbi.nlm.nih.gov/9650731/'),
  ('thorne-pantethine', 'Effect of pantothenic acid and ascorbic acid supplementation on human skin wound healing process. A double-blind, prospective and randomized trial', 'Randomised controlled trial (Eur Surg Res, 1995)', 'https://pubmed.ncbi.nlm.nih.gov/7781653/'),
  ('thorne-pantethine', 'Pantothenic acid in the treatment of osteoarthrosis', 'Clinical trial (Rheumatol Phys Med, 1971)', 'https://pubmed.ncbi.nlm.nih.gov/4927866/'),
  ('thorne-pantethine', 'The effects of pantethine on fatty liver and fat distribution', 'Clinical trial (J Atheroscler Thromb, 2000)', 'https://pubmed.ncbi.nlm.nih.gov/11425046/'),
  ('thorne-pantethine', 'Pilot trial on the efficacy and safety of pantethine in children with pantothenate kinase-associated neurodegeneration: a single-arm, open-label study', 'Clinical trial (Orphanet J Rare Dis, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32928263/'),
  -- pure-encapsulations-pantothenic-acid
  ('pure-encapsulations-pantothenic-acid', 'Physiological and performance responses to supplementation with thiamin and pantothenic acid derivatives', 'Randomised controlled trial (Eur J Appl Physiol Occup Physiol, 1998)', 'https://pubmed.ncbi.nlm.nih.gov/9650731/'),
  ('pure-encapsulations-pantothenic-acid', 'Effect of pantothenic acid and ascorbic acid supplementation on human skin wound healing process. A double-blind, prospective and randomized trial', 'Randomised controlled trial (Eur Surg Res, 1995)', 'https://pubmed.ncbi.nlm.nih.gov/7781653/'),
  ('pure-encapsulations-pantothenic-acid', 'Pantothenic acid in the treatment of osteoarthrosis', 'Clinical trial (Rheumatol Phys Med, 1971)', 'https://pubmed.ncbi.nlm.nih.gov/4927866/'),
  ('pure-encapsulations-pantothenic-acid', 'The effects of pantethine on fatty liver and fat distribution', 'Clinical trial (J Atheroscler Thromb, 2000)', 'https://pubmed.ncbi.nlm.nih.gov/11425046/'),
  ('pure-encapsulations-pantothenic-acid', 'Pilot trial on the efficacy and safety of pantethine in children with pantothenate kinase-associated neurodegeneration: a single-arm, open-label study', 'Clinical trial (Orphanet J Rare Dis, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32928263/'),
  -- thorne-acetyl-l-carnitine-500-mg
  ('thorne-acetyl-l-carnitine-500-mg', 'l-carnitine and l-acetylcarnitine supplementation for idiopathic male infertility', 'Meta-analysis (Reprod Fertil, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/35128424/'),
  ('thorne-acetyl-l-carnitine-500-mg', 'Acetyl-L-carnitine for the treatment of diabetic peripheral neuropathy', 'Meta-analysis (Cochrane Database Syst Rev, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31201734/'),
  ('thorne-acetyl-l-carnitine-500-mg', 'Acetyl-L-Carnitine Supplementation and the Treatment of Depressive Symptoms: A Systematic Review and Meta-Analysis', 'Meta-analysis (Psychosom Med, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29076953/'),
  ('thorne-acetyl-l-carnitine-500-mg', 'The supplementation of acetyl-L-carnitine decreases fatigue and increases quality of life in patients with hepatitis C treated with pegylated interferon-α 2b plus ribavirin', 'Randomised controlled trial (J Interferon Cytokine Res, 2011)', 'https://pubmed.ncbi.nlm.nih.gov/21923249/'),
  ('thorne-acetyl-l-carnitine-500-mg', 'Combined Rehabilitation with Alpha Lipoic Acid, Acetyl-L-Carnitine, Resveratrol, and Cholecalciferolin Discogenic Sciatica in Young People: A Randomized Clinical Trial', 'Randomised controlled trial (Medicina (Kaunas), 2023)', 'https://pubmed.ncbi.nlm.nih.gov/38138300/'),
  -- jarrow-formulas-l-carnitine-500-mg
  ('jarrow-formulas-l-carnitine-500-mg', 'The Effect of L-Carnitine Supplementation on Exercise-Induced Muscle Damage: A Systematic Review and Meta-Analysis of Randomized Clinical Trials', 'Meta-analysis (J Am Coll Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32154768/'),
  ('jarrow-formulas-l-carnitine-500-mg', 'Does L-carnitine supplementation affect serum levels of enzymes mainly produced by liver? A systematic review and meta-analysis of randomized controlled clinical trials', 'Meta-analysis (Eur J Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31385062/'),
  ('jarrow-formulas-l-carnitine-500-mg', 'Effects of L-carnitine on dialysis-related hypotension and muscle cramps: a meta-analysis', 'Meta-analysis (Am J Kidney Dis, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18706751/'),
  ('jarrow-formulas-l-carnitine-500-mg', 'Efficacy and Effectiveness of Carnitine Supplementation for Cancer-Related Fatigue: A Systematic Literature Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/29112178/'),
  ('jarrow-formulas-l-carnitine-500-mg', 'The bright and the dark sides of L-carnitine supplementation: a systematic review', 'Systematic review (J Int Soc Sports Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32958033/'),
  -- life-extension-acetyl-l-carnitine-arginate
  ('life-extension-acetyl-l-carnitine-arginate', 'l-carnitine and l-acetylcarnitine supplementation for idiopathic male infertility', 'Meta-analysis (Reprod Fertil, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/35128424/'),
  ('life-extension-acetyl-l-carnitine-arginate', 'Acetyl-L-carnitine for the treatment of diabetic peripheral neuropathy', 'Meta-analysis (Cochrane Database Syst Rev, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31201734/'),
  ('life-extension-acetyl-l-carnitine-arginate', 'Acetyl-L-Carnitine Supplementation and the Treatment of Depressive Symptoms: A Systematic Review and Meta-Analysis', 'Meta-analysis (Psychosom Med, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29076953/'),
  ('life-extension-acetyl-l-carnitine-arginate', 'The supplementation of acetyl-L-carnitine decreases fatigue and increases quality of life in patients with hepatitis C treated with pegylated interferon-α 2b plus ribavirin', 'Randomised controlled trial (J Interferon Cytokine Res, 2011)', 'https://pubmed.ncbi.nlm.nih.gov/21923249/'),
  ('life-extension-acetyl-l-carnitine-arginate', 'Combined Rehabilitation with Alpha Lipoic Acid, Acetyl-L-Carnitine, Resveratrol, and Cholecalciferolin Discogenic Sciatica in Young People: A Randomized Clinical Trial', 'Randomised controlled trial (Medicina (Kaunas), 2023)', 'https://pubmed.ncbi.nlm.nih.gov/38138300/'),
  -- life-extension-d-ribose-powder
  ('life-extension-d-ribose-powder', 'Effect of ribose supplementation on resynthesis of adenine nucleotides after intense intermittent training in humans', 'Randomised controlled trial (Am J Physiol Regul Integr Comp Physiol, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/14660478/'),
  ('life-extension-d-ribose-powder', 'Effects of ribose supplementation prior to and during intense exercise on anaerobic capacity and metabolic markers', 'Randomised controlled trial (Int J Sport Nutr Exerc Metab, 2005)', 'https://pubmed.ncbi.nlm.nih.gov/16521849/'),
  ('life-extension-d-ribose-powder', 'Effects of oral D-ribose supplementation on anaerobic capacity and selected metabolic markers in healthy males', 'Randomised controlled trial (Int J Sport Nutr Exerc Metab, 2003)', 'https://pubmed.ncbi.nlm.nih.gov/12660407/'),
  ('life-extension-d-ribose-powder', 'A Combination of Nicotinamide and D-Ribose (RiaGev) Is Safe and Effective to Increase NAD(+) Metabolome in Healthy Middle-Aged Adults: A Randomized, Triple-Blind, Placebo-Controlled, Cross-Over Pilot Clinical Trial', 'Randomised controlled trial (Nutrients, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35684021/'),
  ('life-extension-d-ribose-powder', 'Effect of D-ribose supplementation on delayed onset muscle soreness induced by plyometric exercise in college students', 'Randomised controlled trial (J Int Soc Sports Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32778175/'),
  -- doctors-best-high-absorption-coq10-100-mg
  ('doctors-best-high-absorption-coq10-100-mg', 'Effects of Coenzyme Q10 on Statin-Induced Myopathy: An Updated Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (J Am Heart Assoc, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/30371340/'),
  ('doctors-best-high-absorption-coq10-100-mg', 'Effects of coenzyme Q10 supplementation on myopathy in statin-treated patients: a systematic review and meta-analysis', 'Meta-analysis (J Nutr Sci, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41158831/'),
  ('doctors-best-high-absorption-coq10-100-mg', 'Effects of coenzyme Q10 supplementation on statin-induced myopathy: a meta-analysis of randomized controlled trials', 'Meta-analysis (Ir J Med Sci, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/33999383/'),
  ('doctors-best-high-absorption-coq10-100-mg', 'Effect of Coenzyme Q10 on statin-associated myalgia and adherence to statin therapy: A systematic review and meta-analysis', 'Meta-analysis (Atherosclerosis, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32179207/'),
  ('doctors-best-high-absorption-coq10-100-mg', 'The effects of coenzyme Q10 supplementation on biomarkers of exercise-induced muscle damage, physical performance, and oxidative stress: A GRADE-assessed systematic review and dose-response meta-analysis of randomized controlled trials', 'Meta-analysis (Clin Nutr ESPEN, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38479900/'),
  -- jarrow-formulas-qh-absorb-200-mg
  ('jarrow-formulas-qh-absorb-200-mg', 'Effects of Coenzyme Q10 on Statin-Induced Myopathy: An Updated Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (J Am Heart Assoc, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/30371340/'),
  ('jarrow-formulas-qh-absorb-200-mg', 'Effects of coenzyme Q10 supplementation on myopathy in statin-treated patients: a systematic review and meta-analysis', 'Meta-analysis (J Nutr Sci, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41158831/'),
  ('jarrow-formulas-qh-absorb-200-mg', 'Effects of coenzyme Q10 supplementation on statin-induced myopathy: a meta-analysis of randomized controlled trials', 'Meta-analysis (Ir J Med Sci, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/33999383/'),
  ('jarrow-formulas-qh-absorb-200-mg', 'Effect of Coenzyme Q10 on statin-associated myalgia and adherence to statin therapy: A systematic review and meta-analysis', 'Meta-analysis (Atherosclerosis, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32179207/'),
  ('jarrow-formulas-qh-absorb-200-mg', 'The effects of coenzyme Q10 supplementation on biomarkers of exercise-induced muscle damage, physical performance, and oxidative stress: A GRADE-assessed systematic review and dose-response meta-analysis of randomized controlled trials', 'Meta-analysis (Clin Nutr ESPEN, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38479900/'),
  -- solgar-megasorb-coq-10-100-mg
  ('solgar-megasorb-coq-10-100-mg', 'Effects of Coenzyme Q10 on Statin-Induced Myopathy: An Updated Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (J Am Heart Assoc, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/30371340/'),
  ('solgar-megasorb-coq-10-100-mg', 'Effects of coenzyme Q10 supplementation on myopathy in statin-treated patients: a systematic review and meta-analysis', 'Meta-analysis (J Nutr Sci, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41158831/'),
  ('solgar-megasorb-coq-10-100-mg', 'Effects of coenzyme Q10 supplementation on statin-induced myopathy: a meta-analysis of randomized controlled trials', 'Meta-analysis (Ir J Med Sci, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/33999383/'),
  ('solgar-megasorb-coq-10-100-mg', 'Effect of Coenzyme Q10 on statin-associated myalgia and adherence to statin therapy: A systematic review and meta-analysis', 'Meta-analysis (Atherosclerosis, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32179207/'),
  ('solgar-megasorb-coq-10-100-mg', 'The effects of coenzyme Q10 supplementation on biomarkers of exercise-induced muscle damage, physical performance, and oxidative stress: A GRADE-assessed systematic review and dose-response meta-analysis of randomized controlled trials', 'Meta-analysis (Clin Nutr ESPEN, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38479900/'),
  -- jarrow-formulas-pqq-20-mg
  ('jarrow-formulas-pqq-20-mg', 'Effect of Dietary Pyrroloquinoline Quinone Disodium Salt on Cognitive Function in Healthy Volunteers: A Randomized, Double-Blind, Placebo-Controlled, Parallel-Group Study', 'Randomised controlled trial (J Am Nutr Assoc, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34415830/'),
  ('jarrow-formulas-pqq-20-mg', 'The impact of six-week dihydrogen-pyrroloquinoline quinone supplementation on mitochondrial biomarkers, brain metabolism, and cognition in elderly individuals with mild cognitive impairment: a randomized controlled trial', 'Randomised controlled trial (J Nutr Health Aging, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38908296/'),
  ('jarrow-formulas-pqq-20-mg', 'Consumption of Sylimarin, Pyrroloquinoline Quinone Sodium Salt and Myricetin: Effects on Alcohol Levels and Markers of Oxidative Stress-A Pilot Study', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39275279/'),
  ('jarrow-formulas-pqq-20-mg', 'The effects of pyrroloquinoline quinone and nicotinamide mononucleotide supplementation on interoception following acute exhaustive exercise: a randomised, double-blind, placebo-controlled study', 'Randomised controlled trial (Sci Rep, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41651893/'),
  ('jarrow-formulas-pqq-20-mg', 'Effects of Pyrroloquinoline Quinone (PQQ) Supplementation on Aerobic Exercise Performance and Indices of Mitochondrial Biogenesis in Untrained Men', 'Randomised controlled trial (J Am Coll Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31860387/'),
  -- doctors-best-stabilized-r-lipoic-acid-100-mg
  ('doctors-best-stabilized-r-lipoic-acid-100-mg', 'Alpha Lipoic Acid Supplementation and Iron Homeostasis: A Comprehensive Systematic Review and Meta-Analysis of Randomized Controlled Clinical Trials', 'Meta-analysis (Int J Vitam Nutr Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/40134249/'),
  ('doctors-best-stabilized-r-lipoic-acid-100-mg', 'An updated systematic review and dose-response meta-analysis of the randomized controlled trials on the effects of alpha-lipoic acid supplementation on inflammatory biomarkers', 'Meta-analysis (Int J Vitam Nutr Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/33827267/'),
  ('doctors-best-stabilized-r-lipoic-acid-100-mg', 'Alpha-lipoic acid supplement in obesity treatment: A systematic review and meta-analysis of clinical trials', 'Meta-analysis (Clin Nutr, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/28629898/'),
  ('doctors-best-stabilized-r-lipoic-acid-100-mg', 'Effect of alpha-lipoic acid supplementation on lipid profile: A systematic review and meta-analysis of controlled clinical trials', 'Meta-analysis (Nutrition, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30471524/'),
  ('doctors-best-stabilized-r-lipoic-acid-100-mg', 'Effects of Alpha-Lipoic Acid Supplementation on Weight Loss, Inflammatory, Lipid, and Hematological Levels in Patients With Chronic Kidney Disease: A Systematic Review and Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (J Ren Nutr, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39413860/'),
  -- pure-encapsulations-alpha-lipoic-acid-600-mg
  ('pure-encapsulations-alpha-lipoic-acid-600-mg', 'Alpha Lipoic Acid Supplementation and Iron Homeostasis: A Comprehensive Systematic Review and Meta-Analysis of Randomized Controlled Clinical Trials', 'Meta-analysis (Int J Vitam Nutr Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/40134249/'),
  ('pure-encapsulations-alpha-lipoic-acid-600-mg', 'An updated systematic review and dose-response meta-analysis of the randomized controlled trials on the effects of alpha-lipoic acid supplementation on inflammatory biomarkers', 'Meta-analysis (Int J Vitam Nutr Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/33827267/'),
  ('pure-encapsulations-alpha-lipoic-acid-600-mg', 'Alpha-lipoic acid supplement in obesity treatment: A systematic review and meta-analysis of clinical trials', 'Meta-analysis (Clin Nutr, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/28629898/'),
  ('pure-encapsulations-alpha-lipoic-acid-600-mg', 'Effect of alpha-lipoic acid supplementation on lipid profile: A systematic review and meta-analysis of controlled clinical trials', 'Meta-analysis (Nutrition, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30471524/'),
  ('pure-encapsulations-alpha-lipoic-acid-600-mg', 'Effects of Alpha-Lipoic Acid Supplementation on Weight Loss, Inflammatory, Lipid, and Hematological Levels in Patients With Chronic Kidney Disease: A Systematic Review and Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (J Ren Nutr, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39413860/'),
  -- host-defense-cordyceps
  ('host-defense-cordyceps', 'Cordyceps Sinensis (CordyMax Cs-4) supplementation does not improve endurance exercise performance', 'Randomised controlled trial (Int J Sport Nutr Exerc Metab, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/15118196/'),
  ('host-defense-cordyceps', 'Cordyceps sinensis- and Rhodiola rosea-based supplementation in male cyclists and its effect on muscle tissue oxygen saturation', 'Randomised controlled trial (J Strength Cond Res, 2005)', 'https://pubmed.ncbi.nlm.nih.gov/15903375/'),
  ('host-defense-cordyceps', 'Effects of Concurrent Training and a Multi-Ingredient Performance Supplement Containing Rhodiola rosea and Cordyceps sinensis on Body Composition, Performance, and Health in Active Men', 'Randomised controlled trial (J Diet Suppl, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33078636/'),
  ('host-defense-cordyceps', 'Acute Cordyceps militaris supplementation and elevated resting oxygen uptake with faster reaction times: A randomized crossover trial', 'Randomised controlled trial (PLoS One, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42455764/'),
  ('host-defense-cordyceps', 'Effect of Cs-4 (Cordyceps sinensis) on exercise performance in healthy older subjects: a double-blind, placebo-controlled trial', 'Randomised controlled trial (J Altern Complement Med, 2010)', 'https://pubmed.ncbi.nlm.nih.gov/20804368/'),
  -- host-defense-chaga-extract
  ('host-defense-chaga-extract', 'Review on Chaga Medicinal Mushroom, Inonotus obliquus (Higher Basidiomycetes): Realm of Medicinal Applications and Approaches on Estimating its Resource Potential', 'Review (Int J Med Mushrooms, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25746615/'),
  ('host-defense-chaga-extract', 'Progress of research on Inonotus obliquus', 'Review (Chin J Integr Med, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19407959/'),
  ('host-defense-chaga-extract', 'The pharmacological potential and possible molecular mechanisms of action of Inonotus obliquus from preclinical studies', 'Review (Phytother Res, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31209936/'),
  ('host-defense-chaga-extract', 'Inonotus obliquus Polysaccharides: Preparation, Structural Characteristics, Structure-Activity Relationships, Biological Activities and Applications', 'Review (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41978174/'),
  ('host-defense-chaga-extract', 'Progress on understanding the anticancer mechanisms of medicinal mushroom: inonotus obliquus', 'Review (Asian Pac J Cancer Prev, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23679238/'),
  -- now-maca-500-mg
  ('now-maca-500-mg', 'Effects of Maca (Lepidium meyenii Walp.) on Physical Performance in Animals and Humans: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39796542/'),
  ('now-maca-500-mg', 'The Impact of Lepidium meyenii (MACA) Supplementation on Basketball-related Performance and Antifatigue Ability: A Double-blind Crossover Study', 'Randomised controlled trial (J Physiol Investig, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40960048/'),
  ('now-maca-500-mg', 'Maca (Lepidium meyenii) and yacon (Smallanthus sonchifolius) in combination with silymarin as food supplements: in vivo safety assessment', 'Randomised controlled trial (Food Chem Toxicol, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18054420/'),
  ('now-maca-500-mg', 'Enhancement of Interferon-γ Secretion by Lepidium meyenii Extract Supplementation After Exhaustive Endurance Exercise in Healthy Men: A Double-blind, Placebo-controlled Trial', 'Randomised controlled trial (Int J Med Sci, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39781531/'),
  ('now-maca-500-mg', 'Subjective effects of Lepidium meyenii (Maca) extract on well-being and sexual performances in patients with mild erectile dysfunction: a randomised, double-blind clinical trial', 'Randomised controlled trial (Andrologia, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19260845/'),
  -- pure-encapsulations-maca-3
  ('pure-encapsulations-maca-3', 'Effects of Maca (Lepidium meyenii Walp.) on Physical Performance in Animals and Humans: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39796542/'),
  ('pure-encapsulations-maca-3', 'The Impact of Lepidium meyenii (MACA) Supplementation on Basketball-related Performance and Antifatigue Ability: A Double-blind Crossover Study', 'Randomised controlled trial (J Physiol Investig, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40960048/'),
  ('pure-encapsulations-maca-3', 'Maca (Lepidium meyenii) and yacon (Smallanthus sonchifolius) in combination with silymarin as food supplements: in vivo safety assessment', 'Randomised controlled trial (Food Chem Toxicol, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18054420/'),
  ('pure-encapsulations-maca-3', 'Enhancement of Interferon-γ Secretion by Lepidium meyenii Extract Supplementation After Exhaustive Endurance Exercise in Healthy Men: A Double-blind, Placebo-controlled Trial', 'Randomised controlled trial (Int J Med Sci, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39781531/'),
  ('pure-encapsulations-maca-3', 'Subjective effects of Lepidium meyenii (Maca) extract on well-being and sexual performances in patients with mild erectile dysfunction: a randomised, double-blind clinical trial', 'Randomised controlled trial (Andrologia, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19260845/'),
  -- bulksupplements-astragalus-extract
  ('bulksupplements-astragalus-extract', 'Efficacy and safety of astragalus polysaccharides in patients with malignant tumors: A systematic review and meta-analysis', 'Meta-analysis (Naunyn Schmiedebergs Arch Pharmacol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40208321/'),
  ('bulksupplements-astragalus-extract', 'Effects of Astragalus membranaceus and Panax notoginseng Saponins Extract on the Pharmacokinetics of Whey Protein Absorption, Intestinal Permeability, and Muscle Function: A Pilot Study', 'Randomised controlled trial (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41683325/'),
  ('bulksupplements-astragalus-extract', 'Effects of Astragalus Extract Mixture HT042 on Height Growth in Children with Mild Short Stature: A Multicenter Randomized Controlled Trial', 'Randomised controlled trial (Phytother Res, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29130588/'),
  ('bulksupplements-astragalus-extract', 'Standardized astragalus extract for attenuation of the immunosuppression induced by strenuous physical exercise: randomized controlled trial', 'Randomised controlled trial (J Int Soc Sports Nutr, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34271953/'),
  ('bulksupplements-astragalus-extract', 'Astragalus membranaceus Modulates Inflammatory Markers Without Enhancing Muscle Function Following Intensified Resistance Training', 'Randomised controlled trial (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42197058/'),
  -- solgar-earth-source-fermented-koji-iron-27-mg
  ('solgar-earth-source-fermented-koji-iron-27-mg', 'Daily oral iron supplementation during pregnancy', 'Meta-analysis (Cochrane Database Syst Rev, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39145520/'),
  ('solgar-earth-source-fermented-koji-iron-27-mg', 'The effects of oral ferrous bisglycinate supplementation on hemoglobin and ferritin concentrations in adults and children: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Nutr Rev, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36728680/'),
  ('solgar-earth-source-fermented-koji-iron-27-mg', 'Daily oral iron supplementation during pregnancy', 'Meta-analysis (Cochrane Database Syst Rev, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/26198451/'),
  ('solgar-earth-source-fermented-koji-iron-27-mg', 'Optimal dose and duration of iron supplementation for treating iron deficiency anaemia in children and adolescents: A systematic review and meta-analysis', 'Meta-analysis (PLoS One, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39951396/'),
  ('solgar-earth-source-fermented-koji-iron-27-mg', 'Daily iron supplementation for improving anaemia, iron status and health in menstruating women', 'Meta-analysis (Cochrane Database Syst Rev, 2016)', 'https://pubmed.ncbi.nlm.nih.gov/27087396/'),
  -- klean-athlete-klean-electrolytes
  ('klean-athlete-klean-electrolytes', 'Water and electrolyte requirements for exercise', 'Review (Clin Sports Med, 1999)', 'https://pubmed.ncbi.nlm.nih.gov/10410838/'),
  ('klean-athlete-klean-electrolytes', 'Fluid and electrolyte supplementation for exercise heat stress', 'Review (Am J Clin Nutr, 2000)', 'https://pubmed.ncbi.nlm.nih.gov/10919961/'),
  ('klean-athlete-klean-electrolytes', 'Carbohydrate, fluid, and electrolyte requirements of the soccer player: a review', 'Review (Int J Sport Nutr, 1994)', 'https://pubmed.ncbi.nlm.nih.gov/7987358/'),
  ('klean-athlete-klean-electrolytes', 'Electrolyte Beverage Intake to Promote Hydration and Maintain Kidney Function in Guatemalan Sugarcane Workers Laboring in Hot Conditions', 'Clinical trial (J Occup Environ Med, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/33003044/'),
  ('klean-athlete-klean-electrolytes', 'Water, electrolytes, vitamins and trace elements - Guidelines on Parenteral Nutrition, Chapter 7', 'Review (Ger Med Sci, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/20049067/')
) as v(slug, title, meta, url)
join public.glossary g on g.slug = v.slug
where not exists (
  select 1 from public.glossary_research r
  where r.glossary_id = g.id and r.url = v.url
);

-- ═══════════ 0023_papers_part_two ═══════════
-- Papers, part two: the Focus, Training and Immunity & gut products.
--
-- 440 `glossary_research` rows across the 88 products migration 0021
-- inserts for those three sections, drawn from 76 ingredient groups and
-- 370 distinct PubMed records.
--
-- WHERE THESE CAME FROM. `scripts/fetch_papers.py` queries the PubMed
-- E-utilities API — `esearch` for PMIDs, `esummary` for title, journal, year
-- and publication type — and writes `scripts/papers_part_two.json`. Every title,
-- journal and year below is copied from that file verbatim. Nothing here was
-- written from memory and nothing was adjusted to read better; where a title
-- is odd (`Is aura around citicoline fading? A systemic review`) that is what
-- the record says. Re-run the script to regenerate this file.
--
-- SEARCHED ON THE INGREDIENT, NOT THE BRAND, as the spec requires: the 88
-- products reduce to 76 active ingredients, so the three L-arginine products
-- share one set of arginine papers rather than each getting its own search for
-- a brand name that returns nothing.
--
-- ELEVEN INGREDIENTS ARE NOT SEARCHED AGAIN. Lion's mane, curcumin, reishi,
-- chaga, cordyceps, D-ribose, essential amino acids, acetyl-L-carnitine,
-- alpha-lipoic acid, magnesium and B12 all appear in part one, and those
-- products cite the same records here: the same capsule should not carry one
-- set of papers under Sleep and a different set under Focus.
--
-- VERIFIED. `python scripts/fetch_papers.py --part 2 --verify` re-fetches all
-- 370 distinct PMIDs through `esummary` and checks three things: the
-- record still exists, its title still matches the one stored here, and it
-- carries no retraction publication type. All pass. It also probes two
-- non-existent PMIDs and requires the API to reject them, so a check that has
-- silently stopped working cannot pass by accident.
--
-- The URL form is `https://pubmed.ncbi.nlm.nih.gov/<pmid>/`, per the spec. Note
-- for whoever applies this: an HTTP GET on those pages could NOT be used as the
-- check from the machine this ran on. pubmed.ncbi.nlm.nih.gov answers every
-- request from here with a JS cookie-challenge page and HTTP 203 — identically
-- for a real PMID and an invented one — so the status code proves nothing. The
-- API round-trip above is the stronger check anyway, since it also compares the
-- title, but a plain link-check from an ordinary network is worth doing once.
--
-- HOW A PAPER WAS REJECTED. Relevance was the hard part, not volume. Three
-- filters, all in the script: the title must name the ingredient; topical,
-- textile and animal work is dropped because every product here is swallowed;
-- and a hand-written block list carries the ones only reading catches, each
-- with its reason. Part two needed two new filters and thirty-four more
-- entries on that list: these searches kept returning work nobody swallowed.
-- five gerbil and rat studies at the top of the uridine search, four
-- fish-feed trials at the top of the rice protein search, mice for magnesium
-- L-threonate and for fisetin, and a plant-physiology paper about the
-- Phellodendron tree under drought. Animal names are now matched as whole
-- words rather than as substrings. The second filter is the pregnancy and
-- preterm-infant literature — real evidence about the nutrient, and the
-- wrong question for the adult holding the bottle; it was leading the
-- iodine, lactoferrin and multivitamin searches. Children are deliberately
-- still in scope, because the probiotic evidence is paediatric end to end.
--
-- Every one of the 88 products carries five papers.
--
-- INGREDIENTS WHERE THE LITERATURE ITSELF RAN OUT before five, listed
-- because the spec asks for it even though no product ends up short:
--   algal-omega-3 — 4
--   magnesium-threonate — 4
--   phellodendron — 3
--   rice-protein — 1
--   Each of the four is the only product carrying that ingredient, and each
--   has a second ingredient on its label, so the remaining slots come from
--   that rather than from padding: rice protein fills from the plant protein
--   trials, Phellodendron from the B12 beside it in Dopamine Advantage, algal
--   oil from the wider omega-3 literature, and magnesium L-threonate from the
--   magnesium sleep trials part one already collected.
--
-- IDEMPOTENT. Guarded on (glossary_id, url), so re-running inserts nothing and
-- a partially-applied run completes cleanly.
--
-- NOT APPLIED. Written to disk only, per the standing rule.

insert into public.glossary_research (glossary_id, title, meta, url)
select g.id, v.title, v.meta, v.url
from (values
  -- ============================================================ Focus
  -- jarrow-formulas-alpha-gpc-300-mg
  ('jarrow-formulas-alpha-gpc-300-mg', 'Acute Alpha-Glycerylphosphorylcholine Supplementation Enhances Cognitive Performance in Healthy Men', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39683633/'),
  ('jarrow-formulas-alpha-gpc-300-mg', 'Comparative study of choline alfoscerate as a combination therapy with donepezil: A mixed double-blind randomized controlled and open-label observation trial', 'Randomised controlled trial (Medicine (Baltimore), 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38875437/'),
  ('jarrow-formulas-alpha-gpc-300-mg', 'Formulation and bioequivalence studies of choline alfoscerate tablet comparing with soft gelatin capsule in healthy male volunteers', 'Randomised controlled trial (Drug Des Devel Ther, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31040642/'),
  ('jarrow-formulas-alpha-gpc-300-mg', 'Effects of choline alfoscerate on cognitive function and quality of life in type 2 diabetes: A double-blind, randomized, placebo-controlled trial', 'Randomised controlled trial (Diabetes Obes Metab, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39703111/'),
  ('jarrow-formulas-alpha-gpc-300-mg', 'Pharmacokinetics of soy-derived lysophosphatidylcholine compared with that of glycerophosphocholine: a randomized controlled trial', 'Randomised controlled trial (Biosci Biotechnol Biochem, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38490741/'),
  -- life-extension-citicoline-cdp-choline
  ('life-extension-citicoline-cdp-choline', 'Is Citicoline Effective in Preventing and Slowing Down Dementia?-A Systematic Review and a Meta-Analysis', 'Meta-analysis (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36678257/'),
  ('life-extension-citicoline-cdp-choline', 'Is aura around citicoline fading? A systemic review', 'Meta-analysis (Indian J Pharmacol, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28458415/'),
  ('life-extension-citicoline-cdp-choline', 'Cytidinediphosphocholine (CDP-choline) for cognitive and behavioural disturbances associated with chronic cerebral disorders in the elderly', 'Meta-analysis (Cochrane Database Syst Rev, 2005)', 'https://pubmed.ncbi.nlm.nih.gov/15846601/'),
  ('life-extension-citicoline-cdp-choline', 'Cytidinediphosphocholine (CDP choline) for cognitive and behavioural disturbances associated with chronic cerebral disorders in the elderly', 'Meta-analysis (Cochrane Database Syst Rev, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/15106147/'),
  ('life-extension-citicoline-cdp-choline', 'Application of Citicoline in Neurological Disorders: A Systematic Review', 'Systematic review (Nutrients, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/33053828/'),
  -- jarrow-formulas-citicoline-cdp-choline-250-mg
  ('jarrow-formulas-citicoline-cdp-choline-250-mg', 'Is Citicoline Effective in Preventing and Slowing Down Dementia?-A Systematic Review and a Meta-Analysis', 'Meta-analysis (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36678257/'),
  ('jarrow-formulas-citicoline-cdp-choline-250-mg', 'Is aura around citicoline fading? A systemic review', 'Meta-analysis (Indian J Pharmacol, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28458415/'),
  ('jarrow-formulas-citicoline-cdp-choline-250-mg', 'Cytidinediphosphocholine (CDP-choline) for cognitive and behavioural disturbances associated with chronic cerebral disorders in the elderly', 'Meta-analysis (Cochrane Database Syst Rev, 2005)', 'https://pubmed.ncbi.nlm.nih.gov/15846601/'),
  ('jarrow-formulas-citicoline-cdp-choline-250-mg', 'Cytidinediphosphocholine (CDP choline) for cognitive and behavioural disturbances associated with chronic cerebral disorders in the elderly', 'Meta-analysis (Cochrane Database Syst Rev, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/15106147/'),
  ('jarrow-formulas-citicoline-cdp-choline-250-mg', 'Application of Citicoline in Neurological Disorders: A Systematic Review', 'Systematic review (Nutrients, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/33053828/'),
  -- thorne-phosphatidylserine
  ('thorne-phosphatidylserine', 'The Impact of Citicoline/Phosphatidylserine Supplementation on Cognitive Performance and Executive Functions in Mental Disorders: A Systematic Review of Controlled Trials', 'Systematic review (Hum Psychopharmacol, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42538853/'),
  ('thorne-phosphatidylserine', 'The effect of phosphatidylserine administration on memory and symptoms of attention-deficit hyperactivity disorder: a randomised, double-blind, placebo-controlled clinical trial', 'Randomised controlled trial (J Hum Nutr Diet, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/23495677/'),
  ('thorne-phosphatidylserine', 'Beneficial vascular effects of oral phosphatidylserine supplementation in type 2 diabetes', 'Randomised controlled trial (J Appl Physiol (1985), 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42312814/'),
  ('thorne-phosphatidylserine', 'Phosphatidylserine supplementation and recovery following downhill running', 'Randomised controlled trial (Med Sci Sports Exerc, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16960523/'),
  ('thorne-phosphatidylserine', 'Effects of Taurine-, Caffeine-, and Phosphatidylserine-Containing Supplementation Protocols on Physical and Cognitive Performance in Professional Male Football Players', 'Randomised controlled trial (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42280328/'),
  -- jarrow-formulas-ps100-100-mg
  ('jarrow-formulas-ps100-100-mg', 'The Impact of Citicoline/Phosphatidylserine Supplementation on Cognitive Performance and Executive Functions in Mental Disorders: A Systematic Review of Controlled Trials', 'Systematic review (Hum Psychopharmacol, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42538853/'),
  ('jarrow-formulas-ps100-100-mg', 'The effect of phosphatidylserine administration on memory and symptoms of attention-deficit hyperactivity disorder: a randomised, double-blind, placebo-controlled clinical trial', 'Randomised controlled trial (J Hum Nutr Diet, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/23495677/'),
  ('jarrow-formulas-ps100-100-mg', 'Beneficial vascular effects of oral phosphatidylserine supplementation in type 2 diabetes', 'Randomised controlled trial (J Appl Physiol (1985), 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42312814/'),
  ('jarrow-formulas-ps100-100-mg', 'Phosphatidylserine supplementation and recovery following downhill running', 'Randomised controlled trial (Med Sci Sports Exerc, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16960523/'),
  ('jarrow-formulas-ps100-100-mg', 'Effects of Taurine-, Caffeine-, and Phosphatidylserine-Containing Supplementation Protocols on Physical and Cognitive Performance in Professional Male Football Players', 'Randomised controlled trial (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42280328/'),
  -- doctors-best-phosphatidyl-serine-with-serinaid-100-mg
  ('doctors-best-phosphatidyl-serine-with-serinaid-100-mg', 'The Impact of Citicoline/Phosphatidylserine Supplementation on Cognitive Performance and Executive Functions in Mental Disorders: A Systematic Review of Controlled Trials', 'Systematic review (Hum Psychopharmacol, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42538853/'),
  ('doctors-best-phosphatidyl-serine-with-serinaid-100-mg', 'The effect of phosphatidylserine administration on memory and symptoms of attention-deficit hyperactivity disorder: a randomised, double-blind, placebo-controlled clinical trial', 'Randomised controlled trial (J Hum Nutr Diet, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/23495677/'),
  ('doctors-best-phosphatidyl-serine-with-serinaid-100-mg', 'Beneficial vascular effects of oral phosphatidylserine supplementation in type 2 diabetes', 'Randomised controlled trial (J Appl Physiol (1985), 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42312814/'),
  ('doctors-best-phosphatidyl-serine-with-serinaid-100-mg', 'Phosphatidylserine supplementation and recovery following downhill running', 'Randomised controlled trial (Med Sci Sports Exerc, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16960523/'),
  ('doctors-best-phosphatidyl-serine-with-serinaid-100-mg', 'Effects of Taurine-, Caffeine-, and Phosphatidylserine-Containing Supplementation Protocols on Physical and Cognitive Performance in Professional Male Football Players', 'Randomised controlled trial (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42280328/'),
  -- now-extra-strength-lecithin
  ('now-extra-strength-lecithin', 'Delayed-Release Phosphatidylcholine Is Effective for Treatment of Ulcerative Colitis: A Meta-Analysis', 'Meta-analysis (Dig Dis, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33440385/'),
  ('now-extra-strength-lecithin', 'Differential effects of dietary supplementation with fish oil or soy lecithin on human platelet adhesion', 'Randomised controlled trial (Thromb Haemost, 1999)', 'https://pubmed.ncbi.nlm.nih.gov/10595648/'),
  ('now-extra-strength-lecithin', 'Role of phosphatidylcholine-DHA in preventing APOE4-associated Alzheimer''s disease', 'Review (FASEB J, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30289748/'),
  ('now-extra-strength-lecithin', 'Phosphatidylcholine Containing Long Chain Omega-3 Fatty Acids: a Treatment Adjunct for Patients with Anorexia Nervosa?', 'Review (Psychiatr Danub, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32303030/'),
  ('now-extra-strength-lecithin', 'Unlocking choline''s potential in Alzheimer''s disease: A narrative review exploring the neuroprotective and neurotrophic role of phosphatidylcholine and assessing its impact on memory and learning', 'Review (Clin Nutr ESPEN, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39357562/'),
  -- life-extension-huperzine-a-200-mcg
  ('life-extension-huperzine-a-200-mcg', 'Huperzine A for Alzheimer''s disease', 'Meta-analysis (Cochrane Database Syst Rev, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18425924/'),
  ('life-extension-huperzine-a-200-mcg', 'Huperzine A for Alzheimer''s disease: a systematic review and meta-analysis of randomized clinical trials', 'Meta-analysis (PLoS One, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/24086396/'),
  ('life-extension-huperzine-a-200-mcg', 'Adjunctive huperzine A for cognitive deficits in schizophrenia: a systematic review and meta-analysis', 'Meta-analysis (Hum Psychopharmacol, 2016)', 'https://pubmed.ncbi.nlm.nih.gov/27302211/'),
  ('life-extension-huperzine-a-200-mcg', 'Efficacy and safety of natural acetylcholinesterase inhibitor huperzine A in the treatment of Alzheimer''s disease: an updated meta-analysis', 'Meta-analysis (J Neural Transm (Vienna), 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19221692/'),
  ('life-extension-huperzine-a-200-mcg', 'Huperzine A for vascular dementia', 'Systematic review (Cochrane Database Syst Rev, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19370686/'),
  -- swanson-huperzine-a-200-mcg
  ('swanson-huperzine-a-200-mcg', 'Huperzine A for Alzheimer''s disease', 'Meta-analysis (Cochrane Database Syst Rev, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18425924/'),
  ('swanson-huperzine-a-200-mcg', 'Huperzine A for Alzheimer''s disease: a systematic review and meta-analysis of randomized clinical trials', 'Meta-analysis (PLoS One, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/24086396/'),
  ('swanson-huperzine-a-200-mcg', 'Adjunctive huperzine A for cognitive deficits in schizophrenia: a systematic review and meta-analysis', 'Meta-analysis (Hum Psychopharmacol, 2016)', 'https://pubmed.ncbi.nlm.nih.gov/27302211/'),
  ('swanson-huperzine-a-200-mcg', 'Efficacy and safety of natural acetylcholinesterase inhibitor huperzine A in the treatment of Alzheimer''s disease: an updated meta-analysis', 'Meta-analysis (J Neural Transm (Vienna), 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19221692/'),
  ('swanson-huperzine-a-200-mcg', 'Huperzine A for vascular dementia', 'Systematic review (Cochrane Database Syst Rev, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19370686/'),
  -- host-defense-lions-mane
  ('host-defense-lions-mane', 'The Acute and Chronic Effects of Lion''s Mane Mushroom Supplementation on Cognitive Function, Stress and Mood in Young Adults: A Double-Blind, Parallel Groups, Pilot Study', 'Randomised controlled trial (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/38004235/'),
  ('host-defense-lions-mane', 'Theoretical Potential of Hericium Erinaceus Supplementation as an Add-On to Antipsychotics in Chronic and Treatment-Resistant Schizophrenia', 'Review (Psychopharmacol Bull, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39935672/'),
  ('host-defense-lions-mane', 'Hericium erinaceus mycelium-Derived Polysaccharide Alleviates Ulcerative Colitis and Modulates Gut Microbiota in Cynomolgus Monkeys', 'Study (Mol Nutr Food Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36443636/'),
  ('host-defense-lions-mane', 'Dietary Supplementation of Lion''s Mane Medicinal Mushroom, Hericium erinaceus (Agaricomycetes), and Spatial Memory in Wild-Type Mice', 'Study (Int J Med Mushrooms, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29953363/'),
  ('host-defense-lions-mane', 'Management of Post-Colonoscopy Syndrome with a Nutraceutical Intervention Based on Hericium erinaceus: A Retrospective Two-Arm Multicentre Analysis', 'Study (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41097229/'),
  -- host-defense-lions-mane-extract
  ('host-defense-lions-mane-extract', 'The Acute and Chronic Effects of Lion''s Mane Mushroom Supplementation on Cognitive Function, Stress and Mood in Young Adults: A Double-Blind, Parallel Groups, Pilot Study', 'Randomised controlled trial (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/38004235/'),
  ('host-defense-lions-mane-extract', 'Theoretical Potential of Hericium Erinaceus Supplementation as an Add-On to Antipsychotics in Chronic and Treatment-Resistant Schizophrenia', 'Review (Psychopharmacol Bull, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39935672/'),
  ('host-defense-lions-mane-extract', 'Hericium erinaceus mycelium-Derived Polysaccharide Alleviates Ulcerative Colitis and Modulates Gut Microbiota in Cynomolgus Monkeys', 'Study (Mol Nutr Food Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36443636/'),
  ('host-defense-lions-mane-extract', 'Dietary Supplementation of Lion''s Mane Medicinal Mushroom, Hericium erinaceus (Agaricomycetes), and Spatial Memory in Wild-Type Mice', 'Study (Int J Med Mushrooms, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29953363/'),
  ('host-defense-lions-mane-extract', 'Management of Post-Colonoscopy Syndrome with a Nutraceutical Intervention Based on Hericium erinaceus: A Retrospective Two-Arm Multicentre Analysis', 'Study (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41097229/'),
  -- host-defense-brain-energy
  ('host-defense-brain-energy', 'The Acute and Chronic Effects of Lion''s Mane Mushroom Supplementation on Cognitive Function, Stress and Mood in Young Adults: A Double-Blind, Parallel Groups, Pilot Study', 'Randomised controlled trial (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/38004235/'),
  ('host-defense-brain-energy', 'Yerba Maté and its impact on glycemic control and metabolic health: a systematic review and meta-analysis', 'Meta-analysis (Front Endocrinol (Lausanne), 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41244043/'),
  ('host-defense-brain-energy', 'Randomized controlled trial of Siberian ginseng for chronic fatigue', 'Randomised controlled trial (Psychol Med, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/14971626/'),
  ('host-defense-brain-energy', 'Theoretical Potential of Hericium Erinaceus Supplementation as an Add-On to Antipsychotics in Chronic and Treatment-Resistant Schizophrenia', 'Review (Psychopharmacol Bull, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39935672/'),
  ('host-defense-brain-energy', 'Physiological effects of yerba maté (Ilex paraguariensis): a systematic review', 'Systematic review (Nutr Rev, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36647770/'),
  -- doctors-best-bacopa-320-mg-with-synapsa
  ('doctors-best-bacopa-320-mg-with-synapsa', 'Meta-analysis of randomized controlled trials on cognitive effects of Bacopa monnieri extract', 'Meta-analysis (J Ethnopharmacol, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24252493/'),
  ('doctors-best-bacopa-320-mg-with-synapsa', 'A systematic review of the Ayurvedic medicinal herb Bacopa monnieri in child and adolescent populations', 'Systematic review (Complement Ther Med, 2016)', 'https://pubmed.ncbi.nlm.nih.gov/27912958/'),
  ('doctors-best-bacopa-320-mg-with-synapsa', 'Effectiveness of Bacopa Monnieri (Brahmi) in the management of schizophrenia: a systematic review', 'Systematic review (Nutr Neurosci, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39498770/'),
  ('doctors-best-bacopa-320-mg-with-synapsa', 'The cognitive-enhancing effects of Bacopa monnieri: a systematic review of randomized, controlled human clinical trials', 'Systematic review (J Altern Complement Med, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22747190/'),
  ('doctors-best-bacopa-320-mg-with-synapsa', 'Comparative effects of Bacopa monnieri and Ginkgo biloba on cognitive functions: A systematic review and network meta-analysis', 'Systematic review (Phytomedicine, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41678913/'),
  -- doctors-best-extra-strength-ginkgo-120-mg
  ('doctors-best-extra-strength-ginkgo-120-mg', 'Efficacy and adverse effects of ginkgo biloba for cognitive impairment and dementia: a systematic review and meta-analysis', 'Meta-analysis (J Alzheimers Dis, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25114079/'),
  ('doctors-best-extra-strength-ginkgo-120-mg', 'Ginkgo biloba extract EGb 761 is safe and effective in the treatment of mild dementia - a meta-analysis of patient subgroups in randomised controlled trials', 'Meta-analysis (World J Biol Psychiatry, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39895346/'),
  ('doctors-best-extra-strength-ginkgo-120-mg', 'Meta-analysis of Ginkgo biloba Preparation for the Treatment of Alzheimer''s Disease', 'Meta-analysis (Clin Neuropharmacol, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32658034/'),
  ('doctors-best-extra-strength-ginkgo-120-mg', 'Ginkgo biloba for cognitive impairment and dementia', 'Meta-analysis (Cochrane Database Syst Rev, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19160216/'),
  ('doctors-best-extra-strength-ginkgo-120-mg', 'Ginkgo biloba for cognitive impairment and dementia', 'Meta-analysis (Cochrane Database Syst Rev, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17443523/'),
  -- doctors-best-l-tyrosine-500-mg
  ('doctors-best-l-tyrosine-500-mg', 'The effect of tyrosine supplementation on whole-body endurance performance in physically active population: A systematic review and meta-analysis including GRADE qualification', 'Meta-analysis (J Sports Sci, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/38290812/'),
  ('doctors-best-l-tyrosine-500-mg', 'Effect of high-dose tyrosine supplementation on brain function in adults with phenylketonuria', 'Randomised controlled trial (J Pediatr, 1995)', 'https://pubmed.ncbi.nlm.nih.gov/8523192/'),
  ('doctors-best-l-tyrosine-500-mg', 'The catecholamine precursor Tyrosine reduces autonomic arousal and decreases decision thresholds in reinforcement learning and temporal discounting', 'Randomised controlled trial (PLoS Comput Biol, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36548401/'),
  ('doctors-best-l-tyrosine-500-mg', 'Tyrosine supplementation is ineffective in facilitating soccer players'' physical and cognitive performance during high-intensity intermittent exercise in hot conditions', 'Randomised controlled trial (PLoS One, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39820592/'),
  ('doctors-best-l-tyrosine-500-mg', 'Oral l-tyrosine supplementation augments the vasoconstriction response to whole-body cooling in older adults', 'Randomised controlled trial (Exp Physiol, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28477375/'),
  -- thorne-iodine-and-tyrosine
  ('thorne-iodine-and-tyrosine', 'Effects of iodine supplementation on thyroid function parameter: Systematic review and meta-analysis', 'Meta-analysis (J Trace Elem Med Biol, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37562272/'),
  ('thorne-iodine-and-tyrosine', 'The effect of tyrosine supplementation on whole-body endurance performance in physically active population: A systematic review and meta-analysis including GRADE qualification', 'Meta-analysis (J Sports Sci, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/38290812/'),
  ('thorne-iodine-and-tyrosine', 'Iodine deficiency status in the WHO Eastern Mediterranean Region: a systematic review', 'Systematic review (Environ Geochem Health, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/28224254/'),
  ('thorne-iodine-and-tyrosine', 'Effect of high-dose tyrosine supplementation on brain function in adults with phenylketonuria', 'Randomised controlled trial (J Pediatr, 1995)', 'https://pubmed.ncbi.nlm.nih.gov/8523192/'),
  ('thorne-iodine-and-tyrosine', 'Micronutrients, iodine status and concentrations of thyroid hormones: a systematic review', 'Systematic review (Nutr Rev, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29596650/'),
  -- bulksupplements-phenylethylamine-hcl-pea
  ('bulksupplements-phenylethylamine-hcl-pea', 'Phenylethylamine modulation of affect: therapeutic and diagnostic implications', 'Review (J Neuropsychiatry Clin Neurosci, 1995)', 'https://pubmed.ncbi.nlm.nih.gov/7711493/'),
  ('bulksupplements-phenylethylamine-hcl-pea', 'Phenylethylamine excretion in depression', 'Study (Psychiatry Res, 1984)', 'https://pubmed.ncbi.nlm.nih.gov/6597458/'),
  ('bulksupplements-phenylethylamine-hcl-pea', 'Plasma beta-phenylethylamine levels in mood disorders', 'Study (Jpn J Psychiatry Neurol, 1991)', 'https://pubmed.ncbi.nlm.nih.gov/1753451/'),
  ('bulksupplements-phenylethylamine-hcl-pea', 'Phenylethylamine relieves depression after selective MAO-B inhibition', 'Study (J Neuropsychiatry Clin Neurosci, 1994)', 'https://pubmed.ncbi.nlm.nih.gov/8044048/'),
  ('bulksupplements-phenylethylamine-hcl-pea', 'Beta-phenylethylamine and noradrenergic function in depression', 'Study (Prog Neuropsychopharmacol Biol Psychiatry, 1992)', 'https://pubmed.ncbi.nlm.nih.gov/1557506/'),
  -- doctors-best-lithium-aspartate
  ('doctors-best-lithium-aspartate', 'Lithium Therapy''s Potential to Lower Dementia Risk and the Prevalence of Alzheimer''s Disease: A Meta-Analysis', 'Meta-analysis (Eur Neurol, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38657568/'),
  ('doctors-best-lithium-aspartate', 'Association between naturally occurring lithium in drinking water and suicide rates: systematic review and meta-analysis of ecological studies', 'Meta-analysis (Br J Psychiatry, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32716281/'),
  ('doctors-best-lithium-aspartate', 'Identifying the neuropsychiatric health effects of low-dose lithium interventions: A systematic review', 'Systematic review (Neurosci Biobehav Rev, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36436738/'),
  ('doctors-best-lithium-aspartate', 'Standard and trace-dose lithium: a systematic review of dementia prevention and other behavioral benefits', 'Systematic review (Aust N Z J Psychiatry, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24919696/'),
  ('doctors-best-lithium-aspartate', 'The effects of Lithium on Beta-amyloid deposition and tau phosphorylation: A systematic review', 'Systematic review (J Affect Disord, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41260370/'),
  -- life-extension-cognitex-elite
  ('life-extension-cognitex-elite', 'The Impact of Citicoline/Phosphatidylserine Supplementation on Cognitive Performance and Executive Functions in Mental Disorders: A Systematic Review of Controlled Trials', 'Systematic review (Hum Psychopharmacol, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42538853/'),
  ('life-extension-cognitex-elite', 'Effects of anthocyanin-rich supplementation on cognition of the cognitively healthy middle-aged and older adults: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Nutr Rev, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35960187/'),
  ('life-extension-cognitex-elite', 'The effect of phosphatidylserine administration on memory and symptoms of attention-deficit hyperactivity disorder: a randomised, double-blind, placebo-controlled clinical trial', 'Randomised controlled trial (J Hum Nutr Diet, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/23495677/'),
  ('life-extension-cognitex-elite', 'Anthocyanin supplementation improves obesity-related inflammatory characteristics: A systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Nutr Res, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37320946/'),
  ('life-extension-cognitex-elite', 'Beneficial vascular effects of oral phosphatidylserine supplementation in type 2 diabetes', 'Randomised controlled trial (J Appl Physiol (1985), 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42312814/'),
  -- life-extension-dopamine-advantage
  ('life-extension-dopamine-advantage', 'Effect of a proprietary Magnolia and Phellodendron extract on stress levels in healthy women: a pilot, double-blind, placebo-controlled clinical trial', 'Randomised controlled trial (Nutr J, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18426577/'),
  ('life-extension-dopamine-advantage', 'Vitamin B12 for cognition', 'Meta-analysis (Cochrane Database Syst Rev, 2003)', 'https://pubmed.ncbi.nlm.nih.gov/12918012/'),
  ('life-extension-dopamine-advantage', 'Effect of a proprietary Magnolia and Phellodendron extract on weight management: a pilot, double-blind, placebo-controlled clinical trial', 'Randomised controlled trial (Altern Ther Health Med, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16454147/'),
  ('life-extension-dopamine-advantage', 'Vitamin B-12 in Human Milk: A Systematic Review', 'Systematic review (Adv Nutr, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29846529/'),
  ('life-extension-dopamine-advantage', 'Effect of Magnolia officinalis and Phellodendron amurense (Relora®) on cortisol and psychological mood state in moderately stressed subjects', 'Study (J Int Soc Sports Nutr, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23924268/'),
  -- bulksupplements-mucuna-pruriens-extract
  ('bulksupplements-mucuna-pruriens-extract', 'Comparative efficacy of Mucuna pruriens and conventional levodopa in Parkinson''s disease: a randomized controlled trial on pharmacokinetics and clinical perspectives from Asia', 'Randomised controlled trial (J Neural Transm (Vienna), 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40137945/'),
  ('bulksupplements-mucuna-pruriens-extract', 'Mucuna pruriens in untreated Parkinson''s disease in sub-Saharan Africa: A 12-month, multicenter, randomized, controlled trial', 'Randomised controlled trial (J Parkinsons Dis, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41269916/'),
  ('bulksupplements-mucuna-pruriens-extract', 'Mucuna pruriens in Parkinson disease: A double-blind, randomized, controlled, crossover study', 'Randomised controlled trial (Neurology, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28679598/'),
  ('bulksupplements-mucuna-pruriens-extract', 'Mucuna pruriens in Parkinson''s disease: a double blind clinical and pharmacological study', 'Randomised controlled trial (J Neurol Neurosurg Psychiatry, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/15548480/'),
  ('bulksupplements-mucuna-pruriens-extract', 'Daily intake of Mucuna pruriens in advanced Parkinson''s disease: A 16-week, noninferiority, randomized, crossover, pilot study', 'Randomised controlled trial (Parkinsonism Relat Disord, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29352722/'),
  -- doctors-best-vegan-omega-3-2000-mg
  ('doctors-best-vegan-omega-3-2000-mg', 'A meta-analysis shows that docosahexaenoic acid from algal oil reduces serum triglycerides and increases HDL-cholesterol and LDL-cholesterol in persons without coronary heart disease', 'Meta-analysis (J Nutr, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22113870/'),
  ('doctors-best-vegan-omega-3-2000-mg', 'Efficacy of omega-3 PUFAs in depression: A meta-analysis', 'Meta-analysis (Transl Psychiatry, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31383846/'),
  ('doctors-best-vegan-omega-3-2000-mg', 'A randomized placebo-controlled study on high-dose oral algal docosahexaenoic acid supplementation in children with cystic fibrosis', 'Randomised controlled trial (Prostaglandins Leukot Essent Fatty Acids, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23266209/'),
  ('doctors-best-vegan-omega-3-2000-mg', 'Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease', 'Meta-analysis (Cochrane Database Syst Rev, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32114706/'),
  ('doctors-best-vegan-omega-3-2000-mg', 'Bioavailability and safety of a high dose of docosahexaenoic acid triacylglycerol of algal origin in cystic fibrosis patients: a randomized, controlled study', 'Randomised controlled trial (Nutrition, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16226012/'),
  -- life-extension-mega-epa-dha
  ('life-extension-mega-epa-dha', 'Efficacy of omega-3 PUFAs in depression: A meta-analysis', 'Meta-analysis (Transl Psychiatry, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31383846/'),
  ('life-extension-mega-epa-dha', 'Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease', 'Meta-analysis (Cochrane Database Syst Rev, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32114706/'),
  ('life-extension-mega-epa-dha', 'The Relationship of Omega-3 Fatty Acids with Dementia and Cognitive Decline: Evidence from Prospective Cohort Studies of Supplementation, Dietary Intake, and Blood Markers', 'Meta-analysis (Am J Clin Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37028557/'),
  ('life-extension-mega-epa-dha', 'Omega-3 Polyunsaturated Fatty Acids in Youths with Attention Deficit Hyperactivity Disorder: a Systematic Review and Meta-Analysis of Clinical Trials and Biological Studies', 'Meta-analysis (Neuropsychopharmacology, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/28741625/'),
  ('life-extension-mega-epa-dha', 'Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease', 'Meta-analysis (Cochrane Database Syst Rev, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/30019766/'),
  -- thorne-super-epa-425-mg
  ('thorne-super-epa-425-mg', 'Efficacy of omega-3 PUFAs in depression: A meta-analysis', 'Meta-analysis (Transl Psychiatry, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31383846/'),
  ('thorne-super-epa-425-mg', 'Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease', 'Meta-analysis (Cochrane Database Syst Rev, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32114706/'),
  ('thorne-super-epa-425-mg', 'The Relationship of Omega-3 Fatty Acids with Dementia and Cognitive Decline: Evidence from Prospective Cohort Studies of Supplementation, Dietary Intake, and Blood Markers', 'Meta-analysis (Am J Clin Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37028557/'),
  ('thorne-super-epa-425-mg', 'Omega-3 Polyunsaturated Fatty Acids in Youths with Attention Deficit Hyperactivity Disorder: a Systematic Review and Meta-Analysis of Clinical Trials and Biological Studies', 'Meta-analysis (Neuropsychopharmacology, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/28741625/'),
  ('thorne-super-epa-425-mg', 'Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease', 'Meta-analysis (Cochrane Database Syst Rev, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/30019766/'),
  -- klean-athlete-klean-omega
  ('klean-athlete-klean-omega', 'Efficacy of omega-3 PUFAs in depression: A meta-analysis', 'Meta-analysis (Transl Psychiatry, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31383846/'),
  ('klean-athlete-klean-omega', 'Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease', 'Meta-analysis (Cochrane Database Syst Rev, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32114706/'),
  ('klean-athlete-klean-omega', 'The Relationship of Omega-3 Fatty Acids with Dementia and Cognitive Decline: Evidence from Prospective Cohort Studies of Supplementation, Dietary Intake, and Blood Markers', 'Meta-analysis (Am J Clin Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37028557/'),
  ('klean-athlete-klean-omega', 'Omega-3 Polyunsaturated Fatty Acids in Youths with Attention Deficit Hyperactivity Disorder: a Systematic Review and Meta-Analysis of Clinical Trials and Biological Studies', 'Meta-analysis (Neuropsychopharmacology, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/28741625/'),
  ('klean-athlete-klean-omega', 'Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease', 'Meta-analysis (Cochrane Database Syst Rev, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/30019766/'),
  -- klean-athlete-klean-focus
  ('klean-athlete-klean-focus', 'l-carnitine and l-acetylcarnitine supplementation for idiopathic male infertility', 'Meta-analysis (Reprod Fertil, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/35128424/'),
  ('klean-athlete-klean-focus', 'Acute Alpha-Glycerylphosphorylcholine Supplementation Enhances Cognitive Performance in Healthy Men', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39683633/'),
  ('klean-athlete-klean-focus', 'Alpha Lipoic Acid Supplementation and Iron Homeostasis: A Comprehensive Systematic Review and Meta-Analysis of Randomized Controlled Clinical Trials', 'Meta-analysis (Int J Vitam Nutr Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/40134249/'),
  ('klean-athlete-klean-focus', 'Acetyl-L-carnitine for the treatment of diabetic peripheral neuropathy', 'Meta-analysis (Cochrane Database Syst Rev, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31201734/'),
  ('klean-athlete-klean-focus', 'Comparative study of choline alfoscerate as a combination therapy with donepezil: A mixed double-blind randomized controlled and open-label observation trial', 'Randomised controlled trial (Medicine (Baltimore), 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38875437/'),
  -- sports-research-magnesium-l-threonate-2000-mg
  ('sports-research-magnesium-l-threonate-2000-mg', 'A Magtein(®), Magnesium L-Threonate, -Based Formula Improves Brain Cognitive Functions in Healthy Chinese Adults', 'Randomised controlled trial (Nutrients, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36558392/'),
  ('sports-research-magnesium-l-threonate-2000-mg', 'Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis', 'Meta-analysis (BMC Complement Med Ther, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33865376/'),
  ('sports-research-magnesium-l-threonate-2000-mg', 'The effects of magnesium L-threonate (Magtein(®)) on cognitive performance and sleep quality in adults: a randomised, double-blind, placebo-controlled trial', 'Clinical trial (Front Nutr, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41601871/'),
  ('sports-research-magnesium-l-threonate-2000-mg', 'Effect of oral magnesium supplementation for relieving leg cramps during pregnancy: A meta-analysis of randomized controlled trials', 'Meta-analysis (Taiwan J Obstet Gynecol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34247796/'),
  ('sports-research-magnesium-l-threonate-2000-mg', 'Magnesium-L-threonate improves sleep quality and daytime functioning in adults with self-reported sleep problems: A randomized controlled trial', 'Study (Sleep Med X, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39252819/'),
  -- doctors-best-fisetin-with-novusetin
  ('doctors-best-fisetin-with-novusetin', '12‑weeks fisetin supplementation and interval resistance with aerobic training: changes in Maresin‑1 and inflammatory markers in men with obesity: a randomized controlled trial', 'Randomised controlled trial (J Int Soc Sports Nutr, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42218768/'),
  ('doctors-best-fisetin-with-novusetin', 'The Effects of Interval Resistance-Aerobic Training and Fisetin Supplementation on Asprosin and Selected Adipokines in Obese Men: A Double-Blind Randomized Control Trial', 'Randomised controlled trial (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41683255/'),
  ('doctors-best-fisetin-with-novusetin', 'Effect of fisetin supplementation on inflammatory factors and matrix metalloproteinase enzymes in colorectal cancer patients', 'Randomised controlled trial (Food Funct, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29541713/'),
  ('doctors-best-fisetin-with-novusetin', 'Enhanced bioavailability and pharmacokinetics of a novel hybrid-hydrogel formulation of fisetin orally administered in healthy individuals: a randomised double-blinded comparative crossover study', 'Randomised controlled trial (J Nutr Sci, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36304817/'),
  ('doctors-best-fisetin-with-novusetin', 'A phase II randomized placebo-controlled study of fisetin to improve physical function in breast cancer survivors: the TROFFi study rationale and trial design', 'Study (Ther Adv Med Oncol, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41835341/'),
  -- swanson-fisetin-100-mg
  ('swanson-fisetin-100-mg', '12‑weeks fisetin supplementation and interval resistance with aerobic training: changes in Maresin‑1 and inflammatory markers in men with obesity: a randomized controlled trial', 'Randomised controlled trial (J Int Soc Sports Nutr, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42218768/'),
  ('swanson-fisetin-100-mg', 'The Effects of Interval Resistance-Aerobic Training and Fisetin Supplementation on Asprosin and Selected Adipokines in Obese Men: A Double-Blind Randomized Control Trial', 'Randomised controlled trial (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41683255/'),
  ('swanson-fisetin-100-mg', 'Effect of fisetin supplementation on inflammatory factors and matrix metalloproteinase enzymes in colorectal cancer patients', 'Randomised controlled trial (Food Funct, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29541713/'),
  ('swanson-fisetin-100-mg', 'Enhanced bioavailability and pharmacokinetics of a novel hybrid-hydrogel formulation of fisetin orally administered in healthy individuals: a randomised double-blinded comparative crossover study', 'Randomised controlled trial (J Nutr Sci, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36304817/'),
  ('swanson-fisetin-100-mg', 'A phase II randomized placebo-controlled study of fisetin to improve physical function in breast cancer survivors: the TROFFi study rationale and trial design', 'Study (Ther Adv Med Oncol, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41835341/'),
  -- supersmart-spermidine-3-mg
  ('supersmart-spermidine-3-mg', 'Effects of Spermidine Supplementation on Cognition and Biomarkers in Older Adults With Subjective Cognitive Decline: A Randomized Clinical Trial', 'Randomised controlled trial (JAMA Netw Open, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35616942/'),
  ('supersmart-spermidine-3-mg', 'Spermidine Mitigates Immune Cell Senescence and Boosts Vaccine Responses in Healthy Older Adults-A Pilot Study', 'Randomised controlled trial (Aging Cell, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42169618/'),
  ('supersmart-spermidine-3-mg', 'Supplementation of spermidine at 40 mg/day has minimal effects on circulating polyamines: An exploratory double-blind randomized controlled trial in older men', 'Randomised controlled trial (Nutr Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39405978/'),
  ('supersmart-spermidine-3-mg', 'High-Dose Spermidine Supplementation Does Not Increase Spermidine Levels in Blood Plasma and Saliva of Healthy Adults: A Randomized Placebo-Controlled Pharmacokinetic and Metabolomic Study', 'Randomised controlled trial (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37111071/'),
  ('supersmart-spermidine-3-mg', 'The effect of spermidine on memory performance in older adults at risk for dementia: A randomized controlled trial', 'Randomised controlled trial (Cortex, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/30388439/'),
  -- codeage-liposomal-urolithin-a
  ('codeage-liposomal-urolithin-a', 'Targeting aging with urolithin A in humans: A systematic review', 'Systematic review (Ageing Res Rev, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39002645/'),
  ('codeage-liposomal-urolithin-a', 'Urolithin A improves muscle strength, exercise performance, and biomarkers of mitochondrial health in a randomized trial in middle-aged adults', 'Randomised controlled trial (Cell Rep Med, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35584623/'),
  ('codeage-liposomal-urolithin-a', 'Effect of Urolithin A Supplementation on Muscle Endurance and Mitochondrial Health in Older Adults: A Randomized Clinical Trial', 'Randomised controlled trial (JAMA Netw Open, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35050355/'),
  ('codeage-liposomal-urolithin-a', 'Effect of the mitophagy inducer urolithin A on age-related immune decline: a randomized, placebo-controlled trial', 'Randomised controlled trial (Nat Aging, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41174221/'),
  ('codeage-liposomal-urolithin-a', 'Evaluating the Impact of Urolithin A Supplementation on Running Performance, Recovery, and Mitochondrial Biomarkers in Highly Trained Male Distance Runners', 'Randomised controlled trial (Sports Med, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40839339/'),
  -- life-extension-senolytic-activator
  ('life-extension-senolytic-activator', '12‑weeks fisetin supplementation and interval resistance with aerobic training: changes in Maresin‑1 and inflammatory markers in men with obesity: a randomized controlled trial', 'Randomised controlled trial (J Int Soc Sports Nutr, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42218768/'),
  ('life-extension-senolytic-activator', 'The Effects of Quercetin Supplementation on Blood Pressure - Meta-Analysis', 'Meta-analysis (Curr Probl Cardiol, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35948195/'),
  ('life-extension-senolytic-activator', 'The Effects of Interval Resistance-Aerobic Training and Fisetin Supplementation on Asprosin and Selected Adipokines in Obese Men: A Double-Blind Randomized Control Trial', 'Randomised controlled trial (Nutrients, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41683255/'),
  ('life-extension-senolytic-activator', 'Effects of quercetin supplementation on lipid profile: A systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Crit Rev Food Sci Nutr, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/25897620/'),
  ('life-extension-senolytic-activator', 'Effect of fisetin supplementation on inflammatory factors and matrix metalloproteinase enzymes in colorectal cancer patients', 'Randomised controlled trial (Food Funct, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29541713/'),
  -- ============================================================ Training
  -- klean-athlete-klean-creatine
  ('klean-athlete-klean-creatine', 'Effects of creatine supplementation on memory in healthy individuals: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Nutr Rev, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35984306/'),
  ('klean-athlete-klean-creatine', 'Effects of Creatine Monohydrate on Endurance Performance in a Trained Population: A Systematic Review and Meta-analysis', 'Meta-analysis (Sports Med, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36877404/'),
  ('klean-athlete-klean-creatine', 'Effect of creatine supplementation on kidney function: a systematic review and meta-analysis', 'Meta-analysis (BMC Nephrol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41199218/'),
  ('klean-athlete-klean-creatine', 'Risk of Adverse Outcomes in Females Taking Oral Creatine Monohydrate: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32549301/'),
  ('klean-athlete-klean-creatine', 'Creatine monohydrate for lean mass, strength, and bone density in postmenopausal women: a systematic review and meta-analysis', 'Meta-analysis (J Int Soc Sports Nutr, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42141930/'),
  -- life-extension-creatine-capsules
  ('life-extension-creatine-capsules', 'Effects of creatine supplementation on memory in healthy individuals: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Nutr Rev, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35984306/'),
  ('life-extension-creatine-capsules', 'Effects of Creatine Monohydrate on Endurance Performance in a Trained Population: A Systematic Review and Meta-analysis', 'Meta-analysis (Sports Med, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36877404/'),
  ('life-extension-creatine-capsules', 'Effect of creatine supplementation on kidney function: a systematic review and meta-analysis', 'Meta-analysis (BMC Nephrol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41199218/'),
  ('life-extension-creatine-capsules', 'Risk of Adverse Outcomes in Females Taking Oral Creatine Monohydrate: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32549301/'),
  ('life-extension-creatine-capsules', 'Creatine monohydrate for lean mass, strength, and bone density in postmenopausal women: a systematic review and meta-analysis', 'Meta-analysis (J Int Soc Sports Nutr, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42141930/'),
  -- klean-athlete-klean-essential-aminos-hmb
  ('klean-athlete-klean-essential-aminos-hmb', 'Peri-operative protein or amino acid supplementation for total joint arthroplasty: a systematic review and meta-analysis', 'Meta-analysis (J Orthop Surg Res, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40317042/'),
  ('klean-athlete-klean-essential-aminos-hmb', 'The effects of β-hydroxy-β-methylbutyrate supplementation in patients with sarcopenia: A systematic review and meta-analysis', 'Meta-analysis (Maturitas, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39999663/'),
  ('klean-athlete-klean-essential-aminos-hmb', 'Whey protein, amino acids, and vitamin D supplementation with physical activity increases fat-free mass and strength, functionality, and quality of life and decreases inflammation in sarcopenic elderly', 'Randomised controlled trial (Am J Clin Nutr, 2016)', 'https://pubmed.ncbi.nlm.nih.gov/26864356/'),
  ('klean-athlete-klean-essential-aminos-hmb', 'Ergogenic Benefits of β-Hydroxy-β-Methyl Butyrate (HMB) Supplementation on Body Composition and Muscle Strength: An Umbrella Review of Meta-Analyses', 'Meta-analysis (J Cachexia Sarcopenia Muscle, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39797501/'),
  ('klean-athlete-klean-essential-aminos-hmb', 'Dileucine-supplemented essential amino acids support whole-body anabolism after resistance exercise and serum-stimulated cell-based anabolism', 'Randomised controlled trial (J Int Soc Sports Nutr, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41321015/'),
  -- bulksupplements-l-leucine
  ('bulksupplements-l-leucine', 'Effects of Whey Protein, Leucine, and Vitamin D Supplementation in Patients with Sarcopenia: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36771225/'),
  ('bulksupplements-l-leucine', 'The effectiveness of leucine on muscle protein synthesis, lean body mass and leg lean mass accretion in older people: a systematic review and meta-analysis', 'Meta-analysis (Br J Nutr, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25234223/'),
  ('bulksupplements-l-leucine', 'Effects of Leucine Supplementation in Older Adults with Sarcopenia: A Meta-Analysis', 'Meta-analysis (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40805998/'),
  ('bulksupplements-l-leucine', 'Enhancing Muscle Quality: Exploring Leucine and Whey Protein in Sarcopenic Individuals', 'Systematic review (J Cachexia Sarcopenia Muscle, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40937507/'),
  ('bulksupplements-l-leucine', 'Beneficial Effects of Leucine Supplementation on Criteria for Sarcopenia: A Systematic Review', 'Systematic review (Nutrients, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31627427/'),
  -- klean-athlete-klean-bcaa-peak-atp
  ('klean-athlete-klean-bcaa-peak-atp', 'Effect of branched-Chain Amino Acid Supplementation on Muscle Soreness following Exercise: A Meta-Analysis', 'Meta-analysis (Int J Vitam Nutr Res, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30938579/'),
  ('klean-athlete-klean-bcaa-peak-atp', 'Acute Effect of Oral Adenosine Triphosphate (ATP) Supplementation on Muscular Performance in Trained Adults', 'Randomised controlled trial (J Am Nutr Assoc, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38193939/'),
  ('klean-athlete-klean-bcaa-peak-atp', 'Branched-chain amino acid supplementation and exercise-induced muscle damage in exercise recovery: A meta-analysis of randomized clinical trials', 'Meta-analysis (Nutrition, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28870476/'),
  ('klean-athlete-klean-bcaa-peak-atp', 'Oral Adenosine-5''-triphosphate (ATP) Administration Increases Postexercise ATP Levels, Muscle Excitability, and Athletic Performance Following a Repeated Sprint Bout', 'Randomised controlled trial (J Am Coll Nutr, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/28080323/'),
  ('klean-athlete-klean-bcaa-peak-atp', 'Does Branched-Chain Amino Acids (BCAAs) Supplementation Attenuate Muscle Damage Markers and Soreness after Resistance Exercise in Trained Males? A Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34072718/'),
  -- thorne-amino-complex-lemon
  ('thorne-amino-complex-lemon', 'Peri-operative protein or amino acid supplementation for total joint arthroplasty: a systematic review and meta-analysis', 'Meta-analysis (J Orthop Surg Res, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40317042/'),
  ('thorne-amino-complex-lemon', 'Whey protein, amino acids, and vitamin D supplementation with physical activity increases fat-free mass and strength, functionality, and quality of life and decreases inflammation in sarcopenic elderly', 'Randomised controlled trial (Am J Clin Nutr, 2016)', 'https://pubmed.ncbi.nlm.nih.gov/26864356/'),
  ('thorne-amino-complex-lemon', 'Dileucine-supplemented essential amino acids support whole-body anabolism after resistance exercise and serum-stimulated cell-based anabolism', 'Randomised controlled trial (J Int Soc Sports Nutr, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41321015/'),
  ('thorne-amino-complex-lemon', 'Effects of Nutritional Support with a Leucine-Enriched Essential Amino Acid Supplement on Body Composition, Muscle Strength, and Physical Function in Stroke Patients Undergoing Rehabilitation', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39770886/'),
  ('thorne-amino-complex-lemon', 'Combined resistance exercise and essential amino acid intake enhance follistatin/myostatin ratio and muscle fitness in older women: a randomized controlled trial', 'Randomised controlled trial (J Int Soc Sports Nutr, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41863133/'),
  -- klean-athlete-klean-isolate-chocolate
  ('klean-athlete-klean-isolate-chocolate', 'Improving sarcopenia in older adults: a systematic review and meta-analysis of randomized controlled trials of whey protein supplementation with or without resistance training', 'Meta-analysis (J Nutr Health Aging, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38350303/'),
  ('klean-athlete-klean-isolate-chocolate', 'Effectiveness of Whey Protein Supplementation during Resistance Exercise Training on Skeletal Muscle Mass and Strength in Older People with Sarcopenia: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37571361/'),
  ('klean-athlete-klean-isolate-chocolate', 'Whey Protein Supplementation with or without Vitamin D on Sarcopenia-Related Measures: A Systematic Review and Meta-Analysis', 'Meta-analysis (Adv Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37196876/'),
  ('klean-athlete-klean-isolate-chocolate', 'The Effect of Whey Protein Supplementation on the Temporal Recovery of Muscle Function Following Resistance Training: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29462923/'),
  ('klean-athlete-klean-isolate-chocolate', 'Effect of Whey Protein Supplementation in Postmenopausal Women: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36235862/'),
  -- klean-athlete-klean-casein-vanilla-custard
  ('klean-athlete-klean-casein-vanilla-custard', 'Pre-Sleep Casein Supplementation, Metabolism, and Appetite: A Systematic Review', 'Systematic review (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34070862/'),
  ('klean-athlete-klean-casein-vanilla-custard', 'Casein Supplementation Timing and Exercise Performance in Soccer Players: Pre-Sleep vs. Post-Exercise Intake-A Randomized Controlled Trial', 'Randomised controlled trial (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41470882/'),
  ('klean-athlete-klean-casein-vanilla-custard', 'Lipolysis and Fat Oxidation Are Not Altered with Presleep Compared with Daytime Casein Protein Intake in Resistance-Trained Women', 'Randomised controlled trial (J Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31504693/'),
  ('klean-athlete-klean-casein-vanilla-custard', 'Presleep vs. Daytime Consumption of Casein-Enriched Milk: Effects on Muscle Function and Metabolic Health After Sleeve Gastrectomy', 'Randomised controlled trial (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40944141/'),
  ('klean-athlete-klean-casein-vanilla-custard', 'Aminoacidemia following ingestion of native whey protein, micellar casein, and a whey-casein blend in young men', 'Randomised controlled trial (Appl Physiol Nutr Metab, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30063168/'),
  -- klean-athlete-klean-plant-based-protein-vanilla
  ('klean-athlete-klean-plant-based-protein-vanilla', 'No Difference Between the Effects of Supplementing With Soy Protein Versus Animal Protein on Gains in Muscle Mass and Strength in Response to Resistance Exercise', 'Meta-analysis (Int J Sport Nutr Exerc Metab, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29722584/'),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'The Impact of Whey and Soy Protein Supplementation on Resistance Training in Young Adults: A Systematic Review and Meta-Analysis', 'Meta-analysis (J Diet Suppl, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41454445/'),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'Effects of whey and soy protein supplementation on inflammatory cytokines in older adults: a systematic review and meta-analysis', 'Meta-analysis (Br J Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35706399/'),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'Effect of Soy Protein Supplementation on Muscle Adaptations, Metabolic and Antioxidant Status, Hormonal Response, and Exercise Performance of Active Individuals and Athletes: A Systematic Review of Randomised Controlled Trials', 'Systematic review (Sports Med, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37603200/'),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'Effect of Plant-Based Proteins on Recovery from Resistance Exercise-Induced Muscle Damage in Healthy Young Adults-A Systematic Review', 'Systematic review (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40806155/'),
  -- bulksupplements-rice-protein
  ('bulksupplements-rice-protein', 'The effects of 8 weeks of whey or rice protein supplementation on body composition and exercise performance', 'Randomised controlled trial (Nutr J, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23782948/'),
  ('bulksupplements-rice-protein', 'No Difference Between the Effects of Supplementing With Soy Protein Versus Animal Protein on Gains in Muscle Mass and Strength in Response to Resistance Exercise', 'Meta-analysis (Int J Sport Nutr Exerc Metab, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29722584/'),
  ('bulksupplements-rice-protein', 'The Impact of Whey and Soy Protein Supplementation on Resistance Training in Young Adults: A Systematic Review and Meta-Analysis', 'Meta-analysis (J Diet Suppl, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41454445/'),
  ('bulksupplements-rice-protein', 'Effects of whey and soy protein supplementation on inflammatory cytokines in older adults: a systematic review and meta-analysis', 'Meta-analysis (Br J Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35706399/'),
  ('bulksupplements-rice-protein', 'Effect of Soy Protein Supplementation on Muscle Adaptations, Metabolic and Antioxidant Status, Hormonal Response, and Exercise Performance of Active Individuals and Athletes: A Systematic Review of Randomised Controlled Trials', 'Systematic review (Sports Med, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37603200/'),
  -- sports-research-whey-protein-isolate-dutch-chocolate
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'Improving sarcopenia in older adults: a systematic review and meta-analysis of randomized controlled trials of whey protein supplementation with or without resistance training', 'Meta-analysis (J Nutr Health Aging, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38350303/'),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'Effectiveness of Whey Protein Supplementation during Resistance Exercise Training on Skeletal Muscle Mass and Strength in Older People with Sarcopenia: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37571361/'),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'Whey Protein Supplementation with or without Vitamin D on Sarcopenia-Related Measures: A Systematic Review and Meta-Analysis', 'Meta-analysis (Adv Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37196876/'),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'The Effect of Whey Protein Supplementation on the Temporal Recovery of Muscle Function Following Resistance Training: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29462923/'),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'Effect of Whey Protein Supplementation in Postmenopausal Women: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36235862/'),
  -- klean-athlete-klean-glutamine
  ('klean-athlete-klean-glutamine', 'A systematic review and meta-analysis of clinical trials on the effects of glutamine supplementation on gut permeability in adults', 'Meta-analysis (Amino Acids, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39397201/'),
  ('klean-athlete-klean-glutamine', 'The effect of glutamine supplementation on athletic performance, body composition, and immune function: A systematic review and a meta-analysis of clinical trials', 'Meta-analysis (Clin Nutr, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/29784526/'),
  ('klean-athlete-klean-glutamine', 'Glutamine in critical care: current evidence from systematic reviews', 'Meta-analysis (Proc Nutr Soc, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16923308/'),
  ('klean-athlete-klean-glutamine', 'Glutamine as indispensable nutrient in oncology: experimental and clinical evidence', 'Systematic review (Eur J Nutr, 2010)', 'https://pubmed.ncbi.nlm.nih.gov/19936817/'),
  ('klean-athlete-klean-glutamine', 'Effects of glutamine supplementation on inflammatory bowel disease: A systematic review of clinical trials', 'Systematic review (Clin Nutr ESPEN, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33745622/'),
  -- thorne-beta-alanine-sr
  ('thorne-beta-alanine-sr', 'β-alanine supplementation to improve exercise capacity and performance: a systematic review and meta-analysis', 'Meta-analysis (Br J Sports Med, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/27797728/'),
  ('thorne-beta-alanine-sr', 'Effect of Beta-Alanine Supplementation on Maximal Intensity Exercise in Trained Young Male Individuals: A Systematic Review and Meta-Analysis', 'Meta-analysis (Int J Sport Nutr Exerc Metab, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39032921/'),
  ('thorne-beta-alanine-sr', 'Effects of β-alanine supplementation on exercise performance: a meta-analysis', 'Meta-analysis (Amino Acids, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22270875/'),
  ('thorne-beta-alanine-sr', 'Effect of carnosine or beta-alanine supplementation therapy for prediabetes or type 2 diabetes mellitus: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (BMC Endocr Disord, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40999397/'),
  ('thorne-beta-alanine-sr', 'Effects of beta-alanine supplementation on Yo-Yo test performance: A meta-analysis', 'Meta-analysis (Clin Nutr ESPEN, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34024507/'),
  -- klean-athlete-klean-sr-beta-alanine
  ('klean-athlete-klean-sr-beta-alanine', 'β-alanine supplementation to improve exercise capacity and performance: a systematic review and meta-analysis', 'Meta-analysis (Br J Sports Med, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/27797728/'),
  ('klean-athlete-klean-sr-beta-alanine', 'Effect of Beta-Alanine Supplementation on Maximal Intensity Exercise in Trained Young Male Individuals: A Systematic Review and Meta-Analysis', 'Meta-analysis (Int J Sport Nutr Exerc Metab, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39032921/'),
  ('klean-athlete-klean-sr-beta-alanine', 'Effects of β-alanine supplementation on exercise performance: a meta-analysis', 'Meta-analysis (Amino Acids, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22270875/'),
  ('klean-athlete-klean-sr-beta-alanine', 'Effect of carnosine or beta-alanine supplementation therapy for prediabetes or type 2 diabetes mellitus: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (BMC Endocr Disord, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40999397/'),
  ('klean-athlete-klean-sr-beta-alanine', 'Effects of beta-alanine supplementation on Yo-Yo test performance: A meta-analysis', 'Meta-analysis (Clin Nutr ESPEN, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34024507/'),
  -- doctors-best-l-citrulline-powder
  ('doctors-best-l-citrulline-powder', 'Effect of food sources of nitrate, polyphenols, L-arginine and L-citrulline on endurance exercise performance: a systematic review and meta-analysis of randomised controlled trials', 'Meta-analysis (J Int Soc Sports Nutr, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34965876/'),
  ('doctors-best-l-citrulline-powder', 'Effect of L-Citrulline Supplementation on Blood Pressure: a Systematic Review and Meta-Analysis of Clinical Trials', 'Meta-analysis (Curr Hypertens Rep, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/30284051/'),
  ('doctors-best-l-citrulline-powder', 'Effects of Citrulline or Watermelon Supplementation on Body Composition: A Systematic Review and Dose-Response Meta-Analysis', 'Meta-analysis (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41097202/'),
  ('doctors-best-l-citrulline-powder', 'Effects of Citrulline Malate Supplementation on Muscle Strength in Resistance-Trained Adults: A Systematic Review and Meta-Analysis of Randomized Controlled Trials', 'Meta-analysis (J Diet Suppl, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34176406/'),
  ('doctors-best-l-citrulline-powder', 'Effects of Citrulline Supplementation on Exercise Performance in Humans: A Review of the Current Literature', 'Systematic review (J Strength Cond Res, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31977835/'),
  -- thorne-l-arginine-plus
  ('thorne-l-arginine-plus', 'The Effect of Amino Acids on Wound Healing: A Systematic Review and Meta-Analysis on Arginine and Glutamine', 'Meta-analysis (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34444657/'),
  ('thorne-l-arginine-plus', 'Effect of food sources of nitrate, polyphenols, L-arginine and L-citrulline on endurance exercise performance: a systematic review and meta-analysis of randomised controlled trials', 'Meta-analysis (J Int Soc Sports Nutr, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34965876/'),
  ('thorne-l-arginine-plus', 'The influence of arginine supplementation on IGF-1: A systematic review and meta-analysis', 'Meta-analysis (Clin Nutr ESPEN, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37202084/'),
  ('thorne-l-arginine-plus', 'Effect of L-arginine on immune function: a meta-analysis', 'Meta-analysis (Asia Pac J Clin Nutr, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/25164444/'),
  ('thorne-l-arginine-plus', 'Effect of l-Arginine Supplementation on Blood Pressure in Adults: A Systematic Review and Dose-Response Meta-analysis of Randomized Clinical Trials', 'Meta-analysis (Adv Nutr, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34967840/'),
  -- doctors-best-pure-l-arginine-powder
  ('doctors-best-pure-l-arginine-powder', 'The Effect of Amino Acids on Wound Healing: A Systematic Review and Meta-Analysis on Arginine and Glutamine', 'Meta-analysis (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34444657/'),
  ('doctors-best-pure-l-arginine-powder', 'Effect of food sources of nitrate, polyphenols, L-arginine and L-citrulline on endurance exercise performance: a systematic review and meta-analysis of randomised controlled trials', 'Meta-analysis (J Int Soc Sports Nutr, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34965876/'),
  ('doctors-best-pure-l-arginine-powder', 'The influence of arginine supplementation on IGF-1: A systematic review and meta-analysis', 'Meta-analysis (Clin Nutr ESPEN, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37202084/'),
  ('doctors-best-pure-l-arginine-powder', 'Effect of L-arginine on immune function: a meta-analysis', 'Meta-analysis (Asia Pac J Clin Nutr, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/25164444/'),
  ('doctors-best-pure-l-arginine-powder', 'Effect of l-Arginine Supplementation on Blood Pressure in Adults: A Systematic Review and Dose-Response Meta-analysis of Randomized Clinical Trials', 'Meta-analysis (Adv Nutr, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34967840/'),
  -- life-extension-l-arginine-caps-700-mg
  ('life-extension-l-arginine-caps-700-mg', 'The Effect of Amino Acids on Wound Healing: A Systematic Review and Meta-Analysis on Arginine and Glutamine', 'Meta-analysis (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34444657/'),
  ('life-extension-l-arginine-caps-700-mg', 'Effect of food sources of nitrate, polyphenols, L-arginine and L-citrulline on endurance exercise performance: a systematic review and meta-analysis of randomised controlled trials', 'Meta-analysis (J Int Soc Sports Nutr, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34965876/'),
  ('life-extension-l-arginine-caps-700-mg', 'The influence of arginine supplementation on IGF-1: A systematic review and meta-analysis', 'Meta-analysis (Clin Nutr ESPEN, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37202084/'),
  ('life-extension-l-arginine-caps-700-mg', 'Effect of L-arginine on immune function: a meta-analysis', 'Meta-analysis (Asia Pac J Clin Nutr, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/25164444/'),
  ('life-extension-l-arginine-caps-700-mg', 'Effect of l-Arginine Supplementation on Blood Pressure in Adults: A Systematic Review and Dose-Response Meta-analysis of Randomized Clinical Trials', 'Meta-analysis (Adv Nutr, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34967840/'),
  -- life-extension-bio-collagen-with-patented-uc-ii-40-mg
  ('life-extension-bio-collagen-with-patented-uc-ii-40-mg', 'Efficacy and tolerability of an undenatured type II collagen supplement in modulating knee osteoarthritis symptoms: a multicenter randomized, double-blind, placebo-controlled study', 'Randomised controlled trial (Nutr J, 2016)', 'https://pubmed.ncbi.nlm.nih.gov/26822714/'),
  ('life-extension-bio-collagen-with-patented-uc-ii-40-mg', 'Impact of Collagen Peptide Supplementation in Combination with Long-Term Physical Training on Strength, Musculotendinous Remodeling, Functional Recovery, and Body Composition in Healthy Adults: A Systematic Review with Meta-analysis', 'Meta-analysis (Sports Med, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39060741/'),
  ('life-extension-bio-collagen-with-patented-uc-ii-40-mg', 'UC-II Undenatured Type II Collagen for Knee Joint Flexibility: A Multicenter, Randomized, Double-Blind, Placebo-Controlled Clinical Study', 'Randomised controlled trial (J Integr Complement Med, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35377244/'),
  ('life-extension-bio-collagen-with-patented-uc-ii-40-mg', 'The effects of collagen peptide supplementation on body composition, collagen synthesis, and recovery from joint injury and exercise: a systematic review', 'Systematic review (Amino Acids, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34491424/'),
  ('life-extension-bio-collagen-with-patented-uc-ii-40-mg', 'Safety and efficacy of undenatured type II collagen in the treatment of osteoarthritis of the knee: a clinical trial', 'Randomised controlled trial (Int J Med Sci, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19847319/'),
  -- thorne-joint-support-nutrients
  ('thorne-joint-support-nutrients', 'Efficacy and safety of the combination of glucosamine and chondroitin for knee osteoarthritis: a systematic review and meta-analysis', 'Meta-analysis (Arch Orthop Trauma Surg, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35024906/'),
  ('thorne-joint-support-nutrients', 'Using the Rise and Fall of Oxidative Stress and Inflammation Post-Exercise to Evaluate the Effect of Methylsulfonylmethane Supplementation on Immune Response mRNA', 'Randomised controlled trial (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40507030/'),
  ('thorne-joint-support-nutrients', 'Effectiveness of Boswellia and Boswellia extract for osteoarthritis patients: a systematic review and meta-analysis', 'Meta-analysis (BMC Complement Med Ther, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32680575/'),
  ('thorne-joint-support-nutrients', 'Anti-inflammatory effects of oral supplementation with curcumin: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Nutr Rev, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34378053/'),
  ('thorne-joint-support-nutrients', 'Effectiveness and safety of glucosamine and chondroitin for the treatment of osteoarthritis: a meta-analysis of randomized controlled trials', 'Meta-analysis (J Orthop Surg Res, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29980200/'),
  -- thorne-boswellia-phytosome
  ('thorne-boswellia-phytosome', 'Effectiveness of Boswellia and Boswellia extract for osteoarthritis patients: a systematic review and meta-analysis', 'Meta-analysis (BMC Complement Med Ther, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32680575/'),
  ('thorne-boswellia-phytosome', 'Efficacy of Extracts of Oleogum Resin of Boswellia in the Treatment of Knee Osteoarthritis: A Systematic Review and Meta-Analysis', 'Meta-analysis (Phytother Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39314013/'),
  ('thorne-boswellia-phytosome', 'Efficacy of curcumin and Boswellia for knee osteoarthritis: Systematic review and meta-analysis', 'Meta-analysis (Semin Arthritis Rheum, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29622343/'),
  ('thorne-boswellia-phytosome', 'Efficacy evaluation of standardized Boswellia serrata extract (Aflapin(Ⓡ)) in osteoarthritis: A systematic review and sub-group meta-analysis study', 'Meta-analysis (Explore (NY), 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38365549/'),
  ('thorne-boswellia-phytosome', 'Frankincense: systematic review', 'Systematic review (BMJ, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/19091760/'),
  -- swanson-boswellia-serrata-extract-125-mg
  ('swanson-boswellia-serrata-extract-125-mg', 'Effectiveness of Boswellia and Boswellia extract for osteoarthritis patients: a systematic review and meta-analysis', 'Meta-analysis (BMC Complement Med Ther, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32680575/'),
  ('swanson-boswellia-serrata-extract-125-mg', 'Efficacy of Extracts of Oleogum Resin of Boswellia in the Treatment of Knee Osteoarthritis: A Systematic Review and Meta-Analysis', 'Meta-analysis (Phytother Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39314013/'),
  ('swanson-boswellia-serrata-extract-125-mg', 'Efficacy of curcumin and Boswellia for knee osteoarthritis: Systematic review and meta-analysis', 'Meta-analysis (Semin Arthritis Rheum, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29622343/'),
  ('swanson-boswellia-serrata-extract-125-mg', 'Efficacy evaluation of standardized Boswellia serrata extract (Aflapin(Ⓡ)) in osteoarthritis: A systematic review and sub-group meta-analysis study', 'Meta-analysis (Explore (NY), 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38365549/'),
  ('swanson-boswellia-serrata-extract-125-mg', 'Frankincense: systematic review', 'Systematic review (BMJ, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/19091760/'),
  -- now-boswellia-extract-plus-turmeric-root
  ('now-boswellia-extract-plus-turmeric-root', 'Effectiveness of Boswellia and Boswellia extract for osteoarthritis patients: a systematic review and meta-analysis', 'Meta-analysis (BMC Complement Med Ther, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32680575/'),
  ('now-boswellia-extract-plus-turmeric-root', 'Anti-inflammatory effects of oral supplementation with curcumin: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Nutr Rev, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34378053/'),
  ('now-boswellia-extract-plus-turmeric-root', 'Efficacy of Extracts of Oleogum Resin of Boswellia in the Treatment of Knee Osteoarthritis: A Systematic Review and Meta-Analysis', 'Meta-analysis (Phytother Res, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39314013/'),
  ('now-boswellia-extract-plus-turmeric-root', 'The effect of oral curcumin supplementation on health-related quality of life: A systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (J Affect Disord, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33038707/'),
  ('now-boswellia-extract-plus-turmeric-root', 'Efficacy of curcumin and Boswellia for knee osteoarthritis: Systematic review and meta-analysis', 'Meta-analysis (Semin Arthritis Rheum, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29622343/'),
  -- thorne-curcumin-phytosome-1000-mg
  ('thorne-curcumin-phytosome-1000-mg', 'Anti-inflammatory effects of oral supplementation with curcumin: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Nutr Rev, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34378053/'),
  ('thorne-curcumin-phytosome-1000-mg', 'The effect of oral curcumin supplementation on health-related quality of life: A systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (J Affect Disord, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33038707/'),
  ('thorne-curcumin-phytosome-1000-mg', 'Are curcuminoids effective C-reactive protein-lowering agents in clinical practice? Evidence from a meta-analysis', 'Meta-analysis (Phytother Res, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/23922235/'),
  ('thorne-curcumin-phytosome-1000-mg', 'Evaluation of curcumin intake in reducing exercise-induced muscle damage in athletes: a systematic review', 'Systematic review (J Int Soc Sports Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39623590/'),
  ('thorne-curcumin-phytosome-1000-mg', 'Curcumin for the Treatment of Prostate Diseases: A Systematic Review of Controlled Clinical Trials', 'Systematic review (Adv Exp Med Biol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34331700/'),
  -- sports-research-turmeric-curcumin-c3-complex
  ('sports-research-turmeric-curcumin-c3-complex', 'Anti-inflammatory effects of oral supplementation with curcumin: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Nutr Rev, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34378053/'),
  ('sports-research-turmeric-curcumin-c3-complex', 'The effect of oral curcumin supplementation on health-related quality of life: A systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (J Affect Disord, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33038707/'),
  ('sports-research-turmeric-curcumin-c3-complex', 'Are curcuminoids effective C-reactive protein-lowering agents in clinical practice? Evidence from a meta-analysis', 'Meta-analysis (Phytother Res, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/23922235/'),
  ('sports-research-turmeric-curcumin-c3-complex', 'Evaluation of curcumin intake in reducing exercise-induced muscle damage in athletes: a systematic review', 'Systematic review (J Int Soc Sports Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39623590/'),
  ('sports-research-turmeric-curcumin-c3-complex', 'Curcumin for the Treatment of Prostate Diseases: A Systematic Review of Controlled Clinical Trials', 'Systematic review (Adv Exp Med Biol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34331700/'),
  -- klean-athlete-klean-endurance
  ('klean-athlete-klean-endurance', 'Effect of ribose supplementation on resynthesis of adenine nucleotides after intense intermittent training in humans', 'Randomised controlled trial (Am J Physiol Regul Integr Comp Physiol, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/14660478/'),
  ('klean-athlete-klean-endurance', 'Effects of ribose supplementation prior to and during intense exercise on anaerobic capacity and metabolic markers', 'Randomised controlled trial (Int J Sport Nutr Exerc Metab, 2005)', 'https://pubmed.ncbi.nlm.nih.gov/16521849/'),
  ('klean-athlete-klean-endurance', 'Effects of oral D-ribose supplementation on anaerobic capacity and selected metabolic markers in healthy males', 'Randomised controlled trial (Int J Sport Nutr Exerc Metab, 2003)', 'https://pubmed.ncbi.nlm.nih.gov/12660407/'),
  ('klean-athlete-klean-endurance', 'A Combination of Nicotinamide and D-Ribose (RiaGev) Is Safe and Effective to Increase NAD(+) Metabolome in Healthy Middle-Aged Adults: A Randomized, Triple-Blind, Placebo-Controlled, Cross-Over Pilot Clinical Trial', 'Randomised controlled trial (Nutrients, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35684021/'),
  ('klean-athlete-klean-endurance', 'Effect of D-ribose supplementation on delayed onset muscle soreness induced by plyometric exercise in college students', 'Randomised controlled trial (J Int Soc Sports Nutr, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32778175/'),
  -- now-tribulus-1000-mg
  ('now-tribulus-1000-mg', 'Tribulus terrestris for management of patients with erectile dysfunction: a systematic review and meta-analysis of randomized trials', 'Meta-analysis (Int J Impot Res, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/40360723/'),
  ('now-tribulus-1000-mg', 'Effects of Tribulus (Tribulus terrestris L.) Supplementation on Erectile Dysfunction and Testosterone Levels in Men-A Systematic Review of Clinical Trials', 'Systematic review (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40219032/'),
  ('now-tribulus-1000-mg', 'A systematic review on the herbal extract Tribulus terrestris and the roots of its putative aphrodisiac and performance enhancing effect', 'Systematic review (J Diet Suppl, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24559105/'),
  ('now-tribulus-1000-mg', 'Effects of Tribulus terrestris L. on Sport and Health Biomarkers in Physically Active Adult Males: A Systematic Review', 'Systematic review (Int J Environ Res Public Health, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35954909/'),
  ('now-tribulus-1000-mg', 'Effect of Tribulus terrestris L. supplementation on Exercise-Induced Oxidative Stress and Delayed Onset Muscle Soreness Markers: A Pilot Study', 'Randomised controlled trial (J Diet Suppl, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/36073362/'),
  -- klean-athlete-klean-multivitamin
  ('klean-athlete-klean-multivitamin', 'Effect of multivitamin-mineral supplementation versus placebo on cognitive function: results from the clinic subcohort of the COcoa Supplement and Multivitamin Outcomes Study (COSMOS) randomized clinical trial and meta-analysis of 3 cognitive studies within COSMOS', 'Meta-analysis (Am J Clin Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38244989/'),
  ('klean-athlete-klean-multivitamin', 'Multivitamin-multimineral supplementation and mortality: a meta-analysis of randomized controlled trials', 'Meta-analysis (Am J Clin Nutr, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23255568/'),
  ('klean-athlete-klean-multivitamin', 'The Efficacy of Multivitamin, Vitamin A, Vitamin B, Vitamin C, and Vitamin D Supplements in the Prevention and Management of COVID-19 and Long-COVID: An Updated Systematic Review and Meta-Analysis of Randomized Clinical Trials', 'Meta-analysis (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38732592/'),
  ('klean-athlete-klean-multivitamin', 'A systematic review of multivitamin and multimineral supplementation for infection', 'Meta-analysis (J Hum Nutr Diet, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16756533/'),
  ('klean-athlete-klean-multivitamin', 'The effects of multivitamins on cognitive performance: a systematic review and meta-analysis', 'Meta-analysis (J Alzheimers Dis, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22330823/'),
  -- ============================================================ Immunity & gut
  -- jarrow-formulas-colostrum-prime-life-400-mg
  ('jarrow-formulas-colostrum-prime-life-400-mg', 'Bovine Colostrum in Increased Intestinal Permeability in Healthy Athletes and Patients: A Meta-Analysis of Randomized Clinical Trials', 'Meta-analysis (Dig Dis Sci, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38361147/'),
  ('jarrow-formulas-colostrum-prime-life-400-mg', 'Immunological Outcomes of Bovine Colostrum Supplementation in Trained and Physically Active People: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32276466/'),
  ('jarrow-formulas-colostrum-prime-life-400-mg', 'Bovine Colostrum Applications in Sick and Healthy People: A Systematic Review', 'Systematic review (Nutrients, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/34202206/'),
  ('jarrow-formulas-colostrum-prime-life-400-mg', 'Therapeutics effects of bovine colostrum applications on gastrointestinal diseases: a systematic review', 'Systematic review (Syst Rev, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38409162/'),
  ('jarrow-formulas-colostrum-prime-life-400-mg', 'Effect of bovine colostrum supplementation on gut health of children: A systematic review', 'Systematic review (J Pediatr Gastroenterol Nutr, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40150801/'),
  -- jarrow-formulas-lactoferrin-250-mg
  ('jarrow-formulas-lactoferrin-250-mg', 'Effect of Lactoferrin Supplementation on Inflammation, Immune Function, and Prevention of Respiratory Tract Infections in Humans: A Systematic Review and Meta-analysis', 'Meta-analysis (Adv Nutr, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35481594/'),
  ('jarrow-formulas-lactoferrin-250-mg', 'Efficacy of lactoferrin supplementation in pediatric infections: a systematic review and meta-analysis', 'Meta-analysis (Biochem Cell Biol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39841980/'),
  ('jarrow-formulas-lactoferrin-250-mg', 'Comparative Effects between Oral Lactoferrin and Ferrous Sulfate Supplementation on Iron-Deficiency Anemia: A Comprehensive Review and Meta-Analysis of Clinical Trials', 'Meta-analysis (Nutrients, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35276902/'),
  ('jarrow-formulas-lactoferrin-250-mg', 'Lactoferrin as treatment for iron-deficiency anemia in children: a systematic review', 'Systematic review (Turk J Pediatr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37661669/'),
  ('jarrow-formulas-lactoferrin-250-mg', 'A Patented Dietary Supplement (Hydroxy-Methyl-Butyrate, Carnosine, Magnesium, Butyrate, Lactoferrin) Is a Promising Therapeutic Target for Age-Related Sarcopenia through the Regulation of Gut Permeability: A Randomized Controlled Trial', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38732615/'),
  -- life-extension-lactoferrin-caps
  ('life-extension-lactoferrin-caps', 'Effect of Lactoferrin Supplementation on Inflammation, Immune Function, and Prevention of Respiratory Tract Infections in Humans: A Systematic Review and Meta-analysis', 'Meta-analysis (Adv Nutr, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35481594/'),
  ('life-extension-lactoferrin-caps', 'Efficacy of lactoferrin supplementation in pediatric infections: a systematic review and meta-analysis', 'Meta-analysis (Biochem Cell Biol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39841980/'),
  ('life-extension-lactoferrin-caps', 'Comparative Effects between Oral Lactoferrin and Ferrous Sulfate Supplementation on Iron-Deficiency Anemia: A Comprehensive Review and Meta-Analysis of Clinical Trials', 'Meta-analysis (Nutrients, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35276902/'),
  ('life-extension-lactoferrin-caps', 'Lactoferrin as treatment for iron-deficiency anemia in children: a systematic review', 'Systematic review (Turk J Pediatr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37661669/'),
  ('life-extension-lactoferrin-caps', 'A Patented Dietary Supplement (Hydroxy-Methyl-Butyrate, Carnosine, Magnesium, Butyrate, Lactoferrin) Is a Promising Therapeutic Target for Age-Related Sarcopenia through the Regulation of Gut Permeability: A Randomized Controlled Trial', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38732615/'),
  -- jarrow-formulas-beta-glucan-250-mg
  ('jarrow-formulas-beta-glucan-250-mg', 'Effects of fungal beta-glucans on health - a systematic review of randomized controlled trials', 'Systematic review (Food Funct, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33876798/'),
  ('jarrow-formulas-beta-glucan-250-mg', 'Yeast Beta-Glucan Enhances Antibody Response Following Influenza Vaccination - A Double-Blind, Randomized, Placebo-Controlled Pilot Trial', 'Randomised controlled trial (J Diet Suppl, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40746014/'),
  ('jarrow-formulas-beta-glucan-250-mg', 'Yeast Beta-Glucan Supplementation Downregulates Markers of Systemic Inflammation after Heated Treadmill Exercise', 'Randomised controlled trial (Nutrients, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32325856/'),
  ('jarrow-formulas-beta-glucan-250-mg', 'Yeast β-Glucan Modulates Inflammation and Waist Circumference in Overweight and Obese Subjects', 'Randomised controlled trial (J Diet Suppl, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/27715351/'),
  ('jarrow-formulas-beta-glucan-250-mg', 'Beta-glucan, immune function, and upper respiratory tract infections in athletes', 'Randomised controlled trial (Med Sci Sports Exerc, 2008)', 'https://pubmed.ncbi.nlm.nih.gov/18614945/'),
  -- solgar-echinacea-herb-extract
  ('solgar-echinacea-herb-extract', 'Echinacea for preventing and treating the common cold', 'Meta-analysis (Cochrane Database Syst Rev, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24554461/'),
  ('solgar-echinacea-herb-extract', 'Echinacea for preventing and treating the common cold', 'Meta-analysis (Cochrane Database Syst Rev, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16437427/'),
  ('solgar-echinacea-herb-extract', 'Echinacea in the prevention of induced rhinovirus colds: a meta-analysis', 'Meta-analysis (Clin Ther, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16678640/'),
  ('solgar-echinacea-herb-extract', 'Evaluation of echinacea for the prevention and treatment of the common cold: a meta-analysis', 'Meta-analysis (Lancet Infect Dis, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17597571/'),
  ('solgar-echinacea-herb-extract', 'Efficacy and safety of Echinacea purpurea in treating upper respiratory infections and complications of otitis media in children: Systematic review and meta-analysis', 'Meta-analysis (Clin Nutr ESPEN, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40311928/'),
  -- life-extension-echinacea-elite
  ('life-extension-echinacea-elite', 'Echinacea for preventing and treating the common cold', 'Meta-analysis (Cochrane Database Syst Rev, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24554461/'),
  ('life-extension-echinacea-elite', 'Echinacea for preventing and treating the common cold', 'Meta-analysis (Cochrane Database Syst Rev, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16437427/'),
  ('life-extension-echinacea-elite', 'Echinacea in the prevention of induced rhinovirus colds: a meta-analysis', 'Meta-analysis (Clin Ther, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16678640/'),
  ('life-extension-echinacea-elite', 'Evaluation of echinacea for the prevention and treatment of the common cold: a meta-analysis', 'Meta-analysis (Lancet Infect Dis, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17597571/'),
  ('life-extension-echinacea-elite', 'Efficacy and safety of Echinacea purpurea in treating upper respiratory infections and complications of otitis media in children: Systematic review and meta-analysis', 'Meta-analysis (Clin Nutr ESPEN, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40311928/'),
  -- life-extension-advanced-olive-leaf-vascular-support
  ('life-extension-advanced-olive-leaf-vascular-support', 'Olive leaf extract effect on cardiometabolic risk factors: a systematic review and meta-analysis of randomized clinical trials', 'Meta-analysis (Nutr Rev, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38287654/'),
  ('life-extension-advanced-olive-leaf-vascular-support', 'Metabolic and inflammatory effects of oleuropein and olive leaf extract: a systematic review and meta-analysis', 'Meta-analysis (Food Funct, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41848522/'),
  ('life-extension-advanced-olive-leaf-vascular-support', 'The impact of oleuropein, hydroxytyrosol, and tyrosol on cardiometabolic risk factors: a meta-analysis of randomized controlled trials', 'Meta-analysis (Crit Rev Food Sci Nutr, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39828996/'),
  ('life-extension-advanced-olive-leaf-vascular-support', 'Olive Leaf Extract Supplementation Improves Postmenopausal Symptoms: A Randomized, Double-Blind, Placebo-Controlled Parallel Study on Postmenopausal Women', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39599665/'),
  ('life-extension-advanced-olive-leaf-vascular-support', 'Beneficial Effect of Olive Leaf Extract as an Adjunct to Standard Antifungal Therapy in Treating Candida-Related Oral Diseases', 'Randomised controlled trial (Int J Mol Sci, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40943119/'),
  -- bulksupplements-olive-leaf-extract
  ('bulksupplements-olive-leaf-extract', 'Olive leaf extract effect on cardiometabolic risk factors: a systematic review and meta-analysis of randomized clinical trials', 'Meta-analysis (Nutr Rev, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38287654/'),
  ('bulksupplements-olive-leaf-extract', 'Metabolic and inflammatory effects of oleuropein and olive leaf extract: a systematic review and meta-analysis', 'Meta-analysis (Food Funct, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41848522/'),
  ('bulksupplements-olive-leaf-extract', 'The impact of oleuropein, hydroxytyrosol, and tyrosol on cardiometabolic risk factors: a meta-analysis of randomized controlled trials', 'Meta-analysis (Crit Rev Food Sci Nutr, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39828996/'),
  ('bulksupplements-olive-leaf-extract', 'Olive Leaf Extract Supplementation Improves Postmenopausal Symptoms: A Randomized, Double-Blind, Placebo-Controlled Parallel Study on Postmenopausal Women', 'Randomised controlled trial (Nutrients, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39599665/'),
  ('bulksupplements-olive-leaf-extract', 'Beneficial Effect of Olive Leaf Extract as an Adjunct to Standard Antifungal Therapy in Treating Candida-Related Oral Diseases', 'Randomised controlled trial (Int J Mol Sci, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40943119/'),
  -- swanson-oregano-oil-liquid-extract
  ('swanson-oregano-oil-liquid-extract', 'Safety and tolerability of carvacrol in healthy subjects: a phase I clinical study', 'Randomised controlled trial (Drug Chem Toxicol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/30486682/'),
  ('swanson-oregano-oil-liquid-extract', 'Effect of Origanum dubium, Origanum vulgare subsp. hirtum, and Lavandula angustifolia essential oils on lipid profiles and liver biomarkers in athletes', 'Randomised controlled trial (Z Naturforsch C J Biosci, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34496170/'),
  ('swanson-oregano-oil-liquid-extract', 'Possible therapeutic effect of carvacrol on asthmatic patients: A randomized, double blind, placebo-controlled, Phase II clinical trial', 'Randomised controlled trial (Phytother Res, 2018)', 'https://pubmed.ncbi.nlm.nih.gov/29193478/'),
  ('swanson-oregano-oil-liquid-extract', 'Carvacrol improves pulmonary function tests, oxidant/antioxidant parameters and cytokine levels in asthmatic patients: A randomized, double-blind, clinical trial', 'Randomised controlled trial (Phytomedicine, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33773189/'),
  ('swanson-oregano-oil-liquid-extract', 'The effect of carvacrol on inflammatory mediators and respiratory symptoms in veterans exposed to sulfur mustard, a randomized, placebo-controlled trial', 'Randomised controlled trial (Respir Med, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30961947/'),
  -- host-defense-turkey-tail
  ('host-defense-turkey-tail', 'Efficacy of Yun Zhi (Coriolus versicolor) on survival in cancer patients: systematic review and meta-analysis', 'Meta-analysis (Recent Pat Inflamm Allergy Drug Discov, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22185453/'),
  ('host-defense-turkey-tail', 'Efficacy of adjuvant immunochemotherapy with polysaccharide K for patients with curatively resected colorectal cancer: a meta-analysis of centrally randomized controlled clinical trials', 'Meta-analysis (Cancer Immunol Immunother, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16133112/'),
  ('host-defense-turkey-tail', 'Efficacy of adjuvant immunochemotherapy with polysaccharide K for patients with curative resections of gastric cancer', 'Meta-analysis (Cancer Immunol Immunother, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17106715/'),
  ('host-defense-turkey-tail', 'Polysaccharide K and Coriolus versicolor extracts for lung cancer: a systematic review', 'Systematic review (Integr Cancer Ther, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25784670/'),
  ('host-defense-turkey-tail', 'Coriolus (Trametes) versicolor mushroom to reduce adverse effects from chemotherapy or radiotherapy in people with colorectal cancer', 'Systematic review (Cochrane Database Syst Rev, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36445793/'),
  -- host-defense-maitake-extract
  ('host-defense-maitake-extract', 'Maitake mushroom (Grifola frondosa): systematic review by the natural standard research collaboration', 'Systematic review (J Soc Integr Oncol, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19476741/'),
  ('host-defense-maitake-extract', 'Maitake Mushroom (Grifola frondosa) Enhances Cognitive Function in Healthy Older Japanese: A Randomized, Double-Blind, Placebo-Controlled Trial', 'Randomised controlled trial (J Nutr Sci Vitaminol (Tokyo), 2026)', 'https://pubmed.ncbi.nlm.nih.gov/42055721/'),
  ('host-defense-maitake-extract', 'Effect of Maitake D-fraction in advanced laryngeal and pharyngeal cancers during concurrent chemoradiotherapy: A randomized clinical trial', 'Randomised controlled trial (Acta Biochim Pol, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36070433/'),
  ('host-defense-maitake-extract', 'Maitake mushroom (Grifola frondosa) extract induces ovulation in patients with polycystic ovary syndrome: a possible monotherapy and a combination therapy after failure with first-line clomiphene citrate', 'Randomised controlled trial (J Altern Complement Med, 2010)', 'https://pubmed.ncbi.nlm.nih.gov/21034160/'),
  ('host-defense-maitake-extract', 'A phase I/II trial of a polysaccharide extract from Grifola frondosa (Maitake mushroom) in breast cancer patients: immunological effects', 'Randomised controlled trial (J Cancer Res Clin Oncol, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19253021/'),
  -- host-defense-shiitake-extract
  ('host-defense-shiitake-extract', 'Consuming Lentinula edodes (Shiitake) Mushrooms Daily Improves Human Immunity: A Randomized Dietary Intervention in Healthy Young Adults', 'Randomised controlled trial (J Am Coll Nutr, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25866155/'),
  ('host-defense-shiitake-extract', 'Modulation of human intestinal microbiota in a clinical trial by consumption of a β-D-glucan-enriched extract obtained from Lentinula edodes', 'Randomised controlled trial (Eur J Nutr, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33580297/'),
  ('host-defense-shiitake-extract', 'A placebo-controlled trial of the immune modulator, lentinan, in HIV-positive patients: a phase I/II trial', 'Randomised controlled trial (J Med, 1998)', 'https://pubmed.ncbi.nlm.nih.gov/10503166/'),
  ('host-defense-shiitake-extract', 'Supplementation with a soluble β-glucan exported from Shiitake medicinal mushroom, Lentinus edodes (Berk.) singer mycelium: a crossover, placebo-controlled study in healthy elderly', 'Randomised controlled trial (Int J Med Mushrooms, 2011)', 'https://pubmed.ncbi.nlm.nih.gov/22164761/'),
  ('host-defense-shiitake-extract', 'A Quality-of-Life Study in Healthy Adults Supplemented with Lentinex® Beta-Glucan of Shiitake Culinary-Medicinal Mushroom, Lentinus edodes (Agaricomycetes)', 'Randomised controlled trial (Int J Med Mushrooms, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32749096/'),
  -- host-defense-mycommunity
  ('host-defense-mycommunity', 'Efficacy of Yun Zhi (Coriolus versicolor) on survival in cancer patients: systematic review and meta-analysis', 'Meta-analysis (Recent Pat Inflamm Allergy Drug Discov, 2012)', 'https://pubmed.ncbi.nlm.nih.gov/22185453/'),
  ('host-defense-mycommunity', 'Maitake mushroom (Grifola frondosa): systematic review by the natural standard research collaboration', 'Systematic review (J Soc Integr Oncol, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19476741/'),
  ('host-defense-mycommunity', 'Ganoderma lucidum dry extract supplementation modulates T lymphocyte function in older women', 'Randomised controlled trial (Br J Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38800991/'),
  ('host-defense-mycommunity', 'Review on Chaga Medicinal Mushroom, Inonotus obliquus (Higher Basidiomycetes): Realm of Medicinal Applications and Approaches on Estimating its Resource Potential', 'Review (Int J Med Mushrooms, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25746615/'),
  ('host-defense-mycommunity', 'Efficacy of adjuvant immunochemotherapy with polysaccharide K for patients with curatively resected colorectal cancer: a meta-analysis of centrally randomized controlled clinical trials', 'Meta-analysis (Cancer Immunol Immunother, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16133112/'),
  -- host-defense-stamets-7-extracts
  ('host-defense-stamets-7-extracts', 'Ganoderma lucidum dry extract supplementation modulates T lymphocyte function in older women', 'Randomised controlled trial (Br J Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38800991/'),
  ('host-defense-stamets-7-extracts', 'Maitake mushroom (Grifola frondosa): systematic review by the natural standard research collaboration', 'Systematic review (J Soc Integr Oncol, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19476741/'),
  ('host-defense-stamets-7-extracts', 'Cordyceps Sinensis (CordyMax Cs-4) supplementation does not improve endurance exercise performance', 'Randomised controlled trial (Int J Sport Nutr Exerc Metab, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/15118196/'),
  ('host-defense-stamets-7-extracts', 'Review on Chaga Medicinal Mushroom, Inonotus obliquus (Higher Basidiomycetes): Realm of Medicinal Applications and Approaches on Estimating its Resource Potential', 'Review (Int J Med Mushrooms, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25746615/'),
  ('host-defense-stamets-7-extracts', 'Ganoderma lucidum (''Lingzhi''); acute and short-term biomarker response to supplementation', 'Randomised controlled trial (Int J Food Sci Nutr, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/14630595/'),
  -- solgar-flavo-zinc-lozenge
  ('solgar-flavo-zinc-lozenge', 'Zinc supplementation for acute and persistent watery diarrhoea in children: A systematic review and meta-analysis', 'Meta-analysis (J Glob Health, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39641338/'),
  ('solgar-flavo-zinc-lozenge', 'Zinc supplementation and COVID-19 mortality: a meta-analysis', 'Meta-analysis (Eur J Med Res, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35599332/'),
  ('solgar-flavo-zinc-lozenge', 'Zinc for the common cold', 'Meta-analysis (Cochrane Database Syst Rev, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23775705/'),
  ('solgar-flavo-zinc-lozenge', 'Zinc in depression: a meta-analysis', 'Meta-analysis (Biol Psychiatry, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23806573/'),
  ('solgar-flavo-zinc-lozenge', 'Zinc and atopic dermatitis: a systematic review and meta-analysis', 'Meta-analysis (J Eur Acad Dermatol Venereol, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30801794/'),
  -- klean-athlete-klean-zinc
  ('klean-athlete-klean-zinc', 'Zinc supplementation for acute and persistent watery diarrhoea in children: A systematic review and meta-analysis', 'Meta-analysis (J Glob Health, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39641338/'),
  ('klean-athlete-klean-zinc', 'Zinc supplementation and COVID-19 mortality: a meta-analysis', 'Meta-analysis (Eur J Med Res, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/35599332/'),
  ('klean-athlete-klean-zinc', 'Zinc for the common cold', 'Meta-analysis (Cochrane Database Syst Rev, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23775705/'),
  ('klean-athlete-klean-zinc', 'Zinc in depression: a meta-analysis', 'Meta-analysis (Biol Psychiatry, 2013)', 'https://pubmed.ncbi.nlm.nih.gov/23806573/'),
  ('klean-athlete-klean-zinc', 'Zinc and atopic dermatitis: a systematic review and meta-analysis', 'Meta-analysis (J Eur Acad Dermatol Venereol, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30801794/'),
  -- bulksupplements-bee-propolis-powder
  ('bulksupplements-bee-propolis-powder', 'The impact of propolis supplementation on inflammatory biomarkers: A meta-analysis and systematic review of randomized controlled clinical trials', 'Meta-analysis (Prostaglandins Other Lipid Mediat, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39490733/'),
  ('bulksupplements-bee-propolis-powder', 'Propolis supplementation can reduce serum level of interleukin-6, C-reactive protein, and tumor necrosis factor-α: an updated systematic review and dose-response meta-analysis on randomized clinical trials', 'Meta-analysis (J Health Popul Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39127756/'),
  ('bulksupplements-bee-propolis-powder', 'The effect of propolis supplementation on blood pressure: a systematic review and meta-analysis of controlled trials', 'Meta-analysis (Minerva Cardiol Angiol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/39846965/'),
  ('bulksupplements-bee-propolis-powder', 'Effects of Propolis Consumption on Glycemic Indices and Liver Enzymes in Adults: A Grading of Recommendations Assessment, Development, and Valuation-assessed Systematic Review and Dose-Response Meta-analysis', 'Meta-analysis (Clin Ther, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39097520/'),
  ('bulksupplements-bee-propolis-powder', 'The efficacy of propolis on markers of glycemic control in adults with type 2 diabetes mellitus: A systematic review and meta-analysis', 'Meta-analysis (Phytother Res, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30950136/'),
  -- pure-encapsulations-cats-claw
  ('pure-encapsulations-cats-claw', 'DNA repair enhancement of aqueous extracts of Uncaria tomentosa in a human volunteer study', 'Randomised controlled trial (Phytomedicine, 2001)', 'https://pubmed.ncbi.nlm.nih.gov/11515717/'),
  ('pure-encapsulations-cats-claw', 'Randomized double blind trial of an extract from the pentacyclic alkaloid-chemotype of uncaria tomentosa for the treatment of rheumatoid arthritis', 'Randomised controlled trial (J Rheumatol, 2002)', 'https://pubmed.ncbi.nlm.nih.gov/11950006/'),
  ('pure-encapsulations-cats-claw', 'Efficacy and safety of freeze-dried cat''s claw in osteoarthritis of the knee: mechanisms of action of the species Uncaria guianensis', 'Randomised controlled trial (Inflamm Res, 2001)', 'https://pubmed.ncbi.nlm.nih.gov/11603848/'),
  ('pure-encapsulations-cats-claw', 'Persistent response to pneumococcal vaccine in individuals supplemented with a novel water soluble extract of Uncaria tomentosa, C-Med-100', 'Randomised controlled trial (Phytomedicine, 2001)', 'https://pubmed.ncbi.nlm.nih.gov/11515716/'),
  ('pure-encapsulations-cats-claw', 'Uncaria tomentosa', 'Review (G Ital Dermatol Venereol, 2017)', 'https://pubmed.ncbi.nlm.nih.gov/29050447/'),
  -- swanson-chinese-skullcap-400-mg
  ('swanson-chinese-skullcap-400-mg', 'Effects of a Scutellaria baicalensis/Crataegus laevigata, magnesium and chromium supplement on stressed individuals: A randomised, double-blind, placebo-controlled, crossover trial', 'Randomised controlled trial (J Psychopharmacol, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41194549/'),
  ('swanson-chinese-skullcap-400-mg', 'The Effects of Combined Scutellaria and Saffron Supplementation on Mood Regulation in Participants with Mild-to-Moderate Depressive Symptoms: A Randomized, Double-Blind, Placebo-Controlled Study', 'Randomised controlled trial (Nutrients, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40077679/'),
  ('swanson-chinese-skullcap-400-mg', 'Combined effects of Scutellaria baicalensis with metformin on glucose tolerance of patients with type 2 diabetes via gut microbiota modulation', 'Randomised controlled trial (Am J Physiol Endocrinol Metab, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31770016/'),
  ('swanson-chinese-skullcap-400-mg', 'A combination of Scutellaria baicalensis and Acacia catechu extracts for short-term symptomatic relief of joint discomfort associated with osteoarthritis of the knee', 'Randomised controlled trial (J Med Food, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24611484/'),
  ('swanson-chinese-skullcap-400-mg', 'Safety, tolerability, pharmacokinetics, and food effect of baicalein tablets in healthy Chinese subjects: A single-center, randomized, double-blind, placebo-controlled, single-dose phase I study', 'Randomised controlled trial (J Ethnopharmacol, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/33753147/'),
  -- jarrow-formulas-saccharomyces-boulardii-mos
  ('jarrow-formulas-saccharomyces-boulardii-mos', 'Efficacy and safety of Saccharomyces boulardii for acute diarrhea', 'Meta-analysis (Pediatrics, 2014)', 'https://pubmed.ncbi.nlm.nih.gov/24958586/'),
  ('jarrow-formulas-saccharomyces-boulardii-mos', 'Systematic review with meta-analysis: Saccharomyces boulardii supplementation and eradication of Helicobacter pylori infection', 'Meta-analysis (Aliment Pharmacol Ther, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/25898944/'),
  ('jarrow-formulas-saccharomyces-boulardii-mos', 'Meta-analysis: Saccharomyces boulardii for treating acute diarrhoea in children', 'Meta-analysis (Aliment Pharmacol Ther, 2007)', 'https://pubmed.ncbi.nlm.nih.gov/17269987/'),
  ('jarrow-formulas-saccharomyces-boulardii-mos', 'Meta-analysis: non-pathogenic yeast Saccharomyces boulardii in the prevention of antibiotic-associated diarrhoea', 'Meta-analysis (Aliment Pharmacol Ther, 2005)', 'https://pubmed.ncbi.nlm.nih.gov/16128673/'),
  ('jarrow-formulas-saccharomyces-boulardii-mos', 'Systematic review with meta-analysis: Saccharomyces boulardii in the prevention of antibiotic-associated diarrhoea', 'Meta-analysis (Aliment Pharmacol Ther, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/26216624/'),
  -- swanson-lactobacillus-rhamnosus-with-fos
  ('swanson-lactobacillus-rhamnosus-with-fos', 'Systematic review with meta-analysis: Lactobacillus rhamnosus GG for treating acute gastroenteritis in children - a 2019 update', 'Meta-analysis (Aliment Pharmacol Ther, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/31025399/'),
  ('swanson-lactobacillus-rhamnosus-with-fos', 'Effect of Fructooligosaccharides Supplementation on the Gut Microbiota in Human: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36014803/'),
  ('swanson-lactobacillus-rhamnosus-with-fos', 'Systematic review with meta-analysis: Lactobacillus rhamnosus GG in the prevention of antibiotic-associated diarrhoea in children and adults', 'Meta-analysis (Aliment Pharmacol Ther, 2015)', 'https://pubmed.ncbi.nlm.nih.gov/26365389/'),
  ('swanson-lactobacillus-rhamnosus-with-fos', 'Fructooligosaccharides on inflammation, immunomodulation, oxidative stress, and gut immune response: a systematic review', 'Systematic review (Nutr Rev, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34966938/'),
  ('swanson-lactobacillus-rhamnosus-with-fos', 'The effects of Lacticaseibacillus rhamnosus GG supplementation on gastrointestinal and respiratory outcomes: a systematic review and meta-analysis of randomized controlled trials', 'Meta-analysis (Food Funct, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40702885/'),
  -- jarrow-formulas-jarro-dophilus-eps-25-billion
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'Probiotic Strains and Intervention Total Doses for Modulating Obesity-Related Microbiota Dysbiosis: A Systematic Review and Meta-analysis', 'Meta-analysis (Nutrients, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32610476/'),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'Effects of dietary fibers or probiotics on functional constipation symptoms and roles of gut microbiota: a double-blinded randomized placebo trial', 'Randomised controlled trial (Gut Microbes, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37078654/'),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'Probiotics and Antibiotic-Induced Microbial Aberrations in Children: A Secondary Analysis of a Randomized Clinical Trial', 'Randomised controlled trial (JAMA Netw Open, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38967929/'),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'Efficacy of probiotic supplementation in reducing primary dysmenorrhea: a double-blinded randomized controlled trial', 'Randomised controlled trial (Sci Rep, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41844737/'),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'Exploring neurotransmitter regulation following probiotic supplementation in adults with subthreshold depression: A secondary analysis of a randomized controlled trial', 'Randomised controlled trial (Nutrition, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40729791/'),
  -- pure-encapsulations-probiotic-50b
  ('pure-encapsulations-probiotic-50b', 'Probiotic Strains and Intervention Total Doses for Modulating Obesity-Related Microbiota Dysbiosis: A Systematic Review and Meta-analysis', 'Meta-analysis (Nutrients, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32610476/'),
  ('pure-encapsulations-probiotic-50b', 'Effects of dietary fibers or probiotics on functional constipation symptoms and roles of gut microbiota: a double-blinded randomized placebo trial', 'Randomised controlled trial (Gut Microbes, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37078654/'),
  ('pure-encapsulations-probiotic-50b', 'Probiotics and Antibiotic-Induced Microbial Aberrations in Children: A Secondary Analysis of a Randomized Clinical Trial', 'Randomised controlled trial (JAMA Netw Open, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38967929/'),
  ('pure-encapsulations-probiotic-50b', 'Efficacy of probiotic supplementation in reducing primary dysmenorrhea: a double-blinded randomized controlled trial', 'Randomised controlled trial (Sci Rep, 2026)', 'https://pubmed.ncbi.nlm.nih.gov/41844737/'),
  ('pure-encapsulations-probiotic-50b', 'Exploring neurotransmitter regulation following probiotic supplementation in adults with subthreshold depression: A secondary analysis of a randomized controlled trial', 'Randomised controlled trial (Nutrition, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/40729791/'),
  -- thorne-florasport-20b
  ('thorne-florasport-20b', 'Probiotic Strains and Intervention Total Doses for Modulating Obesity-Related Microbiota Dysbiosis: A Systematic Review and Meta-analysis', 'Meta-analysis (Nutrients, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/32610476/'),
  ('thorne-florasport-20b', 'The probiotic Bacillus subtilis BS50 decreases gastrointestinal symptoms in healthy adults: a randomized, double-blind, placebo-controlled trial', 'Randomised controlled trial (Gut Microbes, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36269141/'),
  ('thorne-florasport-20b', 'Effects of dietary fibers or probiotics on functional constipation symptoms and roles of gut microbiota: a double-blinded randomized placebo trial', 'Randomised controlled trial (Gut Microbes, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/37078654/'),
  ('thorne-florasport-20b', 'Bacillus subtilis DE111 intake may improve blood lipids and endothelial function in healthy adults', 'Randomised controlled trial (Benef Microbes, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/33161737/'),
  ('thorne-florasport-20b', 'Probiotics and Antibiotic-Induced Microbial Aberrations in Children: A Secondary Analysis of a Randomized Clinical Trial', 'Randomised controlled trial (JAMA Netw Open, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38967929/'),
  -- jarrow-formulas-prebiotic-inulin-fos
  ('jarrow-formulas-prebiotic-inulin-fos', 'The effects of chicory inulin-type fructans supplementation on weight management outcomes: systematic review, meta-analysis, and meta-regression of randomized controlled trials', 'Meta-analysis (Am J Clin Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39313030/'),
  ('jarrow-formulas-prebiotic-inulin-fos', 'Effect of Fructooligosaccharides Supplementation on the Gut Microbiota in Human: A Systematic Review and Meta-Analysis', 'Meta-analysis (Nutrients, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/36014803/'),
  ('jarrow-formulas-prebiotic-inulin-fos', 'Effect of chicory-derived inulin-type fructans on abundance of Bifidobacterium and on bowel function: a systematic review with meta-analyses', 'Meta-analysis (Crit Rev Food Sci Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35833477/'),
  ('jarrow-formulas-prebiotic-inulin-fos', 'Fructooligosaccharides on inflammation, immunomodulation, oxidative stress, and gut immune response: a systematic review', 'Systematic review (Nutr Rev, 2022)', 'https://pubmed.ncbi.nlm.nih.gov/34966938/'),
  ('jarrow-formulas-prebiotic-inulin-fos', 'The effects of inulin on gut microbial composition: a systematic review of evidence from human studies', 'Systematic review (Eur J Clin Microbiol Infect Dis, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31707507/'),
  -- swanson-inulin
  ('swanson-inulin', 'The effects of chicory inulin-type fructans supplementation on weight management outcomes: systematic review, meta-analysis, and meta-regression of randomized controlled trials', 'Meta-analysis (Am J Clin Nutr, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39313030/'),
  ('swanson-inulin', 'Effect of chicory-derived inulin-type fructans on abundance of Bifidobacterium and on bowel function: a systematic review with meta-analyses', 'Meta-analysis (Crit Rev Food Sci Nutr, 2023)', 'https://pubmed.ncbi.nlm.nih.gov/35833477/'),
  ('swanson-inulin', 'The effects of inulin on gut microbial composition: a systematic review of evidence from human studies', 'Systematic review (Eur J Clin Microbiol Infect Dis, 2020)', 'https://pubmed.ncbi.nlm.nih.gov/31707507/'),
  ('swanson-inulin', 'Enhancing gut microbiota and microbial function with inulin supplementation in children with obesity', 'Randomised controlled trial (Int J Obes (Lond), 2024)', 'https://pubmed.ncbi.nlm.nih.gov/39033197/'),
  ('swanson-inulin', 'Dietary supplementation with inulin-propionate ester or inulin improves insulin sensitivity in adults with overweight and obesity with distinct effects on the gut microbiota, plasma metabolome and systemic inflammatory responses: a randomised cross-over trial', 'Randomised controlled trial (Gut, 2019)', 'https://pubmed.ncbi.nlm.nih.gov/30971437/'),
  -- thorne-gi-relief
  ('thorne-gi-relief', 'Double-blind trial of deglycyrrhizinated liquorice in gastric ulcer', 'Randomised controlled trial (Gut, 1973)', 'https://pubmed.ncbi.nlm.nih.gov/4584640/'),
  ('thorne-gi-relief', 'Randomized, double-blind, placebo-controlled trial of oral aloe vera gel for active ulcerative colitis', 'Randomised controlled trial (Aliment Pharmacol Ther, 2004)', 'https://pubmed.ncbi.nlm.nih.gov/15043514/'),
  ('thorne-gi-relief', 'Some experience with deglycyrrhizinated liquorice in the treatment of gastric and duodenal ulcers with special reference to its spasmolytic effect', 'Randomised controlled trial (Gut, 1968)', 'https://pubmed.ncbi.nlm.nih.gov/5640926/'),
  ('thorne-gi-relief', 'Randomised double-blind placebo-controlled trial of aloe vera for irritable bowel syndrome', 'Randomised controlled trial (Int J Clin Pract, 2006)', 'https://pubmed.ncbi.nlm.nih.gov/16749917/'),
  ('thorne-gi-relief', 'A trial of deglycyrrhizinated liquorice in the treatment of duodenal ulcer', 'Randomised controlled trial (Gut, 1971)', 'https://pubmed.ncbi.nlm.nih.gov/4933135/'),
  -- jarrow-formulas-mastic-gum-1000-mg
  ('jarrow-formulas-mastic-gum-1000-mg', 'The effect of mastic gum on Helicobacter pylori: a randomized pilot study', 'Randomised controlled trial (Phytomedicine, 2010)', 'https://pubmed.ncbi.nlm.nih.gov/19879118/'),
  ('jarrow-formulas-mastic-gum-1000-mg', 'Real-world safety and effectiveness of Pistacia lentiscus (mastic gum) in patients with diabetic gastroparesis: 24-week interim analysis postintervention', 'Randomised controlled trial (Indian J Pharmacol, 2024)', 'https://pubmed.ncbi.nlm.nih.gov/38454582/'),
  ('jarrow-formulas-mastic-gum-1000-mg', 'A randomized, three-way crossover clinical trial on the efficacy of Mastiha based therapies (Pistacia lentiscus var. Chia) in functional dyspepsia', 'Randomised controlled trial (Pharmacol Res, 2025)', 'https://pubmed.ncbi.nlm.nih.gov/41197785/'),
  ('jarrow-formulas-mastic-gum-1000-mg', 'Is Chios mastic gum effective in the treatment of functional dyspepsia? A prospective randomised double-blind placebo controlled trial', 'Randomised controlled trial (J Ethnopharmacol, 2010)', 'https://pubmed.ncbi.nlm.nih.gov/19961914/'),
  ('jarrow-formulas-mastic-gum-1000-mg', 'Effects of mastic gum Pistacia lentiscus var. Chia on innate cellular immune effectors', 'Clinical trial (Eur J Gastroenterol Hepatol, 2009)', 'https://pubmed.ncbi.nlm.nih.gov/19212203/')
) as v(slug, title, meta, url)
join public.glossary g on g.slug = v.slug
where not exists (
  select 1 from public.glossary_research r
  where r.glossary_id = g.id and r.url = v.url
);

-- ═══════════ 0024_ask_rate_limit ═══════════
-- One row per question put to the `ask` edge function. It exists for one
-- reason: the function refuses to call a paid model without first counting
-- what this person has already asked today.
--
-- The limits live in `supabase/functions/ask/lib.ts` (15 an hour, 50 a day)
-- rather than here, because they are a product decision and changing them
-- should not need a migration. Both windows are rolling — a fixed hourly
-- bucket lets someone spend a whole allowance twice across the boundary.
--
-- WHY NOT THE SERVICE ROLE. The function runs on the caller's own JWT and the
-- anon key, so these rows are written under RLS like everything else. That has
-- one honest consequence: a determined person with their own access token can
-- insert rows here directly. They can only ever make their own limit tighter —
-- there is no update or delete policy, so a count cannot be cleared from the
-- client, which is the direction that would matter. Holding a service-role key
-- inside the function to close the remaining gap costs more than it buys.
--
-- HOUSEKEEPING. Nothing prunes this table. Rows older than a day are read by
-- nothing, so a scheduled delete is worth adding — that is a decision about
-- extensions and cron on a live project, not something to switch on from here.

create table if not exists public.ask_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.ask_usage is
  'One row per question asked of the ask function. Read for the rolling rate limit and nothing else.';

alter table public.ask_usage enable row level security;

-- The only query the function runs against this table is "my rows, since a
-- point in time".
create index if not exists ask_usage_user_created_idx
  on public.ask_usage (user_id, created_at desc);

drop policy if exists "ask_usage: insert own" on public.ask_usage;
create policy "ask_usage: insert own"
  on public.ask_usage for insert
  with check (auth.uid() = user_id);

drop policy if exists "ask_usage: select own" on public.ask_usage;
create policy "ask_usage: select own"
  on public.ask_usage for select
  using (auth.uid() = user_id);

-- No update and no delete policy, deliberately. See the note above.

-- ═══════════ 0025_schedule_joins_stack ═══════════
-- Anything on the schedule belongs in the stack.
--
-- Adding to the stack from Discover offered to schedule the item, but nothing
-- ever went the other way: an item added from Today, or created by onboarding,
-- landed on the schedule and never reached the stack. The two lists drifted.
--
-- Two things kept them apart, and both are fixed here for rows that already
-- exist. New rows are handled in lib/api addScheduleItem.

-- 1. Items typed by hand carry no glossary_id at all, so they have nowhere to
--    go: stack_items.glossary_id is NOT NULL. Match them back to the catalogue
--    by name, case-insensitively, where a single entry matches.
update public.schedule_items s
set glossary_id = g.id
from public.glossary g
where s.glossary_id is null
  and lower(trim(s.name)) = lower(g.name);

-- 2. Everything scheduled and linked to the catalogue joins the owner's stack.
--    A user with no stack yet gets one, named the way the app names it.
insert into public.stacks (user_id, name)
select distinct s.user_id, 'My Stack'
from public.schedule_items s
where s.glossary_id is not null
  and not exists (select 1 from public.stacks k where k.user_id = s.user_id);

insert into public.stack_items (stack_id, glossary_id)
select distinct k.id, s.glossary_id
from public.schedule_items s
join public.stacks k on k.user_id = s.user_id
where s.glossary_id is not null
  and not exists (
    select 1 from public.stack_items existing
    where existing.stack_id = k.id and existing.glossary_id = s.glossary_id
  );

-- Removing something from the schedule deliberately does NOT remove it from the
-- stack. The stack is what you have; the schedule is when you take it. Stopping
-- a reminder is not the same as throwing the bottle away.

-- ═══════════ 0026_delete_account ═══════════
-- Account deletion, initiated by the account holder from inside the app.
--
-- App Store Review Guideline 5.1.1(v) has required this since June 2022: an app
-- that lets someone create an account must let them delete it from within the
-- app. Offering only a "email us and we'll do it" route is an explicit
-- rejection, and so is deleting the rows but leaving the login working.
--
-- WHY SECURITY DEFINER. `auth.users` is owned by the auth schema and no client
-- role can delete from it — that is the whole reason this cannot be done with a
-- PostgREST call from the app. The function runs as its owner so it can, and it
-- is written so that the only row it can ever reach is the caller's own:
--
--   * it takes no arguments, so there is no id to tamper with
--   * it reads `auth.uid()` from the request JWT, which the client cannot forge
--   * it raises rather than proceeding when that is null, so it can never run
--     unauthenticated and delete something arbitrary
--   * `search_path` is pinned, so a shadowed table cannot redirect the deletes
--
-- WHAT GOES. Everything owned by the caller. Most of it would cascade from the
-- auth.users row on its own — stacks, doses, schedule_items, progress_notes and
-- ask_usage all declare `on delete cascade` — but the deletes are written out
-- anyway. A cascade that is silently dropped in a later migration would
-- otherwise turn into data left behind on an account the user believes is gone,
-- and that is a privacy incident rather than a bug.
--
-- WHAT STAYS. The catalogue: glossary, glossary_research, nutrient_reference,
-- goal_synonyms. None of it is user data — it is the same library for everyone
-- and carries no reference back to the person who was reading it.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'delete_account: no authenticated user'
      using errcode = '28000';
  end if;

  -- Child rows first, so nothing depends on a parent that is already gone.
  -- stack_items has no user_id of its own; it hangs off stacks.
  delete from public.stack_items
    where stack_id in (select id from public.stacks where user_id = uid);
  delete from public.stacks         where user_id = uid;
  delete from public.doses          where user_id = uid;
  delete from public.schedule_items where user_id = uid;
  delete from public.progress_notes where user_id = uid;
  delete from public.ask_usage      where user_id = uid;
  delete from public.profiles       where id = uid;

  -- Last, and the reason this function exists: without it the rows are gone
  -- but the credentials still work, which is a half-deleted account.
  delete from auth.users where id = uid;
end;
$$;

comment on function public.delete_account() is
  'Deletes the calling user''s data and their auth record. Takes no arguments and reads auth.uid(), so it can only ever delete the caller. Required by App Store Review Guideline 5.1.1(v).';

-- `authenticated` only. `anon` holds no uid, so the guard above would raise
-- anyway, but not granting it at all is the clearer statement.
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- ═══════════ 0027_ask_reports ═══════════
-- Reports of objectionable assistant output.
--
-- App Store Review Guideline 1.2 requires an app that shows user-generated or
-- model-generated content to give people a way to report what they find
-- objectionable, and to act on it. A chat surface with no report control is a
-- rejection regardless of how well the model behaves, because the reviewer is
-- checking that the mechanism exists.
--
-- The row stores the question and the answer together. A report holding only
-- "this was bad" and a timestamp cannot be acted on — whoever reads it needs to
-- see what was asked and what came back, or there is nothing to fix.
--
-- WRITE-ONLY FROM THE CLIENT, deliberately. There is an insert policy and no
-- select policy, so a person can file a report and cannot read anyone's,
-- including their own. Reports are read from the dashboard by whoever is
-- triaging them.
--
-- `on delete cascade` means deleting an account takes its reports with it. That
-- is the right trade: 5.1.1(v) says deletion must actually delete, and a report
-- is not worth keeping a record of a deleted user for.

create table if not exists public.ask_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  answer text not null,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.ask_reports is
  'Assistant answers a user flagged as objectionable. Insert-only from the client; triaged from the dashboard. Required by App Store Review Guideline 1.2.';

alter table public.ask_reports enable row level security;

create index if not exists ask_reports_created_idx
  on public.ask_reports (created_at desc);

drop policy if exists "ask_reports: insert own" on public.ask_reports;
create policy "ask_reports: insert own"
  on public.ask_reports for insert
  with check (auth.uid() = user_id);

-- No select, update or delete policy. See the note above.

