import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(readFileSync(new URL('../../model-audit/bodyparts3d-intake-candidates.json', import.meta.url), 'utf8'));
const auditor = fileURLToPath(new URL('../../model-audit/bodyparts3d-obj-audit.py', import.meta.url));
const ids = [...new Set(manifest.candidates.flatMap(row => row.elementFileIds))];
const obj = 'v 0 0 0\nv 1 0 0\nv 1 2 0\nv 0 2 0\nvt 0 0\nvn 0 0 1\nf -4/1/1 -3/1/1 -2/1/1 -1/1/1\n';
const entries = () => ids.map(id => [`archive/${id.toLowerCase()}.OBJ`, obj]);

function runAudit(t, rows, inventory = manifest, { oversized = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'bp3d-audit-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const archive = join(dir, 'fixture.zip'), manifestPath = join(dir, 'manifest.json'), reportPath = join(dir, 'report.json');
  writeFileSync(manifestPath, JSON.stringify(inventory));
  const built = spawnSync('python3', ['-c', `import sys, json, zipfile, warnings, struct
warnings.simplefilter('ignore')
with zipfile.ZipFile(sys.argv[1], 'w', compression=zipfile.ZIP_DEFLATED) as out:
    for name, content in json.load(sys.stdin): out.writestr(name, content)
if sys.argv[2] == 'oversized':
    with open(sys.argv[1], 'r+b') as f:
        contents = bytearray(f.read())
        off = contents.index(b'PK\\x01\\x02')
        struct.pack_into('<I', contents, off + 24, 128 * 1024 * 1024 + 1)
        f.seek(0); f.write(contents)
`, archive, oversized ? 'oversized' : 'normal'], { input: JSON.stringify(rows), encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr);
  const result = spawnSync('python3', [auditor, archive, manifestPath, reportPath], { encoding: 'utf8' });
  assert.ok(!result.error, result.error?.message);
  return { result, report: JSON.parse(readFileSync(reportPath, 'utf8')), archiveHash: createHash('sha256').update(readFileSync(archive)).digest('hex') };
}

test('exact case-insensitive ELEMENT basenames resolve and report unique files separately from concept mappings', t => {
  const { result, report, archiveHash } = runAudit(t, [...entries(), ['archive/not-a-target-FJ3365.obj', 'not obj']]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.status, 'GEOMETRY_AUDIT_PASSED');
  assert.equal(report.archive.sha256, archiveHash);
  assert.equal(report.summary.uniqueElementFiles, 23);
  assert.equal(report.summary.conceptMappings, 21);
  assert.equal(report.summary.passedFiles, 23);
  assert.equal(report.summary.passedConcepts, 21);
  const file = report.files.find(x => x.elementFileId === ids[0]);
  assert.equal(file.sha256, createHash('sha256').update(obj).digest('hex'));
  assert.equal(file.bytes, Buffer.byteLength(obj));
  assert.equal(file.vertexCount, 4);
  assert.equal(file.triangleCount, 2);
  assert.deepEqual(file.bounds, { min: [0, 0, 0], max: [1, 2, 0] });
  assert.equal(report.clinicallyVerified, false);
});

test('unavailable file makes the relevant concept and overall report fail closed', t => {
  const { result, report } = runAudit(t, entries().slice(0, -1));
  assert.notEqual(result.status, 0);
  assert.equal(report.status, 'GEOMETRY_AUDIT_FAILED');
  assert.equal(report.files.find(x => x.elementFileId === ids.at(-1)).status, 'MISSING');
  assert.equal(report.conceptMappings.find(x => x.fma === 'FMA3815').status, 'FAILED');
});

test('ambiguous basenames, exact duplicate entries and traversal are rejected', t => {
  for (const [name, content] of [['duplicate/FJ3365.obj', obj], ['archive/fj3365.OBJ', obj], ['../unsafe.obj', obj], ['C:/unsafe.obj', obj], ['dir\\unsafe.obj', obj]]) {
    const { result, report } = runAudit(t, [...entries(), [name, content]]);
    assert.notEqual(result.status, 0, name);
    assert.equal(report.status, 'GEOMETRY_AUDIT_FAILED', name);
  }
});

test('non-finite coordinates and invalid positive, negative or zero indices fail', t => {
  for (const bad of [obj.replace('v 1 2 0', 'v nan 2 0'), obj.replace('-4/1/1', '5/1/1'), obj.replace('-4/1/1', '-5/1/1'), obj.replace('-4/1/1', '0/1/1'), obj.replace('-4/1/1', '1/2/1'), obj.replace('-4/1/1', '1/1/2'), obj.replace('-4/1/1', '1//'), obj.replace(/^f .*$/m, '')]) {
    const rows = entries(); rows[0][1] = bad;
    const { result, report } = runAudit(t, rows);
    assert.notEqual(result.status, 0);
    assert.equal(report.files.find(x => x.elementFileId === ids[0]).status, 'INVALID');
  }
});

test('entry-size bomb metadata fails before opening any OBJ', t => {
  const { result, report } = runAudit(t, entries(), manifest, { oversized: true });
  assert.notEqual(result.status, 0);
  assert.match(report.errors.join(' '), /uncompressed size limit/);
  assert.equal(report.summary.passedFiles, 0);
});

test('shared ELEMENT across different concepts is audited once, duplicate concepts fail', t => {
  const extra = { ...manifest.candidates[0], fma: 'FMA12345678', representation: 'BP12345678' };
  let { result, report } = runAudit(t, entries(), { ...manifest, candidates: [...manifest.candidates, extra] });
  assert.equal(result.status, 0);
  assert.deepEqual(report.summary, { uniqueElementFiles: 23, conceptMappings: 22, elementReferences: 24, passedFiles: 23, passedConcepts: 22 });
  ({ result, report } = runAudit(t, entries(), { ...manifest, candidates: [...manifest.candidates, manifest.candidates[0]] }));
  assert.notEqual(result.status, 0);
  assert.match(report.errors.join(' '), /duplicate FMA/);
});
