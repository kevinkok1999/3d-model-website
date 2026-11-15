# UX-02 — Schermen, layout en designsysteem

**Status:** concrete ontwerpblauwdruk voor implementatie en toetsing, nog geen gevalideerde gebruikersinterface. **Scope:** anatomie eerst; uitbreidbare modules later. De route- en taxonomieafspraken staan in UX-01; dit document bepaalt de presentatie, componentgrenzen en responsive bediening. De eerste technische mijlpaal blijft het selecteren van één gecontroleerde schouderstructuur in één centrale viewer.

## 1. Ontwerpprincipes

- De 3D-scène is het primaire werkvlak. Educatieve informatie en bediening ondersteunen het model en concurreren er niet mee.
- Eén model, één selectie, vijf modi. Modus verandert de inhoud van het informatiepaneel, niet de scène-identiteit, camera of lagen.
- Iedereen kan de gewenste structuur vinden zonder een muis, precisiegebaren of kennis van Latijn. Laat de volledige zoek- en structuurroute ook buiten WebGL werken.
- Begin overzichtelijk; toon complexe gereedschappen via herkenbare groepen, niet in een muur van knoppen. Maak de volgende stap duidelijk zonder pop-ups of verplichte onboarding.
- Progressive disclosure: lichaam → regio → structuur; pas na de eerste stabiele release → weefsel/cel als aparte schaalmodule. Nooit een fictieve geometrische zoom.
- Eigen visuele identiteit: donker wetenschappelijk werkvlak, heldere cyan bediening, amber selectieaccent; een origineel ontwerp, geen reconstructie van Astra AI.
- NL/EN vanuit dezelfde componenten en canonieke gegevens. Geen vragenlijsten, diagnose, gezondheidsprofiel of persoonlijke medische opslag.

## 2. Scherminventaris en releasegates

| Scherm | Hoofdtaak | Belangrijkste componenten | Beschikbaar vanaf |
|---|---|---|---|
| H01 Startpagina | Een eerste leerroute kiezen | `AppHeader`, `Hero`, `SubjectGrid`, `ModeGrid`, `Footer` | Gate 0/1, eerst dummydata |
| A01/A01-R/A01-T Anatomieatlas (lichaam/regio/structuur) | Structuren vinden en bestuderen | `StructureNavigator`, `SceneViewport`, `ViewToolbar`, `DetailPanel` | Gate 0 POC, stabiel na Gate 1 |
| Atlas via modus | Gericht leren zonder tweede viewer | Dezelfde atlas; `ModeSwitcher` bepaalt inhoud | Gate 0 demonstratie; Gate 2 goedgekeurde content |
| Informatiedetail | Functie, context, bronnen begrijpen | `DetailPanel`, `ContentSections`, `SourceList` | Gate 1; Gate 2 inhoudsmatrix |
| Videodetail/animatie | Korte uitleg met bediening en transcript | `LessonMedia`, `Transcript`, `SourceList` | Gate 2 indien gecontroleerd |
| P01/P01-D Programma | Algemeen achtwekenprogramma kiezen en volgen | `ProgramIntro`, `WeekList`, `LessonCard`, `ProgressControls` | Gate 2 of later, niet gepersonaliseerd |
| 2D/HTML alternatief | Alle kerninformatie zonder WebGL | `AccessibleAtlas`, `StructureNavigator`, `DetailPanel` | Gate 0/1 |
| M01/M02 Moduleoverzicht en andere domeinen | Tussen vakgebieden kiezen | `SubjectGrid`, `ModuleShell` | Gate 4; verberg niet-leverbare routes in eerdere releases |
| S01/S02/S03 Bronnen, help en privacy | Bronnen, modelrechten, uitleg en beperkingen vinden | `CreditsPage`, `SourceList`, `AboutPage` | Gate 0 |

De atlas-, detail- en modusweergaven zijn toestanden van hetzelfde scherm, geen aparte clones. Ongebouwde modules en niet-goedgekeurde lessen worden niet als werkend geadverteerd; eventueel staat een neutrale roadmap in de informatiepagina.

## 3. Gemeenschappelijke shell en layoutraster

