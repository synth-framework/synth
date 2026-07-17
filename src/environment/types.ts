// ============================================================
// ENVIRONMENT: Core Types
// ============================================================
// Environment-agnostic type definitions for the SYNTH Environment
// Layer. No Node.js or platform-specific types appear here.
// ============================================================

/** Canonical capability families supported by the Environment Layer */
export type CapabilityFamily =
  | "Environment"
  | "Workspace"
  | "Filesystem"
  | "Revision"
  | "Process"
  | "Tool"
  | "Runtime"
  | "Package"
  | "Network"
  | "Forge"
  | "Secrets"
  | "Identity"
  | "Versioning"

/** Confidence level assigned to a discovery observation */
export type DiscoveryConfidence = "none" | "low" | "medium" | "high" | "certain"

/** A single observation produced by a discovery rule */
export type DiscoveryObservation = {
  id: string
  ruleId: string
  family: CapabilityFamily
  name: string
  value: unknown
  confidence: DiscoveryConfidence
  timestamp: number
  metadata?: Record<string, unknown>
}

/** A discovery rule observes the environment without mutating it */
export type DiscoveryRule = {
  id: string
  family: CapabilityFamily
  description: string
  observe: (ctx: ObservationContext) => Promise<DiscoveryObservation | DiscoveryObservation[]>
}

/** Abstract context for observing the environment */
export type ObservationContext = {
  /** Read a file at the given path, returning its content as a string or undefined if absent */
  readFile: (path: string) => Promise<string | undefined>
  /** List entries in a directory, returning names only */
  listDirectory: (path: string) => Promise<string[]>
  /** Check whether a path exists */
  pathExists: (path: string) => Promise<boolean>
  /** Read an environment variable, returning undefined if absent */
  readEnv: (name: string) => string | undefined
  /** Execute a tool command and capture its stdout; returns undefined if the tool is unavailable */
  execTool: (command: string, args: string[]) => Promise<string | undefined>
  /** Current working directory of the observation */
  cwd: string
}

/** Provider capability advertisement */
export type ProviderCapability = {
  family: CapabilityFamily
  priority: number
  confidence: DiscoveryConfidence
}

/** A capability provider satisfies one or more capability families */
export type CapabilityProvider = {
  name: string
  version: string
  capabilities: ProviderCapability[]
  evaluate: (ctx: ObservationContext, evidence: DiscoveryEvidence) => Promise<ProviderSuitability>
}

/** Suitability score for a provider against a capability family */
export type ProviderSuitability = {
  family: CapabilityFamily
  providerName: string
  available: boolean
  confidence: DiscoveryConfidence
  reason: string
  metadata?: Record<string, unknown>
}

/** Resolved provider selection for a capability family */
export type ResolvedProvider = {
  family: CapabilityFamily
  providerName: string
  confidence: DiscoveryConfidence
  reason: string
  metadata?: Record<string, unknown>
}

/** Compatibility decision made during provider resolution */
export type CompatibilityDecision = {
  family: CapabilityFamily
  decision: "supported" | "unsupported" | "degraded" | "configured"
  reason: string
}

/** Environmental assumption discovered or configured explicitly */
export type EnvironmentalAssumption = {
  id: string
  family: CapabilityFamily
  assumption: string
  source: "discovered" | "configured"
  confidence: DiscoveryConfidence
}

/** Canonical discovery evidence artifact */
export type DiscoveryEvidence = {
  schema: "synth-discovery-evidence-v1"
  timestamp: number
  environment: {
    platform: string
    platformVersion?: string
    workspaceRoot: string
    classification: "unknown" | "bare" | "project" | "repository" | "ci"
  }
  observations: DiscoveryObservation[]
  capabilities: Array<{
    family: CapabilityFamily
    available: boolean
    confidence: DiscoveryConfidence
    observations: string[]
  }>
  providers: ResolvedProvider[]
  assumptions: EnvironmentalAssumption[]
  compatibility: CompatibilityDecision[]
  provenance: {
    rulesExecuted: string[]
    providersEvaluated: string[]
  }
}

/** Configuration for the discovery orchestrator */
export type DiscoveryConfig = {
  rules?: DiscoveryRule[]
  providers?: CapabilityProvider[]
  overrides?: Array<{
    family: CapabilityFamily
    providerName: string
  }>
}

/** Result of a discovery run */
export type DiscoveryResult = {
  evidence: DiscoveryEvidence
  durationMs: number
}

// ============================================================
// Capability Graph Types
// ============================================================

/** Kinds of nodes in a capability graph */
export type CapabilityGraphNodeKind = "capability" | "provider"

/** A capability node in the graph */
export type CapabilityNode = {
  id: string
  kind: "capability"
  family: CapabilityFamily
  version: string
  required: boolean
  metadata: {
    description: string
    compatibilityNotes?: string
  }
}

/** A provider node in the graph */
export type ProviderNode = {
  id: string
  kind: "provider"
  name: string
  version: string
  capabilities: string[]
  priority: number
  metadata: {
    description?: string
    confidence?: DiscoveryConfidence
  }
}

/** Union of all graph node types */
export type CapabilityGraphNode = CapabilityNode | ProviderNode

/** Kinds of edges in a capability graph */
export type CapabilityGraphEdgeKind = "satisfies" | "requires"

/** An edge in the capability graph */
export type CapabilityGraphEdge = {
  id: string
  source: string
  target: string
  kind: CapabilityGraphEdgeKind
  metadata?: Record<string, unknown>
}

/** Canonical capability graph serialization */
export type CapabilityGraph = {
  schema: "synth-capability-graph-v1"
  version: string
  timestamp: number
  nodes: CapabilityGraphNode[]
  edges: CapabilityGraphEdge[]
  resolution: Record<string, ProviderPath>
}

/** A selected provider and its dependency path */
export type ProviderPath = {
  capabilityId: string
  providerId: string
  providerName: string
  confidence: DiscoveryConfidence
  reason: string
  dependencies: ProviderPath[]
}

/** Resolution failure record */
export type ResolutionFailure = {
  capabilityId: string
  reason: string
}

/** Result of a resolution request */
export type ResolutionResult =
  | { success: true; path: ProviderPath }
  | { success: false; failures: ResolutionFailure[] }

