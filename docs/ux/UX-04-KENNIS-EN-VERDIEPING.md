# UX-04 — Kennisarchitectuur, onderwijsniveaus en verdiepingen

**Status:** technische UX-blauwdruk; geen gevalideerde medische inhoud en geen bewijs dat modellen beschikbaar zijn.  
**Eigenaars:** Content/Localization Lead (coördinatie), anatomie-/biomechanicareviewer (vakinhoud), Scientific Simulation Engineer (verdere vakmodules), License/Compliance Lead (rechten), QA Lead (publicatiepoort).  
**Raakt:** `docs/01-MASTERPLAN.md`, `docs/03-3D-EN-DATAMODEL.md`, `docs/04-LICENTIES-EN-BRONNEN.md`, `planning/05-ROADMAP-EN-BACKLOG.md`, `contracts/simulation-contract.ts`.

## 1. Ontwerpdoel en harde grenzen

De gebruiker moet zonder voorkennis kunnen beginnen bij het volledige menselijk lichaam, daarna gericht een systeem, regio en structuur ontdekken, en van daaruit verdieping kiezen. In elke stap blijft duidelijk *waar* de gebruiker is, *wat* de selectie betekent en *welke inhoud of visualisatie* beschikbaar is. Het platform toont algemene educatie, geen individuele medische beoordeling.

- Gebruik bekende, korte begrippen eerst; geef officiële vakterminologie als tweede label, met verklaringen in de gewenste taal.
- Geef een kleine hoofdtekst en optionele verdiepingskaarten. Toon geen lange encyclopedische tekst als standaard voor iedereen.
- Bewaar de anatomische selectie bij wisselen van modus of taal. Een modus is een andere uitleg over hetzelfde object, niet een ander anatomisch model.
- Het lichaam heeft betrekking tot systemen, regio's, structuren, onderdelen en gerelateerde concepten. Deze relaties vormen een graaf, **geen gedwongen enkele anatomische boom**.
- Een cel, vezel of organel is een selectie in een andere schaal of illustratieve scène. Het is niet een continu gedetailleerd deel van een body-GLB.
- Geen vragenlijst, AI-chat, zelfdiagnose, persoonlijke trainings-/behandeladviezen, beoordeling van pijn of symptomen, prognose of medische gegevensopslag. Ook geen indirecte profielvorming uit bezochte blessure-inhoud.
- Gevalideerde inhoud en geautoriseerde assets zijn afzonderlijke publicatie-eisen; publieke broncode is niet hetzelfde als medisch gevalideerde inhoud.

## 2. Langs twee assen van groot naar klein

| Niveau / type | Wat staat centraal? | Voorbeeld NL / EN | Volgende acties | Visualisatie / beschikbaarheid |
|---|---|---|---|---|
| N0 Lichaam | complete atlas | Menselijk lichaam / Human body | Kies systeem of lichaamsregio | G0-POC één goedgekeurd model; G1 stabiele atlas |
| Index S Systeem | anatomische categorie | Spierstelsel / Muscular system | Filter lagen, open structuurlijst, zoek naam | Zelfde scène; eventueel alleen laagfilter, geen nieuw fysiek niveau |
| Index R Regio | geografische selectie op lichaam | Schouder / Shoulder | Kies links/rechts of beschikbare structuur; focus camera | Zelfde scène; G0-POC één regio |
| N1 Structuur | benoemde anatomische entiteit | Linker deltaspier / Left deltoid | Informatie, gerelateerde structuren, modus; detail indien beschikbaar | Zelfde scène zolang benoemde geometrie beschikbaar is |
| N2 Onderdeel | gereviewde substructuur, aanhechting of visualiseerbaar concept | Onderdeel / Component | Open echte substructuur of tekstkaart | G3, per bronmodel. Geen kunstmatig aangemaakte meshselectie |
| N3 Weefsel | materiaal- en microscopisch concept | Weefsel / Tissue | Open doorsnede, vezel of microscopisch model | Afzonderlijke scène of goedgekeurde 2D-illustratie; G4 en later |
| N4 Cel | cellulaire structuur | Cel / Cell | Leer over opbouw, onderdelen, processen | Afzonderlijke celmodule; G4 en later |
| N5 Organel | organel, proces of moleculaire illustratie | Mitochondrium / Mitochondrion | Verken model, begrippen en beperkingen | Afzonderlijke scène; afhankelijk van gevalideerde module en bron |

