# HRA lung-male v1.4 — blokkade en afzonderlijke herstelroute

**Momentopname 15 november 2026.** De feitelijk uitgevoerde CI-bronaudit `#43742312231` gaf negen van tien bronmodellen PASS en één BLOCKED: `lung-male` v1.4 heeft nul exacte node-matches voor de bronrij `VH_M_hyoid`. Dit is een gewenste harde stop: brongeometrie en semantische mapping zijn niet volledig koppelbaar. Het is geen bewijs dat het tongbeen ontbreekt uit het volledige HRA-lichaam of dat de negen andere bronnen anatomisch gereviewd zijn.

## Onderzochte primaire bron

De officiële [HuBMAP HRA Git-repository](https://github.com/hubmapconsortium/hra-kg) heeft op het gecontroleerde moment dezelfde `main`-commit `27d6d493cd53761abb10f087767ec4cc74acb051` en ref-organ-tree `fb3b43f21796dc63b93e2bbb88274b300314d3b6` als onze manifestpin. De [lung-male versieboom](https://github.com/hubmapconsortium/hra-kg/tree/27d6d493cd53761abb10f087767ec4cc74acb051/digital-objects/ref-organ/lung-male) bevat v1.0, 1.1, 1.2, 1.3 en 1.4; er is daar **geen nieuwere gecorrigeerde v1.5** aangetroffen.

De officiële [v1.3 crosswalk](https://github.com/hubmapconsortium/hra-kg/blob/27d6d493cd53761abb10f087767ec4cc74acb051/digital-objects/ref-organ/lung-male/v1.3/raw/crosswalk.csv) bevat 71 namen, 59 verschillende ontologie-ID's, geen hyoid-rij. De [v1.4 crosswalk](https://github.com/hubmapconsortium/hra-kg/blob/27d6d493cd53761abb10f087767ec4cc74acb051/digital-objects/ref-organ/lung-male/v1.4/raw/crosswalk.csv) bevat 72 namen en 60 verschillende ontologie-ID's. Een exacte vergelijking van de niet-lege CSV-rijensets gaf geen verwijderde rijen en uitsluitend deze toevoeging:

```csv
VH_M_hyoid,UBERON:0001685,hyoid bone
```

| Versie | CSV-rijen | Hyoid-rij |
|---|---:|---|
| lung-male v1.0 | 102 | Geen |
| lung-male v1.1 | 97 | Geen |
| lung-male v1.2 | 97 | Geen |
| lung-male v1.3 | 71 | Geen |
| lung-male v1.4 | 72 | Aanwezig; CI mist exact node |
| lung-female v1.4 | 70 | Geen |
| larynx-male v1.0 / v1.1 | 11 elk | Geen |

Bron: versioned CSV's in de bovengenoemde officiële Gitboom en [larynx-male v1.1 crosswalk](https://github.com/hubmapconsortium/hra-kg/blob/27d6d493cd53761abb10f087767ec4cc74acb051/digital-objects/ref-organ/larynx-male/v1.1/raw/crosswalk.csv). De v1.3/v1.4 metadata vermelden allebei dat strottenhoofd, luchtpijp en hoofdbronchi in v1.3 als zelfstandige objecten werden afgesplitst. De larynxmetadata zegt dat dit object uit de vorige v1.2-longversie werd afgescheiden. Dat maakt de extra hyoid-rij in de nieuwe longcrosswalk verdacht, maar bewijst niet de oorzaak of gewenste plaats van het object. Er wordt daarom geen alias afgeleid en het tongbeen wordt niet uit andere geometrie geconstrueerd. De herkomst/licentie is per referentieobject CC BY 4.0; zie [v1.3 metadata](https://github.com/hubmapconsortium/hra-kg/blob/27d6d493cd53761abb10f087767ec4cc74acb051/digital-objects/ref-organ/lung-male/v1.3/raw/metadata.yaml) en [v1.4 metadata](https://github.com/hubmapconsortium/hra-kg/blob/27d6d493cd53761abb10f087767ec4cc74acb051/digital-objects/ref-organ/lung-male/v1.4/raw/metadata.yaml).

## Gescheiden bronpinnen

| Bestand | v1.3 (kandidaat) | v1.4 (geblokkeerd) |
|---|---|---|
| GLB bytes volgens Git | 10.941.068 | 10.942.332 |
| GLB Git-blob SHA1 | `dbbfdaf4cc51ea7d75cb0887b8fa003b8da9c00a` | `900ef332cb4b72fdf70c61f4cdb0f73f9e39c241` |
| CSV bytes volgens Git | 5.378 | 5.416 |
| CSV Git-blob SHA1 | `0cb382d5ebcec9b4ae2760bfcca8b0fb1386d9d6` | `228adf6f8cca021c1427c2ea5aa4d993fbfdc26f` |
| DOI | [10.48539/HBM737.FFBT.876](https://doi.org/10.48539/HBM737.FFBT.876) | [10.48539/HBM532.KLZD.394](https://doi.org/10.48539/HBM532.KLZD.394) |

De GLB-blobhashes verschillen. Een v1.3-CSV op een v1.4-GLB is dus geen valide bronpaar. De Git-waarden zijn bronmetadata; dit onderzoek heeft geen GLB-binary gedownload of gerenderd. De aparte [v1.3-kandidaatmanifest](../model-audit/hra-lung-male-v1.3-candidate.json) houdt de versie, bytegroottes, hashes, crosswalk en bronlicentie bijeen en blijft `NOT_DOWNLOADED` totdat de afzonderlijke technische intake daadwerkelijk is uitgevoerd.

## Herstelbesluit

1. **v1.4 blijft geblokkeerd.** Bewaar de oorspronkelijke manifestpin, foutmelding en 72-rijenbron. Geen uitzonderingsregel, fuzzy match, node-naam wijzigen, crosswalkrij verwijderen, oudere tabel mengen of synthetische hyoid toevoegen.
2. **Upstream verduidelijken.** Voorstel voor een nog niet verzonden bronissue bij het officiële HRA-team: “For Lung Male v1.4 (DOI …532.KLZD.394), crosswalk row `VH_M_hyoid` maps to UBERON:0001685 but the matching pinned GLB has zero exact nodes. This row is the sole set addition since v1.3; both GLB files differ. Is this a misplaced crosswalk entry, a missing mesh, or another intended mapping? What is the authoritative corrected version and the correct hyoid reference object?” Geef versie, commit, Git-blobhashes en reproduceerbare fout. Wacht op een officiële broncorrectie of aantoonbare toestemming en review voor afgeleide mapping. Geen extern bericht is in dit onderzoek geplaatst.
3. **Onafhankelijke v1.3-spike:** haal uitsluitend de exact vastgelegde v1.3 GLB én bijbehorende CSV op in een aparte intake-directory. Controleer bytes en echte Git-blobhash (en leg SHA-256 vast), exact dezelfde GLB-opties en crosswalkschema, 71 bronrijen, 59 unieke ontologie-ID's, individuele exacte node-matches, geometry bounds/mesh-onderscheid. Elk defect blijft BLOCKED. Geen bestaande bronbestanden overschrijven of v1.4-audit vervangen.
4. **Eventueel herstelbeleid:** indien v1.3 strikt slaagt, is dat bewijs voor dat *oudere* bronpaar binnen de afgebakende longscope, niet voor 72/72 in v1.4. Onafhankelijke anatomie-/rechtenreview en expliciet eigenaarsbesluit zijn vereist vóór adoptie; v1.4-defect en hyoid-gap blijven afzonderlijk open. Hyoid is ook onderdeel van de doelcatalogus van het skeletteams, dus controleer een echte afzonderlijke bron, bijvoorbeeld de directe BodyParts3D-inventaris, met eigen provenance.
5. **Na officiële correctie** registreer de nieuwe bronversie, behoud oude foutstatus als historie, herhaal de strikte volledige broncontrole en cross-region mapping. Pas na inhoudsreview, variant-specifieke afstemming, visuele/interactionele tests en quality-contract kan de uitbreiding productierelevant worden.

Het signaal is niet dat één node verwaarloosbaar is, maar dat het laagste bewijsniveau de vrijgave blijft bepalen. Geen volledig atlasresultaat door negen bronpasses tegenover één bekende blokkade.
