-- ==================== 0029_ingredient_rows.sql ====================
-- The ingredient panel for all 250 catalogue products, and the synonym
-- dictionary that makes it searchable.
--
-- GENERATED. `python scripts/build_ingredient_sql.py` from
-- `scripts/ingredients.json`, which `scripts/fetch_ingredients.py` builds by
-- calling https://api.ods.od.nih.gov/dsld/v9/label/<id> once per product. Every
-- amount and unit below is copied from the filing; none was typed by hand and
-- none was inferred. Re-run both to regenerate.
--
-- WHAT IS IN HERE. 652 rows across 250 products.
--   620 carry a canonical ingredient_key
--   32 do not, and are null — see below
--   328 are flagged is_primary
--   124 nutrition-facts rows (Calories, Total Fat, Protein) were dropped
--     entirely: they are real panel entries and they are not ingredients.
--
-- BLEND CONSTITUENTS ARE FLATTENED IN. A proprietary blend is one panel row
-- with its parts nested underneath. Those parts are exactly the hidden
-- ingredients the conflict rules are blind to today, so they are stored beside
-- their parent. They usually carry no amount, which is why `amount` is nullable
-- — the label genuinely does not say, and splitting the blend total across them
-- would be inventing a number the manufacturer withheld. The blend heading
-- itself is kept as a row with a null key, because it is what the label prints.
--
-- WHAT IS DELIBERATELY NULL. A null ingredient_key means "this string could not
-- be mapped to a canonical ingredient with confidence". Those rows stay
-- searchable by raw_name and never participate in a conflict rule. Guessing
-- would be worse: a rule firing on a misread ingredient moves someone's
-- schedule for a reason that does not exist.
--
-- ORDER. Requires 0028 for the tables, and the catalogue migrations for the
-- products themselves. Products absent from this database are skipped by the
-- join rather than failing — apply 0021 first for the full 250.


insert into public.ingredient_synonym (ingredient_key, synonym) values
  ('5-htp', '5-htp'),
  ('5-htp', '5-hydroxytryptophan'),
  ('5-htp', 'l-5-hydroxytryptophan'),
  ('acai', 'acai'),
  ('acai', 'acai berry extract'),
  ('agarikon', 'agarikon'),
  ('aloe', 'aloe'),
  ('aloe', 'aloe vera'),
  ('aloe', 'aloe vera, dehydrate, powder'),
  ('alpha-gpc', 'alpha-glycerylphosphorylcholine'),
  ('alpha-gpc', 'alpha-gpc'),
  ('alpha-lipoic-acid', 'alpha lipoic acid'),
  ('alpha-lipoic-acid', 'alpha-lipoic acid'),
  ('alpha-lipoic-acid', 'lipoic acid'),
  ('alpha-lipoic-acid', 'r-lipoic acid'),
  ('amadou', 'amadou'),
  ('amla', 'amla'),
  ('amla', 'amla fruit extract'),
  ('amla', 'capros'),
  ('amla', 'phyllanthus emblica'),
  ('apigenin', 'apigenin'),
  ('artists-conk', 'artist''s conk'),
  ('ashwagandha', 'ashwagandha'),
  ('ashwagandha', 'ksm-66'),
  ('ashwagandha', 'sensoril'),
  ('ashwagandha', 'withania somnifera'),
  ('astaxanthin', 'astaxanthin'),
  ('astaxanthin', 'icelandic astalif'),
  ('astragalus', 'astragalus'),
  ('astragalus', 'astragalus root extract'),
  ('bacopa', 'bacopa'),
  ('bacopa', 'bacopa monnieri standardized leaf extract'),
  ('bacopa', 'brahmi'),
  ('bacopa', 'synapsa'),
  ('bamboo', 'bamboo extract'),
  ('bamboo', 'bamboo leaf, stem extract'),
  ('berberine', 'berberine'),
  ('berberine', 'berberine phytosome berbactive blend'),
  ('beta-alanine', 'beta-alanine'),
  ('beta-alanine', 'carnosyn'),
  ('beta-alanine', 'sr carnosyn'),
  ('beta-glucan', 'barley beta-glucan'),
  ('beta-glucan', 'beta glucan'),
  ('beta-glucan', 'beta-1,3-1,6-glucan'),
  ('beta-glucan', 'beta-glucan'),
  ('beta-sitosterol', 'beta-sitosterol'),
  ('betaine', 'betaine'),
  ('betaine', 'betaine anhydrous'),
  ('betaine', 'tmg'),
  ('betaine', 'trimethylglycine'),
  ('biotin', 'biotin'),
  ('biotin', 'd-biotin'),
  ('biotin', 'vitamin b7'),
  ('birch-polypore', 'birch polypore'),
  ('black-cumin', 'black cumin seed oil'),
  ('black-cumin', 'black seed oil'),
  ('black-cumin', 'nigella sativa'),
  ('black-cumin', 'thymocid organic black cumin seed oil'),
  ('blueberry', 'bilberry'),
  ('blueberry', 'blueberry fruit extract'),
  ('blueberry', 'wild bilberry'),
  ('blueberry', 'wild blueberry'),
  ('blueberry', 'wild blueberry extract'),
  ('borage', 'borage oil'),
  ('borage', 'borage seed oil'),
  ('boron', 'boron'),
  ('boswellia', '5-loxin'),
  ('boswellia', 'boswellia extract'),
  ('boswellia', 'boswellia serrata'),
  ('boswellia', 'indian frankincense extract'),
  ('boswellia', 'indian frankincense phytosome complex'),
  ('caffeine', 'caffeine'),
  ('calcium', 'calcium'),
  ('calcium', 'calcium carbonate'),
  ('calcium', 'calcium citrate'),
  ('california-poppy', 'california poppy'),
  ('california-poppy', 'fresh california poppy'),
  ('carnitine', 'acetyl-l-carnitine'),
  ('carnitine', 'acetyl-l-carnitine arginate dihydrochloride'),
  ('carnitine', 'acetyl-l-carnitine hcl'),
  ('carnitine', 'acetyl-l-carnitine hydrochloride'),
  ('carnitine', 'carnitine'),
  ('carnitine', 'l-carnitine'),
  ('casein', 'casein'),
  ('casein', 'casein decapeptide'),
  ('cats-claw', 'cat''s claw'),
  ('cats-claw', 'cat''s claw (uncaria tomentosa) extract'),
  ('cats-claw', 'uncaria tomentosa'),
  ('ceramides', 'ceramides'),
  ('ceramides', 'ceratiq wheat (triticum vulgare) oil extract'),
  ('ceramides', 'wheat ceramides'),
  ('chaga', 'chaga'),
  ('chaga', 'chaga, fresh'),
  ('chaga', 'inonotus obliquus'),
  ('chamomile', 'chamomile'),
  ('chinese-skullcap', 'baicalin'),
  ('chinese-skullcap', 'chinese skullcap'),
  ('chinese-skullcap', 'chinese skullcap root concentrate'),
  ('chinese-skullcap', 'fresh skullcap'),
  ('chinese-skullcap', 'scutellaria baicalensis'),
  ('chloride', 'chloride'),
  ('choline', 'choline'),
  ('choline', 'choline bitartrate'),
  ('choline', 'phosphatidyl choline'),
  ('choline', 'phosphatidylcholine'),
  ('choline', 'phosphatidylcholine complex'),
  ('chondroitin', 'chondroitin'),
  ('chondroitin', 'chondroitin sulfate'),
  ('chromium', 'chromium'),
  ('chromium', 'chromium picolinate'),
  ('citicoline', 'cdp-choline'),
  ('citicoline', 'citicoline'),
  ('citicoline', 'cognizin'),
  ('collagen', 'bovine collagen peptides, hydrolyzed'),
  ('collagen', 'collagen peptides'),
  ('collagen', 'hydrolyzed bovine collagen peptides'),
  ('collagen', 'marine collagen peptides, hydrolyzed'),
  ('collagen', 'uc-ii standardized cartilage'),
  ('colostrum', 'colostrum'),
  ('colostrum', 'immunoglobulins'),
  ('copper', 'copper'),
  ('copper', 'copper bisglycinate'),
  ('copper', 'copper gluconate'),
  ('coq10', 'coenzyme q-10'),
  ('coq10', 'coenzyme q10'),
  ('coq10', 'coq10'),
  ('coq10', 'megasorb coenzyme q-10'),
  ('coq10', 'ubiquinol'),
  ('coq10', 'ubiquinone'),
  ('cordyceps', 'cordyceps'),
  ('cordyceps', 'cordyceps militaris'),
  ('cranberry', 'cranberry'),
  ('creatine', 'creatine'),
  ('creatine', 'creatine monohydrate'),
  ('curcumin', 'bcm-95 bio-curcumin turmeric 25:1 extract'),
  ('curcumin', 'curcuma longa extract'),
  ('curcumin', 'curcumin'),
  ('curcumin', 'curcumin c3 complex'),
  ('curcumin', 'curcumin phytosome complex'),
  ('curcumin', 'curcuminoids'),
  ('curcumin', 'meriva'),
  ('curcumin', 'turmeric'),
  ('d-ribose', 'bioenergy ribose'),
  ('d-ribose', 'cherrypure'),
  ('d-ribose', 'd-ribose'),
  ('d-ribose', 'ribose'),
  ('digestive-enzymes', 'amylase'),
  ('digestive-enzymes', 'beta-glucanase'),
  ('digestive-enzymes', 'bromelain'),
  ('digestive-enzymes', 'cellulase'),
  ('digestive-enzymes', 'diastase'),
  ('digestive-enzymes', 'excelery'),
  ('digestive-enzymes', 'glucoamylase'),
  ('digestive-enzymes', 'hemicellulase'),
  ('digestive-enzymes', 'lipase'),
  ('digestive-enzymes', 'papain'),
  ('digestive-enzymes', 'phytase'),
  ('digestive-enzymes', 'prohydrolase'),
  ('digestive-enzymes', 'protease'),
  ('echinacea', 'echinacea'),
  ('echinacea', 'echinacea angustifolia root extract'),
  ('echinacea', 'echinacea purpurea aerial parts extract'),
  ('echinacea', 'raw echinacea powder'),
  ('echinacea', 'standardized echinacea extract'),
  ('elderberry', 'elderberry'),
  ('elderberry', 'elderberry fruit extract'),
  ('elderberry', 'sambucus'),
  ('eleuthero', 'eleuthero'),
  ('eleuthero', 'siberian ginseng'),
  ('enokitake', 'enokitake'),
  ('evening-primrose', 'evening primrose oil'),
  ('evening-primrose', 'evening primrose seed oil'),
  ('fisetin', 'fisetin'),
  ('fo-ti', 'fo-ti'),
  ('fo-ti', 'he shou wu'),
  ('fo-ti', 'polygonum multiflorum'),
  ('folate', 'folate'),
  ('folate', 'folic acid'),
  ('folate', 'l-5-methyltetrahydrofolate'),
  ('folate', 'l-5-mthf'),
  ('folate', 'methylfolate'),
  ('folate', 'quatrefolic'),
  ('folate', 'vitamin b9'),
  ('gaba', 'gaba'),
  ('gaba', 'gamma-aminobutyric acid'),
  ('gaba', 'pharmagaba'),
  ('garlic', 'aged garlic extract'),
  ('garlic', 'allicin'),
  ('garlic', 'garlic'),
  ('ginkgo', 'ginkgo'),
  ('ginkgo', 'ginkgo biloba'),
  ('ginkgo', 'ginkgo extract'),
  ('gla', 'gamma linoleic acid'),
  ('gla', 'gamma-linolenic acid'),
  ('gla', 'gla'),
  ('glucosamine', 'glucosamine'),
  ('glucosamine', 'glucosamine sulfate'),
  ('glutamine', 'glutamine'),
  ('glutamine', 'l-glutamine'),
  ('glycine', 'glycine'),
  ('gotu-kola', 'centella asiatica'),
  ('gotu-kola', 'gotu kola'),
  ('grape-seed', 'grape'),
  ('grape-seed', 'grape seed extract'),
  ('grapefruit', 'grapefruit'),
  ('grapefruit', 'grapefruit seed extract'),
  ('green-tea', 'egcg'),
  ('green-tea', 'green tea (camellia sinensis) extract'),
  ('green-tea', 'green tea leaf extract'),
  ('green-tea', 'greenselect'),
  ('green-tea', 'matcha green tea, powder'),
  ('guava', 'guava'),
  ('hmb', 'hmb'),
  ('hmb', 'myhmb calcium beta-hydroxy-beta-methylbutyrate'),
  ('hops', 'hops'),
  ('huperzine-a', 'huperzine'),
  ('huperzine-a', 'huperzine a'),
  ('hyaluronic-acid', 'hyaluronic acid'),
  ('hyaluronic-acid', 'sodium hyaluronate'),
  ('inositol', 'inositol'),
  ('inositol', 'myo-inositol'),
  ('inulin', 'fos'),
  ('inulin', 'fructooligosaccharides'),
  ('inulin', 'galactomannans'),
  ('inulin', 'inulin'),
  ('inulin', 'nutraflora scfos'),
  ('inulin', 'sunfiber'),
  ('iodine', 'iodine'),
  ('iodine', 'potassium iodide'),
  ('iron', 'bioferrin'),
  ('iron', 'ferrochel'),
  ('iron', 'ferrous bisglycinate'),
  ('iron', 'ferrous sulfate'),
  ('iron', 'iron'),
  ('iron', 'iron bisglycinate'),
  ('kiwi', 'kiwi'),
  ('l-alanine', 'alanine'),
  ('l-alanine', 'l-alanine'),
  ('l-arginine', 'arginine'),
  ('l-arginine', 'l-arginine'),
  ('l-arginine', 'l-arginine hydrochloride'),
  ('l-citrulline', 'citrulline'),
  ('l-citrulline', 'l-citrulline'),
  ('l-citrulline', 'l-citrulline malate'),
  ('l-cysteine', 'cysteine'),
  ('l-cysteine', 'l-cysteine'),
  ('l-cysteine', 'n-acetyl-l-cysteine'),
  ('l-cysteine', 'n-acetylcysteine'),
  ('l-cysteine', 'nac'),
  ('l-histidine', 'histidine'),
  ('l-histidine', 'l-histidine'),
  ('l-isoleucine', 'isoleucine'),
  ('l-isoleucine', 'l-isoleucine'),
  ('l-leucine', 'l-leucine'),
  ('l-leucine', 'leucine'),
  ('l-lysine', 'l-lysine'),
  ('l-lysine', 'l-lysine hydrochloride monohydrate'),
  ('l-lysine', 'lysine'),
  ('l-methionine', 'l-methionine'),
  ('l-methionine', 'methionine'),
  ('l-phenylalanine', 'l-phenylalanine'),
  ('l-phenylalanine', 'phenylalanine'),
  ('l-proline', 'l-proline'),
  ('l-proline', 'proline'),
  ('l-serine', 'l-serine'),
  ('l-serine', 'serine'),
  ('l-theanine', 'l-theanine'),
  ('l-theanine', 'suntheanine'),
  ('l-theanine', 'theanine'),
  ('l-threonine', 'l-threonine'),
  ('l-threonine', 'threonine'),
  ('l-tryptophan', 'l-tryptophan'),
  ('l-tryptophan', 'tryptophan'),
  ('l-tryptophan', 'tryptopure l-tryptophan'),
  ('l-tyrosine', 'l-tyrosine'),
  ('l-tyrosine', 'tyrosine'),
  ('l-valine', 'l-valine'),
  ('l-valine', 'valine'),
  ('lactoferrin', 'lactoferrin'),
  ('lavender', 'lavender'),
  ('lavender', 'silexan'),
  ('lecithin', 'lecithin'),
  ('lecithin', 'soy lecithin'),
  ('licorice-dgl', 'deglycyrrhizinated licorice (dgl)'),
  ('licorice-dgl', 'dgl'),
  ('licorice-dgl', 'licorice'),
  ('linoleic-acid', 'linoleic acid'),
  ('lions-mane', 'fresh lion''s mane (hericium erinaceus) mycelium'),
  ('lions-mane', 'hericium erinaceus'),
  ('lions-mane', 'lion''s mane'),
  ('lions-mane', 'lion''s mane fruiting body extract, dried'),
  ('lions-mane', 'lion''s mane mycelium extract, fresh'),
  ('lithium', 'lithium'),
  ('lithium', 'lithium aspartate'),
  ('lutein', 'lutein'),
  ('lycopene', 'lycopene'),
  ('maca', 'lepidium meyenii'),
  ('maca', 'maca'),
  ('maca', 'maca tuber extract'),
  ('magnesium', 'ata mg'),
  ('magnesium', 'magnesium'),
  ('magnesium', 'magnesium acetyl taurate'),
  ('magnesium', 'magnesium bisglycinate'),
  ('magnesium', 'magnesium citrate'),
  ('magnesium', 'magnesium glycinate'),
  ('magnesium', 'magnesium l-threonate'),
  ('magnesium', 'magnesium malate'),
  ('magnesium', 'magnesium oxide'),
  ('magnesium', 'magtein'),
  ('maitake', 'dried maitake fungus extract'),
  ('maitake', 'grifola frondosa'),
  ('maitake', 'maitake'),
  ('manganese', 'manganese'),
  ('mango', 'mango'),
  ('marshmallow-root', 'marshmallow root'),
  ('marshmallow-root', 'marshmallow root extract'),
  ('mastic-gum', 'mastic gum'),
  ('mastic-gum', 'pistacia lentiscus'),
  ('mct', 'mct oil'),
  ('mct', 'medium chain triglycerides'),
  ('melatonin', 'melatonin'),
  ('mesima', 'mesima'),
  ('mesima', 'phellinus linteus'),
  ('milk-thistle', 'milk thistle'),
  ('milk-thistle', 'silybum marianum'),
  ('milk-thistle', 'silymarin'),
  ('molybdenum', 'molybdenum'),
  ('msm', 'methyl sulfonyl methane'),
  ('msm', 'methylsulfonylmethane'),
  ('msm', 'msm'),
  ('mucuna', 'mucuna pruriens'),
  ('mucuna', 'mucuna pruriens fruit extract'),
  ('mucuna', 'velvet bean'),
  ('mustard', 'mustard'),
  ('mustard', 'mustard, powder'),
  ('niacin', 'inositol hexanicotinate'),
  ('niacin', 'niacin'),
  ('niacin', 'niacin/niacinamide'),
  ('niacin', 'niacinamide'),
  ('niacin', 'nicotinamide'),
  ('niacin', 'nicotinic acid'),
  ('niacin', 'vitamin b3'),
  ('nmn', 'beta-nicotinamide mononucleotide'),
  ('nmn', 'nicotinamide mononucleotide'),
  ('nmn', 'nmn'),
  ('olive-leaf', 'benolea'),
  ('olive-leaf', 'oleuropein'),
  ('olive-leaf', 'olive leaf extract'),
  ('omega-3', 'algal oil'),
  ('omega-3', 'dha'),
  ('omega-3', 'docosahexaenoic acid'),
  ('omega-3', 'eicosapentaenoic acid'),
  ('omega-3', 'epa'),
  ('omega-3', 'fish oil concentrate'),
  ('omega-3', 'marine triglyceride concentrate'),
  ('omega-3', 'microalgae oil'),
  ('omega-3', 'omega-3'),
  ('omega-3', 'total omega-3'),
  ('omega-3', 'total omega-3 fatty acids'),
  ('oregano-oil', 'oregano essential oil'),
  ('oregano-oil', 'oregano oil'),
  ('oyster-mushroom', 'oyster mushroom'),
  ('panax-ginseng', 'ginseng'),
  ('panax-ginseng', 'panax ginseng'),
  ('panax-ginseng', 'panax ginseng extract powder'),
  ('pantothenic-acid', 'calcium pantothenate'),
  ('pantothenic-acid', 'dexpanthenol'),
  ('pantothenic-acid', 'pantethine'),
  ('pantothenic-acid', 'pantothenic acid'),
  ('pantothenic-acid', 'vitamin b5'),
  ('passion-flower', 'passiflora'),
  ('passion-flower', 'passion flower'),
  ('peak-atp', 'adenosine 5''-triphosphate disodium'),
  ('peak-atp', 'peak atp'),
  ('phellodendron', 'phellodendron'),
  ('phellodendron', 'phellodendron, powder'),
  ('phenylethylamine', 'pea'),
  ('phenylethylamine', 'phenylethylamine'),
  ('phenylethylamine', 'phenylethylamine hcl'),
  ('phosphatidylserine', 'phosphatidylserine'),
  ('phosphatidylserine', 'phosphatidylserine isolate'),
  ('phosphorus', 'phosphorus'),
  ('piperine', 'bioperine'),
  ('piperine', 'piperine'),
  ('potassium', 'potassium'),
  ('potassium', 'potassium citrate'),
  ('pqq', 'pqq'),
  ('pqq', 'pyrroloquinoline quinone'),
  ('pqq', 'pyrroloquinoline quinone disodium'),
  ('probiotic', 'bacillus subtilis'),
  ('probiotic', 'bifidobacterium'),
  ('probiotic', 'l. plantarum'),
  ('probiotic', 'l. rhamnosus'),
  ('probiotic', 'l. salivarius'),
  ('probiotic', 'lacticaseibacillus'),
  ('probiotic', 'lactiplantibacillus'),
  ('probiotic', 'lactobacillus'),
  ('probiotic', 'lactococcus'),
  ('probiotic', 'pediococcus'),
  ('probiotic', 'saccharomyces boulardii'),
  ('propolis', 'bee propolis, powder'),
  ('propolis', 'propolis'),
  ('prune', 'prune'),
  ('psyllium', 'psyllium'),
  ('psyllium', 'psyllium husk'),
  ('pterostilbene', 'pterostilbene'),
  ('quercetin', 'bio-quercetin phytosome'),
  ('quercetin', 'quercetin'),
  ('quercetin', 'quercetin dihydrate'),
  ('quercetin', 'quercetin phospholipid complex'),
  ('raspberry', 'raspberry'),
  ('raspberry', 'raspberry seed (rubus idaeus) concentrate'),
  ('reishi', 'ganoderma lucidum'),
  ('reishi', 'oregon ganoderma'),
  ('reishi', 'reishi'),
  ('reishi', 'reishi fruiting body extract, dried'),
  ('reishi', 'reishi mycelium extract, fresh'),
  ('resveratrol', 'resveratrol'),
  ('resveratrol', 'trans-resveratrol'),
  ('rhodiola', 'rhodiola'),
  ('rhodiola', 'rhodiola extract'),
  ('rhodiola', 'rhodiola rosea'),
  ('riboflavin', 'riboflavin'),
  ('riboflavin', 'riboflavin 5''-phosphate'),
  ('riboflavin', 'riboflavin 5-phosphate'),
  ('riboflavin', 'vitamin b2'),
  ('rice-extract', 'rice extract'),
  ('rosemary', 'rosemary'),
  ('rosemary', 'rosemary extract'),
  ('rosemary', 'rosemary leaf extract'),
  ('royal-sun-blazei', 'agaricus blazei'),
  ('royal-sun-blazei', 'royal sun blazei'),
  ('rutin', 'rutin'),
  ('saffron', 'crocus sativus'),
  ('saffron', 'saffron'),
  ('saffron', 'satiereal saffron extract'),
  ('saw-palmetto', 'saw palmetto'),
  ('saw-palmetto', 'saw palmetto berries extract'),
  ('saw-palmetto', 'saw palmetto fruit extract'),
  ('saw-palmetto', 'serenoa repens'),
  ('saw-palmetto', 'xerenoos'),
  ('selenium', 'l-selenomethionine'),
  ('selenium', 'selenium'),
  ('selenium', 'selenomethionine'),
  ('shiitake', 'dried shiitake (lentinula edodes) mycelium'),
  ('shiitake', 'lentinan'),
  ('shiitake', 'lentinula edodes'),
  ('shiitake', 'shiitake'),
  ('silica', 'raw vegetal silica powder'),
  ('silica', 'silica'),
  ('silica', 'silicon'),
  ('silica', 'vegetal silica'),
  ('silica', 'vegetal silica extract'),
  ('slippery-elm', 'slippery elm'),
  ('sodium', 'sodium'),
  ('spermidine', 'spermidine'),
  ('spinach', 'spinach'),
  ('spinach', 'spinach powder'),
  ('spirulina', 'spirulina'),
  ('split-gill-polypore', 'split gill polypore'),
  ('strawberry', 'strawberry'),
  ('strawberry', 'strawberry extract'),
  ('sulforaphane', 'glucoraphanin'),
  ('sulforaphane', 'organic sprouted broccoli'),
  ('sulforaphane', 'sulforaphane'),
  ('sulforaphane', 'sulforaphane glucosinate'),
  ('tart-cherry', 'montmorency'),
  ('tart-cherry', 'tart cherry'),
  ('taurine', 'l-taurine'),
  ('taurine', 'taurine'),
  ('theaflavins', 'theaflavins'),
  ('thiamine', 'benfopure benfotiamine'),
  ('thiamine', 'benfotiamine'),
  ('thiamine', 'thiamin'),
  ('thiamine', 'thiamine'),
  ('thiamine', 'thiamine hydrochloride'),
  ('thiamine', 'thiamine mononitrate'),
  ('thiamine', 'vitamin b1'),
  ('tribulus', 'tribulus'),
  ('tribulus', 'tribulus terrestris'),
  ('turkey-tail', 'coriolus versicolor'),
  ('turkey-tail', 'trametes versicolor'),
  ('turkey-tail', 'turkey tail'),
  ('turkey-tail', 'turkey tails'),
  ('uridine', 'uridine monophosphate'),
  ('uridine', 'uridine-5''-monophosphate disodium'),
  ('urolithin-a', 'urolithin a'),
  ('valerian', 'valerian'),
  ('vinpocetine', 'vinpocetine'),
  ('vitamin-a', 'alpha-carotene'),
  ('vitamin-a', 'beta-carotene'),
  ('vitamin-a', 'retinol'),
  ('vitamin-a', 'retinyl acetate'),
  ('vitamin-a', 'retinyl palmitate'),
  ('vitamin-a', 'vitamin a'),
  ('vitamin-b12', 'adenosylcobalamin'),
  ('vitamin-b12', 'cobalamin'),
  ('vitamin-b12', 'cyanocobalamin'),
  ('vitamin-b12', 'hydroxocobalamin'),
  ('vitamin-b12', 'methylcobalamin'),
  ('vitamin-b12', 'vitamin b12'),
  ('vitamin-b6', 'p-5-p'),
  ('vitamin-b6', 'pyridoxal 5''-phosphate'),
  ('vitamin-b6', 'pyridoxal 5-phosphate'),
  ('vitamin-b6', 'pyridoxine'),
  ('vitamin-b6', 'pyridoxine hydrochloride'),
  ('vitamin-b6', 'vitamin b6'),
  ('vitamin-c', 'acerola'),
  ('vitamin-c', 'ascorbic acid'),
  ('vitamin-c', 'ascorbyl palmitate'),
  ('vitamin-c', 'calcium ascorbate'),
  ('vitamin-c', 'sodium ascorbate'),
  ('vitamin-c', 'vitamin c'),
  ('vitamin-d', 'cholecalciferol'),
  ('vitamin-d', 'ergocalciferol'),
  ('vitamin-d', 'vitamin d'),
  ('vitamin-d', 'vitamin d2'),
  ('vitamin-d', 'vitamin d3'),
  ('vitamin-e', 'alpha-tocopherol'),
  ('vitamin-e', 'd-alpha tocopherol'),
  ('vitamin-e', 'delta tocopherol'),
  ('vitamin-e', 'dl-alpha tocopherol'),
  ('vitamin-e', 'gamma-tocopherol'),
  ('vitamin-e', 'tocopherol'),
  ('vitamin-e', 'tocotrienol'),
  ('vitamin-e', 'vitamin e'),
  ('vitamin-k', 'menaquinone'),
  ('vitamin-k', 'menaquinone-7'),
  ('vitamin-k', 'mk-7'),
  ('vitamin-k', 'phylloquinone'),
  ('vitamin-k', 'vitamin k'),
  ('vitamin-k', 'vitamin k1'),
  ('vitamin-k', 'vitamin k2'),
  ('whey-protein', 'whey isolate'),
  ('whey-protein', 'whey protein'),
  ('whey-protein', 'whey protein isolate'),
  ('yeast-mos', 'mos yeast fraction'),
  ('yeast-mos', 'saccharomyces cerevisiae extract'),
  ('yerba-mate', 'ilex paraguariensis'),
  ('yerba-mate', 'yerba mate'),
  ('zeaxanthin', 'zeaxanthin'),
  ('zeaxanthin', 'zeaxanthin isomers'),
  ('zinc', 'zinc'),
  ('zinc', 'zinc bisglycinate'),
  ('zinc', 'zinc citrate'),
  ('zinc', 'zinc gluconate'),
  ('zinc', 'zinc oxide'),
  ('zinc', 'zinc picolinate')
