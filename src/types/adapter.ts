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

export type AdapterCapability = {
  name: string
  description: string
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
