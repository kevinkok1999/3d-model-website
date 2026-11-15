# Fase 5 — 14 onafhankelijke bronmodellen en 769 interacties

Status: technische ontwikkelkandidaat. Geen anatomische, klinische of productievrijgave; geen ruimtelijke registratie/merge.

## Werkelijke technische resultaten

Commit `f668ec1746faae0e3e80fed882a100924228dbca`: [14-bronnen intake en Chromium](https://github.com/kevinkok1999/3d-model-website/actions/runs/43743697769) volledig PASS. Exact 14 originele GLB-/CSV-paren, beide opnieuw geaudit na staging; 769/769 bronrecords individueel via de interface geselecteerd, geïsoleerd en hersteld. [Rapport, logs en screenshots](https://github.com/kevinkok1999/3d-model-website/actions/runs/43743697769/artifacts/14172778349). [Algemene QA](https://github.com/kevinkok1999/3d-model-website/actions/runs/43743701806) PASS.

| Familie | Records V/M | Mesh-nodes V/M |
|---|---:|---:|
| Bloedvaten | 125 / 123 | 110 / 106 |
| Hersenen | 108 / 108 | 283 / 283 |
| Hart | 17 / 17 | 14 / 14 |
| Lever | 23 / 23 | 26 / 26 |
| Longen | 70 / 71 | 56 / 58 |
| Dunne darm | 11 / 12 | 9 / 10 |
| Ruggenmerg | 30 / 31 | 29 / 30 |
| Totaal | 769 | 1054 |

666 directe records, 103 groepsrecords. Dit zijn bronkoppelingen en geometrische instanties, geen telling van unieke of medisch gereviewde anatomische onderdelen. De mannelijke long is bewust v1.3; v1.4 blijft geblokkeerd. Geen delen uit verschillende versies gemengd.

## Versterking na de eerste 14-modeltest

- Volledige auditconsistencycheck vóór modeldownload, inclusief aantallen en records voor alle bronnen. De daadwerkelijke bronbytes worden bij het openen van die bron onafhankelijk geverifieerd.
- Expliciete bronbeperkingen in zowel NL als EN voor hersenen, longen, dunne darm en ruggenmerg.
- Alle veertien bronnen krijgen afzonderlijke 390px mobiele regressie inclusief locale-wissel, selectie, isolatie en herstel. Deze nieuwe proef is pas bewijs zodra de bijbehorende CI-run slaagt.

## Volgende golf

[Onderzoeksrapport](HRA-WAVE3-RESEARCH.md) met 12 nieuwe vastgepinde bronkandidaten (180 crosswalkrijen). Negen P1/P2 kunnen afzonderlijk technisch geaudit worden; beide linker nieren en uterus blijven HOLD vanwege expliciete bronconflicten. De aparte pipeline stageert of publiceert geen geometrie. Een technische PASS heft geen semantische, anatomische of herkomstreview op.

## Vrijgave

Zie [uniforme kwaliteitscontrole](PHASE-5-QUALITY.md). Anatomie, inhoud in beide talen, geometrische registratie, 3D-picking, fysieke toestellen/prestaties, rechten en volledige doelcatalogus blijven afzonderlijke vrijgavepoorten. Geen publicatie op productiebranch.
