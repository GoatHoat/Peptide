"""Canonical ingredient keys, and the printed names that map onto them.

Built from the 397 distinct raw strings that actually appear on the 250 labels
in the catalogue, not from a generic nutrition list. Anything here was seen on a
real panel; anything not seen is absent on purpose.

THE RULE FOR ADDING A KEY: it must be something a conflict rule, a reference
intake or a search would use. "Calories" is on the panel and is none of those.

THE RULE FOR A SYNONYM: it must be the same substance, not a related one.
Cholecalciferol is vitamin D. Beta-carotene is a vitamin A precursor and is
mapped to vitamin-a, which is a judgement call recorded here rather than hidden:
the two are not interchangeable milligram for milligram, so any upper-limit
arithmetic must treat a carotene source separately. Ergothioneine is not
glutathione. Where two names might be the same thing and might not, the string
is left unmapped and reported.
"""

from __future__ import annotations

import re

# Nutrition-facts rows. Real panel entries, never ingredients — a conflict rule
# for "Total Fat" is meaningless and a search for it is not a search.
PANEL_NOISE = {
    "calories", "calories from fat", "total fat", "saturated fat", "trans fat",
    "polyunsaturated fat", "monounsaturated fat", "cholesterol",
    "total carbohydrate", "total carbohydrates", "dietary fiber", "total sugars",
    "added sugars", "sugar alcohol", "protein", "fatty acids", "total fatty acids",
    "stearic acid", "oleic acid",
}

# Blend headings. They carry the nested constituents underneath them, so the
# heading itself is kept as a row (it is what the label prints) but never gets a
# key — the parts do.
BLEND_HEADINGS = {
    "proprietary blend", "probiotic blend", "proprietary probiotic blend",
    "proprietary extract blend", "proprietary flavonoid blend",
    "proprietary wildcrafted blueberry blend", "cerecalase proprietary blend",
    "n.zimes proprietary blend", "amino9 amino blend", "vitaberry fruit blend",
    "ionic trace minerals", "polysaccharides", "phospholipid", "phospholipids",
    "phospholipid complex", "medium chain triglycerides", "total collagen",
    "total catechins", "mixed tocopherols",
}

