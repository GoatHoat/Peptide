# 176 branded products to add — verified against the NIH DSLD

Every product below is a **real filing in the NIH Dietary Supplement Label
Database**. Brand, product name, form and the DSLD ID are what the API returned,
not what I remembered. `label_url` is `https://dsld.od.nih.gov/label/<id>`.

74 existing + 176 = **250 in Vitamins & Minerals.**

---

## First: Santa Cruz Paleo

You asked for it specifically. I checked it and I do not think it should go in,
and the reason is your own rule — "only brands that are backed up, not just
popular."

The product is real. [Santa Cruz Paleo Zinc + Copper Caps](https://santacruzpaleo.com/products/zinc-copper-caps)
exists, with L-methionine and copper gluconate, 60 capsules. But:

- **It has zero filings in the DSLD.** I queried the brand directly and got
  `count: 0`. So it cannot come through your existing pipeline at all — no
  label, no verified ingredient panel, no `label_url`. Every other product in
  your catalogue has one.
- **No certificate of analysis.** A reviewer who [tested and wrote up the
  protein](https://jkremmerfitness.com/unbiased-santa-cruz-paleo-protein-powder-review/)
  reports contacting the company three times and getting nothing, and found
  nothing published on the site or the Amazon listing.
- **Amino spiking is alleged on the protein.** That review calculates roughly
  7 g of real protein against a 20 g claim, with BCAAs at nearly 30% of total
  protein content and leucine higher than verified isolates. It also flags the
  use of a Supplement Facts panel instead of a Nutrition Facts panel, which is
  the standard way to avoid disclosing that breakdown.
- Its own [SuppCo TrustScore is 4.8/10](https://supp.co/products/santa-cruz-paleo-zinc-copper-caps-850043179511)
  across products.

That is an allegation about the protein, not the zinc capsule, and I have not
seen the zinc independently tested. But a brand with no COA and no DSLD filing
is exactly what your app is supposed to help people avoid. You are building a
product whose pitch is "every suggestion has a paper behind it" — shipping a
brand that will not answer a request for its own lab work undercuts that
harder than any single listing helps.

**If you still want it in, put it in as a product users can add to their stack,
not as one the app recommends.** That distinction already exists in your schema.

I have used **Thorne Zinc Picolinate 30 mg** (DSLD 306251) and **Sports
Research Zinc Picolinate 50 mg** (326295) in the zinc slot instead. Your
existing catalogue also already has AOR Zinc-Copper Balance, which is the same
zinc + copper idea from a brand that files labels.

---

## The brand policy

TikTok-popular and quality-backed are two different lists with a small overlap.
The [top ten wellness brands by TikTok growth](https://www.gcimagazine.com/brands-products/ingestibles-supplements/news/22956615/top-10-wellness-brands-gaining-tiktok-momentum)
are Goli, Nello, Alani Nu, Mary Ruth's, 1st Phorm, Built Bar, Snap Supplements,
Natural Vitality, Barebells and Tru Niagen. Most of that list is gummies and
protein bars. I have taken the overlap and dropped the rest.

**Tier 1 — third-party certified.** These carry NSF Certified for Sport, USP
Verified or Informed Sport on at least some SKUs, and they are the ones to lead
with:

> Thorne · Klean Athlete · Momentous · Nature Made · Kirkland Signature ·
> Optimum Nutrition · Sports Research · Garden of Life

**Tier 2 — practitioner and clinical-grade.** No consumer-facing certification
mark, but real QC, full label filings, and the brands clinicians actually use:

> Pure Encapsulations · Designs for Health · Klaire Labs · Ortho Molecular ·
> Integrative Therapeutics · Douglas Laboratories · Seeking Health · Life
> Extension · Jarrow Formulas · Doctor's Best · Solgar · Bluebonnet · NOW ·
> Nordic Naturals · Carlson · Host Defense · Gaia Herbs · Swanson ·
> BulkSupplements.com

**Excluded despite being everywhere on TikTok:** Goli, Cymbiotika, Bloom, Nello,
Snap Supplements, Arrae, Mary Ruth's, Santa Cruz Paleo. Popular, heavily
affiliate-driven, and either undosed, uncertified, or both.

**Two caveats worth building around.** Certification is per-SKU, not per-brand —
Thorne is NSF Certified for Sport on part of its range, not all of it, so if you
put a certification badge in the UI it has to be checked against the
[NSF listing](https://www.nsfsport.com/certified-products/search-results.php?keyword=thorne)
per product, not inherited from the brand. And DSLD coverage is thin for newer
DTC brands: Momentous returned 2 filings, Tru Niagen returned 0. Those brands
exist and are legitimate; they just cannot be sourced through your pipeline.

---

# Skin & hair — 32

| Brand | Product | Form | DSLD |
|---|---|---|---|
| Sports Research | Marine Collagen Unflavored | Powder | 326266 |
| Sports Research | Hydrolyzed Collagen Peptides Vanilla | Powder | 268450 |
| Sports Research | Collagen Peptides Matcha | Powder | 326246 |
| Solgar | Vegetal Silica | Veg Capsule | 216405 |
| Swanson | Bamboo Extract | Capsule | 308476 |
| Jarrow Formulas | Hyaluronic Acid 120 mg | Capsule | 307599 |
| Thorne | Biotin 8000 mcg | Capsule | 336328 |
| Sports Research | Biotin 2500 mcg | Veggie Softgel | 326240 |
| Nature Made | Hair-Skin-Nails | Softgel | 271631 |
| Life Extension | Skin Restoring Ceramides | Liquid Veg Capsule | 182373 |
| Sports Research | Astaxanthin 12 mg | Softgel | 326237 |
| Pure Encapsulations | Lycopene 20 mg | Softgel | 277768 |
| Jarrow Formulas | CarotenAll | Softgel | 307570 |
| Thorne | Niacinamide | Capsule | 337868 |
| Swanson | L-Methionine 500 mg | Capsule | 308438 |
| Jarrow Formulas | Evening Primrose 1300 mg | Softgel | 307584 |
| Jarrow Formulas | Borage Seed Oil 1200 mg | Softgel | 307565 |
| Sports Research | Evening Primrose Oil 500 mg | Softgel | 268445 |
| NOW | Gamma E Tocopherols | Softgel | 14558 |
| Jarrow Formulas | OPCs + 95 100 mg | Capsule | 211990 |
| BulkSupplements.com | Amla Extract | Powder | 310652 |
| Swanson | Full Spectrum Gotu Kola 435 mg | Capsule | 308561 |
| Swanson | Full Spectrum Fo-Ti 500 mg | Capsule | 308558 |
| Swanson | Black Cumin Seed Oil 500 mg | Capsule | 308482 |
| Life Extension | Black Cumin Seed Oil and Bio-Curcumin | Softgel | 209156 |
| Thorne | Broccoli Seed Extract | Capsule | 328824 |
| Swanson | Sprouted Broccoli Seed 400 mg | Capsule | 176236 |
| Pure Encapsulations | Ascorbyl Palmitate | Capsule | 293890 |
| NOW | Acerola 4:1 Extract Powder | Powder | 313547 |
| Life Extension | PalmettoGuard | Softgel | 328635 |
| BulkSupplements.com | Saw Palmetto Extract 320 mg | Softgel | 294541 |
| Swanson | Rosemary Extract 500 mg | Capsule | 176328 |

# Sleep — 26

| Brand | Product | Form | DSLD |
|---|---|---|---|
| Thorne | PharmaGABA-250 | Capsule | 284252 |
| Thorne | Theanine | Capsule | 298051 |
| Jarrow Formulas | Theanine 200 mg | Capsule | 307738 |
| Nature Made | L-Theanine Chewable 200 mg | Tablet | 313831 |
| Nature Made | Melatonin + 200 mg L-Theanine | Softgel | 271095 |
| Life Extension | Fast-Acting Liquid Melatonin | Liquid | 328461 |
| NOW | Melatonin 5 mg | Tablet | 313770 |
| Klean Athlete | Klean Melatonin | Liquid | 237080 |
| Life Extension | Enhanced Sleep without Melatonin | Veg Capsule | 328446 |
| Thorne | Glycine | Capsule | 291783 |
| Life Extension | Glycine 1000 mg | Veg Capsule | 328470 |
| Pure Encapsulations | Glycine | Capsule | 277695 |
| Jarrow Formulas | 5-HTP 100 mg | Capsule | 307544 |
| Swanson | 5-HTP 50 mg | Capsule | 308441 |
| Pure Encapsulations | L-Tryptophan | Capsule | 294000 |
| Life Extension | L-Tryptophan 500 mg | Veg Capsule | 328524 |
| Doctor's Best | L-Tryptophan 500 mg | Capsule | 302685 |
| Thorne | Magnesium Bisglycinate | Powder | 298074 |
| NOW | Magnesium Malate Caps | Capsule | 313611 |
| Life Extension | Calm-Mag | Veg Capsule | 328306 |
| Klean Athlete | Klean Magnesium | Capsule | 244040 |
| Swanson | Full Spectrum Lavender Flower 400 mg | Capsule | 176109 |
| Life Extension | Optimized Saffron | Veg Capsule | 328617 |
| Life Extension | Tart Cherry with CherryPURE | Veg Capsule | 328723 |
| Host Defense | Reishi Extract | Liquid | 312608 |
| Host Defense | Sleep | Capsule | 335821 |

# Energy — 30

| Brand | Product | Form | DSLD |
|---|---|---|---|
| Doctor's Best | NMN 12000 400 mg | Capsule | 270688 |
| Pure Encapsulations | Amino-NR | Capsule | 293887 |
| Solgar | Sublingual Methylcobalamin B12 5000 mcg | Sublingual | 201474 |
| Doctor's Best | Fully Active B12 1500 mcg | Capsule | 269679 |
| Nature Made | Vitamin B-12 500 mcg | Tablet | 302756 |
| Thorne | Basic B Complex | Capsule | 284189 |
| Doctor's Best | Fully Active B Complex | Capsule | 269680 |
| Nature Made | Super B-Complex | Tablet | 271526 |
| Klean Athlete | Klean B-Complex | Capsule | 244203 |
| Thorne | Riboflavin 5'-Phosphate | Capsule | 288632 |
| NOW | B-2 100 mg | Capsule | 313570 |
| Thorne | Pantethine | Capsule | 291791 |
| Pure Encapsulations | Pantothenic Acid | Capsule | 278024 |
| Thorne | Acetyl-L-Carnitine 500 mg | Capsule | 284202 |
| Jarrow Formulas | L-Carnitine 500 mg | Capsule | 307636 |
| Life Extension | Acetyl-L-Carnitine Arginate | Capsule | 328274 |
| Life Extension | D-Ribose Powder | Powder | 328437 |
| Doctor's Best | High Absorption CoQ10 100 mg | Capsule | 302671 |
| Jarrow Formulas | QH-absorb 200 mg | Softgel | 307715 |
| Solgar | Megasorb CoQ-10 100 mg | Softgel | 201089 |
| Jarrow Formulas | PQQ 20 mg | Capsule | 307710 |
| Doctor's Best | Stabilized R-Lipoic Acid 100 mg | Capsule | 202942 |
| Pure Encapsulations | Alpha Lipoic Acid 600 mg | Capsule | 293885 |
| Host Defense | Cordyceps | Capsule | 312383 |
| Host Defense | Chaga Extract | Liquid | 312381 |
| NOW | Maca 500 mg | Capsule | 313572 |
| Pure Encapsulations | Maca-3 | Capsule | 302462 |
| BulkSupplements.com | Astragalus Extract | Powder | 310661 |
| Solgar | Earth Source Fermented Koji Iron 27 mg | Veg Capsule | 304565 |
| Klean Athlete | Klean Electrolytes | Capsule | 237074 |

# Focus — 32

| Brand | Product | Form | DSLD |
|---|---|---|---|
| Jarrow Formulas | Alpha GPC 300 mg | Capsule | 307550 |
| Life Extension | Citicoline (CDP-Choline) | Veg Capsule | 328397 |
| Jarrow Formulas | Citicoline CDP Choline 250 mg | Capsule | 288780 |
| Thorne | Phosphatidylserine | Capsule | 323123 |
| Jarrow Formulas | PS100 100 mg | Softgel | 264981 |
| Doctor's Best | Phosphatidyl Serine with SerinAid 100 mg | Softgel | 209417 |
| NOW | Extra Strength Lecithin | Softgel | 13590 |
| Life Extension | Huperzine A 200 mcg | Veg Capsule | 328475 |
| Swanson | Huperzine A 200 mcg | Capsule | 308602 |
| Host Defense | Lion's Mane | Capsule | 255174 |
| Host Defense | Lion's Mane Extract | Liquid | 312396 |
| Host Defense | Brain Energy | Powder | 312622 |
| Doctor's Best | Bacopa 320 mg with Synapsa | Capsule | 302639 |
| Doctor's Best | Extra Strength Ginkgo 120 mg | Capsule | 202811 |
| Doctor's Best | L-Tyrosine 500 mg | Capsule | 43427 |
| Thorne | Iodine & Tyrosine | Capsule | 260453 |
| BulkSupplements.com | Phenylethylamine HCl (PEA) | Powder | 294578 |
| Doctor's Best | Lithium Aspartate | Capsule | 25202 |
| Life Extension | Cognitex Elite | Veg Tablet | 328399 |
| Life Extension | Dopamine Advantage | Veg Capsule | 328435 |
| BulkSupplements.com | Mucuna Pruriens Extract | Powder | 294799 |
| Doctor's Best | Vegan Omega-3 2000 mg | Softgel | 322517 |
| Life Extension | Mega EPA/DHA | Softgel | 328568 |
| Thorne | Super EPA 425 mg | Softgel | 313923 |
| Klean Athlete | Klean Omega | Softgel | 232697 |
| Klean Athlete | Klean Focus | Capsule | 237068 |
| Sports Research | Magnesium L-Threonate 2000 mg | Capsule | 334884 |
| Doctor's Best | Fisetin with Novusetin | Capsule | 81967 |
| Swanson | Fisetin 100 mg | Capsule | 265103 |
| SuperSmart | Spermidine 3 mg | Capsule | 332497 |
| Codeage | Liposomal Urolithin A | Capsule | 333435 |
| Life Extension | Senolytic Activator | Veg Capsule | 328654 |

# Training — 28

| Brand | Product | Form | DSLD |
|---|---|---|---|
| Klean Athlete | Klean Creatine | Powder | 276540 |
| Life Extension | Creatine Capsules | Capsule | 328409 |
| Klean Athlete | Klean Essential Aminos + HMB | Powder | 237098 |
| BulkSupplements.com | L-Leucine | Powder | 294896 |
| Klean Athlete | Klean BCAA + Peak ATP | Powder | 293246 |
| Thorne | Amino Complex Lemon | Powder | 323098 |
| Klean Athlete | Klean Isolate Chocolate | Powder | 243801 |
| Klean Athlete | Klean Casein Vanilla Custard | Powder | 293258 |
| Klean Athlete | Klean Plant-Based Protein Vanilla | Powder | 293425 |
| BulkSupplements.com | Rice Protein | Powder | 294543 |
| Sports Research | Whey Protein Isolate Dutch Chocolate | Powder | 268690 |
| Klean Athlete | Klean Glutamine | Powder | 321195 |
| Thorne | Beta Alanine-SR | Tablet | 291773 |
| Klean Athlete | Klean SR Beta-Alanine | Tablet | 237076 |
| Doctor's Best | L-Citrulline Powder | Powder | 302684 |
| Thorne | L-Arginine Plus | Capsule | 336346 |
| Doctor's Best | Pure L-Arginine Powder | Powder | 203218 |
| Life Extension | L-Arginine Caps 700 mg | Capsule | 328509 |
| Life Extension | Bio-Collagen with Patented UC-II 40 mg | Capsule | 182041 |
| Thorne | Joint Support Nutrients | Capsule | 284229 |
| Thorne | Boswellia Phytosome | Capsule | 284197 |
| Swanson | Boswellia serrata Extract 125 mg | Capsule | 308483 |
| NOW | Boswellia Extract Plus Turmeric Root | Capsule | 13380 |
| Thorne | Curcumin Phytosome 1000 mg | Capsule | 328826 |
| Sports Research | Turmeric Curcumin C3 Complex | Softgel | 317006 |
| Klean Athlete | Klean Endurance | Tablet | 243997 |
| NOW | Tribulus 1000 mg | Tablet | 28476 |
| Klean Athlete | Klean Multivitamin | Tablet | 276544 |

# Immunity & gut — 28

| Brand | Product | Form | DSLD |
|---|---|---|---|
| Jarrow Formulas | Colostrum Prime Life 400 mg | Capsule | 307574 |
| Jarrow Formulas | Lactoferrin 250 mg | Capsule | 321954 |
| Life Extension | Lactoferrin Caps | Capsule | 231972 |
| Jarrow Formulas | Beta Glucan 250 mg | Capsule | 307558 |
| Solgar | Echinacea Herb Extract | Veg Capsule | 216682 |
| Life Extension | Echinacea Elite | Veg Capsule | 328440 |
| Life Extension | Advanced Olive Leaf Vascular Support | Veg Capsule | 328278 |
| BulkSupplements.com | Olive Leaf Extract | Powder | 294586 |
| Swanson | Oregano Oil Liquid Extract | Liquid | 308459 |
| Host Defense | Turkey Tail | Capsule | 255175 |
| Host Defense | Maitake Extract | Liquid | 74123 |
| Host Defense | Shiitake Extract | Liquid | 200108 |
| Host Defense | MyCommunity | Capsule | 312600 |
| Host Defense | Stamets 7 Extracts | Liquid | 312613 |
| Solgar | Flavo-Zinc Lozenge | Lozenge | 240993 |
| Klean Athlete | Klean Zinc | Tablet | 249882 |
| BulkSupplements.com | Bee Propolis Powder | Powder | 310672 |
| Pure Encapsulations | Cat's Claw | Capsule | 293929 |
| Swanson | Chinese Skullcap 400 mg | Capsule | 308550 |
| Jarrow Formulas | Saccharomyces boulardii + MOS | Capsule | 307728 |
| Swanson | Lactobacillus rhamnosus with FOS | Capsule | 308638 |
| Jarrow Formulas | Jarro-Dophilus EPS 25 Billion | Capsule | 307632 |
| Pure Encapsulations | Probiotic 50B | Capsule | 294040 |
| Thorne | FloraSport 20B | Capsule | 298031 |
| Jarrow Formulas | Prebiotic Inulin-FOS | Powder | 307711 |
| Swanson | Inulin | Powder | 308631 |
| Thorne | GI Relief | Capsule | 337861 |
| Jarrow Formulas | Mastic Gum 1000 mg | Capsule | 307649 |

---

## Notes for whoever writes the migration

**The API that produced this** is `https://api.ods.od.nih.gov/dsld/v9/search-filter`.
`q` is required — `q=*&brand=<name>&size=50&status=1` gives you a brand's
on-market filings, 50 per page. Brand strings must match exactly: `NOW` returns
a full catalogue, `NOW Foods` returns two.

**Check status before inserting.** Some DSLD records come back `Off Market`. The
`status=1` filter handles it, but confirm on the label page — your existing
`zinc-picolinate` entry points at Pure Prescriptions 248640, which is fine, but
two of the Allergy Research Group zinc picolinate filings are off market.

**Slug collisions.** Several of these overlap ingredients you already have —
three collagen SKUs, four B-complexes, several magnesiums. That is deliberate,
because the app is a product catalogue now, not an ingredient glossary, and
"which magnesium" is exactly the question users have. But your slugs are
ingredient-shaped (`magnesium-glycinate`), so they need to become
product-shaped (`thorne-magnesium-bisglycinate`) or the inserts will collide.
That is a schema decision to make before loading, not after.
