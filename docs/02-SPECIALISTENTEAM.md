# 02 — 14 specialisten en maximaal samenwerkend ontwikkelproces

Dit document beschrijft **virtuele specialistische werkstromen**. Er zijn hiermee niet automatisch personen aangesteld of parallel werkende agenten gestart. Bij uitvoering kan elke werkstroom aan een mens, AI-assistent met supervisie, of een combinatie worden toegewezen.

## 1. Rollen, verantwoordelijkheid en concrete oplevering

| Nr | Specialisme | Eigenaar van | Eerste oplevering | Harde afspraak |
|---:|---|---|---|---|
| 01 | Product Lead / opdrachtgever | scope, gebruikerswaarde, prioriteit | use cases + niet-onderhandelbare eisen | verandert scope alleen via besluitlog |
| 02 | Chief Architect / integratie | monorepo, ADR's, alle contracten | architectuurdiagram, afhankelijkheidsbeleid | keurt breaking interfaces goed |
| 03 | Frontend & UX | NL/EN-navigatie, responsive UI, toegankelijkheid | schematische schermen, ontwerpcomponenten | 3D-informatie moet ook tekstueel toegankelijk zijn |
| 04 | 3D Rendering Engineer | WebGL, camera, selectie, renderloop | reproduceerbare selectie-POC | renderer is onafhankelijk van anatomiedata |
| 05 | Technical Artist & Asset Pipeline | Blender/GLB, compressie, LOD, licentiemetadata | reproduceerbare asset-pipeline | geen onbeheerde binaire bestanden |
| 06 | Anatomist / wetenschappelijk reviewer | anatomische juistheid, naamgeving, structuurelatie | geverifieerde ID-mapping schouder | keurt anatomische publicaties inhoudelijk goed |
| 07 | Biomechanica & animatie | beweging, spierketens, visuele demonstraties | 30-seconden conceptanimatie met bronvermelding | visuele schattingen nooit als exacte persoonlijke biomechanica tonen |
| 08 | Scientific Simulation Engineer | fysica, scheikunde, cel- en ruimtesimulaties | testbaar simulatieplugincontract | formule, units en beperkingen van elk model beschrijven |
| 09 | Content & Localization Lead | schrijfstijl, NL/EN, curriculum, redactie | contenttemplate en tweetalige proefpagina | geen ongecontroleerde medische claims |
| 10 | Backend & Data Engineer | progressie-opslag, interface bij eventuele sync | minimale progressieschema's | geen symptomen, geen vragenlijstdata |
| 11 | Security & Privacy Specialist | dreigingsmodel, autorisatie, dataminimalisatie | veiligheidsbaseline + gegevensstroom | blokkeert vrijgave bij privacy-/securityfouten |
| 12 | DevOps / Release Engineer | branches, GitHub Actions, Vercel, rollback | herhaalbare CI/CD preview | geen productierelease zonder groene poorten |
| 13 | QA, Accessibility & Performance Lead | testplan, toestellen, regressie, WebGL-fallback | testmatrix en meetrapport | toegankelijkheids- en compatibiliteitsfouten zijn release blockers |
| 14 | Open-source License & Compliance Lead | licenties, modellen, attributie, commerciële rechten | asset register en licentiecheck | geen onduidelijke assets in productie |

## 2. Samenwerkingscontract

**Eén gedeeld werkbord:** elk ticket bevat `owner`, `reviewers`, `scope`, `interfaces`, `dependencies`, `acceptance criteria`, `tests`, `licence impact`, `privacy impact`, `performance budget` en `evidence`.

**Eén bron van waarheid:** architectuur via ADR's; models via versioned assets manifest; medische termen via canonical anatomy catalog; vertalingen via eigen gestructureerde keys; user experience via een gedeelde componentbibliotheek.