De niveaucodes zijn UX-categorieën, geen nieuwe verplichte asset- of URL-ID's. Het label *N2* mag niet worden gebruikt als veronderstelde anatomische standaard. Beschikbaarheid is per onderwerp, dataset en contentversie, niet gegarandeerd door het bestaan van het niveau.

### Relaties en canonieke navigatie

Voor bestaand voorbeeld-ID `anatomy:muscle:deltoid:left` geldt:

- `parentId` is in de huidige catalogus een canoniek navigatieanker (bijvoorbeeld `anatomy:body`), niet noodzakelijk de semantische anatomische ouder.
- `system` filtert de structuurlijst; `regionId` bepaalt regionale context. Beide kunnen tegelijk actief zijn zonder dat de selectie dubbelzinnig wordt.
- `relatedIds` levert niet-hiërarchische links. Aanvullende getypeerde relaties zijn een voorstel voor later: `part-of`, `located-in`, `belongs-to-system`, `adjacent-to`, `scale-transition-to`. Vakreview bepaalt de werkelijke relaties, geen afleiding uitsluitend uit mesh-namen.
- Links en rechts moeten afzonderlijk resolveerbaar zijn. Gebruik canonieke ID voor links, labels en camera-focus; geen selectie op vertaalde titel.
- Interactie-/UI-contract: `selectedId` is leidend, contentresolver gebruikt `structureId = selectedId`. `mode` en `locale` zijn onafhankelijke statevariabelen. Een as (systeem/regio) kan worden gewijzigd zonder de ID automatisch te vervangen; als selectie wordt verborgen, toont UI dat expliciet.

### Zichtbare kennisnavigatie

| Element | Inhoud en gedrag |
|---|---|
| Broodkruimels | Lichaam → Schouder links → Deltaspier. Systeemlabel indien bekend als filterbadge, niet verplicht tussen elke stap. Elk beschikbaar niveau is een navigatieactie. |
| Actieve selectie | Duidelijke titel, links/rechts, officieel alternatief label waar gevalideerd. Blijft ook bij modaliteit- of taalwissel staan. |
| Gerelateerd | Maximaal drie relevante, goedgekeurde links; uitbreidbaar tot gestructureerde lijst. Geen automatisch gegokte relaties. |
| Verdieping | Toon de volgende beschikbare niveaukaart met titel, type (3D, 2D, tekst), geschatte leestijd alleen indien onderbouwd, en een duidelijke actie. Niet-gebouwde onderdelen worden gemarkeerd zonder klikbare nepfunctionaliteit. |
| Schaalwissel | Button NL `Verken weefselmodel` / EN `Explore tissue model`; vóór activatie tekst: `Schematische weergave op een andere schaal`. Behoud een lokale terugkeercontext. |
| Terug naar lichaam | Keer terug vanuit een nieuwe scène naar eerdere selectie, regio, filter en cameracontext voor zover ondersteund; bij niet-herstelbare camerastate toon neutrale focus op vorige selectie. |
| Bron en uitleg | Zichtbare bronlink per kaart en een volledige bronnenlijst. Bij illustratie expliciet `Schematisch` / `Schematic`, modelbeperkingen en schaal. |

## 3. Inhoud als afzonderlijk datacontract

Het bestaande concept-contentrecord uit document 03 blijft het vertrekpunt. De onderstaande velden zijn een **voorstel voor content-schema v1**, geen wijziging van het rendercontract. Implementatie vereist een ADR, schema-validatie en contracttests. De sleutel `structureId + mode + locale + revision` is uniek in anatomie. Vakmodules buiten anatomie gebruiken een eigen contentresolver op `conceptId + locale + revision`, pas na expliciete contractafspraken.

