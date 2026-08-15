-- Expand research citations toward 5 per peptide. Every entry below was
-- individually verified (PubMed/PMC, checked for retraction/concern status
-- where relevant) before being added — titles and links only, no copied
-- abstract text, same citation practice as every prior migration.
--
-- Two peptides fall short of 5 on purpose, not oversight: SNAP-8's
-- published literature is genuinely one paper (a combination-formulation
-- study, not an isolated trial — see updated research_summary). Dihexa's
-- two candidate mechanism papers were checked directly and are both
-- compromised (one retracted 2025, one carries a 2021 Expression of
-- Concern, both from the same lab); the single citation kept here is
-- independent replication from an unrelated institution via a different
-- mechanism. Padding either to 5 would mean citing something we already
-- know is fabricated-looking or unsound.

-- ============================================================ Healing

insert into public.glossary_research (glossary_id, title, meta, url)
select id, 'Modulatory effect of gastric pentadecapeptide BPC 157 on angiogenesis in muscle and tendon healing', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/20388964/' from public.glossary where slug = 'bpc-157'
union all
select id, 'Emerging use of BPC-157 in orthopaedic sports medicine: a systematic review', 'Systematic review', 'https://pubmed.ncbi.nlm.nih.gov/40756949/' from public.glossary where slug = 'bpc-157'
union all
select id, 'The promoting effect of pentadecapeptide BPC 157 on tendon healing involves tendon outgrowth, cell survival, and cell migration', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/21030672/' from public.glossary where slug = 'bpc-157'
union all
select id, 'Pentadecapeptide BPC 157 enhances the growth hormone receptor expression in tendon fibroblasts', 'Preclinical study', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6271067/' from public.glossary where slug = 'bpc-157'

union all
select id, 'Thymosin beta4 accelerates wound healing', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/10469335/' from public.glossary where slug = 'tb-500'
union all
select id, 'Thymosin beta4 and angiogenesis: modes of action and therapeutic potential', 'Mechanism review', 'https://pubmed.ncbi.nlm.nih.gov/17632766/' from public.glossary where slug = 'tb-500'
union all
select id, 'The actin binding site on thymosin beta4 promotes angiogenesis', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/14500546/' from public.glossary where slug = 'tb-500'
union all
select id, 'Progress on the function and application of thymosin beta 4', 'Review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8724243/' from public.glossary where slug = 'tb-500'

union all
select id, 'Comprehensive review of the safety and efficacy of thymosin alpha 1 in human clinical trials', 'Clinical review, 11,000+ subjects', 'https://pubmed.ncbi.nlm.nih.gov/38308608/' from public.glossary where slug = 'thymosin-alpha-1'
union all
select id, 'Thymosin alpha 1: a comprehensive review of the literature', 'Literature review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7747025/' from public.glossary where slug = 'thymosin-alpha-1'
union all
select id, 'Thymosin alpha 1 alleviates inflammation and prevents infection in patients with severe acute pancreatitis: a systematic review and meta-analysis', 'Meta-analysis', 'https://pubmed.ncbi.nlm.nih.gov/40599771/' from public.glossary where slug = 'thymosin-alpha-1'
union all
select id, 'Immune modulation with thymosin alpha 1 treatment', 'Clinical review', 'https://pubmed.ncbi.nlm.nih.gov/27450734/' from public.glossary where slug = 'thymosin-alpha-1'

union all
select id, 'Melanocortin-derived tripeptide KPV has anti-inflammatory potential in murine models of inflammatory bowel disease', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/18092346/' from public.glossary where slug = 'kpv'
union all
select id, 'Inhibition of cellular and systemic inflammation cues in human bronchial epithelial cells by melanocortin-related peptides: mechanism of KPV action', 'Mechanism study', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3403564/' from public.glossary where slug = 'kpv'
union all
select id, 'Terminal signal: anti-inflammatory effects of alpha-melanocyte-stimulating hormone related peptides beyond the pharmacophore', 'Mechanism review', 'https://pubmed.ncbi.nlm.nih.gov/21222263/' from public.glossary where slug = 'kpv'
union all
select id, 'New insights into the functions of alpha-MSH and related peptides in the immune system', 'Review', 'https://pubmed.ncbi.nlm.nih.gov/12851308/' from public.glossary where slug = 'kpv'

union all
select id, 'The human cathelicidin antimicrobial peptide LL-37 as a potential treatment for polymicrobial infected wounds', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/23840194/' from public.glossary where slug = 'll-37'
union all
select id, 'The human cathelicidin antimicrobial peptide LL-37 and mimics are potential anticancer drugs', 'Review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4485164/' from public.glossary where slug = 'll-37'
union all
select id, 'Antimicrobial peptides of the cathelicidin family: focus on LL-37 and its modifications', 'Review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12386566/' from public.glossary where slug = 'll-37'
union all
select id, 'Efficacy of cathelicidin LL-37 in an MRSA wound infection mouse model', 'Preclinical study', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8532939/' from public.glossary where slug = 'll-37';

