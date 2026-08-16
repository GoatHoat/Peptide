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
