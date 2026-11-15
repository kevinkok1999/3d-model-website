# HRA-uitbreiding — derde onderzoeksgolf (broninventaris, 15 november 2026)

**Status: 12 exact geïdentificeerde bronkandidaten, niet gedownload, niet gevalideerd, niet geïntegreerd.** Dit onderzoek voegt geen 3D-bestanden aan de huidige atlas of de bestaande intake toe. Het is een zelfstandig vervolgvoorstel naast de eerder vastgelegde 14 HRA-referenties en de BodyParts3D-kandidaat. De catalogus staat in `model-audit/hra-wave3-candidates.json`.

## 1. Herkomst en methode

De officiële HRA-repository is `hubmapconsortium/hra-kg`. Dezelfde reeds geselecteerde commit `27d6d493cd53761abb10f087767ec4cc74acb051` en ref-organ Git-tree `fb3b43f21796dc63b93e2bbb88274b300314d3b6` zijn gebruikt. De primaire bewijsbron is de [exacte ref-organ-tree](https://api.github.com/repos/hubmapconsortium/hra-kg/git/trees/fb3b43f21796dc63b93e2bbb88274b300314d3b6); iedere gekozen versie, raw-subtree en bestandsblob is via Git-tree-metadata vastgesteld. Van alle twaalf objecten zijn `metadata.yaml` en `crosswalk.csv` op de pinned commit gelezen. Ieder CSV-bestand heeft de drie kolommen `node_name,OntologyID,label`, unieke node-namen en syntactisch geldige FMA-/UBERON-ID's. De tekstlengte komt overeen met de aangekondigde CSV-bytegrootte; daadwerkelijke cryptografische byteverificatie hoort bij de volgende intake.

De GLB's zijn **niet opgehaald**. De bytegrootte en Git blob SHA-1 in het manifest zijn geadverteerde upstream Git-waarden, geen lokaal gemeten SHA-256's. Alle bronmetadata vermelden CC BY 4.0; licentie-/attributiecontrole blijft een expliciete vrijgavevoorwaarde. [HRA 3D Reference Object Library](https://humanatlas.io/3d-reference-library) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## 2. Voorgestelde bronkandidaten

| Domein | Exacte bron-ID en versie | CSV-rijen / unieke ontology-ID's | Status of prioriteit |
|---|---|---:|---|
| Skelet | `pelvis-female` v1.3 | 24 / 8 | P1 |
| Skelet | `pelvis-male` v1.3 | 24 / 8 | P1 |
| Urinewegen | `kidney-female-left` v1.3 | 31 / 9 | HOLD metadata-conflict |
| Urinewegen | `kidney-male-left` v1.3 | 27 / 9 | HOLD metadata-conflict |
| Spijsvertering | `large-intestine-female` v1.3 | 11 / 11 | P2: afgeleid model |
| Spijsvertering | `large-intestine-male` v1.3 | 11 / 11 | P1 |
| Spijsvertering/endocrien | `pancreas-female` v1.3 | 6 / 6 | P1 |
| Spijsvertering/endocrien | `pancreas-male` v1.3 | 6 / 6 | P1 |
| Immuun/lymfatisch | `spleen-female` v1.3 | 6 / 6 | P1 |
| Immuun/lymfatisch | `spleen-male` v1.3 | 6 / 6 | P1 |
| Reproductie | `prostate-male` v1.2 | 18 / 14 | P2: expliciete beperkte scope |
| Reproductie | `uterus-female` v1.2 | 10 / 10 | HOLD bronversie-conflict |

Totaal **180 broncrosswalk-rijen**, niet 180 unieke menselijke structuren. De twaalf GLB-blobgroottes sommeren tot **15.619.368 bytes** upstream metadata (circa 15,6 MB, niet lokaal gecontroleerd). Een ontology-ID kan bij meerdere nodes, varianten en objecten terugkomen. Geometrische meshes en groepsnodes zijn pas na het parsen van de echte GLB's te onderscheiden.

## 3. Kritische bronbevindingen en prioriteit

### P1 — eerst technisch auditen

- **Bekken F/M:** de crosswalk benoemt o.a. benig bekken, heiligbeen, stuitbeen, schaambeen, darmbeen, zitbeen en compact/trabeculair botweefsel. Geen volledige bekkenspieren/ligamenten of microscopische botstructuren veronderstellen. [Vrouwelijke bron DOI](https://doi.org/10.48539/HBM853.VCFM.778) · [mannelijke bron DOI](https://doi.org/10.48539/HBM384.SBWX.873).
- **Pancreas F/M:** macroregio's van het orgaan. De bron beschrijft aangepaste verhoudingen tussen hals, lichaam en staart in v1.3; geen automatisch fysiologie-, eilandjes- of celmodel. [Vrouwelijke bron DOI](https://doi.org/10.48539/HBM866.PNNZ.328) · [mannelijke bron DOI](https://doi.org/10.48539/HBM396.QWWJ.639).
- **Milt F/M:** zes crosswalk-termen (milt, vier benoemde oppervlakken en hilum); alleen deze objectscope beoordelen. Geen algemene dekking van immuniteit of lymfestelsel. [Vrouwelijke bron DOI](https://doi.org/10.48539/HBM883.DZCZ.658) · [mannelijke bron DOI](https://doi.org/10.48539/HBM437.LMTZ.752).
- **Dikke darm M:** source metadata noemt colonoscopiegegevens en algemene uitlijning op Visible Human Male. Gegevensbron is niet automatisch exact voor de eigen atlas. [Mannelijke bron DOI](https://doi.org/10.48539/HBM487.ZKSN.693).

### P2 — aanvullende beoordeling naast normale audit

- **Dikke darm F:** de bronmetadata zegt dat het model niet op directe beeldvorming is gebaseerd maar globaal is gevormd naar de route van Visible Human Female, met passing rondom omliggende organen. Bewaar dat onderscheid zichtbaar; niet presenteren als een rechtstreeks gesegmenteerd vrouwelijk preparaat of gelijkwaardige specimen-precisie. Gelijke gebruiksfuncties mogen nooit ongelijk bronbewijs verbergen. [Vrouwelijke bron DOI](https://doi.org/10.48539/HBM682.RSXX.965).
- **Prostaat M:** de crosswalk heeft als bovenliggende term `male reproductive system`. Dat is geen bewijs dat het gehele reproductieve stelsel gemodelleerd is. De benoemde prostaatzones en geassocieerde ductus-/vesikeltermen moeten per mesh of groep worden gecontroleerd; claim geen testis, epididymis of volledige ductus-dekking. [Bron DOI](https://doi.org/10.48539/HBM545.CTNV.442).

### HOLD — expliciete discrepanties voordat semantische vrijgave mag plaatsvinden

- **Nier links F/M:** v1.3-metadata stelt dat nierkelken en nierpapillen uit het niermodel zijn verplaatst naar het uretermodel. Toch bevatten beide v1.3-crosswalks meerdere nierpapil-rijen. Controleer de echte GLB-node-inventaris en geometrie tegen de bronversie; documenteer eventuele historische CSV-labels, mismatch of dubbele scope. Geen rijen stil verwijderen of een ontologische koppeling aannemen. De twee rechter nieren zijn nog niet geïnventariseerd op bestandsniveau. [Vrouwelijke bron DOI](https://doi.org/10.48539/HBM449.JPXL.964) · [mannelijke bron DOI](https://doi.org/10.48539/HBM759.JKKF.434).
- **Uterus F:** pinned versiepad is `v1.2`, de interne citatietekst vermeldt `v1.1`. Verifieer versieregistratie en juiste citatie bij de bron voordat semantisch wordt vrijgegeven. De tien CSV-rijen betreffen de uterus en benoemde regio's/openingen; geen bewijs van volledige vrouwelijke reproductieve anatomie. [Bron DOI](https://doi.org/10.48539/HBM627.VTKD.892).

## 4. Resterende kritieke gaten en vervolgroutes

- **Spieren en bewegingsapparaat:** geen zelfstandige whole-body skeletspiermap aangetroffen in de pinned HRA ref-organ-tree. De bestaande BodyParts3D-manifestkandidaat bevat acht specifieke spierconcepten (twee biceps-koppen, diepe vingerbuiger, rectus femoris, elk links/rechts), zes botconcepten en specifieke vaatconcepten. Dat is geen volledige spieratlas en geen bewezen vrouwelijke variant. Reële vervolgroute: exacte officiële BodyParts3D-catalogus- en ELEMENT-mapping uitbreiden, vervolgens onafhankelijke licentie- en anatomische review. Kinematica en pees-/spierlijnen vereisen afzonderlijk biomechanisch bronbewijs. [BodyParts3D catalogus](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt) · [ELEMENT mapping](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt) · [licentie](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html).
- **Skelet:** de pinned HRA-tree bevat ook `knee-*` (vier zijde/variantcombinaties), `intervertebral-disk-*`, `manubrium-female` en `sternum-female`; dit zijn toekomstige vindplaatsen, niet geverifieerde GLB-pins in deze golf. Geen heel skelet, gewrichtskraakbeen- of bewegingsclaim.
- **Urinewegen:** rechter nieren, vier renal-pelvis- en ureterreferenties en `urinary-bladder-*` zijn mapkandidaten. Inventariseer zijden afzonderlijk, los anatomische versieconflicten op, voorkom dubbeltelling.
- **Reproductie:** `ovary-female-left/right` en `fallopian-tube-female-left/right` zijn pinned-tree-mappen; placenta is een eigen zwangerschapscontext, niet een generieke variant. Geen testis-specifieke bronmap aangetroffen in deze pinned tree. Voor beide anatomische bronvarianten resteert brede dekking.
- **Immuun/lymfatisch:** `thymus-*`, `lymph-node-*` en `palatine-tonsil-*` zijn vervolgmappen. Nog geen filepins uit deze golf; de milt is geen lymfevatnetwerk.
- **Endocrien:** pancreas levert alleen macroscopische orgaanregio's. Geen specifieke thyroid-, adrenal- of pituitary-map aangetroffen in de pinned ref-organ-tree. Zoek aanvullende onafhankelijke brondata; geen afleiding uit lichaamskleur, naam of simpele 3D-shape.

## 5. Overdracht naar technische intake en wetenschappelijke review

1. Houd dit manifest gescheiden van bestaande productie- en viewerconfiguratie. Laat prioriteit geen uitzondering op verificatie worden.
2. Intake in geïsoleerde staging; verifieer de exacte file-bytegrootte, Git blob SHA-1 (`blob <bytes>\0` plus payload), nieuw gemeten SHA-256 en licentie/citatie. Alleen lokale gevalideerde bytes in de viewer, nooit een willekeurige externe model-URL of vervangende synthetische geometrie.
3. GLB-audit: BIN-bereiken, triangle-indexen, eindige posities, raw node-naam/index, mesh/groep, hiërarchie, transform, group-descendantsets, hittesten en foutpaden. Een groepsnode impliceert geen ontology-ID-overerving naar elke child; herhaalde ontology-ID's zijn legitieme aparte bronrijen tot review anders bepaalt.
4. Los HOLD-conflicten op met bronvergelijking en expliciete semantische controle; geen permissieve parser of fictieve modelwijziging. Houd daadwerkelijk gemeten technische resultaten en bronclaims gescheiden.
5. Review per structuur, beide talen en alle beoogde leermodi op identiteit, lateralisatie, bronvariant, ligging, vorm en dekking. Dezelfde vrijgavecriteria voor iedere kandidaat. Geen integratie op het atlaslichaam zonder geregistreerde en onafhankelijk gecontroleerde coördinatentransformatie; geen diagnostische, therapeutische of functioneel-simulatieclaim.

**Besluit:** zeven P1-kandidaten zijn logisch voor een volgende technische intake, twee P2 hebben extra scope-/bronkwaliteitsreview en drie kandidaten hebben HOLD-conflicten. Geen van de twaalf is op basis van de inventaris gereed voor openbare anatomische vrijgave.