| Eigenschap | Desktop ≥ 1200 px | Tablet 768–1199 px | Mobiel < 768 px |
|---|---|---|---|
| `AppHeader` | 64 px, logo, hoofdnav, taal | 64 px, ingekorte navigatie | 56 px, logo, taalknop, menu |
| Padding reguliere pagina | 32 px; max 1320 px inhoud | 24 px | 16 px, op 320 px eventueel 12 px |
| Raster reguliere pagina | 12 kolommen, gap 24 px | 8 kolommen, gap 16 px | 4 kolommen, gap 12 px |
| `ContextBar` | 40 px min | 40 px min | 40 px min; compacte breadcrumb |
| `ModeSwitcher` | 48 px min | 48 px min | `ModeSelect` 48 px min |
| `Workbench` | Drie kolommen 272 / flexibel / 352 px | Viewer over volle breedte, drawervarianten | Eén verticale kolom, viewer boven informatie |
| `SceneViewport` | min 440 px breed, min 480 px hoog | hoogte `clamp(380px, 60svh, 760px)` | hoogte `clamp(280px, 48svh, 520px)` |
| Structuur- / lagenpaneel | Links; min 240, doel 272 px | Drawer max 384 px | Sheet, breedte 100% |
| Detailpaneel | Rechts; min 320, doel 352 px | Drawer max 416 px | In normale paginastroom |
| Bediening | 44×44 px min | 44×44 px min | 44×44 px min, 8 px tussenruimte |

Het desktopraster gebruikt de beschikbare binnenbreedte; bij 1200 px blijft minimaal 440 px voor de scène over. Desktop zijpanelen mogen inklappen via een gelabelde knop; de scène neemt vrijgekomen ruimte in. Bij 200% zoom of onvoldoende effectieve ruimte geldt de smallere layout. Paneelhoogte volgt de beschikbare viewport: inhoud scrollt onafhankelijk in desktopzijpanelen; geen globale horizontale scroll of verborgen content. Bij korte desktopvensters en liggende mobiel mag de gehele pagina verticaal scrollen. De app gebruikt safe-area insets en dynamische viewporteigenschappen waar ondersteund; zorg voor een normale CSS-fallback.

`AppHeader`: merk/terug naar start, toegang tot beschikbare onderwerpen, taalkeuze NL/EN, info/credits. Mobiel menu toont dezelfde opties in natuurlijke leesvolgorde. Geen profiel-, login-, premium- of chatknop zolang deze niet binnen scope vallen. De knop voor taal bewaart onderwerp, structuur, modus en bij voorkeur actuele camera. Vertaalbare labels staan niet hardcoded in componenten.

### 3.1 Desktop wireframe — atlas, 1440×900 referentie

| Rij | Links | Midden | Rechts |
|---|---|---|---|
| 64 px | Logo + modulekeuze | Hoofdnavigatie | NL/EN + info |
| 40 px | Terug | Lichaam › Schouder › Deltoideus | Deelbare link naar selectie indien beschikbaar |
| 48 px | Mode: | Herstellen / Trainen / Leren / Blessures / Sporten | Geselecteerde modus zichtbaar |
| Flexibele hoofdruimte | `StructureNavigator`, 272 px. Zoekveld; regio's; lagen; structuurlijst | `SceneViewport`, resterende ruimte; oriëntatie boven; focusbadge/label; camera; toolbar onderaan | `DetailPanel`, 352 px; selectie; korte uitleg; secties; bronnen |

De rij met vijf modi is één bediening voor alle schermtoestanden. Houd de actieve structuur altijd zichtbaar in het breadcrumbpad en informatiekop, ook wanneer labels in de 3D-scène verborgen zijn. In de viewer zijn camera- en selectiebediening gescheiden van inhoudelijke knoppen. De toolbar is een HTML-overlay binnen de scène, geen onderdeel van de 3D-wereld. Overlayknoppen blijven binnen safe insets en blokkeren zo min mogelijk geometrie.

### 3.2 Tablet wireframe — 1024×768 referentie

| Gebied | Inhoud |
|---|---|
| Boven | Header, breadcrumb, vijf modi als rij indien labels passen; anders select |
| Werkvlak | 3D-viewer volle breedte; toolbar onderaan met Lagen, Structuren, Informatie, camera-acties |
| Links op verzoek | `StructureDrawer` met zoekveld, regio/structuur en lagensectie (tabs of duidelijke secties) |
| Rechts op verzoek | `DetailDrawer` met selectie en detailinhoud |
| Onder/naast het werkvlak | Compacte selectie-indicator en knop `Bekijk informatie` wanneer het detailpaneel dicht is |