-- ============================================================ Growth

insert into public.glossary_research (glossary_id, title, meta, url)
select id, 'Mechanisms of IGF-1-mediated regulation of skeletal muscle hypertrophy and atrophy', 'Mechanism review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7564605/' from public.glossary where slug = 'igf-1'
union all
select id, 'Molecular mechanisms involving IGF-1 and myostatin to induce muscle hypertrophy as a therapeutic strategy for Duchenne muscular dystrophy', 'Mechanism review', 'https://pubmed.ncbi.nlm.nih.gov/16629058/' from public.glossary where slug = 'igf-1'
union all
select id, 'Crucial role of androgen receptor in resistance and endurance training-induced muscle hypertrophy through the IGF-1/IGF-1R-PI3K/Akt-mTOR pathway', 'Preclinical study', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7106900/' from public.glossary where slug = 'igf-1'
union all
select id, 'Insulin-like growth factor-I and wound healing, a potential answer to non-healing wounds: a systematic review of the literature', 'Systematic review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8212444/' from public.glossary where slug = 'igf-1'

union all
select id, 'Body composition and quality of life in adults treated with growth hormone therapy: a systematic review and meta-analysis', 'Meta-analysis', 'https://www.ncbi.nlm.nih.gov/books/NBK84765/' from public.glossary where slug = 'hgh'
union all
select id, 'The effect of growth hormone administration in growth hormone deficient adults on bone, protein, carbohydrate and lipid homeostasis, and body composition', 'Clinical study', 'https://pubmed.ncbi.nlm.nih.gov/1424196/' from public.glossary where slug = 'hgh'
union all
select id, 'Effects of recombinant human growth hormone therapy in obesity in adults: a meta-analysis', 'Meta-analysis', 'https://pubmed.ncbi.nlm.nih.gov/18940879/' from public.glossary where slug = 'hgh'
union all
select id, 'Treatment of adults with growth hormone deficiency with recombinant human growth hormone', 'Clinical study', 'https://pubmed.ncbi.nlm.nih.gov/8432773/' from public.glossary where slug = 'hgh'

union all
select id, 'A new series of highly potent growth hormone-releasing peptides derived from ipamorelin', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/9733495/' from public.glossary where slug = 'ipamorelin'
union all
select id, 'Ipamorelin, a new growth-hormone-releasing peptide, induces longitudinal bone growth in rats', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/10373343/' from public.glossary where slug = 'ipamorelin'
union all
select id, 'Do growth hormone-releasing peptides act as ghrelin secretagogues?', 'Mechanism study', 'https://pubmed.ncbi.nlm.nih.gov/11322495/' from public.glossary where slug = 'ipamorelin'
union all
select id, 'The growth hormone secretagogue ipamorelin counteracts glucocorticoid-induced catabolism', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/11735244/' from public.glossary where slug = 'ipamorelin'

union all
select id, 'Once-daily administration of CJC-1295, a long-acting growth hormone-releasing hormone analog, normalizes growth in the GHRH knockout mouse', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/16822960/' from public.glossary where slug = 'cjc-1295'
union all
select id, 'Pulsatile secretion of growth hormone persists during continuous stimulation by CJC-1295, a long-acting GH-releasing hormone analog', 'Clinical study', 'https://pubmed.ncbi.nlm.nih.gov/17018654/' from public.glossary where slug = 'cjc-1295'
union all
select id, 'Activation of the GH/IGF-1 axis by CJC-1295, a long-acting GHRH analog, results in serum protein profile changes in normal adult subjects', 'Clinical study', 'https://pubmed.ncbi.nlm.nih.gov/19386527/' from public.glossary where slug = 'cjc-1295'
union all
select id, 'An immuno polymerase chain reaction screen for the detection of CJC-1295 and other growth-hormone-releasing hormone analogs in equine plasma', 'Detection method study', 'https://pubmed.ncbi.nlm.nih.gov/30489688/' from public.glossary where slug = 'cjc-1295'

union all
select id, 'Sermorelin: a review of its use in the diagnosis and treatment of children with idiopathic growth hormone deficiency', 'Clinical review', 'https://pubmed.ncbi.nlm.nih.gov/18031173/' from public.glossary where slug = 'sermorelin'
union all
select id, 'Testing with growth hormone-releasing factor (GRF(1-29)NH2) and somatomedin C measurements for the evaluation of growth hormone deficiency', 'Clinical study', 'https://pubmed.ncbi.nlm.nih.gov/2880720/' from public.glossary where slug = 'sermorelin'
union all
select id, 'Growth response to growth hormone-releasing hormone(1-29)-NH2 compared with growth hormone', 'Clinical study', 'https://pubmed.ncbi.nlm.nih.gov/8329826/' from public.glossary where slug = 'sermorelin'
union all
select id, 'Pharmacokinetics of growth hormone-releasing hormone(1-29)-NH2 and stimulation of growth hormone secretion in healthy subjects after intravenous or intranasal administration', 'Clinical study', 'https://pubmed.ncbi.nlm.nih.gov/8329825/' from public.glossary where slug = 'sermorelin';