on conflict (synonym) do update set ingredient_key = excluded.ingredient_key;

-- ── constraint repair ───────────────────────────────────────────────────────
-- 0028 shipped with `unique (glossary_id, raw_name)` and was applied before that
-- was found to be wrong: four products legitimately repeat a raw_name at
-- different amounts (Thorne Basic B Complex lists Niacin twice, as the total and
-- as the free-acid portion; Cognitex Elite lists six blueberry extracts).
-- ON CONFLICT DO UPDATE cannot touch the same row twice, so the key moves to
-- position, which is unique per product across all 652 rows.
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.glossary_ingredient'::regclass
     and contype = 'u'
     and pg_get_constraintdef(oid) like '%raw_name%';
  if c is not null then
    execute format('alter table public.glossary_ingredient drop constraint %I', c);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.glossary_ingredient'::regclass
       and conname = 'glossary_ingredient_glossary_id_position_key'
  ) then
    alter table public.glossary_ingredient
      add constraint glossary_ingredient_glossary_id_position_key
      unique (glossary_id, position);
  end if;
end $$;

insert into public.glossary_ingredient
  (glossary_id, ingredient_key, raw_name, amount, unit, is_primary, position)
select g.id, v.ingredient_key, v.raw_name, v.amount, v.unit, v.is_primary, v.position
from (values
  ('advanced-nutrition-by-zahler-methylfolate', 'folate', 'Folate', 1000, 'mcg DFE', true, 0),
  ('allergy-research-group-lactobacillus', 'probiotic', 'L. plantarum (ATCC SD5209)', 0, 'NP', true, 0),
  ('allergy-research-group-lactobacillus', 'probiotic', 'L. salivarius (ATCC SD5208)', 0, 'NP', true, 1),
  ('allergy-research-group-lactobacillus', 'probiotic', 'L. rhamnosus (ATCC SD5217)', 0, 'NP', true, 2),
  ('allergy-research-group-liquid-molybdenum', 'molybdenum', 'Molybdenum', 75, 'mcg', true, 0),
  ('aor-advanced-orthomolecular-research-advanced-active-green-tea', 'green-tea', 'Green Tea (Camellia sinensis) extract', 700, 'mg', true, 0),
  ('aor-advanced-orthomolecular-research-advanced-active-green-tea', null, 'Total Catechins', 455, 'mg', false, 1),
  ('aor-advanced-orthomolecular-research-advanced-active-green-tea', 'caffeine', 'Caffeine', 7, 'mg', false, 2),
  ('aor-advanced-orthomolecular-research-citicoline', 'choline', 'Choline', 120, 'mg', true, 0),
  ('aor-advanced-orthomolecular-research-citicoline', 'saw-palmetto', 'Xerenoos', 500, 'mg', true, 1),
  ('aor-advanced-orthomolecular-research-citicoline', 'choline', 'Choline Bitartrate', 70, 'mg', true, 2),
  ('aor-advanced-orthomolecular-research-premium-zinc-copper-balance', 'zinc', 'Zinc', 15, 'mg', true, 0),
  ('aor-advanced-orthomolecular-research-premium-zinc-copper-balance', 'copper', 'Copper', 2, 'mg', true, 1),
  ('biochem-100-whey-isolate-protein-chocolate-peppermint', 'calcium', 'Calcium', 80, 'mg', false, 6),
  ('biochem-100-whey-isolate-protein-chocolate-peppermint', 'iron', 'Iron', 1, 'mg', false, 7),
  ('biochem-100-whey-isolate-protein-chocolate-peppermint', 'phosphorus', 'Phosphorus', 60, 'mg', false, 8),
  ('biochem-100-whey-isolate-protein-chocolate-peppermint', 'magnesium', 'Magnesium', 22, 'mg', false, 9),
  ('biochem-100-whey-isolate-protein-chocolate-peppermint', 'sodium', 'Sodium', 65, 'mg', false, 10),
  ('biochem-100-whey-isolate-protein-chocolate-peppermint', 'potassium', 'Potassium', 190, 'mg', false, 11),
  ('bluebonnet-niacin-100-mg', 'niacin', 'Vitamin B3', 100, 'mg', true, 0),
  ('bulksupplements-alpha-lipoic-acid', 'alpha-lipoic-acid', 'Alpha-Lipoic Acid', 600, 'mg', true, 0),
  ('bulksupplements-amla-extract', 'amla', 'Amla Fruit Extract', 1000, 'mg', true, 0),
  ('bulksupplements-astragalus-extract', 'astragalus', 'Astragalus Root Extract', 1300, 'mg', true, 0),
  ('bulksupplements-bee-propolis-powder', 'propolis', 'Bee Propolis, Powder', 1200, 'mg', true, 0),
  ('bulksupplements-l-leucine', 'l-leucine', 'L-Leucine', 2500, 'mg', true, 0),
  ('bulksupplements-msm-methylsulfonylmethane-1500-mg', 'msm', 'Methylsulfonylmethane', 1500, 'mg', true, 0),
  ('bulksupplements-mucuna-pruriens-extract', 'mucuna', 'Mucuna pruriens Fruit Extract', 500, 'mg', true, 0),
  ('bulksupplements-olive-leaf-extract', 'olive-leaf', 'Olive Leaf Extract', 750, 'mg', true, 0),
  ('bulksupplements-pantothenic-acid-vitamin-b5-powder-500-mg', 'pantothenic-acid', 'Pantothenic Acid', 460, 'mg', true, 0),
  ('bulksupplements-phenylethylamine-hcl-pea', 'phenylethylamine', 'Phenylethylamine HCl', 150, 'mg', true, 0),
  ('bulksupplements-rice-protein', 'sodium', 'Sodium', 57, 'mg', false, 5),
  ('bulksupplements-rice-protein', 'vitamin-d', 'Vitamin D', 0, 'mcg', false, 11),
  ('bulksupplements-rice-protein', 'iron', 'Iron', 1, 'mg', false, 12),
  ('bulksupplements-rice-protein', 'calcium', 'Calcium', 2, 'mg', false, 13),
  ('bulksupplements-rice-protein', 'potassium', 'Potassium', 2, 'mg', false, 14),
  ('bulksupplements-saw-palmetto-extract-320-mg', 'saw-palmetto', 'Saw Palmetto', 320, 'mg', true, 0),
  ('bulksupplements-taurine', 'taurine', 'Taurine', 500, 'mg', true, 0),
  ('bulksupplements-vitamin-b1-thiamine-mononitrate', 'thiamine', 'Thiamine', 92, 'mg', true, 0),
  ('bulksupplements-vitamin-b12-1-methylcobalamin', 'vitamin-b12', 'Vitamin B12', 200, 'mcg', true, 0),
  ('carlson-glucosamine-sulfate', 'glucosamine', 'Glucosamine Sulfate', 700, 'mg', true, 0),
  ('codeage-berberine-phytosome', 'berberine', 'Berberine Phytosome BerbActive Blend', 750, 'mg', true, 0),
  ('codeage-berberine-phytosome', 'berberine', 'Berberine', 500, 'mg', false, 1),
  ('codeage-berberine-phytosome', null, 'Phospholipid Complex', 150, 'mg', false, 2),
  ('codeage-berberine-phytosome', 'alpha-lipoic-acid', 'Alpha-Lipoic Acid', 100, 'mg', false, 3),
  ('codeage-liposomal-urolithin-a', 'urolithin-a', 'Urolithin A', 500, 'mg', true, 0),
  ('codeage-liposomal-urolithin-a', 'resveratrol', 'Trans-Resveratrol', 150, 'mg', true, 1),
  ('codeage-liposomal-urolithin-a', 'betaine', 'Betaine Anhydrous', 102.5, 'mg', true, 2),
  ('codeage-liposomal-urolithin-a', 'coq10', 'Coenzyme Q-10', 60, 'mg', false, 3),
  ('deva-vegan-omega-3-dha-epa', 'omega-3', 'Microalgae Oil', 400, 'mg', true, 3),
  ('deva-vegan-omega-3-dha-epa', 'omega-3', 'Total Omega-3', 200, 'mg', false, 4),
  ('doctors-best-astaxanthin', 'astaxanthin', 'Astaxanthin', 6, 'mg', true, 0),
  ('doctors-best-bacopa-320-mg-with-synapsa', 'bacopa', 'Synapsa', 320, 'mg', true, 0),
  ('doctors-best-barley-beta-glucan', 'beta-glucan', 'Barley Beta-Glucan', 250, 'mg', true, 0),
  ('doctors-best-extra-strength-ginkgo-120-mg', 'ginkgo', 'Ginkgo extract', 120, 'mg', true, 0),
  ('doctors-best-fisetin-with-novusetin', 'fisetin', 'Fisetin', 100, 'mg', true, 0),
  ('doctors-best-fully-active-b-complex', 'vitamin-c', 'Vitamin C', 40, 'mg', true, 0),
  ('doctors-best-fully-active-b-complex', 'thiamine', 'Thiamine', 60, 'mg', true, 1),
  ('doctors-best-fully-active-b-complex', 'riboflavin', 'Riboflavin', 75, 'mg', true, 2),
  ('doctors-best-fully-active-b-complex', 'niacin', 'Niacin', 50, 'mg', false, 3),
  ('doctors-best-fully-active-b-complex', 'vitamin-b6', 'Vitamin B6', 50, 'mg', false, 4),
  ('doctors-best-fully-active-b-complex', 'folate', 'Folate', 400, 'mcg DFE', false, 5),
  ('doctors-best-fully-active-b-complex', 'vitamin-b12', 'Vitamin B12', 1000, 'mcg', false, 6),
  ('doctors-best-fully-active-b-complex', 'biotin', 'Biotin', 600, 'mcg', false, 7),
  ('doctors-best-fully-active-b-complex', 'pantothenic-acid', 'Pantothenic Acid', 100, 'mg', false, 8),
  ('doctors-best-fully-active-b12-1500-mcg', 'vitamin-b12', 'Vitamin B12', 1500, 'mcg', true, 0),
  ('doctors-best-high-absorption-coq10-100-mg', 'coq10', 'Coenzyme Q-10', 100, 'mg', true, 0),
  ('doctors-best-high-absorption-coq10-100-mg', 'piperine', 'Bioperine', 5, 'mg', true, 1),
  ('doctors-best-l-citrulline-powder', 'l-citrulline', 'L-Citrulline', 3, 'Gram(s)', true, 0),
  ('doctors-best-l-tryptophan-500-mg', 'l-tryptophan', 'L-Tryptophan', 500, 'mg', true, 0),
  ('doctors-best-l-tyrosine-500-mg', 'l-tyrosine', 'Tyrosine', 500, 'mg', true, 0),
  ('doctors-best-lithium-aspartate', 'lithium', 'Lithium', 5, 'mg', true, 0),
  ('doctors-best-lithium-aspartate', 'lithium', 'from 125 mg of lithium aspartate', 125, 'mg', false, 1),
  ('doctors-best-nmn-12000-400-mg', 'nmn', 'Beta-Nicotinamide Mononucleotide', 400, 'mg', true, 0),
  ('doctors-best-phosphatidyl-serine-with-serinaid-100-mg', 'phosphatidylserine', 'Phosphatidylserine', 100, 'mg', true, 0),
  ('doctors-best-pure-l-arginine-powder', 'l-arginine', 'L-Arginine Hydrochloride', 6, 'Gram(s)', true, 0),
  ('doctors-best-stabilized-r-lipoic-acid-100-mg', 'biotin', 'D-Biotin', 150, 'mcg', true, 0),
  ('doctors-best-stabilized-r-lipoic-acid-100-mg', 'alpha-lipoic-acid', 'R-Lipoic Acid', 100, 'mg', true, 1),
  ('doctors-best-vegan-omega-3-2000-mg', null, 'Elantria', 2000, 'mg', true, 2),
  ('doctors-best-vegan-omega-3-2000-mg', 'omega-3', 'Total Omega-3 Fatty Acids', 1300, 'mg', false, 3),
  ('douglas-laboratories-vitamin-k2-menaquinone-7', 'vitamin-k', 'Vitamin K2', 90, 'mcg', true, 0),
  ('energyfirst-chromium-picolinate', 'chromium', 'Chromium', 200, 'mcg', true, 0),
  ('finest-nutrition-biotin-5-000-mcg', 'biotin', 'Biotin', 5000, 'mcg', true, 0),
  ('finest-nutrition-biotin-5-000-mcg', 'calcium', 'Calcium', 222, 'mg', true, 1),
  ('gematria-vitamin-c-complex', 'vitamin-c', 'Vitamin C', 1.3, 'Gram(s)', true, 0),
  ('gematria-vitamin-c-complex', null, 'Proprietary Flavonoid Blend', 1.1, 'Gram(s)', true, 1),
  ('gematria-vitamin-c-complex', 'quercetin', 'Quercetin', 0, 'NP', false, 2),
  ('gematria-vitamin-c-complex', 'rutin', 'Rutin', 0, 'NP', false, 3),
  ('gematria-vitamin-c-complex', 'grapefruit', 'Grapefruit seed extract', 0, 'NP', false, 4),
  ('gematria-vitamin-c-complex', 'kiwi', 'Kiwi', 0, 'NP', false, 5),
  ('gematria-vitamin-c-complex', 'guava', 'Guava', 0, 'NP', false, 6),
  ('gematria-vitamin-c-complex', 'mango', 'Mango', 0, 'NP', false, 7),
  ('gematria-vitamin-c-complex', 'grapefruit', 'Grapefruit', 0, 'NP', false, 8),
  ('gnc-beyond-raw-chemistry-labs-betaine-anhydrous-2-5-grams', 'betaine', 'Betaine', 2.5, 'Gram(s)', true, 0),
  ('gnc-beyond-raw-digestive-enzymes', null, 'N.Zimes Proprietary Blend', 145.25, 'mg', true, 0),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Amylase', 0, 'NP', false, 1),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Protease 4.5', 0, 'NP', false, 2),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Lipase', 0, 'NP', false, 3),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Glucoamylase', 0, 'NP', false, 4),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Protease 3', 0, 'NP', false, 5),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Bromelain', 0, 'NP', false, 6),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Protease 6', 0, 'NP', false, 7),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Papain', 0, 'NP', false, 8),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Cellulase', 0, 'NP', false, 9),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Diastase', 0, 'NP', false, 10),
  ('gnc-beyond-raw-digestive-enzymes', null, 'CereCalase Proprietary Blend', 5, 'mg', false, 11),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Hemicellulase', 0, 'NP', false, 12),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Beta-Glucanase', 0, 'NP', false, 13),
  ('gnc-beyond-raw-digestive-enzymes', 'digestive-enzymes', 'Phytase', 0, 'NP', false, 14),
  ('havasu-nutrition-ginkgo-biloba-phosphatidylserine', 'ginkgo', 'Ginkgo biloba', 120, 'mg', true, 0),
  ('havasu-nutrition-ginkgo-biloba-phosphatidylserine', 'phosphatidylserine', 'Phosphatidylserine', 100, 'mg', true, 1),
  ('health-thru-nutrition-naturally-lutein-with-zeaxanthin-20-mg', 'lutein', 'Lutein', 20, 'mg', true, 0),
  ('health-thru-nutrition-naturally-lutein-with-zeaxanthin-20-mg', 'zeaxanthin', 'Zeaxanthin Isomers', 4000, 'mcg', true, 1),
  ('healths-harmony-california-spirulina', 'spirulina', 'Spirulina', 500, 'mg', true, 0),
  ('herbadiet-panax-ginseng-extract', 'panax-ginseng', 'Panax ginseng extract powder', 300, 'mg', true, 0),
  ('herbadiet-trans-resveratrol', 'resveratrol', 'Trans-Resveratrol', 50, 'mg', true, 0),
  ('herbadiet-trans-resveratrol', 'acai', 'Acai berry extract', 50, 'mg', true, 1),
  ('herbadiet-trans-resveratrol', 'grape-seed', 'Grape seed extract', 125, 'mg', true, 2),
  ('herbadiet-trans-resveratrol', 'green-tea', 'Green Tea leaf extract', 100, 'mg', false, 3),
  ('herbadiet-trans-resveratrol', 'quercetin', 'Quercetin Dihydrate', 25, 'mg', false, 4),
  ('hi-tech-pharmaceuticals-potassium-iodide-130-mg', 'potassium', 'Potassium', 130, 'mg', true, 0),
  ('hi-tech-pharmaceuticals-potassium-iodide-130-mg', 'iodine', 'Iodine', 225, 'mcg', true, 1),
  ('host-defense-brain-energy', 'lions-mane', 'Lion''s Mane', 1.5, 'Gram(s)', true, 2),
  ('host-defense-brain-energy', 'yerba-mate', 'Yerba Mate', 750, 'mg', false, 3),
  ('host-defense-brain-energy', 'eleuthero', 'Eleuthero', 750, 'mg', false, 4),
  ('host-defense-chaga-extract', 'chaga', 'Chaga, Fresh', 1, 'mL', true, 0),
  ('host-defense-cordyceps', 'cordyceps', 'Cordyceps', 1, 'Gram(s)', true, 2),
  ('host-defense-lions-mane', 'lions-mane', 'Lion''s Mane', 1, 'Gram(s)', true, 0),
  ('host-defense-lions-mane', null, 'Polysaccharides', 550, 'mg', false, 1),
  ('host-defense-lions-mane-extract', null, 'Proprietary Blend', 1, 'mL', true, 0),
  ('host-defense-lions-mane-extract', 'lions-mane', 'Lion''s Mane Mycelium Extract, Fresh', 0, 'NP', false, 1),
  ('host-defense-lions-mane-extract', 'lions-mane', 'Lion''s Mane Fruiting Body Extract, Dried', 0, 'NP', false, 2),
  ('host-defense-maitake-extract', null, 'Proprietary Blend', 1, 'mL', true, 0),
  ('host-defense-maitake-extract', 'maitake', 'fresh Maitake (Grifola frondosa) mycelium extract', 0, 'NP', false, 1),
  ('host-defense-maitake-extract', 'maitake', 'dried Maitake fungus extract', 0, 'NP', false, 2),
  ('host-defense-mycommunity', 'chaga', 'Chaga', 148, 'mg', true, 2),
  ('host-defense-mycommunity', 'maitake', 'Maitake', 142, 'mg', false, 3),
  ('host-defense-mycommunity', 'reishi', 'Reishi', 110, 'mg', false, 4),
  ('host-defense-mycommunity', 'cordyceps', 'Cordyceps', 100, 'mg', false, 5),
  ('host-defense-mycommunity', 'royal-sun-blazei', 'Royal Sun Blazei', 80, 'mg', false, 6),
  ('host-defense-mycommunity', 'enokitake', 'Enokitake', 80, 'mg', false, 7),
  ('host-defense-mycommunity', 'mesima', 'Mesima', 76, 'mg', false, 8),
  ('host-defense-mycommunity', 'lions-mane', 'Lion''s Mane', 64, 'mg', false, 9),
  ('host-defense-mycommunity', 'turkey-tail', 'Turkey Tails', 48, 'mg', false, 10),
  ('host-defense-mycommunity', 'oyster-mushroom', 'Oyster Mushroom', 48, 'mg', false, 11),
  ('host-defense-mycommunity', 'artists-conk', 'Artist''s Conk', 30, 'mg', false, 12),
  ('host-defense-mycommunity', 'reishi', 'Oregon Ganoderma', 30, 'mg', false, 13),
  ('host-defense-mycommunity', 'agarikon', 'Agarikon', 30, 'mg', false, 14),
  ('host-defense-mycommunity', 'amadou', 'Amadou', 20, 'mg', false, 15),
  ('host-defense-mycommunity', 'shiitake', 'Shiitake', 20, 'mg', false, 16),
  ('host-defense-mycommunity', 'birch-polypore', 'Birch Polypore', 12, 'mg', false, 17),
  ('host-defense-mycommunity', 'split-gill-polypore', 'Split Gill Polypore', 12, 'mg', false, 18),
  ('host-defense-reishi-extract', null, 'Proprietary Extract Blend', 1, 'mL', true, 0),
  ('host-defense-reishi-extract', 'reishi', 'Reishi Mycelium Extract, Fresh', 0, 'NP', false, 1),
  ('host-defense-reishi-extract', 'reishi', 'Reishi Fruiting Body Extract, Dried', 0, 'NP', false, 2),
  ('host-defense-shiitake-extract', null, 'Proprietary Blend', 1, 'mL', true, 0),
  ('host-defense-shiitake-extract', 'shiitake', 'fresh Shiitake (Lentinula edodes) mycelium extract', 0, 'NP', false, 1),
  ('host-defense-shiitake-extract', 'shiitake', 'dried Shiitake (Lentinula edodes) fruitbody extract', 0, 'NP', false, 2),
  ('host-defense-sleep', 'vitamin-b6', 'Vitamin B6', 1, 'mg', true, 1),
  ('host-defense-sleep', 'magnesium', 'Magnesium', 20, 'mg', true, 2),
  ('host-defense-sleep', 'passion-flower', 'Passion Flower', 200, 'mg', false, 3),
  ('host-defense-sleep', 'lions-mane', 'Lion''s Mane', 200, 'mg', false, 4),
  ('host-defense-sleep', 'reishi', 'Reishi', 200, 'mg', false, 5),
  ('host-defense-sleep', 'gaba', 'Gamma-Aminobutyric Acid', 130, 'mg', false, 6),
  ('host-defense-sleep', 'l-theanine', 'L-Theanine', 50, 'mg', false, 7),
  ('host-defense-stamets-7-extracts', null, 'Proprietary Blend', 1, 'mL', true, 0),
  ('host-defense-stamets-7-extracts', 'royal-sun-blazei', 'fresh Royal Sun Blazei (Agaricus brasiliensis f. blazei) mycelium extract', 0, 'NP', false, 1),
  ('host-defense-stamets-7-extracts', 'cordyceps', 'fresh Cordyceps (Cordyceps militaris) mycelium extract', 0, 'NP', false, 2),
  ('host-defense-stamets-7-extracts', 'reishi', 'fresh Reishi (Ganoderma lucidum s.l.) mycelium extract', 0, 'NP', false, 3),
  ('host-defense-stamets-7-extracts', 'reishi', 'dried Reishi (Ganoderma lucidum s.l.) fruit body extract', 0, 'NP', false, 4),
  ('host-defense-stamets-7-extracts', 'maitake', 'fresh Maitake (Grifola frondosa) mycelium extract', 0, 'NP', false, 5),
  ('host-defense-stamets-7-extracts', 'lions-mane', 'fresh Lion''s Mane (Hericium erinaceus) mycelium extract', 0, 'NP', false, 6),
  ('host-defense-stamets-7-extracts', 'chaga', 'fresh Chaga (Inonotus obliquus) mycelium extract', 0, 'NP', false, 7),
  ('host-defense-stamets-7-extracts', 'mesima', 'fresh Mesima (Phellinus linteus) mycelium extract', 0, 'NP', false, 8),
  ('host-defense-turkey-tail', 'turkey-tail', 'Turkey Tails', 1, 'Gram(s)', true, 0),
  ('host-defense-turkey-tail', null, 'Polysaccharides', 550, 'mg', false, 1),
  ('jarrow-formulas-5-htp-100-mg', '5-htp', '5-HTP', 100, 'mg', true, 0),
  ('jarrow-formulas-alpha-gpc-300-mg', 'alpha-gpc', 'Alpha-Glycerylphosphorylcholine', 300, 'mg', true, 0),
  ('jarrow-formulas-beta-glucan-250-mg', 'yeast-mos', 'Saccharomyces cerevisiae Extract', 250, 'mg', true, 0),
  ('jarrow-formulas-beta-glucan-250-mg', 'beta-glucan', 'Beta-1,3-1,6-Glucan', 188, 'mg', false, 1),
  ('jarrow-formulas-borage-seed-oil-1200-mg', 'borage', 'Borage Seed Oil', 1200, 'mg', true, 2),
  ('jarrow-formulas-borage-seed-oil-1200-mg', 'gla', 'Gamma-Linolenic Acid', 240, 'mg', false, 3),
  ('jarrow-formulas-carotenall', 'vitamin-a', 'Vitamin A', 600, 'mcg RAE', true, 0),
  ('jarrow-formulas-carotenall', 'lutein', 'Lutein', 10, 'mg', true, 1),
  ('jarrow-formulas-carotenall', 'zeaxanthin', 'Zeaxanthin', 2, 'mg', true, 2),
  ('jarrow-formulas-carotenall', 'lycopene', 'Lycopene', 10, 'mg', false, 3),
  ('jarrow-formulas-carotenall', 'astaxanthin', 'Astaxanthin', 500, 'mcg', false, 4),
  ('jarrow-formulas-carotenall', 'vitamin-a', 'Alpha-Carotene', 500, 'mcg', false, 5),
  ('jarrow-formulas-carotenall', 'vitamin-e', 'Gamma-Tocopherol', 10, 'mg', false, 6),
  ('jarrow-formulas-citicoline-cdp-choline-250-mg', 'citicoline', 'Citicoline', 250, 'mg', true, 0),
  ('jarrow-formulas-colostrum-prime-life-400-mg', 'colostrum', 'Colostrum', 400, 'mg', true, 0),
  ('jarrow-formulas-colostrum-prime-life-400-mg', 'colostrum', 'Immunoglobulins', 120, 'mg', false, 1),
  ('jarrow-formulas-evening-primrose-1300-mg', 'evening-primrose', 'Evening Primrose Oil', 1300, 'mg', true, 2),
  ('jarrow-formulas-evening-primrose-1300-mg', 'gla', 'Gamma-Linolenic Acid', 130, 'mg', false, 3),
  ('jarrow-formulas-hyaluronic-acid-120-mg', 'sodium', 'Sodium', 8, 'mg', true, 0),
  ('jarrow-formulas-hyaluronic-acid-120-mg', 'hyaluronic-acid', 'Hyaluronic Acid', 120, 'mg', true, 1),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', null, 'Proprietary Probiotic Blend', 413, 'mg', true, 0),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'probiotic', 'Lacticaseibacillus rhamnosus R0011', 0, 'NP', false, 1),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'probiotic', 'Lactobacillus helveticus R0052', 0, 'NP', false, 2),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'probiotic', 'Pediococcus acidilactici R1001', 0, 'NP', false, 3),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'probiotic', 'Lacticaseibacillus casei R0215', 0, 'NP', false, 4),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'probiotic', 'Bifidobacterium longum BB536', 0, 'NP', false, 5),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'probiotic', 'Lactiplantibacillus plantarum R1012', 0, 'NP', false, 6),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'probiotic', 'Bifidobacterium breve R0070', 0, 'NP', false, 7),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 'probiotic', 'Lactococcus lactis lactis R1058', 0, 'NP', false, 8),
  ('jarrow-formulas-l-carnitine-500-mg', 'carnitine', 'L-Carnitine', 500, 'mg', true, 0),
  ('jarrow-formulas-lactoferrin-250-mg', 'lactoferrin', 'Lactoferrin', 250, 'mg', true, 0),
  ('jarrow-formulas-mastic-gum-1000-mg', 'mastic-gum', 'Mastic Gum', 1000, 'mg', true, 0),
  ('jarrow-formulas-opcs-95-100-mg', 'grape-seed', 'Grape seed extract', 100, 'mg', true, 0),
  ('jarrow-formulas-pqq-20-mg', 'pqq', 'Pyrroloquinoline Quinone Disodium Salt', 20, 'mg', true, 0),
  ('jarrow-formulas-prebiotic-inulin-fos', 'inulin', 'Inulin', 3, 'Gram(s)', true, 3),
  ('jarrow-formulas-ps100-100-mg', 'phosphatidylserine', 'Phosphatidylserine', 100, 'mg', true, 0),
  ('jarrow-formulas-qh-absorb-200-mg', 'coq10', 'Ubiquinol', 200, 'mg', true, 0),
  ('jarrow-formulas-saccharomyces-boulardii-mos', 'probiotic', 'Saccharomyces boulardii', 250, 'mg', true, 0),
  ('jarrow-formulas-saccharomyces-boulardii-mos', 'yeast-mos', 'MOS Yeast Fraction', 200, 'mg', true, 1),
  ('jarrow-formulas-theanine-200-mg', 'l-theanine', 'L-Theanine', 200, 'mg', true, 0),
  ('klean-athlete-klean-b-complex', 'thiamine', 'Thiamine', 25, 'mg', true, 0),
  ('klean-athlete-klean-b-complex', 'riboflavin', 'Riboflavin', 15, 'mg', true, 1),
  ('klean-athlete-klean-b-complex', 'niacin', 'Niacin', 50, 'mg', true, 2),
  ('klean-athlete-klean-b-complex', 'vitamin-b6', 'Vitamin B6', 50, 'mg', false, 3),
  ('klean-athlete-klean-b-complex', 'folate', 'Folate', 1333, 'mcg DFE', false, 4),
  ('klean-athlete-klean-b-complex', 'folate', 'L-5-MTHF', 800, 'mcg', false, 5),
  ('klean-athlete-klean-b-complex', 'vitamin-b12', 'Vitamin B12', 800, 'mcg', false, 6),
  ('klean-athlete-klean-b-complex', 'biotin', 'Biotin', 400, 'mcg', false, 7),
  ('klean-athlete-klean-b-complex', 'pantothenic-acid', 'Pantothenic Acid', 100, 'mg', false, 8),
  ('klean-athlete-klean-b-complex', 'choline', 'Choline', 40, 'mg', false, 9),
  ('klean-athlete-klean-b-complex', 'inositol', 'Inositol', 25, 'mg', false, 10),
  ('klean-athlete-klean-b-complex', 'thiamine', 'BenfoPure Benfotiamine', 3, 'mg', false, 11),
  ('klean-athlete-klean-bcaa-peak-atp', 'l-leucine', 'L-Leucine', 2, 'Gram(s)', false, 3),
  ('klean-athlete-klean-bcaa-peak-atp', 'l-isoleucine', 'L-Isoleucine', 1, 'Gram(s)', false, 4),
  ('klean-athlete-klean-bcaa-peak-atp', 'l-valine', 'L-Valine', 1, 'Gram(s)', false, 5),
  ('klean-athlete-klean-bcaa-peak-atp', 'peak-atp', 'Peak ATP', 400, 'mg', true, 6),
  ('klean-athlete-klean-casein-vanilla-custard', 'calcium', 'Calcium', 530, 'mg', false, 5),
  ('klean-athlete-klean-casein-vanilla-custard', 'sodium', 'Sodium', 110, 'mg', false, 6),
  ('klean-athlete-klean-creatine', 'creatine', 'Creatine Monohydrate', 5, 'Gram(s)', true, 0),
  ('klean-athlete-klean-electrolytes', 'vitamin-b6', 'Vitamin B6', 7, 'mg', true, 0),
  ('klean-athlete-klean-electrolytes', 'calcium', 'Calcium', 25, 'mg', true, 1),
  ('klean-athlete-klean-electrolytes', 'magnesium', 'Magnesium', 25, 'mg', true, 2),
  ('klean-athlete-klean-electrolytes', 'sodium', 'Sodium', 40, 'mg', false, 3),
  ('klean-athlete-klean-electrolytes', 'potassium', 'Potassium', 25, 'mg', false, 4),
  ('klean-athlete-klean-electrolytes', 'chloride', 'Chloride', 60, 'mg', false, 5),
  ('klean-athlete-klean-endurance', 'd-ribose', 'D-Ribose', 1.67, 'Gram(s)', false, 4),
  ('klean-athlete-klean-essential-aminos-hmb', 'vitamin-d', 'Vitamin D3', 12.5, 'mcg', true, 2),
  ('klean-athlete-klean-essential-aminos-hmb', 'calcium', 'Calcium', 210, 'mg', false, 3),
  ('klean-athlete-klean-essential-aminos-hmb', null, 'Amino9 Amino Blend', 3.35, 'Gram(s)', false, 4),
  ('klean-athlete-klean-essential-aminos-hmb', 'l-leucine', 'L-Leucine', 1271, 'mg', false, 5),
  ('klean-athlete-klean-essential-aminos-hmb', 'l-lysine', 'L-Lysine', 487, 'mg', false, 6),
  ('klean-athlete-klean-essential-aminos-hmb', 'l-threonine', 'L-Threonine', 342, 'mg', false, 7),
  ('klean-athlete-klean-essential-aminos-hmb', 'l-isoleucine', 'L-Isoleucine', 280, 'mg', false, 8),
  ('klean-athlete-klean-essential-aminos-hmb', 'l-valine', 'L-Valine', 264, 'mg', false, 9),
  ('klean-athlete-klean-essential-aminos-hmb', 'l-phenylalanine', 'L-Phenylalanine', 181, 'mg', false, 10),
  ('klean-athlete-klean-essential-aminos-hmb', 'l-methionine', 'L-Methionine', 129, 'mg', false, 11),
  ('klean-athlete-klean-essential-aminos-hmb', 'l-histidine', 'L-Histidine', 109, 'mg', false, 12),
  ('klean-athlete-klean-essential-aminos-hmb', 'l-tryptophan', 'L-Tryptophan', 18, 'mg', false, 13),
  ('klean-athlete-klean-essential-aminos-hmb', 'glutamine', 'L-Glutamine', 2, 'Gram(s)', false, 14),
  ('klean-athlete-klean-essential-aminos-hmb', 'hmb', 'MyHMB Calcium Beta-Hydroxy-Beta-Methylbutyrate-Monohydrate', 1.5, 'Gram(s)', false, 15),
  ('klean-athlete-klean-focus', 'biotin', 'Biotin', 300, 'mcg', true, 0),
  ('klean-athlete-klean-focus', 'carnitine', 'Acetyl-L-Carnitine HCl', 1000, 'mg', true, 1),
  ('klean-athlete-klean-focus', 'alpha-lipoic-acid', 'Alpha Lipoic Acid', 400, 'mg', true, 2),
  ('klean-athlete-klean-focus', 'alpha-gpc', 'Alpha-GPC', 100, 'mg', false, 3),
  ('klean-athlete-klean-focus', null, 'VitaBerry Fruit Blend', 100, 'mg', false, 4),
  ('klean-athlete-klean-focus', 'grape-seed', 'Grape', 0, 'NP', false, 5),
  ('klean-athlete-klean-focus', 'grape-seed', 'Grape Seed Extract', 0, 'NP', false, 6),
  ('klean-athlete-klean-focus', 'blueberry', 'Wild Blueberry', 0, 'NP', false, 7),
  ('klean-athlete-klean-focus', 'blueberry', 'Wild Blueberry extract', 0, 'NP', false, 8),
  ('klean-athlete-klean-focus', 'raspberry', 'Raspberry', 0, 'NP', false, 9),
  ('klean-athlete-klean-focus', 'raspberry', 'Raspberry seed (Rubus idaeus) concentrate', 0, 'NP', false, 10),
  ('klean-athlete-klean-focus', 'cranberry', 'Cranberry', 0, 'NP', false, 11),
  ('klean-athlete-klean-focus', 'prune', 'Prune', 0, 'NP', false, 12),
  ('klean-athlete-klean-focus', 'tart-cherry', 'Tart Cherry', 0, 'NP', false, 13),
  ('klean-athlete-klean-focus', 'blueberry', 'Wild Bilberry', 0, 'NP', false, 14),
  ('klean-athlete-klean-focus', 'strawberry', 'Strawberry', 0, 'NP', false, 15),
  ('klean-athlete-klean-focus', 'lutein', 'Lutein', 12, 'mg', false, 16),
  ('klean-athlete-klean-glutamine', 'glutamine', 'Glutamine', 5000, 'mg', true, 0),
  ('klean-athlete-klean-isolate-chocolate', 'calcium', 'Calcium', 100, 'mg', false, 7),
  ('klean-athlete-klean-isolate-chocolate', 'iron', 'Iron', 1.3, 'mg', false, 8),
  ('klean-athlete-klean-isolate-chocolate', 'sodium', 'Sodium', 120, 'mg', false, 9),
  ('klean-athlete-klean-isolate-chocolate', 'potassium', 'Potassium', 220, 'mg', false, 10),
  ('klean-athlete-klean-magnesium', 'magnesium', 'Magnesium', 120, 'mg', true, 0),
  ('klean-athlete-klean-melatonin', 'melatonin', 'Melatonin', 3, 'mg', true, 0),
  ('klean-athlete-klean-multivitamin', 'vitamin-a', 'Vitamin A', 1500, 'mcg', true, 0),
  ('klean-athlete-klean-multivitamin', 'vitamin-c', 'Vitamin C', 120, 'mg', true, 1),
  ('klean-athlete-klean-multivitamin', 'vitamin-d', 'Vitamin D3', 25, 'mcg', true, 2),
  ('klean-athlete-klean-multivitamin', 'vitamin-e', 'Vitamin E', 67, 'mg', false, 3),
  ('klean-athlete-klean-multivitamin', 'thiamine', 'Thiamine', 25, 'mg', false, 4),
  ('klean-athlete-klean-multivitamin', 'riboflavin', 'Riboflavin', 10, 'mg', false, 5),
  ('klean-athlete-klean-multivitamin', 'niacin', 'Niacin/Niacinamide', 30, 'mg', false, 6),
  ('klean-athlete-klean-multivitamin', 'niacin', 'Niacin', 0, 'NP', false, 7),
  ('klean-athlete-klean-multivitamin', 'niacin', 'Niacinamide', 0, 'NP', false, 8),
  ('klean-athlete-klean-multivitamin', 'vitamin-b6', 'Vitamin B6', 10, 'mg', false, 9),
  ('klean-athlete-klean-multivitamin', 'folate', 'Folate', 667, 'mcg DFE', false, 10),
  ('klean-athlete-klean-multivitamin', 'folate', 'L-5-MTHF', 400, 'mcg', false, 11),
  ('klean-athlete-klean-multivitamin', 'vitamin-b12', 'Vitamin B12', 250, 'mcg', false, 12),
  ('klean-athlete-klean-multivitamin', 'biotin', 'Biotin', 300, 'mcg', false, 13),
  ('klean-athlete-klean-multivitamin', 'pantothenic-acid', 'Pantothenic Acid', 25, 'mg', false, 14),
  ('klean-athlete-klean-multivitamin', 'choline', 'Choline', 60, 'mg', false, 15),
  ('klean-athlete-klean-multivitamin', 'calcium', 'Calcium', 50, 'mg', false, 16),
  ('klean-athlete-klean-multivitamin', 'iodine', 'Iodine', 150, 'mcg', false, 17),
  ('klean-athlete-klean-multivitamin', 'magnesium', 'Magnesium', 25, 'mg', false, 18),
  ('klean-athlete-klean-multivitamin', 'zinc', 'Zinc', 15, 'mg', false, 19),
  ('klean-athlete-klean-multivitamin', 'selenium', 'Selenium', 100, 'mcg', false, 20),
  ('klean-athlete-klean-multivitamin', 'copper', 'Copper', 1, 'mg', false, 21),
  ('klean-athlete-klean-multivitamin', 'chromium', 'Chromium', 120, 'mcg', false, 22),
  ('klean-athlete-klean-multivitamin', 'molybdenum', 'Molybdenum', 100, 'mcg', false, 23),
  ('klean-athlete-klean-multivitamin', 'potassium', 'Potassium', 30, 'mg', false, 24),
  ('klean-athlete-klean-multivitamin', null, 'Proprietary Blend', 300, 'mg', false, 25),
  ('klean-athlete-klean-multivitamin', 'blueberry', 'Wild Blueberry extract', 0, 'NP', false, 26),
  ('klean-athlete-klean-multivitamin', 'strawberry', 'Strawberry extract', 0, 'NP', false, 27),
  ('klean-athlete-klean-multivitamin', 'spinach', 'Spinach powder', 0, 'NP', false, 28),
  ('klean-athlete-klean-multivitamin', 'inositol', 'Inositol', 25, 'mg', false, 29),
  ('klean-athlete-klean-multivitamin', 'pterostilbene', 'Pterostilbene', 10, 'mg', false, 30),
  ('klean-athlete-klean-multivitamin', 'lutein', 'Lutein', 3, 'mg', false, 31),
  ('klean-athlete-klean-multivitamin', 'lycopene', 'Lycopene', 3, 'mg', false, 32),
  ('klean-athlete-klean-multivitamin', 'zeaxanthin', 'Zeaxanthin', 1, 'mg', false, 33),
  ('klean-athlete-klean-multivitamin', 'astaxanthin', 'Astaxanthin', 1, 'mg', false, 34),
  ('klean-athlete-klean-omega', 'omega-3', 'Marine Triglyceride concentrate', 1250, 'mg', true, 2),
  ('klean-athlete-klean-omega', 'omega-3', 'Eicosapentaenoic Acid', 500, 'mg', false, 3),
  ('klean-athlete-klean-omega', 'omega-3', 'Docosahexaenoic Acid', 250, 'mg', false, 4),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'calcium', 'Calcium', 130, 'mg', false, 6),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'iron', 'Iron', 5.2, 'mg', false, 7),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'sodium', 'Sodium', 310, 'mg', false, 8),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'potassium', 'Potassium', 120, 'mg', false, 9),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'inulin', 'Sunfiber', 2.5, 'Gram(s)', false, 10),
  ('klean-athlete-klean-plant-based-protein-vanilla', 'digestive-enzymes', 'Prohydrolase', 200, 'mg', false, 11),
  ('klean-athlete-klean-sr-beta-alanine', 'beta-alanine', 'SR CarnoSyn', 1.6, 'Gram(s)', true, 0),
  ('klean-athlete-klean-zinc', 'zinc', 'Zinc', 10, 'mg', true, 0),
  ('krk-supplements-choline-bitartrate', 'choline', 'Choline Bitartrate', 900, 'mg', true, 0),
  ('life-extension-acetyl-l-carnitine-arginate', 'carnitine', 'Acetyl-L-Carnitine Arginate Dihydrochloride', 320, 'mg', true, 0),
  ('life-extension-acetyl-l-carnitine-arginate', 'carnitine', 'Acetyl-L-Carnitine Hydrochloride', 300, 'mg', true, 1),
  ('life-extension-advanced-olive-leaf-vascular-support', 'olive-leaf', 'Benolea', 500, 'mg', true, 0),
  ('life-extension-advanced-olive-leaf-vascular-support', 'digestive-enzymes', 'Excelery', 150, 'mg', true, 1),
  ('life-extension-bio-collagen-with-patented-uc-ii-40-mg', 'collagen', 'UC-II standardized Cartilage', 40, 'mg', true, 0),
  ('life-extension-bio-collagen-with-patented-uc-ii-40-mg', null, 'Total Collagen', 10, 'mg', false, 1),
  ('life-extension-black-cumin-seed-oil-and-bio-curcumin', 'black-cumin', 'Thymocid organic Black Cumin seed oil', 500, 'mg', true, 0),
  ('life-extension-black-cumin-seed-oil-and-bio-curcumin', 'curcumin', 'BCM-95 Bio-Curcumin Turmeric 25:1 extract', 200, 'mg', true, 1),
  ('life-extension-calm-mag', 'magnesium', 'Magnesium', 45, 'mg', true, 0),
  ('life-extension-calm-mag', 'magnesium', 'ATA Mg', 750, 'mg', false, 1),
  ('life-extension-citicoline-cdp-choline', 'citicoline', 'Citicoline', 250, 'mg', true, 0),
  ('life-extension-cognitex-elite', 'calcium', 'Calcium', 160, 'mg', true, 0),
  ('life-extension-cognitex-elite', 'phosphorus', 'Phosphorus', 110, 'mg', true, 1),
  ('life-extension-cognitex-elite', null, 'Sibelius', 333, 'mg', true, 2),
  ('life-extension-cognitex-elite', null, 'Proprietary Wildcrafted Blueberry Blend', 200, 'mg', false, 3),
  ('life-extension-cognitex-elite', 'blueberry', 'Blueberry Fruit Extract', 0, 'NP', false, 4),
  ('life-extension-cognitex-elite', 'blueberry', 'Blueberry Fruit Extract', 0, 'NP', false, 5),
  ('life-extension-cognitex-elite', 'blueberry', 'Blueberry Fruit Extract', 0, 'NP', false, 6),
  ('life-extension-cognitex-elite', 'blueberry', 'Blueberry Fruit Extract', 0, 'NP', false, 7),
  ('life-extension-cognitex-elite', 'blueberry', 'Blueberry Fruit Extract', 0, 'NP', false, 8),
  ('life-extension-cognitex-elite', 'blueberry', 'Blueberry Fruit Extract', 0, 'NP', false, 9),
  ('life-extension-cognitex-elite', 'ashwagandha', 'Sensoril', 125, 'mg', false, 10),
  ('life-extension-cognitex-elite', 'phosphatidylserine', 'Phosphatidylserine', 100, 'mg', false, 11),
  ('life-extension-cognitex-elite', 'uridine', 'Uridine-5''-Monophosphate Disodium', 50, 'mg', false, 12),
  ('life-extension-cognitex-elite', 'vinpocetine', 'Vinpocetine', 20, 'mg', false, 13),
  ('life-extension-creatine-capsules', 'vitamin-c', 'Vitamin C', 11, 'mg', true, 0),
  ('life-extension-creatine-capsules', 'creatine', 'Creatine Monohydrate', 1000, 'mg', true, 1),
  ('life-extension-d-ribose-powder', 'd-ribose', 'Bioenergy Ribose', 5000, 'mg', true, 3),
  ('life-extension-dopamine-advantage', 'vitamin-b12', 'Vitamin B12', 500, 'mcg', true, 0),
  ('life-extension-dopamine-advantage', 'phellodendron', 'Phellodendron, Powder', 500, 'mg', true, 1),
  ('life-extension-echinacea-elite', 'echinacea', 'Echinacea purpurea Aerial Parts Extract', 125, 'mg', true, 0),
  ('life-extension-echinacea-elite', 'echinacea', 'Echinacea angustifolia Root Extract', 125, 'mg', true, 1),
  ('life-extension-enhanced-sleep-without-melatonin', null, 'Proprietary Blend', 200, 'mg', true, 0),
  ('life-extension-enhanced-sleep-without-melatonin', 'ashwagandha', 'Sensoril', 0, 'NP', false, 1),
  ('life-extension-enhanced-sleep-without-melatonin', 'amla', 'Capros', 0, 'NP', false, 2),
  ('life-extension-enhanced-sleep-without-melatonin', 'casein', 'Casein Decapeptide', 150, 'mg', false, 3),
  ('life-extension-fast-acting-liquid-melatonin', 'melatonin', 'Melatonin', 3, 'mg', true, 1),
  ('life-extension-glycine-1000-mg', 'glycine', 'Glycine', 1000, 'mg', true, 0),
  ('life-extension-huperzine-a-200-mcg', 'huperzine-a', 'Huperzine A', 200, 'mcg', true, 0),
  ('life-extension-l-arginine-caps-700-mg', 'vitamin-c', 'Vitamin C', 10, 'mg', true, 0),
  ('life-extension-l-arginine-caps-700-mg', 'l-arginine', 'L-Arginine', 700, 'mg', true, 1),
  ('life-extension-l-tryptophan-500-mg', 'l-tryptophan', 'L-Tryptophan', 500, 'mg', true, 0),
  ('life-extension-lactoferrin-caps', 'iron', 'Bioferrin', 300, 'mg', true, 0),
  ('life-extension-mega-epa-dha', 'omega-3', 'Fish Oil Concentrate', 2000, 'mg', true, 2),
  ('life-extension-mega-epa-dha', 'omega-3', 'Eicosapentaenoic Acid', 720, 'mg', false, 3),
  ('life-extension-mega-epa-dha', 'omega-3', 'Docosahexaenoic Acid', 480, 'mg', false, 4),
  ('life-extension-optimized-saffron', 'saffron', 'Satiereal Saffron extract', 88.25, 'mg', true, 0),
  ('life-extension-palmettoguard', 'saw-palmetto', 'Saw Palmetto fruit extract', 320, 'mg', true, 2),
  ('life-extension-palmettoguard', 'beta-sitosterol', 'Beta-Sitosterol', 90, 'mg', false, 4),
  ('life-extension-palmettoguard', 'boron', 'Boron', 3, 'mg', false, 5),
  ('life-extension-palmettoguard', 'rosemary', 'Rosemary Leaf Extract', 400, 'mcg', false, 6),
  ('life-extension-senolytic-activator', null, 'Proprietary Blend', 312, 'mg', true, 0),
  ('life-extension-senolytic-activator', 'fisetin', 'Fisetin', 56, 'mg', false, 1),
  ('life-extension-senolytic-activator', 'inulin', 'Galactomannans', 109, 'mg', false, 2),
  ('life-extension-senolytic-activator', 'theaflavins', 'Theaflavins', 275, 'mg', false, 3),
  ('life-extension-senolytic-activator', 'quercetin', 'Bio-Quercetin Phytosome', 74, 'mg', false, 4),
  ('life-extension-senolytic-activator', 'quercetin', 'Quercetin', 25, 'mg', false, 5),
  ('life-extension-senolytic-activator', 'choline', 'Phosphatidylcholine Complex', 0, 'NP', false, 6),
  ('life-extension-senolytic-activator', 'apigenin', 'Apigenin', 50, 'mg', false, 7),
  ('life-extension-skin-restoring-ceramides', 'ceramides', 'Ceratiq Wheat (Triticum vulgare) oil extract', 350, 'mg', true, 0),
  ('life-extension-tart-cherry-with-cherrypure', 'd-ribose', 'CherryPURE', 480, 'mg', true, 0),
  ('mytrition-l-arginine', 'vitamin-b6', 'Vitamin B6', 10, 'mg', true, 0),
  ('mytrition-l-arginine', 'l-arginine', 'L-Arginine', 500, 'mg', true, 1),
  ('nature-made-hair-skin-nails', 'vitamin-a', 'Vitamin A', 750, 'mcg', true, 0),
  ('nature-made-hair-skin-nails', 'vitamin-c', 'Vitamin C', 100, 'mg', true, 1),
  ('nature-made-hair-skin-nails', 'biotin', 'Biotin', 2500, 'mcg', true, 2),
  ('nature-made-hair-skin-nails', 'zinc', 'Zinc', 11, 'mg', false, 3),
  ('nature-made-hair-skin-nails', 'copper', 'Copper', 0.9, 'mg', false, 4),
  ('nature-made-l-theanine-chewable-200-mg', 'sodium', 'Sodium', 5, 'mg', false, 3),
  ('nature-made-l-theanine-chewable-200-mg', 'l-theanine', 'L-Theanine', 200, 'mg', true, 4),
  ('nature-made-melatonin-200-mg-l-theanine', 'l-theanine', 'L-Theanine', 200, 'mg', true, 1),
  ('nature-made-melatonin-200-mg-l-theanine', 'melatonin', 'Melatonin', 3, 'mg', true, 2),
  ('nature-made-super-b-complex', 'vitamin-c', 'Vitamin C', 150, 'mg', true, 0),
  ('nature-made-super-b-complex', 'thiamine', 'Thiamine', 100, 'mg', true, 1),
  ('nature-made-super-b-complex', 'riboflavin', 'Riboflavin', 20, 'mg', true, 2),
  ('nature-made-super-b-complex', 'niacin', 'Niacin', 25, 'mg', false, 3),
  ('nature-made-super-b-complex', 'vitamin-b6', 'Vitamin B6', 2, 'mg', false, 4),
  ('nature-made-super-b-complex', 'folate', 'Folate', 665, 'mcg DFE', false, 5),
  ('nature-made-super-b-complex', 'folate', 'Folic Acid', 400, 'mcg', false, 6),
  ('nature-made-super-b-complex', 'vitamin-b12', 'Vitamin B12', 15, 'mcg', false, 7),
  ('nature-made-super-b-complex', 'biotin', 'Biotin', 30, 'mcg', false, 8),
  ('nature-made-super-b-complex', 'pantothenic-acid', 'Pantothenic Acid', 5.5, 'mg', false, 9),
  ('nature-made-super-b-complex', 'calcium', 'Calcium', 35, 'mg', false, 10),
  ('nature-made-vitamin-b-12-500-mcg', 'vitamin-b12', 'Vitamin B12', 500, 'mcg', true, 0),
  ('natures-craft-turmeric-curcumin', 'curcumin', 'Turmeric', 600, 'mg', true, 0),
  ('natures-craft-turmeric-curcumin', 'curcumin', 'Turmeric', 50, 'mg', true, 1),
  ('natures-craft-turmeric-curcumin', 'piperine', 'BioPerine', 5, 'mg', true, 2),
  ('natures-way-riboflavin-vitamin-b2-100-mg', 'riboflavin', 'Riboflavin', 100, 'mg', true, 0),
  ('new-sun-hyaluronic-acid', 'sodium', 'Sodium', 10, 'mg', true, 0),
  ('new-sun-hyaluronic-acid', 'hyaluronic-acid', 'Hyaluronic Acid', 100, 'mg', true, 1),
  ('new-sun-hyaluronic-acid', 'msm', 'MSM', 900, 'mg', true, 2),
  ('nhc-natural-healthy-concepts-n-acetyl-cysteine', 'l-cysteine', 'N-Acetyl-L-Cysteine', 500, 'mg', true, 0),
  ('nobi-nutrition-sambucus-elderberry', 'elderberry', 'Elderberry fruit extract', 400, 'mg', true, 0),
  ('now-acerola-4-1-extract-powder', 'vitamin-c', 'Vitamin C', 160, 'mg', true, 2),
  ('now-b-2-100-mg', 'riboflavin', 'Riboflavin', 100, 'mg', true, 0),
  ('now-boron-3-mg', 'boron', 'Boron', 3, 'mg', true, 0),
  ('now-boswellia-extract-plus-turmeric-root', 'boswellia', 'Boswellia extract', 600, 'mg', true, 0),
  ('now-boswellia-extract-plus-turmeric-root', 'curcumin', 'Turmeric', 15, 'mg', true, 1),
  ('now-extra-strength-lecithin', 'lecithin', 'Soy Lecithin', 3.6, 'g', true, 6),
  ('now-extra-strength-lecithin', 'choline', 'Phosphatidyl Choline', 1.14, 'g', false, 7),
  ('now-gamma-e-tocopherols', 'vitamin-e', 'Vitamin E', 40, 'IU', true, 0),
  ('now-gamma-e-tocopherols', null, 'Mixed Tocopherols', 240, 'mg', true, 1),
  ('now-gamma-e-tocopherols', 'vitamin-e', 'Gamma-Tocopherol', 140, 'mg', false, 2),
  ('now-gamma-e-tocopherols', 'vitamin-e', 'Delta Tocopherol', 30, 'mg', false, 3),
  ('now-l-tyrosine', 'l-tyrosine', 'L-Tyrosine', 350, 'mg', true, 0),
  ('now-maca-500-mg', 'maca', 'Maca', 500, 'mg', true, 0),
  ('now-magnesium-malate-caps', 'magnesium', 'Magnesium', 95, 'mg', true, 0),
  ('now-magnesium-malate-caps', 'magnesium', 'Magnesium Malate', 841, 'mg', false, 1),
  ('now-melatonin-5-mg', 'melatonin', 'Melatonin', 5, 'mg', true, 0),
  ('now-sports-beta-alanine-powder', 'beta-alanine', 'CarnoSyn', 2, 'Gram(s)', true, 0),
  ('now-tribulus-1000-mg', 'tribulus', 'Tribulus terrestris', 1, 'Gram(s)', true, 0),
  ('nutracraft-rhodiola-rosea', 'rhodiola', 'Rhodiola extract', 900, 'mg', true, 0),
  ('nutrakey-health-performance-l-citrulline-malate', 'l-citrulline', 'L-Citrulline Malate', 2000, 'mg', true, 0),
  ('nutricology-calcium-citrate', 'calcium', 'Calcium', 150, 'mg', true, 0),
  ('nutricology-magnesium-citrate', 'magnesium', 'Magnesium', 170, 'mg', true, 0),
  ('nutricology-potassium-citrate', 'potassium', 'Potassium', 99, 'mg', true, 0),
  ('ol-olympian-labs-ubiquinol', 'coq10', 'Ubiquinol', 50, 'mg', true, 0),
  ('oregons-wild-harvest-ashwagandha', 'ashwagandha', 'Ashwagandha', 1200, 'mg', true, 0),
  ('procaps-laboratories-chondroitin-sulfate-1200', 'vitamin-c', 'Vitamin C', 5, 'mg', true, 0),
  ('procaps-laboratories-chondroitin-sulfate-1200', 'calcium', 'Calcium', 100, 'mg', true, 1),
  ('procaps-laboratories-chondroitin-sulfate-1200', 'chondroitin', 'Chondroitin Sulfate', 1200, 'mg', true, 2),
  ('procaps-laboratories-quercetin-500', 'vitamin-c', 'Vitamin C', 25, 'mg', true, 0),
  ('procaps-laboratories-quercetin-500', 'quercetin', 'Quercetin Phospholipid Complex', 25, 'mg', true, 1),
  ('procaps-laboratories-quercetin-500', 'quercetin', 'Quercetin', 235, 'mg', false, 2),
  ('procaps-laboratories-quercetin-500', null, 'Phospholipids', 135, 'mg', false, 3),
  ('protocol-for-life-balance-glycine', 'glycine', 'Glycine', 1, 'g', true, 0),
  ('protocol-for-life-balance-high-potency-d3-10-000-iu-cholecalciferol', 'vitamin-d', 'Vitamin D3', 250, 'mcg', true, 0),
  ('pure-advantage-creatine-monohydrate', 'creatine', 'Creatine Monohydrate', 5, 'Gram(s)', true, 0),
  ('pure-encapsulations-alpha-lipoic-acid-600-mg', 'alpha-lipoic-acid', 'Alpha Lipoic Acid', 600, 'mg', true, 0),
  ('pure-encapsulations-amino-nr', 'vitamin-b6', 'Vitamin B6', 3.3, 'mg', true, 1),
  ('pure-encapsulations-amino-nr', 'vitamin-b12', 'Vitamin B12', 1000, 'mcg', true, 2),
  ('pure-encapsulations-amino-nr', 'alpha-lipoic-acid', 'Alpha-Lipoic Acid', 50, 'mg', false, 3),
  ('pure-encapsulations-amino-nr', 'l-histidine', 'L-Histidine', 77, 'mg', false, 4),
  ('pure-encapsulations-amino-nr', 'l-isoleucine', 'L-Isoleucine', 117, 'mg', false, 5),
  ('pure-encapsulations-amino-nr', 'l-leucine', 'L-Leucine', 207, 'mg', false, 6),
  ('pure-encapsulations-amino-nr', 'l-lysine', 'L-Lysine Hydrochloride Monohydrate', 225, 'mg', false, 7),
  ('pure-encapsulations-amino-nr', 'l-methionine', 'L-Methionine', 158, 'mg', false, 8),
  ('pure-encapsulations-amino-nr', 'l-phenylalanine', 'L-Phenylalanine', 86, 'mg', false, 9),
  ('pure-encapsulations-amino-nr', 'l-threonine', 'L-Threonine', 104, 'mg', false, 10),
  ('pure-encapsulations-amino-nr', 'l-valine', 'L-Valine', 113, 'mg', false, 11),
  ('pure-encapsulations-amino-nr', 'l-alanine', 'L-Alanine', 41, 'mg', false, 12),
  ('pure-encapsulations-amino-nr', 'l-arginine', 'L-Arginine Hydrochloride', 68, 'mg', false, 13),
  ('pure-encapsulations-amino-nr', 'glutamine', 'L-Glutamine', 338, 'mg', false, 14),
  ('pure-encapsulations-amino-nr', 'glycine', 'Glycine', 68, 'mg', false, 15),
  ('pure-encapsulations-amino-nr', 'l-proline', 'L-Proline', 135, 'mg', false, 16),
  ('pure-encapsulations-amino-nr', 'l-serine', 'L-Serine', 68, 'mg', false, 17),
  ('pure-encapsulations-amino-nr', 'l-tyrosine', 'L-Tyrosine', 36, 'mg', false, 18),
  ('pure-encapsulations-amino-nr', 'l-tryptophan', 'L-Tryptophan', 33, 'mg', false, 19),
  ('pure-encapsulations-amino-nr', 'taurine', 'Taurine', 23, 'mg', false, 20),
  ('pure-encapsulations-ascorbyl-palmitate', 'vitamin-c', 'Vitamin C', 190, 'mg', true, 0),
  ('pure-encapsulations-ascorbyl-palmitate', 'vitamin-c', 'Ascorbyl Palmitate', 450, 'mg', false, 1),
  ('pure-encapsulations-cats-claw', 'cats-claw', 'Cat''s Claw (Uncaria tomentosa) extract', 450, 'mg', true, 0),
  ('pure-encapsulations-glycine', 'glycine', 'Glycine', 1500, 'mg', true, 1),
  ('pure-encapsulations-l-tryptophan', 'vitamin-b6', 'Vitamin B6', 6.7, 'mg', true, 0),
  ('pure-encapsulations-l-tryptophan', 'l-tryptophan', 'TryptoPure L-Tryptophan', 1000, 'mg', true, 1),
  ('pure-encapsulations-lycopene-20-mg', 'lycopene', 'Lycopene', 20, 'mg', true, 1),
  ('pure-encapsulations-maca-3', 'maca', 'Maca Tuber Extract', 225, 'mg', true, 0),
  ('pure-encapsulations-maca-3', 'maca', 'Maca Tuber Extract', 225, 'mg', true, 1),
  ('pure-encapsulations-maca-3', 'maca', 'Maca Tuber Extract', 100, 'mg', true, 2),
  ('pure-encapsulations-pantothenic-acid', 'pantothenic-acid', 'Pantothenic Acid', 500, 'mg', true, 0),
  ('pure-encapsulations-probiotic-50b', null, 'Probiotic Blend', 0, 'NP', true, 0),
  ('pure-encapsulations-probiotic-50b', 'probiotic', 'Lactobacillus plantarum LP-115', 0, 'NP', false, 1),
  ('pure-encapsulations-probiotic-50b', 'probiotic', 'Lactobacillus acidophilus LA-14', 0, 'NP', false, 2),
  ('pure-encapsulations-probiotic-50b', 'probiotic', 'Lactobacillus rhamnosus LR-32', 0, 'NP', false, 3),
  ('pure-encapsulations-probiotic-50b', 'probiotic', 'Bifidobacterium animalis lactis BL-04', 0, 'NP', false, 4),
  ('pure-encapsulations-probiotic-50b', 'probiotic', 'Bifidobacterium longum BL-5', 0, 'NP', false, 5),
  ('pure-encapsulations-selenium-selenomethionine', 'selenium', 'Selenium', 200, 'mcg', true, 0),
  ('pure-myo-inositol', 'inositol', 'Myo-Inositol', 1860, 'mg', true, 0),
  ('pure-prescriptions-zinc-picolinate', 'zinc', 'Zinc', 30, 'mg', true, 0),
  ('quality-of-life-labs-vitapqq-pyrroloquinoline-quinone', 'pqq', 'Pyrroloquinoline Quinone Disodium Salt', 20, 'mg', true, 0),
  ('solgar-earth-source-fermented-koji-iron-27-mg', 'iron', 'Iron', 27, 'mg', true, 0),
  ('solgar-echinacea-herb-extract', 'echinacea', 'standardized Echinacea extract', 125, 'mg', true, 1),
  ('solgar-echinacea-herb-extract', 'echinacea', 'raw Echinacea powder', 300, 'mg', true, 2),
  ('solgar-flavo-zinc-lozenge', 'zinc', 'Zinc', 23, 'mg', true, 2),
  ('solgar-megasorb-coq-10-100-mg', 'coq10', 'Megasorb Coenzyme Q-10', 100, 'mg', true, 0),
  ('solgar-sublingual-methylcobalamin-b12-5000-mcg', 'vitamin-b12', 'Vitamin B12', 5000, 'mcg', true, 0),
  ('solgar-vegetal-silica', 'silica', 'Vegetal Silica extract', 23, 'mg', true, 0),
  ('solgar-vegetal-silica', 'silica', 'raw Vegetal Silica powder', 337, 'mg', true, 1),
  ('sports-research-astaxanthin-12-mg', 'astaxanthin', 'Icelandic Astalif', 12, 'mg', true, 0),
  ('sports-research-biotin-2500-mcg', 'biotin', 'Biotin', 2500, 'mcg', true, 0),
  ('sports-research-collagen-peptides-matcha', 'sodium', 'Sodium', 30, 'mg', true, 2),
  ('sports-research-collagen-peptides-matcha', 'collagen', 'Bovine Collagen Peptides, Hydrolyzed', 10, 'mg', true, 3),
  ('sports-research-collagen-peptides-matcha', 'green-tea', 'Matcha Green Tea, Powder', 2, 'Gram(s)', false, 4),
  ('sports-research-evening-primrose-oil-500-mg', 'evening-primrose', 'Evening Primrose Seed Oil', 1500, 'mg', true, 2),
  ('sports-research-evening-primrose-oil-500-mg', 'gla', 'Gamma Linoleic Acid', 140, 'mg', false, 3),
  ('sports-research-hydrolyzed-collagen-peptides-vanilla', 'sodium', 'Sodium', 40, 'mg', true, 2),
  ('sports-research-hydrolyzed-collagen-peptides-vanilla', 'collagen', 'hydrolyzed Bovine Collagen Peptides', 11, 'Gram(s)', true, 3),
  ('sports-research-magnesium-l-threonate-2000-mg', 'magnesium', 'Magnesium', 144, 'mg', true, 0),
  ('sports-research-magnesium-l-threonate-2000-mg', 'magnesium', 'Magtein', 2000, 'mg', false, 1),
  ('sports-research-marine-collagen-unflavored', 'sodium', 'Sodium', 20, 'mg', true, 2),
  ('sports-research-marine-collagen-unflavored', 'collagen', 'Marine Collagen Peptides, Hydrolyzed', 10, 'Gram(s)', false, 3),
  ('sports-research-turmeric-curcumin-c3-complex', 'curcumin', 'Curcumin C3 Complex', 500, 'mg', true, 0),
  ('sports-research-turmeric-curcumin-c3-complex', 'curcumin', 'Curcuminoids', 475, 'mg', false, 1),
  ('sports-research-turmeric-curcumin-c3-complex', 'piperine', 'Bioperine', 5, 'mg', true, 2),
  ('sports-research-turmeric-curcumin-c3-complex', 'piperine', 'Piperine', 4.75, 'mg', false, 3),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'vitamin-d', 'Vitamin D', 20, 'mcg', false, 7),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'calcium', 'Calcium', 133, 'mg', false, 8),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'iron', 'Iron', 3, 'mg', false, 9),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'sodium', 'Sodium', 220, 'mg', false, 10),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'potassium', 'Potassium', 347, 'mg', false, 11),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'whey-protein', 'Whey Protein Isolate', 25, 'Gram(s)', true, 12),
  ('sports-research-whey-protein-isolate-dutch-chocolate', null, 'Medium Chain Triglycerides', 3, 'Gram(s)', false, 13),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 'l-leucine', 'L-Leucine', 1000, 'mg', false, 14),
  ('sundown-naturals-vitamin-a-10-000-iu', 'vitamin-a', 'Vitamin A', 10000, 'IU', true, 0),
  ('superiorlabs-l-lysine', 'l-lysine', 'L-Lysine', 500, 'mg', true, 0),
  ('superiorlabs-vitamin-b6', 'vitamin-b6', 'Vitamin B6', 50, 'mg', true, 0),
  ('supersmart-bacopa-monnieri', 'bacopa', 'Bacopa monnieri standardized leaf extract', 1500, 'mg', true, 0),
  ('supersmart-spermidine-3-mg', 'spermidine', 'Spermidine', 3, 'mg', true, 0),
  ('supersmart-spermidine-3-mg', 'rice-extract', 'Rice Extract', 300, 'mg', false, 1),
  ('swanson-5-htp-50-mg', '5-htp', 'L-5-Hydroxytryptophan', 50, 'mg', true, 0),
  ('swanson-bamboo-extract', 'bamboo', 'Bamboo Leaf, Stem Extract', 300, 'mg', true, 0),
  ('swanson-black-cumin-seed-oil-500-mg', 'vitamin-e', 'Vitamin E', 3.4, 'mg', true, 0),
  ('swanson-black-cumin-seed-oil-500-mg', 'black-cumin', 'Black Cumin Seed Oil', 500, 'mg', true, 1),
  ('swanson-black-cumin-seed-oil-500-mg', 'linoleic-acid', 'Linoleic Acid', 200, 'mg', false, 2),
  ('swanson-boswellia-serrata-extract-125-mg', 'boswellia', '5-LOXIN', 125, 'mg', true, 0),
  ('swanson-chinese-skullcap-400-mg', 'chinese-skullcap', 'Chinese Skullcap Root Concentrate', 400, 'mg', true, 0),
  ('swanson-fisetin-100-mg', 'fisetin', 'Fisetin', 100, 'mg', true, 0),
  ('swanson-full-spectrum-fo-ti-500-mg', 'fo-ti', 'Fo-Ti', 500, 'mg', true, 0),
  ('swanson-full-spectrum-gotu-kola-435-mg', 'gotu-kola', 'Gotu Kola', 435, 'mg', true, 0),
  ('swanson-full-spectrum-lavender-flower-400-mg', 'lavender', 'Lavender', 400, 'mg', true, 0),
  ('swanson-huperzine-a-200-mcg', 'huperzine-a', 'Huperzine A', 200, 'mcg', true, 0),
  ('swanson-inulin', 'sodium', 'Sodium', 0, 'mg', true, 2),
  ('swanson-l-methionine-500-mg', 'l-methionine', 'L-Methionine', 500, 'mg', true, 0),
  ('swanson-lactobacillus-rhamnosus-with-fos', 'inulin', 'NutraFlora scFOS', 100, 'mg', true, 0),
  ('swanson-lactobacillus-rhamnosus-with-fos', 'probiotic', 'Lactobacillus rhamnosus', 25, 'mg', true, 1),
  ('swanson-oregano-oil-liquid-extract', 'oregano-oil', 'Oregano Essential Oil', 13, 'mg', true, 0),
  ('swanson-rosemary-extract-500-mg', 'rosemary', 'Rosemary extract', 500, 'mg', true, 0),
  ('swanson-sprouted-broccoli-seed-400-mg', 'sulforaphane', 'organic sprouted Broccoli', 400, 'mg', true, 0),
  ('teraputics-pure-life-magnesium-l-threonate', 'magnesium', 'Magnesium', 144, 'mg', true, 0),
  ('teraputics-pure-life-magnesium-l-threonate', 'magnesium', 'Magnesium L-Threonate', 2000, 'mg', true, 1),
  ('thorne-acetyl-l-carnitine-500-mg', 'carnitine', 'Acetyl-L-Carnitine', 500, 'mg', true, 0),
  ('thorne-amino-complex-lemon', 'l-leucine', 'L-Leucine', 1.25, 'Gram(s)', true, 2),
  ('thorne-amino-complex-lemon', 'l-lysine', 'L-Lysine', 650, 'mg', false, 3),
  ('thorne-amino-complex-lemon', 'l-isoleucine', 'L-Isoleucine', 625, 'mg', false, 4),
  ('thorne-amino-complex-lemon', 'l-valine', 'L-Valine', 625, 'mg', false, 5),
  ('thorne-amino-complex-lemon', 'l-threonine', 'L-Threonine', 350, 'mg', false, 6),
  ('thorne-amino-complex-lemon', 'l-histidine', 'L-Histidine', 150, 'mg', false, 7),
  ('thorne-amino-complex-lemon', 'l-cysteine', 'L-Cysteine', 150, 'mg', false, 8),
  ('thorne-amino-complex-lemon', 'l-phenylalanine', 'L-Phenylalanine', 100, 'mg', false, 9),
  ('thorne-amino-complex-lemon', 'l-methionine', 'L-Methionine', 50, 'mg', false, 10),
  ('thorne-amino-complex-lemon', 'l-tyrosine', 'L-Tyrosine', 30, 'mg', false, 11),
  ('thorne-amino-complex-lemon', 'l-tryptophan', 'L-Tryptophan', 20, 'mg', false, 12),
  ('thorne-basic-b-complex', 'thiamine', 'Thiamine', 110, 'mg', true, 0),
  ('thorne-basic-b-complex', 'riboflavin', 'Riboflavin', 10, 'mg', true, 1),
  ('thorne-basic-b-complex', 'niacin', 'Niacin', 140, 'mg', true, 2),
  ('thorne-basic-b-complex', 'niacin', 'Niacinamide', 130, 'mg', false, 3),
  ('thorne-basic-b-complex', 'niacin', 'Niacin', 10, 'mg', false, 4),
  ('thorne-basic-b-complex', 'vitamin-b6', 'Vitamin B6', 10, 'mg', false, 5),
  ('thorne-basic-b-complex', 'folate', 'Folate', 667, 'mcg', false, 6),
  ('thorne-basic-b-complex', 'folate', 'L-5-Methyltetrahydrofolate', 400, 'mcg', false, 7),
  ('thorne-basic-b-complex', 'vitamin-b12', 'Vitamin B12', 400, 'mcg', false, 8),
  ('thorne-basic-b-complex', 'biotin', 'Biotin', 400, 'mcg', false, 9),
  ('thorne-basic-b-complex', 'pantothenic-acid', 'Pantothenic Acid', 110, 'mg', false, 10),
  ('thorne-basic-b-complex', 'choline', 'Choline', 28, 'mg', false, 11),
  ('thorne-beta-alanine-sr', 'beta-alanine', 'SR CarnoSyn', 1.6, 'Gram(s)', true, 0),
  ('thorne-biotin-8000-mcg', 'biotin', 'Biotin', 8, 'mg', true, 0),
  ('thorne-boswellia-phytosome', 'boswellia', 'Indian Frankincense Phytosome Complex', 350, 'mg', true, 0),
  ('thorne-boswellia-phytosome', 'boswellia', 'Boswellia serrata', 0, 'NP', false, 1),
  ('thorne-boswellia-phytosome', null, 'Phospholipid', 0, 'NP', false, 2),
  ('thorne-broccoli-seed-extract', 'vitamin-c', 'Vitamin C', 100, 'mg', true, 0),
  ('thorne-broccoli-seed-extract', 'mustard', 'Mustard, Powder', 145, 'mg', true, 1),
  ('thorne-broccoli-seed-extract', 'sulforaphane', 'Sulforaphane Glucosinate', 50, 'mg', true, 2),
  ('thorne-copper-bisglycinate', 'copper', 'Copper', 2, 'mg', true, 0),
  ('thorne-curcumin-phytosome-1000-mg', 'curcumin', 'Meriva', 1, 'Gram(s)', true, 0),
  ('thorne-florasport-20b', null, 'Probiotic Blend', 250, 'mg', true, 0),
  ('thorne-florasport-20b', 'probiotic', 'Lactobacillus paracasei UALpc-04', 0, 'NP', false, 1),
  ('thorne-florasport-20b', 'probiotic', 'Lactobacillus acidophilus UALa-01', 0, 'NP', false, 2),
  ('thorne-florasport-20b', 'probiotic', 'Bacillus subtilis DE111', 0, 'NP', false, 3),
  ('thorne-florasport-20b', 'probiotic', 'Bifidobacterium animalis lactis HN019', 0, 'NP', false, 4),
  ('thorne-gi-relief', 'licorice-dgl', 'Deglycyrrhizinated Licorice (DGL) extract', 350, 'mg', true, 0),
  ('thorne-gi-relief', 'marshmallow-root', 'Marshmallow Root Extract', 200, 'mg', true, 1),
  ('thorne-gi-relief', 'slippery-elm', 'Slippery Elm', 100, 'mg', true, 2),
  ('thorne-gi-relief', 'aloe', 'Aloe vera, Dehydrate, Powder', 50, 'mg', false, 3),
  ('thorne-glycine', 'glycine', 'Glycine', 1, 'Gram(s)', true, 0),
  ('thorne-iodine-and-tyrosine', 'iodine', 'Iodine', 225, 'mcg', true, 0),
  ('thorne-iodine-and-tyrosine', 'l-tyrosine', 'L-Tyrosine', 500, 'mg', true, 1),
  ('thorne-iron-bisglycinate', 'iron', 'Ferrochel', 25, 'mg', true, 0),
  ('thorne-joint-support-nutrients', 'potassium', 'Potassium', 98, 'mg', true, 0),
  ('thorne-joint-support-nutrients', 'msm', 'Methyl Sulfonyl Methane', 850, 'mg', true, 1),
  ('thorne-joint-support-nutrients', 'glucosamine', 'Glucosamine Sulfate', 750, 'mg', true, 2),
  ('thorne-joint-support-nutrients', 'boswellia', 'Indian Frankincense extract', 350, 'mg', false, 3),
  ('thorne-joint-support-nutrients', 'curcumin', 'Curcumin Phytosome Complex', 250, 'mg', false, 4),
  ('thorne-joint-support-nutrients', 'curcumin', 'Curcuma longa extract', 0, 'NP', false, 5),
  ('thorne-joint-support-nutrients', null, 'Phospholipid', 0, 'NP', false, 6),
  ('thorne-joint-support-nutrients', 'digestive-enzymes', 'Bromelain', 200, 'mg', false, 7),
  ('thorne-l-arginine-plus', 'vitamin-c', 'Vitamin C', 300, 'mg', true, 0),
  ('thorne-l-arginine-plus', 'folate', 'Folate', 920, 'mcg DFE', true, 1),
  ('thorne-l-arginine-plus', 'folate', 'Quatrefolic', 552, 'mcg', false, 2),
  ('thorne-l-arginine-plus', 'l-arginine', 'L-Arginine', 1, 'Gram(s)', true, 3),
  ('thorne-l-arginine-plus', 'green-tea', 'Greenselect', 200, 'mg', false, 4),
  ('thorne-l-arginine-plus', null, 'Bio-Enhanced', 50, 'mg', false, 5),
  ('thorne-l-arginine-plus', 'resveratrol', 'Trans-Resveratrol', 50, 'mg', false, 6),
  ('thorne-magnesium-bisglycinate', 'magnesium', 'Magnesium', 200, 'mg', true, 0),
  ('thorne-niacinamide', 'niacin', 'Niacin', 500, 'mg', true, 0),
  ('thorne-pantethine', 'pantothenic-acid', 'Pantethine', 250, 'mg', true, 0),
  ('thorne-pharmagaba-250', 'gaba', 'Gamma-Aminobutyric Acid', 250, 'mg', true, 0),
  ('thorne-phosphatidylserine', 'phosphatidylserine', 'Phosphatidylserine Isolate', 100, 'mg', true, 0),
  ('thorne-riboflavin-5-phosphate', 'riboflavin', 'Riboflavin', 36.5, 'mg', true, 0),
  ('thorne-super-epa-425-mg', 'omega-3', 'Total Omega-3 Fatty Acids', 813, 'mg', true, 2),
  ('thorne-super-epa-425-mg', 'omega-3', 'Eicosapentaenoic Acid', 425, 'mg', false, 3),
  ('thorne-super-epa-425-mg', 'omega-3', 'Docosahexaenoic Acid', 270, 'mg', false, 4),
  ('thorne-theanine', 'l-theanine', 'Suntheanine', 200, 'mg', true, 0),
  ('trace-minerals-research-ionic-manganese-10-mg', 'magnesium', 'Magnesium', 30, 'mg', true, 0),
  ('trace-minerals-research-ionic-manganese-10-mg', 'manganese', 'Manganese', 10, 'mg', true, 1),
  ('trace-minerals-research-ionic-manganese-10-mg', 'chloride', 'Chloride', 70, 'mg', true, 2),
  ('trace-minerals-research-ionic-manganese-10-mg', null, 'Ionic Trace Minerals', 400, 'mg', false, 3),
  ('village-vitality-sleep-with-valerian-and-melatonin', null, 'Proprietary Blend', 1000, 'mg', true, 0),
  ('village-vitality-sleep-with-valerian-and-melatonin', 'valerian', 'Valerian', 0, 'NP', false, 1),
  ('village-vitality-sleep-with-valerian-and-melatonin', 'hops', 'Hops', 0, 'NP', false, 2),
  ('village-vitality-sleep-with-valerian-and-melatonin', 'chinese-skullcap', 'fresh Skullcap', 0, 'NP', false, 3),
  ('village-vitality-sleep-with-valerian-and-melatonin', 'passion-flower', 'Passion Flower', 0, 'NP', false, 4),
  ('village-vitality-sleep-with-valerian-and-melatonin', 'chamomile', 'Chamomile', 0, 'NP', false, 5),
  ('village-vitality-sleep-with-valerian-and-melatonin', 'california-poppy', 'fresh California Poppy', 0, 'NP', false, 6),
  ('village-vitality-sleep-with-valerian-and-melatonin', 'melatonin', 'Melatonin', 3, 'mg', true, 7),
  ('vincos-magnesium-glycinate', 'magnesium', 'Magnesium Glycinate', 2000, 'mg', true, 0),
  ('vincos-magnesium-glycinate', 'magnesium', 'Magnesium', 300, 'mg', true, 1),
  ('vital-proteins-collagen-peptides', 'sodium', 'Sodium', 20, 'mg', true, 2),
  ('vital-proteins-collagen-peptides', 'collagen', 'Collagen Peptides', 3.3, 'Gram(s)', true, 3),
  ('vitamin-world-acidophilus-and-psyllium-husk', 'psyllium', 'Psyllium Husk', 4000, 'mg', true, 3),
  ('vitamin-world-acidophilus-and-psyllium-husk', 'probiotic', 'Lactobacillus Acidophilus', 66.6, 'mg', false, 4),
  ('vitamin-world-natural-e-400-iu-d-alpha-tocopherol', 'vitamin-e', 'Vitamin E', 400, 'IU', true, 0),
  ('wakunaga-of-america-kyolic-aged-garlic-extract', 'garlic', 'Aged Garlic extract', 1, 'mL', true, 0),
  ('wonder-laboratories-silymarin-milk-thistle', 'milk-thistle', 'Milk Thistle', 250, 'mg', true, 0),
  ('woodstock-vitamins-l-theanine-200-mg', 'l-theanine', 'L-Theanine', 200, 'mg', true, 0),
  ('zhou-saw-palmetto', 'saw-palmetto', 'Saw Palmetto', 450, 'mg', true, 0),
  ('zhou-saw-palmetto', 'saw-palmetto', 'Saw Palmetto berries extract', 50, 'mg', true, 1)
) as v(slug, ingredient_key, raw_name, amount, unit, is_primary, position)
join public.glossary g on g.slug = v.slug
on conflict (glossary_id, position) do update set
  ingredient_key = excluded.ingredient_key,
  raw_name = excluded.raw_name,
  amount = excluded.amount,
  unit = excluded.unit,
  is_primary = excluded.is_primary;

