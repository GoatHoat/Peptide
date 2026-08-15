-- Seed data for the glossary. Categorical only, per legal.md — no dosing,
-- no administration specifics beyond route type, no protocol data.

insert into public.glossary (slug, name, category, mechanism_summary, storage_notes, route, research_summary)
values
  (
    'bpc-157',
    'BPC-157',
    'healing',
    'A synthetic peptide fragment derived from a protein found in gastric juice, studied for its role in tissue repair signaling.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for tissue and gut-lining repair in animal models.'
  ),
  (
    'tb-500',
    'TB-500',
    'healing',
    'A synthetic fragment of thymosin beta-4, a naturally occurring protein involved in cell migration and wound healing.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for soft-tissue recovery and reduced inflammation.'
  ),
  (
    'igf-1',
    'IGF-1',
    'growth',
    'Insulin-like growth factor 1, a hormone structurally similar to insulin that mediates the effects of growth hormone.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for muscle growth and cellular repair pathways.'
  ),
  (
    'hgh',
    'HGH',
    'growth',
    'Human growth hormone, produced by the pituitary gland, drives growth, cell reproduction, and regeneration.',
    'Refrigerate. Protect from light.',
    'injected',
    'Commonly studied for body composition and recovery in aging populations.'
  ),
  (
    'ghk-cu',
    'GHK-Cu',
    'cosmetic',
    'A naturally occurring copper-binding peptide studied for its signaling role in skin and connective tissue remodeling.',
    'Store at room temperature, away from direct light.',
    'topical',
    'Commonly studied for skin firmness, collagen signaling, and wound healing in topical formulations.'
  )
on conflict (slug) do nothing;

insert into public.glossary_research (glossary_id, title, meta, url)
select id, 'Gastric pentadecapeptide BPC 157 and its role in tissue protection', 'Preclinical review', null
from public.glossary where slug = 'bpc-157'
union all
select id, 'Thymosin beta-4: a multi-functional regenerative peptide', 'Preclinical review', null
from public.glossary where slug = 'tb-500'
union all
select id, 'IGF-1 signaling in skeletal muscle regeneration', 'Preclinical review', null
from public.glossary where slug = 'igf-1'
union all
select id, 'Growth hormone and body composition in adults', 'Clinical review', null
from public.glossary where slug = 'hgh'
union all
select id, 'GHK-Cu: a copper peptide with multiple skin regenerative effects', 'Dermatology review', null
from public.glossary where slug = 'ghk-cu';
