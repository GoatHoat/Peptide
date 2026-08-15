-- Per-peptide search keywords — realistic terms people actually type, not
-- generic filler. Matched as substrings against the raw query (handles
-- "peptide for height" containing "height" even with extra words around
-- it) and folded into the full-text document for multi-word combos.

alter table public.glossary
  add column search_keywords text[] not null default '{}';

update public.glossary set search_keywords = array[
  'bpc 157','bpc157','bpc-157','body protection compound','pentadecapeptide','bpc',
  'stomach peptide','gut healing peptide','leaky gut peptide','tendon repair peptide',
  'ligament healing peptide','wolverine peptide','injury recovery peptide','gastric peptide',
  'ibs peptide','ulcer peptide','joint repair peptide','tendonitis peptide','torn muscle peptide',
  'healing peptide','bpc 157 benefits','bpc 157 injection','bpc 157 oral','bpc 157 reviews',
  'bpc 157 research','systemic healing peptide','angiogenesis peptide','gut lining repair',
  'crohns peptide','colitis peptide','sports injury peptide','recovery peptide',
  'bpc 157 mechanism','stomach ulcer peptide','intestinal repair peptide','muscle tear peptide',
  'ligament tear peptide','achilles tendon peptide','rotator cuff peptide','bpc 157 for gut',
  'bpc 157 for tendons','bpc157 research chemical','bpc tb500 stack','wolverine healing peptide',
  'bpc peptide benefits','bpc for injury','fast healing peptide','regenerative peptide',
  'bpc157 half life','digestive healing peptide','gastrointestinal peptide',
  'peptide for joint pain','peptide for chronic pain','bpc 157 for pain'
] where slug = 'bpc-157';

update public.glossary set search_keywords = array[
  'tb 500','tb500','tb-500','thymosin beta 4','thymosin beta-4','tb500 peptide',
  'wound healing peptide','tendon peptide','ligament peptide','flexibility peptide',
  'injury peptide','muscle repair peptide','systemic healing peptide','tb 500 benefits',
  'tb 500 injury recovery','tb 500 vs bpc 157','tb500 bpc157 stack','cardiac repair peptide',
  'hair growth peptide','joint mobility peptide','actin binding peptide','cell migration peptide',
  'angiogenesis peptide','regeneration peptide','sports recovery peptide','tb 500 research',
  'thymosin peptide','wound repair peptide','scar tissue peptide','muscle flexibility peptide',
  'range of motion peptide','tb500 for horses','equine healing peptide','tb500 review',
  'tb500 results','thymosin beta 4 fragment','tb 500 mechanism','torn ligament peptide',
  'torn tendon peptide','chronic injury peptide','tb 500 for back pain','tb 500 for shoulder',
  'tb 500 for knee','systemic repair peptide','thymosin b4','tb 500 for athletes',
  'recovery peptide stack','tb500 subq','flexibility recovery peptide','deep tissue healing',
  'muscle strain peptide','soft tissue repair'
] where slug = 'tb-500';

update public.glossary set search_keywords = array[
  'thymosin alpha 1','thymosin alpha-1','ta1','thymosin a1','immune peptide','immune booster peptide',
  'immune system peptide','thymic peptide','thymus peptide','antiviral peptide','immune modulator',
  'immune deficiency peptide','chronic infection peptide','autoimmune peptide','vaccine response peptide',
  'immunosenescence peptide','thymosin alpha 1 benefits','thymosin alpha 1 research','tcell peptide',
  't cell peptide','natural killer cell peptide','sepsis peptide','viral infection peptide',
  'hepatitis peptide','immune recovery peptide','thymalfasin','zadaxin','immune resilience peptide',
  'chronic illness peptide','get sick less peptide','fight infection peptide','immune support peptide',
  'thymosin peptide immune','peptide for immune system','peptide for getting sick often',
  'peptide for colds','peptide for flu','immune modulating peptide','thymosin alpha 1 dosage',
  'thymosin alpha 1 mechanism','herpes peptide','shingles peptide','immune peptide research',
  'thymosin alpha-1 covid','post viral peptide','recurrent infection peptide','weak immune system peptide',
  'thymic hormone peptide','peptide for aging immune system','immune peptide for elderly',
  'anti-infective peptide'
] where slug = 'thymosin-alpha-1';

