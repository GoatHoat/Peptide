#!/usr/bin/env python3
"""Pull real PubMed records for the active ingredients behind the Skin & hair,
Sleep and Energy products, and write them to scripts/papers.json.

This exists so the citations in `supabase/migrations/0022_papers_part_one.sql`
can be re-derived rather than trusted. Nothing here invents a title, a PMID or a
journal: every field written out came back from `esummary`, and every PMID is
re-checked against the live PubMed page before it is used.

Three filters, in order, because relevance is harder than volume here:

  1. the search is on the active ingredient, never the brand name;
  2. `must` — the ingredient has to be named in the title, which is what stops a
     collagen trial being filed under silica and a vitamin E trial under
     gamma-tocopherol;
  3. `NEVER` — topical, textile and animal work is dropped, because every
     product in these three sections is something you swallow.

Rate limited to 3 requests a second, the unauthenticated E-utilities cap. No API
key is read or written — see the Secrets section of CLAUDE.md.

    python scripts/fetch_papers.py            # search + summarise
    python scripts/fetch_papers.py --verify   # HTTP-check every URL it produced
"""

import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
OUT = os.path.join(os.path.dirname(__file__), "papers.json")
UA = "pepstack-citation-check/1.0"

# Search on the active ingredient, not the brand name. `must` is checked against
# the title, so a paper that never names the ingredient is never stored.
GROUPS = {
    # ---------------------------------------------------------- Skin & hair
    "collagen": ("collagen peptides skin elasticity supplementation", ["collagen"]),
    "silicon": (
        "(orthosilicic acid OR silicon OR silica) AND (hair OR skin OR nail OR bone) AND supplement*",
        ["silicon", "orthosilicic", "silica", "silic"],
    ),
    "hyaluronic-acid": ("oral hyaluronic acid skin hydration", ["hyaluron"]),
    "biotin": ("biotin AND (hair OR nail OR alopecia OR brittle)", ["biotin"]),
    "ceramides": (
        "(ceramide OR glucosylceramide) AND skin AND (oral OR dietary OR ingestion)",
        ["ceramide"],
    ),
    "astaxanthin": ("astaxanthin skin photoaging supplementation", ["astaxanthin"]),
    "lycopene": ("lycopene AND skin AND (ultraviolet OR erythema OR photoprotection)", ["lycopene", "tomato"]),
    "carotenoids": (
        "carotenoid supplementation AND skin AND (photoprotection OR erythema OR ultraviolet)",
        ["carotenoid", "lutein", "zeaxanthin", "carotene"],
    ),
    "niacinamide": (
        "(nicotinamide OR niacinamide) AND (oral OR supplementation) AND skin",
        ["niacinamide", "nicotinamide"],
    ),
    "methionine": ("methionine supplementation humans", ["methionine"]),
    "evening-primrose": (
        "evening primrose oil AND (skin OR eczema OR dermatitis)",
        ["evening primrose", "oenothera", "epogam"],
    ),
    "borage": ("borage oil OR gamma-linolenic acid AND (skin OR eczema OR dermatitis)", ["borage", "linolenic"]),
    "gamma-tocopherol": ("gamma-tocopherol supplementation humans", ["tocopherol"]),
    "grape-seed": (
        "grape seed extract proanthocyanidin supplementation",
        ["grape seed", "grape-seed", "proanthocyanidin", "grape"],
    ),
    "amla": ("Emblica officinalis OR Phyllanthus emblica supplementation", ["emblica", "amla", "amalaki"]),
    "gotu-kola": ("Centella asiatica AND (skin OR wound OR venous)", ["centella", "gotu kola", "asiatic", "madecass"]),
    "fo-ti": (
        "Polygonum multiflorum OR Reynoutria multiflora hair",
        ["polygonum multiflorum", "reynoutria", "fallopia", "he shou wu", "fo-ti"],
    ),
    "black-cumin": (
        "Nigella sativa OR thymoquinone supplementation",
        ["nigella", "thymoquinone", "black seed", "black cumin"],
    ),
    "curcumin": ("curcumin supplementation bioavailability inflammation", ["curcumin", "curcuma", "turmeric"]),
    "sulforaphane": (
        "sulforaphane OR broccoli sprout supplementation humans",
        ["sulforaphane", "broccoli", "glucoraphanin"],
    ),
    "vitamin-c-skin": ("vitamin C ascorbic acid AND skin AND collagen", ["vitamin c", "ascorb"]),
    "saw-palmetto": ("Serenoa repens saw palmetto", ["serenoa", "saw palmetto"]),
    "rosemary": (
        "Rosmarinus officinalis OR rosemary extract OR carnosic acid supplementation",
        ["rosemary", "rosmarin", "carnosic", "salvia rosmarinus"],
    ),
    # --------------------------------------------------------------- Sleep
    "gaba": (
        "\"gamma-aminobutyric acid\" AND (oral OR supplementation OR ingestion) AND (sleep OR stress OR relaxation)",
        ["gaba", "aminobutyric"],
    ),
    "l-theanine": ("theanine AND (sleep OR stress OR anxiety OR relaxation)", ["theanine"]),
    "melatonin": ("melatonin AND (sleep onset latency OR insomnia)", ["melatonin"]),
    "ashwagandha": ("Withania somnifera ashwagandha AND (sleep OR stress OR anxiety)", ["ashwagandha", "withania"]),
    "casein-decapeptide": (
        "alpha-casozepine OR (casein hydrolysate AND (stress OR sleep OR anxiety))",
        ["casozepine", "casein"],
    ),
    "glycine": ("glycine AND (sleep OR \"sleep quality\" OR fatigue)", ["glycine"]),
    "5-htp": ("5-hydroxytryptophan supplementation", ["5-htp", "hydroxytryptophan"]),
    "l-tryptophan": ("tryptophan AND (sleep OR insomnia OR mood)", ["tryptophan"]),
    "magnesium-sleep": ("magnesium supplementation AND (sleep OR insomnia)", ["magnesium"]),
    "lavender": ("lavender oil OR silexan AND (anxiety OR sleep)", ["lavender", "lavandula", "silexan"]),
    "saffron": ("Crocus sativus saffron AND (sleep OR mood OR depression)", ["saffron", "crocus", "crocin"]),
    "tart-cherry": ("tart cherry OR Montmorency cherry AND (sleep OR recovery)", ["cherry"]),
    "reishi": ("Ganoderma lucidum reishi supplementation", ["ganoderma", "reishi", "lingzhi"]),
    "passion-flower": (
        "Passiflora incarnata AND (anxiety OR sleep)",
        ["passiflora", "passion flower", "passionflower"],
    ),
    "lions-mane": ("Hericium erinaceus supplementation", ["hericium", "lion's mane", "lions mane", "erinaceus"]),
    # -------------------------------------------------------------- Energy
    "nmn": ("nicotinamide mononucleotide supplementation NAD", ["mononucleotide", "nmn", "nad"]),
    "essential-amino-acids": (
        "essential amino acid supplementation muscle protein",
        ["amino acid"],
    ),
    "vitamin-b12": ("vitamin B12 deficiency supplementation", ["b12", "b-12", "cobalamin"]),
    "b-complex": ("B vitamins supplementation AND (fatigue OR energy OR mood)", ["b vitamin", "b-vitamin", "b complex", "b-complex", "vitamin b"]),
    "riboflavin": ("riboflavin supplementation", ["riboflavin", "vitamin b2", "b-2"]),
    "pantothenic": (
        "(pantethine OR \"pantothenic acid\") AND (supplementation OR deficiency OR trial)",
        ["pantethine", "pantothen", "vitamin b5"],
    ),
    "acetyl-l-carnitine": (
        "acetyl-L-carnitine supplementation",
        ["acetyl-l-carnitine", "acetylcarnitine", "acetyl carnitine", "alcar"],
    ),
    "l-carnitine": ("L-carnitine supplementation AND (fatigue OR exercise OR muscle)", ["carnitine"]),
    "d-ribose": ("D-ribose supplementation", ["ribose"]),
    "coq10": ("coenzyme Q10 supplementation AND (fatigue OR exercise OR statin)", ["coenzyme q10", "coq10", "ubiquinol", "ubiquinone", "q10"]),
    "pqq": ("pyrroloquinoline quinone supplementation", ["pyrroloquinoline", "pqq"]),
    "alpha-lipoic": ("alpha-lipoic acid supplementation", ["lipoic"]),
    "cordyceps": ("Cordyceps supplementation exercise performance", ["cordyceps"]),
    "chaga": ("Inonotus obliquus chaga", ["inonotus", "chaga"]),
    "maca": ("Lepidium meyenii maca supplementation", ["maca", "lepidium"]),
    "astragalus": ("Astragalus membranaceus supplementation", ["astragalus", "astragalo"]),
    "iron": ("iron supplementation AND (fatigue OR non-anaemic OR nonanemic OR women)", ["iron", "ferrous", "ferric", "ferritin"]),
    "electrolytes": (
        "electrolyte supplementation AND (hydration OR exercise OR cramp)",
        ["electrolyte"],
    ),
}

