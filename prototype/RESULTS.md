# 3D Universe — fase 1: technische bewijsvoering

Datum: 15 november 2026. Status: **ontwikkelspike; publieke vrijgave geblokkeerd**. Dit is geen claim van medisch gevalideerde of volledige lichaamsanatomie.

## Werkelijk verkregen bronassets

`open-anatomy-3d@0.1.0`, `three@0.179.1`, `vite@8.3.8` en `playwright@1.65.1` zijn exact vastgezet. De geïnstalleerde catalogus en beide GLB-bestanden hebben dezelfde Git-blobhash als upstream-commit `c050aa7b1bc56ceed668199b01ea017341928d7b`.

| Meting | Mannelijk referentiemodel | Vrouwelijk referentiemodel |
|---|---:|---:|
| GLB-bestandsomvang (bytes) | 7.614.076 | 8.134.732 |
| Bronmeshrecords | 128 | 133 |
| Gewrichtsankers (geen meshes) | 12 | 12 |
| Variantgebonden records | 140 | 145 |
| Metadata-mappingfouten | 0 | 0 |
| Daadwerkelijk gedecodeerde meshes (CPU) | 128 | 133 |
| Gedecodeerde vertices | 986.873 | 1.056.771 |
| Gedecodeerde driehoeken | 1.026.032 | 1.168.999 |

Samen 147 unieke bronlabels en 285 variant × record-rijen; geen volledige doelcatalogus. Niet ieder record is een individueel anatomisch onderdeel: groepsmeshes en gewrichtsankers zijn expliciet onderscheiden. De NL-vertalingen zijn conceptlabels voor alle 147 records, Engelse labels komen rechtstreeks uit de bron. Geen medische uitleg is verzonnen.

## Geïmplementeerde technische functies

- Browsergebaseerde Three.js-viewer met GLTFLoader en Meshopt-decode, lokale GLB-assets, camera-orbit, zoom, aanraakinteractie, raycasting, bron-ID-mapping, selectiehighlight, focus, isolatie, reset en aparte gewrichtsmarkers.
- Variantwisseling, systeemlagen, doorzoekbare volledige kandidaatcatalogus, toetsenbordselectie, NL/EN-labels, behoud van selectie waar mogelijk, vijf moduskeuzes (inhoud per modus nog niet gepubliceerd).
- Responsieve werkbank, detailpaneel, bronattributie, status en metrieken; foutstatus en catalogusfallback bij ontbrekende GPU of mislukte lading.
- Reproduceerbare npm-installatie, testcommando, bundel en browser-smoke-harnas. De CI-workflow valideert alleen en publiceert niets.

## Werkelijke verificatie

Node v24.22.1: `npm run build` slaagt. De build produceert de twee volledige GLB-assets plus HTML, CSS en JavaScript. Het ingepakte JS-bestand is circa 677 kB (171 kB gzip); Vite waarschuwt voor chunkgrootte. Dit is een open optimalisatiepunt, geen mobiel prestatiebewijs.

`npm test` controleert bronidentiteit, GLB-metadata, catalogus/labeldekking, releasepoort en daadwerkelijke CPU-decode. Voor beide modellen: alle meshes hebben eindige vertexattributen en wereldtransformaties, niet-lege eindige bounds, normale vectorattributen en indices binnen het vertexbereik. Source-ID's worden via GLTF-parserassociaties gemapt, ook wanneer de runtime een naam zoals `skin_1` toekent. Zie de tests in `test/` en de testuitvoer voor details. Dit is geen bewijs van WebGL-rendering of anatomische juistheid.

**Browserstatus: NOT_RUN.** Chromium kan in de uitvoeringsomgeving niet starten (socket-permissie geweigerd). Er bestaat geen bewijs van een succesvol gerenderde frame, visuele kwaliteit, daadwerkelijke selectie in WebGL of mobiel gedrag. De browser-smoke-test moet in een normale omgeving of CI slagen; fysieke apparaten blijven daarna vereist. Geen screenshots of rendermetingen worden gefingeerd.

## Niet afgetekend (release blockers)

1. Browser- en echte apparaatregressies, toegankelijkheid en prestaties, herstel na contextverlies, selectie en rendering voor alle structuren.
2. Onafhankelijke anatomische beoordeling en doelcatalogus per systeem/regio met alle ontbrekende onderdelen als afmaaktaken. Khronos glTF-validator, geometrische/visuele beoordeling en per-asset rechtenreview.
3. Gelijke inhoudsverdieping voor elk onderdeel en elke toepasselijke modus/taal; toetsbare bronnen, animaties en modulecontracten.
4. LOD en streaming, prijs-/geheugen-/netwerkbudgetten en vergelijking van apparaten. De huidige volledige modellen zijn een technische baseline.
5. Alle 285 kandidaatrijen en alle toekomstige doelstructuren moeten dezelfde kwaliteits-evidence hebben. De bestaande draft ledger blijft geblokkeerd, ongeacht een geslaagde technische proef.

De bestaande Vercel-productie blijft de voorbereidingspagina. Deze branch bevat alleen broncode voor de geïsoleerde proef. Start lokaal met `npm ci`, `npm run dev`; voor productieachtige validatie `npm run build`, `npm run preview -- --port 4173` en `npm run test:browser` na installatie van Chromium.