update public.glossary set search_keywords = array[
  'kpv peptide','kpv','lysine proline valine','alpha msh fragment','anti inflammatory peptide',
  'gut inflammation peptide','ibd peptide','inflammatory bowel disease peptide','crohns peptide',
  'ulcerative colitis peptide','skin inflammation peptide','eczema peptide','psoriasis peptide',
  'nfkb inhibitor peptide','tripeptide','kpv benefits','kpv research','kpv mechanism',
  'peptide for gut inflammation','peptide for ibd','peptide for eczema','peptide for psoriasis',
  'peptide for colitis','anti inflammatory tripeptide','melanocortin fragment peptide',
  'kpv gut health','kpv skin','kpv topical','kpv injection','kpv oral','inflammation reducing peptide',
  'gut barrier peptide','leaky gut inflammation','autoimmune skin peptide','dermatitis peptide',
  'kpv cream','anti itch peptide','inflammatory skin condition peptide','kpv studies',
  'small peptide anti-inflammatory','kpv vs bpc 157','gut healing anti inflammatory',
  'peptide for chronic inflammation','cytokine reducing peptide','kpv acne',
  'peptide for autoimmune gut','kpv rosacea','calming skin peptide','kpv research chemical',
  'melanocortin anti-inflammatory'
] where slug = 'kpv';

update public.glossary set search_keywords = array[
  'll 37','ll37','ll-37','cathelicidin','cathelicidin peptide','antimicrobial peptide',
  'wound healing peptide','human cathelicidin','skin infection peptide','antibacterial peptide',
  'mrsa peptide','biofilm peptide','chronic wound peptide','diabetic wound peptide',
  'peptide for wound healing','peptide for skin infection','peptide for chronic wounds',
  'natural antibiotic peptide','immune defense peptide','skin repair peptide','ll37 benefits',
  'll37 research','ll37 mechanism','antimicrobial skin peptide','staph infection peptide',
  'bacterial resistance peptide','wound closure peptide','ll 37 topical','ll 37 cream',
  'peptide for slow healing wounds','ulcer wound peptide','pressure sore peptide',
  'bedsore peptide','skin barrier peptide','innate immunity peptide','antifungal peptide',
  'll37 skin','ll37 acne','ll37 studies','host defense peptide','natural cathelicidin',
  'peptide for infected wounds','biofilm disruption peptide','antimicrobial skincare peptide',
  'll 37 clinical trial','wound healing rct peptide','skin regeneration peptide',
  'peptide for surgical wounds','antimicrobial research peptide'
] where slug = 'll-37';

update public.glossary set search_keywords = array[
  'igf 1','igf1','igf-1','insulin like growth factor','insulin-like growth factor 1',
  'muscle growth peptide','muscle building peptide','lr3 igf 1','igf 1 lr3','muscle recovery peptide',
  'growth factor peptide','bodybuilding peptide','muscle hypertrophy peptide','igf 1 benefits',
  'igf 1 research','igf 1 mechanism','igf 1 bodybuilding','muscle repair growth factor',
  'cell growth peptide','anabolic peptide','peptide for muscle growth','peptide for bulking',
  'peptide for muscle recovery','growth hormone mediator','igf 1 dosage','igf 1 injection',
  'igf 1 des','des igf 1','muscle fiber growth peptide','igf 1 side effects',
  'peptide for strength gains','peptide for lean muscle','igf 1 cycle','muscle building hormone',
  'igf 1 vs hgh','post workout recovery peptide','muscle regeneration peptide','igf1 gains',
  'igf1 for athletes','igf1 studies','growth factor injection','peptide for hypertrophy',
  'muscle protein synthesis peptide','strength peptide','igf1 mechanism of action',
  'growth peptide for lifters','muscle building research chemical','igf1 stack',
  'peptide for muscle mass','igf 1 receptor peptide'
] where slug = 'igf-1';