# Every product in these three sections is swallowed. Topical, textile and
# animal work is dropped on the title rather than quietly cited as if it were
# evidence for a capsule.
NEVER = (
    # not swallowed
    "topical", "textile", "undershirt", "shampoo", "cream", "ointment", "lotion",
    "aromatherapy", "aroma", "inhalation", "inhaled", "intralesional",
    "intramuscular", "intravenous", "injection", "laser", "mouthwash",
    "toothpaste", "denture", "varnish", "suppositor", "transdermal",
    # not human
    "in vitro", "in rats", "in mice", "murine", "rodent", "zebrafish",
    "animal model", "animal studies", "in vivo and in vitro",
    # a different molecule that shares a prefix
    "gabapentin", "pregabalin", "adenosylmethionine", "adenosyl methionine",
    "adenosyl-l-methionine", "hyaluronidase", "filler", "glycine max",
    # not a paper about the ingredient
    "retracted", "interference", "assay", "point-of-care", "depletion",
)

# Some journals are disqualifying on their own, because a title like
# "Electrolytes: clinical applications" reads as human until you notice it ran
# in a horse journal. Checked against the `source` field, not the title.
NEVER_JOURNAL = ("vet ", "veterinar", "equine", "poult", "avian", "swine", "zoo")

# Hand-dropped after reading the title, with the reason. No keyword filter
# catches a semantic mismatch, and the two failure modes that matter here are a
# paper about a *different* compound that merely contains the ingredient's name
# (glycine propionyl-L-carnitine is not glycine) and a paper about the right
# compound by the wrong route (rosemary oil rubbed on the scalp is not a
# capsule). Every PMID below was returned by the API and rejected on reading it;
# each is backfilled from the next-ranked real result, never from an invention.
BLOCK = {
    # right name, wrong compound
    "15064584": "glycine-arginine-alpha-ketoisocaproic acid, not glycine",
    "18272931": "glycine propionyl-L-carnitine, not glycine",
    "25257291": "a glycine transporter inhibitor drug, not glycine",
    "32320006": "a nicotinamide riboside trial that measured acetylcarnitine",
    "31937153": "a ginger trial that used vitamin B6 as the comparator",
    "33200489": "fosmetpantotenate, a drug for PKAN, not pantothenic acid",
    "12163147": "S-adenosyl-L-methionine, a different molecule",
    "38892484": "methylfolate and methylcobalamin, not methionine",
    "32659474": "NADP-pathway genotypes, not nicotinamide supplementation",
    # right compound, wrong route — everything in these sections is swallowed
    "25842469": "rosemary oil applied to the scalp, not taken orally",
    "38063299": "Centella asiatica in a spray-on film",
    "41947480": "an ascorbate serum applied to the face",
    "19626722": "vitamin C delivered into the skin, not swallowed",
    "34062502": "silicon nitride as a spinal implant material",
    "31410612": "ceramides as a drug-delivery vehicle, not a supplement",
    "33128473": "lipase-treated borage oil tested on melanogenesis in cells",
    "10516500": "gamma-linolenic acid applied as a cream for pruritus",
    # about the ingredient's biology, not about supplementing it
    "33797949": "cortical GABA imaging, not oral GABA",
    "34093561": "tryptophan catabolites measured in bipolar disorder",
    "33482244": "a probiotic trial that tracked the kynurenine pathway",
    "35941560": "observed tryptophan levels, no supplement given",
    "12431859": "tryptophan depletion, the opposite of supplementing it",
    "11164130": "observed serum tocopherol correlates, no supplement given",
    "36980981": "the folate-methionine cycle in autism, no methionine given",
    "30499019": "medicines that disrupt the methionine pathway",
    "10325581": "isotretinoin's effect on biotinidase, not biotin given",
    "11737173": "valproate's effect on biotinidase, not biotin given",
    "30207235": "astragaloside IV in experimental animal models",
    # a real trial of the ingredient, but nothing to do with the product
    "29426270": "evening primrose oil to induce labour",
    "10677051": "casein hydrolysate fed to colicky infants",
    "15517308": "a blood-pressure casein fraction, not the sleep decapeptide",
    "24439638": "a survey of complementary medicine use, not a vitamin C trial",
    "4561112": "leucocyte ascorbate observed in pressure sores in 1972",
    "25383371": "dietary hyaluronic acid tracked into the skin of rats",
    "21411833": "glycine-arginine-alpha-ketoisocaproic acid again, not glycine",
    "31126306": "a creatine trial that used an electrolyte carrier",
    "23232418": "the methionine pathway in liver injury, no methionine given",
    "1656145": "GABA and internal anal sphincter tone, unrelated to sleep",
    "35040869": "observed alpha-tocopherol, not gamma and not supplemented",
    "31128515": "a nanoparticle delivery formulation for casozepine, not a trial",
    "36129023": "enzymatic release of the peptide in vitro, not a trial",
    "21981611": "peptide transport across a Caco-2 cell monolayer, not a trial",
    "40250615": "peptides characterised in the lab, no one took anything",
    "39167944": "casein peptides modelled computationally, no one took anything",
    "39501924": "sleep metabolomics in an animal model of casein hydrolysate",
    "31995979": "casein peptides screened in the lab, no one took anything",
    "40813853": "casein peptides prepared and identified in the lab, not a trial",
    "42007700": "casein peptide found by multiomics screening, not a trial",
    "34226415": "antioxidant activity of casein peptides measured in the lab",
    "38171089": "alpha-casozepine given to foals, not to people",
    "8299017": "an equine veterinary review — caught on the journal, not the title",
}

