#!/usr/bin/env python3
"""Offline bounded ZIP/OBJ intake. Geometry syntax only: no anatomical approval.

Usage: python3 model-audit/bodyparts3d-obj-audit.py archive.zip manifest.json report.json
Exit 0 iff all requested unique ELEMENT files and all concepts pass; otherwise 1.
No archive extraction, network access, material loading or geometry modification.
"""

import argparse
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import stat
import sys
import zipfile
import zlib


MAX_ENTRY_BYTES = 128 * 1024 * 1024
MAX_LINE_BYTES = 1024 * 1024
MAX_ENTRIES = 100_000
MAX_MANIFEST_BYTES = 2 * 1024 * 1024
ELEMENT = re.compile(r"FJ[1-9][0-9]*M?\Z", re.ASCII)
INDEX = re.compile(r"[+-]?[0-9]{1,18}\Z", re.ASCII)


def load_manifest(path):
    with path.open("rb") as stream:
        raw = stream.read(MAX_MANIFEST_BYTES + 1)
    if len(raw) > MAX_MANIFEST_BYTES:
        raise ValueError("Manifest exceeds size limit")
    manifest = json.loads(raw)
    if manifest.get("schemaVersion") != 1 or not isinstance(manifest.get("candidates"), list) or not manifest["candidates"]:
        raise ValueError("Invalid candidate manifest")
    wanted, concepts, fmas, representations = set(), [], set(), set()
    for row in manifest["candidates"]:
        fma, rep, label, ids = (row.get(k) for k in ("fma", "representation", "sourceLabel", "elementFileIds"))
        if not isinstance(fma, str) or not re.fullmatch(r"FMA[1-9][0-9]*", fma) or fma in fmas:
            raise ValueError("Invalid or duplicate FMA concept")
        if not isinstance(rep, str) or not re.fullmatch(r"BP[1-9][0-9]*", rep) or rep in representations:
            raise ValueError("Invalid or duplicate representation")
        if not isinstance(label, str) or not label.strip() or not isinstance(ids, list) or not ids:
            raise ValueError(f"Missing source label or ELEMENT IDs for {fma}")
        if any(not isinstance(x, str) or not ELEMENT.fullmatch(x) for x in ids) or len(set(ids)) != len(ids):
            raise ValueError(f"Invalid or duplicate ELEMENT IDs for {fma}")
        fmas.add(fma)
        representations.add(rep)
        wanted.update(ids)
        concepts.append({"fma": fma, "representation": rep, "sourceLabel": label, "elementFileIds": ids})
    return wanted, concepts, hashlib.sha256(raw).hexdigest()


def hash_stream(stream):
    digest, size = hashlib.sha256(), 0
    while chunk := stream.read(1024 * 1024):
        digest.update(chunk)
        size += len(chunk)
    return {"sha256": digest.hexdigest(), "bytes": size}


def inspect_archive(archive, wanted):
    """Validate every path/metadata entry, and resolve only exact requested basenames."""
    entries = archive.infolist()
    if len(entries) > MAX_ENTRIES:
        raise ValueError("Archive entry count exceeds safety limit")
    names, wanted_names = set(), {f"{element.casefold()}.obj": element for element in wanted}
    matches = {element: [] for element in wanted}
    for info in entries:
        name = info.orig_filename
        stripped = name[:-1] if name.endswith("/") else name
        parts = stripped.split("/")
        if (not stripped or any(p in ("", ".", "..") for p in parts) or
                any(ord(c) < 32 or ord(c) == 127 for c in name) or "\\" in name or ":" in name):
            raise ValueError(f"Unsafe archive entry path: {name!r}")
        normalized = stripped.casefold()
        if normalized in names:
            raise ValueError(f"Duplicate archive entry: {name!r}")
        names.add(normalized)
        mode = stat.S_IFMT(info.external_attr >> 16)
        if mode not in (0, stat.S_IFREG, stat.S_IFDIR) or (mode == stat.S_IFDIR and not info.is_dir()):
            raise ValueError(f"Special file or link in archive: {name!r}")
        if info.is_dir():
            continue
        if info.file_size < 0 or info.file_size > MAX_ENTRY_BYTES:
            raise ValueError(f"Archive entry exceeds uncompressed size limit: {name!r}")
        if info.flag_bits & 1 or info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
            raise ValueError(f"Encrypted or unsupported-compression entry: {name!r}")
        element = wanted_names.get(parts[-1].casefold())
        if element is not None:
            matches[element].append(info)
    return matches


