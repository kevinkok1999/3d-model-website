# UX-05 — Bruikbaarheid, toegankelijkheid en vrijgavekwaliteitsplan

**Documentstatus:** ontwerp- en uitvoeringsblauwdruk; geen uitgevoerde tests of certificering. **Eigenaar:** QA, Accessibility & Performance Lead (rol 13). Review: UX (03), 3D (04), anatomie (06), lokalisatie (09), privacy (11), DevOps (12), licenties (14). Deze blauwdruk vult `planning/06-RISICOS-EN-TESTPLAN.md` aan; zij vervangt de daarin opgenomen technische risico's en de gates G0–G5 niet.

## 1. Kwaliteit is onderdeel van elk scherm

De gebruiker moet zelfstandig kunnen ontdekken, oriënteren, verdiepen en terugkeren. Niet alleen een aantrekkelijke canvas telt als succes: ook zonder GPU, zonder muis of zonder kennis van anatomische termen moet dezelfde gecontroleerde leerinhoud bereikbaar blijven. De vijf modi zijn alternatieve informatieweergaven van één centrale selectie. Navigatie, taal, inhoud en selectie mogen nooit tegenstrijdige anatomische informatie suggereren.

| Kwaliteitsas | Operationele eis | Primair bewijs |
|---|---|---|
| Vindbaarheid | Van home naar de anatomieatlas en van lichaam naar een regio/structuur, via 3D én via structuurboom | U-01/U-02 en ROUTE-01 |
| Controle | Iedere actie heeft herkenbare feedback, omkeerbare weergave en expliciete reset; geen onverwacht beeldverlies | U-04, 3D-02/03 |
| Begrip | Gebruiker kan selectie, actief niveau, actieve modi en schaal herkennen; onzekerheden en ontbrekende content zijn zichtbaar | U-03/U-05, 3D-06, CNT-01 |
| Toegankelijkheid | Essentiële kennis en bediening toegankelijk zonder canvas, toetsenbord en screenreader | A11Y-01–10 |
| Responsiveness | Op klein scherm is geen element essentieel maar onbereikbaar, onleesbaar of overlappend | RESP-01–04 |
| Betrouwbaarheid | Bron/model/inhoudfouten leveren neutrale uitleg op, niet stilzwijgend een verkeerde structuur of claim | ERR-01–05, CNT-01/02 |
| Privacy | Geen accounts, vragenlijst, diagnose, symptoomdata of tracking van anatomiekeuzes; uitsluitend lokale progressie in G2 | SEC-01–04 |
| Prestaties | Doelhardware en meetmethode per release vastleggen; prestatiemetingen vóór release | PERF-01–05 |

## 2. Representatieve gebruikerstest (gepland)

### 2.1 Opzet

- Werk met minimaal 8 onafhankelijke testpersonen in de eerste gerichte usability-ronde, verdeeld over NL en EN; bij Gate 1 minimaal 4 mobiel en 4 desktop, met overlap voor toetsenbord- en screenreadergebruik. Waar mogelijk aanvullen met mensen die weinig anatomie-/3D-ervaring hebben en ten minste twee deelnemers met toegankelijkheidsbehoeften. Laat deskundigen aanvullend de inhoud beoordelen, niet de novice-test vervangen.
- Geen persoonlijke gezondheidsvragen of echte klachten verzamelen. Werk met fictieve leervragen (bijv. een structuur zoeken voor een les). Gebruik vrijwillige deelname, anonimiseer resultaten en noteer geen herleidbare namen of medische details in de repository.
- Iedere deelnemer begint met een schone browser en de relevante taal; gebruik zo veel mogelijk echte apparaten. Toon taken één voor één, zonder te verklappen waar knoppen zitten; corrigeer alleen bij veiligheid of aanhoudende blokkade. Wissel takenvolgorde waar dat de leeruitkomst niet vervalst.
- Registreer per taak tijd tot betekenisvolle voltooiing, zelfstandigheid, navigatiefouten, assistentie, misinterpretatie, frustratie, technische fout en één eenvoudige waardering (1 = zeer moeilijk, 7 = zeer gemakkelijk). Een moderator legt de oorzaak en het bewijs vast. Een ontbrekende implementatie betekent N/A voor een latere gate, niet 'geslaagd'.