update public.glossary set search_keywords = array[
  'hgh','human growth hormone','growth hormone peptide','hgh peptide','somatropin',
  'growth hormone injection','anti aging growth hormone','hgh benefits','hgh research',
  'hgh bodybuilding','hgh for muscle','hgh for fat loss','hgh for recovery','hgh for aging',
  'peptide for height','peptide for growth','peptide for muscle growth','peptide for anti aging',
  'growth hormone therapy','hgh mechanism','hgh dosage','hgh cycle','hgh side effects',
  'human growth hormone benefits','hgh for athletes','hgh injection benefits',
  'growth hormone deficiency peptide','hgh anti aging','hgh skin','hgh muscle recovery',
  'hgh fat burning','hgh body composition','hgh for bodybuilders','growth hormone peptide therapy',
  'hgh vs peptides','hgh research chemical','somatotropin','pituitary hormone peptide',
  'hgh for height growth','hgh for taller','hgh recovery peptide','hgh performance',
  'hgh longevity','growth hormone secretion','hgh replacement therapy','hgh studies',
  'hgh clinical research','growth hormone peptide stack','hgh for strength','hgh for lean mass',
  'hgh natural alternative'
] where slug = 'hgh';

update public.glossary set search_keywords = array[
  'ipamorelin','ipamorelin peptide','gh secretagogue','growth hormone secretagogue',
  'ghrp','ghrelin receptor agonist','ipamorelin benefits','ipamorelin research',
  'ipamorelin mechanism','ipamorelin dosage','ipamorelin cycle','ipamorelin cjc 1295',
  'peptide for growth hormone release','selective gh secretagogue','ipamorelin bodybuilding',
  'ipamorelin fat loss','ipamorelin muscle growth','ipamorelin sleep','ipamorelin anti aging',
  'ipamorelin side effects','pituitary peptide','ipamorelin vs sermorelin','ipamorelin stack',
  'gh releasing peptide','ipamorelin recovery','ipamorelin injection','ipamorelin pentapeptide',
  'ipamorelin for height','peptide for taller','ipamorelin studies','growth hormone pulse peptide',
  'ipamorelin research chemical','ipamorelin cortisol','ipamorelin prolactin',
  'ipamorelin body composition','ipamorelin lean muscle','ipamorelin longevity',
  'ipamorelin appetite','ipamorelin skin','ipamorelin for athletes','gh boosting peptide',
  'ipamorelin selectivity','ipamorelin clinical trial','ipamorelin natural gh',
  'ipamorelin muscle mass','ipamorelin performance','ipamorelin recovery time',
  'ipamorelin sleep quality','ipamorelin peptide therapy','growth hormone pulsatile release',
  'ipamorelin fitness'
] where slug = 'ipamorelin';

update public.glossary set search_keywords = array[
  'cjc 1295','cjc1295','cjc-1295','ghrh analog','growth hormone releasing hormone analog',
  'cjc 1295 dac','cjc 1295 no dac','cjc 1295 benefits','cjc 1295 research','cjc 1295 mechanism',
  'cjc 1295 dosage','cjc 1295 ipamorelin','cjc 1295 cycle','long acting ghrh',
  'peptide for growth hormone','cjc 1295 muscle growth','cjc 1295 fat loss','cjc 1295 anti aging',
  'cjc 1295 sleep','cjc 1295 side effects','cjc 1295 bodybuilding','cjc 1295 stack',
  'cjc 1295 half life','cjc 1295 injection','cjc 1295 studies','growth hormone releasing peptide',
  'cjc 1295 recovery','cjc 1295 for height','cjc 1295 research chemical','cjc 1295 igf 1',
  'cjc 1295 clinical trial','modified ghrh','cjc 1295 albumin binding','cjc 1295 lean mass',
  'cjc 1295 body composition','cjc 1295 longevity','cjc 1295 performance','cjc 1295 athletes',
  'growth hormone boosting peptide','cjc 1295 protocol','cjc 1295 vs sermorelin',
  'cjc 1295 pituitary','cjc 1295 muscle mass','cjc 1295 for taller','cjc 1295 strength',
  'cjc 1295 skin','cjc 1295 recovery time','cjc no dac','tetrasubstituted ghrh',
  'cjc 1295 fitness','cjc 1295 sleep quality'
] where slug = 'cjc-1295';

