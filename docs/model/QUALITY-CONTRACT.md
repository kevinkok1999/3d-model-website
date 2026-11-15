# Modelkwaliteit — uniforme dekkings- en afmaakregel

**Besluitvoorstel op basis van de expliciete producteis van de eigenaar:** het hele platform moet consistent hoogwaardig zijn, zonder permanente zwakke regio's of half uitgewerkte onderdelen. Dit geldt voor alle vakmodules, alle gepubliceerde anatomische systemen en de onderliggende structuur-ID's. De schouder is uitsluitend een technische spike; een werkende spike is geen vrijgave van het product.

## 1. Van inventaris naar voltooid model

1. Maak een door anatomiespecialist gereviewde doellijst van alle benodigde systemen, regio's, structuren, zijden, varianten en diepte. Leg de expliciete noemer vast; 147 cataloguslabels zijn niet gelijk aan het gehele menselijk lichaam.
2. Reconcileer de doellijst met het vastgepinde bronmodel. Ontbrekende of samengevoegde structuren worden expliciete `GAP`-tickets: nieuwe bronasset zoeken, rechten controleren, alternatieve mesh/mapping produceren, inhoud en tests afmaken. Nooit een ontbrekende spier als bestaand presenteren.
3. Maak dezelfde review-/kwaliteitspijplijn voor elk onderdeel: bron → 3D-geometrie/anker → anatomische identificatie → selectie/relaties → visualisatie → educatieve verdieping → taal → QA.
4. Bouw per systeem en regio in parallelle werkstromen. Een team mag geen onderdeel beoordelen als kwalitatief voltooid op basis van een ander systeem; alle individuele bewijzen blijven zichtbaar.
5. Runtime toont uitsluitend echte mogelijkheden; in niet-publieke ontwikkelpreviews zijn ontbrekende onderdelen zichtbaar als open werk. Vóór de beoogde volledige publieke release moeten alle tickets binnen de afgesproken scope gesloten zijn. Een release met beperkte reikwijdte vereist een apart expliciet besluit van de eigenaar en eerlijke benaming, nooit stilzwijgende scopevermindering.

## 2. Gelijke ondergrens, niet identieke geometrie

| Kwaliteitsas | Verplicht voor elk onderdeel |
|---|---|
| Herkomst/rechten | Gecontroleerde bron, revisie, licentie, attributie, wijzigingen, filehash |
| Anatomische identiteit | Gereviewde naam, zijde, regio, systeem, stabiel ID, geometrisch juiste mapping |
| Geometrie | Aantoonbare pasvorm, oriëntatie, passende resolutie/LOD, geen onbedoelde fusie of ontbrekende vorm; geldige hotspot als het een anker is |
| Visuele kwaliteit | Zelfde belichtings-/materiaalstandaard, duidelijke classificatie, labels, oriëntatie en selectiefeedback |
| Interactie | Zelfstandige selectie via 3D én lijst, focus, passende laag/isolatie, betrouwbare reset en terugweg |
| Verdieping | Uitleg, anatomische relaties, functie, schaalcontext en relevante, beschikbare vervolgstappen; bronnen per bewering |
| Vijf modi × twee talen | Tien inhoudsrecords per toepasselijke structuur met review. Als een modus inhoudelijk niet passend is, een nauwkeurig gemotiveerde educatieve uitleg van die beperking; geen verzonnen sport- of herstelclaims |
| Beweging | Bewegings-/animatiebewijs waar een beweging werkelijk bestaat en relevant is, met expliciete nauwkeurigheidsklasse. Voor statische of niet-bewegende concepten is een correcte, onderbouwde verklaring geen gebrek aan diepgang |
| Toegankelijkheid | HTML-equivalent, toetsenbord/touch, labels, verminderde beweging, begrijpelijke foutafhandeling |
| Prestatie | Per-ID regressietests en worst-case scenariometingen per regio/systeem, representatieve werkelijke apparaten, geen verborgen kwaliteitsverlies door mobiele LOD |

Niet elke anatomische structuur heeft zinvolle dezelfde soort animatie of microscopische weergave; iedere structuur heeft wel dezelfde reviewstandaard en uitlegkwaliteit. Een hotspot betekent geen afzonderlijke 3D-mesh. Een afzonderlijke celscene moet schaal en modelgrenzen uitleggen. Kwaliteitsgelijkheid is aantoonbare inhoud, niet geforceerde gelijkvormigheid.

## 3. Machinecontrole en menselijke beoordeling