Op tablet is maximaal één modal drawer tegelijk geopend. De selectie blijft bestaan wanneer een paneel sluit. Open op selecteren geen drawer die het gekozen object onverwacht bedekt; maak de detailknop zichtbaar, en laat focus op de interactieplaats tenzij de gebruiker expliciet om detail vraagt. In landscape kunnen panelen niet-modale zijpanelen worden als de effectieve desktopbreedte daadwerkelijk wordt bereikt.

### 3.3 Mobiel wireframe — 390×844 referentie

| Volgorde boven naar beneden | Component en hoogte |
|---|---|
| 1 | `AppHeader` 56 px: logo, NL/EN, menu |
| 2 | `ContextBar` min 40 px: terug/actuele regio en structuur; volledige hiërarchie via knop |
| 3 | `ModeSelect` min 48 px, huidige modus volledig leesbaar; native select of toegankelijk menu |
| 4 | `SceneViewport` min 280 px, ca. 48svh: oriëntatie, selectielabel, canvas/fallback |
| 5 | `ViewToolbar` min 48 px: Lagen, Structuren, Focus, Reset; extra camera-acties in toegankelijk menu |
| 6 | `DetailPanel`: naam + synoniem + korte samenvatting; inhoud, bronnen, volgende stappen in normale flow |

Lagen en structuren openen een sheet met duidelijke titel, sluitknop en sleepindicator die niet de enige sluitmethode is. Sheet maximaal ca. 85% van de beschikbare viewport, interne scroll, toetsenbordfocus zichtbaar; op 320 px breed en met zichtbaar schermtoetsenbord kan dit een volschermdialoog zijn. De toolbar mag op smalle schermen naar een 2×2-raster ombreken; geen afgekapte labels of kleinere drukvlakken. De pagina heeft geen permanente onderste navigatiebalk die het canvas of actieknoppen bedekt. De viewer kan optioneel vergroot worden via een expliciete knop; Escape/terug sluit vergroting. Geen verplichte landscape-modus.

## 4. Scherm voor scherm

### 4.1 Startpagina (`Home`)

1. `Hero`: H1 "Ontdek het menselijk lichaam"; één zin over interactief leren; primaire CTA **Verken het lichaam**. Optionele 2D-poster of gecontroleerde statische modelafbeelding, geen WebGL-download voordat de gebruiker de atlas kiest.
2. `ModeGrid`: vijf beknopte kaarten met eigen titel, icoon en één zin, gerangschikt Herstellen / Trainen / Leren / Blessures / Sporten. Een kaart opent dezelfde atlas met de gekozen modus; geen extra tussenpagina of vragenformulier. Desktop 5 kaarten als de breedte toelaat, anders 3+2; tablet 2; mobiel 1 of 2 bij voldoende kaartbreedte (min 152 px), toetsenbordvolgorde gelijk aan visuele volgorde.
3. `SubjectGrid`: uitsluitend werkelijk bereikbare onderwerpen; anatomie primair. Na Gate 4 komen aanvullende domeinen erbij, elk met eigen korte inhoudsomschrijving en de status van technisch/gecontroleerd beschikbaar zijn.
4. Korte uitleg, wat de viewer wel/niet doet, link naar bronnen en credits; `Footer` met toegankelijkheid, licenties en contact indien later goedgekeurd. Geen marketingclaims over medische resultaten of ongevalideerde nauwkeurigheid.

Acceptatie: eerste CTA zonder scrollen goed zichtbaar op 390×844; een gebruiker kan binnen twee acties van start naar een bruikbare atlas (inclusief modekeuze); de landing blijft leesbaar zonder canvas/JavaScript-renderer. Geladen hero-afbeeldingen hebben betekenisvolle alttekst wanneer informatief, anders decoratief gemarkeerd.

### 4.2 Werkvlak — lichaam en regio

