const SYSTEMS = Object.freeze(['skin','skeleton','muscles','organs','vessels','nerves','joints']);
const TARGET_STATES = Object.freeze(['missing-geometry','group-only','hotspot-only','unverified']);

/** Separate source-catalog records from draft targets. This is not an anatomical completeness score. */
export function summarizeCoverage(catalog, register) {
  const systems = Object.fromEntries(SYSTEMS.map(key => [key, 0]));
  const seen = new Set();
  for (const record of catalog) {
    if (!record.key || seen.has(record.key)) throw new Error('Duplicate or missing candidate key');
    if (!Object.hasOwn(systems, record.system)) throw new Error('Unknown system');
    systems[record.system]++;
    seen.add(record.key);
  }
  const targetStates = Object.fromEntries(TARGET_STATES.map(state => [state,0]));
  const targets = new Set();
  for (const target of register.targets) {
    if (!target.id || targets.has(target.id)) throw new Error('Duplicate or missing expansion target ID');
    if (!Object.hasOwn(targetStates,target.state)) throw new Error('Unknown target state');
    targets.add(target.id);
    targetStates[target.state]++;
  }
  return Object.freeze({records:seen.size,meshes:seen.size-systems.joints,hotspots:systems.joints,
    systems:Object.freeze(systems),targets:targets.size,targetStates:Object.freeze(targetStates),status:'draft',releaseReady:false});
}
