# 3D Universe — intern 3D-integratielab

**Status: ontwikkelspike, uitsluitend interne/afgeschermde preview.** Dit lab toetst de technische haalbaarheid van interactieve modelweergave, niet de anatomische juistheid of volledigheid. De schouder kan als regressievoorbeeld dienen, maar geen enkele regio is uitgezonderd van de uiteindelijke kwaliteitseis. Zie [engineeringrapport](../docs/model/MASTER.md), [kwaliteitspoort](../docs/model/QUALITY-CONTRACT.md) en [afmaakbacklog](../docs/model/GAP-BACKLOG.md). Actuele meetresultaten en resterende blokkades: [RESULTS.md](RESULTS.md).

## Waarom een zelfstandige spike?

Een kleine Vite/Three.js-browserapp verkleint het aantal variabelen tijdens de eerste echte renderintegratie. De broncatalogus, het modelcontract, selectie, zichtbaarheid/lifecycle en de HTML-interface blijven conceptueel onafhankelijk van de product-shell. Vite is hier een tijdelijk ontwikkelgereedschap, geen besluit om de voorgestelde Next.js/React/R3F-architectuur of de bestaande publieke Vercel-pagina te vervangen. Renderbenchmarks van dit lab zijn bovendien geen productiebenchmarks van de latere app.

## Reproduceerbare ontwikkelomgeving

In deze werkomgeving zijn Node.js `v24.22.1` en npm `11.9.0` vastgesteld. `npm ls` heeft de daadwerkelijk geïnstalleerde versies bevestigd: `open-anatomy-3d@0.1.0`, `three@0.179.1` en `vite@8.3.8`. Vite vereist volgens npm-metadata Node `^20.19.0 || >=22.12.0`; dit project hanteert `>=22.12.0`. De root-`package-lock.json` bevat de vastgepinde dependencies. Gebruik `npm ci` voor reproduceerbare schone installaties. De package-installatie is geslaagd; dat is op zichzelf geen bewijs van een werkende build of browserweergave.

Vanuit de projectroot:

```sh
node --version
npm --version
node --test model-audit/audit-model.test.mjs model-audit/coverage-gate.test.mjs

npm ci
npm run
npm run dev
```

Open vervolgens het lokaal door Vite getoonde adres. Gebruik de beschikbare test- en buildscripts in `package.json`:

```sh
npm test
npm run build
npm run preview
```

Een preview-build test de productie-uitvoer van het lab lokaal. Vercel mag deze spike uitsluitend als geïsoleerde, afgeschermde branch-preview ontvangen; niet automatisch in de bestaande productiebranch of op het publieke hoofddomein. Indien bescherming niet beschikbaar is, blijft het lab lokaal. Er is geen aparte hosting, betaald account of publieke publicatie vereist voor deze fase.

### Bronidentiteit, pinning en assetinname

