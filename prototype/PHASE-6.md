# Fase 6 — technisch resultaat en resterende vrijgavegates

Datum: 15 november 2026. Stand: technische bronwerkbank geslaagd; **geen vrijgave van een gecombineerd anatomisch lichaamsmodel**.

## Uitvoering en bewijs

- [HRA 23-bronnenaudit en Chromium](https://github.com/kevinkok1999/3d-model-website/actions/runs/43744501796): geslaagd op commit `ba1e75f35436e2b5ce47397defab0b5a1e4a11fb`. 23 originele GLB's en 23 originele crosswalks, gecontroleerd tegen Git-blobhashes en gemeten SHA-256 en bytes; alleen lokaal tijdelijk gestaged.
- [Anatomy spike QA](https://github.com/kevinkok1999/3d-model-website/actions/runs/43744501794): geslaagd op dezelfde commit. Lokaal: 112/112 tests en build geslaagd; na de afzonderlijke wave-2-validatie 116/116 tests op `7798d2a4a7e063dbb4a68dca9edf16eb55ad4a42`.
- [Wave 3 onafhankelijke bronaudit](https://github.com/kevinkok1999/3d-model-website/actions/runs/43744501845): geslaagd. [Oudere mannelijke longbron](https://github.com/kevinkok1999/3d-model-website/actions/runs/43744501775): geslaagd; v1.4 niet in de viewer.
- [Oorspronkelijke tien nieuwe bronnen](https://github.com/kevinkok1999/3d-model-website/actions/runs/43744501782): geblokkeerde audit blijft rood; deze run is geen vrijgavebewijs.

De browser rapporteert `ACTUAL_PINNED_HRA_GEOMETRY_NOT_ANATOMICALLY_REVIEWED`. Onderstaande aantallen zijn rechtstreeks geobserveerde bronrecords en mesh-node-instanties, geen unieke anatomische structuren.

| Bron | Records geselecteerd/geïsoleerd | Direct | Groep | Meshnodes |
|---|---:|---:|---:|---:|
| Bloedvaten V | 125/125 | 105 | 20 | 110 |
| Bloedvaten M | 123/123 | 100 | 23 | 106 |
| Hersenen V | 108/108 | 103 | 5 | 283 |
| Hersenen M | 108/108 | 103 | 5 | 283 |
| Hart V | 17/17 | 14 | 3 | 14 |
| Hart M | 17/17 | 14 | 3 | 14 |
| Lever V | 23/23 | 18 | 5 | 26 |
| Lever M | 23/23 | 18 | 5 | 26 |
| Long V | 70/70 | 56 | 14 | 56 |
| Long M v1.3 | 71/71 | 57 | 14 | 58 |
| Dunne darm V | 11/11 | 9 | 2 | 9 |
| Dunne darm M | 12/12 | 10 | 2 | 10 |
| Ruggenmerg V | 30/30 | 29 | 1 | 29 |
| Ruggenmerg M | 31/31 | 30 | 1 | 30 |
| Bekken V | 24/24 | 14 | 10 | 14 |
| Bekken M | 24/24 | 14 | 10 | 14 |
| Dikke darm V (P2) | 11/11 | 10 | 1 | 10 |
| Dikke darm M | 11/11 | 10 | 1 | 10 |
| Pancreas V | 6/6 | 5 | 1 | 5 |
| Pancreas M | 6/6 | 5 | 1 | 5 |
| Milt V | 6/6 | 5 | 1 | 5 |
| Milt M | 6/6 | 5 | 1 | 5 |
| Prostaat M (P2) | 18/18 | 15 | 3 | 18 |
| **Totaal** | **881/881** | **749** | **132** | **1.140** |

Alle 23 bronnen zijn ook op 390 CSS-px met Chromium-touch-emulatie getest: NL/EN, selectie, isolatie, herstel, reset, lange labels, bronwaarschuwingen, geen horizontale overflow. Filters, zoekfunctie, bronassen, fit/focus/zoom en race bij bronwisseling gecontroleerd. Ontbrekende of gemanipuleerde audit, gewijzigde GLB, geblokkeerde longversie, weggelaten HOLD en stilzwijgende P2-promotie worden geweigerd. Dit bewijst geen pixel-pickingnauwkeurigheid, fysiek-apparaatperformance of anatomische juistheid.

## Verbreding en volgende technische stap

De [tweede BodyParts3D-inventaris](BODYPARTS3D-WAVE2-RESEARCH.md) bevat 50 aanvullende concepten en 51 unieke ELEMENT-bestands-ID's. De [afzonderlijke broncontrole](https://github.com/kevinkok1999/3d-model-website/actions/runs/43744710007) is inmiddels geslaagd: `METADATA_AUDIT_PASSED: 50/50 selected concepts` en `GEOMETRY_AUDIT_PASSED: 51/51 ELEMENT files` op commit `7798d2a4a7e063dbb4a68dca9edf16eb55ad4a42`. Dit is een source-only OBJ-audit; de 50 concepten zijn niet voor de browser geëxporteerd, ruimtelijk geregistreerd of anatomisch gereviewd.

De [microschaal-intake](MICROSCALE-SOURCE-RESEARCH.md) documenteert vier kandidaten, waaronder echte volumemicroscopie; nog niet geladen of geïntegreerd. 2D-weefselillustraties, ruwe opnames, bronannotaties, ML-voorspellingen en afgeleide meshes blijven verschillende bewijsklassen.

De [kwaliteitsmatrix](PHASE-6-QUALITY.md) specificeert de resterende gates voor alle tien domeinen. Anatomische identiteit, herkomst, registratie, onafhankelijke vakreview, selecteren op echte geometrie, toegankelijkheid met hulpmiddelen en fysieke apparaten, contentdiepte en gevalideerde micro-/bewegingsmodellen blijven aparte criteria. Geen gemiddelde score mag een zwak onderdeel verbergen.

De ontwikkelbranch en draft-PR blijven geïsoleerd van `main`; geen productiepublicatie of cross-source merge.
