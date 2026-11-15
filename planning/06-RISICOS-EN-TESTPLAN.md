# 06 — Risicoregister, benchmarkstrategie en testplan

## 1. Kritieke technische en inhoudelijke risico's

| ID | Risico | Impact | Tegenmaatregel | Blokkeert release wanneer |
|---|---|---|---|---|
| R01 | Astra AI-content zonder toestemming kopiëren | juridisch hoog | alleen abstracte UX-inspiratie; schriftelijke licentie voor gebruik | Astra-code/asset zonder toestemming wordt gebruikt |
| R02 | CC BY-SA/afwijkende licenties onvoldoende gedocumenteerd | juridisch hoog | per model en bestand provenance en attributie | manifest/licentieaudit ontbreekt |
| R03 | model-ID hoort bij verkeerde lichaamsstructuur | medische inhoud hoog | exacte mesh-catalog-mapping, anatomie-review, automatische dekkingstests | content aan verkeerde mesh gekoppeld is |
| R04 | nieuw React/R3F niet compatible met demo-viewer | technisch hoog | losstaand modellenpakket, eigen viewer en gerichte spike | productiebuild niet reproduceerbaar is |
| R05 | te veel GLB-meshes/draw calls | performance hoog | LOD, compressie, beperkt zichtbare lagen, profiling | mobiele benchmark niet haalt en geen fallback bestaat |
| R06 | WebGL context loss / incompatibele GPU | functioneel hoog | herinitialisatie en HTML/2D-fallback | hoofdfunctionaliteit onbereikbaar is |
| R07 | pseudo-continu microscopische zoom anatomisch misleidend | onderwijs middel/hoog | expliciete scene-transities met schaalvermelding | gebruiker schaal/representatie niet kan duiden |
| R08 | ongecontroleerde medische claims/blessureadviezen | veiligheid hoog | reviewer-gate, geen gepersonaliseerde adviezen | medische tekst niet beoordeeld is |
| R09 | progressie-/symptoomtracking groeit ongemerkt | privacy hoog | lokale opslag, schema allowlist, geen telemetrie over gezondheidskeuzes | onverwachte gevoelige velden worden verzameld |
| R10 | plugin verandert basisviewer of lekt resources | integratie hoog | SDK API, lifecycle-test, cleanup, geen globale bijwerkingen | andere modules breken na modulewissel |
| R11 | ontbrekende NL/EN/keyboardvariant | toegankelijkheid hoog | i18n-audit en WCAG-controle voor beide talen | essentiële functies niet via keyboard/HTML werken |
| R12 | tegenstrijdige wetenschappelijke datasets | onderwijs middel | versie, bron, aannames en berekeningsmodel per module documenteren | simulatie aantoonbaar misleidend is |

## 2. Benchmarkscenario's (doelstellingen, geen reeds behaalde resultaten)

| Scenario | Doel | Hoe meten |
|---|---|---|
| navigeren op een informatieve homepage | LCP ≤2,5 s bij afgesproken testnetwerk | Lighthouse + gecontroleerde netwerkprofile |
| initiële viewer openen | duidelijke progressindicator en geen vastlopend UI | echte Android/desktop, profiler |
| gemiddelde mobiele renderloop tijdens orbit | streven naar stabiele 30 fps | 60 seconden orbit/zoom; frame timings |
| geschikte desktop tijdens orbit | streven naar stabiele 60 fps | GPU-profiler/browserperformance |
| selecteren via muis, touch en keyboard | selectie toont corresponderende naam en content | E2E / handmatige hardwaretest |
| wissel `Leren → Trainen` | geselecteerde ID en camerafocus behouden | state-/E2E-test |
| wissel anatomie → tweede module → terug | geen achterblijvende canvas/listeners/resources | memory/cpu resource test |
| WebGL uitgeschakeld of context verloren | bruikbare HTML-lijst en content | geforceerde fallbacktest |
| NL/EN omschakelen | beide talen, geen ongecontroleerde teksten | lokalisatievalidatie |
| progressie bewaren en browser heropenen | uitsluitend programma en voortgang hersteld | storage-schema/E2E-test |

De exacte doelhardware en bestandsgroottebudgetten worden na de eerste POC gemeten. FPS-resultaten zijn geen garantie op elk apparaat.

## 3. Testpiramide

**Static:** TypeScript strict, ESLint, format, schema-validatie, license-manifestgate en dependencycontrole.

**Unit:** state reducer, ID-mapping, contentresolver, i18n key coverage, programme progression, animatiestate, plugin contract.

**Integration:** GLB laden, Raycast → ID, layer visibility, scene lifecycle, error recovery.

**E2E:** openen/deeplink, Nederlands/Engels, schouderselectie, vijf modi, local storage reset, WebGL fallback.

**Visual:** gouden screenshots van body, schouder, isolatie, transparante layers, clipping, mobiel liggend/staand.

**Scientific:** reviews van representatie/benamingen en verwachte uitkomsten van natuurkundige simulatie testcases.

**Security/privacy:** CSP, dependency audit, geen secrets/clientlogs, schema allowlist, geen medisch persoonsgegeven.

## 4. Toestelmatrix voor validatie

- Android: gangbaar middensegment op Chrome, touch + softwaretoetsenbord.
- iPhone/iPad: recente Safari WebGL-browser; knijpen/scrollinteractie.
- Windows: Chrome en Firefox met verschillende GPU's.
- macOS: Safari/Chrome; toetsenbord/screenreader.
- Zonder WebGL: tekstueel alternatief en beschikbaar educatief materiaal.
- Langzame verbinding, ontbrekende CDN-assets en verlopen cache.

Geen concrete modellen of Browserversies zijn hier getest; dit document definieert de teststrategie.

## 5. Technische eindcontrole van elke feature

- Functioneel bruikbaar op desktop én mobiel.
- Canvas-interactie heeft HTML-equivalent.
- Geen foutieve medische structuur-ID's of medische claims.
- Geen onverklaarde licentierisico's of verborgen extern modelgebruik.
- Geen foutieve Nederlandse/Engelse teksten.
- Geen ongewenste persoonsinformatie opgeslagen.
- Regressies en performance zijn gedocumenteerd.
- Oplevering kan worden teruggedraaid; versie en bron herleidbaar.

## 6. Wat nog empirisch moet gebeuren

**Nog niet uitgevoerd:** echte GLB-import, bundelmeting, FPS-profiel, visuele anatomie-audit, volledige licentie per modelmesh, browsertest, security-scan en productiehosting. Deze voorbereidingsdocumenten zijn bedoeld om die experimenten systematisch te laten uitvoeren.
