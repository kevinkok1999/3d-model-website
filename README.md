# 3D Universe — technisch voorbereidingspakket

**Status:** ontwerpvoorstel voor besluitvorming, geen gebouwde applicatie.  
**Datum:** 15 november 2026.  
**Taal:** Nederlands. Productinterface vanaf v1: Nederlands en Engels.

## Wat zit in dit pakket?

1. `docs/01-MASTERPLAN.md` — productkaders, scope, prioriteiten, technische architectuur en kwaliteitsnormen.
2. `docs/02-SPECIALISTENTEAM.md` — 14 specialistische rollen, eigenaarschap, samenwerking, overdrachtsregels en besluitvorming.
3. `docs/03-3D-EN-DATAMODEL.md` — datastromen, scene engine, anatomie, assets, progressie en simulatiebeleid.
4. `docs/04-LICENTIES-EN-BRONNEN.md` — gevalideerde publieke bronnen en licentie- en afhankelijkheidsrisico's.
5. `planning/05-ROADMAP-EN-BACKLOG.md` — fasen, afhankelijkheden, tickets, acceptatievoorwaarden en vrijgavepoorten.
6. `planning/06-RISICOS-EN-TESTPLAN.md` — meetbare kwaliteitsdoelen, technische risico's en testmatrix.
7. `contracts/simulation-contract.ts` — conceptuele TypeScript-interface tussen 3D-kern en losse simulatiemodules.
8. `contracts/manifest.example.json` — voorbeeld van een assets/licenties-manifest; geen echte asset-download.
9. `docs/07-ARCHITECTURE-DECISIONS.md` — voorlopig vastgelegde ontwerpbesluiten en open besluiten.

## Wat is behouden uit eerdere afspraken?

- **Één centraal 3D-mensmodel**, dat vanuit meerdere ingangen bereikbaar is.
- Modi: **Herstellen, Trainen, Leren, Blessures, Sporten**.
- Navigatie via zoom en steeds diepere keuzebalken, **geen vragenlijsten**.
- **Geen AI-chat**, medische diagnoses, symptoomopslag of claim dat het product medisch advies geeft.
- Achtwekenprogramma: alleen gekozen programma en voortgang bewaren; voor eerste versie lokaal, zonder account.
- Wetenschappelijk controleerbare content, NL + EN.
- Korte, vooraf gecontroleerde uitleg-/animatievideo's van circa 30 seconden.
- Commercieel uitgangspunt uit eerdere gesprekken: gratis basistoegang, eventueel extra functies voor eenmalig €28 — **nog geen technisch of juridisch vastgesteld prijsbeleid**.
- Uitbreiding naar cellen, scheikunde, natuurkunde, ruimtevaart en techniek via modules.

## Beslisregel

**Geen code voor een groot platform vóór de eerste technische proof of concept**: laad één licentie-gecontroleerd anatomiemodel, selecteer een structuur, toon betrouwbare content in NL/EN, meet prestaties op mobiel en desktop, en test de modulegrens. Pas daarna uitbreiden.

## Aanname versus verificatie

Verifieer elke bron, licentie, dependencyversie en compatibiliteitsclaim opnieuw tijdens implementatie. Externe open-source repositories zijn geen garantie van medische kwaliteit of productiegeschiktheid.

## Uitgebreide UX- en interfaceblauwdruk

Bekijk [het geïntegreerde UX-overzicht](docs/ux/UX-00-OVERZICHT.md), inclusief schermbouwtekeningen voor desktop en mobiel, informatiearchitectuur, 3D-bediening, verdiepingen en gebruikerstests. Ontwerpvoorstellen zijn nog niet geïmplementeerd of empirisch gevalideerd.

## 3D-model engineering en uniforme kwaliteitsnorm

- [Geïntegreerde 3D-modelblauwdruk](docs/model/MASTER.md) — bronmodellen, renderengine, technische art, anatomie/biomechanica en performance.
- [Uniform kwaliteitscontract](docs/model/QUALITY-CONTRACT.md) — iedere ontbrekende of onvoltooide structuur wordt een afmaaktaak. De schouder is alleen een technische spike.
- [Model-audit en dekkingsledger](model-audit/README.md) — reproduceerbare cataloguscontrole, 285 kandidaatrijen en 19 reviewpunten per rij, tests. Geen anatomische GLB of werkende viewer geverifieerd.

- [Afmaakbacklog van de eerste kandidaat](docs/model/GAP-BACKLOG.md) — gegroepeerde/ontbrekende structuren krijgen bron-, detail- en reviewtaken.