### 2.2 Taken en voorgestelde richttijden

De richttijden zijn ontwerpdoelen voor een nieuwe gebruiker, geen reeds gemeten waarden. Beoordeel beide talen en inputmethodes; pas tijden indien nodig expliciet aan op toegankelijkheidsworkflow, zonder de eis van zelfstandigheid af te zwakken.

| Test-ID | Gate | Neutrale opdracht | Voltooiing | Richttijd | Eigenaar |
|---|---|---|---|---:|---|
| U-01 | G0 | Open het lichaam vanuit het startscherm. | Juiste anatomiescène verschijnt met herkenbare oriëntatie en status. | 30 s | UX + QA |
| U-02 | G0 | Zoek de schouderstructuur die in de proefcatalogus is opgenomen; gebruik de 3D-weergave of de lijst. | Juiste canonical ID en bijbehorende bronbeoordeelde inhoud, links/rechts ondubbelzinnig. | 60 s | UX + anatomie + QA |
| U-03 | G0 | Bekijk dezelfde structuur in Leren en Trainen; probeer Engels of Nederlands. | Selectie blijft gelijk, content en labels volgen taal en modus. Geen inhoud verzonnen indien modus leeg is. | 45 s | UX + content + QA |
| U-04 | G1 | Toon alleen de gewenste laag/structuur, vind een andere kijkhoek en ga terug naar volledig lichaam. | Acties zichtbaar bevestigd; focus/isolate/reset correct; geen vastgelopen toestand. | 60 s | 3D + QA |
| U-05 | G1 | Open een link naar een specifieke structuur, ga één niveau terug en weer vooruit. | URL, selectie, breadcrumb en inhoud blijven consistent; geen private gegevens in URL. | 45 s | UX + architect + QA |
| U-06 | G1 | Lees informatie over dezelfde structuur zonder de 3D-canvas te bedienen. | Structuur via HTML-zoek-/lijstbediening vindbaar; essentiële inhoud toegankelijk. | 90 s | QA accessibility |
| U-07 | G2 | Bekijk een algemene beweging en stop/pauzeer die; bekijk ondertiteling of tekst. | Animatie kan worden gepauzeerd; alternatief geeft dezelfde relevante lesinhoud. | 45 s | biomechanica + QA |
| U-08 | G2 | Kies vrijwillig een algemeen programma, markeer een les en heropen de browser; verwijder je voortgang. | Alleen toegestane voortgang lokaal bewaard en volledig wisbaar; gebruiker begrijpt opslagbeperking. | 90 s | data + privacy + QA |
| U-09 | G3 | Verken doorsnede of exploded view en keer terug naar normaal. | Structuur-identiteit klopt voor/tijdens/na actie; geen desoriëntatie of animatieval. | 60 s | 3D + QA |
| U-10 | G4 | Open een tweede onderwerp en keer terug naar de anatomieatlas. | Onderwerpkeuze, schaal en inhoud helder; geen onbedoelde state-/resourcelekkage. | 60 s | sim + UX + QA |

### 2.3 Score- en bijsturingsmodel

Per taak: **2** = zelfstandig voltooid, **1** = voltooid met aanwijzing, **0** = niet voltooid of verkeerde uitkomst. Onafhankelijk daarvan telt een verkeerd gekoppelde structuur, onbeoordeelde gezondheidsclaim of onverwachte gevoelige opslag als kritieke fout, ook als de deelnemer tevreden is.

Per gate vastleggen:

- Zelfstandig succespercentage = aantal scores 2 / aantal toepasselijke observaties × 100%. Voorgesteld acceptatiedoel: minimaal 90% over alle essentiële taken en geen enkele deelnemer geblokkeerd zonder toegankelijk alternatief. Bij N=8 betekent 90% per taak praktisch 8/8; rapporteer ruwe aantallen en vermijd schijnprecisie.
- Gewogen taakscore = som scores / (2 × aantal toepasselijke observaties) × 100%; doel minimaal 90%. Vermeld de score per taak en inputvorm, zodat een gemiddelde geen zwak scherm maskeert.
- Gemaksscore (1–7): mediaan ≥ 5 per essentiële route; rapporteer spreiding en concrete knelpunten. Tijd: mediaan binnen de richttijd op de toepasselijke standaardbedieningsvariant; verklaar afwijkingen en prioriteer blokkades.
- Kritieke fouten: 0. Verbeter alle blokkerende en ernstige problemen, herhaal dezelfde taak met een nieuwe deelnemer of representatieve hertest. Bij kleine steekproeven is dit richtinggevend, geen bewijs dat iedereen het product kan gebruiken.

