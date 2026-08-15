-- Replace composed/unverified citations with real ones, and correct two
-- entries where deeper checking found the evidence base was weaker (SNAP-8)
-- or actively compromised (Dihexa) than the initial pass implied.

-- CJC-1295: real citation was findable — swap in the actual 2006 JCEM trial.
update public.glossary_research
set title = 'Prolonged stimulation of growth hormone (GH) and insulin-like growth factor I secretion by CJC-1295, a long-acting analog of GH-releasing hormone, in healthy adults',
    meta = 'Randomized, placebo-controlled trial (JCEM, 2006)',
    url = 'https://pubmed.ncbi.nlm.nih.gov/16352683/'
where glossary_id = (select id from public.glossary where slug = 'cjc-1295');

-- Matrixyl: real citation was findable — swap in the actual 2005 trial.
update public.glossary_research
set title = 'Topical palmitoyl pentapeptide provides improvement in photoaged human facial skin',
    meta = 'Double-blind, placebo-controlled trial (Int J Cosmet Sci, 2005)',
    url = 'https://pubmed.ncbi.nlm.nih.gov/18492182/'
where glossary_id = (select id from public.glossary where slug = 'matrixyl');

-- Semax: real citation was findable — swap in the actual BDNF/trkB study.
update public.glossary_research
set title = 'Semax, an analog of ACTH(4-10) with cognitive effects, regulates BDNF and trkB expression in the rat hippocampus',
    meta = 'Preclinical study',
    url = 'https://pubmed.ncbi.nlm.nih.gov/16996037/'
where glossary_id = (select id from public.glossary where slug = 'semax');

-- SNAP-8: no human RCT exists — remove the composed citation rather than
-- imply one does, and correct the entry to say so plainly.
delete from public.glossary_research
where glossary_id = (select id from public.glossary where slug = 'snap-8');

update public.glossary
set research_summary = 'Mechanism is inferred from related peptides and in vitro work; no published human clinical trial exists yet.'
where slug = 'snap-8';

-- Dihexa: the two foundational papers behind its core mechanism claim are
-- compromised — McCoy et al. 2013 received a publisher's Expression of
-- Concern (2021), and Benoist et al. 2014 was retracted after a Washington
-- State University investigation. Remove the citation and disclose this
-- rather than presenting the mechanism as settled.
delete from public.glossary_research
where glossary_id = (select id from public.glossary where slug = 'dihexa');

update public.glossary
set research_summary = 'The primary early studies behind this peptide''s mechanism claims have since faced serious scrutiny: the foundational 2013 paper received a publisher''s Expression of Concern, and a key 2014 follow-up was retracted after a university investigation. Treat mechanism claims here as unsettled.'
where slug = 'dihexa';
