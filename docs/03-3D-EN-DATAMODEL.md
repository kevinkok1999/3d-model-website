# 03 — 3D-kern, datamodellen, modulegrenzen en privacy

## 1. Runtime-model

De applicatie heeft **één centrale applicatiestate** en één actieve renderingmodule tegelijk:

```text
AppState
  locale: "nl" | "en"
  subject: "anatomy" | "cell" | "solar" | "physics" | ...
  mode: "herstellen" | "trainen" | "leren" | "blessures" | "sporten"
  selectedId: string | null
  visibleLayerIds: string[]
  camera: { target, distance, azimuth, polar }
  explodeAmount: number  # 0..1
  reducedMotion: boolean
  loadingStatus: "idle" | "loading" | "ready" | "error"
```

**Scheiding van verantwoordelijkheden:** `core-3d` weet niets van ziekten of spiernamen; de anatomieadapter vertaalt de canonical structure ID naar een mesh; `content` resolveert educatieve tekst per ID + modus + taal.

## 2. Anatomische structuurcatalogus

Conceptueel record:

```json
{
  "id": "anatomy:muscle:deltoid:left",
  "provider": "open-anatomy-3d",
  "providerMeshKey": "...gecontroleerd tijdens import...",
  "nameKey": "anatomy.deltoid.left",
  "system": "muscles",
  "regionId": "anatomy:region:shoulder:left",
  "parentId": "anatomy:body",
  "relatedIds": [],
  "contentVersion": "1.0.0",
  "reviewStatus": "draft"
}
```

**Let op:** de `providerMeshKey` hierboven is expres geen verzonnen bestaande meshkey; hij moet rechtstreeks uit de feitelijk gedownloade GLB/catalogus komen. Onze `id` is eigen stabiele ID en wordt altijd vertaald naar één of meer providerkeys. Geen inhoud over een structuur als de mapping niet klopt.

## 3. Contentrecord en wetenschappelijke herleidbaarheid

```json
{
  "structureId": "anatomy:muscle:deltoid:left",
  "mode": "leren",
  "locale": "nl",
  "title": "Schouderspier",
  "summary": "Educatieve voorbeeldtekst; definitieve inhoud volgt na review.",
  "references": [],
  "reviewedBy": null,
  "reviewStatus": "draft",
  "reviewedAt": null,
  "revision": 1
}
```

Publicatieregel: `reviewStatus=approved` + reviewer + bronverwijzing(en) voor claims. Geen gegenereerde blessureadviezen zonder domeinreview. Maak ook vocabulaire van synonymen en vertaalbare medische termen.

## 4. Scenebediening en cameraconventies

- Input: pointer click, touch tap, keyboard/select in structuurboom, screenreader-interactie via gewone HTML.
- Selectie: object picking/raycast in 3D → providerMeshKey → canonical ID → centrale state → label/contentpaneel.
- Camera: orbit/pan/zoom met grenzen zodat gebruiker niet verdwaalt; focus op bounding box van gekozen object; reset naar volle scène.
- Coördinaten: importer leest glTF-as, meters/schaalconventies, origin en anatomische oriëntatie en zet dit **per dataset** om. Niet aannemen dat alle modellen dezelfde oorsprong hebben.
- Layers: mesh visibility per systeem (skelet, spieren, organen, vaten, zenuwen, huid) met optionele transparantie.
- Explode view: interpolatie per structuur naar vooraf berekende, collision-aware vector, niet zomaar alle mesh-centers radiaal vergroten. Modelbasis blijft onveranderd voor nauwkeurige selectie.
- Doorsnede: shader-/clipvlak pas na bewezen GPU-compatibiliteit; transparantie en artefacten expliciet testen.
- Veel kleine meshes: begrens draw calls; gebruik batching waar dit selectie en per-object zichtbaarheid niet onbruikbaar maakt.

## 5. 3D-assets — pipeline

```text
Bron + herkomst/licentie → handmatige toets
→ ruwe asset in afzonderlijke licentie-gecontroleerde bronopslag
→ import/schaal/oriëntatie controleren
→ canonical ID-mapping + anatomische metadata
→ optionele decimatie / vereenvoudiging / LOD
→ glTF-optimalisatie (Meshopt of Draco, teksturen KTX2/WebP waar zinvol)
→ automatische validatie: meshes, IDs, bounding boxes, decodeerbaarheid
→ generatie attribution + SHA256 + assets manifest
→ review + versiebeheer → CDN/static assets
```

