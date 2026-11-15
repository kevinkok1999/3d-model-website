# 3D Universe — werkafspraken

Lees eerst README.md, docs/01-MASTERPLAN.md, docs/02-SPECIALISTENTEAM.md, docs/07-ARCHITECTURE-DECISIONS.md en planning/05-ROADMAP-EN-BACKLOG.md.

## Eigenaarschap en samenwerking
- Architectuur is leidend: houd de viewer-kern onafhankelijk van domeinmodules en werk met de contracten in contracts/.
- Deel werkzaamheden op in afgebakende taken met eigenaar, afhankelijkheden, acceptatiecriteria en tests.
- Gebruik kleine featurebranches en pull requests; wijzig geen ongerelateerde onderdelen of bestaande contracten zonder review.
- Verifieer afhankelijkheden, bronnen, assetlicenties en wetenschappelijke claims voordat ze naar een release gaan.
- Geen AI-diagnose, medische persoonsgegevens, symptoomopslag, secrets of ongecontroleerde externe assets. Nooit API-sleutels in Git.
- Leg ontwerpwijzigingen vast in een ADR; rapporteer gemeten resultaten afzonderlijk van doelen.
- Controleer mobiele toegankelijkheid, geheugenverbruik en regressies. Geen claim dat een model medisch gevalideerd is zonder bewijs.
- Houd public/ vrij van interne ontwikkelbestanden; alleen release-assets horen daar.
- Voeg geen licentie toe voor eigen code zonder expliciete keuze van de projecteigenaar. Externe assets houden hun eigen licenties.
- Eerste mijlpaal: één anatomisch model, één selecteerbare schouderstructuur, betrouwbare NL/EN-inhoud en meetbare prestaties. Pas daarna uitbreiden.
## UX-implementatie
- Lees docs/ux/UX-00-OVERZICHT.md en de betreffende UX-01 t/m UX-05 vóór wijzigingen aan route, viewer, layout, inhoud of gebruikerstests.
- Gebruik bestaande releasegates als leidend; bij conflicten eerst ADR en review. Schematische wireframes zijn ontwerp, geen medisch gevalideerde assets.
## Uniforme modelkwaliteit (producteis eigenaar)
- Lees docs/model/QUALITY-CONTRACT.md en docs/model/MASTER.md voor alle 3D-, asset-, inhouds- en QA-wijzigingen. De schouder is alleen een technische spike; de productkwaliteit moet gelijkmatig over de volledige afgesproken scope worden bewezen.
- Alle ontbrekende delen of laaggeresolueerde groepsmeshes krijgen gap-/afmaaktaken, een eigenaar, gevalideerde bron en toets. De achterblijvende domeinen krijgen prioriteit; geen stilzwijgend schrappen of alleen voorbeeldregio's perfectioneren.
- Kandidaatdekking en doelcatalogus zijn onderscheiden. 100% van de kandidaatledger betekent niet automatisch 100% anatomische dekking. Geen publieke releaseclaim totdat alle afgesproken scope, rechten, content, anatomie, toegankelijkheid en prestaties zijn afgetekend.
- Draai `node --test model-audit/audit-model.test.mjs model-audit/coverage-gate.test.mjs` bij wijzigingen aan model-audit. Synthetische tests zijn nooit wetenschappelijke bewijsstukken; geen asset-upload zonder licentiereview.