do $$
declare
  products integer;
  rows_in  integer;
  keyed    integer;
begin
  select count(distinct glossary_id), count(*), count(ingredient_key)
    into products, rows_in, keyed
  from public.glossary_ingredient;
  raise notice 'ingredients: % rows across % products, % carrying a key',
    rows_in, products, keyed;
end $$;

-- ==================== 0030_growth_goal_tag.sql ====================
-- Growth as a goal tag.
--
-- PROMPT_V2.md section 2 says "Growth already exists as a goal_tags value on
-- catalogue rows, so the tag vocabulary does not need extending". It does not.
-- `growth` exists as a `category` on 19 rows — a different column with a
-- different job — and no row anywhere carries 'Growth' in `goal_tags`.
--
-- That distinction matters: `match_goal` (migration 0009) and
-- `src/lib/recommend.ts` both search `goal_tags`, so a Growth goal shipped
-- against the untouched vocabulary would have matched nothing and returned an
-- empty list to anyone who picked it. The spec says to add it properly if it is
-- not in the canonical list, so this is that.
--
-- WHAT GETS THE TAG. Every row already categorised `growth` — the creatines,
-- the proteins, the amino acids, the beta-alanines, the tribulus. The tag is
-- appended, never replacing what is there, so a product already tagged Muscle
-- and Recovery keeps both and gains Growth.
--
-- Idempotent: the guard means a second run appends nothing.

