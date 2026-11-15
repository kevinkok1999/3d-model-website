# Fase 2 — regionale navigatie en anatomische intake

Status: interne ontwikkelpreview. Geen productiepublicatie, geen bewijs van volledige of klinisch gevalideerde anatomie.

## Nieuwe functies

- Alle 147 bestaande bronkeys hebben expliciete navigatieregio's: hoofd/hals, romp, bovenste en onderste ledematen, en overlappende regio's. Dit is een navigatievoorstel op basis van bronlabels, geen nieuwe mesh of anatomische review. Regio, systeem en tweetalige zoekterm combineren als lijstfilters, onafhankelijk van de zichtbaarheid van 3D-lagen.
- Camera: voor/achter/links/rechts op de referentiemodelassen en lichaam passend maken zonder selectie, isolatie of lagen te wissen. De testcontrole meet de daadwerkelijke positie en het doel, niet alleen de knoptekst.
- Uitklapbare dekkingskaart: 140/145 bronrecords, 128/133 meshrecords, 12 ankers per variant, zeven bestaande systemen. Het gemiddelde of percentage anatomische volledigheid wordt niet berekend, omdat een gereviewde doelcatalogus ontbreekt.
- 118 concept-uitbreidingsdoelen in alle tien gap-domeinen, met NL/EN-namen, stabiele target-ID, conceptbron, bestaande groeps-/ankerkoppeling waar toepasselijk, individuele bewijsstatus en géén claim van gereedheid. Inhoudelijk reviewen vóór publicatie.

| Bewijsstatus uitbreidingsdoel | Aantal |
|---|---:|
| Alleen groepsmesh | 75 |
| Alleen gewrichtsanker | 12 |
| Geen afzonderlijk gekoppelde geometrie | 19 |
| Nog onbeoordeeld | 12 |

Zie [het conceptregister](../model-audit/expansion-register.draft.json) en [bronbesluit](EXPANSION-SOURCES.md). De doelen zijn aanvullingen op de kandidaatcatalogus, geen eindnoemer. Een bronrecord kan nog steeds een onvolledige groep voorstellen.

## Eerstvolgende werkelijke modelinname

De officiële [BodyParts3D 4.0 dataset](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) is een afzonderlijk mannelijk referentiemodel, niet automatisch compatibel met de huidige lichaamshouding, schaling of vrouwelijke variant. De officiële IS-A-catalogus bevat 2.906 regels inclusief header; losse ELEMENT-bestanden zijn niet hetzelfde als BP-representatie-ID's. In [de intake-inventaris](../model-audit/bodyparts3d-intake-candidates.json) zijn 21 geverifieerde bronconcepten geselecteerd (botten, spieren, bloedvaten), met 23 gecontroleerde ELEMENT-bestandsverwijzingen. Ze zijn metadata, niet geïmporteerde 3D-modellen.

Gebruik bij een lokaal verkregen originele elementtabel:

```sh
node model-audit/bodyparts3d-mapping.mjs /path/to/isa_element_parts.txt
```

De parser controleert expliciete concept-ID's, namen en veilige element-ID's, onderscheidt onopgeloste mappings en geeft geen anatomisch keurmerk. Houd vormdata, ontologie en licentieproof apart. Valideer individuele geometrie, assen, positionering, units, variant, meshkwaliteit en rechten vóór integratie. Vrouwelijke bron en perifere zenuwgeometrie blijven aparte open werkstromen. Human Reference Atlas dient als aanvullende kandidaat, met afzonderlijke bronregistratie.

## QA en vrijgave

`npm test` en `npm run build` opnieuw uitvoeren. GitHub Actions toetst de volledige bestaande 285 variantgebonden records, regio/systeem/zoekfilters, laagtoestand, camera-assen, alle 118 detailregistraties en 390px viewport in Chromium. De browserproef is software-WebGL, geen fysieke apparaat- of medische review. De bestaande releasegates blijven ongewijzigd en de productiebranch blijft onaangeroerd.