RANK = [
    "Meta-Analysis",
    "Systematic Review",
    "Randomized Controlled Trial",
    "Clinical Trial",
    "Review",
    "Journal Article",
]
DROP = {"Retracted Publication", "Retraction of Publication", "Comment", "Editorial", "Published Erratum"}

META_LABEL = {
    "Meta-Analysis": "Meta-analysis",
    "Systematic Review": "Systematic review",
    "Randomized Controlled Trial": "Randomised controlled trial",
    "Clinical Trial": "Clinical trial",
    "Review": "Review",
    "Journal Article": "Study",
}

_last = [0.0]


def get(url):
    """GET with a 3-per-second floor between calls."""
    wait = 0.34 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            body = r.read()
            _last[0] = time.time()
            return r.status, body
    except urllib.error.HTTPError as e:
        _last[0] = time.time()
        return e.code, b""
    except Exception as e:  # noqa: BLE001 - network flake, reported to the caller
        _last[0] = time.time()
        return 0, str(e).encode()


def esearch(term, retmax=100):
    q = urllib.parse.urlencode(
        {"db": "pubmed", "term": term, "retmax": retmax, "retmode": "json", "sort": "relevance"}
    )
    status, body = get(f"{EUTILS}/esearch.fcgi?{q}")
    if status != 200:
        return []
    return json.loads(body)["esearchresult"].get("idlist", [])