De reeds geaudite broncatalogus is vastgepind op [Open Anatomy 3D commit `c050aa7b1bc56ceed668199b01ea017341928d7b`](https://github.com/MervinR07/open-anatomy-3d/tree/c050aa7b1bc56ceed668199b01ea017341928d7b). Hashes van die specifieke upstream-revisie staan in [model-audit/README](../model-audit/README.md). De catalogus is daadwerkelijk opgehaald, maar beide bron-GLB's zijn in die audit nog NIET lokaal geverifieerd.

**Let op:** de npm-metadata van [`open-anatomy-3d@0.1.0`](https://www.npmjs.com/package/open-anatomy-3d/v/0.1.0) vermeldt een afwijkende `gitHead` (`534c0e1c3173b91af828904b9d06fecccd55ec15`), de exports `./models/*` en `./catalog.json` en licentie `MIT AND CC-BY-4.0`. De gepubliceerde tarball heeft volgens registry-metadata SRI:

```text
sha512-2+fcvSpnxADq4q1iTeDjoK5EMN1Id7m+PalvCBVkt8qod6+OVLZKuqxBZr0T+wHQCmTlmMBcLma5CXLzdattAA==
```

Deze SRI staat ook in de daadwerkelijke lockfile. De package is succesvol geïnstalleerd. Hoewel de npm-Git-revisie afwijkt, zijn de drie individuele bestanden lokaal met `git hash-object` vergeleken en hun blobhashes komen exact overeen met de geaudite Git-revisie. Hun lokale SHA-256:

| Bestand | Bytes gemeten | SHA-256 |
|---|---:|---|
| Catalogus | 23.585 | `485cbdca2d5bdb19fc233151672780996394e956da75442a50f79cd593d03657` |
| Female GLB | 8.134.732 | `2eee011f8cb7a189af0757f5e287754e84276dd084faeb2daca45572942f4ce2` |
| Male GLB | 7.614.076 | `25248bef02f0ca43eedbd25231f8b6f9681865a57016f9d5e352d407407336c7` |

Dit bevestigt byte-identiteit van de individuele bronbestanden, geen visuele of anatomische geldigheid. De originele audit is de snapshot van vóór de npm-installatie. Vermeng nooit catalogus A met geometrie B zonder bewezen mapping. Herhaal vanaf projectroot:

```sh
npm ls open-anatomy-3d three vite
ls -l node_modules/open-anatomy-3d/catalog.json node_modules/open-anatomy-3d/models/
sha256sum node_modules/open-anatomy-3d/catalog.json node_modules/open-anatomy-3d/models/*.glb

# Vanuit projectroot, na controle van werkelijke packagebestandsnamen:
node model-audit/audit-model.mjs --catalog node_modules/open-anatomy-3d/catalog.json --variant male --model node_modules/open-anatomy-3d/models/anatomy-male.glb
node model-audit/audit-model.mjs --catalog node_modules/open-anatomy-3d/catalog.json --variant female --model node_modules/open-anatomy-3d/models/anatomy-female.glb
```

Voer daarnaast Khronos glTF-validatie, echte Meshopt-decode, bronlicentiereview, bytes/metadata-vergelijking, mapping en anatomische review uit. Wanneer een naam, blobhash of catalogusafmeting afwijkt, stopt de assetinname totdat de afwijking is verklaard en de juiste revision-specific manifest/canonical mapping is gemaakt. Een GLB kan ook externe URI's aanwijzen; alleen expliciet goedgekeurde lokale of immutabele gehashte assets zijn toegelaten. Geen externe runtime-download veronderstellen. Wanneer geen bronmodel beschikbaar is, toon een expliciete foutstatus of testobject, nimmer een geometrieplaceholder als echt lichaamsdeel.

### Attributie

De werkelijk geïnstalleerde `node_modules/open-anatomy-3d/ATTRIBUTION.md` en `LICENSE-MODELS.md` bevestigen de eerder onderzochte bronattributie: BodyParts3D © The Database Center for Life Science, CC BY 4.0; female organs: Human Reference Atlas 3D Reference Organs, HuBMAP, CC BY 4.0; female body: MakeHuman, CC0; gewijzigd door Open Anatomy 3D, CC BY 4.0. De broncode en assets hebben eigen licenties. Neem verplichte attributie plus bronrevisie en wijzigingsvermelding op bij distributie van ieder afgeleid bestand, inclusief de echte modellen in een preview. Referenties: [bronattributie op pin](https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/ATTRIBUTION.md), [modellicentie op pin](https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/LICENSE-MODELS.md), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Dit is verificatie van meegeleverde bronverklaringen, geen onafhankelijke juridische signoff; verifieer eventuele bronveranderingen, niet alleen een npm-licentieregel.

## Acceptatietests lab — geen klinische/volledige validatie

| Test | Vereist bewijs |
|---|---|
| Offline contracttest | Alle echte unit tests slagen; synthetische data duidelijk gelabeld. |
| Build | Schone installatie, lockfile, gebouwde assets, geen onverwachte runtimeverzoeken. |
| Model laden | Echte GLB van beide variants, gevalideerd, log van decode, model- en catalogusrevision/hash. |
| Canonical selectie | 3D-node naar ID en lijst naar dezelfde ID; niet afgaan op runtime-UUID of fuzzy naam. Hotspot is een apart anker. |
| Camera/interactie | Orbit/zoom/focus/isolatie/lagen/reset; pointer click onderscheiden van drag; verborgen objecten niet selecteerbaar. |
| Levenscyclus | Variantwissel, snelle herhaalde acties en contextverlies zonder verouderde callbacks/lekken. |
| Mobiele en HTML-fallback | Bedienbaarheid zonder canvas, toetsenbord/touch, leesbare status/error, geen inhoud verdwenen door fallback. |
| Modelprestaties | Opnamedata werkelijk desktop én mobiel; koude cache, warm cache, laadtijd, renderframes, geheugen, worst-case lagen. |
| Anatomische review | Onafhankelijke geometrie-/contentreview met gecontroleerde licentie, relaties, nauwkeurigheidsklasse en gaplijst. |

Deze lijst is een testopdracht, niet een tabel reeds behaalde resultaten. Check welke functies het lab daadwerkelijk implementeert en zet de overige op `NOT_RUN`, `GAP` of `BLOCKED`. Herhaal tests na wijzigingen op schoon geïnstalleerde, identieke afkomst. Een geautomatiseerde fixture mag geen echte anatomische evidence vervangen. Zorg dat keyboard/fallback en list selections dezelfde zichtbaarheidstoestand hanteren. Een mooi screenshot zonder aantoonbare mapping is onvoldoende.

## Migratie naar de echte applicatie

1. Reconcileer en pin het bronmodel; exporteer een versiegebonden canonical asset-/contentmanifest met gecontroleerde mapping. Vul ontbrekende structuren via de domeinsquads aan. Bewaar bron, afgeleiden en hashes gescheiden.
2. Zet renderer-onafhankelijke contracten in een gedeeld package dat zonder WebGL testbaar is. Test één selectie-, visibility-, reset- en capabilityprotocol; browserrenderer en latere R3F-componenten implementeren dezelfde interface, elk met eigen lifecycletests.
3. Pin compatibele Next.js/React/TypeScript/R3F/Three.js-versies op basis van een schoon uitgevoerde install/build. Houd SSR/HTML-boom onafhankelijk van client-only canvas. Laad de ene R3F-viewer uitsluitend waar nodig; geen vijf canvasinstanties voor vijf kennismodussen.
4. Voeg immutable, gecontroleerde assets en decoders toe aan de afgeschermde preview. Test echte cache, mobiele en desktopprestaties, clipping/picking-gelijkheid, accessibility en inhoudsverdieping per systeem/regio. R3F-rendering is afzonderlijk bewijs; hergebruik labtests, maar niet zonder hertest de uitkomst.
5. Gebruik het Vercel-previewpad en CI voor gepinde builds, contracttests, validatie-output en gate-artifacts. Onvolledige ledger of ontbreken van onafhankelijk bewijs blokkeert productie; behoud de bestaande voorbereidingspagina totdat de eigenaar een gereviewde release goedkeurt.

## Geen half werk: releasepoort

De huidige kandidaatcatalogus telt 147 unieke labels, 285 variantrecords en 5.415 nog open kwaliteitschecks. De bestaande negen synthetische tests slagen, maar 0/285 records zijn gereviewd: de candidate coverage-gate hoort nu te falen.

```sh
# Vanuit projectroot; exitcode 1 is in deze draft verwacht.
node model-audit/coverage-gate.mjs check model-audit/upstream-catalog.local.json model-audit/coverage-ledger.draft.json
```

Zelfs wanneer deze bron-specifieke gate later slaagt, is dat geen bewijs van volledige lichaamsanatomie. Laat anatomiespecialisten de echte doelcatalogus vaststellen, breid de noemer per regio en systeem uit, valideer beide relevante varianten, en laat onafhankelijke reviewers dezelfde bewijsstandaard aftekenen voor elk onderdeel. De maximale kwaliteit van de mooiste regio mag de minimale kwaliteit van de rest nooit maskeren. De echte release blijft geblokkeerd totdat alle aangekondigde structuren, toepasselijke modi, talen, interacties, geometrie, toegankelijkheid en prestatiecriteria aantoonbaar zijn afgerond. Beperkte scope vraagt een expliciet eigenaarsbesluit en een eerlijke productnaam.