- Eerste openen: model gecentreerd in neutrale, vooraf gecontroleerde anatomische oriëntatie; zichtbaar welke regio beschikbaar is. Defaultmodus `Leren`, tenzij vanuit een andere modus geopend. Geen automatische camera-animatie.
- `StructureNavigator`: bovenaan zoeken op naam/synoniem; daarna regio's en de zichtbare structuurboom; aparte lagensectie met aantallen alleen als het assetmanifest betrouwbare aantallen levert. Een lege zoekopdracht herstelt de hiërarchie. Zoeksuggesties sturen geen gegevens naar een server.
- `SceneViewport`: de gebruiker kan orbit/pan/zoom, een mesh selecteren, focus/reset bedienen. Oriëntatie-indicator geeft begrijpelijke richtingen (voorkant, achterkant, links/rechts) met gecontroleerde modelconventies, niet op basis van schermrichting gokken. Toon geen zwevende labels voor alle meshes tegelijk.
- `DetailPanel` zonder selectie heeft een bruikbare uitleg: "Kies een structuur in het model of gebruik de lijst"; regio-inhoud indien beschikbaar. Focus/Isoleren is dan uitgeschakeld met zichtbare reden. Een tekstalternatief blijft altijd bereikbaar.
- Regiokeuze: update geselecteerde regio en camerafocus; structureer de lijst naar die regio. Navigeer terug naar lichaam zonder willekeurige reset van modus/taal. De exacte terugactie volgt de IA-afspraken.

### 4.3 Werkvlak — gekozen structuur

`DetailPanel` heeft een vaste volgorde:

| Positie | Weergave |
|---|---|
| Kop | Naam in huidige taal; synoniem/Latijn als gecontroleerd, systeem/regio en zijde indien van toepassing |
| Acties | Focus, Isoleren (wisselknop), link naar publieke selectie indien geïmplementeerd |
| Samenvatting | Korte, toegankelijke en gereviewde uitleg |
| Modusafhankelijke secties | Zie matrix hieronder; geen verzonnen/automatisch gegenereerde medische tekst |
| Gerelateerde structuren | Geverifieerde relaties, klikbare lijst met naam en context |
| Bronnen | Herkomst/links, reviewerstatus, revisiedatum; altijd zichtbaar bereikbaar |

Selectie in de viewer of lijst wordt synchroon: amber outline/highlight, een duidelijk HTML-label en `aria-current` of passend semantisch selectiekenmerk in de lijst (niet meerdere actieve objecten als de app één selectie ondersteunt). Indien het object verborgen is door lagen, toon `Verborgen in huidige lagen` met een expliciete actie **Toon structuur**; wijzig de laagkeuze niet stilzwijgend. Isolatie heeft een expliciete knop **Isolatie opheffen** en herstelt de vorige zichtbare lagen. Modewissel verandert alleen de inhoud.

### 4.4 Inhoudsmatrix vijf modi

| Modus | Secties in het detailpaneel (na review) |
|---|---|
| Leren | Naam en ligging, vorm, aanhechting/relaties indien beschikbaar, functie, begrippen en bronnen |
| Trainen | Algemeen bewegingspatroon en betrokken structuren, gecontroleerde uitleg/animatie, aandachtspunten |
| Herstellen | Algemene uitleg over belasting, herstel en bewegingsvrijheid; geen individuele behandeling |
| Blessures | Begrippen en algemene context, wanneer professionele hulp passend kan zijn; geen diagnose of symptoomcheck |
| Sporten | Betrokken bewegingen en biomechanische uitleg, gecontroleerde sportspecifieke context |

`ContentSections` rendert uitsluitend goedgekeurde records van juiste structuur/modus/taal. Als geen record is vrijgegeven, blijf de structuur tonen en gebruik "Voor deze modus is nog geen gecontroleerde uitleg beschikbaar" met een knop naar beschikbare uitleg. Indien geen vertaling is vrijgegeven, expliciete taalkeuze naar een beschikbare versie; nooit ongemarkeerd andere taal of andere structuur invullen. Publicatiewoording volgt de medische review uit het masterplan.

### 4.5 Video en beweging (Gate 2/3)

`LessonMedia`: poster met afspeelknop, duur indien exact bekend, standaard gepauzeerd; play/pause, opnieuw starten, ondertiteling, volume voor video, transcript als uitklapbare HTML-tekst. Geen autoplay; ondersteun reduced-motion door animaties alleen na actie te starten en camerapad desgewenst onmiddellijk toe te passen. Voor 3D-beweging: play/pause, fase-/tijdaanduiding met betekenisvolle units, reset naar uitgangspositie. Is er geen animatie, verberg de knop; overlaad de POC niet met inactieve functies.

Doorsnede, transparantie per laag en exploded view horen in `AdvancedControls` na Gate 3. Pas gepubliceerde mogelijkheden toe. Elke schuifregelaar heeft numerieke waarde, betekenis, grenzen en reset; doorsnede heeft duidelijk vlak/positie en zichtbare aan-uitknop. Deze functies zijn optioneel en mogen de standaardroute niet verstoren.

### 4.6 Achtwekenprogramma (niet-gepersonaliseerd; Gate 2+)