def parse_obj(raw):
    counts = {"v": 0, "vt": 0, "vn": 0}
    max_positive = {kind: 0 for kind in counts}
    mins, maxs = [math.inf] * 3, [-math.inf] * 3
    face_count, triangles = 0, 0

    def check_index(token, kind):
        if not INDEX.fullmatch(token):
            raise ValueError(f"Invalid {kind} face index: {token!r}")
        index = int(token)
        if not index or (index < 0 and -index > counts[kind]):
            raise ValueError(f"Out-of-bounds or zero {kind} face index: {token}")
        if index > 0:
            max_positive[kind] = max(max_positive[kind], index)

    stream = io.BytesIO(raw)
    line_number = 0
    while line := stream.readline(MAX_LINE_BYTES + 1):
        line_number += 1
        if len(line) > MAX_LINE_BYTES:
            raise ValueError(f"Line {line_number} exceeds size limit")
        try:
            fields = line.decode("utf-8-sig" if line_number == 1 else "utf-8").split("#", 1)[0].split()
            if not fields:
                continue
            command, *values = fields
            if command in counts:
                allowed = {"v": (3, 4, 6, 7), "vt": (1, 2, 3), "vn": (3,)}[command]
                if len(values) not in allowed:
                    raise ValueError(f"Invalid {command} coordinate count")
                coords = [float(value) for value in values]
                if not all(math.isfinite(coordinate) for coordinate in coords):
                    raise ValueError(f"Non-finite {command} coordinates")
                counts[command] += 1
                if command == "v":
                    mins = [min(old, new) for old, new in zip(mins, coords[:3])]
                    maxs = [max(old, new) for old, new in zip(maxs, coords[:3])]
            elif command == "f":
                if len(values) < 3:
                    raise ValueError("Face has fewer than three vertices")
                for value in values:
                    parts = value.split("/")
                    if not 1 <= len(parts) <= 3 or not parts[-1]:
                        raise ValueError(f"Invalid face tuple: {value!r}")
                    check_index(parts[0], "v")
                    if len(parts) >= 2 and parts[1]:
                        check_index(parts[1], "vt")
                    if len(parts) == 3:
                        check_index(parts[2], "vn")
                face_count += 1
                triangles += len(values) - 2
            elif command not in ("o", "g", "s", "mtllib", "usemtl"):
                raise ValueError(f"Unsupported OBJ directive: {command!r}")
        except (ValueError, UnicodeError) as error:
            raise ValueError(f"OBJ line {line_number}: {error}") from error
    if not counts["v"] or not face_count:
        raise ValueError("Missing vertices or polygon faces")
    if any(max_positive[kind] > counts[kind] for kind in counts):
        raise ValueError("Positive face index exceeds final coordinate count")
    return {"vertexCount": counts["v"], "textureCoordinateCount": counts["vt"], "normalCount": counts["vn"],
            "faceCount": face_count, "triangleCount": triangles, "bounds": {"min": mins, "max": maxs}}


def audit_file(archive, element, matches):
    row = {"elementFileId": element}
    if len(matches) != 1:
        return {**row, "status": "MISSING" if not matches else "AMBIGUOUS", "matches": [match.filename for match in matches]}
    info = matches[0]
    row["memberPath"] = info.filename
    try:
        with archive.open(info) as stream:
            raw = stream.read(MAX_ENTRY_BYTES + 1)
        if len(raw) != info.file_size or len(raw) > MAX_ENTRY_BYTES:
            raise ValueError("Actual OBJ byte count inconsistent with safe declared count")
        row.update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
        row.update(parse_obj(raw))
        return {**row, "status": "PASSED"}
    except (ValueError, OSError, RuntimeError, zipfile.BadZipFile, EOFError, NotImplementedError, zlib.error) as error:
        return {**row, "status": "INVALID", "error": str(error)[:1000]}


def audit(archive_path, manifest_path):
    report = {"schemaVersion": 1, "status": "GEOMETRY_AUDIT_FAILED", "clinicallyVerified": False,
              "scope": "Offline OBJ/ZIP intake syntax and index bounds only; no clinical, anatomical, license, unit or release verification. Bounds are raw XYZ; triangle count is polygon fan-equivalent.",
              "archive": {}, "manifestSha256": None, "files": [], "conceptMappings": [], "errors": [], "summary": {}}
    wanted, concepts = set(), []
    try:
        wanted, concepts, report["manifestSha256"] = load_manifest(manifest_path)
        with archive_path.open("rb") as stream:
            report["archive"] = {"name": archive_path.name, **hash_stream(stream)}
            stream.seek(0)
            with zipfile.ZipFile(stream) as archive:
                matches = inspect_archive(archive, wanted)
                report["files"] = [audit_file(archive, element, matches[element]) for element in sorted(wanted)]
    except (ValueError, TypeError, AttributeError, OSError, RuntimeError, zipfile.BadZipFile, EOFError, NotImplementedError, zlib.error) as error:
        report["errors"].append(str(error)[:1000])
        report["files"] = [{"elementFileId": element, "status": "NOT_AUDITED"} for element in sorted(wanted)]
    by_id = {f["elementFileId"]: f["status"] for f in report["files"]}
    for concept in concepts:
        report["conceptMappings"].append({**concept, "status": "PASSED" if all(by_id.get(element) == "PASSED" for element in concept["elementFileIds"]) else "FAILED"})
    summary = {"uniqueElementFiles": len(wanted), "conceptMappings": len(concepts),
               "elementReferences": sum(len(row["elementFileIds"]) for row in concepts),
               "passedFiles": sum(row["status"] == "PASSED" for row in report["files"]),
               "passedConcepts": sum(row["status"] == "PASSED" for row in report["conceptMappings"])}
    report["summary"] = summary
    if not report["errors"] and wanted and summary["passedFiles"] == len(wanted) and summary["passedConcepts"] == len(concepts):
        report["status"] = "GEOMETRY_AUDIT_PASSED"
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    for source in (args.archive, args.manifest):
        if source.resolve() == args.report.resolve() or (source.exists() and args.report.exists() and os.path.samefile(source, args.report)):
            parser.error("Report cannot overwrite an input file")
    report = audit(args.archive, args.manifest)
    try:
        args.report.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    except OSError as error:
        print(f"Cannot write report: {error}", file=sys.stderr)
        return 1
    print(f"{report['status']}: {report['summary']['passedFiles']}/{report['summary']['uniqueElementFiles']} ELEMENT files", file=sys.stderr)
    return 0 if report["status"] == "GEOMETRY_AUDIT_PASSED" else 1


if __name__ == "__main__":
    sys.exit(main())
