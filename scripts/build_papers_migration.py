#!/usr/bin/env python3
"""Turn the papers JSON into a migration.

    python scripts/build_papers_migration.py            # part one -> 0022
    python scripts/build_papers_migration.py --part 2   # part two -> 0023

Part one is Skin & hair / Sleep / Energy, part two is Focus / Training /
Immunity & gut. The mapping below is the only hand-written part: which
ingredient group each of the 88 products in a part draws its papers from. The
product slugs are read back out of migration 0021 rather than retyped, and the
script fails if the mapping and the migration disagree — a typo'd slug would
otherwise produce a row that silently matches nothing.
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "supabase", "migrations", "0021_catalogue_176.sql")

# product slug -> the ingredient group(s) its papers come from. A product with
# two groups takes them in turn, so a combination product gets both named.
MAP_PART_ONE = {
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

MAP_PART_TWO = {
    # --------------------------------------------------------------- Focus
    "jarrow-formulas-alpha-gpc-300-mg": ["alpha-gpc"],
    "life-extension-citicoline-cdp-choline": ["citicoline"],
    "jarrow-formulas-citicoline-cdp-choline-250-mg": ["citicoline"],
    "thorne-phosphatidylserine": ["phosphatidylserine"],
    "jarrow-formulas-ps100-100-mg": ["phosphatidylserine"],
    "doctors-best-phosphatidyl-serine-with-serinaid-100-mg": ["phosphatidylserine"],
    "now-extra-strength-lecithin": ["lecithin"],
    "life-extension-huperzine-a-200-mcg": ["huperzine-a"],
    "swanson-huperzine-a-200-mcg": ["huperzine-a"],
    "host-defense-lions-mane": ["lions-mane"],
    "host-defense-lions-mane-extract": ["lions-mane"],
    "host-defense-brain-energy": ["lions-mane", "yerba-mate", "eleuthero"],
    "doctors-best-bacopa-320-mg-with-synapsa": ["bacopa"],
    "doctors-best-extra-strength-ginkgo-120-mg": ["ginkgo"],
    "doctors-best-l-tyrosine-500-mg": ["l-tyrosine"],
    "thorne-iodine-and-tyrosine": ["iodine", "l-tyrosine"],
    "bulksupplements-phenylethylamine-hcl-pea": ["phenylethylamine"],
    "doctors-best-lithium-aspartate": ["lithium-low-dose"],
    "life-extension-cognitex-elite": ["phosphatidylserine", "blueberry"],
    "life-extension-dopamine-advantage": ["phellodendron", "vitamin-b12"],
    "bulksupplements-mucuna-pruriens-extract": ["mucuna"],
    "doctors-best-vegan-omega-3-2000-mg": ["algal-omega-3", "omega-3"],
    "life-extension-mega-epa-dha": ["omega-3"],
    "thorne-super-epa-425-mg": ["omega-3"],
    "klean-athlete-klean-omega": ["omega-3"],
    "klean-athlete-klean-focus": ["acetyl-l-carnitine", "alpha-gpc", "alpha-lipoic"],
    "sports-research-magnesium-l-threonate-2000-mg": ["magnesium-threonate", "magnesium-sleep"],
    "doctors-best-fisetin-with-novusetin": ["fisetin"],
    "swanson-fisetin-100-mg": ["fisetin"],
    "supersmart-spermidine-3-mg": ["spermidine"],
    "codeage-liposomal-urolithin-a": ["urolithin-a"],
    "life-extension-senolytic-activator": ["fisetin", "quercetin"],
    # ------------------------------------------------------------- Training
    "klean-athlete-klean-creatine": ["creatine"],
    "life-extension-creatine-capsules": ["creatine"],
    "klean-athlete-klean-essential-aminos-hmb": ["essential-amino-acids", "hmb"],
    "bulksupplements-l-leucine": ["leucine"],
    "klean-athlete-klean-bcaa-peak-atp": ["bcaa", "atp-supplement"],
    "thorne-amino-complex-lemon": ["essential-amino-acids"],
    "klean-athlete-klean-isolate-chocolate": ["whey-protein"],
    "klean-athlete-klean-casein-vanilla-custard": ["casein-protein"],
    "klean-athlete-klean-plant-based-protein-vanilla": ["plant-protein"],
    "bulksupplements-rice-protein": ["rice-protein", "plant-protein"],
    "sports-research-whey-protein-isolate-dutch-chocolate": ["whey-protein"],
    "klean-athlete-klean-glutamine": ["glutamine"],
    "thorne-beta-alanine-sr": ["beta-alanine"],
    "klean-athlete-klean-sr-beta-alanine": ["beta-alanine"],
    "doctors-best-l-citrulline-powder": ["citrulline"],
    "thorne-l-arginine-plus": ["arginine"],
    "doctors-best-pure-l-arginine-powder": ["arginine"],
    "life-extension-l-arginine-caps-700-mg": ["arginine"],
    "life-extension-bio-collagen-with-patented-uc-ii-40-mg": ["uc-ii-collagen", "collagen-joint"],
    "thorne-joint-support-nutrients": ["glucosamine", "msm", "boswellia", "curcumin"],
    "thorne-boswellia-phytosome": ["boswellia"],
    "swanson-boswellia-serrata-extract-125-mg": ["boswellia"],
    "now-boswellia-extract-plus-turmeric-root": ["boswellia", "curcumin"],
    "thorne-curcumin-phytosome-1000-mg": ["curcumin"],
    "sports-research-turmeric-curcumin-c3-complex": ["curcumin"],
    "klean-athlete-klean-endurance": ["d-ribose"],
    "now-tribulus-1000-mg": ["tribulus"],
    "klean-athlete-klean-multivitamin": ["multivitamin"],
    # ------------------------------------------------------- Immunity & gut
    "jarrow-formulas-colostrum-prime-life-400-mg": ["colostrum"],
    "jarrow-formulas-lactoferrin-250-mg": ["lactoferrin"],
    "life-extension-lactoferrin-caps": ["lactoferrin"],
    "jarrow-formulas-beta-glucan-250-mg": ["beta-glucan"],
    "solgar-echinacea-herb-extract": ["echinacea"],
    "life-extension-echinacea-elite": ["echinacea"],
    "life-extension-advanced-olive-leaf-vascular-support": ["olive-leaf"],
    "bulksupplements-olive-leaf-extract": ["olive-leaf"],
    "swanson-oregano-oil-liquid-extract": ["oregano-oil"],
    "host-defense-turkey-tail": ["turkey-tail"],
    "host-defense-maitake-extract": ["maitake"],
    "host-defense-shiitake-extract": ["shiitake"],
    "host-defense-mycommunity": ["turkey-tail", "maitake", "reishi", "chaga"],
    "host-defense-stamets-7-extracts": ["reishi", "maitake", "cordyceps", "chaga"],
    "solgar-flavo-zinc-lozenge": ["zinc"],
    "klean-athlete-klean-zinc": ["zinc"],
    "bulksupplements-bee-propolis-powder": ["propolis"],
    "pure-encapsulations-cats-claw": ["cats-claw"],
    "swanson-chinese-skullcap-400-mg": ["chinese-skullcap"],
    "jarrow-formulas-saccharomyces-boulardii-mos": ["s-boulardii"],
    "swanson-lactobacillus-rhamnosus-with-fos": ["l-rhamnosus", "fos"],
    "jarrow-formulas-jarro-dophilus-eps-25-billion": ["probiotic-multi"],
    "pure-encapsulations-probiotic-50b": ["probiotic-multi"],
    "thorne-florasport-20b": ["probiotic-multi", "bacillus-subtilis"],
    "jarrow-formulas-prebiotic-inulin-fos": ["inulin", "fos"],
    "swanson-inulin": ["inulin"],
    "thorne-gi-relief": ["dgl-licorice", "aloe"],
    "jarrow-formulas-mastic-gum-1000-mg": ["mastic-gum"],
}


# Everything in a migration header that is true of one part and not the other.
# The skeleton is shared so the two files read the same; the examples are not,
# because a header that names a rejection which did not happen in that half is
# exactly the kind of thing this file exists to avoid.
PARTS = {
    "1": {
        "label": "one",
        "sections": ("Skin & hair", "Sleep", "Energy"),
        "map": MAP_PART_ONE,
        "papers": os.path.join(ROOT, "scripts", "papers.json"),
        "json_name": "scripts/papers.json",
        "out": os.path.join(ROOT, "supabase", "migrations", "0022_papers_part_one.sql"),
        "title": "the Skin & hair, Sleep and Energy products",
        "odd_title": "Cosmetic benefits of astaxanthin on humans subjects",
        "verify_cmd": "python scripts/fetch_papers.py --verify",
        "extra": [],
        "shared_example": "the four melatonin products",
        "shared_tail": [
            "-- share one set of melatonin papers rather than each getting its own search for",
            "-- a brand name that returns nothing.",
        ],
        "rejected_tail": [
            "-- with its reason. The two failure modes worth knowing about, because both",
            "-- nearly shipped: a paper about a different compound that contains the",
            "-- ingredient's name (glycine propionyl-L-carnitine is not glycine, Glycine max",
            "-- is a soybean, gabapentin is not GABA, S-adenosylmethionine is not",
            "-- methionine), and a paper about the right compound by the wrong route",
            "-- (rosemary oil rubbed on the scalp is not a capsule).",
        ],
        "thin_tail": [
            "--   The one case is a combination product, so it fills its remaining",
            "--   slots from the other ingredient on its label rather than from",
            "--   padding. What was rejected to get here is in the script's block",
            "--   list: the searches keep returning lab characterisation of casein",
            "--   peptides, and one trial that gave the peptide to foals.",
        ],
    },
    "2": {
        "label": "two",
        "sections": ("Focus", "Training", "Immunity & gut"),
        "map": MAP_PART_TWO,
        "papers": os.path.join(ROOT, "scripts", "papers_part_two.json"),
        "json_name": "scripts/papers_part_two.json",
        "out": os.path.join(ROOT, "supabase", "migrations", "0023_papers_part_two.sql"),
        "title": "the Focus, Training and Immunity & gut products",
        "odd_title": "Is aura around citicoline fading? A systemic review",
        "verify_cmd": "python scripts/fetch_papers.py --part 2 --verify",
        "extra": [
            "--",
            "-- ELEVEN INGREDIENTS ARE NOT SEARCHED AGAIN. Lion's mane, curcumin, reishi,",
            "-- chaga, cordyceps, D-ribose, essential amino acids, acetyl-L-carnitine,",
            "-- alpha-lipoic acid, magnesium and B12 all appear in part one, and those",
            "-- products cite the same records here: the same capsule should not carry one",
            "-- set of papers under Sleep and a different set under Focus.",
        ],
        "shared_example": "the three L-arginine products",
        "shared_tail": [
            "-- share one set of arginine papers rather than each getting its own search for",
            "-- a brand name that returns nothing.",
        ],
        "rejected_tail": [
            "-- with its reason. Part two needed two new filters and thirty-four more",
            "-- entries on that list: these searches kept returning work nobody swallowed.",
            "-- five gerbil and rat studies at the top of the uridine search, four",
            "-- fish-feed trials at the top of the rice protein search, mice for magnesium",
            "-- L-threonate and for fisetin, and a plant-physiology paper about the",
            "-- Phellodendron tree under drought. Animal names are now matched as whole",
            "-- words rather than as substrings. The second filter is the pregnancy and",
            "-- preterm-infant literature — real evidence about the nutrient, and the",
            "-- wrong question for the adult holding the bottle; it was leading the",
            "-- iodine, lactoferrin and multivitamin searches. Children are deliberately",
            "-- still in scope, because the probiotic evidence is paediatric end to end.",
        ],
        "thin_tail": [
            "--   Each of the four is the only product carrying that ingredient, and each",
            "--   has a second ingredient on its label, so the remaining slots come from",
            "--   that rather than from padding: rice protein fills from the plant protein",
            "--   trials, Phellodendron from the B12 beside it in Dopamine Advantage, algal",
            "--   oil from the wider omega-3 literature, and magnesium L-threonate from the",
            "--   magnesium sleep trials part one already collected.",
        ],
    },
}


def catalogue_slugs(sections):
    """The slugs 0021 inserts, per section, in file order."""
    out, section = {}, None
    for line in open(SOURCE, encoding="utf-8"):
        m = re.match(r"^  -- (.+) \(\d+\)$", line)
        if m:
            section = m.group(1)
            continue
        m = re.match(r"^  \('([a-z0-9.-]+)',", line)
        if m and section in sections:
            out.setdefault(section, []).append(m.group(1))
    return out


def q(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    part = "1"
    if "--part" in sys.argv:
        part = sys.argv[sys.argv.index("--part") + 1]
    if part not in PARTS:
        print(f"unknown part {part!r}; expected one of {sorted(PARTS)}", file=sys.stderr)
        return 2
    notes = PARTS[part]
    SECTIONS, MAP = notes["sections"], notes["map"]

    papers = json.load(open(notes["papers"], encoding="utf-8"))
    by_section = catalogue_slugs(SECTIONS)
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

    distinct = len({p["pmid"] for g in groups_used for p in papers[g]})

    out = []
    w = out.append
    w(f"-- Papers, part {notes['label']}: {notes['title']}.")
    w("--")
    w(f"-- {total} `glossary_research` rows across the {len(listed)} products migration 0021")
    w(f"-- inserts for those three sections, drawn from {len(groups_used)} ingredient groups and")
    w(f"-- {distinct} distinct PubMed records.")
    w("--")
    w("-- WHERE THESE CAME FROM. `scripts/fetch_papers.py` queries the PubMed")
    w("-- E-utilities API — `esearch` for PMIDs, `esummary` for title, journal, year")
    w(f"-- and publication type — and writes `{notes['json_name']}`. Every title,")
    w("-- journal and year below is copied from that file verbatim. Nothing here was")
    w("-- written from memory and nothing was adjusted to read better; where a title")
    w(f"-- is odd (`{notes['odd_title']}`) that is what")
    w("-- the record says. Re-run the script to regenerate this file.")
    w("--")
    w(f"-- SEARCHED ON THE INGREDIENT, NOT THE BRAND, as the spec requires: the {len(listed)}")
    w(f"-- products reduce to {len(groups_used)} active ingredients, so {notes['shared_example']}")
    for line in notes["shared_tail"]:
        w(line)
    for line in notes["extra"]:
        w(line)
    w("--")
    w(f"-- VERIFIED. `{notes['verify_cmd']}` re-fetches all")
    w(f"-- {distinct} distinct PMIDs through `esummary` and checks three things: the")
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
    for line in notes["rejected_tail"]:
        w(line)
    w("--")
    thin = sorted((g, len(papers[g])) for g in groups_used if len(papers[g]) < 5)
    if short:
        w("-- PRODUCTS STORING FEWER THAN FIVE, rather than padding to the number:")
        for slug, n in short:
            w(f"--   {slug} — {n}")
        w("--")
    else:
        w(f"-- Every one of the {len(listed)} products carries five papers.")
        w("--")
    if thin:
        w("-- INGREDIENTS WHERE THE LITERATURE ITSELF RAN OUT before five, listed")
        w("-- because the spec asks for it even though no product ends up short:")
        for g, n in thin:
            w(f"--   {g} — {n}")
        for line in notes["thin_tail"]:
            w(line)
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

    with open(notes["out"], "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out))

    print(json.dumps({"products": len(listed), "rows": total, "short": short}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