## 3. Toegankelijkheidschecklist (WCAG 2.2 AA als kwaliteitsdoel)

Geen claim van formele conformiteit zonder volledige handmatige en geautomatiseerde audit. Gebruik de onderstaande concrete checks plus de volledige toepasselijke WCAG-checklist per gate. Canvas alleen is geen toegankelijke gebruikersinterface. In elk geval blijft dezelfde gecontroleerde tekstinhoud beschikbaar via normale HTML.

| Test-ID | Stap en controle | Verwachte uitkomst | Gate / eigenaar |
|---|---|---|---|
| A11Y-01 | Navigeer met Tab/Shift+Tab vanaf eerste paginakop tot taak is voltooid, zonder muis. Gebruik Enter/Space op knoppen en de gedocumenteerde pijltjestoetsen binnen samengestelde controls. | Logische focusvolgorde, zichtbare focus, geen trap, geen verlies bij paneel/toggle. Er is een snelkoppeling naar hoofdinhoud. | G0 / UX + QA |
| A11Y-02 | Bedien zoekveld, structuurselectie, modi, lagen, camerabediening/reset en panelen met uitsluitend toetsenbord. | Semantische knoppen/inputs, geselecteerde toestand duidelijk; essentiële acties niet afhankelijk van drag, hover of canvasfocus. | G1 / 3D + UX |
| A11Y-03 | Gebruik NVDA/Firefox of Chrome (Windows), VoiceOver/Safari (Apple), TalkBack/Chrome (Android). Lees home, atlas, gekozen structuur, actieve modus, foutstatus. | Juiste betekenisvolle namen, rollen, status en labels; structuurlijst en inhoud leesbaar; niet elk renderframe/draaihoek als aankondiging. Geen focusverplaatsing bij gewone statusupdate. | G1 / QA |
| A11Y-04 | Controleer tekst/achtergrond, focusring, iconen en actieve/inactieve states op alle thema's; test grijstinten. | Projectspecificatie: normale tekst contrast ≥4,5:1, grote tekst ≥3:1, relevante UI-grenzen en grafische bediening ≥3:1; selectie en waarschuwing herkenbaar zonder kleur alleen. | G1 / UX + QA |
| A11Y-05 | Test browserzoom 200% en layout bij 320 CSS-px; pas tekstspatiëring aan. | Kennis/bediening en tekst blijven zichtbaar zonder ongerechtvaardigde horizontale paginascroll. 3D-weergave mag eigen tweeassige interactie hebben, maar niet het omliggende HTML-alternatief. | G1 / UX |
| A11Y-06 | Bedien alles met touch: scroll, tik, dubbele tik, pinch indien aanwezig, rotatie, sheets en laagknoppen. | Voorkeur aanraakdoelen ≥44×44 CSS-px; bij kleinere doelen geldige WCAG-minimumdoelgrootte/-spacing of uitzondering aantonen; zoom en focus/reset beschikbaar als afzonderlijke bediening, geen drag/pinch-only route. | G0/G1 / UX + 3D |
| A11Y-07 | Zet OS/browser reduced motion aan; open scène, wissel selectie, toon animatie. | Geen onnodige automatische beweging of grote cameratransities; alternatief voor animatie, expliciete afspeel-/pauzebediening, geen flitsrisico. Gebruiker kan essentiële toestand lezen zonder motion. | G1/G2 / 3D + animatie |
| A11Y-08 | Sluit een geopende dialoog of mobiel sheet via sluitknop/Esc waar passend. Test softwaretoetsenbord, schermrotatie en focus. | Focus keert naar zinvolle trigger; inhoud overschaduwt geen essentiële bediening; modal beperkt focus alleen zolang werkelijk modaal. | G1 / UX |
| A11Y-09 | Verander taal met screenreader actief; navigeer dezelfde structuur. | Pagina-lang klopt, geen vertaalkeys zichtbaar, heldere NL/EN-naam en labels, taalwisseling behoudt publieke selectiestate. | G0–G2 / content + UX |
| A11Y-10 | Zet WebGL uit of provoceer contextverlies. Voltooi U-02/U-03 uitsluitend met HTML. | Geen dood scherm; status wordt beperkt en vriendelijk aangekondigd. Lijst, zoekfunctie, bronnen en tekstinhoud blijven beschikbaar; geen geforceerde devicewissel nodig. | G0/G1 / 3D + QA |

