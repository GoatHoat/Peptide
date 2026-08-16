-- Papers, part one: the Skin & hair, Sleep and Energy products.
--
-- 440 `glossary_research` rows across the 88 products migration 0021
-- inserts for those three sections, drawn from 56 ingredient groups and
-- 278 distinct PubMed records.
--
-- WHERE THESE CAME FROM. `scripts/fetch_papers.py` queries the PubMed
-- E-utilities API — `esearch` for PMIDs, `esummary` for title, journal, year
-- and publication type — and writes `scripts/papers.json`. Every title, journal
-- and year below is copied from that file verbatim. Nothing here was written
-- from memory and nothing was adjusted to read better; where a title is odd
-- (`Cosmetic benefits of astaxanthin on humans subjects`) that is what the
-- record says. Re-run the script to regenerate this file.
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