update public.glossary
set goal_tags = array_append(goal_tags, 'Growth')
where category = 'growth'
  and not ('Growth' = any(goal_tags));

do $$
declare
  tagged integer;
begin
  select count(*) into tagged
  from public.glossary
  where 'Growth' = any(goal_tags);

  raise notice 'growth goal: % products now carry the Growth tag', tagged;

  -- Not fatal, because the catalogue migrations may not have been applied yet
  -- and this file should not block the ones after it. Loud, because a Growth
  -- goal that matches nothing is a screen that looks broken.
  if tagged = 0 then
    raise warning 'no products carry the Growth tag — apply 0021 before this, or the Growth goal will return an empty list';
  end if;
end $$;

-- ==================== 0031_peptides_have_no_dose.sql ====================
-- Peptides carry no dose and no timing, enforced by the database.
--
-- CLAUDE.md: "Peptides are a reference library only: no doses, no
-- recommendations, no ranking, no injection-related UI or questions anywhere in
-- the product." legal.md records that app-sourced dosing for these compounds is
-- what got the first version rejected. PROMPT_V2.md section 3 asks for it to be
-- enforced in code rather than in copy.
--
-- The client already refuses to render or schedule them. This is the layer
-- under that, because a UI rule is one careless conditional away from being
-- untrue, and the rows outlive any particular screen.
--
-- WHAT IS CONSTRAINED. `timing` and `timing_note` must be null on a peptide
-- row. A reference intake must not join to one. The columns PROMPT_V2.md
-- section 1 will add — serving_amount, studied_low, studied_high — are not
-- constrained here because they do not exist yet; extend this check in the
-- migration that adds them.
--
-- WHY A TRIGGER AND NOT A CHECK CONSTRAINT. A check constraint on `glossary`
-- alone cannot see `nutrient_reference`, and splitting the rule across two
-- mechanisms would leave the important half unenforced.