Uitvoeringsregime: automatische accessible-name/contrast/DOM-scans bij elk relevant PR als basis; handmatige keyboard- en screenreadertests op iedere nieuwe hoofdroute en vóór release. Automatische scans vinden niet alle betekenis-, volgorde- of canvasproblemen. Bronnen, videotranscript en alternatieve beschrijvingen maken één semantische contentketen, niet twee los bijgehouden datasets.

## 4. Responsive, browser- en hardwarematrix

Vul bij uitvoering exacte OS-/browserversie, toestel, viewport in CSS-px, device pixel ratio, GPU, RAM, input en netwerkprofiel in. De onderstaande matrix is een minimumdoel, geen lijst met reeds ondersteunde toestellen.

| Matrix-ID | Omgeving | Focus | Verplicht |
|---|---|---|---|
| D01 | Windows + Chrome, normale GPU | muis, keyboard, desktop orbit, 1280–1920 breed | G0–G4 |
| D02 | Windows + Firefox, geïntegreerde GPU | compatibiliteit, NVDA, lage GPU-capaciteit | G1–G4 |
| D03 | macOS + Safari | WebGL/Safari, VoiceOver, trackpad en keyboard | G1–G4 |
| M01 | Android middensegment + Chrome, echte telefoon | 360–430 CSS-px, touch, 30 fps-doel, TalkBack | G0–G4 |
| M02 | iPhone + Safari, echte telefoon | staand/liggend, pinch, sheet, WebGL/herstel | G1–G4 |
| T01 | Tablet (iPad/Android Safari/Chrome passend bij OS) | 768–1024 CSS-px, rotatie, touch/keyboard | G1–G4 |
| F01 | Desktop en mobiel met WebGL uit of context verloren | volledige HTML-route, recover-knop | G0–G4 |
| N01 | Afgesproken mobiel netwerkprofiel en vertraagde verbinding, cold/warm cache | progressindicator, timeouts, assetmismatch, herladen | G0–G4 |

| Test-ID | Uitvoering | Passcriterium | Eigenaar |
|---|---|---|---|
| RESP-01 | Open home, atlas, structuurdetail en foutscherm bij 320/360/390/768/1024/1440/1920 CSS-px; controleer ook 200% zoom. | Geen afgekapt essentieel element of onbedoelde horizontale pagina-scroll; labels blijven begrijpelijk. | UX + QA |
| RESP-02 | Open/close panelen of sheets, roteer telefoon/tablet en gebruik softwaretoetsenbord bij zoekinput. | Viewport wordt herberekend; selectie en focus blijven behouden; sluiten/reset blijft bereikbaar. | UX + 3D |
| RESP-03 | Voor beide talen ieder label, lange anatomische naam, bronlink en knop in smalle viewport. | Geen overlap, de afkorting is ontleedbaar en volledige naam zichtbaar/toegankelijk. | content + UX |
| RESP-04 | Klik/tap na resize, scroll en rotatie op dezelfde benoemde structuur in 3D. | Pickcoördinaten volgen actuele canvas bounds; geen foutieve ID door pixel ratio of overlay. | 3D + QA |

Emulatie ondersteunt breedtes en visual regressions; zij vervangt geen echte GPU-, touch-, screenreader- of Safari-hardwaremeting. Maak screenshots van belangrijke toestanden op de referentiebreedtes. Canvas-diffs mogen anti-aliased variatie met expliciet vastgelegde tolerantie hebben; structurele controle van ID, content en scene blijft vereist.

## 5. Controle van 3D-invariante toestand en foutpaden

Gebruik een versiegebonden fixture met minimaal één daadwerkelijk geverifieerde schouderstructuur (canonical ID + providerMeshKey + reviewer + modelhash). Een synthetische dummyfixture kan technische tests vroeg uitvoeren, maar mag geen bewijs zijn voor anatomische juistheid. Alle tests met deferred functionaliteit worden pas verplicht vanaf de betreffende gate.

