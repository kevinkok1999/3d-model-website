# BodyParts3D – gecontroleerde bronintake

Deze stap onderzoekt de 23 exacte elementbestanden voor 21 geselecteerde anatomische concepten. Ze mag nooit op zichzelf modellen vrijgeven. De productieviewer wordt niet aangepast.

1. `.github/workflows/bodyparts3d-intake.yml` haalt de officiële elementtabel en het officiële versie 4.0-archief op in een tijdelijke CI-omgeving.
2. De mappingcontrole vergelijkt iedere FMA-identiteit met de verwachte element-ID's uit `model-audit/bodyparts3d-intake-candidates.json`.
3. `model-audit/bodyparts3d-obj-audit.py` controleert uitsluitend de geselecteerde OBJ-bestanden, met begrenzing van pakketgrootte, geldige geometrie en herleidbare hashes.
4. Alleen auditmetadata worden als tijdelijke CI-artifact bewaard; geen bronarchief of meshes worden gedistribueerd.

Offline herhaling met rechtmatig verkregen bronarchief:

```sh
python3 model-audit/bodyparts3d-obj-audit.py source.zip model-audit/bodyparts3d-intake-candidates.json geometry.json
```

Een ontbrekende bron, mismatch of ongeldige geometrie blokkeert de intake. Een geslaagde inspectie is uitsluitend technisch bewijs. Anatomische review, coördinatenregistratie, mesh-optimalisatie, licentievermelding en gelijkwaardige vrouwelijke referentiegeometrie blijven afzonderlijke vrijgavevoorwaarden.