-- 1. No peptide row may carry timing.
update public.glossary
set timing = null, timing_note = null
where kind = 'peptide' and (timing is not null or timing_note is not null);

alter table public.glossary
  drop constraint if exists glossary_peptides_have_no_timing;
alter table public.glossary
  add constraint glossary_peptides_have_no_timing
  check (kind <> 'peptide' or (timing is null and timing_note is null));

-- 2. No reference intake may point at a peptide.
delete from public.nutrient_reference nr
using public.glossary g
where nr.glossary_id = g.id and g.kind = 'peptide';

create or replace function public.nutrient_reference_rejects_peptides()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.glossary g
    where g.id = new.glossary_id and g.kind = 'peptide'
  ) then
    raise exception
      'nutrient_reference: % is a peptide and cannot carry a reference intake',
      new.glossary_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists nutrient_reference_no_peptides on public.nutrient_reference;
create trigger nutrient_reference_no_peptides
  before insert or update on public.nutrient_reference
  for each row execute function public.nutrient_reference_rejects_peptides();

-- 3. Nothing may schedule a peptide. The client refuses first; this is what
--    makes it true rather than merely usual.
create or replace function public.schedule_items_reject_peptides()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.glossary_id is not null and exists (
    select 1 from public.glossary g
    where g.id = new.glossary_id and g.kind = 'peptide'
  ) then
    raise exception
      'schedule_items: peptides are reference only and cannot be scheduled'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_items_no_peptides on public.schedule_items;