| Test-ID | Gate | Uitvoeringsstappen | Passcriterium | Eigenaar |
|---|---|---|---|---|
| 3D-01 | G0 | Kies fixture via canvas, touch en structuurlijst. Vergelijk events, selectie-ID, label en contentrecord. | Alle paden resolven dezelfde ID. Geen verkeerd geselecteerde structuur of zijde. | 3D + anatomie |
| 3D-02 | G1 | Toon/verberg laag, selecteer, isoleer, wissel modus, reset. | Geen stille ID-wijziging; selectie/weergavestatus expliciet; reset naar gedefinieerde defaults; labels/knoppen kloppen. | 3D + UX |
| 3D-03 | G0/G1 | Orbit, pan, zoom en focus tot gedefinieerde grenzen; herhaal, reset, wijzig viewport. | Camera blijft bestuurbaar; reset herstelt herkenbaar overzicht; textuele navigatie werkt altijd. | 3D |
| 3D-04 | G1 | Verberg laag waarin huidige structuur zit; probeer de structuur opnieuw te openen via lijst. | Gedrag volgt overeengekomen interaction specification; geen mismatch tussen geselecteerde structuur en getoonde geometrie zonder uitleg. | 3D + UX |
| 3D-05 | G2 | Animatie spelen/pauzeren/stoppen; wissel mode, open ander record of reduced motion. | Geen onbedoelde animatie op nieuwe structuur; bediening weerspiegelt werkelijke speelstatus; alternatief beschikbaar. | 3D + biomechanica |
| 3D-06 | G3/G4 | Explode/clipping toepassen en resetten; later wisselen tussen anatomisch en microscopisch model. | Oorspronkelijke identiteit blijft, geen verkeerde doorsnede/labels; schaalwissel expliciet als nieuw model weergegeven. | 3D + anatomy + sim |
| 3D-07 | G4 | Open module A→B→A; herhaal minimaal 10 cycli; controleer canvassen, listeners, workers, scenes en resources. | Eén actieve viewer; geen groeiende resource- of statelekkage; module-B state beïnvloedt anatomie niet onverwacht. | architect + sim + QA |
| ERR-01 | G0 | Forceer geen WebGL of simulatie van context loss tijdens de sessie. | Tekstueel alternatief meteen bruikbaar; 3D kan veilig opnieuw proberen zonder selectie stil te veranderen. | 3D + QA |
| ERR-02 | G0 | Injecteer 404/timeout, onjuiste assethash of ongeldige GLB. | Geen corrupte weergave of oneindige spinner; duidelijke fout, knop opnieuw proberen of tekstuele route. Nooit onbevestigd extern model downloaden. | asset + 3D |
| ERR-03 | G0 | Open onbekende ID, verkeerde provider mapping en content ontbrekend voor gekozen taal/mode. | Neutrale 'niet beschikbaar'-toestand; gecontroleerde algemene navigatieroute; geen suggestie dat een vervangende structuur hetzelfde is. | architect + anatomie + content |
| ERR-04 | G1 | Wissel snel tussen structuren/modes, module of taal tijdens asynchroon laden; vertraag eerste request. | Late responses kunnen nieuwe selectie/taal niet overschrijven; loading/ready/error blijft consistent. | frontend + 3D |
| ERR-05 | G2 | Simuleer volle/uitgeschakelde local storage, beschadigd schema of private browsermodus. | Site werkt zonder voortgang; begrijpelijke melding over niet-bewaren; geen verzending naar server, geen dataverliesclaim. | data + privacy |

## 6. Route-, inhoud- en privacytests