-- ============================================================ Cosmetic

insert into public.glossary_research (glossary_id, title, meta, url)
select id, 'The human tri-peptide GHK and tissue remodeling', 'Mechanism review', 'https://pubmed.ncbi.nlm.nih.gov/18644225/' from public.glossary where slug = 'ghk-cu'
union all
select id, 'GHK peptide as a natural modulator of multiple cellular pathways in skin regeneration', 'Review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4508379/' from public.glossary where slug = 'ghk-cu'
union all
select id, 'Stimulation of collagen synthesis in fibroblast cultures by the tripeptide-copper complex glycyl-L-histidyl-L-lysine-Cu2+', 'Original characterization', 'https://pubmed.ncbi.nlm.nih.gov/3169264/' from public.glossary where slug = 'ghk-cu'
union all
select id, 'Regenerative and protective actions of the GHK-Cu peptide in the light of the new gene data', 'Review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6073405/' from public.glossary where slug = 'ghk-cu'

union all
select id, 'Boosting cosmeceutical peptides: coupling imidazolium-based ionic liquids to pentapeptide-4 originates new leads with antimicrobial and collagenesis-inducing activities', 'Formulation study', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9431032/' from public.glossary where slug = 'matrixyl'
union all
select id, 'Dermal stability and in vitro skin permeation of collagen pentapeptides (KTTKS and palmitoyl-KTTKS)', 'Preclinical study', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4131521/' from public.glossary where slug = 'matrixyl'
union all
select id, 'Matrixyl patch vs Matrixyl cream: a comparative in vivo investigation of Matrixyl effect on wound healing', 'Clinical study', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9301720/' from public.glossary where slug = 'matrixyl'
union all
select id, 'Current approaches in cosmeceuticals: peptides, biotics and marine biopolymers', 'Review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11946782/' from public.glossary where slug = 'matrixyl'

union all
select id, 'The anti-wrinkle efficacy of synthetic hexapeptide (Argireline) in Chinese subjects', 'Clinical study', 'https://www.ncbi.nlm.nih.gov/pubmed/23607739' from public.glossary where slug = 'argireline'
union all
select id, 'Enhanced skin permeation of anti-wrinkle peptides via molecular modification', 'Formulation study', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5785486/' from public.glossary where slug = 'argireline'
union all
select id, 'Argireline in treatment of periorbital wrinkles', 'Registered clinical trial', 'https://clinicaltrials.gov/study/NCT01381484' from public.glossary where slug = 'argireline'
union all
select id, 'Topical acetyl hexapeptide-8 and the cosmetic appearance of oily skin', 'Registered clinical trial', 'https://clinicaltrials.gov/study/NCT02597777' from public.glossary where slug = 'argireline'

union all
select id, 'Clinical safety and efficacy evaluation of a dissolving microneedle patch having dual anti-wrinkle effects with safe and long-term activities', 'Clinical study — combination formulation including SNAP-8', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11291098/' from public.glossary where slug = 'snap-8'

union all
select id, 'Evaluation of melanotan-II, a superpotent cyclic melanotropic peptide, in a pilot phase-I clinical study', 'Phase I clinical study', 'https://pubmed.ncbi.nlm.nih.gov/8637402/' from public.glossary where slug = 'melanotan-ii'
union all
select id, 'Effects of a superpotent melanotropic peptide in combination with solar UV radiation on tanning of the skin in human volunteers', 'Clinical study', 'https://pubmed.ncbi.nlm.nih.gov/15262693/' from public.glossary where slug = 'melanotan-ii'
union all
select id, 'Skin pigmentation and pharmacokinetics of melanotan-I in humans', 'Clinical study, related melanocortin peptide', 'https://pubmed.ncbi.nlm.nih.gov/9113347/' from public.glossary where slug = 'melanotan-ii'
union all
select id, 'Melanocortin 1 receptor (MC1R): pharmacological and therapeutic aspects', 'Review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10418475/' from public.glossary where slug = 'melanotan-ii';

-- ============================================================ Cognitive

