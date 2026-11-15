# Start hier — fase 0

Status: technische voorbereiding vastgelegd; geen werkende 3D-engine of gevalideerde anatomische assets.

1. Lees [masterplan](docs/01-MASTERPLAN.md) en [specialistenteam](docs/02-SPECIALISTENTEAM.md).
2. Doorloop de [roadmap](planning/05-ROADMAP-EN-BACKLOG.md) en [risico- en testmatrix](planning/06-RISICOS-EN-TESTPLAN.md).
3. Controleer de licentie van elk kandidaatmodel en de exacte runtimeversies. Leg de verificatie vast.
4. Maak een geïsoleerde proof-of-concept-branch voor één anatomisch model met selectie, camera en NL/EN-informatie.
5. Definieer een meetbare mobiele en desktop-baseline; beoordeel de resultaten vóór het uitbreiden naar andere modules.

## Hosting
De huidige repository bevat uitsluitend technische voorbereiding en een dependency-vrije placeholder in public/. Importeer in Vercel met root directory ./, preset Other en output directory public. Er is in fase 0 geen build, database, account, betaling of geheim nodig. Bij de eerste echte Next.js-implementatie wordt de Vercel-configuratie bewust herzien. Geen productieclaim vóór de releasepoorten.

## Open beslissingen
- Exacte Next.js/React/Three.js-versies: compatibiliteit aantonen.
- Licentie eigen code: keuze eigenaar.
- Bron en rechten van anatomische modellen: per asset vastleggen.
- Privacy en opslag: lokaal tenzij later expliciet goedgekeurd.

## UX-voorbereiding
Lees vóór de technische spike [de UX-blauwdruk](docs/ux/UX-00-OVERZICHT.md). Volg de vijf specialistische werkproducten en de bestaande releasepoorten. De visuele wireframes zijn schematische ontwerpreferenties, geen anatomische modellen.

## 3D-modelwerk: hoogste prioriteit
Lees [het 3D-masterdocument](docs/model/MASTER.md), [het uniforme kwaliteitscontract](docs/model/QUALITY-CONTRACT.md) en [de model-audit](model-audit/README.md). De eerste kandidaat omvat 147 cataloguslabels, die nog niet de definitieve anatomische doellijst vormen. Ontbrekende delen worden concrete afmaaktaken; geen gehele-lichaamclaim voordat de doelcatalogus en elke afzonderlijke structuur zijn beoordeeld.