| Veld | Betekenis en validatie |
|---|---|
| `structureId` | Canonieke selectie-ID. Moet naar bestaande gereviewde structuur wijzen. |
| `mode` | Exact één `herstellen`, `trainen`, `leren`, `blessures`, `sporten`. Geen vertaalde waarden in data. |
| `locale` | Exact `nl` of `en`. |
| `title`, `summary` | Korte menselijke taal, titel maximaal circa 65 tekens, samenvatting richtwaarde 25–60 woorden. |
| `contentVersion`, `revision` | Semantische inhoudsversie plus monotoon revisienummer. Elke wijziging aan claims leidt tot nieuwe review. |
| `cards` | Lijst betekenisvolle kaarten: elk eigen stabiele ID, type, kop, inhoud, verwijzingen naar claim-ID's, eventueel media-ID. Geen vrije HTML of onbeoordeelde scripts. |
| `claims` | Lijst van toetsbare beweringen inclusief `claimId`, tekst/vertaling (of tekstverwijzing), bron-ID's en bronlocatie. Elke gepubliceerde bewering heeft passende bronnen. |
| `references` | Bronregister-ID's, DOI/URL indien aanwezig, titel, auteur/organisatie, versie/jaar, toegang-/reviewdatum en relevant hoofdstuk/figuur/pagina of sectie. |
| `reviewStatus` | `draft`, `in-review`, `approved`, `withdrawn`; alleen `approved` is publiek zichtbaar. |
| `reviewedBy`, `reviewedAt` | Reviewerrol/-ID, datum; menselijke domeinreview is nodig. Gevoelige reviewer-informatie hoort niet onnodig in publieke repository. |
| `translationOf`, `translationStatus` | Koppeling naar gereviewde baselines voor beide talen en status. Verouderde vertaling gaat niet ongemerkt live. |
| `relatedIds`, `deeperConceptIds` | Expliciet gereviewde relaties. Ongeldige ID verhindert publicatie van link. |
| `assetIds`, `limitations` | Alleen gelicentieerde, gevalideerde illustraties, modellen of video. Toon beperkingen en context bij wetenschappelijke simulaties. |
| `noticeKey` | UI-sleutel voor contextwaarschuwing, bij herstel/blessures verplicht. De waarschuwing is geen vervanging voor inhoudelijke review. |

Gebruik statische JSON of gestructureerde MDX uit de bestaande contentmodule. Geen runtime-LLM nodig. MDX wordt op buildtijd gecontroleerd; geen extern uitvoerbare componentcode, ongecontroleerde embeds of medische claims uit modelmetadata. Geen nieuwe database of gebruikersaccount in deze fase.

**Resolutievolgorde:**

1. Valideer actieve subject/module, selectie, modus en taal.
2. Resolveer de exact bijbehorende approved recordrevisie; accepteer geen content uit een andere selectie als verborgen fallback.
3. Controleer dat vertaalstatus en bronversie geldig zijn; voorkom dat bij een moduswisseling nog de oude kaart zichtbaar is onder de nieuwe modustitel.
4. Laad optionele media alleen indien asset-ID, licentiestatus, manifest en toegankelijk alternatief beschikbaar zijn.
5. Indien geen record: toon `Nog geen gecontroleerde uitleg voor deze selectie` / `No reviewed content available for this selection`; laat wel veilige navigatielinks zien. Indien alleen andere taal beschikbaar: vermeld dat expliciet met taalkeuzeknop; geen stilzwijgende machinevertaling.
6. Bij gemelde ingetrokken claim/bron: blokkeer het record of de getroffen kaart tot herreview; geen gecachete publicatie met oude claims in de volgende release.

## 4. Eén informatiepaneel, vijf verschillende leertaken

Het paneel gebruikt dezelfde raamstructuur: **titel → samenvatting → primaire kaart → optionele verdiepingskaarten → gerelateerd → bronnen**. De modus bepaalt uitsluitend de volgorde en inhoud; bestaande camerastand en selectie blijven behouden. Iedere modus heeft een duidelijke uitleg van wat de bezoeker hier leert en wat het niet is.

| Modus (NL / EN) | Primair leerdoel | Kaartvolgorde | Niet toestaan |
|---|---|---|---|
| Leren / Learn | Wat is dit en hoe werkt het? | Naam en herkenning; ligging; opbouw; algemene functie; gereviewde relatie; verdieping; bronnen | Onbevestigde mesh-ID's; beweringen op basis van kleur of oppervlakkige shape |
| Trainen / Train | Begrijpen welke onderdelen bij beweging betrokken kunnen zijn | Uitleg beweging; geselecteerde structuur en relatie; generieke demonstratie; context/beperking; bronnen | Individueel trainingsschema, voorgeschreven gewicht/intensiteit, prestatiegarantie, pijncheck |
| Herstellen / Recovery | Leren over algemene herstelprincipes | Contextverklaring; algemene belasting-/herstelconcepten; gereviewde voorbeelden; algemene verwijzing naar deskundige hulp; bronnen | Persoonlijk behandelschema, diagnose, voorgeschreven belasting of claims over genezing |
| Blessures / Injuries | Begrijpen van begrippen en algemene zorgcontext | Definities; algemene mechanismen; waarom verschillende situaties deskundige beoordeling vereisen; algemene hulpinformatie; bronnen | Diagnosewizard, symptoomlijst die tot conclusie leidt, urgentieclassificatie op basis van input, persoonlijk advies |
| Sporten / Sports | Herkennen hoe beweging en biomechanica in een sportcontext worden uitgelegd | Beweging in sportcontext; betrokken structuur; animatie (indien valide); context en beperkingen; bronnen | Per sport gegarandeerde spierbelasting, blessurepreventiebelofte, individuele prestatie-analyse |