| Test-ID | Gate | Stappen | Passcriterium | Eigenaar |
|---|---|---|---|---|
| ROUTE-01 | G0 | Open home→atlas respectievelijk mode-ingang→atlas→fixture. | Zelfde structuurrecord en centrale viewer; geen duplicatie van anatomiecanvas tussen vijf modi. | architect + UX |
| ROUTE-02 | G1 | Kopieer publieke deeplink met locale, structuur en modus; open in frisse sessie; gebruik refresh, browser back/forward, breadcrumb. | Route/state/labels/content blijven consistent. Geen progressie of persoonlijke informatie in deeplink. | frontend + QA |
| ROUTE-03 | G1 | Ongeldige route, ongeldige locale/stand of onbekende ID; test oude ID-alias volgens migratiebeleid. | Expliciete veilige fallback/redirect volgens routingcontract, behoud relevante publieke context; geen verkeerde structuur. | architect + frontend |
| ROUTE-04 | G2 | Wissel alle vijf modi bij dezelfde geselecteerde structuur en taal; controleer actieve mode en camera. | Structuur-ID blijft, camera houdbaar volgens contract; uitsluitend relevante goedgekeurde mode-inhoud verschijnt. | UX + 3D + content |
| CNT-01 | G0–G4 | Inspecteer elk gepubliceerd record op canonical ID, locale, mode, bronnen, versie, reviewer, reviewstatus, assetmapping. | Alleen approved, traceerbaar materiaal bij juiste structuur; wederzijdse check van zichtbare naam en bronmapping. | anatomy + content + license |
| CNT-02 | G2 | Inspecteer teksten over trainen, herstellen, sporten en blessures en het programma. | Geen diagnose, garantie, symptoomvragen of gepersonaliseerde behandeladviezen; educatie en grens van inhoud duidelijk. | anatomy + privacy |
| CNT-03 | G2/G4 | Vergelijk transcript/ondertiteling met animatie; valideer een simulatie aan vakspecifieke testcases, units en aannames. | Geen misleidende bewegingen, schalen of uitkomsten; beperkingen expliciet. | biomechanica + sim |
| SEC-01 | G0–G4 | Open browser network, storage en console tijdens selectie, mode-/taalwissel en foutscenario; zoek ook queryparameters en serverlogger. | Geen prompts/gezondheidsvragen, medische eventdata, persoonlijke progressie op server of onnodige telemetrie. Asset-/foutrequests bevatten geen gevoelige informatie. | privacy + QA |
| SEC-02 | G2 | Kies fictief programma, voltooi les, herlaad; inspecteer storage; wis voortgang. | Uitsluitend allowlisted program-ID, week en voltooide les-ID's; correcte verwijdering; geen onverwachte sync. | data + privacy |
| SEC-03 | G0–G4 | Scan source, dependencies, publieke build en assetmanifest; voer XSS-inputtests en checks op URL-/catalogusvalidatie uit. | Geen secrets, bekende blokkerende kwetsbaarheden, ongefilterde HTML-injectie of onbetrouwbare assetreferenties. CSP en veilige externe links geverifieerd. | security + architect |
| SEC-04 | G0–G4 | Controleer per gepubliceerd bestand licentie, bron, attributie, checksum en assetstatus; check ontbrekende record en licentiewijziging. | Niet-goedgekeurde assets blokkeren opname; toegankelijke attribution in website en herleidbaar register. Er wordt niets van Astra hergebruikt zonder aantoonbaar recht. | license + asset |

## 7. Prestatiemeting en regressiebudgetten

Gebruik dezelfde fixture, stabiele versie, dezelfde netwerk-/toestelconditie en gescripte interactievolgorde. Leg cold én warm cache vast; voer minimaal drie runs uit en bewaar medianen plus spreiding. Meet een realistische actieve renderloop, niet alleen stilstaande fps. Leg voor elke metric eerst een reproduceerbare hardwarebaseline vast (G0-05); overschrijdingen vragen een expliciete beslissing en optimalisatieplan, niet automatisch lagere eisen of een veranderde meetmethode.

| Test-ID | Scenario/doel | Methode & passcriterium | Eigenaar |
|---|---|---|---|
| PERF-01 | Home laden (LCP-richtwaarde ≤2,5 s) | Lighthouse/lab plus afgesproken device/netwerk, koude cache; leg medianen vast. | frontend + QA |
| PERF-02 | Eerste atlasweergave | Meet navigatie→eerste feedback en navigatie→eerste bruikbare scène, uitgesplitst download/decode/render. Geen lang onverklaard wachten of vastlopen. Projectbudget vaststellen na eerste POC. | 3D + asset + QA |
| PERF-03 | 60 s orbit/zoom | Middensegment mobiel streeft naar stabiel 30 fps en geschikte desktop 60 fps; rapporteer frame-time mediaan/P95 (30 fps ≈33,3 ms, 60 fps≈16,7 ms), dropped frames en thermische context. Geen universele fps-garantie. | 3D + QA |
| PERF-04 | Lagen/isolatie, later clipping/explode | Log draw calls, triangles, texture/geometry-geheugen en interactieve latentie per weergave. Vergelijk baseline en geef een expliciet maximum na G0 met fallback/LOD. | asset + 3D |
| PERF-05 | 15 min navigeren plus tien mount/unmount-cycli (G4) | Vergelijk stabiele heap, aantal luisteraars/resources en GPU-geheugen waar meetbaar, met vaste methode. Geen aanhoudende monotone groei of dubbele canvas. | 3D + sim + QA |