`ProgramIntro`: titel en uitleg, algemeen doel, inhoud en eventuele beperkingen, duidelijke educatieve context. Er is geen diagnose- of gezondheidsvragenlijst. CTA `Start programma` toont eerst de lokale opslagwaarschuwing en vereist geen account.

`WeekList`: acht weken met lesnamen, korte duur/onderwerp indien bekend en een expliciete status (Nog niet gestart/Bezig/Afgerond). Desktop links een weeklijst, rechts lesdetail; tablet en mobiel accordeon/gewone kaarten. `LessonCard` linkt naar relevante atlascontext, met duidelijke terugkeerroute. `ProgressControls`: markeer les als voltooid/maak ongedaan, voortgang als tekst én balk (afgeronde lessen / totaal), reset/wis na bevestiging. Persisteer alleen program-ID, huidige week en afgeronde les-ID's. Geen naam, klacht, medische score of gepersonaliseerde voorspellingen. Meld "Voortgang wordt op dit apparaat bewaard en kan verdwijnen als je browsergegevens wist" en bied bruikbare sessiebediening wanneer opslag niet beschikbaar is.

### 4.7 Toegankelijk 2D/HTML alternatief en onderwerpmodules

Bij WebGL2-tekort, context loss of expliciete keuze blijft `AccessibleAtlas` actief: dezelfde structuurboom, zoekfunctie, moduskeuze, breadcrumb, tekst en bronnen. Gebruik uitsluitend daadwerkelijk beschikbare en gelicentieerde 2D-overzichten. Zonder 2D-asset is de HTML-structuurlijst voldoende; meld de afwezige geometrie helder. Acties die 3D vereisen zijn uitgeschakeld, terwijl tekstuele functies blijven werken. Bied `Probeer 3D opnieuw` zonder paginareset wanneer praktisch.

Na Gate 4 krijgt ieder onderwerp dezelfde shell, maar levert de module eigen labels, selectiehiërarchie, units, instellingen en inhoud. Informatiepanelen mogen niet anatomische modes of lagen tonen bij vakgebieden waar die geen betekenis hebben. Onderwerpwissel heeft één duidelijke actie, ontkoppelt de vorige module, toont nieuwe schaal/units en behoudt taal. Een eventueel celmodel wordt als aparte scène geladen met schaal-/contextvermelding.

### 4.8 Bronnen, help en privacy (S01/S02/S03)

Alle drie zijn server-renderbare documentpagina's met breadcrumb, één H1, leesbare tekstkolom van maximaal ca. 72 tekens per regel en links terug naar de atlas. Op desktop kan een inhoudsopgave naast de tekst staan; mobiel wordt die een gewone lijst met ankerlinks boven de inhoud of een optionele uitklapsectie. S01 bevat model-/tekst-/media-attributie per asset, versienummers en licentieteksten/links. S02 toont korte instructies voor touch, muis, toetsenbord, mode, layers en fallback. S03 legt feitelijk uit welke voortgang lokaal wordt opgeslagen, bevat reset/wisbediening zodra programma's beschikbaar zijn en noemt expliciet dat deze geen medisch profiel zijn. Niet-beschikbare functies staan alleen als roadmap, niet als huidige gebruiksinstructie. Bron- en helpcontext blijven ook vanuit het detailpaneel gemakkelijk bereikbaar.

## 5. Designsysteem (voorgestelde tokens)

Tokens worden centraal beheerd in `packages/ui`; componenten gebruiken semantische CSS custom properties, geen losse hexkleuren. Donker is de eerste wetenschappelijke werkvlakstijl. Een lichte thema-variant vereist eigen contrast- en regressietests, en is geen releasevoorwaarde voor de spike. Exacte modelkleuren vallen onder het asset-/anatomiebeleid, niet het UI-palet.

| Token | Waarde | Gebruik |
|---|---|---|
| `--bg` / `--scene-bg` | `#0B1220` | Pagina en neutrale scèneachtergrond |
| `--surface` | `#111C2B` | Header, paneel |
| `--surface-raised` | `#172638` | Cards, invoervelden, dialogs |
| `--border-control` | `#617FA0` | Essentiële controlranden, altijd toetsen aan aangrenzende kleur |
| `--border-subtle` | `#263B51` | Alleen decoratieve scheiding, niet de enige controlindicator |
| `--text` | `#F4F7FB` | Primaire tekst |
| `--text-secondary` | `#BCCBDC` | Secundaire tekst |
| `--text-muted` | `#9DABC0` | Ondersteunende labels; geen cruciale informatie te klein |
| `--accent` / `--focus-ring` | `#79DCFF` | Primaire acties, focus |
| `--on-accent` | `#092033` | Tekst op primaire knop |
| `--selection` | `#FFD166` | Selectie in paneel/3D-outline; niet uitsluitend kleur |
| `--success` | `#87E0B1` | Status met tekst/icoon |
| `--error` | `#FFB4AB` | Foutstatus met tekst/icoon |

