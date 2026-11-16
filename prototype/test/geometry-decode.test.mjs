import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// CPU decode of both exact installed source models via production engine/codec.
// It is not GPU rendering, pointer interaction, visual or anatomical review.
const root = fileURLToPath(new URL('..', import.meta.url));
const packageDir = [resolve(root, 'node_modules/open-anatomy-3d'), resolve(root, '../node_modules/open-anatomy-3d')]
  .find(dir => existsSync(resolve(dir, 'package.json')));
assert.ok(packageDir, 'Install the pinned open-anatomy-3d package first');
const catalog = JSON.parse(readFileSync(resolve(packageDir, 'catalog.json'), 'utf8'));
const expected = {
  male: { bytes: 7614076, meshCount: 128, gitBlob: 'f173c5a08e93fb3eef85c64859680b94ad7c2aed' },
  female: { bytes: 8134732, meshCount: 133, gitBlob: '53a6203083490251fd7bb6421f5698db9bccd4c9' },
};
const gitBlob = bytes => createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const vecFinite = vector => vector.toArray().every(Number.isFinite);

function validateAttribute(name, attribute, positionCount, meshName) {
  assert.ok(attribute.itemSize > 0 && Number.isInteger(attribute.itemSize), `${meshName}: invalid ${name} itemSize`);
  assert.equal(attribute.count, positionCount, `${meshName}: mismatched ${name} count`);
  // Scan actual decoded attribute samples rather than relying on min/max glTF
  // metadata; use normalized/interleaved accessor semantics where relevant.
  for (let i = 0; i < attribute.count; i++) {
    for (let component = 0; component < attribute.itemSize; component++) {
      const value = attribute.getComponent(i, component);
      if (!Number.isFinite(value)) assert.fail(`${meshName}: ${name}[${i},${component}] is not finite`);
    }
  }
}

function releaseScene(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}

