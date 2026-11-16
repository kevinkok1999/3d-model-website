# Fase 2 — bronbesluit anatomische verdieping

**Onderzoeksstatus 15 november 2026:** primaire openbare bronmetadata gecontroleerd; geen nieuwe datasets/3D-bestanden gedownload of geometrie geïmporteerd in deze stap. Dit is een ingest- en testplan, geen anatomische validatie of dekkingsclaim. De bestaande Open Anatomy 3D 0.1.0-proef is een overzichtsmodel, niet voldoende fijnmazig als eindatlas. Het doel is afzonderlijke structuren, dezelfde kwaliteitsnorm over alle domeinen, beide relevante referentievarianten, stabiele mapping en behoud van aantoonbare herkomst.

## 1. Besluit per domein

| Domein | Eerste bron voor verdieping | Status en reden |
|---|---|---|
| Individuele botten, spierdelen, ligamenten | Directe BodyParts3D 4.0 ELEMENT-meshes + FMA-tabellen | **Voorkeurskandidaat**; werkelijke per-zijde IDs, CC BY 4.0, bronman. Geometrie en omvang per onderdeel nog auditen. |
| Bloedvaten | HRA Vasculature v1.3 M/F + VCCF relaties; BodyParts3D voor ontbrekende takken | **Voorkeurskandidaat**; ontologie-ID's en vertakkingen; geen foutloze samenvoeging tussen verschillende lichamen aannemen. |
| Hersenen/ruggenmerg, organen, huid, gewrichten | HRA 3D-reference objects per variant; aanvullend direct BodyParts3D | **Voorkeurskandidaat**; regionale meshes met crosswalk, niet alle substructuren aanwezig. |
| Perifere zenuwen | HRA PNS-tabel als doelcatalogus; SPARC anatomische scaffolds/regionale bronzoektocht | **Onderzoek nodig**; kennisgraaf/flatmap is geen mesh. SPARC vagus is een concrete kandidaat voor één zenuw en takken, geen complete PNS. |
| Extra topologische anatomie uit Z-Anatomy | Selectie pas na licentie- en herkomstcontrole per object | **Geblokkeerd voor distributie**; share-alike en NC-derivaten, licentiepositie over onafhankelijke viewer nog onopgelost. |

## 2. BodyParts3D 4.0 — afzonderlijke botten, spieren en vaten

De officiële DBCLS [README](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html) omschrijft het model als een driedimensionale anatomische woordenboekdatabase van één volwassen mannelijk referentielichaam. De release 4.0 dateert uit 2013, de licentiewijziging naar CC BY 4.0 uit februari 2025. Raadpleeg de [licentie](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) en [releasehistorie](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/update.html). Gebruik directe actuele DBCLS-exports, niet afgeleide historische downloads met ShareAlike-header. Bewaar per bestand de oorspronkelijke header en leg de relatie met de actuele licentieverklaring vast; laat de juridische eigenaar afwijkingen beslissen.

**Concrete ingang:** [officiële downloadpagina](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) en [IS-A catalogus](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt), [PART-OF catalogus](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_parts_list_e.txt). De geraadpleegde tekstbronnen hadden respectievelijk 2.906 en 1.369 lijnen, headers inbegrepen. Deze noemers zijn cataloguslijnen, niet unieke losse meshes, lichaamsdelen of klinisch goedgekeurde structuren. De README maakt het onderscheid tussen ELEMENT (losse polygon-data) en COMPOUND (definitie als verzameling ELEMENTen). Importeer deze zonder overlap als één scene-node per brongeometrie; selecteer compounding via expliciete relaties, niet duplicatie van polygonen.

Officieel gerapporteerde bronbestandsgrootten, niet lokaal gemeten:

| Bestand | Grootte | Toepassing |
|---|---:|---|
| [`isa_BP3D_4.0_obj_99.zip`](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip) | 136 MB | afzonderlijke ELEMENT-OBJ's |
| [`partof_BP3D_4.0_obj_99.zip`](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_BP3D_4.0_obj_99.zip) | 62 MB | PART-OF ELEMENT-OBJ's |
| [`isa_element_parts.txt`](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt) | 1,1 MB | COMPOUND → ELEMENT-file IDs |
| [`partof_element_parts.txt`](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_element_parts.txt) | 654 KB | idem voor PART-OF |
| [`isa_inclusion_relation_list.txt`](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_inclusion_relation_list.txt) / [`partof_inclusion_relation_list.txt`](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_inclusion_relation_list.txt) | 203 KB / 90 KB | semantische ouder-kindrelaties |

