#!/usr/bin/env python3
"""Generate a tiny synthetic QA-only archive with the exact candidate ELEMENT IDs.

Usage: python3 prototype/test/bodyparts3d-fixture.py /tmp/SYNTHETIC-QA-ONLY.zip

Feed it through the ordinary geometry auditor and exporter. Each OBJ is an
arbitrary tetrahedron, not BodyParts3D geometry, and MUST NOT be published.
Keep the archive, exported GLB, and manifest in disposable runner storage;
only expose the resulting assets in a local test build (never a deployment).
"""
import argparse
import json
from pathlib import Path
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="new synthetic QA-only ZIP path")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    manifest = json.loads((root / "model-audit/bodyparts3d-intake-candidates.json").read_text(encoding="utf-8"))
    ids = sorted({eid for row in manifest["candidates"] for eid in row["elementFileIds"]})
    if len(manifest["candidates"]) != 21 or len(ids) != 23:
        raise ValueError("Fixture scope changed; review the QA contract before regenerating")
    with zipfile.ZipFile(args.output, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        for i, eid in enumerate(ids):
            x, y, z = (i % 5) * 4, (i // 5) * 4, (i % 3) * 4
            # Distinct locations, nonzero volume, nondegenerate triangle faces.
            # Their arbitrary arrangement conveys no actual anatomical position.
            obj = (f"# SYNTHETIC QA FIXTURE, NOT ANATOMY: {eid}\n"
                   f"v {x} {y} {z}\nv {x+1} {y} {z}\n"
                   f"v {x} {y+1} {z}\nv {x} {y} {z+1}\n"
                   "f 1 3 2\nf 1 2 4\nf 1 4 3\nf 2 3 4\n")
            entry = zipfile.ZipInfo(f"SYNTHETIC_QA_ONLY/{eid}.obj")
            entry.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(entry, obj)
    print(f"SYNTHETIC_QA_FIXTURE_NOT_ANATOMY: 21 concepts / {len(ids)} arbitrary tetrahedra: {args.output}")


if __name__ == "__main__":
    main()
