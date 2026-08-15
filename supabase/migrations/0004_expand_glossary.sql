-- Expand the glossary to 5 entries per category, researched via Tomesphere +
-- general literature search. Same categorical-only rule as the seed set in
-- 0002: mechanism, category, storage, route type, and research trends phrased
-- at the pattern level — never dosing, frequency, or protocol specifics.

-- Semax and Selank are studied almost exclusively via intranasal
-- administration, which the injected/oral/topical enum can't honestly
-- represent — extend it rather than mislabel the route.
alter table public.glossary drop constraint if exists glossary_route_check;
alter table public.glossary add constraint glossary_route_check
  check (route in ('injected', 'oral', 'topical', 'nasal'));

insert into public.glossary (slug, name, category, mechanism_summary, storage_notes, route, research_summary, goal_tags)
values
  (
    'thymosin-alpha-1',
    'Thymosin Alpha-1',
    'healing',
    'A 28-amino-acid peptide originally isolated from thymic tissue, studied for its role in modulating immune cell activity via Toll-like receptor signaling.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for immune modulation and restoring immune response in aging or immunocompromised contexts.',
    array['Immune', 'Recovery']
  ),
  (
    'kpv',
    'KPV',
    'healing',
    'A short tripeptide fragment of alpha-MSH, studied for suppressing inflammatory signaling pathways at the cellular level.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for gut and skin inflammation in preclinical models.',
    array['Gut Health', 'Recovery']
  ),
  (
    'll-37',
    'LL-37',
    'healing',
    'The only human cathelicidin, a naturally occurring antimicrobial peptide studied for its role in immune defense and tissue repair signaling.',
    'Refrigerate. Protect from light.',
    'topical',
    'Commonly studied for wound healing and antimicrobial activity against resistant bacterial strains.',
    array['Recovery', 'Injury']
  ),
  (
    'ipamorelin',
    'Ipamorelin',
    'growth',
    'A synthetic pentapeptide that selectively activates the growth hormone secretagogue receptor, studied for triggering pulsatile growth hormone release.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for growth hormone secretion patterns, often alongside GHRH-analog peptides.',
    array['Muscle', 'Recovery']
  ),
  (
    'cjc-1295',
    'CJC-1295',
    'growth',
    'A synthetic analog of growth hormone-releasing hormone (GHRH), modified for resistance to enzymatic breakdown and extended activity.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for sustained growth hormone and IGF-1 elevation.',
    array['Muscle', 'Recovery']
  ),
  (
    'sermorelin',
    'Sermorelin',
    'growth',
    'A synthetic fragment of growth hormone-releasing hormone comprising its first 29 amino acids, studied for stimulating the pituitary gland''s natural GH secretion rhythm.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for preserving pulsatile, physiological growth hormone release patterns.',
    array['Muscle', 'Recovery']
  ),
  (
    'matrixyl',
    'Matrixyl',
    'cosmetic',
    'A palmitoylated fragment of procollagen (Pal-KTTKS), studied for signaling skin fibroblasts to sustain collagen production.',
    'Store at room temperature, away from direct light.',
    'topical',
    'Commonly studied for collagen and extracellular matrix synthesis in skin.',
    array['Skin', 'Anti-Aging']
  ),
  (
    'argireline',
    'Argireline',
    'cosmetic',
    'A synthetic hexapeptide that mimics part of the SNARE complex protein SNAP-25, studied for its effect on neurotransmitter release at neuromuscular junctions.',
    'Store at room temperature, away from direct light.',
    'topical',
    'Commonly studied for reducing the appearance of expression lines by moderating facial muscle contraction.',
    array['Skin', 'Anti-Aging']
  ),
  (
    'snap-8',
    'SNAP-8',
    'cosmetic',
    'An eight-amino-acid extension of the Argireline sequence, studied for a similar effect on the SNARE complex and neurotransmitter release.',
    'Store at room temperature, away from direct light.',
    'topical',
    'Commonly studied for expression-line reduction and skin structural support.',
    array['Skin', 'Anti-Aging']
  ),
  (
    'melanotan-ii',
    'Melanotan II',
    'cosmetic',
    'A synthetic, non-selective melanocortin receptor agonist, studied for activating melanocyte pigment production via MC1R signaling.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for skin pigmentation, alongside broader melanocortin-system effects on appetite and mood.',
    array['Skin']
  ),
  (
    'semax',
    'Semax',
    'cognitive',
    'A synthetic heptapeptide derived from a fragment of ACTH, studied for upregulating brain-derived neurotrophic factor (BDNF) expression.',
    'Refrigerate. Protect from light.',
    'nasal',
    'Commonly studied for attention, learning, and memory consolidation in preclinical and Russian clinical research.',
    array['Focus']
  ),
  (
    'selank',
    'Selank',
    'cognitive',
    'A synthetic heptapeptide derived from the immunomodulatory peptide tuftsin, studied as a positive allosteric modulator of GABA receptors.',
    'Refrigerate. Protect from light.',
    'nasal',
    'Commonly studied for anxiolytic effects alongside cognitive and immune-modulating properties.',
    array['Mood', 'Focus']
  ),
  (
    'noopept',
    'Noopept',
    'cognitive',
    'A synthetic dipeptide-derived compound studied for effects on glutamatergic signaling and neuroprotection.',
    'Store at room temperature, away from direct light.',
    'oral',
    'Commonly studied for memory, learning, and protective effects against oxidative neural stress.',
    array['Focus']
  ),
  (
    'cerebrolysin',
    'Cerebrolysin',
    'cognitive',
    'A peptide mixture derived from porcine brain proteins, studied for mimicking the activity of endogenous neurotrophic factors like BDNF and NGF.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for neuroprotection and recovery support following brain injury or neurodegenerative decline.',
    array['Focus', 'Recovery']
  ),
  (
    'dihexa',
    'Dihexa',
    'cognitive',
    'A modified dipeptide derived from angiotensin IV, studied for activating the HGF/c-Met signaling pathway involved in neural connection formation.',
    'Store at room temperature, away from direct light.',
    'oral',
    'Commonly studied for synaptic connection formation relevant to learning and memory.',
    array['Focus']
  )
