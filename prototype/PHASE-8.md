# Fase 8 — aantoonbare bronpunten en uitgebreidere bronviewer

Datum: 16 november 2026. Ontwikkelkandidaat, geen productiepublicatie.

## Twee onafhankelijke ontwikkellijnen

1. **Bronpunt vastleggen** — de centrale atlas en de afzonderlijke HRA-viewer laten een zichtbaar, daadwerkelijk door de raycaster geraakte glTF-driehoek vastleggen. De JSON bevat het exacte bron-ID, SHA-256, originele node/mesh/primitive/triangle-indices, drie oorspronkelijke vertex-indices, drie gedecodeerde lokale POSITION-vectoren, barycentrische gewichten en het afgeleide lokale punt. Gewrichtsankers zijn geen driehoeken. Geen anatomische landmarknaam of koppeling wordt automatisch toegekend. Onbewezen, ambigue, vervormde of gedegenereerde driehoeken leveren geen export op.
2. **BodyParts3D** — de 21 oorspronkelijke en 50 Wave 2-concepten zijn samengebracht in één bevroren broninventaris (71 unieke FMA/BP-concepten, 74 unieke ELEMENT-bestanden), zonder dubbele concepten of bestanden. De bestaande geïsoleerde viewer, lijst, filters, zoeken en bronmetadata gebruiken de volledige set. De normale build bevat geen afgeleid bronmodel; brongeometrie wordt enkel door de afzonderlijke technische intake verworven, geaudit, geconverteerd en tijdelijk lokaal getest.

## Bewijscontrole

De onafhankelijke CLI `model-audit/landmark-source-witness.mjs` leest het originele gepinde GLB opnieuw in, controleert de bestandslengte, Git blob SHA-1 en vastgelegde SHA-256, bepaalt opnieuw het originele POSITION-/indexaccessor en haalt de driehoek op. De standalone verifier `landmark-evidence.mjs` weigert onder meer gewijzigde waarden, onjuiste indices, andere bronidentiteiten, ongeldige barycentrische gewichten, niet-eindige coördinaten en slecht geconditioneerde driehoeken. De getuige wordt nooit afgeleid uit het aangeleverde JSON-record zelf. De bron-scènecoördinaat wordt daarna uit de oorspronkelijke node-matrixketen afgeleid; deze is geen geverifieerde fysieke maat of gemeenschappelijk coördinatenstelsel.

Voor een geëxporteerd punt (één JSON-record):

```sh
node model-audit/landmark-source-witness.mjs evidence.json pinned-source.glb new-witness-report.json
```

Een bewijsrapport geeft uitsluitend technische bronidentiteit en puntconsistentie. De review-/registratieledger blijft voor alle 23 HRA-referenties `SOURCE_LINK_ONLY`, met `mergeAuthorized:false`. Exacte bronbestanden veranderen niet; er wordt niets gespiegeld, verschaald of op basis van boundingboxes automatisch samengevoegd.

## Volgende kwaliteitsgates

- Onafhankelijke inspectie van exacte bronidentiteiten, bronframes, fysieke units en correspondentie vereist; zie [brononderzoek en holdoutplan](PHASE-8-REGISTRATION-RESEARCH.md).
- Een anatomiedeskundige bepaalt vóór het fitten of homologe kenmerken in beide bronnen werkelijk aanwezig en betrouwbaar aanwijsbaar zijn. Twee afzonderlijke, vooraf bevroren niet-coplanaire sets (fit en holdout) met onafhankelijk bewijs zijn noodzakelijk.
- Iedere familie, variant en structurele laag doorloopt hetzelfde acceptatieproces. Een goed resultaat voor één orgaan betekent niet dat andere families beoordeeld zijn.
- Browser QA op de echte bronnen, echte touch-hardware, dekking, performance, inhoud/deskundigenreview en publicatierechten blijven afzonderlijke acceptatiegates. Een synthetisch testmodel is alleen testbewijs voor de software.

## Uitvoeringsbewijs bij deze wijziging

- `npm test`: 155/155 geslaagd, inclusief beide echte gepinde centrale GLB's, bronpuntcontrole, en gecombineerde BodyParts3D-fixture, met negatieve veiligheidsgevallen. `npm run build`: geslaagd.
- De gecombineerde fixture gebruikt 74 synthetische OBJECT-bestanden en bewijst uitsluitend de audit/export-/viewercontracten. Echte Wave 2 OBJ's zijn in fase 7 afzonderlijk source-only geaudit; de gecombineerde export van de echte bron moet nog in de intakeworkflow worden bewezen.
- `landmark-capture-browser.mjs` controleert werkelijke pointerstralen, JSON-download, onafhankelijke brongetuigen, beide varianten, twee gestagede HRA-harten, mobiele layout en expliciete foutpaden. De bestaande HRA-smoke controleert de beschikbaarheid van capture op alle 23 bronnen. Beide browserscripts zijn syntactisch gecontroleerd; lokale uitvoering is geblokkeerd door Chromium-permissies (`socket()/ptrace: Operation not permitted`). Geen browserpass geclaimd. De branch-workflows voeren deze nieuwe browserproeven uit.
