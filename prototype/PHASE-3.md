# Fase 3 — onafhankelijke bronreferentieviewer

Status: ontwikkelkandidaat, geen productiepublicatie en geen anatomisch of klinisch keurmerk.

## BodyParts3D

De eerste officiële bronintake bevestigde de 21 concept-ID's tegen de actuele elementtabel. De archiefdownload duurde te lang: curl stopte na 240 seconden bij 113.138.747 van 142.903.898 bytes. Geen OBJ-bestanden werden in die run geïnspecteerd. Zie [bronrun 43739638429](https://github.com/kevinkok1999/3d-model-website/actions/runs/43739638429). De nieuwe bronintake gebruikt dezelfde officiële bron met een begrensd, ruimer downloadvenster.

**Vervolgresultaat:** [bronrun 43740568722](https://github.com/kevinkok1999/3d-model-website/actions/runs/43740568722) is volledig geslaagd. Alle 23 echte BodyParts3D-ELEMENT-bestanden kwamen door de audit en export; Chromium heeft alle 21 concepten getest met de werkelijke brongeometrie, inclusief selectie, isolatie, camera, 390px en foutafhandeling. Zie [audit- en browserbewijs](https://github.com/kevinkok1999/3d-model-website/actions/runs/43740568722/artifacts/14172232986). Dit is technisch bewijs, niet anatomische vrijgave.

De nieuwe viewer is een afzonderlijke referentiepagina (`bodyparts3d-candidate.html`), niet een anatomisch uitgelijnde overlay op het bestaande lichaam. De 21 doelconcepten staan voor 23 afzonderlijke ELEMENT-meshreferenties. Een concept kan uit meerdere echte elementen bestaan. De bron beschrijft een volwassen mannelijk referentielichaam; niets wordt gekopieerd naar de vrouwelijke variant.

De CI-pipeline controleert officiële metadata, ZIP/OBJ-geometrie, bronhashes, exporteert tijdelijk één GLB met afzonderlijk benoemde nodes, bouwt de lokale viewer en voert een browsertest uit. Broncoördinaten zijn niet anatomisch geregistreerd tegen Open Anatomy. Geen GLB, bronarchief of gegenereerd model wordt naar Git of Vercel gepubliceerd. Alleen technische rapportage en duidelijk gelabelde browserbeelden zijn artifacts.

Bij ontbrekende, onvolledige of ongeldige brondata wordt geen fictieve anatomie getoond. De gewone QA-pipeline gebruikt uitsluitend duidelijk gemarkeerde synthetische tetraëders om bediening en foutafhandeling te testen; dat is geen bewijs van werkelijke anatomie.

## HRA

Aanvullend worden versiegebonden mannelijke en vrouwelijke hersen- en bloedvatreferenties van de HuBMAP/HRA-bron beoordeeld. De ontologische crosswalk en daadwerkelijke meshstructuur moeten afzonderlijk overeenkomen; een semantische groepsnode is niet hetzelfde als een mesh. Geen scanvarianten, geometrische samenvoeging, volledige dekking of medische validatie worden geclaimd.

De werkelijke bestandsintake op GitHub is geslaagd: [run 43740407153](https://github.com/kevinkok1999/3d-model-website/actions/runs/43740407153), [auditbewijs](https://github.com/kevinkok1999/3d-model-website/actions/runs/43740407153/artifacts/14171628486). Alle vier GLB's en crosswalks zijn gedownload en gemeten tegen hun vastgepinde Git-blob-ID en lengte. Gemeten resultaten:

| Referentie | Mesh-nodes | Directe crosswalkrijen | Groepsrijen |
|---|---:|---:|---:|
| Bloedvaten V v1.3 | 110 | 105 | 20 |
| Bloedvaten M v1.3 | 106 | 100 | 23 |
| Hersenen V v1.4 | 283 | 103 | 5 |
| Hersenen M v1.4 | 283 | 103 | 5 |
| Totaal broninstanties | 782 | 411 | 53 |

Dit zijn broninstanties, niet 782 unieke anatomische concepten. De 464 crosswalkrijen bestaan uit directe en groepskoppelingen. De meshes zijn nog niet geïntegreerd in de atlas; geometrische, anatomische en variantregistratie blijven afzonderlijke werkstromen. De oorsprongsinventaris houdt de initiële toestand vast; de CI-audit is het actuele technische bewijs.

## Vrijgavecriteria blijven gelden

- Technische intake en browserbewijs op echte brondata.
- Anatomische review, variantdekking, registratie van bronassen en schaal, en onafhankelijke kwaliteitscontrole.
- Visuele en prestatiecontrole op echte mobiele apparaten; bron- en licentie-informatie zichtbaar.
- Geen productie-merge voordat de bestaande releasegate aantoonbaar voldoet.