update public.glossary set search_keywords = array[
  'sermorelin','sermorelin peptide','sermorelin acetate','ghrh 1-29','sermorelin benefits',
  'sermorelin research','sermorelin mechanism','sermorelin dosage','sermorelin therapy',
  'sermorelin anti aging','sermorelin for height','peptide for natural growth hormone',
  'sermorelin fat loss','sermorelin muscle growth','sermorelin sleep','sermorelin side effects',
  'sermorelin vs hgh','sermorelin vs cjc 1295','sermorelin injection','sermorelin cycle',
  'sermorelin pituitary','sermorelin studies','sermorelin clinical trial',
  'growth hormone releasing hormone fragment','sermorelin recovery','sermorelin bodybuilding',
  'sermorelin stack','sermorelin longevity','sermorelin natural gh release',
  'sermorelin body composition','sermorelin research chemical','sermorelin performance',
  'sermorelin athletes','sermorelin lean muscle','sermorelin protocol',
  'sermorelin pulsatile release','sermorelin half life','sermorelin fitness',
  'sermorelin for taller','sermorelin skin','sermorelin sleep quality','sermorelin strength',
  'sermorelin igf 1','sermorelin hormone therapy','sermorelin deficiency','sermorelin aging',
  'sermorelin muscle mass','sermorelin recovery time','sermorelin gh peptide',
  'sermorelin endocrine peptide','sermorelin doctor prescribed'
] where slug = 'sermorelin';

update public.glossary set search_keywords = array[
  'ghk cu','ghk-cu','ghk copper','copper peptide','copper tripeptide','skin peptide',
  'anti aging peptide','collagen peptide','wrinkle peptide','skin repair peptide',
  'copper peptide serum','ghk cu benefits','ghk cu research','ghk cu skincare',
  'ghk cu mechanism','skin firming peptide','wound healing skincare peptide',
  'copper peptide skincare','anti wrinkle peptide','collagen boosting peptide',
  'skin regeneration peptide','ghk cu serum','ghk cu cream','peptide for wrinkles',
  'peptide for anti aging skin','peptide for skin firmness','peptide for collagen',
  'copper complex skincare','ghk cu hair growth','skin elasticity peptide',
  'ghk cu clinical studies','dermatology peptide','skin healing copper peptide',
  'anti aging skincare peptide','copper peptide benefits skin','ghk cu topical',
  'skin remodeling peptide','ghk cu scar treatment','peptide for skin texture',
  'ghk cu eye cream','copper peptide hair','ghk cu wound care','fine line peptide',
  'skin tightening peptide','ghk cu vs retinol','skin matrix peptide',
  'copper peptide research','ghk cu for aging skin','natural copper peptide skin',
  'ghk cu dermal peptide','collagen signaling peptide'
] where slug = 'ghk-cu';