**Kaarttypen:** `overview`, `structure`, `function`, `movement`, `concept`, `animation`, `relationship`, `deeper-level`, `limitations`, `sources`, `notice`. UI moet een neutrale fallback voor onbekend kaarttype tonen in ontwikkeling, en CI moet onbekende kaarttypen afkeuren in releasecontent.

- G0: per roadmap twee gecontroleerde contentitems per modus in NL en EN voor de eerste geselecteerde structuur, voldoende om dezelfde scene met verschillende inhoud te testen; ontbreken review of assets dan is de inhoud niet publiceerbaar.
- G1: stabiele navigatie, gecontroleerde woordenlijst en contentpipeline; tekst is ook beschikbaar zonder WebGL.
- G2: volledige gereviewde vijfmodi-inhoud voor eerste regio, generiek achtwekenprogramma (indien goedgekeurd), gevalideerde animaties volgens daadwerkelijke beschikbaarheid.
- G3/G4: nieuwe structuren, tissue/cell-module, verdere scènes worden per gate vrijgegeven. Geen alle-vijf-modi-herimplementatie voor iedere afzonderlijke module.

### Achtwekenprogramma (G2, niet persoonlijk)

Het algemene programma is een los inhoudstype, met `programId`, `title`, `scope`, doelgroepomschrijving zonder vragenlijst, `version`, `weekIndex`, `lessonIds`, bronnen en reviewstatus. Een programma bevat algemene educatieve lessen; geen impliciete individuele behandeling. Het programmakeuzescherm toont inhoud, doel, eventuele gereviewde beperkingen en de optie **Kies programma**. Alleen gekozen programma-ID, huidige week en afgeronde les-ID's lokaal bewaren, zoals bestaand privacymodel voorschrijft. Leg geen programma-/voortgangsdata in URL, analytics/logs of serveropslag. De bezoeker kan het programma resetten/wissen; toon verlies van voortgang bij verwijderen van browserdata.

## 5. Voorbeeldpakket voor schouder — uitsluitend illustratief ontwerp

**Alle onderstaande voorbeeldkaartlabels beschrijven voorgenomen inhoud, geen anatomische/medische beweringen.** Niet publiceren als definitieve les. Eerst exacte bronmesh, anatomische identiteit en review vaststellen bij G0-06. Gebruik in dit voorbeeld bestaande voorlopige ID `anatomy:muscle:deltoid:left`, `regionId = anatomy:region:shoulder:left`. De voorbeeldrecord heeft geen bron, `reviewStatus=draft` en kan daarom niet naar de openbare interface.

| Modus | NL-voorbeeldkaarten | EN-equivalent | Vóór `approved` verplicht |
|---|---|---|---|
| Leren | `Naam en herkenning`, `Ligging en functie` | `Name and identification`, `Location and function` | Bevestigde structure ID, gereviewde benaming en anatomische bronnen |
| Trainen | `Beweging begrijpen`, `Bewegingsdemonstratie` | `Understanding movement`, `Movement demonstration` | Biomechanisch gereviewde uitleg en rechten op demonstratie |
| Herstellen | `Wat betekent herstel?`, `Algemene belastingseffecten` | `What is recovery?`, `General effects of loading` | Zorginhoudelijke review; geen individueel schema |
| Blessures | `Begrippen rond blessures`, `Waarom professionele beoordeling?` | `Injury terminology`, `Why professional assessment?` | Zorginhoudelijke review; neutrale hulptekst |
| Sporten | `Beweging in sport`, `Biomechanische illustratie` | `Movement in sport`, `Biomechanical illustration` | Vakspecifieke review van context, model en beperkingen |