# key -> the printed forms. Matched case-insensitively, after normalisation,
# longest first, so "vitamin b12" beats "vitamin b1".
SYNONYMS: dict[str, list[str]] = {
    # ---- vitamins -------------------------------------------------------
    "vitamin-a": ["vitamin a", "retinol", "retinyl palmitate", "retinyl acetate",
                  "beta-carotene", "alpha-carotene"],
    "vitamin-c": ["vitamin c", "ascorbic acid", "sodium ascorbate",
                  "ascorbyl palmitate", "calcium ascorbate", "acerola"],
    "vitamin-d": ["vitamin d", "vitamin d3", "vitamin d2", "cholecalciferol",
                  "ergocalciferol"],
    "vitamin-e": ["vitamin e", "d-alpha tocopherol", "dl-alpha tocopherol",
                  "tocopherol", "gamma-tocopherol", "delta tocopherol",
                  "tocotrienol", "alpha-tocopherol"],
    "vitamin-k": ["vitamin k", "vitamin k1", "vitamin k2", "menaquinone",
                  "menaquinone-7", "phylloquinone", "mk-7"],
    "thiamine": ["thiamine", "thiamin", "vitamin b1", "thiamine mononitrate",
                 "thiamine hydrochloride", "benfotiamine", "benfopure benfotiamine"],
    "riboflavin": ["riboflavin", "vitamin b2", "riboflavin 5'-phosphate",
                   "riboflavin 5-phosphate"],
    "niacin": ["niacin", "vitamin b3", "niacinamide", "nicotinamide",
               "nicotinic acid", "niacin/niacinamide", "inositol hexanicotinate"],
    "pantothenic-acid": ["pantothenic acid", "vitamin b5", "calcium pantothenate",
                         "pantethine", "dexpanthenol"],
    "vitamin-b6": ["vitamin b6", "pyridoxine", "pyridoxine hydrochloride",
                   "pyridoxal 5'-phosphate", "pyridoxal 5-phosphate", "p-5-p"],
    "biotin": ["biotin", "vitamin b7", "d-biotin"],
    "folate": ["folate", "folic acid", "l-5-mthf", "l-5-methyltetrahydrofolate",
               "methylfolate", "quatrefolic", "vitamin b9"],
    "vitamin-b12": ["vitamin b12", "cobalamin", "methylcobalamin",
                    "cyanocobalamin", "adenosylcobalamin", "hydroxocobalamin"],
    "choline": ["choline", "choline bitartrate", "phosphatidyl choline",
                "phosphatidylcholine", "phosphatidylcholine complex"],

    # ---- minerals -------------------------------------------------------
    "calcium": ["calcium", "calcium citrate", "calcium carbonate"],
    "iron": ["iron", "ferrous sulfate", "ferrous bisglycinate", "ferrochel",
             "iron bisglycinate", "bioferrin"],
    "magnesium": ["magnesium", "magnesium glycinate", "magnesium citrate",
                  "magnesium oxide", "magnesium malate", "magnesium l-threonate",
                  "magnesium bisglycinate", "magtein", "ata mg",
                  "magnesium acetyl taurate"],
    "zinc": ["zinc", "zinc picolinate", "zinc bisglycinate", "zinc gluconate",
             "zinc citrate", "zinc oxide"],
    "copper": ["copper", "copper bisglycinate", "copper gluconate"],
    "manganese": ["manganese"],
    "selenium": ["selenium", "selenomethionine", "l-selenomethionine"],
    "iodine": ["iodine", "potassium iodide"],
    "chromium": ["chromium", "chromium picolinate"],
    "molybdenum": ["molybdenum"],
    "potassium": ["potassium", "potassium citrate"],
    "sodium": ["sodium"],
    "phosphorus": ["phosphorus"],
    "chloride": ["chloride"],
    "boron": ["boron"],
    "lithium": ["lithium", "lithium aspartate"],
    "silica": ["silica", "vegetal silica", "vegetal silica extract",
               "raw vegetal silica powder", "silicon"],

    # ---- amino acids ----------------------------------------------------
    "l-leucine": ["l-leucine", "leucine"],
    "l-isoleucine": ["l-isoleucine", "isoleucine"],
    "l-valine": ["l-valine", "valine"],
    "l-lysine": ["l-lysine", "lysine", "l-lysine hydrochloride monohydrate"],
    "l-methionine": ["l-methionine", "methionine"],
    "l-threonine": ["l-threonine", "threonine"],
    "l-phenylalanine": ["l-phenylalanine", "phenylalanine"],
    "l-histidine": ["l-histidine", "histidine"],
    "l-alanine": ["l-alanine", "alanine"],
    "l-proline": ["l-proline", "proline"],
    "l-serine": ["l-serine", "serine"],
    "l-tryptophan": ["l-tryptophan", "tryptophan", "tryptopure l-tryptophan"],
    "l-tyrosine": ["l-tyrosine", "tyrosine"],
    "l-arginine": ["l-arginine", "arginine", "l-arginine hydrochloride"],
    "l-citrulline": ["l-citrulline", "citrulline", "l-citrulline malate"],
    "l-cysteine": ["l-cysteine", "cysteine", "n-acetyl-l-cysteine", "nac",
                   "n-acetylcysteine"],
    "glycine": ["glycine"],
    "taurine": ["taurine", "l-taurine"],
    "glutamine": ["glutamine", "l-glutamine"],
    "beta-alanine": ["beta-alanine", "carnosyn", "sr carnosyn"],
    "carnitine": ["l-carnitine", "carnitine", "acetyl-l-carnitine",
                  "acetyl-l-carnitine hcl", "acetyl-l-carnitine hydrochloride",
                  "acetyl-l-carnitine arginate dihydrochloride"],
    "creatine": ["creatine", "creatine monohydrate"],
    "hmb": ["hmb", "myhmb calcium beta-hydroxy-beta-methylbutyrate"],
    "betaine": ["betaine", "betaine anhydrous", "trimethylglycine", "tmg"],

    # ---- lipids ---------------------------------------------------------
    "omega-3": ["omega-3", "total omega-3", "total omega-3 fatty acids",
                "eicosapentaenoic acid", "docosahexaenoic acid", "epa", "dha",
                "fish oil concentrate", "marine triglyceride concentrate",
                "microalgae oil", "algal oil"],
    "gla": ["gamma-linolenic acid", "gamma linoleic acid", "gla"],
    "linoleic-acid": ["linoleic acid"],
    "evening-primrose": ["evening primrose oil", "evening primrose seed oil"],
    "borage": ["borage seed oil", "borage oil"],
    "black-cumin": ["black cumin seed oil", "nigella sativa", "black seed oil",
                    "thymocid organic black cumin seed oil"],
    "lecithin": ["soy lecithin", "lecithin"],

    # ---- named compounds ------------------------------------------------
    "melatonin": ["melatonin"],
    "l-theanine": ["l-theanine", "theanine", "suntheanine"],
    "gaba": ["gamma-aminobutyric acid", "gaba", "pharmagaba"],
    "5-htp": ["5-htp", "l-5-hydroxytryptophan", "5-hydroxytryptophan"],
    "coq10": ["coenzyme q-10", "coenzyme q10", "coq10", "ubiquinone",
              "ubiquinol", "megasorb coenzyme q-10"],
    "alpha-lipoic-acid": ["alpha lipoic acid", "alpha-lipoic acid",
                          "r-lipoic acid", "lipoic acid"],
    "pqq": ["pyrroloquinoline quinone disodium", "pyrroloquinoline quinone", "pqq"],
    "nmn": ["beta-nicotinamide mononucleotide", "nicotinamide mononucleotide", "nmn"],
    "d-ribose": ["d-ribose", "ribose", "bioenergy ribose", "cherrypure"],
    "collagen": ["collagen peptides", "bovine collagen peptides, hydrolyzed",
                 "marine collagen peptides, hydrolyzed",
                 "hydrolyzed bovine collagen peptides", "uc-ii standardized cartilage"],
    "hyaluronic-acid": ["hyaluronic acid", "sodium hyaluronate"],
    "msm": ["msm", "methylsulfonylmethane", "methyl sulfonyl methane"],
    "glucosamine": ["glucosamine", "glucosamine sulfate"],
    "chondroitin": ["chondroitin", "chondroitin sulfate"],
    "citicoline": ["citicoline", "cdp-choline", "cognizin"],
    "alpha-gpc": ["alpha-gpc", "alpha-glycerylphosphorylcholine"],
    "phosphatidylserine": ["phosphatidylserine", "phosphatidylserine isolate"],
    "inositol": ["inositol", "myo-inositol"],
    "caffeine": ["caffeine"],
    "piperine": ["piperine", "bioperine"],
    "spermidine": ["spermidine"],
    "urolithin-a": ["urolithin a"],
    "uridine": ["uridine-5'-monophosphate disodium", "uridine monophosphate"],
    "vinpocetine": ["vinpocetine"],
    "huperzine-a": ["huperzine a", "huperzine"],
    "phenylethylamine": ["phenylethylamine hcl", "phenylethylamine", "pea"],
    "beta-sitosterol": ["beta-sitosterol"],
    "lactoferrin": ["lactoferrin"],
    "colostrum": ["colostrum", "immunoglobulins"],
    "casein": ["casein decapeptide", "casein"],
    "whey-protein": ["whey protein isolate", "whey protein", "whey isolate"],
    "peak-atp": ["peak atp", "adenosine 5'-triphosphate disodium"],

    # ---- polyphenols and carotenoids ------------------------------------
    "quercetin": ["quercetin", "quercetin dihydrate", "bio-quercetin phytosome",
                  "quercetin phospholipid complex"],
    "curcumin": ["curcumin", "curcuminoids", "turmeric", "curcuma longa extract",
                 "curcumin c3 complex", "curcumin phytosome complex", "meriva",
                 "bcm-95 bio-curcumin turmeric 25:1 extract"],
    "resveratrol": ["resveratrol", "trans-resveratrol"],
    "pterostilbene": ["pterostilbene"],
    "fisetin": ["fisetin"],
    "apigenin": ["apigenin"],
    "theaflavins": ["theaflavins"],
    "rutin": ["rutin"],
    "berberine": ["berberine", "berberine phytosome berbactive blend"],
    "lutein": ["lutein"],
    "zeaxanthin": ["zeaxanthin", "zeaxanthin isomers"],
    "astaxanthin": ["astaxanthin", "icelandic astalif"],
    "lycopene": ["lycopene"],
    "grape-seed": ["grape seed extract", "grape"],
    "green-tea": ["green tea leaf extract", "green tea (camellia sinensis) extract",
                  "greenselect", "matcha green tea, powder", "egcg"],
    "sulforaphane": ["sulforaphane glucosinate", "sulforaphane", "glucoraphanin",
                     "organic sprouted broccoli"],

    # ---- botanicals -----------------------------------------------------
    "ashwagandha": ["ashwagandha", "withania somnifera", "sensoril", "ksm-66"],
    "rhodiola": ["rhodiola", "rhodiola extract", "rhodiola rosea"],
    "bacopa": ["bacopa", "bacopa monnieri standardized leaf extract", "synapsa",
               "brahmi"],
    "ginkgo": ["ginkgo biloba", "ginkgo extract", "ginkgo"],
    "panax-ginseng": ["panax ginseng extract powder", "panax ginseng", "ginseng"],
    "eleuthero": ["eleuthero", "siberian ginseng"],
    "maca": ["maca", "maca tuber extract", "lepidium meyenii"],
    "milk-thistle": ["milk thistle", "silymarin", "silybum marianum"],
    "saw-palmetto": ["saw palmetto", "saw palmetto berries extract",
                     "saw palmetto fruit extract", "serenoa repens", "xerenoos"],
    "boswellia": ["boswellia extract", "boswellia serrata", "5-loxin",
                  "indian frankincense extract",
                  "indian frankincense phytosome complex"],
    "elderberry": ["elderberry fruit extract", "elderberry", "sambucus"],
    "echinacea": ["echinacea angustifolia root extract",
                  "echinacea purpurea aerial parts extract",
                  "standardized echinacea extract", "raw echinacea powder",
                  "echinacea"],
    "astragalus": ["astragalus root extract", "astragalus"],
    "olive-leaf": ["olive leaf extract", "oleuropein", "benolea"],
    "oregano-oil": ["oregano essential oil", "oregano oil"],
    "garlic": ["aged garlic extract", "garlic", "allicin"],
    "cats-claw": ["cat's claw (uncaria tomentosa) extract", "cat's claw",
                  "uncaria tomentosa"],
    "chinese-skullcap": ["chinese skullcap root concentrate", "chinese skullcap",
                         "scutellaria baicalensis", "fresh skullcap", "baicalin"],
    "gotu-kola": ["gotu kola", "centella asiatica"],
    "fo-ti": ["fo-ti", "polygonum multiflorum", "he shou wu"],
    "amla": ["amla fruit extract", "amla", "capros", "phyllanthus emblica"],
    "tribulus": ["tribulus terrestris", "tribulus"],
    "mucuna": ["mucuna pruriens fruit extract", "mucuna pruriens", "velvet bean"],
    "saffron": ["satiereal saffron extract", "saffron", "crocus sativus"],
    "lavender": ["lavender", "silexan"],
    "valerian": ["valerian"],
    "passion-flower": ["passion flower", "passiflora"],
    "chamomile": ["chamomile"],
    "hops": ["hops"],
    "california-poppy": ["fresh california poppy", "california poppy"],
    "yerba-mate": ["yerba mate", "ilex paraguariensis"],
    "phellodendron": ["phellodendron, powder", "phellodendron"],
    "rosemary": ["rosemary leaf extract", "rosemary extract", "rosemary"],
    "bamboo": ["bamboo leaf, stem extract", "bamboo extract"],
    "mastic-gum": ["mastic gum", "pistacia lentiscus"],
    "slippery-elm": ["slippery elm"],
    "marshmallow-root": ["marshmallow root extract", "marshmallow root"],
    "licorice-dgl": ["deglycyrrhizinated licorice (dgl)", "dgl", "licorice"],
    "aloe": ["aloe vera, dehydrate, powder", "aloe vera", "aloe"],
    "propolis": ["bee propolis, powder", "propolis"],
    "spirulina": ["spirulina"],
    "tart-cherry": ["tart cherry", "montmorency"],
    "blueberry": ["wild blueberry", "wild blueberry extract", "blueberry fruit extract",
                  "wild bilberry", "bilberry"],
    "psyllium": ["psyllium husk", "psyllium"],
    "inulin": ["inulin", "fos", "nutraflora scfos", "fructooligosaccharides",
               "sunfiber", "galactomannans"],
    "beta-glucan": ["beta-1,3-1,6-glucan", "barley beta-glucan", "beta glucan",
                    "beta-glucan"],

    # ---- mushrooms ------------------------------------------------------
    "lions-mane": ["lion's mane", "lion's mane fruiting body extract, dried",
                   "lion's mane mycelium extract, fresh", "hericium erinaceus",
                   "fresh lion's mane (hericium erinaceus) mycelium"],
    "reishi": ["reishi", "reishi fruiting body extract, dried",
               "reishi mycelium extract, fresh", "ganoderma lucidum",
               "oregon ganoderma"],
    "cordyceps": ["cordyceps", "cordyceps militaris"],
    "chaga": ["chaga", "chaga, fresh", "inonotus obliquus"],
    "maitake": ["maitake", "dried maitake fungus extract", "grifola frondosa"],
    "shiitake": ["shiitake", "dried shiitake (lentinula edodes) mycelium",
                 "lentinula edodes", "lentinan"],
    "turkey-tail": ["turkey tails", "turkey tail", "trametes versicolor",
                    "coriolus versicolor"],
    "mesima": ["mesima", "phellinus linteus"],
    "agarikon": ["agarikon"],
    "oyster-mushroom": ["oyster mushroom"],
    "royal-sun-blazei": ["royal sun blazei", "agaricus blazei"],
    "enokitake": ["enokitake"],
    "birch-polypore": ["birch polypore"],
    "artists-conk": ["artist's conk"],
    "split-gill-polypore": ["split gill polypore"],
    "amadou": ["amadou"],

    # ---- probiotics and enzymes -----------------------------------------
    # One key each, because a conflict or a search never needs to tell two
    # Lactobacillus strains apart — and the strain is still in raw_name.
    "probiotic": ["lactobacillus", "lacticaseibacillus", "lactiplantibacillus",
                  "bifidobacterium", "lactococcus", "pediococcus",
                  "saccharomyces boulardii", "bacillus subtilis",
                  "l. plantarum", "l. rhamnosus", "l. salivarius"],
    "digestive-enzymes": ["amylase", "protease", "lipase", "cellulase",
                          "hemicellulase", "glucoamylase", "beta-glucanase",
                          "phytase", "diastase", "papain", "bromelain",
                          "prohydrolase", "excelery"],
    "yeast-mos": ["mos yeast fraction", "saccharomyces cerevisiae extract"],

    # ---- fruit and food powders -----------------------------------------
    # Constituents of the berry blends. Individually trivial, but leaving them
    # unmapped would mean a search for "cranberry" found nothing while the word
    # sits on four labels.
    "acai": ["acai berry extract", "acai"],
    "cranberry": ["cranberry"],
    "raspberry": ["raspberry", "raspberry seed (rubus idaeus) concentrate"],
    "strawberry": ["strawberry", "strawberry extract"],
    "kiwi": ["kiwi"],
    "guava": ["guava"],
    "mango": ["mango"],
    "prune": ["prune"],
    "grapefruit": ["grapefruit", "grapefruit seed extract"],
    "spinach": ["spinach powder", "spinach"],
    "rice-extract": ["rice extract"],
    "mustard": ["mustard, powder", "mustard"],
    "ceramides": ["ceratiq wheat (triticum vulgare) oil extract", "ceramides",
                  "wheat ceramides"],
    "mct": ["medium chain triglycerides", "mct oil"],
}