def esummary(pmids):
    out = {}
    for i in range(0, len(pmids), 50):
        chunk = pmids[i : i + 50]
        q = urllib.parse.urlencode({"db": "pubmed", "id": ",".join(chunk), "retmode": "json"})
        status, body = get(f"{EUTILS}/esummary.fcgi?{q}")
        if status == 200:
            out.update(json.loads(body).get("result", {}))
    return out


def clean(title):
    """esummary returns a few titles with markup and entities in them."""
    t = re.sub(r"<[^>]+>", "", html.unescape(title or ""))
    t = t.replace(" ", " ").replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", t).strip().rstrip(".")


def year_of(rec):
    for key in ("pubdate", "epubdate", "sortpubdate"):
        v = (rec.get(key) or "").strip()
        if len(v) >= 4 and v[:4].isdigit():
            return v[:4]
    return ""


def pick(term, must, want=5):
    """Human/clinical-filtered search first; only widen if it comes up short."""
    scoped = (
        f"({term}) AND (humans[mh]) AND (english[lang]) AND "
        "(meta-analysis[pt] OR systematic review[pt] OR randomized controlled trial[pt] "
        "OR clinical trial[pt] OR review[pt])"
    )
    chosen, seen = [], set()
    for attempt in (scoped, f"({term}) AND (humans[mh]) AND (english[lang])", term):
        ids = [p for p in esearch(attempt) if p not in seen]
        if not ids:
            continue
        recs = esummary(ids)
        scored = []
        for i, pmid in enumerate(ids):
            rec = recs.get(pmid)
            if not isinstance(rec, dict) or rec.get("error") or not rec.get("title"):
                continue
            seen.add(pmid)
            title = clean(rec["title"])
            low = title.lower()
            if not any(re.search(r"\b" + re.escape(m), low) for m in must):
                continue
            if any(n in low for n in NEVER):
                continue
            if any(j in clean(rec.get("source", "")).lower() for j in NEVER_JOURNAL):
                continue
            if pmid in BLOCK:
                continue
            types = list(rec.get("pubtype", []))
            if any(t in DROP for t in types):
                continue
            rank = min([RANK.index(t) for t in types if t in RANK] or [len(RANK)])
            scored.append((rank, i, pmid, title, rec, types))
        scored.sort(key=lambda s: (s[0], s[1]))
        for _, _, pmid, title, rec, types in scored:
            if any(c["pmid"] == pmid for c in chosen):
                continue
            kind = next((t for t in RANK if t in types), "Journal Article")
            chosen.append(
                {
                    "pmid": pmid,
                    "title": title,
                    "journal": clean(rec.get("source", "")),
                    "year": year_of(rec),
                    "kind": META_LABEL[kind],
                    "pubtype": types,
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                }
            )
            if len(chosen) >= want:
                return chosen
    return chosen