Conceptuele voorbeeldrecord (placeholder; niet opnemen in releasecatalogus):

```json
{
  "structureId": "anatomy:muscle:deltoid:left",
  "mode": "leren",
  "locale": "nl",
  "title": "[Gecontroleerde Nederlandse naam]",
  "summary": "[Gereviewde samenvatting zonder verwijzing naar persoonlijke gezondheid]",
  "cards": [
    {"id": "identify", "type": "structure", "title": "Naam en herkenning", "claimIds": []},
    {"id": "function", "type": "function", "title": "Ligging en functie", "claimIds": []}
  ],
  "claims": [],
  "references": [],
  "reviewedBy": null,
  "reviewedAt": null,
  "reviewStatus": "draft",
  "revision": 1,
  "translationStatus": "draft"
}
```

De geselecteerde anatomische entiteit blijft in de 3D-scène dezelfde voor alle kaartsets. Als de beweging niet met het beschikbare model kan worden weergegeven, bestaat de kaart uit gereviewde tekst of toegankelijke 2D-illustratie; geen imitatie van een biomechanisch gevalideerde simulatie.

## 6. Tweetaligheid, betekenis en zoeknavigatie

- Eén stabiele ID over beide talen; elke locale heeft eigen titel, alias, samenvatting, bron-/claimcontext en toegankelijke tekst. Geen ID op basis van Engelse of Nederlandse woorden in de UI.
- Onderhoud een glossarium met `termId`, `nlPreferred`, `enPreferred`, `synonyms.nl`, `synonyms.en`, `latinName` indien gereviewd, definitie, bronnen en reviewer. Nederlandse en Engelse synoniemen worden aan dezelfde ID gekoppeld. Zoekindex is afgeleid van uitsluitend publieke approved records.
- Zoek op label, synoniem en exacte canonieke ID; voorkeur aan exacte, taalrelevante matches. Bij dubbelzinnige resultaten toon regio, zijde en type. `links` in een lichaamsnaam betekent anatomische linkerzijde van het model, niet schermlinks.
- Als NL en EN een afwijkende medische term gebruiken, controleer betekenis en context inhoudelijk. Mechanische vertaling mag alleen als conceptinput, na review publiceren. Latijn is optioneel, nooit de enige toegankelijke naam.
- Interfacetekst, leskaarten en modelcredits blijven afzonderlijke namespaces. In licentiecredits kan oorspronkelijke taal nodig zijn; voeg dan een gereviewde vertaalde beschrijving naast, behoud originele attribution.
- Getal-/eenheidnotatie volgens locale; bewaar onderliggende waarde en SI- of module-eenheid. Locale beïnvloedt geen simulatierekenwerk.
- Taalwissel bewaart selectie-ID, `mode`, actieve scène en toegankelijke focus. Melding bij ontbrekende vertaling, geen ongemelde fallback naar verkeerde taal.

## 7. Vakverdiepingen na anatomie

De oorspronkelijke vijf anatomiemodi worden niet geforceerd op elk vak. Modules hergebruiken kaarttypen en patroon *introductie → observatie → uitleg → experiment → beperkingen → bronnen*. De module definieert eigen leerdoelen en bediening en expliciete capabilities uit `SimulationManifest`.

| Module | Mogelijke conceptniveaus | Interacties (alleen indien aantoonbaar) | Verplichte wetenschappelijke context |
|---|---|---|---|
| Cel (`cell`) | cel → compartiment → organel → proces | label, focus, lagen of stapsgewijze animatie | celtype, illustratief of op schaal, relevante beperkingen |
| Zonnestelsel (`solar`) | systeem → hemellichaam → kenmerken / baan | selectie, baanweergave, tijdregeling | lengteschaal, tijdstap, brondata en datum, onderscheid schematisch/afgemeten |
| Natuurkunde (`physics`) | concept → object → parameter → observaties | parameter, stop/start, reset, experiment | eenheden, toegestane intervallen, begincondities, aannames, toleranties en gevalideerde testgevallen |
| Scheikunde (`chemistry`) | concept → molecule → structuur → model | rotatie, selectie, modelweergave | modeltype, geometrische schaal, vereenvoudigingen; veilige educatieve uitleg, geen onveilige practicum-instructies |
| Techniek (`technology`) | systeem → assemblage → onderdeel → principe | selecteer, explode, doorsnede indien capability | materiaal- en modelaannames, technische bronnen; geen veiligheidskritieke handelingsadviezen zonder passende expertise |

