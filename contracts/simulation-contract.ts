/**
 * CONCEPT API v0.1 — vormgevend contract, geen bewezen productie-implementatie.
 * Renderer-onafhankelijk (React/Three adapters blijven in hun eigen pakket).
 * Gegeven een hostcontext kan de module resources opbouwen en veilig opruimen.
 */

export type Locale = "nl" | "en";
export type SubjectId = "anatomy" | "cell" | "solar" | "physics" | "chemistry" | "technology";
export type AnatomyMode = "herstellen" | "trainen" | "leren" | "blessures" | "sporten";
export type Version = `${number}.${number}.${number}`;

export type Vector3 = readonly [number, number, number];

export type ModuleAsset = Readonly<{
  id: string;
  url: string;
  sha256: string;
  licenseId: string;
  attribution: string;
  sourceUrl: string;
  units: string; // e.g. "m", "nm", "AU"; document conversion per module
}>;

export interface SimulationManifest {
  schemaVersion: "1.0";
  pluginId: string;
  pluginVersion: Version;
  subject: SubjectId;
  titleKeys: Record<Locale, string>;
  descriptionKeys: Record<Locale, string>;
  assets: readonly ModuleAsset[];
  scientificLimitations: readonly string[];
  requiresWebGL: boolean;
  fallbackContentId: string;
}

export interface SceneSelection {
  canonicalId: string;
  providerObjectId?: string;
  parentId?: string;
}

export type SimulationEvent =
  | { type: "selection.changed"; selected: SceneSelection | null }
  | { type: "camera.focus"; canonicalId: string }
  | { type: "layers.changed"; visibleLayerIds: readonly string[] }
  | { type: "scene.reset" }
  | { type: "scene.error"; code: "MISSING_ASSET" | "UNSUPPORTED_GPU" | "INVALID_ID" | "LOAD_FAILED" };

export interface SimulationHost {
  locale(): Locale;
  emit(event: SimulationEvent): void;
  /** Returns a local, immutable, previously validated asset URL. */
  resolveAsset(assetId: string): string;
  /** Signal is aborted when the module is deactivated. */
  abortSignal: AbortSignal;
}

export interface SimulationPlugin {
  readonly manifest: SimulationManifest;
  /** Called exactly once per active scene after assets/licenses have been checked. */
  mount(host: SimulationHost): Promise<void>;
  /** Must release event listeners, GPU resources, workers, subscriptions. */
  unmount(): Promise<void>;
  /** Select by our stable, provider-independent ID. */
  select(canonicalId: string | null): void;
  /** Generic controls supported if implemented; unsupported controls are hidden in UI. */
  capabilities(): readonly ("focus" | "layers" | "explode" | "clip" | "play" | "parameter")[];
  /** Optional state snapshot, containing NO personal or medical info. */
  publicViewState(): Readonly<Record<string, string | number | boolean>>;
}

/** Scientific simulation calculations are a separate layer, e.g. a Worker. */
export interface DeterministicSimulation<Input, Output> {
  readonly engineVersion: Version;
  validate(input: Input): void;
  evaluate(input: Input): Output;
  /** Documented cases with units, tolerances and expected results. */
  testCases(): readonly { id: string; input: Input; expected: Output; tolerance?: number }[];
}