De [model-audit](../../model-audit/README.md) biedt een eerste bron-specifieke inventaris met 285 rijen (variant × catalogusstructuur) en controleert acht evidence-assen, tien modus/taalrecords en een overall-review per rij. Het gegenereerde ledger begint bewust op 0/285 afgetekend. Deze inventaris is slechts de eerste kandidaatnoemer; de definitieve anatomische doellijst en ontbrekende structuren worden toegevoegd wanneer ze betrouwbaar in kaart zijn gebracht.

Een machine-pass is nodig, maar onvoldoende: evidence bestaat uit bron/revisie, reviewer, testresultaat, gemeten apparaat/browser en verwijzing naar reproduceerbaar bewijs. Onafhankelijke anatomie-, licentie- en QA-eigenaren kunnen vrijgave blokkeren bij inhoudelijke fouten of een ontbrekend onderdeel. Testdata mogen nooit als reale evidence worden gebruikt.

## 4. Regioteams en afmaakverantwoordelijkheid

| Team | Werkstroom | Overdracht |
|---|---|---|
| Anatomische bron & rechten | Volledige doelcatalogus, verschillenkaart, rechten, modelkeuze; per systeem een eigenaar | Bronmanifest + gaplijst |
| Technical Art | Geometrie, correcties, LOD, materialen, schaal/assen, reproduceerbare exports | Zelfde ID-koppeling per detailniveau, hashes |
| 3D-engine | Centrale viewer, selectie, lagen, renderkwaliteit, geavanceerde tools, lifecycle | Module onafhankelijke contracten |
| Anatomie & biomechanica | Identificatie, nomenclatuur, functies, relaties, relevante gecontroleerde beweging | Reviewerbewijs + beperkingen |
| Educatieve inhoud | Alle vijf modi, NL/EN, verdieping, bronnen en toegankelijkheid | Reviewbare inhoudsrecords |
| Performance & QA | Per-ID automatische checks, per regio op echte hardware, gebruikersvalidatie | Dekking, defectlijst, gatebesluit |
| Technische integratie | Werkverdeling, blokkades, ADR's en afronding van alle open gaten | Geen stilzwijgende uitzonderingen |

Bij een mislukte test blijft de rij open, met defectklasse, verantwoordelijke en herhaalbare test. Herhaal na correctie; pas daarna aftekenen. Dit borgt de expliciete producteis met aantoonbare kwaliteit in plaats van een loze belofte.

### Domeinsquads: geen onderdeel wordt vergeten

Deze werkgroepen zijn functionele eigenaarschappen, geen claim dat er al menselijke medisch specialisten zijn ingehuurd. Iedere squad gebruikt de gemeenschappelijke pipeline, annotatie- en kwaliteitspoort; het centrale 3D-team ondersteunt alle squads gelijkwaardig.

| Squad | Kandidaten uit huidige catalogus (unieke labels) | Voornaamste uit te werken lacunes |
|---|---:|---|
| Skelet | 28 | individuele botten, fijne landmarks, verbindingen en symmetrie |
| Gewrichten | 12 hotspots | gewrichtsstructuren en relevante banden/kapsels als afzonderlijk onderbouwde assets |
| Spieren | 41 | afzonderlijke spieren waar groepsmesh te grof is, pezen en relaties |
| Organen | 41 | inwendige organen en onderbouwde substructuren per relevante variant |
| Bloedvaten | 22 | vertakkingen en correcte verbondenheid, geen gegokte netwerken |
| Zenuwstelsel | 2 | bronkandidaat is zeer grof; aparte hersen-/zenuwstructuren en trajecten inventariseren |
| Huid | 1 | relevante lagen en weefselverdieping via gevalideerde aparte schaalmodellen |

De aantallen zijn catalogusrecords van de eerste kandidaat, geen gewenste einddekking. De squads moeten ook ontbrekende systemen en regio's ontdekken, waaronder structuren die niet in deze zeven cataloguscategorieën zijn uitgesplitst. Reproduceerbare gap-analyse met de doelcatalogus bepaalt de concrete eindnoemer. Maak geen eindrelease uitsluitend omdat alle 147 kandidaatlabels afgevinkt zijn.

Regiocontrole is kruisfunctioneel: gebruik hoofd/hals, romp, bovenste ledematen, onderste ledematen en bekken als werkverdeling; bij elke regio worden alle relevante domeinsquads meegenomen. Richt de afmaakplanning op de achterblijvende regio of het domein met de slechtste dekking, niet op steeds meer polish van een al volledig uitgewerkte voorbeeldregio.
