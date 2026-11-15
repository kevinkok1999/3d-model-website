# Bouw één atlas met aantoonbare modelkwaliteit

**3D Universe — geïntegreerd technisch onderzoeksrapport, 15 november 2026.** De aanbevolen architectuur is een zelfstandige anatomische assetpipeline, één gedeelde browserengine en een releasecontrole per daadwerkelijk gemodelleerd lichaamsdeel. Open Anatomy 3D is geschikt als eerste gecontroleerde ontwikkelkandidaat; voor hoogwaardige en fijnmazige lichaamsgeometrie onderzoeken we vervolgens directe BodyParts3D-data en aanvullende, traceerbare orgaanmodellen. De schouder bewijst uitsluitend de technische pipeline. Het eindproduct mag geen verzameling uitstekend uitgewerkte voorbeeldstructuren en oppervlakkige reststructuren worden: alle opgenomen regio's en systemen moeten dezelfde aantoonbare kwaliteitsvloer halen, en ontbrekende anatomie wordt concreet afmaakwerk. Onderzoek, eerste catalogusaudit en synthetische tests zijn uitgevoerd; de werkelijke anatomische GLB's zijn nog niet geïmporteerd, gerenderd of vakinhoudelijk gevalideerd.

## 1. De eerste bron is bruikbaar voor technische proeven, niet voor een volledige atlas

### Open Anatomy 3D als ontwikkelkandidaat

