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
