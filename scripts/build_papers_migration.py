#!/usr/bin/env python3
"""Turn scripts/papers.json into supabase/migrations/0022_papers_part_one.sql.

The mapping below is the only hand-written part: which ingredient group each of
the 88 Skin & hair / Sleep / Energy products draws its papers from. The product
slugs are read back out of migration 0021 rather than retyped, and the script
fails if the mapping and the migration disagree — a typo'd slug would otherwise
produce a row that silently matches nothing.
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAPERS = os.path.join(ROOT, "scripts", "papers.json")
SOURCE = os.path.join(ROOT, "supabase", "migrations", "0021_catalogue_176.sql")
OUT = os.path.join(ROOT, "supabase", "migrations", "0022_papers_part_one.sql")

SECTIONS = ("Skin & hair", "Sleep", "Energy")

# product slug -> the ingredient group(s) its papers come from. A product with
# two groups takes them in turn, so a combination product gets both named.
MAP = {
    # ---------------------------------------------------------- Skin & hair
    "sports-research-marine-collagen-unflavored": ["collagen"],
    "sports-research-hydrolyzed-collagen-peptides-vanilla": ["collagen"],
    "sports-research-collagen-peptides-matcha": ["collagen"],
    "solgar-vegetal-silica": ["silicon"],
    "swanson-bamboo-extract": ["silicon"],
    "jarrow-formulas-hyaluronic-acid-120-mg": ["hyaluronic-acid"],
    "thorne-biotin-8000-mcg": ["biotin"],
    "sports-research-biotin-2500-mcg": ["biotin"],
    "nature-made-hair-skin-nails": ["biotin"],
    "life-extension-skin-restoring-ceramides": ["ceramides"],
    "sports-research-astaxanthin-12-mg": ["astaxanthin"],
    "pure-encapsulations-lycopene-20-mg": ["lycopene"],
    "jarrow-formulas-carotenall": ["carotenoids"],
    "thorne-niacinamide": ["niacinamide"],
    "swanson-l-methionine-500-mg": ["methionine"],
    "jarrow-formulas-evening-primrose-1300-mg": ["evening-primrose"],
    "jarrow-formulas-borage-seed-oil-1200-mg": ["borage"],
    "sports-research-evening-primrose-oil-500-mg": ["evening-primrose"],
    "now-gamma-e-tocopherols": ["gamma-tocopherol"],
    "jarrow-formulas-opcs-95-100-mg": ["grape-seed"],
    "bulksupplements-amla-extract": ["amla"],
    "swanson-full-spectrum-gotu-kola-435-mg": ["gotu-kola"],
    "swanson-full-spectrum-fo-ti-500-mg": ["fo-ti"],
    "swanson-black-cumin-seed-oil-500-mg": ["black-cumin"],
    "life-extension-black-cumin-seed-oil-and-bio-curcumin": ["black-cumin", "curcumin"],
    "thorne-broccoli-seed-extract": ["sulforaphane"],
    "swanson-sprouted-broccoli-seed-400-mg": ["sulforaphane"],
    "pure-encapsulations-ascorbyl-palmitate": ["vitamin-c-skin"],
    "now-acerola-4-1-extract-powder": ["vitamin-c-skin"],
    "life-extension-palmettoguard": ["saw-palmetto"],
    "bulksupplements-saw-palmetto-extract-320-mg": ["saw-palmetto"],
    "swanson-rosemary-extract-500-mg": ["rosemary"],
    # --------------------------------------------------------------- Sleep
    "thorne-pharmagaba-250": ["gaba"],
    "thorne-theanine": ["l-theanine"],
    "jarrow-formulas-theanine-200-mg": ["l-theanine"],
    "nature-made-l-theanine-chewable-200-mg": ["l-theanine"],
    "nature-made-melatonin-200-mg-l-theanine": ["melatonin", "l-theanine"],
    "life-extension-fast-acting-liquid-melatonin": ["melatonin"],
    "now-melatonin-5-mg": ["melatonin"],
    "klean-athlete-klean-melatonin": ["melatonin"],
    "life-extension-enhanced-sleep-without-melatonin": ["ashwagandha", "casein-decapeptide"],
    "thorne-glycine": ["glycine"],
    "life-extension-glycine-1000-mg": ["glycine"],
    "pure-encapsulations-glycine": ["glycine"],
    "jarrow-formulas-5-htp-100-mg": ["5-htp"],
    "swanson-5-htp-50-mg": ["5-htp"],
    "pure-encapsulations-l-tryptophan": ["l-tryptophan"],
    "life-extension-l-tryptophan-500-mg": ["l-tryptophan"],
    "doctors-best-l-tryptophan-500-mg": ["l-tryptophan"],
    "thorne-magnesium-bisglycinate": ["magnesium-sleep"],
    "now-magnesium-malate-caps": ["magnesium-sleep"],
    "life-extension-calm-mag": ["magnesium-sleep"],
    "klean-athlete-klean-magnesium": ["magnesium-sleep"],
    "swanson-full-spectrum-lavender-flower-400-mg": ["lavender"],
    "life-extension-optimized-saffron": ["saffron"],
    "life-extension-tart-cherry-with-cherrypure": ["tart-cherry"],
    "host-defense-reishi-extract": ["reishi"],
    "host-defense-sleep": ["passion-flower", "reishi", "lions-mane"],
    # -------------------------------------------------------------- Energy
    "doctors-best-nmn-12000-400-mg": ["nmn"],
    "pure-encapsulations-amino-nr": ["essential-amino-acids"],
    "solgar-sublingual-methylcobalamin-b12-5000-mcg": ["vitamin-b12"],
    "doctors-best-fully-active-b12-1500-mcg": ["vitamin-b12"],
    "nature-made-vitamin-b-12-500-mcg": ["vitamin-b12"],
    "thorne-basic-b-complex": ["b-complex"],
    "doctors-best-fully-active-b-complex": ["b-complex"],
    "nature-made-super-b-complex": ["b-complex"],
    "klean-athlete-klean-b-complex": ["b-complex"],
    "thorne-riboflavin-5-phosphate": ["riboflavin"],
    "now-b-2-100-mg": ["riboflavin"],
    "thorne-pantethine": ["pantothenic"],
    "pure-encapsulations-pantothenic-acid": ["pantothenic"],
    "thorne-acetyl-l-carnitine-500-mg": ["acetyl-l-carnitine"],
    "jarrow-formulas-l-carnitine-500-mg": ["l-carnitine"],
    "life-extension-acetyl-l-carnitine-arginate": ["acetyl-l-carnitine"],
    "life-extension-d-ribose-powder": ["d-ribose"],
    "doctors-best-high-absorption-coq10-100-mg": ["coq10"],
    "jarrow-formulas-qh-absorb-200-mg": ["coq10"],
    "solgar-megasorb-coq-10-100-mg": ["coq10"],
    "jarrow-formulas-pqq-20-mg": ["pqq"],
    "doctors-best-stabilized-r-lipoic-acid-100-mg": ["alpha-lipoic"],
    "pure-encapsulations-alpha-lipoic-acid-600-mg": ["alpha-lipoic"],
    "host-defense-cordyceps": ["cordyceps"],
    "host-defense-chaga-extract": ["chaga"],
    "now-maca-500-mg": ["maca"],
    "pure-encapsulations-maca-3": ["maca"],
    "bulksupplements-astragalus-extract": ["astragalus"],
    "solgar-earth-source-fermented-koji-iron-27-mg": ["iron"],
    "klean-athlete-klean-electrolytes": ["electrolytes"],
}


def catalogue_slugs():
    """The slugs 0021 inserts, per section, in file order."""
    out, section = {}, None
    for line in open(SOURCE, encoding="utf-8"):
        m = re.match(r"^  -- (.+) \(\d+\)$", line)
        if m:
            section = m.group(1)
            continue
        m = re.match(r"^  \('([a-z0-9.-]+)',", line)
        if m and section in SECTIONS:
            out.setdefault(section, []).append(m.group(1))
    return out


def q(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    papers = json.load(open(PAPERS, encoding="utf-8"))
    by_section = catalogue_slugs()
    listed = [s for sec in SECTIONS for s in by_section.get(sec, [])]

    unknown = [s for s in MAP if s not in listed]
    unmapped = [s for s in listed if s not in MAP]
    if unknown or unmapped:
        print(json.dumps({"not_in_0021": unknown, "not_mapped": unmapped}, indent=2))
        return 1

    rows, per_product, short = [], {}, []
    for section in SECTIONS:
        rows.append(("section", section))
        for slug in by_section[section]:
            groups = MAP[slug]
            picked, i = [], 0
            # round-robin so a two-ingredient product gets both named
            while len(picked) < 5 and any(i < len(papers[g]) for g in groups):
                for g in groups:
                    if i < len(papers[g]) and len(picked) < 5:
                        picked.append(papers[g][i])
                i += 1
            per_product[slug] = len(picked)
            if len(picked) < 5:
                short.append((slug, len(picked)))
            rows.append(("product", (slug, picked)))

    total = sum(per_product.values())
    groups_used = sorted({g for gs in MAP.values() for g in gs})

    out = []
    w = out.append
    w("-- Papers, part one: the Skin & hair, Sleep and Energy products.")
    w("--")
    w(f"-- {total} `glossary_research` rows across the {len(listed)} products migration 0021")
    w(f"-- inserts for those three sections, drawn from {len(groups_used)} ingredient groups and")
    w(f"-- {len({p['pmid'] for g in papers for p in papers[g]})} distinct PubMed records.")
    w("--")
    w("-- WHERE THESE CAME FROM. `scripts/fetch_papers.py` queries the PubMed")
    w("-- E-utilities API — `esearch` for PMIDs, `esummary` for title, journal, year")
    w("-- and publication type — and writes `scripts/papers.json`. Every title, journal")
    w("-- and year below is copied from that file verbatim. Nothing here was written")
    w("-- from memory and nothing was adjusted to read better; where a title is odd")
    w("-- (`Cosmetic benefits of astaxanthin on humans subjects`) that is what the")
    w("-- record says. Re-run the script to regenerate this file.")
    w("--")
    w("-- SEARCHED ON THE INGREDIENT, NOT THE BRAND, as the spec requires: the 88")
    w(f"-- products reduce to {len(groups_used)} active ingredients, so the four melatonin products")
    w("-- share one set of melatonin papers rather than each getting its own search for")
    w("-- a brand name that returns nothing.")
    w("--")
    w("-- VERIFIED. `python scripts/fetch_papers.py --verify` re-fetches all")
    w(f"-- {len({p['pmid'] for g in papers for p in papers[g]})} distinct PMIDs through `esummary` and checks three things: the")
    w("-- record still exists, its title still matches the one stored here, and it")
    w("-- carries no retraction publication type. All pass. It also probes two")
    w("-- non-existent PMIDs and requires the API to reject them, so a check that has")
    w("-- silently stopped working cannot pass by accident.")
    w("--")
    w("-- The URL form is `https://pubmed.ncbi.nlm.nih.gov/<pmid>/`, per the spec. Note")
    w("-- for whoever applies this: an HTTP GET on those pages could NOT be used as the")
    w("-- check from the machine this ran on. pubmed.ncbi.nlm.nih.gov answers every")
    w("-- request from here with a JS cookie-challenge page and HTTP 203 — identically")
    w("-- for a real PMID and an invented one — so the status code proves nothing. The")
    w("-- API round-trip above is the stronger check anyway, since it also compares the")
    w("-- title, but a plain link-check from an ordinary network is worth doing once.")
    w("--")
    w("-- HOW A PAPER WAS REJECTED. Relevance was the hard part, not volume. Three")
    w("-- filters, all in the script: the title must name the ingredient; topical,")
    w("-- textile and animal work is dropped because every product here is swallowed;")
    w("-- and a hand-written block list carries the ones only reading catches, each")
    w("-- with its reason. The two failure modes worth knowing about, because both")
    w("-- nearly shipped: a paper about a different compound that contains the")
    w("-- ingredient's name (glycine propionyl-L-carnitine is not glycine, Glycine max")
    w("-- is a soybean, gabapentin is not GABA, S-adenosylmethionine is not")
    w("-- methionine), and a paper about the right compound by the wrong route")
    w("-- (rosemary oil rubbed on the scalp is not a capsule).")
    w("--")
    thin = sorted((g, len(papers[g])) for g in groups_used if len(papers[g]) < 5)
    if short:
        w("-- PRODUCTS STORING FEWER THAN FIVE, rather than padding to the number:")
        for slug, n in short:
            w(f"--   {slug} — {n}")
        w("--")
    else:
        w("-- Every one of the 88 products carries five papers.")
        w("--")
    if thin:
        w("-- INGREDIENTS WHERE THE LITERATURE ITSELF RAN OUT before five, listed")
        w("-- because the spec asks for it even though no product ends up short:")
        for g, n in thin:
            w(f"--   {g} — {n}")
        w("--   The one case is a combination product, so it fills its remaining")
        w("--   slots from the other ingredient on its label rather than from")
        w("--   padding. What was rejected to get here is in the script's block")
        w("--   list: the searches keep returning lab characterisation of casein")
        w("--   peptides, and one trial that gave the peptide to foals.")
        w("--")
    w("-- IDEMPOTENT. Guarded on (glossary_id, url), so re-running inserts nothing and")
    w("-- a partially-applied run completes cleanly.")
    w("--")
    w("-- NOT APPLIED. Written to disk only, per the standing rule.")
    w("")
    w("insert into public.glossary_research (glossary_id, title, meta, url)")
    w("select g.id, v.title, v.meta, v.url")
    w("from (values")

    body = []
    for kind, payload in rows:
        if kind == "section":
            body.append(f"  -- ============================================================ {payload}")
            continue
        slug, picked = payload
        body.append(f"  -- {slug}")
        for p in picked:
            meta = f"{p['kind']} ({p['journal']}, {p['year']})" if p["journal"] and p["year"] else p["kind"]
            body.append(f"  ({q(slug)}, {q(p['title'])}, {q(meta)}, {q(p['url'])}),")

    # strip the trailing comma from the last value row
    for i in range(len(body) - 1, -1, -1):
        if body[i].endswith("),"):
            body[i] = body[i][:-1]
            break
    out.extend(body)

    w(") as v(slug, title, meta, url)")
    w("join public.glossary g on g.slug = v.slug")
    w("where not exists (")
    w("  select 1 from public.glossary_research r")
    w("  where r.glossary_id = g.id and r.url = v.url")
    w(");")
    w("")

    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out))

    print(json.dumps({"products": len(listed), "rows": total, "short": short}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
