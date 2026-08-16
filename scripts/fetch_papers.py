#!/usr/bin/env python3
"""Pull real PubMed records for the active ingredients behind the catalogue.

Part one is Skin & hair, Sleep and Energy, written to scripts/papers.json.
Part two is Focus, Training and Immunity & gut, written to
scripts/papers_part_two.json.

This exists so the citations in `supabase/migrations/0022_papers_part_one.sql`
and `0023_papers_part_two.sql` can be re-derived rather than trusted. Nothing
here invents a title, a PMID or a journal: every field written out came back
from `esummary`, and every PMID is re-checked against the live PubMed page
before it is used.

Three filters, in order, because relevance is harder than volume here:

  1. the search is on the active ingredient, never the brand name;
  2. `must` — the ingredient has to be named in the title, which is what stops a
     collagen trial being filed under silica and a vitamin E trial under
     gamma-tocopherol;
  3. `NEVER` — topical, textile and animal work is dropped, because every
     product in the catalogue is something you swallow.

Part two reuses, rather than re-searches, any ingredient part one already
covered: lion's mane appears in both Sleep and Focus, and the two sections
should cite the same papers for it.

Rate limited to 3 requests a second, the unauthenticated E-utilities cap. No API
key is read or written — see the Secrets section of CLAUDE.md.

    python scripts/fetch_papers.py                      # part one: search + summarise
    python scripts/fetch_papers.py --verify             # re-check every record it stored
    python scripts/fetch_papers.py --part 2             # part two
    python scripts/fetch_papers.py --part 2 --verify
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
HERE = os.path.dirname(__file__)
UA = "pepstack-citation-check/1.0"

# Search on the active ingredient, not the brand name. `must` is checked against
# the title, so a paper that never names the ingredient is never stored.
GROUPS_PART_ONE = {
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

# Part two. Any group named in part one is reused from papers.json rather than
# searched again — `lions-mane`, `curcumin`, `reishi`, `chaga`, `cordyceps`,
# `d-ribose`, `essential-amino-acids`, `acetyl-l-carnitine`, `alpha-lipoic` and
# `magnesium-sleep` all appear in both halves of the catalogue.
GROUPS_PART_TWO = {
    # --------------------------------------------------------------- Focus
    "alpha-gpc": (
        "(alpha-GPC OR choline alfoscerate OR glycerophosphocholine) AND (cognition OR attention OR performance OR supplementation)",
        ["alpha-gpc", "alfoscerate", "glycerophosphocholine", "glycerylphosphorylcholine", "glycerophosphorylcholine"],
    ),
    "citicoline": (
        "(citicoline OR CDP-choline) AND (attention OR memory OR cognition)",
        ["citicoline", "cdp-choline", "cdp choline", "cytidine diphosphate choline", "cytidine-5'-diphosphocholine"],
    ),
    "phosphatidylserine": (
        "phosphatidylserine supplementation AND (memory OR cognition OR cortisol OR exercise)",
        ["phosphatidylserine"],
    ),
    "lecithin": (
        "(lecithin OR phosphatidylcholine) AND (supplementation OR dietary intake) AND humans",
        ["lecithin", "phosphatidylcholine"],
    ),
    "huperzine-a": ("huperzine A AND (memory OR cognition OR Alzheimer)", ["huperzine"]),
    "bacopa": (
        "Bacopa monnieri AND (memory OR cognition)",
        ["bacopa", "brahmi", "bacoside"],
    ),
    "ginkgo": (
        "Ginkgo biloba EGb 761 AND (cognition OR memory OR cerebral blood flow)",
        ["ginkgo"],
    ),
    "l-tyrosine": (
        "tyrosine supplementation AND (cognitive OR stress OR sleep deprivation OR working memory)",
        ["tyrosine"],
    ),
    "iodine": ("iodine supplementation AND (thyroid OR deficiency)", ["iodine", "iodide"]),
    "phenylethylamine": (
        "phenylethylamine AND (mood OR depression OR supplementation OR oral)",
        ["phenylethylamine", "phenethylamine"],
    ),
    "lithium-low-dose": (
        "(low-dose lithium OR microdose lithium OR lithium orotate OR trace lithium) AND (cognition OR mood OR dementia)",
        ["lithium"],
    ),
    "blueberry": (
        "blueberry OR anthocyanin supplementation AND (cognition OR memory OR vascular)",
        ["blueberry", "anthocyanin"],
    ),
    "phellodendron": (
        "(Phellodendron amurense OR Relora OR Magnolia officinalis) AND (stress OR cortisol OR mood OR sleep)",
        ["phellodendron", "relora", "amurense"],
    ),
    "mucuna": (
        "Mucuna pruriens AND (levodopa OR Parkinson OR supplementation)",
        ["mucuna", "velvet bean"],
    ),
    "omega-3": (
        "omega-3 (EPA OR DHA) supplementation AND (cognition OR mood OR triglyceride)",
        ["omega-3", "omega 3", "n-3", "eicosapentaenoic", "docosahexaenoic", "fish oil", "epa", "dha"],
    ),
    "algal-omega-3": (
        "(algal oil OR algae-derived) AND (DHA OR EPA) AND supplementation",
        ["algal", "algae", "microalga", "schizochytrium"],
    ),
    "magnesium-threonate": (
        "magnesium L-threonate AND (cognition OR memory OR sleep)",
        ["threonate", "magtein"],
    ),
    "fisetin": ("fisetin supplementation AND (humans OR trial OR randomized OR senescence)", ["fisetin"]),
    "quercetin": ("quercetin supplementation AND (humans OR trial OR exercise OR inflammation)", ["quercetin"]),
    "spermidine": ("spermidine supplementation AND (autophagy OR cognition OR humans)", ["spermidine"]),
    "urolithin-a": ("urolithin A AND (mitophagy OR muscle OR supplementation)", ["urolithin"]),
    "yerba-mate": (
        "(yerba mate OR Ilex paraguariensis) AND (lipid OR glucose OR weight OR exercise OR physiological OR supplementation)",
        # not a bare "mate" — that matches "maternal" and "material"
        ["yerba mate", "ilex paraguariensis", "mate tea", "mate consumption", "mate intake", "maté"],
    ),
    "eleuthero": (
        "(Eleutherococcus senticosus OR eleuthero OR Siberian ginseng) AND (fatigue OR performance OR supplementation)",
        ["eleutherococcus", "eleuthero", "siberian ginseng", "acanthopanax"],
    ),
    # ------------------------------------------------------------- Training
    "creatine": (
        "creatine monohydrate supplementation AND (strength OR power OR lean mass OR performance)",
        ["creatine"],
    ),
    "hmb": (
        "beta-hydroxy-beta-methylbutyrate HMB supplementation AND (muscle OR strength)",
        ["hmb", "methylbutyrate", "hydroxymethylbutyrate"],
    ),
    "leucine": (
        "leucine supplementation AND (muscle protein synthesis OR lean mass OR older adults)",
        ["leucine"],
    ),
    "bcaa": (
        "branched-chain amino acid supplementation AND (exercise OR muscle OR soreness)",
        ["branched-chain", "branched chain", "bcaa"],
    ),
    "atp-supplement": (
        "oral adenosine triphosphate supplementation AND (exercise OR strength OR blood flow)",
        # not a bare "atp" — that matches ATPase, and MSM below is worse still
        ["adenosine triphosphate", "adenosine-5'-triphosphate", "atp supplement", "oral atp", "peak atp"],
    ),
    "whey-protein": (
        "whey protein supplementation AND (resistance training OR muscle OR strength)",
        ["whey"],
    ),
    "casein-protein": (
        "casein protein supplementation AND (muscle protein synthesis OR overnight OR resistance)",
        ["casein"],
    ),
    "plant-protein": (
        "(plant protein OR soy protein OR pea protein) supplementation AND (resistance training OR muscle)",
        ["plant protein", "plant-based protein", "soy protein", "pea protein", "vegetable protein", "vegan protein"],
    ),
    "rice-protein": (
        "rice protein supplementation AND (muscle OR resistance OR body composition)",
        ["rice protein"],
    ),
    "glutamine": (
        "glutamine supplementation AND (exercise OR immune OR intestinal permeability)",
        ["glutamine"],
    ),
    "beta-alanine": (
        "beta-alanine supplementation AND (carnosine OR performance OR exercise)",
        ["beta-alanine", "β-alanine", "beta alanine", "carnosine"],
    ),
    "citrulline": (
        "citrulline OR citrulline malate supplementation AND (exercise OR performance OR blood flow)",
        ["citrulline"],
    ),
    "arginine": (
        "L-arginine supplementation AND (exercise OR performance OR blood pressure OR endothelial OR nitric oxide)",
        ["arginine"],
    ),
    "uc-ii-collagen": (
        "undenatured type II collagen AND (joint OR knee OR osteoarthritis)",
        ["type ii collagen", "type-ii collagen", "uc-ii", "undenatured collagen"],
    ),
    "collagen-joint": (
        "collagen peptides AND (joint OR tendon OR osteoarthritis OR knee pain)",
        ["collagen"],
    ),
    "glucosamine": (
        "glucosamine AND chondroitin AND (osteoarthritis OR joint pain)",
        ["glucosamine"],
    ),
    "msm": (
        "methylsulfonylmethane MSM supplementation AND (joint OR exercise OR inflammation)",
        ["methylsulfonylmethane", "msm"],
    ),
    "boswellia": (
        "Boswellia serrata extract AND (osteoarthritis OR joint OR inflammation)",
        ["boswellia", "boswellic", "frankincense"],
    ),
    "tribulus": (
        "Tribulus terrestris supplementation AND (testosterone OR performance OR libido)",
        ["tribulus"],
    ),
    "multivitamin": (
        "multivitamin supplementation AND (adults OR cognition OR mortality OR micronutrient status)",
        ["multivitamin", "multi-vitamin", "multinutrient", "multimicronutrient"],
    ),
    # ------------------------------------------------------- Immunity & gut
    "colostrum": (
        "bovine colostrum supplementation AND (immune OR infection OR gut OR exercise)",
        ["colostrum"],
    ),
    "lactoferrin": (
        "lactoferrin supplementation AND (adults OR immune OR iron deficiency OR respiratory infection)",
        ["lactoferrin"],
    ),
    "beta-glucan": (
        "beta-glucan supplementation AND (immune OR upper respiratory OR infection)",
        ["glucan"],
    ),
    "echinacea": (
        "Echinacea AND (common cold OR upper respiratory OR immune)",
        ["echinacea"],
    ),
    "olive-leaf": (
        "olive leaf extract OR oleuropein supplementation AND humans",
        ["olive leaf", "oleuropein"],
    ),
    "oregano-oil": (
        "(oregano oil OR Origanum vulgare OR carvacrol) AND (clinical trial OR patients OR gastrointestinal OR volunteers)",
        ["oregano", "carvacrol", "origanum"],
    ),
    "turkey-tail": (
        "(Trametes versicolor OR Coriolus versicolor OR polysaccharide-K) AND (immune OR trial)",
        ["trametes", "coriolus", "turkey tail", "versicolor", "polysaccharide-k", "polysaccharide k"],
    ),
    "maitake": (
        "Grifola frondosa OR maitake AND (patients OR trial OR immune OR supplementation)",
        ["grifola", "maitake"],
    ),
    "shiitake": (
        "(Lentinula edodes OR shiitake OR lentinan) AND (immune OR supplementation)",
        ["lentinula", "lentinan", "shiitake", "edodes"],
    ),
    "zinc": (
        "zinc supplementation AND (common cold OR immune OR respiratory infection)",
        ["zinc"],
    ),
    "propolis": ("propolis supplementation AND humans", ["propolis"]),
    "cats-claw": (
        "Uncaria tomentosa AND (immune OR arthritis OR supplementation)",
        ["uncaria", "cat's claw", "cats claw", "tomentosa"],
    ),
    "chinese-skullcap": (
        "(Scutellaria baicalensis OR baicalin) AND (randomized OR patients OR clinical trial OR volunteers)",
        ["scutellaria", "baicalin", "baicalein", "skullcap"],
    ),
    "s-boulardii": (
        "Saccharomyces boulardii AND (diarrhoea OR diarrhea OR gut)",
        ["boulardii"],
    ),
    "l-rhamnosus": (
        "Lactobacillus rhamnosus GG AND (gut OR diarrhoea OR diarrhea OR immune)",
        ["rhamnosus"],
    ),
    "probiotic-multi": (
        "multispecies probiotic supplementation AND (gut OR microbiota OR bowel)",
        ["probiotic"],
    ),
    "bacillus-subtilis": (
        "Bacillus subtilis probiotic supplementation AND humans",
        ["bacillus"],
    ),
    "inulin": ("inulin supplementation AND (microbiota OR bowel OR gut)", ["inulin"]),
    "fos": (
        "(fructooligosaccharide OR fructo-oligosaccharide) supplementation AND (gut OR microbiota OR bowel)",
        ["fructooligosaccharide", "fructo-oligosaccharide", "oligofructose"],
    ),
    "dgl-licorice": (
        "(deglycyrrhizinated licorice OR Glycyrrhiza glabra) AND (dyspepsia OR gastric OR ulcer OR gut)",
        ["licorice", "liquorice", "glycyrrhiz"],
    ),
    "aloe": (
        # "aloe vera oral supplementation AND (...)" returned nothing at all;
        # the useful trials are indexed under the condition, not the route
        "aloe vera AND (ulcerative colitis OR irritable bowel OR constipation OR dyspepsia OR gastrointestinal)",
        ["aloe"],
    ),
    "mastic-gum": (
        "mastic gum OR Pistacia lentiscus AND (Helicobacter OR dyspepsia OR gastric)",
        ["mastic", "pistacia", "lentiscus"],
    ),
}

# Ingredients part one already searched. Part two's map points at these by name
# and the records come out of papers.json unchanged — the same lion's mane
# capsule should not cite one set of papers under Sleep and another under Focus.
REUSED_FROM_PART_ONE = (
    "vitamin-b12",
    "lions-mane",
    "curcumin",
    "reishi",
    "chaga",
    "cordyceps",
    "d-ribose",
    "essential-amino-acids",
    "acetyl-l-carnitine",
    "alpha-lipoic",
    "magnesium-sleep",
)

PARTS = {
    "1": (GROUPS_PART_ONE, os.path.join(HERE, "papers.json"), (), ()),
    "2": (
        GROUPS_PART_TWO,
        os.path.join(HERE, "papers_part_two.json"),
        (os.path.join(HERE, "papers.json"),),
        REUSED_FROM_PART_ONE,
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
    "toothpaste", "denture", "varnish", "suppositor", "transdermal", "gargl",
    # not human
    "in vitro", "in rats", "in mice", "murine", "rodent", "zebrafish",
    "animal model", "animal studies", "in vivo and in vitro",
    # a different molecule that shares a prefix
    "gabapentin", "pregabalin", "adenosylmethionine", "adenosyl methionine",
    "adenosyl-l-methionine", "hyaluronidase", "filler", "glycine max",
    # not a paper about the ingredient
    "retracted", "interference", "assay", "point-of-care", "depletion",
    # not people: added in part two, where the searches turned up feed trials,
    # bread additives and cell work that the list above let through
    "preclinical", "pre-clinical", "network pharmacology", "molecular docking", "in silico",
    "cell line", "cultured", "antifungal activity", "antimicrobial activity",
    "fishmeal", "aquaculture", "high-fat diet fed", "cdna library",
    # not the person holding the bottle. Every product in the catalogue is a
    # general adult supplement, so iodine in pregnancy, lactoferrin in preterm
    # infants and prenatal multivitamins are the same kind of mismatch part one
    # rejected one paper at a time ("evening primrose oil to induce labour").
    # Note that plain "children" is deliberately absent: the probiotic evidence
    # is paediatric almost end to end, and that is the evidence, not a mismatch.
    "pregnan", "maternal", "prenatal", "postpartum", "preconception", "in utero",
    "gestational", "neonat", "preterm", "infants", "lactating", "breast milk",
    "human milk", "withdrawn",
)

# Checked as whole words, so "rat" does not fire on "strategy" and "mice" does
# not fire on "mice"-in-a-longer-word. Every one of these was a paper that
# ranked top-five for an ingredient in part two: uridine returned five gerbil
# and rat studies, maitake returned mice and bread.
NEVER_WORDS = (
    "rat", "rats", "mouse", "mice", "gerbil", "gerbils", "hamster", "hamsters",
    "rabbit", "rabbits", "piglet", "piglets", "pigs", "calves", "broiler",
    "broilers", "chicks", "canine", "feline", "dogs", "weanling", "weanlings",
    "sprague-dawley", "wistar", "c57bl",
    # not "cats" — that would take cat's claw with it
)

# Some journals are disqualifying on their own, because a title like
# "Electrolytes: clinical applications" reads as human until you notice it ran
# in a horse journal. Checked against the `source` field, not the title.
NEVER_JOURNAL = (
    "vet ", "veterinar", "equine", "poult", "avian", "swine", "zoo",
    # added in part two: rice protein returned four fish-feed trials
    "anim ", "aquacult", "fish shellfish", "livest", "dairy sci",
    # preprints are not records of anything yet
    "biorxiv", "medrxiv", "research square",
)

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
    # ---- part two ----
    # right name, wrong compound
    "32022784": "novel psychoactive phenethylamines and their drug interactions, a different class",
    "38048815": "carbon isotope ratios of phenethylamine, a forensic method paper",
    "5755919": "a 1968 method for detecting the amine in urine, no one was given any",
    "38253184": "a comparison of anti-amyloid antibodies that happened to include lithium",
    "41052623": "Origanum majorana tea - marjoram, a different species and preparation from oregano oil",
    # right compound, wrong animal or wrong dish
    "42144546": "fisetin given to mice, with cell work alongside",
    "38787870": "rice protein concentrate in a fish-feed trial on rohu",
    "28234326": "an amino acid composition analysis of rice protein powder, no one took anything",
    "38794173": "Phellodendron amurense evaluated as an anti-caries material",
    "30466574": "a plant-physiology paper about the Phellodendron tree under drought",
    "18464600": "a cDNA library built from the Phellodendron tree, not a trial",
    # about the ingredient's biology, not about supplementing it
    "34836005": "a systematic review of three flavonols in cancer, not a trial of fisetin",
    "32249518": "a carvacrol review whose included studies are mostly rodent - 12 of 17",
    "37715823": "a systematic review of baicalin's biological mechanisms, not a trial",
    "33265983": "2-phenylethylamine in a corticosterone-induced depression model in mice",
    "39760431": "algal and sea buckthorn oil fed to mice on a high-fat diet",
    "33900083": "algal oil at mg/kg against antibiotic gut injury, colon tissue sampled - no people",
    "27178134": "L-threonate in young and aging rats and in Alzheimer's model mice",
    "38488562": "magnesium-L-threonate in an Alzheimer's mouse model",
    "42021544": "fisetin given to mice, with cell work alongside",
    "34455218": "Origanum majorana tea - marjoram again, not oregano oil",
    "12747455": "mastic chewing gum for dental plaque, chewed rather than swallowed",
    "41177239": "a licorice review for rheumatoid arthritis - mechanism, not the gut",
    "28618234": "a topical aloe ointment for radiation proctitis, not swallowed",
    "32404169": "a topical aloe ointment for radiation proctitis, not swallowed",
    "34502393": "beta-phenylethylamine given to rodents and mice, measured in the striatum",
    "31074472": "fisetin at mg/kg in C57BL/6 mice on a high-fat diet",
    "24077207": "magnesium L-threonate in adult male rats with a nerve injury",
    "41985648": "magnesium L-threonate in a rat model of cystitis",
    "32980739": "omega-3 measured in egg yolk from hens fed algal biomass",
    "40876296": "fisetin added to a freeze-thaw protocol for cells in the lab",
    "40437670": "intermittent fisetin given to old mice for grip strength",
    "33391246": "algal oil against DSS-induced colitis, an animal model",
    "23474371": "magnesium L-threonate and a conditioned taste aversion in rats",
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
            if any(re.search(r"\b" + re.escape(n) + r"\b", low) for n in NEVER_WORDS):
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
    part = "1"
    if "--part" in sys.argv:
        part = sys.argv[sys.argv.index("--part") + 1]
    if part not in PARTS:
        print(f"unknown part {part!r}; expected one of {sorted(PARTS)}", file=sys.stderr)
        return 2
    groups, out_path, inherit, reused = PARTS[part]

    if "--verify" in sys.argv:
        with open(out_path, encoding="utf-8") as f:
            return verify(json.load(f))

    earlier = {}
    for path in inherit:
        with open(path, encoding="utf-8") as f:
            earlier.update(json.load(f))
    missing = [g for g in reused if g not in earlier]
    if missing:
        print(f"reused groups absent from the earlier part: {missing}", file=sys.stderr)
        return 2

    out = {g: earlier[g] for g in reused}
    for group, (term, must) in groups.items():
        out[group] = pick(term, must)
        print(f"{group:22} {len(out[group])}", file=sys.stderr)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    short = {g: len(p) for g, p in out.items() if len(p) < 5}
    print(json.dumps({"groups": len(out), "reused": list(reused), "short": short}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