**Parallel werken zonder botsingen:**
- Rendering bouwt alleen tegen een **gestandaardiseerde structuuradapter**; kan tijdelijke dummygeometrie gebruiken.
- Anatomie levert catalogus, anatomische relaties, bronnen en toetsing; raakt de renderer niet aan.
- UX ontwikkelt een toegankelijke structuurboom en design system met mock data.
- Content schrijft teksten gekoppeld aan stabiele ID's; wijzigt geen mesh-namen of 3D-code.
- Asset-engineer legt per model licentie, schema, schaal, checksums, LOD en mapping vast.
- Simulation engineer ontwikkelt modules uitsluitend tegen het gedeelde SDK-contract.
- Privacy en QA reviewen vanaf het eerste ontwerp, niet pas voor release.

**Vaste afstemming:**
1. Elk werk start met een kort interfacevoorstel als meerdere modules geraakt worden.
2. Bij conflicts is de architect eindverantwoordelijk voor de technische interface; Product Lead voor de productprioriteit; anatomie-reviewer voor inhoudelijke medische correctheid; licentiebeheerder voor hergebruikrechten.
3. Breaking changes krijgen een ADR en migratieplan; geen stilzwijgende wijziging van canonical IDs.
4. Pull request moet minimaal een expert uit aangrenzend domein laten reviewen, plus QA voor risicovolle wijzigingen.
5. Een module is pas geïntegreerd als functionele tests, asset-controle, i18n, keyboard/fallback en performancecontrole zijn afgerond.

## 3. RACI-besluitmatrix

R=uitvoerend, A=eindverantwoordelijk, C=raadplegen, I=informeren.

| Besluit | R | A | C | I |
|---|---|---|---|---|
| productfuncties prioriteren | Product Lead | Product Lead | UX, architect | alle rollen |
| scene-/plugincontract aanpassen | architect, 3D | architect | sim, QA, frontend | alle rollen |
| GLB-model opnemen | assets | licentie lead | 3D, anatomie, QA | product |
| anatomische bewering publiceren | content | anatomist | biomechanica, QA | product |
| persoonsgegevens-/progressieontwerp | backend, privacy | privacy lead | architect, product | QA |
| release vrijgeven | DevOps, QA | product lead | architect, security, license | alle rollen |

**Overrule-regel:** veiligheid, privacy, rechten en materiële anatomische onjuistheid zijn blokkerende bezwaren. Productprioriteit mag die niet overrulen.

## 4. Definition of Ready

Ticket is klaar voor implementatie als: user case en grens zijn duidelijk; owner en reviewer zijn aangewezen; dependencies bekend; inputs/outputs met voorbeeld; geen onbevestigde licentieaannames; acceptatiecriteria meetbaar; teststrategie beschreven; geen strijd met projectconstraints.

## 5. Definition of Done

- Code & content in Git met review; lockfile bijgewerkt.
- Tests en typecheck geslaagd; foutpaden en mobiel gebruik gecontroleerd.
- Geen buitenproportionele groei van download, memory of draw calls zonder akkoord.
- NL/EN aanwezig; keyboard en toegankelijk tekstueel alternatief.
- Assets voorzien van licentie, bron, attributie en checksum.
- Wetenschappelijke claims en animaties beoordeeld door domeinexpert.
- Geen medische of symptoominformatie verwerkt of geregistreerd.
- Documentatie en ADR indien relevant aangepast.

## 6. Eerste gezamenlijke integratietest

**Scope:** complete keten `click op schouderspier → canonical ID → geselecteerde mesh → NL/EN content → modewissel → toegankelijk alternatief → privacy- en performancecontrole`.

Verwachte bewijzen: korte schermopname; testlog; gemeten laadtijd/bestandsgrootte; asset-licentiekaart; inhoudelijke review; URL-dieplinktest; keyboard- en touchtest. Geen extra functionaliteit vóór deze keten stabiel is.

## 7. Besluit- en conflictregels voor AI-ondersteunde werkstromen

- Elke specialist geeft expliciet onderscheid tussen **geverifieerde feiten, technische aannames, voorstellen en open vragen**.
- AI-code wordt altijd nagezien door een verantwoordelijke reviewer; gegenereerde anatomische claims niet blind publiceren.
- Geen autonome samenvoeging op `main`, geen directe deploy naar productie, geen inventaris van modellen zonder licentiecontrole.
- Adviezen van verschillende specialisten worden beslecht via één integratie-ADR, niet door de laatste schrijver.