# Substrings that identify a probiotic strain however it is written, since the
# strain codes ("R0011", "ATCC SD5217", "LA-14") vary endlessly.
PROBIOTIC_MARKERS = (
    "lactobacillus", "lacticaseibacillus", "lactiplantibacillus", "ligilactobacillus",
    "bifidobacterium", "lactococcus", "pediococcus", "streptococcus thermophilus",
    "saccharomyces boulardii", "bacillus subtilis", "bacillus coagulans",
    "l. plantarum", "l. rhamnosus", "l. salivarius", "l. acidophilus",
)
ENZYME_MARKERS = ("amylase", "protease", "lipase", "cellulase", "hemicellulase",
                  "glucoamylase", "glucanase", "phytase", "diastase", "papain",
                  "bromelain", "peptidase", "invertase", "lactase")


def normalise(raw: str) -> str:
    """Lowercase, strip the parenthetical form, collapse whitespace."""
    s = raw.lower().strip()
    s = re.sub(r"\s*\((?:as|from)\s[^)]*\)", "", s)   # "Zinc (as zinc picolinate)"
    s = re.sub(r"[‘’]", "'", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip(" ,.")


# longest synonym first, so "vitamin b12" is tried before "vitamin b1"
_FLAT: list[tuple[str, str]] = sorted(
    ((syn, key) for key, syns in SYNONYMS.items() for syn in syns),
    key=lambda kv: -len(kv[0]),
)


def resolve(raw: str) -> str | None:
    """Canonical key for a printed ingredient name, or None if unmappable."""
    s = normalise(raw)
    if not s or s in PANEL_NOISE or s in BLEND_HEADINGS:
        return None

    # exact first — the only match that needs no judgement
    for syn, key in _FLAT:
        if s == syn:
            return key

    # strain and enzyme families, which never match exactly
    if any(m in s for m in PROBIOTIC_MARKERS):
        return "probiotic"
    if any(m in s for m in ENZYME_MARKERS):
        return "digestive-enzymes"

    # then word-boundary containment, longest synonym first
    for syn, key in _FLAT:
        if len(syn) < 4:
            continue
        if re.search(r"(?<![a-z0-9])" + re.escape(syn) + r"(?![a-z0-9])", s):
            return key
    return None