Per module een lesrecord met `conceptId`, `moduleId`, `locale`, leerdoel, opbouw, bronnen, review, `scientificLimitations`, media, en optionele experimentbeschrijving. Een experiment benoemt voorspellingsvraag, beschikbare parameters, verwachte observatie en verklaring *na validatie*. De simulator zelf blijft in `DeterministicSimulation<Input, Output>`; uitleg doet geen berekeningen, maar refereert aan gevalideerde uitvoer en eenheden. Geen realtime AI of dynamisch gegokte waarden.

**Overgangspad:** bijvoorbeeld anatomie-structuur → expliciete kaart `Bekijk een celmodel` → module `cell` als die bestaat en reviewed is → detail. Bewaar een tijdelijke terugkeercontext; geef een transparante melding dat het celmodel geen meting is aan het geselecteerde lichaamsmodel. Module niet beschikbaar? Toon een gecontroleerde tekstkaart indien aanwezig of de status `Nog in ontwikkeling`, geen fake zoom.

## 8. Wetenschappelijke review, herkomst, licentie en veiligheidsgrens

Iedere inhoudelijke publicatie volgt een controleketen zonder AI-autorisatie:

1. **Intake:** auteur definieert doelgroep, onderwerp, claimlijst, exact model-ID en leerdoel. Identificeer afzonderlijke rechten voor model, tekst, figuur, video en vertaling.
2. **Bronselectie:** voorkeur voor gezaghebbende vakliteratuur, anatomische terminologie, peer-reviewed literatuur, onderwijs- of richtlijnbronnen passend bij de claim. Leg bronversie of publicatiejaar en relevante sectie vast. Geen feitelijke bronvermelding van een project dat alleen geometrie levert, tenzij de claim daar werkelijk mee wordt onderbouwd.
3. **Draft:** originele, begrijpelijke formulering. Geen integrale kopie van een bron, geen overname van Astra-assets of teksten zonder toestemming, geen afbeeldingen enkel omdat ze online te zien zijn.
4. **Licentiecontrole:** vergelijk bronrechten, auteursgegevens, toegestane bewerking/distributie en eventuele share-alike-verplichtingen met `docs/04-LICENTIES-EN-BRONNEN.md`. Leg per asset checksum/herkomst/versie vast. Reviewcode of assetlicentie autoriseert geen medische beweringen.
5. **Vakreview:** inhoudsdeskundige valideert claim voor claim; anatomiespecialist bevestigt structuur-/regio-/zijdemapping; biomechanica- of zorginhoudelijk reviewer voor beweging, herstel of blessures. Auteur is niet tevens enige vrijgever van zijn eigen medisch gevoelige kaart.
6. **Vertaling:** NL/EN-baselines met claim-ID's; vertaler reviewt begrijpelijkheid, vakreviewer controleert betekenisbehoud en medische context. Nieuwe beweringen in vertaling zijn niet toegestaan zonder review.
7. **QA:** schema, coverage, gebroken links, bron-ID's, versies, toegankelijk alternatieven, disclaimer, assetstatus en visuele inhoud-mapping testen. Bij review naast de bewering ook het beeld laten beoordelen.
8. **Release:** alleen `approved`, reviewer + datum en bronverwijzingen; beheer versie en publicatiebesluit via review/PR. Koppel een release aan model-/content-/bronversie. Plan herreview per onderwerp en wijzigingssignaal; bij intrekking blokkeer de kaart direct in eerstvolgende release.

Browse-/search-analytics op individuele blessurekaart, selectiegeschiedenis en gezondheidsinteresse zijn uitgesloten. Laat bezoekers geen klachten, leeftijd, naam, medische geschiedenis, specifieke blessure of andere persoonsdata invullen, ook niet als vrijwillige feedback. Algemene helpverwijzing mag alleen reviewed, niet gepersonaliseerd en zonder te suggereren dat het systeem urgentie kent. Indicatieve UI-melding, nog te reviewen: `Dit platform geeft algemene educatieve informatie en beoordeelt geen persoonlijke klachten. Bespreek medische vragen met een bevoegde zorgverlener.` Engels: `This platform provides general educational information and does not assess personal health concerns. Discuss medical questions with a qualified healthcare professional.`