Ontwerpcontrast berekend met de relatieve luminantieformule: primaire tekst op surface ca. 16:1, secundaire tekst op surface 10,4:1, muted tekst op raised 6,6:1, accent op raised 9,8:1 en tekst op accent 10,7:1. Dit zijn kleurpaarberekeningen, geen WCAG-audit van een werkende app. Test ook hover, disabled, focus, tekst over canvas, gradients, forced-colors en daadwerkelijke geometrie. Plaats labels over een voldoende ondoorzichtige UI-achtergrond; een amber mesh-outline kan tegen bepaalde geometrie onvoldoende contrast hebben en krijgt dan een tweede donkere rand plus een zichtbaar tekstlabel.

### 5.1 Typografie, spacing en componentmaten

Gebruik voorlopig `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` voor betrouwbare rendering zonder externe fontdownload. Geen mono-font voor lopende uitleg; technische ID's en units mogen monospace zijn. Test lange NL/EN-labels en 200% tekstzoom.

| Token | Maat/regelhoogte | Gebruik |
|---|---|---|
| display | clamp(32px, 4vw, 48px) / 1,15 | Startpagina H1 |
| heading-1 | 28 / 36 px | Pagina-/schermtitel |
| heading-2 | 22 / 30 px | Geselecteerde structuur, sectiekop |
| heading-3 | 18 / 26 px | Subsecties |
| body | 16 / 24 px | Uitleg, knoppen en invoer |
| small | 14 / 20 px | Labels en ondersteunende info |
| caption | 12 / 18 px | Niet-essentiële metadata; vergrootbaar |

- Spacing gebaseerd op 4 px: 4, 8, 12, 16, 24, 32, 48, 64. Kaartpadding 16–24; paneelpadding 16; toolbar gap 8.
- Radii: 8 px control; 12 px card/panel; 16 px modal/sheet; geen decoratieve afronding op de randen van een schermvullend paneel.
- Icoon 20–24 px in minimaal 44×44 px bedieningsruimte. Zichtbare tekstlabels voor kernfuncties; tooltips zijn aanvullend en werken ook op toetsenbordfocus. Geen betekenisvolle informatie uitsluitend in icoon/kleur.
- Primaire knop filled-accent met tekstkleur `on-accent`; outline voor secundaire actie; `aria-pressed` voor aan/uit. Hover, active, disabled, focus en loading hebben onderscheiden presentatie én semantiek. Focusring 2–3 px met 2 px offset waar mogelijk; niet afsnijden door overflow.
- UI-transities: circa 120–180 ms, camera alleen vloeiend op expliciete actie; geen automatische looping. `prefers-reduced-motion`: geen translate/zoom-animatie van dialogs, camera direct naar doel wanneer gekozen; noodzakelijke statusindicator blijft statisch begrijpelijk.

## 6. Componentcontracten en bedieningssemantiek

| Component | Input/state | Output/gedrag |
|---|---|---|
| `AppHeader` | locale, subject, beschikbare routes | `onLocaleChange`, navigeer; behoud context |
| `ContextBar` | canonical pad, selectionId | stap terug/ga naar ancestor via IA-contract |
| `ModeSwitcher`/`ModeSelect` | mode, beschikbaarheidsmetadata | `onModeChange`; tabs met gekoppeld paneel of native select, nooit gelijktijdig dubbel in toegankelijkheidsboom |
| `StructureNavigator` | catalogus, filter, regio, selectionId, layer state | `onSelect(id)`, `onLayerChange`; structuurlijst en zoekresultaten navigabel via toetsenbord |
| `SceneViewport` | actieve module, scene/camera/lagen, selectionId, status | events met canonical ID; canvasfouten naar fallback; DOM-alternatief |
| `ViewToolbar` | capability flags, selection, camera/isolatiestatus | `onFocus`, `onResetCamera`, orbit-/zoomacties, open panelen; verberg niet-ondersteunde capabilities |
| `DetailPanel` | structureId, mode, locale, reviewstatus | inhoud/bronlijst, expliciete focus/isolatie-/verwante selectieacties |
| `OverlayDrawer` / `MobileSheet` | title, open, inhoud | sluit via knop/Escape, focus binnen echte modal en herstel focus bij sluiting; achtergrond inert |
| `LessonMedia` | gecontroleerde asset en transcript | play/pause/reset, gebruiker initieert afspelen |
| `StatusNotice` | loading/empty/error/fallback en herstelactie | tekstuele melding en bruikbare vervolgstap; beleefd live melden waar relevant |

