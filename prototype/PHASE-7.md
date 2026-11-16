# Fase 7 — centrale atlas, bronroutes en registratiesoftware

Datum: 15 november 2026. Technisch kandidaatresultaat, geen anatomisch samengesteld model en geen productiepublicatie.

## Centraal oriëntatiemodel

De twee exact vastgepinde `open-anatomy-3d@0.1.0` bronbestanden bevatten gezamenlijk 261 mesh-node-instanties en 24 afzonderlijke gewrichtsankers. De [broncoördinateninventaris](../model-audit/atlas-spatial-inventory.mjs) meet iedere gedecodeerde vertex in zijn oorspronkelijke wereldmatrix, niet alleen de accessor-boundingbox. Aantallen per variant: M 128 meshrecords en 12 ankers, V 133 en 12. De gemeten native totale extent XYZ is M (0.6664783, 1.7194312, 0.2919680) en V (0.4791088, 1.6200000, 0.2952556). Dat is bron-native data, geen verklaring dat fysieke lichaamsafmetingen of units anatomisch beoordeeld zijn. Hotspots zijn catalogusankers, geen bewezen registratie-landmarks.

37 mannelijke en 36 vrouwelijke broncatalogusrecords verwijzen via een expliciete mapping naar 12 resp. 11 passende HRA-bronreferenties. Dit is familie-navigatie, geen 1:1 anatomische of geometrische equivalentie. Bij terugkeer blijft de oorspronkelijke bronselectie, variant en huidige taal intact, ook na het verkennen van een ander HRA-model. Camera, mode en lagen worden opnieuw ingesteld; geen ongefundeerde camera-registratie. Een ongeldige of versiespecifieke query geeft een expliciete waarschuwing en geen terugkeercontext.

## Registratie-engine en ledger

`spatial-registration.mjs`: proper similarity-transformatie (rotatie, positieve uniforme schaal, translatie); expliciete bron/doel units, onafhankelijke fit- en validatiesets met minstens vier niet-coplanaire punten per set en eigen RMS/max-/schaalgrenzen. Acht synthetische tests omvatten 40 gecontroleerd gegenereerde 3D-transformaties, reflectie-/degeneratie-/mismatchweigering en bewijs dat holdout-corruptie de fit niet beïnvloedt. Deze software alleen autoriseert nooit een merge.

`atlas-registration-ledger.mjs`: 23 exact vastgepinde bron-/doelidentiteiten, 12 M en 11 V, vier uitgesloten bronrecords, alle registratie- en anatomische bewijsvelden leeg/onbewezen en `mergeAuthorized:false`. Vijf tests weigeren pin-/variant-/statusswaps, gewijzigde rijen en valse vrijgave. Werkelijke landmarkcorrespondentie, frame/units, onafhankelijke review en combinatie-overlap blijven open.

## Gecontroleerde uitvoering

- Lokaal op de volledige snapshot: 137/137 `npm test`, productiegerichte lab-build geslaagd. Geen echte HRA-geometrie in de normale build. Een eerdere CI-mislukking door een incomplete tree en een lokaal-only catalogusimport is gerepareerd; volledige projecttree en onveranderde eerdere bestanden geverifieerd.
- [Anatomy spike QA, run 43745752854](https://github.com/kevinkok1999/3d-model-website/actions/runs/43745752854) op commit `53181ac9c5accd3c9782a8d56b9937425715bf88`: geslaagd, inclusief werkelijke centrale assets en onafhankelijke CPU-raycastoracle voor de twee geselecteerde pixelproeven. M: buikspieren op CSS (578,243), spierlaag uit → colon; V: buikspieren op CSS (604,433), spierlaag uit → dunne darm. In beide lege ruimte behoudt selectie. Dit zijn geselecteerde stabiele meetstralen, niet alle 261 meshes of daadwerkelijke mobiele hardware.
- Dezelfde run test 23 bronroutes, selectie, HRA-fallback zonder bronbestanden, hart → HRA-hersenen → terug naar oorspronkelijk hart (variant/key/taal), ongeldige en dubbele bron-ID's en waarschuwingen. Geen HRA-row als vermeend equivalent automatisch gekozen.
- [Staged HRA run 43745744318](https://github.com/kevinkok1999/3d-model-website/actions/runs/43745744318) op dezelfde commit: geslaagd. Alle 23 echte HRA GLB/CSV-paren, opnieuw 881/881 recordinteracties, 1.140 mesh-node-instanties, 749 direct en 132 groep; alle 23 mobiele 390px-proeven NL/EN opnieuw. De extra central/staged browserproef rapporteert expliciet `hraStaged:true`, dezelfde geselecteerde echte mesh-raycasts, hart (17 bronrijen) → hersenen (108) → oorspronkelijke hartselectie voor M en V, zonder vermeende equivalente bronrow te selecteren.
- [Wave 2 BodyParts3D](https://github.com/kevinkok1999/3d-model-website/actions/runs/43744710007): 50/50 catalogusconcepten en 51/51 echte OBJ-bestanden source-only gepasseerd; niet geëxporteerd of geïntegreerd. Microschaalbrononderzoek blijft gescheiden.

## Resterende gates

Zie [PHASE-7-QUALITY.md](PHASE-7-QUALITY.md) voor de volledige negen gates en tien domeinen. Volgende concrete taak: expert-gevalideerde homologe 3D-landmarks in beide native bronnen verzamelen, een vooraf bevroren onafhankelijke holdoutset toetsen, frame/units en identiteit/laterality bevestigen, dan pas een interne overlay-kandidaat beoordelen. Geen automatische matching op meshnaam, centrum, boundingbox of gelijksoortige bronlabel. Volledige dekkings-/pickmatrix, echte touch-hardware, anatomie, gereviewde inhoud en prestaties blijven afzonderlijke acceptatievoorwaarden.