update public.glossary set search_keywords = array[
  'matrixyl','matrixyl peptide','palmitoyl pentapeptide','palmitoyl pentapeptide 4',
  'pal-kttks','kttks peptide','collagen peptide','anti wrinkle peptide','skincare peptide',
  'matrixyl benefits','matrixyl research','matrixyl serum','matrixyl cream',
  'matrixyl skincare','collagen stimulating peptide','wrinkle reducing peptide',
  'peptide for wrinkles','peptide for fine lines','peptide for collagen production',
  'anti aging serum peptide','matrixyl mechanism','matrixyl clinical trial',
  'skin firmness peptide','matrixyl vs argireline','matrixyl studies',
  'collagen matrix peptide','photoaged skin peptide','matrixyl 3000','skin plumping peptide',
  'matrixyl eye cream','fibroblast stimulating peptide','matrixyl dermatology',
  'skin texture peptide','matrixyl anti aging','matrixyl skin elasticity',
  'sederma peptide','matrixyl research chemical','matrixyl face cream',
  'collagen precursor peptide','matrixyl vs retinol','matrixyl skin repair',
  'peptide for smoother skin','matrixyl formulation','skin rejuvenation peptide',
  'matrixyl active ingredient','anti aging cosmetic peptide','matrixyl efficacy',
  'matrixyl skin density','matrixyl deep wrinkles','matrixyl before and after'
] where slug = 'matrixyl';

update public.glossary set search_keywords = array[
  'argireline','argireline peptide','acetyl hexapeptide 8','acetyl hexapeptide 3',
  'botox alternative peptide','wrinkle relaxing peptide','snap 25 peptide',
  'argireline benefits','argireline research','argireline serum','argireline cream',
  'argireline mechanism','peptide botox alternative','expression line peptide',
  'facial muscle relaxing peptide','argireline clinical trial','argireline skincare',
  'peptide for expression lines','peptide for crows feet','peptide for forehead wrinkles',
  'topical botox peptide','argireline studies','argireline vs botox',
  'neurotransmitter blocking peptide','argireline eye cream','argireline efficacy',
  'muscle relaxing skincare peptide','argireline snare complex','argireline dosage',
  'argireline formulation','anti wrinkle skincare peptide','argireline before after',
  'argireline face serum','argireline wrinkle depth','argireline acetylcholine',
  'argireline dynamic wrinkles','argireline natural botox','argireline skin smoothing',
  'argireline research chemical','argireline product','argireline percentage',
  'argireline effectiveness','argireline anti aging cream','argireline hexapeptide',
  'argireline forehead lines','argireline smile lines','argireline application',
  'argireline skin study','argireline cosmeceutical'
] where slug = 'argireline';

update public.glossary set search_keywords = array[
  'snap 8','snap-8','snap8','acetyl octapeptide 3','wrinkle peptide','botox alternative peptide',
  'snap 8 benefits','snap 8 research','snap 8 mechanism','snap 8 serum','snap 8 cream',
  'peptide for wrinkles','peptide for expression lines','facial muscle peptide',
  'snap 8 vs argireline','snare complex peptide','snap 8 skincare','snap 8 studies',
  'snap 8 clinical trial','topical wrinkle reducer peptide','snap 8 efficacy',
  'octapeptide skincare','snap 8 neurotransmitter','snap 8 anti aging',
  'snap 8 formulation','snap 8 before after','snap 8 eye cream','snap 8 crows feet',
  'snap 8 forehead lines','snap 8 dynamic wrinkles','snap 8 product',
  'snap 8 percentage','snap 8 effectiveness','snap 8 research chemical',
  'snap 8 face serum','snap 8 muscle relaxing','snap 8 skin smoothing',
  'snap 8 cosmeceutical','snap 8 application','snap 8 wrinkle depth reduction',
  'snap 8 acetylcholine inhibitor','snap 8 natural botox alternative',
  'snap 8 skincare ingredient','snap 8 anti wrinkle serum','snap 8 skin study',
  'snap 8 topical peptide','snap 8 collagen support','snap 8 skin firmness',
  'snap 8 smile lines','snap 8 expression wrinkles'
] where slug = 'snap-8';

