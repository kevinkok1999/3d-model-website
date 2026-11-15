# 05 — Roadmap, werkpakketten en acceptatiecriteria

De volgorde is afhankelijkheidsgestuurd, niet kalendergestuurd. Elke volgende fase start uitsluitend na een aantoonbare **go/no-go-poort**. Dit is een uitvoerbare backlog, geen bevestiging dat tickets al op GitHub zijn aangemaakt.

## Gate 0 — technische aannames en herkomst valideren

| ID | Owner | Werkpakket | Afhankelijkheid | Acceptatiebewijs |
|---|---|---|---|---|
| G0-01 | architect | repo-/monorepostructuur en ADR-000 baseline | geen | diagram + dependencybeleid + reviewer akkoord |
| G0-02 | license | analyse CC BY 4.0 Open Anatomy 3D + attributie | bronbestand controleren | bestandlijst + creditkaart, `approved` |
| G0-03 | assets | model en catalogus laden, IDs vergelijken | G0-02 | log: geladen structuren, unmatched keys, validatie |
| G0-04 | 3D | WebGL, camera, meshselectie in browser | G0-03 | klik/touch selecteren + focus + reset |
| G0-05 | QA | compatibiliteitsmatrix voor React/Next/R3F | G0-04 | gepinde versies, build/tests, Chrome/Firefox/Safari/Android |
| G0-06 | anatomy | geverifieerde schouderstructuur in asset identificeren | G0-03 | exact upstream meshkey + canonical ID + reviewer |
| G0-07 | content | twee gecontroleerde contentitems per modus, NL/EN | G0-06 | bronreview + vertaalcheck |
| G0-08 | UX | twee ingangen naar dezelfde selectie | G0-04 | 3D lichaam en modusingang werken gelijk |

**Go/no-go 0:** eigen 3D-canvas laadt één model; schouderspier is individueel selecteerbaar; de selectie blijft bij modewissel; Engelse/Nederlandse teksten sluiten aan; attributie staat zichtbaar in de demo; fallback is beschikbaar; geen medische data op server.

## Gate 1 — stabiele anatomiearchitectuur

| ID | Owner | Werkpakket | Acceptatiebewijs |
|---|---|---|---|
| G1-01 | architect | centraal state-/eventmodel, diepe links, versies | contract- en migratietests |
| G1-02 | frontend | toegankelijk nav-/contentpaneel en structuurboom | keyboard-, touch- en screenreader-test |
| G1-03 | 3D | laagzichtbaarheid, isolatie, focus, reset, contextloss | unit/E2E, browsermatrix |
| G1-04 | asset | GLB-pipeline + compressie + manifestgeneratie | reproduceerbare build + SHA256 |
| G1-05 | anatomy | canonical structuurcatalogus, parent-relaties, synoniemen | dekkingstest en deskundige review |
| G1-06 | content | NL/EN-reviewworkflow, bronnen per bewering | content publishing-gate |
| G1-07 | QA | visuele regressie en prestatiebenchmark | rapport echte mobiele + desktop-apparaten |

**Go/no-go 1:** geen kritieke bugs, stabiele ID's, volledige attribution, meetbare performance, 3D-functionaliteit ook via HTML toegankelijk.

## Gate 2 — vijf modi en verantwoord programma

| ID | Owner | Werkpakket | Acceptatiebewijs |
|---|---|---|---|
| G2-01 | product/content | inhoudsmatrix 5 modi voor eerste anatomische regio | per modus goedgekeurde lescontent |
| G2-02 | biomechanica | één gecontroleerde animatie + NL/EN ondertiteling | review, pauze/reduced motion, videoalternatief |
| G2-03 | data | achtwekenprogrammakeuze + voortgang lokaal opslaan | persistence test, reset en wissen |
| G2-04 | privacy | data-audit app, cookies en logging | nul symptoomvelden, nul vragenlijsten |
| G2-05 | QA | integratiepad alle vijf modi | selectiestate blijft stabiel, geen foutieve content |

**Go/no-go 2:** eerste complete gebruikersroute met betrouwbare inhoud en privacy zonder diagnosefunctie.

## Gate 3 — geavanceerde anatomie

| ID | Owner | Werkpakket | Acceptatiebewijs |
|---|---|---|---|
| G3-01 | 3D/asset | exploded view met gecontroleerde vectoren | geen selectiefouten, prestatieverslag |
| G3-02 | 3D | clipping/doorsneden | WebGL fallback, visuele testen |
| G3-03 | license/asset | tweede atlas evalueren | gedocumenteerde licenties, herkomst, audit |
| G3-04 | anatomy | uitgebreidere structuurdekking en relaties | wetenschappelijke QA en technische mapping |
| G3-05 | QA | memory leaks, langlopende sessies, mobiele stabiliteit | heap/GPU/profiling bewijs |