Voor G1 en verder: iedere relevante wijziging met significante regressie versus de vastgelegde baseline (>10% als voorgestelde initiële waarschuwingsgrens, rekening houdend met meetruis) wordt verklaard en hergemeten. Waarschuwingen zijn geen automatische veiligheidsvrijgave: daadwerkelijke niet-bruikbaarheid, contextverlies zonder fallback of blokkades blijven harde fail.

## 8. Testuitvoering per ontwikkelstap

### Pull request (voor integratie)

1. Owner koppelt test-ID's, fixtureversies, gategroepen en acceptatiebewijs aan het ticket.
2. CI voert lint/typecheck/schema/-licentiechecks, unit-, integratie- en relevante E2E-tests uit. Een toegankelijkheids-scan draait op de gewijzigde pagina. Geplande toolkeuzes (bijv. Playwright en axe) worden pas na dependencyspike vastgezet.
3. Deploy kandidaatversie naar preview vanuit featurebranch/PR. Test echte apparaten voor veranderde risicopaden; voeg alleen geanonimiseerde schermbewijzen toe.
4. Aangrenzende expert controleert contract en state; vakexpert controleert content; QA controleert acceptatiebewijs. Privacy/licentie beoordelen relevante wijzigingen afzonderlijk.
5. Alleen merge bij groene toepasselijke criteria en review volgens bestaande releaseflow. Automatische tests mogen niet worden verwijderd om een gate te passeren. Defecten krijgen eigenaar en hertest.

### Gatevrijgave (gebruik de bestaande G0–G5, niet een parallel besluitstelsel)

| Gate | Aanvullend noodzakelijk UX-bewijs | Vrijgavevoorwaarde |
|---|---|---|
| G0 — beperkte technische POC | U-01..03; A11Y-01/06/09/10 POC-deel; 3D-01/03; ERR-01..03; ROUTE-01; CNT-01; SEC-01/03/04; PERF-01..03 | Eén reproduceerbare, selecteerbare, geverifieerde fixture met juiste NL/EN inhoud en fallback. Geen publieke productclaim. |
| G1 — basisatlas | G0 opnieuw; U-04..06; A11Y-01..10 voor beschikbare functionaliteit; RESP-01..04; 3D-02/04; ERR-04; ROUTE-02/03; PERF-04 | Keyboard/screenreader/HTML-route en echte mobiele/desktopmatrix geslaagd; geen blokkerende usabilityfout. |
| G2 — vijf modi en programma | U-07/08; A11Y-07/09/10; ROUTE-04; 3D-05; CNT-02/03; ERR-05; SEC-02, herhaal G1 | Goedgekeurde educatie, animatiealternatief, centrale selectie en aantoonbaar uitsluitend lokale progressie. |
| G3 — geavanceerde anatomie | U-09; 3D-06 deel; visual-/performance-regressies; opnieuw asset- en inhoudreview | Verdieping/doorsnede geeft aantoonbaar meerwaarde zonder verkeerde anatomische representatie of verslechtering van toegang. |
| G4 — tweede module | U-10; 3D-06/07; CNT-03; PERF-05; tests op modulegrens en route/fallback | Nieuwe module voldoet zelfstandig aan contract, content/security en toegankelijkheid zonder verstoring van anatomie. |
| G5 — commercie | Buiten voorbereidende scope; nieuw besluit en aparte kwaliteits-, privacy-, juridische en gebruikersacceptatie-eisen | Niet vrijgeven op basis van deze blauwdruk alleen. |

## 9. Blokkerende criteria, defectclassificatie en terugvalbeleid