update public.glossary set search_keywords = array[
  'melanotan 2','melanotan ii','mt2','mt-2','tanning peptide','tanning injection peptide',
  'melanotan benefits','melanotan research','melanotan mechanism','melanotan dosage',
  'melanocortin agonist','tan without sun peptide','melanotan 2 side effects',
  'peptide for tanning','peptide for tan skin','sunless tanning peptide',
  'melanotan pigmentation','melanotan skin darkening','melanotan libido peptide',
  'melanotan appetite suppressant','melanotan 2 studies','melanotan research chemical',
  'melanotan tan fast','melanotan injection','mt2 tanning','melanotan skin protection',
  'melanotan for pale skin','melanotan sunscreen alternative','melanotan freckles',
  'melanocyte stimulating peptide','melanotan bodybuilding','melanotan 2 benefits skin',
  'melanotan tanning injections','melanotan uv protection','melanotan 2 mechanism of action',
  'melanotan sexual function','tan enhancing peptide','melanotan vs sunbed',
  'melanotan even tan','melanotan 2 reviews','melanotan darker skin peptide',
  'melanotan nasal spray','melanotan 2 dosing','melanotan pigment peptide',
  'melanotan skin tone peptide','melanotan 2 research chemical','melanotan appetite',
  'melanotan sun protection peptide','melanotan tan maintenance','melanotan mc1r agonist',
  'bronze skin peptide','bronzing peptide'
] where slug = 'melanotan-ii';

update public.glossary set search_keywords = array[
  'semax','semax peptide','semax nasal spray','acth 4-10','nootropic peptide',
  'focus peptide','memory peptide','concentration peptide','semax benefits','semax research',
  'semax mechanism','semax dosage','bdnf peptide','peptide for focus','peptide for memory',
  'peptide for concentration','peptide for brain fog','peptide for studying',
  'russian nootropic peptide','semax cognitive enhancement','semax adhd',
  'semax attention peptide','semax dopamine','semax neuroprotective peptide',
  'semax studies','semax clinical research','semax nootropic stack','semax vs noopept',
  'semax vs selank','semax intranasal peptide','semax brain peptide','semax learning',
  'semax mental clarity','semax productivity peptide','semax neurogenesis',
  'semax cognitive peptide','semax research chemical','cognitive enhancing peptide',
  'semax anxiety','semax mood','semax hippocampus','semax trkb','semax exam peptide',
  'semax brain fog peptide','semax focus enhancer','semax nasal peptide',
  'semax study aid','semax working memory','semax neuroplasticity','semax cognition',
  'semax attention span'
] where slug = 'semax';

update public.glossary set search_keywords = array[
  'selank','selank peptide','selank nasal spray','tuftsin analog','anxiety peptide',
  'anxiolytic peptide','stress peptide','calming peptide','selank benefits','selank research',
  'selank mechanism','selank dosage','peptide for anxiety','peptide for stress',
  'peptide for calm','peptide for mood','russian anxiolytic peptide','selank gaba',
  'selank cognitive peptide','selank studies','selank clinical research',
  'selank vs semax','selank vs benzodiazepines','selank intranasal peptide',
  'selank mood peptide','selank stress relief','selank immune peptide',
  'selank nootropic stack','selank calming effect','selank generalized anxiety',
  'selank research chemical','anti anxiety peptide','selank neasthenia',
  'selank brain peptide','selank relaxation peptide','selank mental clarity',
  'selank focus peptide','selank sleep peptide','selank panic peptide',
  'selank social anxiety','selank nasal peptide','selank without sedation',
  'calm focus peptide','selank cortisol','selank heptapeptide',
  'selank emotional regulation','selank wellbeing peptide','selank tension relief',
  'selank chronic stress','selank mood stabilizer','selank cognitive calm'
] where slug = 'selank';

