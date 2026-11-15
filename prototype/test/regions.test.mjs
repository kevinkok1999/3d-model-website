import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REGIONS, REGION_LABELS, REGION_BY_KEY, getRegions, selectCatalog } from '../src/regions.js';

const catalog = JSON.parse(readFileSync(new URL('../../node_modules/open-anatomy-3d/catalog.json', import.meta.url), 'utf8'));
const find = key => catalog.find(entry => entry.key === key);
const keys = records => records.map(entry => entry.key);

test('All 147 pinned source keys have explicit valid region proposals, without invented entries', () => {
  assert.deepEqual(REGIONS, ['head-neck', 'trunk', 'upper-limb', 'lower-limb', 'multi-region']);
  assert.equal(catalog.length, 147);
  assert.deepEqual(Object.keys(REGION_BY_KEY).sort(), keys(catalog).sort());
  for (const entry of catalog) {
    const regions = getRegions(entry);
    assert.ok(regions.length > 0, entry.key);
    assert.equal(new Set(regions).size, regions.length, entry.key);
    assert.ok(regions.every(region => REGIONS.includes(region)), entry.key);
    const specific = regions.filter(region => region !== 'multi-region');
    assert.ok(specific.length >= 1, entry.key);
    assert.equal(regions.includes('multi-region'), specific.length > 1, entry.key);
  }
  for (const locale of ['nl', 'en']) {
    assert.ok(REGION_LABELS[locale].all);
    for (const region of REGIONS) assert.ok(REGION_LABELS[locale][region]);
  }
});

test('Regional proposals distinguish extremities, head/neck, trunk and overlapping regions', () => {
  assert.deepEqual(getRegions(find('ankle_l')), ['lower-limb']);
  assert.deepEqual(getRegions(find('elbow_r')), ['upper-limb']);
  assert.deepEqual(getRegions(find('brain')), ['head-neck']);
  assert.deepEqual(getRegions(find('liver')), ['trunk']);
  assert.deepEqual(getRegions(find('spinal_cord')), ['head-neck', 'trunk', 'multi-region']);
  assert.deepEqual(getRegions(find('skin')), REGIONS);
  assert.deepEqual(getRegions(find('arteries_head')), ['head-neck']);
  assert.throws(() => getRegions({key: 'invented_region_key', label:'Unknown'}), /Unknown.*key/);
});

test('Default selection preserves all records, their identity and input order', () => {
  const selected = selectCatalog(catalog);
  assert.deepEqual(selected, catalog);
  assert.notEqual(selected, catalog);
  assert.equal(selected[0], catalog[0]);
  const male = catalog.filter(entry => !entry.sex || entry.sex === 'male');
  assert.deepEqual(selectCatalog(male), male);
});

test('Region and system filters intersect, including explicit multi-region membership', () => {
  const filtered = selectCatalog(catalog, {region:'head-neck', system:'organs'});
  assert.ok(keys(filtered).includes('brain'));
  assert.ok(keys(filtered).includes('trachea'));
  assert.ok(!keys(filtered).includes('heart'));
  assert.ok(filtered.every(entry => entry.system === 'organs'));
  const cross = selectCatalog(catalog, {region:'multi-region'});
  assert.ok(keys(cross).includes('spinal_cord') && keys(cross).includes('skin'));
  assert.ok(!keys(cross).includes('brain'));
  assert.deepEqual(selectCatalog(catalog, {region:'not-a-region'}), []);
  assert.deepEqual(selectCatalog(catalog, {system:'not-a-system'}), []);
});

test('Search is bilingual, accent-insensitive, case-insensitive, punctuation-normalized and conjunctive', () => {
  assert.deepEqual(keys(selectCatalog(catalog, {query:'   BRONCHIEN  ',locale:'nl'})), ['bronchi']);
  assert.deepEqual(keys(selectCatalog(catalog, {query:'deltaspier RECHTS',locale:'nl'})), ['deltoid_r']);
  assert.deepEqual(keys(selectCatalog(catalog, {query:'Deltoid left',locale:'en'})), ['deltoid_l']);
  assert.deepEqual(keys(selectCatalog(catalog, {query:'deltoid_r',locale:'nl', system:'muscles'})), ['deltoid_r']);
  assert.deepEqual(keys(selectCatalog(catalog, {query:'spinal-cord',locale:'en'})), ['spinal_cord']);
  assert.deepEqual(keys(selectCatalog(catalog, {query:'deltaspier rechts',locale:'en'})), ['deltoid_r']);
  assert.deepEqual(keys(selectCatalog(catalog, {query:'deltoid left',region:'lower-limb'})), []);
  assert.deepEqual(keys(selectCatalog(catalog, {query:'definitely unrelated term'})), []);
});