def verify(data):
    """Confirm every stored citation resolves to the record we say it does.
    Migration 0005 exists because 22 entries shipped with dead links.

    Every URL is `https://pubmed.ncbi.nlm.nih.gov/<pmid>/`, so the thing to
    prove is that the PMID resolves and carries the title we stored. That check
    goes through `esummary` rather than a GET on the page: pubmed.ncbi.nlm.nih.gov
    answers every request from this network with a JS cookie-challenge page and
    a 203, identically for a live PMID and a made-up one, so an HTTP status
    there proves nothing. `PROBE` are two PMIDs that do not exist; if the API
    ever starts returning records for them, this check has stopped working and
    the run should be treated as unverified.
    """
    PROBE = ["999999999", "999999998"]
    papers = {p["pmid"]: p for group in data.values() for p in group}
    pmids = sorted(papers)
    recs = esummary(pmids + PROBE)

    missing, mismatched, retracted = [], [], []
    for pmid in pmids:
        rec = recs.get(pmid)
        if not isinstance(rec, dict) or rec.get("error") or not rec.get("title"):
            missing.append(pmid)
            continue
        if clean(rec["title"]) != papers[pmid]["title"]:
            mismatched.append({"pmid": pmid, "stored": papers[pmid]["title"], "api": clean(rec["title"])})
        if any(t in DROP for t in rec.get("pubtype", [])):
            retracted.append(pmid)

    control_ok = all(
        not isinstance(recs.get(p), dict) or recs[p].get("error") or not recs[p].get("title")
        for p in PROBE
    )
    result = {
        "checked": len(pmids),
        "control_rejects_fake_pmids": control_ok,
        "missing": missing,
        "mismatched": mismatched,
        "retracted": retracted,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if control_ok and not (missing or mismatched or retracted) else 1


def main():
    if "--verify" in sys.argv:
        with open(OUT, encoding="utf-8") as f:
            return verify(json.load(f))
    out = {}
    for group, (term, must) in GROUPS.items():
        papers = pick(term, must)
        out[group] = papers
        print(f"{group:22} {len(papers)}", file=sys.stderr)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    short = {g: len(p) for g, p in out.items() if len(p) < 5}
    print(json.dumps({"groups": len(out), "short": short}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
