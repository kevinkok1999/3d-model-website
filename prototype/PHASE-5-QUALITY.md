# Fase 5 — kwaliteitscontrole voor 14 afzonderlijke HRA-bronreferenties

**Status: releasechecklist, geen afgetekende release.** Deze fase voegt afzonderlijke onderzoeksreferenties toe, niet één geregistreerd menselijk lichaam, geen volledige atlas en geen medisch hulpmiddel. De checklist is gebaseerd op de bestaande viewer, de vastgepinde inventaris `model-audit/hra-expanded-candidates.json`, [fase 4](PHASE-4.md), de [longbronblokkade](HRA-LUNG-BLOCKER.md) en het [uniforme kwaliteitscontract](../docs/model/QUALITY-CONTRACT.md). De 14-modelintegratie en browserproef moeten nog apart worden aangetoond. Gebruik deze checklist niet als bewijs van geslaagde tests.

## 1. Afgebakende bronset en bewijsnoemers

De nieuwe technische kandidaat bestaat uit zeven referentiefamilies met elk een mannelijke en vrouwelijke bronvariant. Onderstaande getallen zijn **metadata van de nieuwe manifestpin**, geen nieuwe geometry-/browsermetingen. `V/M` betekent vrouwelijke/mannelijke referentievariant, niet twee willekeurige representatieve lichamen.

