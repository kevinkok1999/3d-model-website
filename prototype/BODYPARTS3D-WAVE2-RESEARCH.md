# BodyParts3D — tweede broninventaris: spieren, botten en geselecteerde zenuwen

**Status: 50 extra bronconcepten, 51 unieke ELEMENT-bestands-ID's; geen OBJ-geometrie gedownload, gemeten of anatomisch gevalideerd.** Dit is een afzonderlijke kandidaat buiten de eerste 21 concepten, geen productie-uitbreiding en geen vervanging van de bestaande bron. Zie `model-audit/bodyparts3d-wave2-candidates.json`.

## 1. Primaire bron en exacte koppeling

De geselecteerde bron is BodyParts3D 4.0 van DBCLS: [officiële downloadpagina](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html), [IS-A Engelse catalogus](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt), [IS-A ELEMENT-tabel](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt) en [officiële IS-A OBJ-archief](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip). [Licentiebron](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html): CC BY 4.0.

Beide headers zijn rechtstreeks gezien in de bron:

| Bestand | Exacte tabgescheiden velden |
|---|---|
| `isa_parts_list_e.txt` | `concept id` · `representation id` · `en` |
| `isa_element_parts.txt` | `concept id` · `name` · `element file id` |

De eerste tabel geeft per geselecteerd FMA-ID het precieze BP-representatie-ID en het Engelse label. De tweede geeft per FMA-ID en naam de ELEMENT-bestands-ID's. BP-ID's zijn dus geen OBJ-bestandsnamen. De 50 geselecteerde FMA-/BP-/labelcombinaties zijn letterlijk uit de officiële catalogusregels gehaald; de 51 ELEMENT-verwijzingen komen uit de officiële mappingtekst, niet uit afgeleide nummerpatronen. Voor de selectie zijn de grenzen van de FMA-rijgroepen gecontroleerd in 48 afzonderlijke complete bronfragmenten of groepen en twee overlappende fragmenten. Het manifest bewaart ook de door de geraadpleegde tekstweergave genummerde catalogusregels (`catalogExcerptLine`; bronheader is regel 0).

De volledige mappingdownload was via één webroute niet beschikbaar (timeout bij een bestand van circa 1,1 MB); gerichte extractie op dezelfde officiële URL gaf de benodigde exacte tabregels, inclusief voorafgaande/volgende FMA-ID's. Er is **geen** volledige lokale bestandsinhoud of SHA-256 vastgesteld. Een volgende bronintake moet de volledige officiële tabellen onafhankelijk downloaden en de complete rijsets exact toetsen. De bronregelnummers helpen bij terugvinden, maar zijn geen bytepin en geen substituut voor die verificatie.

## 2. Geprioriteerde extra concepten

| Regio/systeem | Concepten | Waarop de bronlabels betrekking hebben |
|---|---:|---|
| Rug / spieren | 12 | De drie trapeziusdelen links/rechts, beide serratus posterior-delen links/rechts, rhomboideus major links/rechts |
| Romp / spieren | 4 | Serratus anterior en claviculair deel pectoralis major links/rechts |
| Schouder / spieren | 8 | Drie deltoïdeusdelen en subscapularis links/rechts |
| Nek / spieren | 2 | Sternocleidomastoideus links/rechts |
| Heup/bovenbeen / spieren | 12 | Gluteus maximus, sartorius, semitendinosus en drie vastus-delen, telkens links/rechts |
| Hand / spieren | 4 | Abductor pollicis brevis en opponens pollicis links/rechts |
| Schouder / skelet | 2 | Scapula links/rechts |
| Nek / skelet | 1 | Os hyoideum |
| Romp / skelet | 2 | Eerste rib links/rechts |
| Hoofd / skelet | 1 | Mandibula |
| Hoofd / zenuwen | 2 | N. ethmoidalis anterior links/rechts |
| **Totaal** | **50** | **42 spieren/spierdelen, 6 botconcepten, 2 zenuwconcepten** |

Deze systeem- en regiocategorieën zijn voorgestelde navigatie, geen nieuwe FMA-classificatie. De exacte Engelse bronlabels staan ongewijzigd in het manifest; Nederlandse en functionele uitleg blijft afzonderlijke wetenschappelijke content. Voorbeelden van geverifieerde koppelingen:

| Bronconcept | FMA | BP | Exacte ELEMENT-bestands-ID's |
|---|---|---|---|
| Linker opgaande trapeziusdeel | FMA33583 | BP8225 | FJ1520M |
| Rechter claviculair deltoïdeusdeel | FMA34680 | BP7573 | FJ1468 |
| Rechter sternocleidomastoideus | FMA13408 | BP4909 | FJ1595 |
| Linker sternocleidomastoideus | FMA13409 | BP4910 | FJ1573 |
| Rechter scapula | FMA13395 | BP9101 | FJ3384 |
| Tongbeen | FMA52749 | BP8836 | FJ2772, FJ3201 |
| Rechter n. ethmoidalis anterior | FMA52676 | BP5733 | FJ1333 |
| Linker n. ethmoidalis anterior | FMA52677 | BP5734 | FJ1283 |

**Belangrijk:** het os hyoideum is in de mapping een concept met twee bestandsverwijzingen. Het mag niet worden gereduceerd tot één gekozen bestand, noch mag vooruitlopend op anatomische en geometrische review worden beweerd wat elk bestand voorstelt. Een `M`-suffix is ook geen betrouwbare algemene links/rechts-regel; de bronrij bepaalt de exacte identiteit. De twee SCM-zijden illustreren dat verschillende bron-ID's ook zonder een M-suffix voor kunnen komen.

## 3. Zenuwdekking: werkelijke kleine uitbreiding, geen perifere atlas

De officiële catalogus en ELEMENT-tabel bevatten exacte rijen voor beide voorste ethmoidale zenuwen. Zij bieden een concrete eerste individuele zenuwkandidaat in het hoofd. De geraadpleegde catalogus leverde geen match voor `sciatic nerve`; eerdere intake vond evenmin overtuigende afzonderlijke bronmatches voor de grote gewenste perifere zenuwen. Zoek gericht verder naar aanvullende brondata voor n. ischiadicus, femoralis, medianus, radialis, ulnaris en vagus. Geen verzonnen FJ-ID's, lijnstukken of generic nerve-mesh als uitwijk. Er zijn verdere in de bron aanwezige afzonderlijke oogregio-zenuwlabels (bijvoorbeeld infratrochlear en andere ethmoidale zenuwen), maar die zijn niet geselecteerd voor deze begrensde tweede golf.

## 4. Gate voordat een nieuwe viewer of atlas mag worden gevuld

1. Download in geïsoleerde technische staging uitsluitend de twee officiële tabellen en het exacte IS-A archief. Leg bytegrootte en SHA-256 voor alle drie vast; registreer aparte metadata voor bronrelease 4.0 en `LATEST`-URL.
2. Controleer eerste tabel exact op drie kolommen en per geselecteerde FMA exact één `FMA + BP + English label`. De tweede tabel moet per FMA exact dezelfde naam en de **volledige** ELEMENT-set tonen; reject dubbele rij of extra/verkeerde ELEMENT-ID. Geen fuzzy-name lookup, M-suffix-inferentie of verwisseling van IS-A en PART-OF.
3. Controleer elk van de 51 exacte ELEMENT-bestanden in het archief op een veilige unieke member-path, bestandsidentiteit, hash, geometriebereiken, eindige coördinaten en valide faces/triangle-conversie. Geen volledige lichaamsregistratie, vervorming of synthetische vervanging. De source-only audit meldt ontbrekende nodes, bestandsconflict en mismatches expliciet, ook bij een gedeeltelijk resultaat.
4. Maak na geslaagde technische byte-audit een identiteitsreview per concept (lateralisatie, anatomische bronvariant, naam, afzonderlijke mesh of samengestelde elementen, mogelijke overlap, visuele referentiepunten). Het volwassen mannelijke bronmodel levert geen gelijkwaardige vrouwelijke geometrie. Niet automatisch spiegelen of alsnog een female variant claimen.
5. Alle 50 concepten krijgen dezelfde inhoudelijke vrijgavecriteria: exactheid van de geometrie, Nederlandstalige/Engelstalige benaming, bronnen, scope en waar relevant biomechanische bron, leermodi en toegankelijke bediening. De broninventaris levert geen spieren/peesbeweging of krachtberekening op. Bewegingssimulatie vereist aparte gekalibreerde gewrichtsassen, oorsprong-/aanhechtingspunten, peesroutes, metingen en onafhankelijke review.

**Besluit:** deze 50 nog onbeoordeelde kandidaten vullen een belangrijk broninventarisgat in rug, romp, schouder, nek, bovenbeen, hand, skelet en een klein specifiek zenuwdomein. De uitgebreidere atlas blijft onvolledig: er is geen klinische of anatomische dekking vastgesteld en deze inventaris is geen vrijgavebesluit.