on conflict (slug) do nothing;

insert into public.glossary_research (glossary_id, title, meta, url)
select id, 'Thymosin alpha 1 and its role in viral infectious diseases: the mechanism and clinical application', 'Mechanism review', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10144173/'
from public.glossary where slug = 'thymosin-alpha-1'
union all
select id, 'PepT1-mediated tripeptide KPV uptake reduces intestinal inflammation', 'Preclinical study', 'https://www.sciencedirect.com/science/article/abs/pii/S0016508507018525'
from public.glossary where slug = 'kpv'
union all
select id, 'LL-37 as a bioactive peptide with multifocal mechanisms of action', 'Mechanism review', 'https://doi.org/10.3390/amh71030024'
from public.glossary where slug = 'll-37'
union all
select id, 'Ipamorelin, the first selective growth hormone secretagogue', 'Original characterization', 'https://pubmed.ncbi.nlm.nih.gov/9849822/'
from public.glossary where slug = 'ipamorelin'
union all
select id, 'CJC-1295 and growth hormone-releasing hormone receptor signaling', 'Mechanism review', null
from public.glossary where slug = 'cjc-1295'
union all
select id, 'Growth hormone-releasing hormone analogs and pulsatile GH secretion', 'Clinical review', 'https://doaj.org/article/4937bb4c4e544e1386e8d0a848168132'
from public.glossary where slug = 'sermorelin'
union all
select id, 'Palmitoyl pentapeptide-4 and collagen matrix signaling in skin fibroblasts', 'Cosmetic dermatology review', null
from public.glossary where slug = 'matrixyl'
union all
select id, 'Acetyl hexapeptide-8 in cosmeceuticals — a review of skin permeability and efficacy', 'Dermatology review', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12193160/'
from public.glossary where slug = 'argireline'
union all
select id, 'SNARE-complex-targeting peptides and neuromuscular signaling in skin', 'Cosmetic dermatology review', null
from public.glossary where slug = 'snap-8'
union all
select id, 'Melanotan II and melanocortin receptor signaling in pigmentation', 'Pharmacology review', 'https://www.sciencedirect.com/topics/pharmacology-toxicology-and-pharmaceutical-science/melanotan-ii'
from public.glossary where slug = 'melanotan-ii'
union all
select id, 'Semax and BDNF upregulation in cognitive research models', 'Neuropeptide review', null
from public.glossary where slug = 'semax'
union all
select id, 'Peptide Selank enhances the effect of diazepam in reducing anxiety in unpredictable chronic mild stress conditions in rats', 'Preclinical study', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5322660/'
from public.glossary where slug = 'selank'
union all
select id, 'Molecular mechanism underlying the action of substituted Pro-Gly dipeptide Noopept', 'Mechanism study', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4837574/'
from public.glossary where slug = 'noopept'
union all
select id, 'Neuroprotection by Cerebrolysin and citicoline through upregulation of BDNF expression', 'In vitro study', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10960614/'
from public.glossary where slug = 'cerebrolysin'
union all
select id, 'Dihexa and HGF/c-Met signaling in synaptogenesis', 'Preclinical review', null
from public.glossary where slug = 'dihexa';