create trigger schedule_items_no_peptides
  before insert or update on public.schedule_items
  for each row execute function public.schedule_items_reject_peptides();

do $$
declare
  bad integer;
begin
  select count(*) into bad
  from public.glossary
  where kind = 'peptide' and (timing is not null or timing_note is not null);
  raise notice 'peptides carrying timing after cleanup: %', bad;

  select count(*) into bad
  from public.schedule_items s
  join public.glossary g on g.id = s.glossary_id
  where g.kind = 'peptide';
  if bad > 0 then
    -- Pre-existing rows are left alone rather than deleted: they are a user's
    -- own data and removing them silently is worse than reporting them.
    raise warning
      '% scheduled item(s) already point at a peptide. The trigger blocks new ones; these need a decision.',
      bad;
  end if;
end $$;

-- ==================== 0032_ingredient_search.sql ====================
-- Ingredient-aware search, and the abstract column it needs.
--
-- Searching "zinc" returns only products with zinc in the title, which is a
-- fraction of the products containing zinc. `search_by_ingredient` resolves the
-- query through the synonym dictionary and joins the panel instead, so the
-- multivitamin carrying 15 mg of it is found by the word.
--
-- TWO SECTIONS, NOT ONE LIST. PROMPT_V3.md section 2 asks for products *for*
-- the ingredient separated from products that merely *contain* it, and asks
-- that the first section require the ingredient to appear in one of the
-- product's five citations. That article test is applied only to the first
-- section, deliberately: a 25-ingredient multivitamin has five papers about
-- multivitamins and none about its 8 mg of zinc, so using it as a filter would
-- hide exactly the products whose hidden ingredients cause the interactions
-- this whole feature exists to catch. They belong in section two, not nowhere.
--
--   section 1 "Products for zinc"     is_primary and the ingredient is named in
--                                     a citation title or abstract
--   section 2 "Also contains zinc"    everything else, amount shown
--
-- Both sorted by amount descending, nulls last — a product that does not say
-- how much cannot be ranked above one that does.

