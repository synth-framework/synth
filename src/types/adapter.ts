// ============================================================
// TYPES: Adapter Lifecycle
// ============================================================
// Every Synth adapter implements this lifecycle. It is part of
// the adapter constitution and applies to all future adapters.
// ============================================================

export type AdapterState =
  | "discovered"
  | "configured"
  | "validated"
  | "enabled"
  | "healthy"
  | "operational"
  | "disabled"
  | "error"

export type AdapterHealthState =
  | "unknown"
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "disabled"

export type AdapterLifecycleTransition =
  | "discover"
  | "configure"
  | "validate"
  | "enable"
  | "healthCheck"
  | "disable"

export type AdapterKind = "integration" | "methodology" | "intelligence" | "planning" | "runtime"

export type AdapterFamily =
  | "discovery"
  | "initialization"
  | "repository"
  | "github"
  | "filesystem"
  | "operational-artifact"
  | "runtime"
  | "planning"
  | "intelligence"

export type AdapterDeterminism = "deterministic" | "contextual" | "non-deterministic"

export type AdapterCapability = {
  name: string
  description: string
}

export type AdapterConfigSchemaProperty = {
  type: string
  description?: string
  default?: unknown
}

export type AdapterConfigSchema = {
  properties: Record<string, AdapterConfigSchemaProperty>
  required?: string[]
}

/**
 * Canonical descriptor for any SYNTH adapter.
 *
 * Used by the unified adapter catalog (EXP-ADAPTER-CATALOG-001) to index,
 * query, and select adapters without hardcoded factory maps.
 */
export type AdapterDescriptor = {
  /** Stable adapter identifier */
  id: string

  /** Human-readable name */
  name: string

  /** Semantic version of the adapter contract implementation */
  version: string

  /** Generic adapter category */
  kind: AdapterKind

  /** Functional family within SYNTH (discovery, initialization, repository, etc.) */
  family: AdapterFamily

  /** Short description */
  description: string

  /** Source types this adapter can consume, when applicable */
  sourceTypes?: string[]

  /** Programming languages this adapter supports, when applicable */
  languages?: string[]

  /** Runtimes this adapter supports, when applicable */
  runtimes?: string[]

  /** Platforms this adapter targets, when applicable */
  platforms?: string[]

  /** Capabilities this adapter provides */
  capabilities: string[]

  /** Optional capabilities this adapter may provide depending on configuration */
  optionalCapabilities?: string[]

  /** JSON-schema-like description of accepted configuration */
  configSchema?: AdapterConfigSchema

  /** Whether the adapter is deterministic, contextual, or non-deterministic */
  determinism: AdapterDeterminism
}

export type AdapterMetadata = {
  name: string
  version: string
  kind: string
  category: AdapterKind
  description: string
  capabilities?: AdapterCapability[]
}

export type AdapterTransitionResult = {
  state: AdapterState
  previousState: AdapterState
  transition: AdapterLifecycleTransition
  success: boolean
  message: string
  detail?: Record<string, unknown>
}

export type AdapterHealth = {
  state: AdapterHealthState
  message: string
  diagnostics?: Record<string, unknown>
}

export interface Adapter {
  readonly metadata: AdapterMetadata
  readonly state: AdapterState
  readonly health: AdapterHealth
  describe?(): AdapterDescriptor
  discover(): Promise<AdapterState>
  configure(config: Record<string, unknown>): Promise<AdapterState>
  validate(): Promise<AdapterState>
  enable(): Promise<AdapterState>
  healthCheck(): Promise<AdapterState>
  disable(): Promise<AdapterState>
}

/** Observable adapter extension — adapters that produce observations for Mission Studio */
export interface ObservableAdapter extends Adapter {
  /** Emit canonical observations without mutating state */
  observe(): Promise<import("./observation.js").ObservationBatch>
}