insert into public.glossary_research (glossary_id, title, meta, url)
select id, 'Semax and Pro-Gly-Pro activate the transcription of neurotrophins and their receptor genes after cerebral ischemia', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/19633950/' from public.glossary where slug = 'semax'
union all
select id, 'Brain protein expression profile confirms the protective effect of the ACTH(4-7)PGP peptide (Semax) in a rat model of cerebral ischemia-reperfusion', 'Preclinical study', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8226508/' from public.glossary where slug = 'semax'
union all
select id, 'The peptide Semax affects the expression of genes related to the immune and vascular systems in rat brain focal ischemia: genome-wide transcriptional analysis', 'Preclinical study', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3987924/' from public.glossary where slug = 'semax'
union all
select id, 'Comparison of the temporary dynamics of NGF and BDNF gene expression in rat hippocampus, frontal cortex, and retina under Semax action', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/19662538/' from public.glossary where slug = 'semax'

union all
select id, 'Selank, a peptide analog of tuftsin, attenuates aversive signs of morphine withdrawal in rats', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/36322304/' from public.glossary where slug = 'selank'
union all
select id, 'Peptide-based anxiolytics: the molecular aspects of heptapeptide Selank biological activity', 'Mechanism review', 'https://pubmed.ncbi.nlm.nih.gov/30255741/' from public.glossary where slug = 'selank'
union all
select id, 'GABA, Selank, and olanzapine affect the expression of genes involved in GABAergic neurotransmission in IMR-32 cells', 'Preclinical study', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5328971/' from public.glossary where slug = 'selank'
union all
select id, 'Efficacy and possible mechanisms of action of a new peptide anxiolytic Selank in the therapy of generalized anxiety disorders and neurasthenia', 'Clinical study', 'https://pubmed.ncbi.nlm.nih.gov/18454096/' from public.glossary where slug = 'selank'

union all
select id, 'Neuroprotective effect of novel cognitive enhancer Noopept on an Alzheimer''s-related cellular model involves the attenuation of apoptosis and tau hyperphosphorylation', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/25096780/' from public.glossary where slug = 'noopept'
union all
select id, 'Noopept efficiency in experimental Alzheimer disease (cognitive deficiency caused by beta-amyloid25-35 injection into Meynert basal nuclei of rats)', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/19145356/' from public.glossary where slug = 'noopept'
union all
select id, 'Effect of nootropic dipeptide Noopept on CA1 pyramidal neurons involves alpha7 AChRs on interneurons in hippocampal slices from rat', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/36195298/' from public.glossary where slug = 'noopept'
union all
select id, 'Noopept stimulates the expression of NGF and BDNF in rat hippocampus', 'Preclinical study', 'https://pubmed.ncbi.nlm.nih.gov/19240853/' from public.glossary where slug = 'noopept'

union all
select id, 'Efficacy and safety of Cerebrolysin for acute ischemic stroke: a meta-analysis of randomized controlled trials', 'Meta-analysis', 'https://pubmed.ncbi.nlm.nih.gov/28656143/' from public.glossary where slug = 'cerebrolysin'
union all
select id, 'Cerebrolysin and early neurorehabilitation in patients with acute ischemic stroke: a prospective, randomized, placebo-controlled clinical study', 'Randomized controlled trial', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5771251/' from public.glossary where slug = 'cerebrolysin'
union all
select id, 'Efficacy and safety of Cerebrolysin treatment in early recovery after acute ischemic stroke: a randomized, placebo-controlled, double-blinded, multicenter clinical trial', 'Randomized controlled trial', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5652261/' from public.glossary where slug = 'cerebrolysin'
union all
select id, 'Cerebrolysin in vascular dementia: improvement of clinical outcome in a randomized, double-blind, placebo-controlled multicenter trial', 'Randomized controlled trial', 'https://pubmed.ncbi.nlm.nih.gov/20656516/' from public.glossary where slug = 'cerebrolysin'

union all
select id, 'AngIV-analog Dihexa rescues cognitive impairment and recovers memory in the APP/PS1 mouse via the PI3K/AKT signaling pathway', 'Independent replication (different lab, different mechanism than retracted claims)', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8615599/' from public.glossary where slug = 'dihexa';

-- Update disclosures now that both candidate mechanism papers were checked directly.
update public.glossary
set research_summary = 'SNAP-8''s published literature is thin: the one identifiable study involving it tests a three-ingredient combination patch, not SNAP-8 in isolation, so its individual effect can''t be separated from the other actives. No published human trial isolates SNAP-8 alone.'
where slug = 'snap-8';

update public.glossary
set research_summary = 'Both candidate mechanism papers behind this peptide''s procognitive claims were checked directly: the 2013 foundational paper carries a 2021 Expression of Concern, and the 2014 mechanistic follow-up was retracted in 2025 after a Washington State University investigation found image alterations by the lead author across multiple papers. One independent study from an unrelated lab (China Pharmaceutical University, 2021) did find a cognitive effect in mice, but through a different pathway (PI3K/AKT) than the original, now-retracted claims. Treat the HGF/c-Met mechanism as unsupported; treat cognitive effects generally as unsettled.'
where slug = 'dihexa';