Een React-structuurboom mag starten als gewone geneste HTML-lijst met expansieknoppen (`aria-expanded`) om robuuste toetsenbordnavigatie te garanderen. Als later ARIA-tree gebruikt wordt, implementeer het volledige pijltjestoets-/Home-/End-/selectiepatroon. Meshpicking levert dezelfde canonical ID als de lijst. Bij selectie meldt een debounced live regio bijvoorbeeld "Linker deltaspier geselecteerd"; niet elke hover of camerafractie melden. Gebruik aria-busy terwijl content werkelijk wijzigt. Gebruik native radio-/select-/togglecontrols boven custom widgets waar passend.

Visuele state `selection`, `visibleLayerIds`, `mode`, `camera` is afkomstig uit de gedeelde scene-store; een drawer open/dicht, zoekveldtekst of focus zijn aparte lokale UI-state. Camera-acties mogen nooit ongemerkt medische of voortgangsdata muteren. De contentversie wordt expliciet bepaald door resolver en gevalideerde assetmapping, niet door de zichtbare naam in de UI.

## 7. Fout-, laad-, leeg- en beperkte toestanden

| Toestand | Wat ziet de gebruiker? | Actie en garantie |
|---|---|---|
| Eerste asset laadt | Neutraal laadpaneel / skeleton, "3D-model wordt geladen" | Als werkelijke progress bekend is percentage; anders indeterminate. HTML navigatie/content blijft beschikbaar |
| Content laadt | Vorige titel blijft alleen als structuur nog dezelfde is, nieuwe paneelskeleton | Nooit oude inhoud onder nieuwe structuurkop; status tekstueel |
| Geen selectie | Instructie "Kies een structuur" | Ga naar structuurlijst, focus/isolatie disabled met reden |
| Zoekresultaten leeg | "Geen structuren gevonden voor …" | Filter wissen, naam/synoniem uitleg; geen verzonnen matches |
| Geen goedgekeurde content | "Nog geen gecontroleerde uitleg voor deze modus" | Kies beschikbare modus; modelselectie behouden |
| Vertaling ontbreekt | Taalstatus duidelijk | Expliciet andere beschikbare taal kiezen; geen stille fallback |
| Meshmapping ontbreekt | Structuur niet als geometrisch selecteerbaar geclaimd | HTML-item indien correct beschreven; tekst dat het 3D-model niet beschikbaar is |
| Netwerk/assetfout | "Het 3D-model kon niet worden geladen" | Retry + HTML-alternatief; geen technisch stacktrace of persoonlijke data in foutbericht |
| Context loss / GPU onvoldoende | Rustig vervangen canvas door fallback | Probeer opnieuw, selectie/modus/taal behouden; geen continue reload-loop |
| Browseropslag geweigerd | Voortgang in huidige sessie, melding "Niet op dit apparaat bewaard" | Geen netwerkupload; duidelijke reset/terugroute |
| Onbekende/verouderde link | "Deze structuur is niet meer beschikbaar" | Naar juiste bovenliggende regio of lichaam, expliciet; alias alleen indien gevalideerd |

Loading- en foutweergaven hebben gereserveerde ruimte om layoutverspringing te beperken; bedieningsknoppen die tijdens laden onbruikbaar zijn zijn disabled met toegankelijke reden, niet alleen opacity. Preserveer bruikbare HTML-navigatie ook bij lage netwerkcapaciteit. Repeated failures worden niet permanent opgeschort achter een spinner.

## 8. Acceptatiecriteria (UI-ticketset)