**Go/no-go 3:** meer detail is bewezen beter zonder juridische, medische of performanceverslechtering.

## Gate 4 — tweede onafhankelijke onderwerp-module

| ID | Owner | Werkpakket | Acceptatiebewijs |
|---|---|---|---|
| G4-01 | architect/sim | SDK v1, plug-in lifecycle, events | contracttest met twee modules |
| G4-02 | sim | tweede module (eerst cel of zonnestelsel) | eigen units, testcases, content en beperkingen |
| G4-03 | UX | onderwerpkeuze met gedeelde UI | mobiele en keyboardnavigatie |
| G4-04 | QA | cross-module isolatie, cleanup en performance | geen model-/listener-/statelekkage |

**Go/no-go 4:** vakinhoudelijke module werkt zonder wijzigingen in anatomiecode of globaal besturingscontract.

## Gate 5 — commerciële release (niet in voorbereidende scope)

- Hypothese gratis basis + premium eenmalig €28 evalueren.
- Privacybeleid, voorwaarden, facturatie/btw en consumentenrechten laten beoordelen.
- Betaalprovider afzonderlijk van programmaprogressie; toegangsrechten minimaal.
- Prijzen/licenties en feitelijke kosten valideren voordat er een live betaalfunctie komt.

## Aanbevolen GitHub-labels

`domain:3d`, `domain:anatomy`, `domain:sim`, `domain:ui`, `domain:content`, `domain:privacy`, `domain:assets`, `priority:P0/P1/P2`, `status:blocked/review/ready`, `needs:license`, `needs:medical-review`, `breaking-change`.

## Pull-requesttemplate

```md
## Waarom?
## Wat verandert er?
## Contract/API impact
## Licentie/attributie-impact
## Medische/wetenschappelijke inhoudsimpact
## Privacy & logging
## Performance (voor/na)
## Tests (unit/integratie/E2E/toegankelijkheid)
## Screenshots of video (indien UI)
## Reviewer(s)
## Rollback-/migratiepad
```

## Volgorde van integreren

1. Bouw/review interface en dummydata.
2. Koppel gecontroleerd model en catalogus.
3. Voeg content/modes toe zonder renderer te herschrijven.
4. Test toegankelijkheid en prestaties bij elke belangrijke wijziging.
5. Pas na POC: zware anatomiefeatures en andere disciplines.

## Verplichte aanvullende poort — uniforme anatomische compleetheid (G-COMPLETE)

Deze poort volgt de oorspronkelijke G0–G3 technische ontwikkeling en vervangt geen bestaande tests. G0–G2 mogen als ontwikkelpreview worden uitgevoerd, maar zijn geen complete publieke atlas. Voor de volledige productvrijgave: alle afgesproken doelstructuren, lichaamsvarianten, regio's en systemen zijn afgewerkt; geen enkele open gap of ongereviewde claim. Raadpleeg [kwaliteitscontract](../docs/model/QUALITY-CONTRACT.md).

| ID | Owner | Werkpakket | Acceptatiebewijs |
|---|---|---|---|
| GC-01 | anatomy + product | gereviewde doelcatalogus (concept, zijde, variant, regio, systeem, diepte) | expliciete doelnoemer; geen aantallen als surrogaat voor kwaliteit |
| GC-02 | asset + license | kandidaat-to-target dekkingsmatrix, bron- en lacunetickets | iedere ontbrekende of samengevoegde structuur een eigenaar en gecontroleerde bronroute |
| GC-03 | tech art + 3D | per domein alle vereiste modeldetails, identiteiten, LOD en tools afmaken | gevalideerde mapping, correcte meshes/hotspots en integratietests |
| GC-04 | anatomy + content | vijf modi × twee talen, relaties en passende verdieping per structuur | gereviewde bronnen, contentversies en onderbouwde ervaringen |
| GC-05 | QA + accessibility | volledige machinecontrole per ID en stratified tests op echte apparaten | 100% doelledger, geen open blocker; geen kwaliteitsregressie in zwakkere regio's |
| GC-06 | architect + onafhankelijke reviewers | cross-domain releasebesluit | bewijslinks voor alle relevante assen, licentie-, inhouds- en QA-signoff |

De [kandidaatledger](../model-audit/coverage-ledger.draft.json) begint op 0/285 afgetekend. Dit is een eerste werkvoorraad, geen definitieve anatomische target. Alle beoogde aanvullende concepten worden na bronreview toegevoegd aan de doelledger, niet uit de scope verwijderd. Toekomstige G4-modules krijgen een eigen gelijkwaardige G-COMPLETE-poort.