update public.glossary set search_keywords = array[
  'noopept','noopept peptide','noopept nootropic','n-phenylacetyl-l-prolylglycine',
  'memory peptide','focus peptide','cognitive enhancer peptide','noopept benefits',
  'noopept research','noopept mechanism','noopept dosage','peptide for memory',
  'peptide for focus','peptide for learning','noopept vs piracetam','noopept studies',
  'noopept clinical research','noopept nootropic stack','noopept oral nootropic',
  'noopept neuroprotective','noopept ampa receptor','noopept glutamate',
  'noopept cognitive peptide','noopept brain peptide','noopept mental clarity',
  'noopept studying peptide','noopept exam peptide','noopept productivity',
  'noopept research chemical','noopept racetam alternative','noopept oral peptide',
  'noopept bdnf','noopept ngf','noopept neurogenesis','noopept anxiety',
  'noopept mood peptide','noopept hif pathway','noopept dipeptide',
  'noopept cognition enhancer','noopept working memory','noopept nootropic pill',
  'noopept vs modafinil','noopept sublingual','noopept tablets',
  'noopept brain fog peptide','noopept attention peptide','noopept neuroprotection',
  'noopept oxidative stress','noopept russian nootropic','noopept smart drug',
  'noopept cognitive decline'
] where slug = 'noopept';

update public.glossary set search_keywords = array[
  'cerebrolysin','cerebrolysin peptide','cerebrolysin injection','neuropeptide',
  'brain injury peptide','neuroprotective peptide','cerebrolysin benefits',
  'cerebrolysin research','cerebrolysin mechanism','cerebrolysin dosage',
  'peptide for brain injury','peptide for stroke recovery','peptide for cognitive decline',
  'cerebrolysin bdnf','cerebrolysin ngf','cerebrolysin alzheimers peptide',
  'cerebrolysin dementia peptide','cerebrolysin studies','cerebrolysin clinical trial',
  'porcine brain peptide','cerebrolysin neurogenesis','cerebrolysin stroke peptide',
  'cerebrolysin tbi peptide','traumatic brain injury peptide','cerebrolysin cognitive recovery',
  'cerebrolysin neurotrophic peptide','cerebrolysin research chemical',
  'cerebrolysin brain recovery','cerebrolysin memory peptide','cerebrolysin vascular dementia',
  'cerebrolysin amyloid','cerebrolysin synapse peptide','cerebrolysin neural repair',
  'cerebrolysin iv peptide','cerebrolysin injection peptide','cerebrolysin brain healing',
  'cerebrolysin multimodal peptide','cerebrolysin neuroinflammation',
  'cerebrolysin cognitive function','cerebrolysin brain peptide therapy',
  'cerebrolysin post stroke','cerebrolysin elderly cognitive peptide',
  'cerebrolysin neuroplasticity','cerebrolysin peptide mixture',
  'cerebrolysin clinical research neurology','cerebrolysin brain repair peptide',
  'cerebrolysin concussion peptide','cerebrolysin neural growth factor'
] where slug = 'cerebrolysin';

update public.glossary set search_keywords = array[
  'dihexa','dihexa peptide','angiotensin iv analog','hgf c-met peptide',
  'cognitive enhancer peptide','synaptogenesis peptide','dihexa benefits','dihexa research',
  'dihexa mechanism','dihexa dosage','peptide for memory','peptide for cognitive decline',
  'peptide for neural connections','dihexa oral nootropic','dihexa studies',
  'dihexa clinical research','dihexa hepatocyte growth factor','dihexa cmet receptor',
  'dihexa neuroplasticity','dihexa dendritic spine peptide','dihexa washington state',
  'dihexa research chemical','dihexa nootropic stack','dihexa brain peptide',
  'dihexa memory formation','dihexa learning peptide','dihexa blood brain barrier',
  'dihexa potent nootropic','dihexa alzheimers research','dihexa vascular dementia',
  'dihexa cognitive research','dihexa synaptic connections','dihexa mcoy study',
  'dihexa retracted study','dihexa evidence','dihexa controversial peptide',
  'dihexa unverified research','dihexa experimental peptide','dihexa smart drug',
  'dihexa oral bioavailability','dihexa picomolar peptide','dihexa neural growth',
  'dihexa cognition peptide','dihexa memory enhancer','dihexa hexanoic acid',
  'dihexa dipeptide','dihexa aged brain','dihexa spatial learning',
  'dihexa scientific integrity','dihexa expression of concern'
] where slug = 'dihexa';