De ZIP-bestanden worden aangeboden als meshes met 99% polygonreductie. De reductie is geen garantie voor detailniveau; vooral dunne zenuwen, vaatvertakkingen en kleine landmarks kunnen daardoor onvoldoende zichtbaar zijn. Bewaar bronresolutie, beoordeel afzonderlijke vorm, en genereer platform-LOD's pas daarna. Geen verdere decimatie vóór geometrische beoordeling. Geen nieuwe geometrie is in deze stap daadwerkelijk bekeken.

### Gecontroleerde per-structuur voorbeelden uit officiële IS-A-tekstcatalogus

| Domein | Naam bron | FMA-concept | BP-representatie |
|---|---|---|---|
| Skelet | linker femur | FMA24475 | BP9042 |
| Skelet | linker tibia | FMA24478 | BP9202 |
| Skelet | linker vijfde metacarpaal | FMA24473 | BP8000 |
| Skelet | linker naviculair voetbot | FMA24501 | BP8599 |
| Spier | korte kop linker biceps brachii | FMA37685 | BP9153 |
| Spier | lange kop linker biceps brachii | FMA37687 | BP8816 |
| Spier | linker flexor digitorum profundus | FMA38480 | BP7826 |
| Spier | linker rectus femoris | FMA38929 | BP8094 |
| Vaat | linker radiale arterie | FMA22734 | BP6336 |
| Vaat | linker ulnaire arterie | FMA22798 | BP6316 |
| Vaat | linker radiale vene | FMA22949 | BP5928 |
| Vaat | eerste anterieure ventriculaire tak rechter coronairarterie | FMA3815 | BP7824 |

Bron: [IS-A tabellen](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt), geraadpleegde regels rond 14–16, 920–952, 1032–35, 1171–1193, 1404–1409, 1452–1454, 1506–1507. De aanwezigheid van deze catalogusrecords bevestigt een serieus fijnmaziger inventory-aanbod; nog niet dat elke representatie een enkel gelijknamig OBJ-bestand of volledig zichtbaar anatomisch onderdeel is. De [officiële ELEMENT-mapping](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt) is voor 21 kandidaten eveneens geraadpleegd en de 23 afzonderlijke FJ-verwijzingen zijn vastgelegd in [`bodyparts3d-intake-candidates.json`](../model-audit/bodyparts3d-intake-candidates.json), bijvoorbeeld linker femur FJ3259, linker korte bicepskop FJ1512M en eerste anterieure ventriculaire tak rechter coronairarterie (FJ2671/FJ2673/FJ2677). Deze kandidaatmapping is een reproduceerbare teksttranscriptie, niet verificatie van fysieke OBJ-bestanden, en blijft `NOT_DOWNLOADED`. Test de manifestcontracten met `node --test prototype/test/bodyparts3d-intake.test.mjs`.

**Belangrijke gaten:** zoekacties op de tekstcatalogus voor sciatic, median, ulnar, radial, femoral en vagus nerve leverden geen overtuigende match voor de afzonderlijke perifere zenuw op; een zoekresultaat kan onvolledig zijn, dus markeer ze als onopgeloste bronmapping. Geen zenuwbaan uit aderen of generieke modellen afleiden. Vrouwelijke brongeometrie voor iedere versterkte structuur blijft een afzonderlijke gap. Een mannelijke mesh mag niet stilzwijgend als onafhankelijk vrouwelijk anatomisch model doorgaan, ook niet wanneer een generieke mapping of warp later technisch mogelijk blijkt.

## 3. Human Reference Atlas (HuBMAP) — werkelijke variant-specifieke referentie-assets en kennis