-- The article test needs the citation text searchable. Title is already stored;
-- abstract comes from the same PubMed esummary call that fetched the rest.
alter table public.glossary_research
  add column if not exists abstract text;

comment on column public.glossary_research.abstract is
  'Populated from PubMed. Searched alongside title to decide whether a paper is actually about a given ingredient.';

create index if not exists glossary_research_text_idx
  on public.glossary_research using gin (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(abstract, ''))
  );

/**
 * Every product containing `query_text`, in two sections.
 *
 * `section` is 1 for "products for this" and 2 for "also contains this".
 * Returns no rows when the query does not resolve to an ingredient, which the
 * caller reads as "not an ingredient search" and falls back to name matching.
 */
create or replace function public.search_by_ingredient(query_text text)
returns table (
  section     integer,
  glossary_id uuid,
  slug        text,
  name        text,
  brand       text,
  kind        text,
  evidence    text,
  product_form text,
  amount      numeric,
  unit        text,
  raw_name    text
)
language sql
stable
set search_path = public
as $$
  with key as (
    select public.resolve_ingredient_key(query_text) as k
  ),
  -- the printed names this key goes by, for the citation text search
  words as (
    select distinct s.synonym as w
    from public.ingredient_synonym s, key
    where s.ingredient_key = key.k
    union
    select key.k from key
  ),
  hits as (
    select
      gi.glossary_id,
      gi.is_primary,
      gi.amount,
      gi.unit,
      gi.raw_name,
      row_number() over (
        partition by gi.glossary_id order by gi.is_primary desc, gi.amount desc nulls last
      ) as rn
    from public.glossary_ingredient gi, key
    where key.k is not null and gi.ingredient_key = key.k
  ),
  -- does any of this product's papers actually name the ingredient?
  cited as (
    select distinct r.glossary_id
    from public.glossary_research r
    where exists (
      select 1 from words
      where coalesce(r.title, '') || ' ' || coalesce(r.abstract, '') ilike '%' || words.w || '%'
    )
  )
  select
    case when h.is_primary and c.glossary_id is not null then 1 else 2 end as section,
    g.id, g.slug, g.name, g.brand, g.kind, g.evidence, g.product_form,
    h.amount, h.unit, h.raw_name
  from hits h
  join public.glossary g on g.id = h.glossary_id
  left join cited c on c.glossary_id = h.glossary_id
  where h.rn = 1
    -- peptides are reference only and never rank in a product search
    and coalesce(g.kind, 'peptide') = 'supplement'
  order by section, h.amount desc nulls last, g.name;
$$;

comment on function public.search_by_ingredient(text) is
  'Products containing an ingredient, split into "for this" (section 1) and "also contains" (section 2). Empty when the query is not an ingredient.';

grant execute on function public.search_by_ingredient(text) to anon, authenticated;

-- ==================== 0033_serving_sizes.sql ====================
-- The serving size on every product's label.
--
-- PROMPT_V2.md section 1: replace "no specific recommendation" with a real
-- number for every product, sourced rather than invented. Tier (a) is the label
-- serving, and it is available for all 250 products in the catalogue --
-- including the botanicals that have no reference intake and never will,
-- because they are not nutrients and no authority publishes a figure for them.
--
-- This is the one number that is always true and always citable: it is what the
-- manufacturer filed with the NIH, not the app's opinion about what anyone
-- should take. legal.md draws exactly that line -- the app may reproduce a
-- third party's figure, it may never originate one.
--
-- GENERATED from scripts/ingredients.json, which is the DSLD API response for
-- each label. servings_per_day is the filing's own minDailyServings.
--
-- studied_low / studied_high (tier (c), the commonly-studied range for
-- non-nutrients) are declared here and left null. Populating them requires
-- tying each range to a specific paper already in that product's five
-- citations, which is a research task per ingredient rather than a fetch. A
-- range with no source is exactly the invented number legal.md warns about, so
-- the columns exist and stay empty until someone does that work.

alter table public.glossary
  add column if not exists serving_amount   numeric,
  add column if not exists serving_unit     text,
  add column if not exists serving_form     text,
  add column if not exists servings_per_day numeric default 1,
  add column if not exists studied_low      numeric,
  add column if not exists studied_high     numeric,
  add column if not exists studied_unit     text,
  add column if not exists studied_source_citation_id uuid
    references public.glossary_research(id) on delete set null;

comment on column public.glossary.serving_form is
  'The serving as the label prints it -- "2 Capsules", "1 Scoop". Shown as "Take ...".';
comment on column public.glossary.studied_low is
  'Low end of the commonly studied range. Null unless studied_source_citation_id points at a paper in this product''s own citations.';

-- A peptide has no serving and never will. See 0031.
alter table public.glossary
  drop constraint if exists glossary_peptides_have_no_serving;
alter table public.glossary
  add constraint glossary_peptides_have_no_serving
  check (kind <> 'peptide' or (serving_amount is null and studied_low is null and studied_high is null));

update public.glossary g
set serving_amount = v.serving_amount,
    serving_unit   = v.serving_unit,
    serving_form   = v.serving_form,
    servings_per_day = v.servings_per_day