| Bronfamilie | Versie V/M | Crosswalkrijen V/M | Unieke ID's binnen bron V/M | Bekend bewijs voorafgaand aan integratie |
|---|---|---:|---:|---|
| Bloedvaten | v1.3 / v1.3 | 125 / 123 | 100 / 99 | Fase 4: strikte byte-audit en echte browserproef voor beide; mannelijke metadatacontradictie blijft open |
| Hersenen | v1.4 / v1.4 | 108 / 108 | 58 / 58 | Fase 4: strikte byte-audit en echte browserproef; afgeleide atlasvarianten |
| Hart | v1.3 / v1.3 | 17 / 17 | 17 / 17 | Beide in negen van tien volgende bronnen technisch gepasseerd; nog geen 14-modelviewerbewijs |
| Lever | v1.2 / v1.2 | 23 / 23 | 23 / 23 | Idem |
| Longen | v1.4 / **v1.3** | 70 / 71 | 62 / 59 | V v1.4 technisch gepasseerd; M v1.3 afzonderlijke strikte [bronaudit geslaagd](https://github.com/kevinkok1999/3d-model-website/actions/runs/43742673887); nog geen 14-modelviewerbewijs; M v1.4 blijft BLOCKED |
| Dunne darm | v1.2 / v1.2 | 11 / 12 | 11 / 12 | Beide technisch gepasseerd; bron bevat ook referentie-/meetgeometrie |
| Ruggenmerg | v1.1 / v1.1 | 30 / 31 | 30 / 31 | Beide technisch gepasseerd; specimenverschillen blijven zichtbaar |
| **Totaal kandidaat** | 14 GLB's en 14 CSV's | **384 / 385 = 769** | 600 som over bronnen | Geen soort- of volledige lichaamsdekkingstelling |

Alle GLB-pins samen bevatten 112.403.924 bytes (~112,4 MB; ~107,2 MiB). Eén GLB tegelijk laden en verifiëren, nooit alle 14 modellen vooraf cachen/verwerken; grootste pin = long V, 23.255.188 bytes. De geïnstalleerde kandidaat `open-anatomy-3d` en de afzonderlijke BodyParts3D-experimenten blijven onafhankelijke datasets.

**Noemers die niet optelbaar zijn:** `crosswalkrij` is een benoemde bron-node met ontologie-ID; `directe rij` verwijst uitsluitend naar de eigen mesh-node; `groepsrij` verwijst naar de exacte gecontroleerde afstammende meshes; `mesh-node` is een glTF-instantie, niet noodzakelijk een unieke meshdefinitie of anatomisch concept; `primitive` is rendergeometrie, geen afzonderlijke structuur. Een ontologie-ID kan herhaald zijn voor regio's, zijden, varianten of geometrische vertegenwoordiging. Een groep kan dezelfde mesh-nodes omvatten als direct selecteerbare onderliggende rijen. De som 600 is **niet** het aantal unieke anatomische begrippen over bronnen. Ook een directe meshrij kan referentiegeometrie in plaats van individueel weefsel zijn.

Bij een daadwerkelijke 14-bronnenpass registreert QA de werkelijke mesh-nodes, meshdefinities, primitiven, directe rijen, groepsrijen en overlap per bron uit het nieuwe `audit.json`. Tel die per bewijssoort en vermeld expliciet de noemer. De bekende eerdere totalen (782 nodes / 464 rijen uit fase 4 en 214 nodes / 234 rijen uit de negen volgende geslaagde bronnen) en de afzonderlijke v1.3-longaudit blijven historische metingen, niet de nieuwe gecombineerde 14-bronnenuitslag.

## 2. Harde bron- en grensgevallen

| Risico / bron | Verplichte herkenbare uitleg in beide UI-talen | Actie vóór anatomische vrijgave |
|---|---|---|
| Long M v1.4, `VH_M_hyoid` nul exacte node-matches | M v1.3 = oudere afzonderlijke bronpin; M v1.4 geblokkeerd. Geen stille vervanging; probleem en ontbrekende tongbeen-koppeling blijven open. | Zelfstandige v1.3-audit al gepasseerd; herhaal dezelfde strikte audit binnen de nieuwe 14-bronnenworkflow en bewaar eerdere fout v1.4. Geen alias, CSV-rij verwijderen, gemengde v1.3/v1.4-bestanden of geconstrueerde hyoid. Vraag officiële bronverduidelijking via afzonderlijk geautoriseerd traject. |
| Longen V v1.4 en M v1.3 | Verschillende referentierevisies, geen equivalentieclaim. Strottenhoofd, luchtpijp en hoofdbronchi als afzonderlijke bronnen uitgeplaatst; deze longreferentie is niet het hele ademhalingsstelsel. | Bronparen apart controleren; anatomisch gereviewde vergelijkingsmapping; uitbreidingsregister voor bovenste luchtwegen, ligamenten, vaat- en weefselrelaties. |
| Bloedvaten M v1.3 | Titel/ID/bestand = mannelijke referentie; beschrijving noemt vrouwelijke variant, identificatie onbeoordeeld. | Onafhankelijke bronverificatie bij HRA en bronherkomst-/geometrie-review; geen betrouwbare variantclaim voordat opgelost. |
| Hersenen V/M v1.4 | Afgeleide Allen Brain Atlas-referentie, hersenstructuren gespiegeld/geschaald voor Visible Human; geen onafhankelijke mannelijke/vrouwelijke scans. | Herkomst, variantverschil, oriëntatie, lateralisatie, terminologie en kleine kernen beoordelen; geen conclusies over populatieverschillen. |
| Hart en lever V/M | Referentieorgaan, geen gevalideerde fysiologische simulatie; parallelle vasculatuur kan dezelfde anatomische regio representeren. | Overlap en vaten-/orgaanrelaties onderzoeken; registratie, schaal, pasvorm en identiteit afzonderlijk goedkeuren vóór samenvoeging. |
| Dunne darm V/M | Ook plaats-/meetgidsen in bron (centerline), geen claim dat iedere node een weefselmesh is; labels/spellingen origineel, geen populatienormen. | Classificeer ieder record als anatomisch, context, groep, meetgids of ander type op bronbewijs. Onder andere `VH_F_jejenum` en `VH_M_duodenum_horizonal` exact behouden; gereviewd NL/EN synoniemen alleen als aanvullende metadata, nooit als mesh-alias. |
| Ruggenmerg V/M | V bron meldt zes lumbale wervels; V crosswalk noemt niet het vijfde sacrale segment dat M wel noemt. Specimenverschillen; geen algemene norm en geen bewijs voor perifere zenuwen. | Varianten afzonderlijk auditen en verschillen als gaps/reviewitems registreren; geen synthetische gelijkmaking. |

Bronfeiten komen uit de pin per referentie; bronmetadata en DOI blijven naast het model zichtbaar. Geen klinische ingang, diagnose, fysiologische werking, behandeling of individuele gezondheidsdata. Een technische pass is geen anatomische, medische, juridische of ruimtelijke goedkeuring.

## 3. Technische integratiepoort (P0: geen kandidaat zonder bewijs)

Elke rij wordt onafhankelijk afgetekend door verantwoordelijke en onafhankelijke reviewer. Bewijsvelden: exacte commit, bronrevisie, bestandhash, testrun/artefact, datum, resultaat en open defect. `NOT_RUN`, `BLOCKED` of `FAIL` zijn geen pass.

| Gate | Uitvoerbare acceptatiecriteria | Eigenaar |
|---|---|---|
| INT-01 | Manifest heeft exact 14 unieke bron-ID's, zeven families × twee varianten, juiste bron-URL's, originele versies en byte-/Git-blobpins. M long v1.3 én eigen crosswalk; oude v1.4-pin blijft ongewijzigd. Controleer negatieve manifest- en hashfixtures. | Source engineering + QA |
| INT-02 | Voor alle 14 daadwerkelijke GLB/CSV-paren: exacte verwachte bytes, Git-blob SHA1, gemeten SHA256, GLB JSON/BIN-structuur, buffer/accessor/indexranges, valide meshhiërarchie en exacte case-sensitive CSV-node-identiteit. Geen fuzzy match. Alle 769 rijen behandeld, groep vs directe mesh apart. Niet-ondersteunde compressie/schema of onbekende/ambiguë koppeling blokkeert. | Audit + QA |
| INT-03 | Stage uitsluitend 28 originele bestanden + overeenkomend rapport, na heraudit; geen gedeeltelijke of bestaande output overschrijven. Tijdelijke CI-assets niet naar Git, normale build, publieke URL of artifact voor externe distributie. Auditbewijs/screenshots volgens afgesproken scope. Bij blokkade geen viewer-assets. | Release/CI + rechten |
| INT-04 | Viewer gebruikt de expliciete 14-bronneninventaris in plaats van impliciete `nerves → brain, rest → vessels` uit de oude vier-bronnenviewer. Alle 14 bronlabels tonen correcte familie, variant, revisie, status; expliciete bronwaarschuwingen in NL/EN. Geen verkeerde hart/lever/long/ruggenmerg-benaming. | Frontend + UX |
| INT-05 | Runtime verwacht het volledige nieuwe auditrapport, 14 bewijsrecords en juiste pin voor gekozen bron; ontbrekende of gedeeltelijke bronset, verkeerde SHA of mismatched rapport faalt gesloten. Loading/cancellation/race: oude selectie/audio/geometrie verschijnt nooit bij nieuwe bron; alleen geselecteerde lokale GLB/CSV geladen. Geen upstream-fetch of externe GLB-resources. | Engine + security QA |
| INT-06 | Decode `GLTFLoader` met bronassociaties en volledige eigen indices: precies één relatie naar iedere verwachte source mesh-node/primitive; geen naamheuristiek, geen ID-deduplicatie over bronfamilie. Geselecteerde state bevat bron-ID én lokaal node-index. Broncoördinaten/transformaties ongewijzigd; camera-aslabels blijven +X/-X/+Z/-Z. | Engine + QA |
| INT-07 | Elke werkelijke bronrij (769/769 indien alle pins pass) via HTML-lijst selecteren, isoleren, herstellen en deselecteren. Toets mesh-node-set gelijkheid met audit; controleer directe eigen mesh vs groepsafstammelingen, ook wanneer een mesh-node zelf kinderen bezit. Test focus, fit, reset en bronwissel voor iedere variant. | Engine + onafhankelijke QA |
| INT-08 | Beslis expliciet welke bestanden in tijdelijke CI-viewer zitten; normale `npm run build` zonder bronassets toont eerlijke niet-beschikbaarstatus en nul kandidaatmesh. Controleer build-inhoud en netwerkverzoeken. Geen publieke release op basis van een lokale opstelling. | Release + QA |

## 4. Bediening en visuele kwaliteitsreview (P0/P1)

| Risicogebied | Concrete QA-opdracht | Status uit eerdere fase |
|---|---|---|
| Start en terugweg | Van hoofdlichaam naar HRA, juiste familie/variant kiezen, terug of browser-back, opnieuw openen. Na wissel geen stale details, filters/isolatie volgens gedocumenteerde state. Duidelijke visuele onderscheidbaarheid bronreferentie vs volledige body-atlas. | Vier bronnen getest; alle 14 flows hertest vereist. |
| Bronkeuze en zoekfunctie | Zeven families × V/M, versies zichtbaar. Zoek lange bronlabels, exacte ontology/node-index, dubbele ID, lege uitkomst, group/direct-filter. Toon bronlabel origineel en onafhankelijke gereviewde NL/EN-term als die bestaat; geen vertaling suggereren zonder inhoudsreview. Status, waarschuwing en provenance blijven verbonden aan juiste bron. | Bestaande zoekfunctie is bronlabel/ID, geen gereviewde anatomische NL-zoekindex. |
| Informatieprioriteit | Korte expliciete scope en waarschuwing vóór detail; bronbewijs pas op tweede niveau, niet als vervanging voor educatieve functie-/relatiekaart. Voor referentie-gidsen type en beperking uitleggen. | Bron- en technische gegevens aanwezig; inhoudsgates open. |
| Geometrievisueel | Per bron screenshots van totaalbeeld, ten minste één directe en één groepsisolatie, unieke/tiny/occluded structuren waar aanwezig. Controleer clipping, oorsprong, zichtbaarheid, contrastmateriaal, schaduwwerking, leesbaar onderscheid selectie, transparantie, overlap, lege of onzichtbare nodes. Geen broncoördinaten verplaatsen. | 4 eerdere bronnen echte screenshots; 10 uitbreidingscases en referentie-specifieke randgevallen open. |
| Handmatige 3D-picking | Per bron minstens drie zichtbare overlayvrije objecten (grote, kleine/smalle, deels occludeerde), camera twee richtingen/zoom, reset; reproduceerbaar pointerpixel en verwacht bron-ID/node. Na orbit, scroll, DPR-/resizewijziging en mobiele tap. Exacte canvasselectie gelijk aan lijst; ambigu/occluded pick geeft geen verkeerde anatomische claim. Test groep fallback voor mesh zonder directe row. | Lijstselectie getest; eerdere fase zegt handmatige picking niet bewezen. |
| Keyboard en toegankelijk alternatief | Tab/Shift+Tab, Enter/Space op modelkeuze, search, list, focus, isolate, restore, reset; actuele `aria-pressed`, semantische status/labels en terugkeer focus; contrast, 200% zoom, 320 CSS-px layout, reduced motion, geen kleur-only melding. Test ook WebGL-weigering/contextverlies en netwerk-/hashfail met duidelijke blokkade. | Bestaande HTML-knoppen en 390px emulatie, geen volledige WCAG-audit of screenreaderbewijs. |
| Responsive | 320, 360, 390, 768, 1024, 1440, 1920 CSS-px, portrait/landscape, softwaretoetsenbord. Lange taalstrings en bronwaarschuwing niet afgesneden, geen page-horizontal-scroll. Prioriteit actuele selectie en knoppen. Include screenshots bij beide talen. | 390px browseremulatie eerder, niet alle apparaten of nieuwe cases. |
| Fysieke performance | Meet koude/warme load per bron, tijd tot eerste bruikbare interactie, rendercalls/primitiven, frame-time p50/p95 tijdens orbit, GPU/geheugengedrag na 28 bronwissels, mobiele thermische/throttle-tests. Budget: gebruik de targets uit UX-05 als richtwaarden; registreer werkelijke apparaten en afwijkingen. Aparte opt-in load bij grootste model; echte 30 fps mobiele doel en geen hang of onherstelbaar verlies. | Browseremulatie is geen hardwarebewijs. Grootste bron en herhaalde 14-source switching open. |

Voor iedere bron dezelfde minimale QA. Bewaar screenshots met variant/revisie, gekozen rij-ID en herleidbare GLB-hash; screenshots horen geen medische nauwkeurigheid te suggereren. Test bronwaarschuwingen altijd in beide talen, inclusief het mannelijke longverschil. Test 100% van de machinecontroleerbare rijen; voeg voor menselijke visuele beoordeling volledige doelstructuuraudit toe wanneer canonieke anatomische ID's zijn vastgesteld. Herhaal na defectcorrectie, nooit alleen hetzelfde succesvoorbeeld.

## 5. Echte diepte en uniforme dekkingspoorten (blokkeert productvrijgave)

De 14 bronreferenties zijn uitsluitend bronwerkbanken. Er is nog geen gereviewde canonieke conceptnoemer die alle systemen, zijden, anatomische varianten en regio's omvat. Het bestaande ledger heeft 285 variantrecords voor de eerste kandidaat; het uitbreidingsregister telt 118 expliciete open doelen in tien [gapdomeinen](../docs/model/GAP-BACKLOG.md). Geen HRA-rij toevoegen als automatische anatomische PASS. Voeg bronkoppelingen en apart bewijs aan die doelen toe en bewaar bronhiërarchie, anatomische hiërarchie en gebruikersnavigatie als afzonderlijke structuren.

| Domein | Nog te leveren naast HRA-werkbank |
|---|---|
| GAP-01 Skelet | Individuele botten, landmarks en regioverbindingen per zijde/variant. BodyParts3D technische kandidaat is beperkt en afzonderlijk; hyoid blijft doelgap. |
| GAP-02 Gewrichten | Echte relevante gewrichtscomponenten, banden/kapsel/kraakbeen, correcte eigen geometry/relaties; 12 eerste hotspots zijn geen mesh. |
| GAP-03 Spieren | Individuele spier/pees, aanhechtingen, kleine diepe spieren, zijden, herkomst, onderbouwde biomechanische relaties. |
| GAP-04 Zenuwen | Hersenen en ruggenmerg niet gelijkstellen aan perifeer zenuwstelsel. Trajecten, plexussen, perifere zenuwen en verbanden afzonderlijk valideren. |
| GAP-05 Vaten | Volledige inventaris doelvertakkingen, lateralisatie, arterieel/veneus, anatomische topologie en correcte schaal. HRA-bron nodes/labels niet automatisch topologische relaties. |
| GAP-06 Organen | Naast hart, lever, longen, dunne darm ook alle afgesproken overige organen en hun substructuren, dwarsdoorsnedes, context-/meetgidsclassificatie, luchtwegen en relatiecontrole. Niet stilzwijgend scope verkleinen. |
| GAP-07 Huid/weefsel | Afzonderlijke lagen, haar/klier/vaatstructuren, onderbouwde schaalmodellen; geen microscopische detailclaim uit macro-GLB. |
| GAP-08 Overige systemen | O.a. lymfe, endocriene organen en zintuigen; eigen volledige doelcatalogus, source sourcing, technische en anatomische uitvoering. |
| GAP-09 Variantspecifiek | Gelijke bewijsstandaard voor alle relevante varianten, niet identiek aantal labels. Afgeleide modellen, referentievariatie en gemiste structuren expliciet. Geen spiegeling of een bron over beide varianten projecteren zonder review. |
| GAP-10 Micro/beweging | Afzonderlijk onderbouwde microscopische schaal en relevante biomechanica/animatie. Voor statische concepten onderbouwde uitleg van beperking. Geen fictieve fysiologie of dynamiek. |

**Per canonieke structuur, ook bij bronoverlap:** (1) rechten/herkomst, (2) onafhankelijke anatomische naam + zijde + regio + systeem, (3) geometrische identiteit/pasvorm/registratie/detailniveau, (4) visuele kwaliteit, (5) selectie/lijst/focus/isolatie/reset en 3D/HTML-equivalent, (6) functionele uitleg, schaal, relaties en bronnen, (7) voor elk van vijf modi × NL/EN een gereviewd inhoudsrecord of gemotiveerde inhoudelijke beperking, (8) bewegingsklasse waar relevant, (9) toegankelijkheid, (10) echte-device prestaties. Aftekenen per structuur, variant én relevante regio, geen gemiddelden om achterblijvende gebieden te maskeren. Verifieer via de contract- en coveragegate, met menselijke anatomie-/rechten-/inhoudsreview.

**Gebruikersnavigatie volgens UX-blauwdruk:** de uiteindelijke atlasroute moet lichaam → systeem/regio → structuur → onafhankelijke informatie-/relatieverdieping → gevalideerde weefsel-/microschaal kunnen openen én betrouwbaar terugkeren. Modus/taal/canonic-ID blijven consistent over route, lijst en viewer. Een `sourceId/nodeIndex` in de werkbank is nog geen canonieke anatomische slug/deeplink. Geen geforceerde micromodelbeweging, medische AI-chat, symptoomopslag of diagnose.

## 6. Samenwerking en vrijgavebesluit

- **Bronteam** beheert versiepin, afwijkingen, echte auditbewijzen en transparantie. Bewijslink per bron, niet alleen per fase.
- **Engine** beheert source adapters, renderselectie/isolatie, lifecycle, performance en juistheid van bronassociaties. Geen impliciete categorieën of medische coördinaten.
- **UX/frontend** beheert bronkeuze, details, waarschuwingen, toegankelijkheid en terugweg. **Content/localization** beheert afzonderlijk gereviewde NL/EN-terminologie en verdieping; exacte bronnamen blijven origineel.
- **Anatomie/technical art** beheert doellijst, mesh-vorm/pasvorm, canonieke identiteit, lateralisatie, variantscope, schaal en registratie, inclusief verschil tussen anatomie en guide/geometrische representatie.
- **QA/release** beheert matrix, onafhankelijke code- en browserreview, per-source bewijs, regressies en releaseblokkades. **Rechten** valideert rechten, attributie, wijzigingen en distributiebeleid per bron en model.

Volgorde: INT-01…03 → INT-04…08 → visuele/interactie/inclusiviteits- en performancematrix → canonieke structuur-/inhoudsgates → eigenaarsbesluit. Het expliciete fase-5 doel is hoogstens een **afzonderlijke technische kandidaat** nadat alle vereiste bron- en integratietests aantoonbaar geslaagd zijn. Voor publicatie als leeratlas blijven de genoemde inhoudelijke, anatomische, juridische en fysieke kwaliteitsgates verplicht; elk tekort houdt de publieke release open/geblokkeerd. Een nieuwe fase is geen toestemming om de kwaliteitsnorm te verlagen.