for (const variant of ['male', 'female']) {
  test(`Three.js r179 / Meshopt CPU decode of exact ${variant} source geometry`, async t => {
    assert.equal(THREE.REVISION, '179', 'Test must match pinned production renderer major revision');
    const keys = new Set(catalog.filter(item => item.system !== 'joints' && (!item.sex || item.sex === variant)).map(item => item.key));
    const jointKeys = new Set(catalog.filter(item => item.system === 'joints').map(item => item.key));
    assert.equal(keys.size, expected[variant].meshCount);
    const bytes = readFileSync(resolve(packageDir, `models/anatomy-${variant}.glb`));
    assert.equal(bytes.length, expected[variant].bytes);
    assert.equal(gitBlob(bytes), expected[variant].gitBlob, 'The exact pinned source blob is required');
    const sourceJson = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
    const payload = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    await MeshoptDecoder.ready;
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => { throw new Error(`Unexpected external GLB resource: ${url}`); });
    const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
    const before = performance.now();
    const gltf = await loader.parseAsync(payload, '');
    const decodeMs = performance.now() - before;
    try {
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const seen = new Set(), bounds = new THREE.Box3(), uniqueGeometry = new Set(), uniqueMaterial = new Set();
      const renamedNodes = [];
      let meshCount = 0, vertices = 0, indices = 0, triangles = 0, indexedMeshes = 0, normalMeshes = 0;
      model.traverse(mesh => {
        if (!mesh.isMesh) return;
        // GLTFLoader deduplicates generated object names (e.g. the authored
        // mesh node skin may become skin_1 because its parent group is skin).
        // Prove identity with exact authored node index, never trim suffixes.
        const association = gltf.parser.associations.get(mesh);
        assert.ok(Number.isInteger(association?.nodes), `${mesh.name}: missing source node association`);
        const sourceNode = sourceJson.nodes[association.nodes];
        assert.ok(Number.isInteger(sourceNode?.mesh), `${mesh.name}: source association is not a mesh node`);
        assert.equal(association.meshes, sourceNode.mesh, `${mesh.name}: source mesh index does not match decoder mapping`);
        const name = sourceNode.name;
        if (mesh.name !== name) renamedNodes.push({ source: name, decoded: mesh.name });
        assert.ok(keys.has(name), `Unrecognized or ineligible decoded mesh: ${name}`);
        assert.ok(!jointKeys.has(name), `Synthetic joint anchor decoded as anatomy mesh: ${name}`);
        assert.ok(!seen.has(name), `Duplicate mesh identity after engine decode: ${name}`);
        assert.ok(mesh.matrixWorld.elements.every(Number.isFinite), `${name}: non-finite world transform`);
        seen.add(name); meshCount++;

        const geometry = mesh.geometry;
        assert.ok(geometry?.isBufferGeometry, `${name}: no decoded BufferGeometry`);
        uniqueGeometry.add(geometry);
        const position = geometry.getAttribute('position');
        assert.ok(position?.count >= 3, `${name}: empty or too small positions`);
        assert.equal(position.itemSize, 3, `${name}: position is not vec3`);
        vertices += position.count;

        for (const [attributeName, attribute] of Object.entries(geometry.attributes)) {
          validateAttribute(attributeName, attribute, position.count, name);
        }
        for (const [attributeName, attributes] of Object.entries(geometry.morphAttributes)) {
          for (let i = 0; i < attributes.length; i++) validateAttribute(`morph:${attributeName}:${i}`, attributes[i], position.count, name);
        }
        if (geometry.hasAttribute('normal')) normalMeshes++;
        const index = geometry.getIndex();
        const triangleVertices = index?.count ?? position.count;
        assert.ok(triangleVertices >= 3 && triangleVertices % 3 === 0, `${name}: invalid triangle list size ${triangleVertices}`);
        triangles += triangleVertices / 3;
        if (index) {
          indexedMeshes++; indices += index.count;
          assert.equal(index.itemSize, 1, `${name}: index accessor must be scalar`);
          for (let i = 0; i < index.count; i++) {
            const vertexIndex = index.getX(i);
            if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= position.count) {
              assert.fail(`${name}: index ${i} points outside position buffer (${vertexIndex}/${position.count})`);
            }
          }
        }

        geometry.computeBoundingBox();
        assert.ok(!geometry.boundingBox.isEmpty(), `${name}: empty local bounds`);
        assert.ok(vecFinite(geometry.boundingBox.min) && vecFinite(geometry.boundingBox.max), `${name}: invalid local bounds`);
        const worldBounds = geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        assert.ok(!worldBounds.isEmpty() && vecFinite(worldBounds.min) && vecFinite(worldBounds.max), `${name}: invalid world bounds`);
        const extent = worldBounds.getSize(new THREE.Vector3());
        assert.ok(extent.lengthSq() > 0, `${name}: zero-sized decoded geometry`);
        bounds.union(worldBounds);
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        assert.ok(materials.length && materials.every(m => m?.isMaterial), `${name}: invalid decoded materials`);
        materials.forEach(material => uniqueMaterial.add(material));
      });
      assert.equal(meshCount, expected[variant].meshCount);
      assert.deepEqual([...seen].sort(), [...keys].sort(), 'Every eligible source key and only those keys must survive decode');
      assert.ok(seen.has('deltoid_l') && seen.has('deltoid_r'));
      assert.ok(triangles > 0 && vertices > 0);
      assert.ok(!bounds.isEmpty() && vecFinite(bounds.min) && vecFinite(bounds.max));
      t.diagnostic(JSON.stringify({
        variant, bytes: bytes.length, gitBlob: gitBlob(bytes), engine: `Three.js r${THREE.REVISION}`,
        decodedMeshCount: meshCount, expectedCatalogMeshCount: keys.size, vertices, indices, triangles,
        indexedMeshes, normalMeshes, uniqueGeometries: uniqueGeometry.size, uniqueMaterials: uniqueMaterial.size,
        renamedNodes,
        worldBounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new THREE.Vector3()).toArray() },
        decodeMs: Math.round(decodeMs),
        scope: 'Node CPU/WASM decode + geometry validation, not browser/GPU performance or anatomical verification',
      }));
    } finally { releaseScene(gltf.scene); }
  });
}