| Ernst | Voorbeeld | Beslisregel |
|---|---|---|
| P0 kritisch | verkeerde anatomische structuur of misleidende inhoud; ongeoorloofde asset; vertrouwelijke gegevens; exploit/secrets; totale onbeschikbaarheid | Stop integratie/vrijgave, bij live incident onmiddellijk beoordeelde rollback of uitschakeling. Geen waiver. |
| P1 ernstig | essentiële route onbruikbaar met keyboard/touch/fallback; crash op verplichte hardware; foutieve mode/taal; progressie onbedoeld naar server | Geen gatepass; eigenaar herstelt en QA hertest. |
| P2 middel | storende maar omzeilbare bediening, onduidelijk label of overschrijding van afgesproken niet-kritiek prestatiebudget | Herstel vóór release waar de essentiële ervaring geraakt wordt; uitsluitend expliciet gedocumenteerde acceptatie door product + QA met deadline. |
| P3 laag | cosmetische afwijking zonder beïnvloeding van begrip of bediening | Backlog met eigenaar; geen verzwijgen. |

Een gate is groen als alle toepasselijke blokkerende tests geslaagd zijn, alle bronnen en reviewbewijzen aanwezig zijn, geen open P0/P1 bestaat, afwijkingen aantoonbaar beoordeeld zijn en de aangewezen QA-/domeinreviewers akkoord hebben. 'Niet getest' of 'onbekend' is geen pass. Een Product Lead kan veiligheid, privacy, materiële wetenschappelijke fouten of licentieblokkades niet overrulen. Een deployment-status Ready is uitsluitend hostingbewijs, niet productacceptatie of anatomische validatie.

Bij een live regressie: bewaar traceerbare release-ID, bevestig gebruikersimpact met minimale logging, markeer geblokkeerde feature buiten werking indien veilig, kies door bevoegde releasebeheerder de laatst geverifieerde build, herhaal gerichte tests en registreer oorzaak en opvolging. Geen verwijdering van gebruikersprogressie zonder duidelijke noodzaak; wijzig opslagschema alleen met getest migratie-/resetpad.

## 10. Standaard bewijsformulier (per testcase)

```yaml
test_id: 3D-01
status: NOT_RUN  # PASS | FAIL | BLOCKED | N/A | NOT_RUN
ticket: G0-04
build_commit: null
preview_url: null
asset_manifest_version: null
content_version: null
browser_os_device: null
viewport_input_gpu_network: null
fixture_id_and_hash: null
preconditions: []
steps: []
expected: null
actual: null
measurements: []
evidence_paths: []  # Geanonimiseerd; geen medische/persoonlijke testdata.
severity_if_failed: null
defect_id: null
executed_by_role: null
reviewed_by_role: null
date: null
retest_date: null
```

Bewaar bewijs per gate en commit in een testreport (bijv. `docs/reviews/gate-1/`), met link naar CI-run en versie van testsuite. Gebruik geen screenshots van persoonlijke profielen en geen productiedata als fixture. Ruwe performance-meetwaarden, screenshots van gecontroleerde fixtures en geanonimiseerde taakresultaten horen in de evidence-set. Post-release monitoring is beperkt tot noodzakelijke technische foutindicatoren zonder anatomiekeuzes, modusselection, gezondheidskenmerken of voortgang te koppelen aan bezoekers.

## 11. Open verificaties voordat 'makkelijk te bedienen' bewezen is

- Welke werkelijke anatomische fixture is toegestaan, gemapt, beoordeeld en beschikbaar in twee talen?
- Welke hardware- en netwerkbaseline is reproduceerbaar en welke budgetten volgen daar objectief uit?
- Werken screenreader, touchscreen, toetsenbord en HTML-fallback werkelijk in alle vereiste flows?
- Kan een onervaren gebruiker de hiërarchie, modi, laagbediening, modelgrenzen en terugnavigatie zonder hulp begrijpen?
- Zijn alle interactie-/routeringsafspraken door UX, 3D, architect en contentteam bevestigd en in gedeelde tests vertaald?

Tot deze verificaties zijn uitgevoerd blijft het oordeel: **uitgewerkte kwaliteitsblauwdruk, bruikbaarheid en toegankelijkheid nog niet empirisch bewezen**.