| ID | Testbaar criterium | Bewijs |
|---|---|---|
| UI-01 | Bij 320, 390, 768, 1024, 1200 en 1440 CSS-px breedte geen afgesneden tekst of horizontale paginascroll; laag-/structuurkeuze en detail blijven bereikbaar. Ook 200% zoom en landscape. | Screenshots + browser-E2E responsive |
| UI-02 | Gebruiker opent atlas via start of vijf modi; dezelfde canonical structuur-ID, camera en zichtbare lagen blijven behouden bij moduswissel. | E2E scene-store assertions |
| UI-03 | Eerste modelroute is te voltooien met touch, muis én toetsenbord (zoek, selecteer, wissel mode, lees bron), zonder drag verplicht. | E2E + handmatige device-/screenreadertests |
| UI-04 | Een modal drawer/sheet opent en sluit met keyboard en touch; focus keert terug; geen twee gelijktijdige overlays; achtergrond niet bedienbaar indien modaal. | Focus- en keyboardtest |
| UI-05 | Selectie zichtbaar als tekst én grafische markering; actieve laag/toestand herkenbaar zonder kleur; alle primaire acties minimaal 44×44 CSS-px. | Contrast + handmatige inspectie |
| UI-06 | Contrasten: WCAG 2.2 AA als doel; ≥4,5:1 gewone tekst, ≥3:1 grote tekst en essentiële visuele controls, met focus zichtbaar en niet bedekt. | Geautomatiseerde check + handmatige audit op echte UI |
| UI-07 | NL/EN omzetting behoudt context, gebruikt juiste content en ondersteunt lange labels, ontbrekende vertaling en bronstatus. | i18n tests + screenshots |
| UI-08 | Gesimuleerde WebGL-/assetfout, onbekende ID en offline/zwak netwerk laten informatiepad bruikbaar en duidelijk. | E2E foutinjectie |
| UI-09 | Reduced motion geen ongewenste beweging; video/animatie standaard uit; transcript en bronnen zijn bereikbaar. | Voorkeurssimulatie + handmatige test |
| UI-10 | Geen ongecontroleerde anatomische claims, ongebouwde functies, medische persoonsgegevens of symptoomvelden zichtbaar of opgeslagen. | Review en privacytest |
| UI-11 | Na Gate 2 programma voortgang alleen lokaal; reset/ongedoaan werkt; denied storage geeft eerlijke status. | Browser storage inspectie/E2E |
| UI-12 | Visuele regressies worden getest voor start, lege atlas, geselecteerde schouderstructuur, moduswissel, drawer, fallback en ontbrekende content in beide talen. | Baseline en PR-artefacten |

Voor de POC zijn UI-01 t/m UI-08 en UI-10 relevant voor geïmplementeerde functies. Meet gebruiksgemak met een kleine gebruikerstest, niet met een veronderstelling: minimaal vijf deelnemers met uiteenlopende apparaatervaring, opdrachten zonder voorafgaande uitleg (zoek schouderspier; wissel modus; herstel isolatie indien aanwezig; vind bron; gebruik HTML-alternatief), leg taakvoltooiing en obstakels vast. Doel ≥4 van 5 deelnemers voltooien iedere beschikbare kerntaak zonder hulp; dit is een ontwerpdoel, geen representatieve statistische claim. Blokkerende toegankelijkheids-, navigatie- of inhoudsfouten moeten vóór vrijgave worden opgelost.

## 9. Werkverdeling en definitie van gereed

- UX lead bewaakt IA/routes en kernflows; UI lead beheert tokens, componentvarianten en wireframes; frontend lead implementeert componenten zonder eigen selectie- of modusstore.
- 3D lead levert capabilities, events en cameragrenzen; asset-/anatomielead valideert namen, geometrie, oriëntatie en bron; contentlead vult alleen gereviewde locale/structuur/mode-records.
- QA koppelt UI-criteria aan G0-08, G1-02/03/07 en G2-01/05; toegankelijkheidsreview controleert schermlezers, toetsenbord, touch en reflow; privacy/licentiereview controleert presentatie en data.
- PR bevat screenshot- of videovergelijking op desktop/mobiel, testgevallen, canonical ID/state-effecten, toegankelijkheidscontrole en status van content/licentie. Visuele polish mag niet de POC-gate vertragen; prioriteit is stabiele en uitlegbare basisbediening.
- Open voor validatie: werkelijke modelkleur/contrast, labels die vanuit de gecontroleerde catalogus komen, dimming/outline tegen specifieke meshes, effectieve paneelmaten op echte mobiele browsers, en gemeten gebruiksgemak. De waarden hierboven zijn voorgestelde implementatiebaselines, geen verklaring dat de live site ze al bezit.