De [officiële referentiebibliotheek](https://humanatlas.io/3d-reference-library) biedt GLB-modellen met ontologiekoppeling. De onderliggende Visible Human bronnen betreffen mannelijke en vrouwelijke referentielichamen. De bibliotheek vermeldt voor HRA v2.2 1.295 ontologisch gelabelde 3D-structuren verdeeld over 71 objecten; de huidige pagina toont editie v2.5, dat is niet automatisch dezelfde noemer. Ontologieën: FMA en UBERON; GLB-node-crosswalk via de HRA LOD-server. [Licentieverklaring referentieobjecten](https://humanatlas.io/3d-reference-library?organ=All+Organs&version=10): CC BY 4.0, zonder garantie. Dit is een bronverklaring, geen vrijgave van onze afgeleide assets of anatomische nauwkeurigheid.

De actuele bronoverzichtstabel vermeldt onder andere de volgende getallen per referentieobject (geen onafhankelijk getelde meshes):

| 3D-reference object | Mannelijke variant | Vrouwelijke variant |
|---|---:|---:|
| Blood vasculature | 123 | 125 |
| Brain | 108 | 108 |
| Spinal cord | 31 | 30 |
| Respiratory system | 71 | 70 |
| Left/right knee (per zijde) | 16 | 16 |
| Pelvis | 24 | 24 |
| Integumentary system layer | 6 | 21 |

Bron: [3D Reference Object Library](https://humanatlas.io/3d-reference-library). Broncounts zijn geen einddekking; sommige records herhalen dezelfde geometrie of zijn niet de structuren die wij functioneel nodig hebben. Download later uitsluitend afzonderlijke versiegebonden digitale objecten + matchende metadata, niet alle releases/varianten blind. De primaire bron levert voor deze bekeken tabel geen lokaal gecontroleerde bytes; assetgroottes en triangle counts zijn `NOT_RUN`.

### Bloedvaten: eerste verrijkingsproef op echte GLB's

De [HRA-VCCF-pagina](https://humanatlas.io/vccf) (editie 11, v2.5) linkt beide Blood Vasculature GLB's v1.3, CSV-organ-crosswalk v1.6, geometry v1.2 en ASCT+B blood vasculature v1.10; ook lymph vasculature v1.5, muscular system v1.4, peripheral nervous system-to-organ crosswalk v1.1 en skeleton v1.3. Zie de [female asset metadata v1.3](https://lod.humanatlas.io/ref-organ/blood-vasculature-female/v1.3/) en de primaire [Scientific Data-publicatie](https://doi.org/10.1038/s41597-023-02018-0). VCCF vermeldt arteriële/veneuze vertakkingsrelaties, anastomosen, microvasculatuur, geometrische waarden en voorzien/afvoeren van anatomische structuren. De licentie op de VCCF-pagina is CC BY 4.0.

**Voorstel:** HRA-import levert variant-specifieke vaten en een afzonderlijke directed graph met evidence, richting en herkomst; ledger maakt onderscheid tussen 3D-mesh, geverifieerde topologische relatie en niet-gemodelleerde microstructuur. JavaScript mag alleen relaties tonen uit gecontroleerde crosswalk/graph, nooit aannemen dat twee overlappende 3D-objecten verbonden zijn. Verifieer HRA–BodyParts3D registratie per variant met landmarks, eenheden, assen, referentiepose en gemeten restafwijkingen. Bij niet-plausibele fit: toon zelfstandig deelmodel met eigen schaalcontext. Geen morfologische of bloedstroomsimulatieclaim uit de VCCF-tabellen alleen. Betreffende CSV's dienen niet als bewijs dat alle PNS-spieren/skeletitems daadwerkelijk 3D-meshes hebben.

## 4. Perifere zenuwen — grootste uitbreidingslacune

De HRA [ASCT+B-tabellen](https://humanatlas.io/asctb-tables) en PNS-organ-crosswalk leveren een concrete semantische inventaris om de gewenste zenuwstructuren en relaties vast te leggen. Een tabel of ontologie is geen 3D-asset. Voeg ontbrekende zenuwen toe aan het afmaakledger, met afzonderlijke statussen voor label/relaties, traject, mesh en anatomische review.

### SPARC / REVA — werkelijke 3D-representatie van de nervus vagus

De [SPARC-documentatie over SSV-scaffolds](https://docs.sparc.science/docs/subject-specific-vagus-ssv-scaffolds) beschrijft verwerking van realistisch menselijk brononderzoek naar subject-specifieke volumetrische zenuwmodellen, met documentatie van variatie, vertakkingen, anatomische landmarks, fascikels en drie coördinatenvelden. Er bestaan WebGL-, STL-, VTK- en MBFXML-exportpaden. Het is een andere geometrieklasse dan een oppervlakkige GLB met stabiele node-ID's; een STL alleen bevat niet noodzakelijk semantiek. Gebruik, indien toegestaan, de data/metadata gekoppeld aan een vaste datasetversie en een reproduceerbare export, niet gedownloade viewer-screenshots of willekeurig geschetste routes.

Concrete kandidaten:

- [Scaffold map — Human vagus nerve, DOI 10.26275/gviz-vwjx](https://doi.org/10.26275/gviz-vwjx), in het [officiële SPARC-seminar](https://sparc.science/news-and-events/events/sparc-seminar-series-todd-levy-ms-and-mabelle-lin-phd) gelinkt bij onderzoek in 2026. De DOI-landing redirectte naar dataset 426/version/5 maar was met de bronbrowser niet toegankelijk. De licentie, distributievoorwaarden, exacte versie-inhoud en bestandsgroottes zijn daarom **onbevestigd**.
- [Human whole-body with embedded organs, DOI 10.26275/YIBC-WYU2](https://doi.org/10.26275/YIBC-WYU2), dataset 156/version 1 volgens [officiële SPARC datasetcitatie](https://docs.sparc.science/v1.0/docs/sparc-dataset-citations). Ook daar was de individuele landing niet bereikbaar; bestandsgrootte en licentie onbevestigd.
- [SPARC Maps](https://docs.sparc.science/docs/introduction-to-maps) onderscheidt 2D-connectivitymaps, whole-body scaffold en organ scaffolds; [Data & Models](https://docs.sparc.science/docs/data-models) koppelt de afzonderlijke modellen aan DOI en individuele licentie. Alleen een model met aantoonbare toestemming, structuur-ID's, variant, geometrie en gelokaliseerde bronrelaties kan in de distributie komen.

Gebruik SPARC pas na scope/assetlicentie- en bestandinspectie. Ook wanneer nervus vagus slaagt, zijn medianus, ulnaris, radialis, femoralis, ischiadicus, plexus brachialis/lumbosacralis en overige zenuwtakken afzonderlijk afmaakwerk. Mogelijke regionale auteurbron: [University of Dundee CAHID op Sketchfab](https://sketchfab.com/anatomy_dundee/models) toont voorbeelden van craniale en perifere zenuwen. De [Cervical triangle/Erb's point](https://sketchfab.com/3d-models/posterior-cervical-triangle-and-erbs-point-42c90b113f9544758577308c7c8465fb) is volgens auteurmetadata een 917.500-triangle educatief model, met auteursvermelding en NoAI-markering; download- en herdistributierechten waren niet aangetoond. Daarom **niet** als ingestbron gebruiken zonder expliciete licentie en eventuele toestemmingen. Bronmodel niet naar generatieve tools sturen.

## 5. Z-Anatomy — op papier aantrekkelijk, licentieblokkade

Het officiële [Models-of-human-anatomy repository](https://github.com/Z-Anatomy/Models-of-human-anatomy) biedt een mannelijke Blender-template (geen direct gereviewde GLB). De [bronREADME](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/Readme.md) noemt CC BY-SA 4.0 en afgeleide BodyParts3D CC BY-SA 2.1 Japan, maar daarnaast bijvoorbeeld modellen van het binnenoor en nier met NC-licenties, en meerdere auteurs. Bestandsgrootte, exacte actuele objectaantallen en per-object provenance zijn niet geverifieerd. Credits alleen lossen de gemengde rechten niet op.

Op de [officiële repository-issue #12](https://github.com/Z-Anatomy/Models-of-human-anatomy/issues/12) stelde de repo-eigenaar op 21 oktober 2026 dat de code van een app die het model leest open beschikbaar gemaakt moet worden; de vraag naar de precieze objecten uit de NC-nierbron en toepasselijkheid op onafhankelijk geschreven viewer bleef in de geraadpleegde discussie open. Dit is een gerapporteerde bronpositie, geen juridische uitspraak over CC BY-SA. Ook een publieke repository van ons project maakt niet automatisch NC-objecten toegestaan. **Besluit:** geen Z-Anatomy asset importeren/verspreiden voordat onafhankelijke rechtenreview en objectherkomst zijn opgelost, inclusief toepasselijke share-alike-voorwaarden en discussie rond app-code. Directe BodyParts3D en HRA eerst benutten.

## 6. Concrete gefaseerde ingest en gezamenlijke vrijgave

1. **Inventaris en rechten (G0):** anatomical-domain owners stellen per systeem en regio vereiste granulariteit vast, HRA/FMA/UBERON termen koppelen zonder fuzzy automerge. Archiveer release-ID, officiële download-URL, licentietekst, auteur/attributie, assettype, verklaarde modelvariant, bronpose, bestandsgrootte en SHA-256. Geen onbekende licentie in runtime. Bronmanifest is eigenaar van provenance; de app gebruikt alleen gecontroleerde afgeleiden. Alle doellijstrijen krijgen eigen bewijsstatus; ook ontbrekende geometrie telt mee.
2. **Corpusproef over vier domeinen (G1):** selecteer tegelijk de geverifieerde botten (voet/hand/been), diepe spieren en spierkoppen (arm/been), een HRA-vaatboom plus corresponderende BP-takken (arm/borst) en een gelicenseerde SPARC-zenuwscaffold of een formeel blocker-ticket. Geen prioritering uitsluitend op schouder. Bevestig aanwezigheid van echte objecten, exacte ELEMENT-mapping, schaal, zijde, anatomische oriëntatie, vertices/faces, normale richting, oorsprong en ruimtelijke fit. Test beide varianten waar beschikbaar; onbeschikbaarheid is een gap, geen verwisselbare asset.
3. **Gecontroleerde GLB-export:** exporteer per systeem/regio en detailniveau; behoud origineel bronbestand en side-/variantspecifiek canonical ID, format-ID/nodenaam en bronmapping. Gebruik `raw source → immutable manifest → normalized geometry → reviewed GLB LOD0/1/2`. Een COMPOUND-ID kan naar meerdere ELEMENT-nodes verwijzen; bij selecteren één canonieke semantische context, geen dubbeltellingen. HRA- en SPARC-importers zijn losse adapters, vanwege verschillende dataformaten en coördinatenstelsels. Geen runtime-download, externe URI of automatisch vervangen bron. Run Khronos glTF Validator; controleer bekende hash, GLB-container, decode, bounds/transforms, vertex- en triangle counts, mapping en foutcodes.
4. **Prestatie en interactie (G2/G3):** laad overzicht eerst, stuur verfijnde LOD's alleen op regio/structuurvraag; bench werkelijke GPU-geheugen, netwerkbytes, decode, draw calls, frame time en selectie op desktop en mobiel. Behoud stabiele ID bij LOD-wissel; thin-structure picking en zichtbaarheid/isolatie/focus/reset afzonderlijk toetsen. Selectie moet ook via lijst/keyboard werken; vaten/zenuwen met overlappende geometriedelen niet verbergen door verkeerde clipping of depth-instellingen.
5. **Doorrollen naar elk onderdeel (G4):** breid de bron-specifieke kandidaatledger uit naar de echte doelcatalogus. Regioteams (hoofd/hals, romp, bovenste/onderste ledematen, bekken) en systeemteams werken op dezelfde manifold van ID's, mapping, lagen, inhoud, vijf modi/twee talen en QA. Geen hele lichaamsclaim op basis van één geslaagde detailproef. Ieder ontbrekend object, variant, relatie, bronlicentie of ondermaatse geometrie wordt een ticket met eigenaar, reproduceerbare test, onafhankelijke reviewer en hercontrole. De laatste open rij bepaalt het volledige publicatiemoment.

**Eerstvolgende actie:** licentie-eigenaar en technical-art squad bereiden een kleine direct-DBCLS- en HRA-exportproef voor met bovenstaande bekende IDs, gelijktijdig met het oplossen van perifere zenuwbronrechten. Bewaar de bestaande kandidaatviewer totdat deze aanvullingen daadwerkelijk zijn getest. Zie ook [kwaliteitspoort](../MODEL-QUALITY-CONTRACT.md), [afmaakbacklog](../MODEL-GAP-BACKLOG.md) en [integratielab](README.md).