**Geen harde claim** dat een model alle anatomische structuren of fysieke kenmerken exact representeert; vermeld modelbron, gevalideerde dekking, eventuele vereenvoudigingen en of beweging schematisch is. Het selecteerbare object moet passen bij de naam en claim op het informatiepaneel.

## 9. Definitie van gereed — content- en navigatietests

| ID | Test | Acceptatiecriterium | Gate |
|---|---|---|---|
| C-01 | Selectie verandert | Resolver toont uitsluitend kaartset voor juiste stabiele ID, modus en locale; oude content wordt niet gecombineerd met nieuwe titel | G0 |
| C-02 | Moduswissel | Alle vijf modi kunnen dezelfde ID adresseren; camera en selectie blijven bij ondersteunde wissel stabiel | G0/G2 |
| C-03 | Reviewpoort | `draft`, lege reviewer, ontbrekende bron per claim, niet-goedgekeurd asset of niet-passende mapping faalt de releasecheck; end-user UI toont neutrale status | G0 |
| C-04 | NL/EN | Geselecteerde structuur en links/rechts blijven gelijk; vertaalde content dekt baserevisie; ontbrekende vertaling krijgt expliciete state | G0/G1 |
| C-05 | Bronnen | Claim- en bron-ID-links zijn resolveerbaar, relevante bronlocatie opgegeven; gewijzigde/ingetrokken claims leiden tot herreview | G1 |
| C-06 | Zoeken en relaties | Exacte goedgekeurde ID-/synoniemresultaten, onderscheid links/rechts; alle getoonde gerelateerde links zijn geldig. Geen onjuiste automatische relatie | G1 |
| C-07 | WebGL-uitval | Toegankelijke HTML-structuurboom, naam, modus, goedgekeurde tekst en bronlijst blijven bruikbaar via toetsenbord en screenreader | G1 |
| C-08 | Bewegings- en herstelkaarten | Goede reviewer, algemene context en geregistreerde beperkingen; geen diagnostische/individuele adviezen; geen gezondheidsinputvelden | G2 |
| C-09 | Achtwekenprogramma | Alleen `selectedProgramId`, `currentWeek`, `completedLessonIds` lokaal; reset/wissen werkt en geen progressie zichtbaar in URL/netwerklog | G2 |
| C-10 | Navigatie schaal | Doorgaande ontdekking alleen met geldige scène; verschil in schaal en schematisch karakter aangekondigd; terugkeer naar eerdere structuur werkt na scene unload | G4 |
| C-11 | Andere vakmodule | Module kent eigen concepten, broncontext, eenheden en beperkingen; vereist geen anatomie-modus; referentie naar gevalideerde simulatieoutputs en testcases | G4 |
| C-12 | Onbeschikbare kennis | Geen valse verklaring, geen andere structuur als fallback; duidelijke tekst en relevante ondersteunde terugnavigatie | Alle |
| C-13 | Privacy | Browsernetwerkinspectie bevestigt geen gevoelige selectie-/progressie-/symptoomtracking; publieke deep links bevatten alleen conceptselectie/beeldstate | Alle |
| C-14 | Toegankelijke uitleg | Kaartkoppen semantisch geordend, alternatieve tekst voor media, ondertiteling of transcript waar nodig, bronlinks met betekenisvolle labels | Alle |

### Overdracht aan implementatieteam

Content/Localization beheert de contractvoorstellen, woordenlijst en bron-/claimregister en levert fixtures voor twee kaarten per modus vóór integratie. UX/IA beheert schermrelaties en consistente labels, Frontend implementeert resolver en paneel zonder kennis van modelmesh-ID's, 3D-engineer blijft eigenaar van scène- en schaaltransities, reviewers tekenen de inhoudelijke gates af, QA test alle bovengenoemde gevallen. Release Lead bewaakt dat drafts niet per ongeluk in publieke HTML of statische builddata belanden (de publieke repository kan conceptuele voorbeelden bevatten, maar de live site toont die niet als gereviewde educatie).

Eerste praktische werkpakket: verifieer één echte anatomische selectie, documenteer de mapping en bronnen, bereid gecontroleerde NL/EN-kaarten voor, voer selectie-/modusinteractie- en taaltests uit. Ontwerp de verdere niveaus conceptueel, maar bouw pas een weefsel-/celmodule in het werkpakket voor gate 4, na vrijgave van voorgaande gates en afzonderlijke asset-/vakreview.
