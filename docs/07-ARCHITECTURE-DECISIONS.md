# 07 — Architecture Decision Records (ADR's)

**Statuscodes:** `PROPOSED` = nog niet gevalideerd; `ACCEPTED_FOR_POC` = uitgangspunt voor een beperkte test, geen productiegarantie; `BLOCKED` = niet starten zonder voorwaarde.

| ID | Status | Besluit | Reden | Validatie |
|---|---|---|---|---|
| ADR-001 | ACCEPTED_FOR_POC | één centrale viewer + één scene-store | geen duplicatie tussen vijf modi | wissel modi met dezelfde selectie |
| ADR-002 | ACCEPTED_FOR_POC | R3F/Three.js met GLB 2.0, renderer als los pakket | uitbreidbare WebGL-stack | technische POC + benchmarks |
| ADR-003 | ACCEPTED_FOR_POC | Open Anatomy 3D **modelpakket** als testdata | klein, catalogus, CC BY 4.0 | mapping/licentie/performance audit |
| ADR-004 | PROPOSED | Next.js/React/TypeScript monorepo | meertalige UI en server-rendered teksten | Node/React/R3F versiecompatibiliteit |
| ADR-005 | ACCEPTED_FOR_POC | content gescheiden van geometrie | meerdere datasets en NL/EN | dezelfde content met dummy-GLB |
| ADR-006 | ACCEPTED_FOR_POC | stabiele canonical IDs + import-adapter | andere brondatasets zonder linkbreuk | mappingtests, ontbrekende IDs |
| ADR-007 | ACCEPTED_FOR_POC | educatieve programma-progressie lokaal | dataminimalisatie, zonder account | privacy-/functionele tests |
| ADR-008 | PROPOSED | externe modules via `SimulationPlugin` v1 | vakinhoud loskoppelen van 3D-kern | tweede mockmodule integreren |
| ADR-009 | BLOCKED | Astra AI bronassets/code overnemen | niet toegestaan zonder expliciete rechten | schriftelijke toestemming nodig |
| ADR-010 | PROPOSED | uitgebreide Z-Anatomy/BodyParts3D modellen in volgende fase | meer detail en functies | licentie-/model-/performance-audit |
| ADR-011 | ACCEPTED_FOR_POC | mobiele toegankelijkheid met HTML-alternatief | WebGL niet voor elke gebruiker bruikbaar | WCAG 2.2 AA toetspunten |
| ADR-012 | PROPOSED | €28 eenmalig premium pas na bewijs van waarde | bestaande commerciële hypothese | juridische, betaal-/tax- en markttoets |
| ADR-013 | ACCEPTED_FOR_POC | geen AI-chat, vragenlijsten of symptoomopslag | oorspronkelijke productscope/privacy | code- en datareview |

## Open architectuurbesluiten vóór productie

1. Exacte gepinde frameworkversies en compatibiliteitsmatrix.
2. Definitieve keuze bronmodel en plaatsing daarvan (self-hosted vs CDN).
3. Welke subset van anatomische structuren in v1 volledig inhoudelijk gereviewd kan worden.
4. Exacte prestatiebudgetten na eerste gemeten hardwarebaseline.
5. Welk workflowmodel voor medische reviewers en vertalers wordt gebruikt.
6. Beheer van auteursrechten/licenties van eigen animaties en derdepartijvideo's.
7. Wel/geen server-side voortgangssync na hernieuwd privacybesluit.

## ADR-014 — Uniforme kwaliteitsvloer en complete doellijst

**Status: ACCEPTED_FOR_POC als producteis; feitelijke dekkingsbewijzen OPEN.** Vastgelegd na opdracht van de projecteigenaar. Scheid kandidaatcatalogus van de gereviewde doelcatalogus; alle onderdelen binnen de afgesproken scope krijgen gelijke toetsbare kwaliteit en open afmaaktaken tot ze voldoen. De schouder-spike is geen uitzondering voor de productrelease. Een complete publieke atlas vereist onafhankelijke signoff; een beperkte release is alleen mogelijk met een afzonderlijk expliciet besluit en een eerlijke beschrijving. Zie [kwaliteitscontract](model/QUALITY-CONTRACT.md).