De onafhankelijke modelpackage biedt twee GLB-bestanden en een aparte catalogus. Op vastgepinde commit `c050aa7b1bc56ceed668199b01ea017341928d7b` bedraagt de geregistreerde bestandsgrootte 7.614.076 bytes (mannelijke variant) en 8.134.732 bytes (vrouwelijke variant). De auteur beschrijft circa één miljoen driehoeken per lichaam, Meshopt-compressie, gegroepeerde BodyParts3D-geometrie en gewrichtshotspots die geen fysieke mesh zijn. De vrouwelijke variant bevat samengestelde en vervormde referentiegeometrie met specifieke HRA-organen; ze is niet een onafhankelijke klinische scan. ([Repository en modeldocumentatie](https://github.com/MervinR07/open-anatomy-3d), [vaste bronrevisie](https://github.com/MervinR07/open-anatomy-3d/tree/c050aa7b1bc56ceed668199b01ea017341928d7b), [attributie](https://github.com/MervinR07/open-anatomy-3d/blob/main/ATTRIBUTION.md)).

De echte catalogus is opgehaald en de Git-blobhash komt overeen met de upstream-repository. De uitgevoerde audit geeft onderstaande resultaten, vastgelegd in [model-audit/README](../../model-audit/README.md). ([Gepinde catalogus](https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/packages/open-anatomy-3d/catalog.json)).

| Kandidaatinventaris | Aantal |
|---|---:|
| Unieke catalogusrecords | 147 |
| Mannelijke variant: verwachte meshes / hotspots | 128 / 12 |
| Vrouwelijke variant: verwachte meshes / hotspots | 133 / 12 |
| Variant × structuur-records in de audit | 285 |
| Dubbele keys of schemafouten in catalogus | 0 |
| Synthetische ontwikkeltests geslaagd | 9 |
| Volledig door reviewers afgetekende structuurrijen | 0 van 285 |
| Open checks (19 per structuurrij) | 5.415 |

De huidige coverage-gate faalt dus zoals verwacht; dit is geen bewijs van volledige lichaamsdekking. De 147 kandidaatlabels vallen uiteen in skelet (28), gewrichtshotspots (12), spieren (41), organen (41), vaten (22), zenuwstelsel (2) en huid (1). Vooral grove categorieën en ontbrekende substructuren vergen afzonderlijke doellijsten. De aantallen zijn geen einddoel; elke domeinsquad werkt samen met de regio-eigenaren om ook anatomie buiten deze kandidaten te inventariseren, inclusief afzonderlijke botten, banden, pezen, orgaansubstructuren, vertakkingen, zenuwtrajecten en gevalideerde weefselmodellen.

`deltoid_l` en `deltoid_r` bestaan als cataloguskeys. De `shoulder_l/r`-keys zijn ankers. Werkelijke node- en meshmapping zijn onbevestigd: de bronconnector kon de binaire bestanden niet leveren. Een geslaagde cataloguscontrole bewijst geen meshkwaliteit. De auditregels en synthetische fixtures zijn ontwikkelgereedschap, geen anatomische assets of bewijs van werkende 3D-weergave.

### BodyParts3D als langetermijnbron

Directe BodyParts3D 4.0-archiefdata zijn de voorkeurskandidaat voor eigen gedetailleerde structuren. De officiële database biedt vorm- en positiegegevens van een volwassen mannelijk referentielichaam, met FMA-concepten en afzonderlijke representatie-ID's. Het archief biedt onder meer OBJ-bundels van 136 MB en 62 MB met 99% polygonreductie. De licentie werd op 27 februari 2025 gewijzigd naar CC BY 4.0; oude bronheaders en historische documenten vermelden CC BY-SA 2.1 Japan. Volg de huidige officiële licentie voor rechtstreeks daaruit afkomstige assets, maar voer een afzonderlijke beoordeling uit voor iedere oude kopie, export en afgeleide. ([Databasebeschrijving](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html), [download](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html), [licentie](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), [updatehistorie](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/update.html)).

De browserimplementatie Human Atlas rapporteert 2.234 individuele meshes, 3.432 FMA-concepten, vijftien systemen, circa 33 MB gecomprimeerde geometrie en 2,29 miljoen driehoeken. Dit is een concrete onderzoeksreferentie voor batching, afzonderlijke picking en exploded views, geen eigen gemeten resultaat en geen bewijs voor prestaties op fysieke mobiele toestellen. ([Human Atlas README](https://github.com/ashemag/human-atlas), [attributie](https://github.com/ashemag/human-atlas/blob/main/public/ATTRIBUTION.md)).

### HRA, Z-Anatomy en alternatieve referenties

De Human Reference Atlas biedt CC BY 4.0 3D-referentieorganen met eigen versies, coördinatenkader en reviewproces. Deze kunnen de diepere orgaan- en weefselscènes verrijken, maar rechtvaardigen niet automatisch registratie met een bestaand lichaam. ([HRA 3D-library](https://humanatlas.io/3d-reference-library), [onderzoekspublicatie](https://pmc.ncbi.nlm.nih.gov/articles/PMC11978508)). Z-Anatomy en Anatomy Atlas 3D zijn technische inspiratie, geen ongecontroleerde importbronnen. Z-Anatomy vermeldt expliciet niet-commerciële derdepartijassets, waaronder binnenoor- en niermodellen; Anatomy Atlas 3D maakt onderscheid tussen MIT-appcode en ShareAlike-modeldata. ([Z-Anatomy licenties](https://github.com/Z-Anatomy/Models-of-human-anatomy#license), [Anatomy Atlas 3D-attributie](https://github.com/Grypa-JJ/anatomy-atlas-3d/blob/main/ATTRIBUTION.md)).

Besluitvoorstel: pin en beoordeel iedere bron afzonderlijk. Zonder passende licentie, herkomst, wijzigingshistorie, attributie en modelreview blijft een kandidaat in quarantaine. De eerste kleine catalogus is een vertrekpunt voor een gap-analyse, niet de definitieve eindnoemer. Voeg hoogwaardige ontbrekende datasets toe, herstel geometrie onder vakreview of laat ontbrekende onderdelen gecontroleerd vervaardigen; gebruik geen verzonnen vervangende anatomie.

## 2. Eén renderer behoudt identiteit tijdens iedere interactie

Kies Three.js/WebGL2 via React Three Fiber voor de eerste runtime, met eigen renderer-onafhankelijke contracten. Three.js gebruikt WebGL2; WebGL1 wordt sinds r163 niet ondersteund. R3F 8 hoort bij React 18, R3F 9 bij React 19. Pin de compatibele Next.js-, React-, Three- en Drei-versies via eigen spike en lockfile, niet door ongecontroleerd de nieuwste versies te combineren. WebGPU is een afzonderlijk onderzoeks- en kwaliteitsprofiel; Three's WebGPURenderer kan naar WebGL2 terugvallen, maar dat is geen bewijs van volledig gelijke effectondersteuning. ([WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html), [R3F-installatie](https://r3f.docs.pmnd.rs/getting-started/installation), [R3F-migratie](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)).

De voorgestelde architectuur gebruikt één Canvas, één canonical selectie, één cameratoestand en één gedeelde set zichtbare lagen. Wisselen tussen de vijf modi of NL/EN remount het lichaam niet. De 3D-adapter beheert rendering, assets, camera, selectie, effecten en disposal. De applicatielaag beheert routes, gevalideerde content en dezelfde toegankelijke HTML-structuurboom. Selectie via muis, touch, toetsenbord of lijst verloopt via hetzelfde canonical ID. Ingebouwde technische Three-layers zijn slechts 32 bits; anatomische systeemstructuur blijft in de domeindata. ([R3F Canvas](https://r3f.docs.pmnd.rs/api/canvas), [Three Layers](https://threejs.org/docs/pages/Layers.html)).

Picking gebruikt uitsluitend actuele, zichtbare, gemapte objecten en het dichtstbijzijnde geldige raakpunt; paneeloverlays, drag/pinch, verborgen of weggeclipte stukken mogen geen schijnselectie veroorzaken. Ondersteun anatomisch links/rechts, focussen, pannen, zoom, laagfilters, isolatie en betrouwbare reset. Evalueer BVH/GPUpicking pas wanneer echte metingen een bottleneck aantonen. Highlight combineert een rustige, consistente selectiecontrast met label; niet alleen kleur. ([Raycaster](https://threejs.org/docs/pages/Raycaster.html), [R3F-events](https://r3f.docs.pmnd.rs/api/events), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html)).

Later: exploded view met reproduceerbare transforms vanuit de onveranderde pose; doorsnedes met hetzelfde wereldvlak voor render en picking; gecontroleerde transparantie, overlays en outlines. Niet alle effecten zijn vanzelf verenigbaar: controleer iedere combinatie in een exemplaar-scène en iedere beloofde runtimevariant. Een geometrische doorsnede van een oppervlaktemodel is geen bewezen interne weefselweergave. ([Three Material](https://threejs.org/docs/pages/Material.html), [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [OutlinePass](https://threejs.org/docs/pages/OutlinePass.html)).

## 3. De assetpipeline behoudt detail, schaal en selecteerbaarheid

Werk offline vanuit onveranderlijke bronbestanden met SHA-256, bronversie en rechtenbewijs. De voorgestelde route is: veilige intake → Blender-master en inventarisatie → gecontroleerde correcties → canonical mapping → per-structuur LOD → GLB-export/compressie → validator, decode, anatomische review en benchmark → immutable distributiemanifest. glTF specificeert meters, radialen en een rechtshandig assenstelsel (+Y boven, +Z voor, −X rechts); objectnamen zijn niet gegarandeerd uniek. Blender kan custom properties exporteren naar glTF `extras`. Gebruik daarom stabiele structuur- en component-ID's, plus een aparte mapping die aan het uiteindelijke artifact-hash gekoppeld is. ([Khronos glTF-specificatie](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), [Blender-export](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html)).

Herstel geometrie per structuur. Identificeer onder meer ongeldige vertices, dubbele faces, afwijkende normals en onbedoelde intersecties. Vul geen openingen zonder anatomische beoordeling: een lumen of open rand kan intentioneel zijn. Bescherm dunne vaten, zenuwtakken, contouren en aanhechtingen. Vergelijk iedere afgeleide master en LOD met de bron op oppervlakteafwijking, landmarks, bounding box en componenten; definieer de tolerantie vooraf per anatomische klasse, niet één arbitrair percentage voor het volledige lichaam. ([Blender Clean Up](https://docs.blender.org/manual/en/latest/modeling/meshes/editing/mesh/cleanup.html), [glTF Transform simplify](https://gltf-transform.dev/modules/functions/functions/simplify)).

Laat een snelle overview, een balanced en een detailniveau dezelfde canonieke ID's en wereldpositie behouden. Laad detailregio's progressief wanneer de gebruiker ze verkent. Merge of instance alleen wanneer structurele selectie, isolatie en laagmapping aantoonbaar intact blijven. Een mobiele weergave mag lichte overzichtsgeometrie gebruiken, maar moet de goedgekeurde detailroute en volledige gecontroleerde kennis bieden. Zorg voor een consistent medisch-didactisch materiaalpalet, goede contourleesbaarheid, rustige verlichting en redundant selectielabel.

Vergelijk ongecomprimeerde baseline, Meshopt en Draco op dezelfde geometry; meet transfer, decode, GPU-upload, frame-time en kwaliteit. KTX2 is alleen nodig wanneer textures echt een bottleneck zijn. Three GLTFLoader biedt aparte Meshopt-, Draco- en KTX2-loaderinterfaces, die voor de gepinde runtime moeten worden getest. ([GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [Meshopt](https://gltf-transform.dev/modules/functions/functions/meshopt), [Draco](https://gltf-transform.dev/modules/functions/functions/draco), [KTX2](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_texture_basisu/README.md)).

Iedere export krijgt eigen hash, mapping, bron/rechten, gebruikte extensies, toolversies, wijzigingslog, meetgegevens en review. Garandeer geen bitidentieke encode over ieder platform: KTX-Software documenteert mogelijke verschillen. Bewaar de exacte releasebytes, valideer nieuwe builds opnieuw, en maak rollback mogelijk. Khronos-validatie zonder fouten is verplicht, maar bewijst uitsluitend technische conformiteit. ([KTX-releases](https://github.com/KhronosGroup/KTX-Software/releases), [glTF Validator](https://github.com/KhronosGroup/glTF-Validator)).

## 4. Anatomische juistheid en verdieping gelden voor ieder onderdeel

Maak een door vakexperts gereviewde doelcatalogus met taalneutrale ID, modeltype, anatomische zijde, regio, systeem, relaties, NL/EN-benamingen en versiegebonden FMA/TA2-verwijzingen. FMA biedt ontologie, TA2 vakterminologie; hun licenties verschillen per bronversie en de IFAA vermeldt CC BY-ND voor online publicaties. Toets rechten vóór bulkimport of vertaling. ([FMA-repository](https://github.com/uw-sig/FMA), [FMA-toegang](http://si.washington.edu/info-books/project-details/foundational-model-of-anatomy/accessing-the-fma-ontology), [FIPAT](https://ifaa.net/2022/08/12/report-of-the-federative-international-programme-on-anatomical-terminologies-fipat)).

De volgende releasevloer geldt per structuur en variant: traceerbare rechten; onderbouwde identiteit en juiste zijde/positie; passende geometrie of eerlijk aangeduide hotspot; gereviewde LOD; betrouwbare interactie; toegankelijke uitleg; anatomische relaties, functie en relevante verdieping; tien goedgekeurde modus-/taalrecords (vijf modi × NL/EN). Niet-relevante toepassingen krijgen een gemotiveerde verklaring, nooit generieke opvulling of klinische claims. Maak expliciete schaalovergangen naar weefsel-, cel- of organelmodellen wanneer dat brongetrouw kan.

Statische geometrie, schematische animatie, gevalideerde kinematica en dynamische simulatie zijn verschillende bewijsniveaus. Begin met gecontroleerde statische atlas en één offline geverifieerde schematische bewegingsillustratie; voeg later brongebonden rig en referentietrajecten toe. ISB beschrijft reproduceerbare lokale gewrichtsframes; OpenSim levert referentiemodellen die voor specifieke scopes kunnen worden gebenchmarkt. Ongevalideerde skinning, spierkleur of meshvervorming bewijst geen kracht, belasting of klinische beweging. ([ISB-standaard](https://pubmed.ncbi.nlm.nih.gov/15844264), [OpenSim Upper Extremity Model](https://opensimconfluence.atlassian.net/wiki/spaces/OpenSim/pages/53087772/Upper+Extremity+Model), [Hicks et al. validatie](https://pmc.ncbi.nlm.nih.gov/articles/PMC4321112)).

## 5. Prestaties worden gemeten, zonder verlies van inhoud of identiteit

Onderstaande **voorlopige ontwerpbudgetten**, niet gerealiseerde meetresultaten, sturen de eerste benchmarks. Meet totale renderpasses, p95-frame- en selectievertraging, koude/warme download, decode, upload, geheugenraming en gebruikersroute. Three `renderer.info` telt resources, maar geeft geen exacte VRAM-bytes; browsermetingen en eigen artifactstatistieken vullen dit aan. ([Three WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [MDN WebGL-richtlijnen](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices), [Chrome Performance](https://developer.chrome.com/docs/devtools/performance/reference)).

| Profiel | Initiële 3D-transfer | Actieve triangles / calls | Doelframerate / p95 |
|---|---:|---:|---:|
| Lite telefoon | ≤2 MiB | ≤120k / 100 | ≥30 fps / ≤50 ms |
| Standaard mobiel | ≤4 MiB | ≤350k / 180 | ≥30 fps / ≤50 ms |
| Desktop | ≤6 MiB | ≤1M / 350 | ≥60 fps / ≤25 ms |
| Desktop detail (regio, G3) | extra ≤12 MiB | ≤2M / 500 | ≥60 fps / ≤25 ms |

Streef naar maximaal 150 ms p95 voor lokale selectiefeedback. Voer metingen uit op fysieke Android-, iPhone/iPad-, geïntegreerde desktop- en geschikte discrete GPU-configuraties; leg browser, OS, resolutie, DPR, netwerk, cache en bronhash vast. Minimum drie koude en warme runs, 60 seconden actief draaien, 15 minuten navigeren en herhaalde unload-cycli. Maak een warm baseline-profiel per asset en voorkom resourcelekken. R3F ondersteunt rendering op aanvraag; externe ingeladen primitives vereisen eigen cleanup. ([R3F Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [R3F Objects](https://r3f.docs.pmnd.rs/api/objects), [Three disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html)).

Bij overbelasting eerst minder pixels/effecten en onnodige achtergrondgeometrie, niet andere anatomie tonen. Bij WebGL-contextverlies blijven selectie, tekst en relaties toegankelijk; recreëer resources gecontroleerd of geef HTML-fallback zonder eindeloze herlaadlus. Tests omvatten corrupte assets, decoderfouten, time-outs, offline, resize, cacheversies en contextverlies. ([MDN context restoration](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextrestored_event)).

## 6. Teams sluiten alle open gaten voordat de atlas wordt vrijgegeven

| Werkstroom | Verplicht bewijs vóór overdracht |
|---|---|
| Bron & rechten | Doelcatalogus per systeem/regio/zijde, scope en expliciete GAP-tickets, licentie- en hashmanifest |
| Technical Art | Goedgekeurde geometry/LOD, transform, landmarks, mapping, versieerbare exports |
| Engine | Reproduceerbare GLB-import, selectie, layer/focus/reset, effecten, lifecycle |
| Anatomie & biomechanica | Onafhankelijke identiteit-, geometrie-, relatie- en motion-review |
| Content & lokalisatie | Tien beoordeelde modus/taalrecords per toepasselijke structuur, gecontroleerde verdieping |
| Performance & QA | Per-ID tests, device-traces, toegankelijkheid, foutafhandeling en defectrapporten |
| Integratie | Afmaakplanning, releasegate, versieoverzicht, ADR's en onafhankelijke signoffs |

Verdeel het werk over hoofd/hals, romp, bovenste en onderste ledematen en bekken. Organiseer parallelle domeinsquads voor alle betrokken systemen, en sluit de achterblijvende regio of het minst gedekte systeem als eerste. De huidige zenuwcategorie bevat slechts twee catalogusgroepen, huid één; dat is een bronlacune, geen eindambitie. Bepaal met deskundigen de volledige beoogde anatomische doelpopulatie en vergelijk die met werkelijke meshes, hotspots en content. ([Gepinde catalogus](https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/packages/open-anatomy-3d/catalog.json)).

Gebruik de bestaande G0–G4-poorten: G0 import/licentie/identiteit en één echte technische schouderselectie; G1 complete basisviewer, mapping en layer/focus/reset; G2 gereviewde inhoud en educatieve animatie; G3 effecten en echte detailmodellen; G4 verdere schaal- of vakmodule. Na ieder ontwikkelbewijs volgt verbreding naar **alle** structuren van de goedgekeurde eindscope. Elke ontbrekende structuur, mesh, relatie, vertaling, modus, toegankelijke route of onvoldoende detail krijgt een ticket met eigenaar, blokkadereden, review en hertest. `NOT_RUN`, `GAP`, `BLOCKED` en `FAIL` zijn nooit publicatiegoedkeuring. De eerste coverage-gate en ledger hebben 285 variantrecords; deze noemer moet meegroeien met de echte doelcatalogus. Een machine-pass zonder onafhankelijk bewijs is onvoldoende. Er komt geen 'volledige atlas'-release voordat alle aangekondigde onderdelen voldoen; een beperktere release vereist expliciet eigenaarsbesluit en een eerlijke benaming. Zie [uniforme afmaakregel](QUALITY-CONTRACT.md) en [auditgereedschap](../../model-audit/README.md).

## Conclusie

De waarde van deze architectuur is dat de anatomische bron onafhankelijk van de 3D-engine kan verbeteren, zonder verlies van dezelfde selectie, bediening of gecontroleerde inhoud. De eerste werkende schouder is de test of de keten klopt. Vervolgens bepaalt de laagste kwaliteit of het geheel releasegeschikt is; nooit de mooiste regio. De eerstvolgende blokkade is daadwerkelijke verwerving en decode van gelicenseerde geometrie in een gecontroleerde ontwikkelomgeving. Daarna volgen echte geometrie-audit, engine-spike, device-traces en onafhankelijke vakreview. Tot die bewijzen er zijn, blijft het project technisch voorbereid, niet anatomisch voltooid.


## Uitvoerbare vervolgdocumenten

- [Uniform kwaliteitscontract](QUALITY-CONTRACT.md)
- [Eerste afmaakbacklog](GAP-BACKLOG.md)
- [Bronmodelonderzoek](research/01-modelbronnen.md)
- [Renderengine](research/02-renderengine.md)
- [Technische assetpipeline](research/03-assetpipeline.md)
- [Anatomie en biomechanica](research/04-anatomie-biomechanica.md)
- [Prestatie en QA](research/05-prestatie-qa.md)
