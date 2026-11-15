# 3D model lab — reproduceerbare intake en volledige dekkingspoort

**Status:** ontwikkeling; geen gevalideerde anatomie, geen productierelease. De schouder is een technische test, niet een uitzondering op de kwaliteitseis voor het gehele lichaam.

## Bewijs van deze sessie

De broncatalogus van Open Anatomy 3D is daadwerkelijk opgehaald op de vaste Git-commit `c050aa7b1bc56ceed668199b01ea017341928d7b`. De lokale kopie heeft Git-blobhash `a40951e9587e4acee5bba31d89e957604679e486`, grootte 23.585 bytes en SHA-256 `485cbdca2d5bdb19fc233151672780996394e956da75442a50f79cd593d03657`. De blobhash komt overeen met de bronrepository. Zie [catalogus](https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/packages/open-anatomy-3d/catalog.json).

| Meting | Feitelijk resultaat |
|---|---:|
| Unieke catalogusrecords | 147 |
| Mannelijk model: verwachte benoemde meshes | 128 |
| Vrouwelijk model: verwachte benoemde meshes | 133 |
| Gewrichtshotspots per variant (geen meshes) | 12 |
| Kandidaat-inventaris totaal, variant × structuur | 285 |
| Dubbele keys of schemafouten in catalogus | 0 |
| Geautomatiseerde synthetische tests | 9 geslaagd |
| Werkelijke kwaliteitssignoff van alle 285 records | 0 — NOT_RUN |
| Geometrie, rendering, schermprestaties, anatomische beoordeling | NOT_RUN |

De catalogus bevat `deltoid_l` en `deltoid_r`; `shoulder_l/r` zijn aanklikbare ankers. Het is **niet** aangetoond dat de daadwerkelijke GLB-meshes geladen, visueel of wetenschappelijk gevalideerd zijn. De bronconnector kon niet de binaire GLB-data leveren (binary/UTF-8- of lege-responsbeperking). Geen anatomische asset is daarom naar productie gekopieerd. De testfixtures zijn synthetisch; een preflight-pass betekent uitsluitend dat de afgebakende controles geslaagd zijn.

## Teamgebruik

Gebruik Node.js (de tests liepen op v24.22.1). Geen npm-afhankelijkheden nodig voor deze beperkte offline preflight. Download de catalogus en beide GLB's lokaal via de vastgepinde broncommit; controleer door de licentie-eigenaar de precieze herkomst en de rechten. Geen automatische download bij app-runtime. De echte bronbestanden/binaries zijn niet opgenomen in deze repo.

```sh
node --test model-audit/audit-model.test.mjs model-audit/coverage-gate.test.mjs
node model-audit/audit-model.mjs --catalog /path/to/catalog.json --variant male
node model-audit/audit-model.mjs --catalog /path/to/catalog.json --variant female --model /path/to/anatomy-female.glb
node model-audit/coverage-gate.mjs generate /path/to/catalog.json
node model-audit/coverage-gate.mjs check /path/to/catalog.json model-audit/coverage-ledger.draft.json
```

`generate` geeft een JSON-ledger op stdout. `check` blokkeert bij een ontbrekende, dubbele, onbekende of onvoltooide structuurrij of bij ontbrekend bewijs en reviewer; zijn exitcode is 1 totdat de kandidaat-scope volledig is afgetekend én status `REVIEWED_FOR_CANDIDATE_SCOPE` heeft. Dit is geen volledige productrelease. Het schema kan nooit bewijzen dat de evidence waar is: QA en onafhankelijke reviewers moeten het echte bewijs controleren. Een nieuwe, fijnmaziger broncatalogus krijgt een eigen ingest-adapter, migratie en uitgebreidere denominator, niet zomaar deze bron-specifieke tool uitvoeren.

## Kandidaten en provenance

| Asset | Bronpad | Git-blobhash | Geadverteerde bytes in de bronboom |
|---|---|---|---:|
| Catalogus | `packages/open-anatomy-3d/catalog.json` | `a40951e9587e4acee5bba31d89e957604679e486` | 23.585 |
| GLB man | `packages/open-anatomy-3d/models/anatomy-male.glb` | `f173c5a08e93fb3eef85c64859680b94ad7c2aed` | 7.614.076 |
| GLB vrouw | `packages/open-anatomy-3d/models/anatomy-female.glb` | `53a6203083490251fd7bb6421f5698db9bccd4c9` | 8.134.732 |

Bron: [vastgepinde repository](https://github.com/MervinR07/open-anatomy-3d/tree/c050aa7b1bc56ceed668199b01ea017341928d7b). Bytes GLB zijn metadata van de bronboom, geen lokaal gemeten bestanden. De eerste kandidaat is een demonstratiemodel, geen claim dat alle anatomische substructuren vertegenwoordigd zijn. De model- en cataloguslicentie is volgens [LICENSE-MODELS](https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/LICENSE-MODELS.md) CC BY 4.0; controleer alle upstreamversies en veranderingsvermeldingen vóór hergebruik. De afgeleide ledger bevat uitsluitend bronkeys, variant, systeem en open ontwikkelingstaken; herkomst en attributie hieronder.

**Attributie ledger:** BodyParts3D © The Database Center for Life Science, CC BY 4.0; female organs: Human Reference Atlas 3D Reference Organs, HuBMAP, CC BY 4.0; female body: MakeHuman, CC0; gewijzigd door [Open Anatomy 3D](https://github.com/MervinR07/open-anatomy-3d), CC BY 4.0. 3D Universe heeft hieruit een afgeleide, onvoltooide inventaris gemaakt; geen geometrie overgenomen. Zie [volledige bronattributie](https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/ATTRIBUTION.md) en [licentie](https://creativecommons.org/licenses/by/4.0/).

## Niet afvinken vóór bewijs

Khronos glTF Validator, werkelijke decode, mapping per mesh, juiste laag/oriëntatie/afmetingen, wetenschappelijke beoordeling, render- en pickingtests, echte mobiele en desktopmetingen, en NL/EN-vijfmodi-inhoud moeten afzonderlijk worden uitgevoerd. Hoogdetail-assets worden alleen toegevoegd na dezelfde tests. Geen productieclaims rond volledigheid of diagnose.

## Update 15 november 2026 — geïsoleerde technische spike

De oudere audit hierboven is de nulmeting. Inmiddels zijn beide GLB-bestanden via de vastgepinde npm-package verkregen en byte-identiek aan de upstream blobhashes. Beide zijn in Three.js met Meshopt gedecodeerd: 128 en 133 echte bronmeshes; alle geteste vertexattributen, indices en bounds voldoen. De metadata- en geometrieproeven veranderen de anatomische releasegate niet. Browsercontrole is nog NOT_RUN. Zie [meetresultaten](../prototype/RESULTS.md) en [de tests](../prototype/test).