Beheer geen opnieuw gecomprimeerde of afgeleide assets zonder het oorspronkelijke licentieverband te behouden. Houd modelgeometrie, softwarecode en educatieve tekst als afzonderlijke intellectuele werken in het register.

## 6. Simulatiepluginstandaard

Modules delen een **transport- en UI-contract**, geen vakspecifieke formules. De interfaces staan in `contracts/simulation-contract.ts`. Elke module heeft:

- manifest: ID, schemaVersion, naam-/titelkeys, wetenschappelijk domein, assets, beperkingen, minimale rendererfuncties;
- `load()` / `mount()` / `unmount()` met nette cleanup, geen globale mutaties;
- acties: focus, selectie, layers, reset, pauze/start/parameter;
- events met expliciete units en tijdstempel indien een simulatie tijd modelleert;
- bijbehorende toegankelijk tekstuele beschrijving en eigen validatietests.

Voor cellen/scheikunde/fysica/ruimtevaart is schaalwissel een scene-transitie; van molecule naar zonnestelsel is nooit simpelweg één wereld met dezelfde meter-unit en zelfde timestep. De module bepaalt een coherent schaal- en tijdmodel, en toont dat begrijpelijk.

## 7. Voorbeeld van anatomische user-flow

```text
Home → 3D lichaam → regio 'schouder' → structuur 'schouderspier'
                        ↓
          Selectie bewaart canonical structure ID
             ├── Leren: naam, vorm, functie
             ├── Trainen: algemeen bewegingspatroon
             ├── Herstellen: algemene educatie over belasting/herstel
             ├── Blessures: niet-diagnostische uitleg + wanneer hulp zoeken
             └── Sporten: biomechanica, sportbewegingen
```

Toon alleen content die daadwerkelijk gevalideerd en beschikbaar is. Modes zonder content gebruiken neutrale 'binnenkort beschikbaar' in plaats van kunstmatig gegenereerde medische claims.

## 8. Achtwekenprogramma: minimale gegevensopslag

V1: uitsluitend **lokale** browserstorage en **niet** automatisch gesynchroniseerd.

```json
{
  "selectedProgramId": "general-mobility-8w",
  "currentWeek": 1,
  "completedLessonIds": []
}
```

Geen naam, e-mail, leeftijd, medische gegevens, klachten, symptomen, vragenlijst, locatie of gezondheidsprofiel. Als browserdata wordt verwijderd, kan de voortgang verloren gaan; communiceer dat duidelijk. Eventuele toekomstige accounts/sync vereisen nieuw privacyontwerp en expliciet scopebesluit. Bij betaalfunctionaliteit hoort noodzakelijke facturatie bij een afzonderlijke betalingsverwerker en een eigen juridische/privacybeoordeling — **niet** stilzwijgend toevoegen aan de progressiedatabase.

## 9. Security en performance

- Alle modellen en catalogi beschouwen als onbetrouwbare externe inputs tot ze gevalideerd zijn; importproces controleert bestandstype, omvang, naamgeving en referenties.
- Geen secrets in de browser; restrictieve Content Security Policy; externe modeldownloads bij voorkeur naar gecontroleerde eigen asset-hosting.
- Integriteitschecks/checksums voor assets en versies, `npm audit` of equivalent in CI, dependencyversies vastgezet.
- Renderer update op behoefte; agressieve texture-/geometry-reuse; unload bij modulaire scènewissel; fallback voor context loss.
- Gebruik een testbudget in plaats van verkooppraatjes: richtwaarde 30 fps mobiel en 60 fps desktop in afgesproken benchmarkscènes, gemeten op echte apparaten.
- Geen eventtracking die gebruikersselecties van 'blessures' als persoonlijke gezondheidsinformatie verzamelt.

## 10. Versiebeheer en backward compatibility

`pluginApiVersion`, `contentSchemaVersion`, `assetSchemaVersion` en bronmodellen worden afzonderlijk geversioneerd. Bij verbreking van een interface volgt migratiescript of expliciete deprecatie. Oude canonical IDs krijgen redirect alias; bestaande links blijven bruikbaar.
