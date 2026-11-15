#!/usr/bin/env python3
"""Bounded, offline export of the pinned BodyParts3D candidate set, not registration.

Usage: python3 model-audit/bodyparts3d-export.py archive.zip manifest.json audit.json out.glb out.json
No extraction, network, materials, transforms, clinical or release approval. Refuses to overwrite.
"""

from array import array
import hashlib
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import shutil
import struct
import sys
import tempfile
import zipfile
import zlib

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("bp3d_audit", Path(__file__).with_name("bodyparts3d-obj-audit.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

MAX_GLB_BYTES = 256 * 1024 * 1024
MAX_JSON_BYTES = 8 * 1024 * 1024
MAX_POLYGON_VERTICES = 64
REGISTRATION = "UNREGISTERED_SOURCE_COORDINATES"
SCOPE = ("Standalone technical candidate; raw source XYZ converted only to glTF float32; "
         "source units/axis conventions unverified, no transform or registration/overlay; "
         "surface positions and winding only, no material, texture or normal preservation; "
         "no clinical, anatomical, license or release approval.")


def bounded_json(path):
    with path.open("rb") as stream:
        raw = stream.read(MAX_JSON_BYTES + 1)
    if len(raw) > MAX_JSON_BYTES:
        raise ValueError("JSON input exceeds size limit")
    return json.loads(raw)


def float32(value):
    if not math.isfinite(value):
        raise ValueError("Non-finite position")
    result = struct.unpack("<f", struct.pack("<f", value))[0]
    if not math.isfinite(result) or (value != 0 and result == 0):
        raise ValueError("Source coordinate not representable as glTF FLOAT")
    return result


def subtract(a, b):
    return tuple(x - y for x, y in zip(a, b))


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def triangulate(indices, positions):
    """Preserve existing triangle winding. Only fan-triangulate strict convex planar polygons.

    Strict same-side test for every non-edge vertex also rejects self-intersecting polygons.
    Reject rather than guess if geometry is nonplanar, concave or numerically ambiguous.
    """
    if len(indices) == 3:
        return indices  # Existing triangles untouched, including any source degeneracy.
    if len(set(indices)) != len(indices):
        raise ValueError("Repeated polygon vertex")
    points = [tuple(positions[i*3:i*3+3]) for i in indices]
    offsets = [subtract(point, points[0]) for point in points]
    scale = max(abs(x) for point in offsets for x in point)
    if scale == 0:
        raise ValueError("Degenerate polygon")
    local = [tuple(x/scale for x in point) for point in offsets]
    normal = cross(local[1], local[2])
    magnitude = math.sqrt(dot(normal, normal))
    if magnitude <= 1e-9:
        raise ValueError("Degenerate or numerically ambiguous polygon")
    unit = tuple(x/magnitude for x in normal)
    if any(abs(dot(unit, point)) > 1e-7 for point in local):
        raise ValueError("Nonplanar polygon cannot be triangulated safely")
    for i, start in enumerate(local):
        end_idx = (i+1) % len(local)
        edge = subtract(local[end_idx], start)
        for j, point in enumerate(local):
            if j != i and j != end_idx and dot(unit, cross(edge, subtract(point, start))) <= 1e-9:
                raise ValueError("Concave, self-intersecting or ambiguous polygon cannot be triangulated safely")
    return [i for n in range(1, len(indices)-1) for i in (indices[0], indices[n], indices[n+1])]


def geometry(raw, audited, remaining):
    measured = audit.parse_obj(raw)
    if any(measured.get(key) != audited.get(key) for key in measured):
        raise ValueError("Audit geometry metadata does not match source bytes")
    if measured["vertexCount"]*12 + measured["triangleCount"]*12 > remaining:
        raise ValueError("GLB output exceeds bounded size limit")
    positions, indices = array("f"), array("I")
    if positions.itemsize != 4 or indices.itemsize != 4:
        raise ValueError("Unsupported host binary component size")
    mins, maxs = [math.inf]*3, [-math.inf]*3
    # First pass collects position data so forward positive OBJ references can be resolved.
    stream = io.BytesIO(raw)
    while line := stream.readline(audit.MAX_LINE_BYTES + 1):
        fields = line.decode("utf-8-sig").split("#", 1)[0].split()
        if fields and fields[0] == "v":
            values = fields[1:]
            # Only Cartesian position XYZ is exported. A non-default homogeneous weight
            # would require interpreting projective coords; reject instead of guessing.
            if len(values) == 4 and float(values[3]) != 1.0:
                raise ValueError("Non-default homogeneous OBJ vertex weight unsupported")
            point = [float32(float(x)) for x in values[:3]]
            positions.extend(point)
            mins = [min(a, b) for a, b in zip(mins, point)]
            maxs = [max(a, b) for a, b in zip(maxs, point)]
    total_vertices = len(positions)//3
    stream.seek(0)
    seen_vertices = 0
    while line := stream.readline(audit.MAX_LINE_BYTES + 1):
        fields = line.decode("utf-8-sig").split("#", 1)[0].split()
        if not fields:
            continue
        if fields[0] == "v":
            seen_vertices += 1
        elif fields[0] == "f":
            if len(fields)-1 > MAX_POLYGON_VERTICES:
                raise ValueError("Polygon exceeds triangulation complexity limit")
            polygon = []
            for token in fields[1:]:
                original = int(token.split("/", 1)[0])
                index = original-1 if original > 0 else seen_vertices+original
                if not 0 <= index < total_vertices:
                    raise ValueError("Invalid resolved vertex index")
                polygon.append(index)
            indices.extend(triangulate(polygon, positions))
    if len(indices) != measured["triangleCount"]*3 or total_vertices != measured["vertexCount"]:
        raise ValueError("Exported geometry counts differ from audit")
    return positions, indices, {"min": mins, "max": maxs}


def make_export(archive_path, manifest_path, audit_path, out_path, stage):
    wanted, concepts, manifest_hash = audit.load_manifest(manifest_path)
    pinned = Path(__file__).with_name("bodyparts3d-intake-candidates.json")
    pinned_ids, pinned_concepts, _ = audit.load_manifest(pinned)
    manifest, reference = bounded_json(manifest_path), bounded_json(pinned)
    if len(wanted) != 23 or len(concepts) != 21 or wanted != pinned_ids or concepts != pinned_concepts or manifest.get("source") != reference.get("source"):
        raise ValueError("Manifest differs from pinned exact BodyParts3D candidate inventory")

    evidence = bounded_json(audit_path)
    expected_concepts = [{**concept, "status": "PASSED"} for concept in concepts]
    expected_summary = {"uniqueElementFiles": 23, "conceptMappings": 21, "elementReferences": 23, "passedFiles": 23, "passedConcepts": 21}
    if (evidence.get("schemaVersion") != 1 or evidence.get("status") != "GEOMETRY_AUDIT_PASSED" or
            evidence.get("errors") != [] or evidence.get("clinicallyVerified") is not False or
            evidence.get("manifestSha256") != manifest_hash or evidence.get("conceptMappings") != expected_concepts or
            evidence.get("summary") != expected_summary):
        raise ValueError("Missing, stale or invalid passing geometry audit")
    evidence_rows = evidence.get("files", [])
    lookup = {row.get("elementFileId"): row for row in evidence_rows}
    if len(evidence_rows) != 23 or set(lookup) != wanted or any(row.get("status") != "PASSED" for row in evidence_rows):
        raise ValueError("Audit must contain exactly the 23 passing Element IDs")

    doc = {"asset": {"version": "2.0", "generator": "3D Universe offline BodyParts3D candidate exporter",
                     "copyright": "BodyParts3D, The Database Center for Life Science (DBCLS); see source metadata"},
           "scene": 0, "scenes": [{"nodes": []}], "nodes": [], "meshes": [], "accessors": [], "bufferViews": [],
           "buffers": [{"byteLength": 0}]}
    bounds = {"min": [math.inf]*3, "max": [-math.inf]*3}
    files = []
    with tempfile.TemporaryFile() as binary, archive_path.open("rb") as source:
        archive_info = {"name": archive_path.name, **audit.hash_stream(source)}
        if any(evidence.get("archive", {}).get(key) != value for key, value in archive_info.items()):
            raise ValueError("Archive hash or byte length does not match audit")
        source.seek(0)
        with zipfile.ZipFile(source) as archive:
            matches = audit.inspect_archive(archive, wanted)
            for element in sorted(wanted):
                if len(matches[element]) != 1:
                    raise ValueError(f"Missing or ambiguous exact Element ID: {element}")
                info = matches[element][0]
                row = lookup[element]
                if info.filename != row.get("memberPath"):
                    raise ValueError(f"Archive member path does not match audit: {element}")
                with archive.open(info) as stream:
                    raw = stream.read(audit.MAX_ENTRY_BYTES + 1)
                sha = hashlib.sha256(raw).hexdigest()
                if len(raw) != info.file_size or len(raw) > audit.MAX_ENTRY_BYTES or row.get("bytes") != len(raw) or row.get("sha256") != sha:
                    raise ValueError(f"Source OBJ byte/hash mismatch: {element}")
                positions, indices, mesh_bounds = geometry(raw, row, MAX_GLB_BYTES-binary.tell())
                mins, maxs = mesh_bounds["min"], mesh_bounds["max"]
                bounds["min"] = [min(a,b) for a,b in zip(bounds["min"], mins)]
                bounds["max"] = [max(a,b) for a,b in zip(bounds["max"], maxs)]
                primitive = {"attributes": {}, "mode": 4}
                for values, component, gl_target, length, kind, name in (
                    (positions, 5126, 34962, len(positions)//3, "VEC3", "POSITION"),
                    (indices, 5125, 34963, len(indices), "SCALAR", "indices"),
                ):
                    offset = binary.tell()
                    if sys.byteorder != "little": values.byteswap()
                    values.tofile(binary)
                    view_index = len(doc["bufferViews"])
                    doc["bufferViews"].append({"buffer": 0, "byteOffset": offset, "byteLength": binary.tell()-offset, "target": gl_target})
                    accessor = {"bufferView": view_index, "componentType": component, "count": length, "type": kind}
                    if name == "POSITION": accessor.update(min=mins, max=maxs)
                    accessor_index = len(doc["accessors"])
                    doc["accessors"].append(accessor)
                    if name == "POSITION": primitive["attributes"][name] = accessor_index
                    else: primitive[name] = accessor_index
                number = len(doc["nodes"])
                doc["nodes"].append({"name": element, "mesh": number})
                doc["meshes"].append({"name": element, "primitives": [primitive]})
                doc["scenes"][0]["nodes"].append(number)
                files.append({"elementFileId": element, "nodeIndex": number, "memberPath": info.filename,
                              "sha256": sha, "bytes": len(raw), "sourceBounds": row["bounds"], "bounds": mesh_bounds,
                              "vertexCount": len(positions)//3, "triangleCount": len(indices)//3})
        # An unexpected archive name is conservatively marked fixture-only. Even
        # the expected filename is NOT proof of official-source authenticity.
        fixture_only = archive_path.name != Path(manifest["source"]["modelArchiveUrl"]).name
        metadata = {"schemaVersion": 1, "status": "GEOMETRY_EXPORT_PASSED", "source": manifest["source"],
                    "archive": archive_info, "manifestSha256": manifest_hash, "clinicallyVerified": False,
                    "registration": REGISTRATION, "fixtureOnly": fixture_only, "scope": SCOPE, "files": files,
                    "conceptMappings": expected_concepts, "bounds": bounds}
        doc["extras"] = metadata
        binary_length = binary.tell()
        doc["buffers"][0]["byteLength"] = binary_length
        encoded = json.dumps(doc, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
        encoded += b" "*((-len(encoded))%4)
        total_bytes = 12+8+len(encoded)+8+binary_length
        if total_bytes > MAX_GLB_BYTES:
            raise ValueError("GLB output exceeds bounded size limit (including metadata)")
        stage.write(struct.pack("<4sII", b"glTF", 2, total_bytes))
        stage.write(struct.pack("<I4s", len(encoded), b"JSON"))
        stage.write(encoded)
        stage.write(struct.pack("<I4s", binary_length, b"BIN\x00"))
        binary.seek(0)
        shutil.copyfileobj(binary, stage, 1024*1024)
        stage.flush()
        stage.seek(0)
        glb_info = audit.hash_stream(stage)
        return {**metadata, "glb": {"name": out_path.name, **glb_info}}


def write_report(path, report):
    # No overwrites or partial sidecar writes.
    with tempfile.NamedTemporaryFile(dir=path.parent) as stage:
        stage.write((json.dumps(report, indent=2, allow_nan=False) + "\n").encode("utf-8"))
        stage.flush()
        os.link(stage.name, path)


def main(argv):
    if len(argv) != 5:
        print(__doc__, file=sys.stderr)
        return 2
    archive, manifest, report_in, glb, report_out = map(Path, argv)
    paths = (archive, manifest, report_in, glb, report_out)
    if len(set(path.resolve() for path in paths)) != len(paths) or glb.exists() or report_out.exists():
        print("Input/output alias or existing output; refused to overwrite.", file=sys.stderr)
        return 1
    linked = False
    try:
        with tempfile.NamedTemporaryFile(dir=glb.parent) as stage:
            metadata = make_export(archive, manifest, report_in, glb, stage)
            os.link(stage.name, glb)
            linked = True
            write_report(report_out, metadata)
        print(f"GEOMETRY_EXPORT_PASSED: {len(metadata['files'])} files", file=sys.stderr)
        return 0
    except (ValueError, TypeError, KeyError, AttributeError, OSError, OverflowError, zipfile.BadZipFile, EOFError, RuntimeError, zlib.error, struct.error) as error:
        if linked:
            glb.unlink()  # Only the output this invocation just created.
        failure = {"schemaVersion": 1, "status": "GEOMETRY_EXPORT_FAILED", "clinicallyVerified": False,
                   "registration": REGISTRATION, "scope": SCOPE, "error": str(error)[:1000]}
        try:
            write_report(report_out, failure)
        except OSError as report_error:
            print(f"Cannot write failure report: {report_error}", file=sys.stderr)
        print(f"GEOMETRY_EXPORT_FAILED: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
