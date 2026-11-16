# Fase 4 — HRA-bronviewer voor hersenen en bloedvaten

Status: afzonderlijke technische ontwikkelkandidaat. Geen productiepublicatie, samengevoegd lichaamsmodel of medische validatie.

Historische fase-4 momentopname: fase 5 breidt de afzonderlijke bronviewer uit naar veertien referenties. De bron- en browserbewijzen hieronder blijven geldig voor de vermelde revisies, niet automatisch voor de uitgebreide viewer.

## Werkelijke bronstatus

- BodyParts3D: [echte bronintake en browserproef geslaagd](https://github.com/kevinkok1999/3d-model-website/actions/runs/43740568722), 23/23 ELEMENT-bestanden, 21 concepten.
- Human Reference Atlas: [vier officiële GLB's en crosswalks technisch geaudit](https://github.com/kevinkok1999/3d-model-website/actions/runs/43740407153), 782 mesh-node-instanties en 464 crosswalkrijen. Daarvan 411 directe links en 53 groepen; dit zijn geen aantallen unieke anatomische structuren.

## Nieuwe afzonderlijke HRA-viewer

`hra-candidate.html` gebruikt uitsluitend tijdelijk lokaal gestagede, byte-identieke officiële bestanden voor de vier vaste HRA-bronnen uit `model-audit/hra-intake-candidates.json`. De bronvariant, auteurschap, DOI, licentie, bronversie en beperkingen blijven zichtbaar. Geen bronbestanden worden gedistribueerd in de normale build, of opgeslagen op de productiebranch. Ontbrekende of ongeldige bewijzen moeten de viewer blokkeren.

Een crosswalkrij is een verwijzing naar een oorspronkelijke glTF-node, niet naar een veronderstelde anatomische structuur. Een directe rij selecteert alleen de eigen mesh-node; een groepsrij selecteert haar gecontroleerde mesh-afstammelingen. Namen en ontologie-ID's blijven bronmetadata; dezelfde ontologie-ID kan op meerdere rijen voorkomen. Coördinaten en transformaties worden niet op het hoofdmodel geregistreerd, en de assen geven geen medisch gevalideerde oriëntatie aan.

De bestaande HRA-intakepipeline haalt de vier originele bestanden en CSV's opnieuw op, voert een onafhankelijke byte- en geometrie-audit uit, stageert de bestanden tijdelijk, bouwt de kandidaatviewer en test de echte bronmodellen in een lokale Chromium-preview. Alleen auditrapporten en gekenmerkte browserbewijzen zijn artifacts; nooit de GLB's of CSV's.

**Werkelijke browserproef [geslaagd](https://github.com/kevinkok1999/3d-model-website/actions/runs/43742493321):** alle 464 crosswalkrijen (125/123 bloedvaten, 108/108 hersenen) zijn individueel via de interface geselecteerd, geïsoleerd en hersteld. Ook bronwissels tijdens een lopende download, filters, camera, 390px mobiele bediening en harde blokkades bij ontbrekend of gewijzigd bewijs zijn getest. [Audit en screenshots](https://github.com/kevinkok1999/3d-model-website/actions/runs/43742493321/artifacts/14173326202). Dit bewijst geen anatomische juistheid, fysieke-device-performance of nauwkeurigheid van handmatige 3D-picking.

## Open vrijgavepunten

- Anatomische beoordeling, herkomstvariant, bronregistratie op gemeenschappelijk lichaam, dekking van overige systemen en individuele perifere zenuwen.
- De hersenvarianten zijn afgeleide atlasmodellen, geen twee onafhankelijke patiëntscans. De mannelijke bloedvatbron heeft een metadata-inconsistentie die onafhankelijk moet worden opgelost.
- Prestatie en toegankelijkheid op fysieke apparaten, en volledig klinisch gereviewde inhoud. De releasegate blijft geblokkeerd tot de afgesproken onafhankelijke beoordeling is voldaan.

## Volgende bronronde: tien aanvullende referenties

De vastgepinde inventaris `model-audit/hra-next-candidates.json` bevat 306 crosswalkrijen voor hart, lever, long, dunne darm en ruggenmerg. De [werkelijke 10-bronnen-audit](https://github.com/kevinkok1999/3d-model-website/actions/runs/43742312231) heeft negen bronnen goedgekeurd en de mannelijke longbron geblokkeerd: `VH_M_hyoid` heeft nul exacte glTF-nodeovereenkomsten. Geen rij wordt verwijderd of met een vergelijkbare naam vervangen. [Auditbewijs](https://github.com/kevinkok1999/3d-model-website/actions/runs/43742312231/artifacts/14173220809).

| Referentie | Mesh-nodes V/M | Directe crosswalkrijen V/M | Groepsrijen V/M |
|---|---:|---:|---:|
| Hart v1.3 | 14 / 14 | 14 / 14 | 3 / 3 |
| Lever v1.2 | 26 / 26 | 18 / 18 | 5 / 5 |
| Long v1.4 | 56 / geblokkeerd | 56 / geblokkeerd | 14 / geblokkeerd |
| Dunne darm v1.2 | 9 / 10 | 9 / 10 | 2 / 2 |
| Ruggenmerg v1.1 | 29 / 30 | 29 / 30 | 1 / 1 |
| Totaal van negen gepasseerde bronnen | 214 | 198 | 36 |

De 234 gepasseerde crosswalkrijen zijn bronkoppelingen (direct of groep). Samen met de eerste vier HRA-bronnen is technisch bewijs voor 996 mesh-node-instanties in dertien referenties beschikbaar; dat is geen dekkingstelling van het menselijk lichaam en geen vrijgave voor gebruik. Alle tien volgende modellen, inclusief de negen geslaagde, blijven buiten de viewer totdat hun eigen integratie en kwaliteitscontrole gedaan zijn.

De [bronafwijking van de mannelijke long](HRA-LUNG-BLOCKER.md) is onderzocht. De oudere officiële v1.3 is afzonderlijk vastgepind en krijgt een eigen intake met dezelfde audit; v1.4 blijft ongewijzigd geblokkeerd. Geen geometrie wordt stilzwijgend vervangen of gemengd.