from (values
  ('advanced-nutrition-by-zahler-methylfolate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('allergy-research-group-lactobacillus', 1, 'Capsule(s)', '1 Capsule', 1),
  ('allergy-research-group-liquid-molybdenum', 0.05, 'mL', '0.05 mL', 1),
  ('aor-advanced-orthomolecular-research-advanced-active-green-tea', 1, 'Capsule(s)', '1 Capsule', 3),
  ('aor-advanced-orthomolecular-research-citicoline', 2, 'Capsule(s)', '2 Capsules', 1),
  ('aor-advanced-orthomolecular-research-premium-zinc-copper-balance', 1, 'Capsule(s)', '1 Capsule', 1),
  ('biochem-100-whey-isolate-protein-chocolate-peppermint', 26.2, 'Gram(s)', '26.2 Grams', 1),
  ('bluebonnet-niacin-100-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('bulksupplements-alpha-lipoic-acid', 600, 'mg', '600 mg', 1),
  ('bulksupplements-amla-extract', 1000, 'mg', '1000 mg', 1),
  ('bulksupplements-astragalus-extract', 1300, 'mg', '1300 mg', 1),
  ('bulksupplements-bee-propolis-powder', 1200, 'mg', '1200 mg', 1),
  ('bulksupplements-l-leucine', 2500, 'mg', '2500 mg', 1),
  ('bulksupplements-msm-methylsulfonylmethane-1500-mg', 2, 'Capsule(s)', '2 Capsules', 1),
  ('bulksupplements-mucuna-pruriens-extract', 500, 'mg', '500 mg', 1),
  ('bulksupplements-olive-leaf-extract', 750, 'mg', '750 mg', 1),
  ('bulksupplements-pantothenic-acid-vitamin-b5-powder-500-mg', 500, 'Milligram(s)', '500 Milligrams', 1),
  ('bulksupplements-phenylethylamine-hcl-pea', 150, 'mg', '150 mg', 1),
  ('bulksupplements-rice-protein', 30, 'Gram(s)', '30 Grams', 1),
  ('bulksupplements-saw-palmetto-extract-320-mg', 1, 'Softgel(s)', '1 Softgel', 1),
  ('bulksupplements-taurine', 500, 'mg', '500 mg', 1),
  ('bulksupplements-vitamin-b1-thiamine-mononitrate', 100, 'Milligram(s)', '100 Milligrams', 1),
  ('bulksupplements-vitamin-b12-1-methylcobalamin', 20, 'mg', '20 mg', 1),
  ('carlson-glucosamine-sulfate', 1, 'Capsule(s)', '1 Capsule', 2),
  ('codeage-berberine-phytosome', 1, 'Capsule(s)', '1 Capsule', 1),
  ('codeage-liposomal-urolithin-a', 2, 'Capsule(s)', '2 Capsules', 1),
  ('deva-vegan-omega-3-dha-epa', 1, 'Capsule(s)', '1 Capsule', 1),
  ('doctors-best-astaxanthin', 2, 'Veggie Softgel(s)', '2 Veggie Softgels', 1),
  ('doctors-best-bacopa-320-mg-with-synapsa', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('doctors-best-barley-beta-glucan', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('doctors-best-extra-strength-ginkgo-120-mg', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('doctors-best-fisetin-with-novusetin', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('doctors-best-fully-active-b-complex', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('doctors-best-fully-active-b12-1500-mcg', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('doctors-best-high-absorption-coq10-100-mg', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('doctors-best-l-citrulline-powder', 3, 'Gram(s)', '3 Grams', 1),
  ('doctors-best-l-tryptophan-500-mg', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('doctors-best-l-tyrosine-500-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('doctors-best-lithium-aspartate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('doctors-best-nmn-12000-400-mg', 2, 'Veggie Capsule(s)', '2 Veggie Capsules', 1),
  ('doctors-best-phosphatidyl-serine-with-serinaid-100-mg', 1, 'Softgel(s)', '1 Softgel', 3),
  ('doctors-best-pure-l-arginine-powder', 6, 'Gram(s)', '6 Grams', 1),
  ('doctors-best-stabilized-r-lipoic-acid-100-mg', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('doctors-best-vegan-omega-3-2000-mg', 2, 'Veggie Softgel(s)', '2 Veggie Softgels', 1),
  ('douglas-laboratories-vitamin-k2-menaquinone-7', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('energyfirst-chromium-picolinate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('finest-nutrition-biotin-5-000-mcg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('gematria-vitamin-c-complex', 3, 'Capsule(s)', '3 Capsules', 2),
  ('gnc-beyond-raw-chemistry-labs-betaine-anhydrous-2-5-grams', 2.53, 'Gram(s)', '2.53 Grams', 1),
  ('gnc-beyond-raw-digestive-enzymes', 1, 'Capsule(s)', '1 Capsule', 1),
  ('havasu-nutrition-ginkgo-biloba-phosphatidylserine', 1, 'Capsule(s)', '1 Capsule', 1),
  ('health-thru-nutrition-naturally-lutein-with-zeaxanthin-20-mg', 1, 'Softgel(s)', '1 Softgel', 1),
  ('healths-harmony-california-spirulina', 1, 'Vegetable Capsule(s)', '1 Vegetable Capsule', 1),
  ('herbadiet-panax-ginseng-extract', 300, 'mg', '300 mg', 1),
  ('herbadiet-trans-resveratrol', 1, 'Capsule(s)', '1 Capsule', 2),
  ('hi-tech-pharmaceuticals-potassium-iodide-130-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('host-defense-brain-energy', 3, 'Gram(s)', '3 Grams', 1),
  ('host-defense-chaga-extract', 1, 'mL', '1 mL', 2),
  ('host-defense-cordyceps', 2, 'Capsule(s)', '2 Capsules', 1),
  ('host-defense-lions-mane', 2, 'Capsule(s)', '2 Capsules', 1),
  ('host-defense-lions-mane-extract', 1, 'mL', '1 mL', 2),
  ('host-defense-maitake-extract', 1, 'mL', '1 mL', 2),
  ('host-defense-mycommunity', 2, 'Capsule(s)', '2 Capsules', 1),
  ('host-defense-reishi-extract', 1, 'mL', '1 mL', 2),
  ('host-defense-shiitake-extract', 1, 'mL', '1 mL', 2),
  ('host-defense-sleep', 2, 'Capsule(s)', '2 Capsules', 1),
  ('host-defense-stamets-7-extracts', 1, 'mL', '1 mL', 2),
  ('host-defense-turkey-tail', 2, 'Capsule(s)', '2 Capsules', 1),
  ('jarrow-formulas-5-htp-100-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-alpha-gpc-300-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-beta-glucan-250-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-borage-seed-oil-1200-mg', 1, 'Softgel(s)', '1 Softgel', 1),
  ('jarrow-formulas-carotenall', 1, 'Softgel(s)', '1 Softgel', 1),
  ('jarrow-formulas-citicoline-cdp-choline-250-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-colostrum-prime-life-400-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-evening-primrose-1300-mg', 1, 'Softgel(s)', '1 Softgel', 1),
  ('jarrow-formulas-hyaluronic-acid-120-mg', 2, 'Capsule(s)', '2 Capsules', 1),
  ('jarrow-formulas-jarro-dophilus-eps-25-billion', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-l-carnitine-500-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-lactoferrin-250-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-mastic-gum-1000-mg', 2, 'Capsule(s)', '2 Capsules', 1),
  ('jarrow-formulas-opcs-95-100-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-pqq-20-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-prebiotic-inulin-fos', 3.8, 'Gram(s)', '3.8 Grams', 1),
  ('jarrow-formulas-ps100-100-mg', 1, 'Softgel(s)', '1 Softgel', 1),
  ('jarrow-formulas-qh-absorb-200-mg', 1, 'Softgel(s)', '1 Softgel', 1),
  ('jarrow-formulas-saccharomyces-boulardii-mos', 1, 'Capsule(s)', '1 Capsule', 1),
  ('jarrow-formulas-theanine-200-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('klean-athlete-klean-b-complex', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('klean-athlete-klean-bcaa-peak-atp', 8.6, 'Gram(s)', '8.6 Grams', 1),
  ('klean-athlete-klean-casein-vanilla-custard', 30.7, 'Gram(s)', '30.7 Grams', 1),
  ('klean-athlete-klean-creatine', 5, 'Gram(s)', '5 Grams', 1),
  ('klean-athlete-klean-electrolytes', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('klean-athlete-klean-endurance', 1, 'Chewable Tablet(s)', '1 Chewable Tablet', 1),
  ('klean-athlete-klean-essential-aminos-hmb', 9.15, 'Gram(s)', '9.15 Grams', 1),
  ('klean-athlete-klean-focus', 3, 'Vegetarian Capsule(s)', '3 Vegetarian Capsules', 1),
  ('klean-athlete-klean-glutamine', 5.46, 'Gram(s)', '5.46 Grams', 1),
  ('klean-athlete-klean-isolate-chocolate', 29, 'Gram(s)', '29 Grams', 1),
  ('klean-athlete-klean-magnesium', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('klean-athlete-klean-melatonin', 0.86, 'mL', '0.86 mL', 1),
  ('klean-athlete-klean-multivitamin', 2, 'Tablet(s)', '2 Tablets', 1),
  ('klean-athlete-klean-omega', 1, 'Softgel(s)', '1 Softgel', 1),
  ('klean-athlete-klean-plant-based-protein-vanilla', 36, 'Gram(s)', '36 Grams', 1),
  ('klean-athlete-klean-sr-beta-alanine', 2, 'Tablet(s)', '2 Tablets', 2),
  ('klean-athlete-klean-zinc', 1, 'Chewable Tablet(s)', '1 Chewable Tablet', 1),
  ('krk-supplements-choline-bitartrate', 2, 'Capsule(s)', '2 Capsules', 2),
  ('life-extension-acetyl-l-carnitine-arginate', 1, 'Capsule(s)', '1 Capsule', 3),
  ('life-extension-advanced-olive-leaf-vascular-support', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 2),
  ('life-extension-bio-collagen-with-patented-uc-ii-40-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('life-extension-black-cumin-seed-oil-and-bio-curcumin', 1, 'Softgel(s)', '1 Softgel', 2),
  ('life-extension-calm-mag', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('life-extension-citicoline-cdp-choline', 1, 'Capsule(s)', '1 Capsule', 1),
  ('life-extension-cognitex-elite', 2, 'Tablet(s)', '2 Tablets', 1),
  ('life-extension-creatine-capsules', 2, 'Capsule(s)', '2 Capsules', 2),
  ('life-extension-d-ribose-powder', 5000, 'mg', '5000 mg', 1),
  ('life-extension-dopamine-advantage', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('life-extension-echinacea-elite', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 2),
  ('life-extension-enhanced-sleep-without-melatonin', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('life-extension-fast-acting-liquid-melatonin', 1, 'mL', '1 mL', 1),
  ('life-extension-glycine-1000-mg', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('life-extension-huperzine-a-200-mcg', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('life-extension-l-arginine-caps-700-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('life-extension-l-tryptophan-500-mg', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('life-extension-lactoferrin-caps', 1, 'Capsule(s)', '1 Capsule', 1),
  ('life-extension-mega-epa-dha', 2, 'Softgel(s)', '2 Softgels', 1),
  ('life-extension-optimized-saffron', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 2),
  ('life-extension-palmettoguard', 1, 'Softgel(s)', '1 Softgel', 1),
  ('life-extension-senolytic-activator', 3, 'Capsule(s)', '3 Capsules', 1),
  ('life-extension-skin-restoring-ceramides', 1, 'Liquid Vegetarian Capsule(s)', '1 Liquid Vegetarian Capsule', 1),
  ('life-extension-tart-cherry-with-cherrypure', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('mytrition-l-arginine', 1, 'Capsule(s)', '1 Capsule', 1),
  ('nature-made-hair-skin-nails', 1, 'Softgel(s)', '1 Softgel', 1),
  ('nature-made-l-theanine-chewable-200-mg', 1, 'Tablet(s)', '1 Tablet', 1),
  ('nature-made-melatonin-200-mg-l-theanine', 1, 'Softgel(s)', '1 Softgel', 1),
  ('nature-made-super-b-complex', 1, 'Tablet(s)', '1 Tablet', 1),
  ('nature-made-vitamin-b-12-500-mcg', 1, 'Tablet(s)', '1 Tablet', 1),
  ('natures-craft-turmeric-curcumin', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 2),
  ('natures-way-riboflavin-vitamin-b2-100-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('new-sun-hyaluronic-acid', 2, 'Vegetarian Capsule(s)', '2 Vegetarian Capsules', 1),
  ('nhc-natural-healthy-concepts-n-acetyl-cysteine', 1, 'Capsule(s)', '1 Capsule', 1),
  ('nobi-nutrition-sambucus-elderberry', 1, 'Capsule(s)', '1 Capsule', 1),
  ('now-acerola-4-1-extract-powder', 3.2, 'Gram(s)', '3.2 Grams', 1),
  ('now-b-2-100-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('now-boron-3-mg', 1, 'Veg Capsule(s)', '1 Veg Capsule', 1),
  ('now-boswellia-extract-plus-turmeric-root', 1, 'Vegetarian Capsule(s)', '1 Vegetarian Capsule', 1),
  ('now-extra-strength-lecithin', 2, 'Softgel(s)', '2 Softgels', 1),
  ('now-gamma-e-tocopherols', 1, 'Softgel(s)', '1 Softgel', 1),
  ('now-l-tyrosine', 0.35, 'Gram(s)', '0.35 Grams', 1),
  ('now-maca-500-mg', 1, 'Veg Capsule(s)', '1 Veg Capsule', 1),
  ('now-magnesium-malate-caps', 1, 'Veg Capsule(s)', '1 Veg Capsule', 3),
  ('now-melatonin-5-mg', 1, 'Tablet(s)', '1 Tablet', 1),
  ('now-sports-beta-alanine-powder', 2, 'Gram(s)', '2 Grams', 3),
  ('now-tribulus-1000-mg', 1, 'Tablet(s)', '1 Tablet', 1),
  ('nutracraft-rhodiola-rosea', 2, 'Capsule(s)', '2 Capsules', 1),
  ('nutrakey-health-performance-l-citrulline-malate', 2, 'Gram(s)', '2 Grams', 2),
  ('nutricology-calcium-citrate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('nutricology-magnesium-citrate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('nutricology-potassium-citrate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('ol-olympian-labs-ubiquinol', 1, 'Softgel(s)', '1 Softgel', 1),
  ('oregons-wild-harvest-ashwagandha', 1, 'Capsule(s)', '1 Capsule', 3),
  ('procaps-laboratories-chondroitin-sulfate-1200', 3, 'Capsule(s)', '3 Capsules', 1),
  ('procaps-laboratories-quercetin-500', 1, 'Capsule(s)', '1 Capsule', 1),
  ('protocol-for-life-balance-glycine', 0.25, 'tsp', '0.25 tsps', 1),
  ('protocol-for-life-balance-high-potency-d3-10-000-iu-cholecalciferol', 1, 'Veg Capsule(s)', '1 Veg Capsule', 1),
  ('pure-advantage-creatine-monohydrate', 3, 'Gram(s)', '3 Grams', 1),
  ('pure-encapsulations-alpha-lipoic-acid-600-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('pure-encapsulations-amino-nr', 3, 'Capsule(s)', '3 Capsules', 1),
  ('pure-encapsulations-ascorbyl-palmitate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('pure-encapsulations-cats-claw', 1, 'Capsule(s)', '1 Capsule', 1),
  ('pure-encapsulations-glycine', 3, 'Capsule(s)', '3 Capsules', 1),
  ('pure-encapsulations-l-tryptophan', 2, 'Capsule(s)', '2 Capsules', 1),
  ('pure-encapsulations-lycopene-20-mg', 1, 'Softgel Capsule(s)', '1 Softgel Capsule', 1),
  ('pure-encapsulations-maca-3', 1, 'Capsule(s)', '1 Capsule', 1),
  ('pure-encapsulations-pantothenic-acid', 1, 'Capsule(s)', '1 Capsule', 1),
  ('pure-encapsulations-probiotic-50b', 1, 'Capsule(s)', '1 Capsule', 1),
  ('pure-encapsulations-selenium-selenomethionine', 1, 'Capsule(s)', '1 Capsule', 1),
  ('pure-myo-inositol', 4, 'Capsule(s)', '4 Capsules', 1),
  ('pure-prescriptions-zinc-picolinate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('quality-of-life-labs-vitapqq-pyrroloquinoline-quinone', 1, 'Capsule(s)', '1 Capsule', 1),
  ('solgar-earth-source-fermented-koji-iron-27-mg', 1, 'Vegetable Capsule(s)', '1 Vegetable Capsule', 1),
  ('solgar-echinacea-herb-extract', 1, 'Vegetable Capsule(s)', '1 Vegetable Capsule', 1),
  ('solgar-flavo-zinc-lozenge', 1, 'Lozenge(s)', '1 Lozenge', 1),
  ('solgar-megasorb-coq-10-100-mg', 1, 'Softgel(s)', '1 Softgel', 1),
  ('solgar-sublingual-methylcobalamin-b12-5000-mcg', 1, 'nugget(s)', '1 nugget', 1),
  ('solgar-vegetal-silica', 1, 'Capsule(s)', '1 Capsule', 1),
  ('sports-research-astaxanthin-12-mg', 1, 'Softgel(s)', '1 Softgel', 1),
  ('sports-research-biotin-2500-mcg', 1, 'Veggie Softgel(s)', '1 Veggie Softgel', 1),
  ('sports-research-collagen-peptides-matcha', 12, 'Gram(s)', '12 Grams', 1),
  ('sports-research-evening-primrose-oil-500-mg', 3, 'Liquid Softgel(s)', '3 Liquid Softgels', 1),
  ('sports-research-hydrolyzed-collagen-peptides-vanilla', 11.65, 'Gram(s)', '11.65 Grams', 1),
  ('sports-research-magnesium-l-threonate-2000-mg', 3, 'Veggie Capsule(s)', '3 Veggie Capsules', 1),
  ('sports-research-marine-collagen-unflavored', 10, 'Gram(s)', '10 Grams', 1),
  ('sports-research-turmeric-curcumin-c3-complex', 1, 'Softgel(s)', '1 Softgel', 1),
  ('sports-research-whey-protein-isolate-dutch-chocolate', 40.5, 'Gram(s)', '40.5 Grams', 1),
  ('sundown-naturals-vitamin-a-10-000-iu', 1, 'Softgel(s)', '1 Softgel', 1),
  ('superiorlabs-l-lysine', 1, 'Capsule(s)', '1 Capsule', 1),
  ('superiorlabs-vitamin-b6', 1, 'Capsule(s)', '1 Capsule', 1),
  ('supersmart-bacopa-monnieri', 1, 'Capsule(s)', '1 Capsule', 1),
  ('supersmart-spermidine-3-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('swanson-5-htp-50-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('swanson-bamboo-extract', 1, 'Capsule(s)', '1 Capsule', 1),
  ('swanson-black-cumin-seed-oil-500-mg', 1, 'Liquid Veggie Capsule(s)', '1 Liquid Veggie Capsule', 1),
  ('swanson-boswellia-serrata-extract-125-mg', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 2),
  ('swanson-chinese-skullcap-400-mg', 1, 'Capsule(s)', '1 Capsule', 2),
  ('swanson-fisetin-100-mg', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('swanson-full-spectrum-fo-ti-500-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('swanson-full-spectrum-gotu-kola-435-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('swanson-full-spectrum-lavender-flower-400-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('swanson-huperzine-a-200-mcg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('swanson-inulin', 5, 'Gram(s)', '5 Grams', 1),
  ('swanson-l-methionine-500-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('swanson-lactobacillus-rhamnosus-with-fos', 1, 'Veggie EMBOCAP(s) AP', '1 Veggie EMBOCAP AP', 2),
  ('swanson-oregano-oil-liquid-extract', 0.17, 'mL', '0.17 mL', 3),
  ('swanson-rosemary-extract-500-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('swanson-sprouted-broccoli-seed-400-mg', 1, 'Veggie Capsule(s)', '1 Veggie Capsule', 1),
  ('teraputics-pure-life-magnesium-l-threonate', 4, 'Vegan Capsule(s)', '4 Vegan Capsules', 1),
  ('thorne-acetyl-l-carnitine-500-mg', 1, 'Capsule(s)', '1 Capsule', 2),
  ('thorne-amino-complex-lemon', 7.7, 'Gram(s)', '7.7 Grams', 1),
  ('thorne-basic-b-complex', 1, 'Capsule(s)', '1 Capsule', 1),
  ('thorne-beta-alanine-sr', 2, 'Tablet(s)', '2 Tablets', 1),
  ('thorne-biotin-8000-mcg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('thorne-boswellia-phytosome', 1, 'Capsule(s)', '1 Capsule', 2),
  ('thorne-broccoli-seed-extract', 1, 'Capsule(s)', '1 Capsule', 1),
  ('thorne-copper-bisglycinate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('thorne-curcumin-phytosome-1000-mg', 1, 'Capsule(s)', '1 Capsule', 2),
  ('thorne-florasport-20b', 1, 'Capsule(s)', '1 Capsule', 1),
  ('thorne-gi-relief', 1, 'Capsule(s)', '1 Capsule', 1),
  ('thorne-glycine', 2, 'Capsule(s)', '2 Capsules', 1),
  ('thorne-iodine-and-tyrosine', 1, 'Capsule(s)', '1 Capsule', 2),
  ('thorne-iron-bisglycinate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('thorne-joint-support-nutrients', 4, 'Capsule(s)', '4 Capsules', 1),
  ('thorne-l-arginine-plus', 3, 'Capsule(s)', '3 Capsules', 2),
  ('thorne-magnesium-bisglycinate', 3.11, 'Gram(s)', '3.11 Grams', 1),
  ('thorne-niacinamide', 1, 'Capsule(s)', '1 Capsule', 1),
  ('thorne-pantethine', 1, 'Capsule(s)', '1 Capsule', 2),
  ('thorne-pharmagaba-250', 1, 'Capsule(s)', '1 Capsule', 1),
  ('thorne-phosphatidylserine', 1, 'Capsule(s)', '1 Capsule', 2),
  ('thorne-riboflavin-5-phosphate', 1, 'Capsule(s)', '1 Capsule', 1),
  ('thorne-super-epa-425-mg', 1, 'Gelcap(s)', '1 Gelcap', 2),
  ('thorne-theanine', 1, 'Capsule(s)', '1 Capsule', 1),
  ('trace-minerals-research-ionic-manganese-10-mg', 1.25, 'mL', '1.25 mL', 1),
  ('village-vitality-sleep-with-valerian-and-melatonin', 1, 'Veggie Cap(s)', '1 Veggie Cap', 1),
  ('vincos-magnesium-glycinate', 0.5, 'Gram(s)', '0.5 Grams', 1),
  ('vital-proteins-collagen-peptides', 6, 'Capsule(s)', '6 Capsules', 2),
  ('vitamin-world-acidophilus-and-psyllium-husk', 4, 'Capsule(s)', '4 Capsules', 1),
  ('vitamin-world-natural-e-400-iu-d-alpha-tocopherol', 1, 'Softgel(s)', '1 Softgel', 1),
  ('wakunaga-of-america-kyolic-aged-garlic-extract', 0.25, 'tsp', '0.25 tsps', 2),
  ('wonder-laboratories-silymarin-milk-thistle', 1, 'Softgel(s)', '1 Softgel', 2),
  ('woodstock-vitamins-l-theanine-200-mg', 1, 'Capsule(s)', '1 Capsule', 1),
  ('zhou-saw-palmetto', 1, 'Capsule(s)', '1 Capsule', 1)
) as v(slug, serving_amount, serving_unit, serving_form, servings_per_day)
where g.slug = v.slug and g.kind = 'supplement';

do $$
declare
  with_serving integer;
  total        integer;
begin
  select count(*) filter (where serving_amount is not null), count(*)
    into with_serving, total
  from public.glossary where kind = 'supplement';
  raise notice 'servings: % of % supplements carry a label serving', with_serving, total;
end $$;

-- ==================== 0034_dose_skips.sql ====================
-- Why a dose was not taken, and when the app was last opened.
--
-- The catch-up screen asks one question — what got in the way — and this is
-- where the answer goes. It exists to move the schedule, never to score the
-- user: a person who feels judged marks everything taken and the data stops
-- meaning anything, which is worse than not asking.
--
-- WHAT IT FEEDS. An aggregate goes to the assistant's system prompt: reason
-- counts over the last 30 days and which blocks are worst. That is what lets it
-- say "you have skipped the 3pm block eleven times, mostly 'wasn't near them' —
-- worth moving it to dinner?" instead of recommending a fourth thing to take at
-- 3pm.

create table if not exists public.dose_skips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  dose_id    uuid not null references public.doses (id) on delete cascade,
  reason     text not null,
  note       text,
  created_at timestamptz not null default now(),
  -- one answer per dose; changing your mind updates rather than stacks
  unique (dose_id)
);

comment on table public.dose_skips is
  'Why a scheduled dose was not taken. Feeds schedule changes and the assistant, never a score shown back to the user.';

alter table public.dose_skips enable row level security;

create index if not exists dose_skips_user_created_idx
  on public.dose_skips (user_id, created_at desc);

-- RLS is not optional here: this is health-adjacent personal data.
drop policy if exists "dose_skips: own rows" on public.dose_skips;
create policy "dose_skips: own rows"
  on public.dose_skips for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- last opened

-- Server-side rather than in localStorage, so the catch-up screen behaves
-- correctly after a reinstall or on a second device. A device that has never
-- seen the app before must not be told it missed a week.
alter table public.profiles
  add column if not exists last_opened_at timestamptz;

comment on column public.profiles.last_opened_at is
  'When the app was last opened. The catch-up screen fires for doses whose time passed between this and now. Null means never opened, and never fires.';

/**
 * Stamp the open, and hand back the previous value in one round trip.
 *
 * Two statements would race with themselves: the app reads, then writes, and a
 * second launch in between reads the value the first one already consumed. The
 * previous timestamp is returned by the same statement that replaces it.
 */
create or replace function public.touch_last_opened()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  previous timestamptz;
begin
  if auth.uid() is null then
    raise exception 'touch_last_opened: no authenticated user' using errcode = '28000';
  end if;

  select p.last_opened_at into previous
  from public.profiles p where p.id = auth.uid();

  update public.profiles
  set last_opened_at = now()
  where id = auth.uid();

  return previous;
end;
$$;

comment on function public.touch_last_opened() is
  'Records this app open and returns the previous one. Null on a first launch, which the catch-up screen reads as "do not fire".';

revoke all on function public.touch_last_opened() from public, anon;
grant execute on function public.touch_last_opened() to authenticated;

