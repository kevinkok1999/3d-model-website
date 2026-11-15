# 04 — Verificatiebronnen, licenties en hergebruik

**Gecontroleerd:** 15 november 2026 via publieke project-/leveranciersdocumentatie. Licentiereview per specifiek bestand blijft verplicht vóór opname of distributie.

## A. Astra AI — referentie, niet leverancier van onze broncode

- Catalogus: https://app.astra-ai.co/en-US/lab
- Algemene voorwaarden: https://app.astra-ai.co/terms-conditions
- Relevantie: Human Body Atlas, interactive 'spread apart', andere vak-simulaties.
- Voorwaarden §17 beschermen broncode en platformcontent; zonder apart verleende toestemming geen onbevoegde kopieën, reverse engineering of wijzigingen.
- **Projectbesluit:** functionaliteit als abstract inspiratiepunt analyseren, geen assets/code van Astra downloaden, extraheren of hergebruiken. Een formele licentie/integratie alleen na toestemming.
- Een officiële publieke embedding-/API-interface is in deze voorbereidingsronde niet aangetoond. Behandel integratie als onbewezen mogelijkheid.

## B. Open Anatomy 3D — eerste kandidaat

- Repository: https://github.com/MervinR07/open-anatomy-3d
- npm: https://www.npmjs.com/package/open-anatomy-3d
- Documentatie vermeldt twee gecomprimeerde glTF-modellen (~7,6 en 8,1 MB), 147 structuren; modelcode MIT, modellen CC BY 4.0; credits vereist.
- Viewer getest met React 18 / @react-three/fiber 8 / drei 9; versiecompatibiliteit eerst testen.
- Beperkingen: relatief jong project, beperkte community en slechts 147 structuren; wetenschappelijke volledigheid en herkomstketen eigenstandig auditen.
- Toelatingseis: inspecteer `LICENSE`, `LICENSE-MODELS.md`, `ATTRIBUTION.md` en de uiteindelijk gebruikte bestanden; presenteer bronvermelding in de website.

## C. Anatomy Atlas 3D — mogelijke tweede kandidaat

- Repository: https://github.com/Grypa-JJ/anatomy-atlas-3d
- README vermeldt ~2.500 selecteerbare structuren, tien lagen, clipping, explosie-view, Windows/Android-app en een werkend prototype.
- Appcode MIT; brongeometrie uit o.a. Z-Anatomy en BodyParts3D heeft CC BY-SA-verplichtingen (met deels eigen historische herkomstvoorwaarden).
- Grote GLB-assets zitten **niet rechtstreeks allemaal in Git**; de workflow moet worden gereproduceerd en de oorsprong van elke binair gecontroleerd.
- Toelatingseis: licentie-audit inclusief afgeleid werk, bijdrage-/share-alikeverplichtingen, broncredit en commercieel distributiemodel; technisch benchmarken op echte doeltoestellen.

## D. Z-Anatomy — aanvullende optie, niet blind overnemen

- Project/community: https://z-anatomy-community.github.io/
- Terugkerend modellicentiekader: CC BY-SA 4.0; aparte projectcode kan GPLv3 zijn. Let op eventuele onderdelen met afwijkende licenties.
- Vermijd het vermengen van code-, model- en textlicenties in één generieke aanname.

## E. Technische standaarden

- React Three Fiber performance: https://r3f.docs.pmnd.rs/next/advanced/scaling-performance
- glTF Transform: https://gltf-transform.dev/
- Next.js App Router: https://nextjs.org/docs/app
- WCAG 2.2: https://www.w3.org/TR/wcag/
- OWASP ASVS: https://asvs.owasp.org/

## F. Licentieregister per bestand

Verplichte velden: `assetId`, `assetVersion`, `originUrl`, `originalAuthor`, `upstreamCommitOrVersion`, `licenseId`, `licenseTextPath`, `attributionText`, `modifications`, `isDerivative`, `redistributionAllowed`, `commercialUseReviewed`, `reviewer`, `reviewDate`, `sha256`.

**Geen distributie zonder goedgekeurde registerstatus.** Alle credits en licentievoorwaarden moeten voor eindgebruikers makkelijk vindbaar zijn; zonder rechtsgeldige basis geen gebruik van Astra-content. Indien het platform tegen betaling wordt aangeboden, laat de definitieve licentie-/complianceconstructie toetsen.
