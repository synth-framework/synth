// ============================================================
// DISCOVERY: Types
// ============================================================
// Core type definitions for the Discovery Capability.
//
// Discovery is a deterministic compiler: it acquires observations,
// normalizes them, correlates them into an immutable EvidenceGraph
// (canonical IR), executes registered projections over that IR, and
// verifies that the entire pipeline can be replayed.
//
// The EvidenceGraph is the only canonical artifact. All downstream
// outputs are projections.
// ============================================================

export const DISCOVERY_EVIDENCE_SCHEMA_VERSION = "synth-discovery-evidence-v1"
export const DISCOVERY_FINDINGS_SCHEMA_VERSION = "synth-discovery-findings-v1"
export const DISCOVERY_SESSION_SCHEMA_VERSION = "synth-discovery-session-v1"
export const PROJECT_MODEL_SCHEMA_VERSION = "synth-project-model-v1"

// ============================================================
// Confidence
// ============================================================

export type ConfidenceLabel = "none" | "low" | "medium" | "high" | "certain"

export type ConfidenceKind = "deterministic" | "heuristic" | "derived" | "inferred"

export type ConfidenceScore = {
  value: number
  label: ConfidenceLabel
  kind: ConfidenceKind
  reason: string
}

// ============================================================
// Sources
// ============================================================

export type FilesystemSource = {
  type: "filesystem"
  path: string
}

export type GitSource = {
  type: "git"
  url: string
  ref?: string
}

export type GitHubSource = {
  type: "github"
  owner: string
  repo: string
  ref?: string
}

export type KnowledgeSource = {
  type: "knowledge"
  path: string
}

export type TicketSystemSource = {
  type: "tickets"
  provider: string
  endpoint: string
}

export type ApiSource = {
  type: "api"
  endpoint: string
  spec?: string
}

export type DeploymentSource = {
  type: "deployment"
  provider: string
  identifier: string
}

export type DatabaseSource = {
  type: "database"
  connection: string
}

export type ContainerSource = {
  type: "container"
  image: string
}

export type DiscoverySource =
  | FilesystemSource
  | GitSource
  | GitHubSource
  | KnowledgeSource
  | TicketSystemSource
  | ApiSource
  | DeploymentSource
  | DatabaseSource
  | ContainerSource

// ============================================================
// Input
// ============================================================

export type DiscoveryInput = {
  sources: DiscoverySource[]
  declaredIntent?: string
  options?: DiscoveryOptions
  parentSessionId?: string
}

export type DiscoveryOptions = {
  /** Adapters to exclude from resolution. */
  excludeAdapterIds?: string[]
  /** Additional opaque options passed to adapters. */
  adapterContext?: Record<string, unknown>
}

// ============================================================
// Observations
// ============================================================

export type Observation = {
  /** Stable observation identifier. */
  id: string

  /** Adapter that produced this observation. */
  adapterId: string

  /** Version of the adapter that produced this observation. */
  adapterVersion: string

  /** Source that was observed. */
  source: DiscoverySource

  /** Immutable statement of fact (e.g., "package.json exists"). */
  fact: string

  /** Structured data supporting the fact. */
  payload?: Record<string, unknown>

  /** Timestamp when the observation was produced. */
  timestamp: number

  /**
   * For contextual or non-deterministic sources, a snapshot of source state
   * at the time of observation (commit hash, container sha, API version, etc.).
   */
  sourceState?: Record<string, unknown>
}

/** Observation after normalization: stable ids, canonical ordering. */
export type NormalizedObservation = Observation

// ============================================================
// Evidence Graph (Canonical IR)
// ============================================================

export type EvidenceClaim = {
  /** Stable claim identifier. */
  id: string

  /** Assertion supported by observations (e.g., "Node.js project manifest present"). */
  assertion: string

  /** Observations that support this assertion. */
  observationIds: string[]

  /** Adapter that produced the supporting observations. */
  adapterId: string

  /** Version of the adapter. */
  adapterVersion: string

  /** Source that was observed. */
  source: DiscoverySource

  /** Confidence in the assertion. */
  confidence: ConfidenceScore
}

export type EvidenceEdgeKind = "supports" | "contradicts" | "derived-from"

export type EvidenceEdge = {
  from: string
  to: string
  kind: EvidenceEdgeKind
}

/** Canonical intermediate representation of Discovery. Immutable after creation. */
export type EvidenceGraph = {
  schema: typeof DISCOVERY_EVIDENCE_SCHEMA_VERSION
  observations: NormalizedObservation[]
  claims: EvidenceClaim[]
  edges: EvidenceEdge[]
  observationIndex: Record<string, number>
  claimIndex: Record<string, number>
  sourceIndex: Record<string, number>
}

// ============================================================
// Findings
// ============================================================

export type FindingCategory =
  | "missing-artifact"
  | "conflict"
  | "incompleteness"
  | "inconsistency"
  | "unknown"

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical"

export type Finding = {
  /** Stable finding identifier. */
  id: string

  /** Classification of the finding. */
  category: FindingCategory

  /** Declarative statement of the observed condition. */
  description: string

  /** Severity of the finding. */
  severity: FindingSeverity

  /** Evidence claim ids that support this finding. */
  evidenceClaimIds: string[]

  /** Confidence in the finding. */
  confidence: ConfidenceScore

  /** Identifier of a finding that supersedes this one, if any. */
  supersededBy?: string

  /** Identifier of a finding that resolves this one, if any. */
  resolvedBy?: string
}

export type DiscoveryFindingSet = {
  schema: typeof DISCOVERY_FINDINGS_SCHEMA_VERSION
  items: Finding[]
}

// ============================================================
// ProjectModel
// ============================================================

export const PROJECT_MODEL_LIFECYCLE_VALUES = [
  "unknown",
  "specification",
  "design",
  "implementation",
  "operation",
  "maintenance",
  "archive",
] as const

export type LifecycleStageValue = (typeof PROJECT_MODEL_LIFECYCLE_VALUES)[number]

export type LifecycleStage = {
  value: LifecycleStageValue
  confidence: ConfidenceScore
}

export type ProjectIdentity = {
  id: string
  name: string
  displayName?: string
}

export type ProjectIntent = {
  statement: string
  targetOutcomes?: string[]
}

export type KnowledgeItem = {
  kind: string
  path?: string
  description?: string
}

export type CapabilityItem = {
  name: string
  available: boolean
  evidenceClaimIds: string[]
}

export type NamedConfidence = {
  name: string
  confidence: ConfidenceScore
}

export type ProjectModel = {
  schemaVersion: typeof PROJECT_MODEL_SCHEMA_VERSION
  identity: ProjectIdentity
  intent: ProjectIntent
  lifecycleStage: LifecycleStage
  languages: NamedConfidence[]
  frameworks: NamedConfidence[]
  runtimes: NamedConfidence[]
  capabilities: CapabilityItem[]
  knowledgeInventory: KnowledgeItem[]
  unknowns: string[]
  evidenceClaimReferences: string[]
  fileCount: number
  packageManager: NamedConfidence | undefined
}

export type ProjectModelDomain =
  | "identity"
  | "lifecycle"
  | "language"
  | "framework"
  | "runtime"
  | "capability"
  | "knowledge"
  | "unknown"
  | "metadata"

export type ProjectModelFieldUpdate = {
  /** Target field within the ProjectModel domain. */
  field: string

  /** Inferred value. */
  value: unknown

  /** Confidence in the inference. */
  confidence: ConfidenceScore

  /** Evidence claim ids supporting the inference. */
  evidenceClaimIds: string[]
}

export type ProjectModelRule = {
  /** Stable rule identifier. */
  id: string

  /** Domain this rule contributes to. */
  domain: ProjectModelDomain

  /** Evidence claim assertions required for this rule to fire. */
  requiredClaims: string[]

  /** Optional evidence claim assertions that strengthen the inference. */
  optionalClaims?: string[]

  /** Produce field updates from the evidence graph and prior outputs. */
  infer(
    evidenceGraph: EvidenceGraph,
    priorOutputs: Record<string, unknown>,
  ): ProjectModelFieldUpdate[] | undefined
}

export type ConfidenceRule = {
  /** Stable rule identifier. */
  id: string

  /** Domain this confidence rule applies to. */
  appliesTo: ProjectModelDomain

  /** Compute or adjust confidence for a field update. */
  compute(update: ProjectModelFieldUpdate, evidenceGraph: EvidenceGraph): ConfidenceScore
}

// ============================================================
// Projection Capabilities
// ============================================================

export type ProjectionProvenance = {
  /** Hash of the EvidenceGraph used as input. */
  evidenceGraphHash: string

  /** Hashes of prior projection outputs this projection consumed. */
  priorOutputHashes: Record<string, string>

  /** Versions of capabilities that contributed to this projection. */
  capabilityVersions: Record<string, string>
}

export type ProjectionContext = {
  /** Canonical evidence graph. */
  evidenceGraph: EvidenceGraph

  /** Declared intent from the operator, if any. */
  declaredIntent?: string

  /** Outputs from projections already executed. */
  priorOutputs: Record<string, unknown>

  /** Provenance for this projection execution. */
  provenance: ProjectionProvenance
}

export type ProjectionOutput<T = unknown> = {
  /** The projection result. */
  value: T

  /** Capability that produced this output. */
  projectionCapabilityId: string

  /** Version of the producing capability. */
  projectionCapabilityVersion: string

  /** Hash of the EvidenceGraph input. */
  evidenceGraphHash: string

  /** Hashes of consumed prior outputs. */
  dependencyHashes: Record<string, string>

  /** Timestamp when the projection completed. */
  producedAt: number
}

export type ProjectionCapability<TOutput = unknown> = {
  /** Stable capability identifier. */
  id: string

  /** Semantic version of the capability contract implementation. */
  version: string

  /** Unique projection type key used as the output key. */
  projectionType: string

  /** Other projection type keys this projection requires. */
  dependencies: string[]

  /** Produce the projection output from the shared context. */
  project(context: ProjectionContext): TOutput
}

export type ProjectionSchema<T = unknown> = {
  validate(output: T): { valid: boolean; errors: string[] }
}

// ============================================================
// Correlation
// ============================================================

export type CorrelationRule = {
  id: string
  priority: number
  requiredFacts: string[]
  /** Optional payload constraint for each required fact. */
  payloadConstraints?: Record<string, Record<string, unknown>>
  assertion: string
  confidence: ConfidenceScore
}

export type CorrelationCapability = {
  id: string
  version: string
  registerRules(): CorrelationRule[]
}

// ============================================================
// Observation Capabilities
// ============================================================

export type ObservationContract = {
  /** Facts this capability may produce. */
  produces: string[]

  /** Facts this capability must never produce. */
  neverProduces: string[]
}

export type ObservationCapability = {
  /** Stable capability identifier. */
  id: string

  /** Semantic version of the capability contract implementation. */
  version: string

  /** Adapter that produces observations from supported sources. */
  adapter: DiscoveryAdapter

  /** Optional correlation rules derived from this capability's observations. */
  correlation?: CorrelationCapability

  /** Declares the observation boundary for this capability. */
  observationContract: ObservationContract
}

// ============================================================
// Session
// ============================================================

export type AdapterDeterminism = "deterministic" | "contextual" | "non-deterministic"

export type AdapterExecutionRecord = {
  adapterId: string
  adapterVersion: string
  capabilityVersion: string
  determinism: AdapterDeterminism
  configurationHash: string
  executionParams?: Record<string, unknown>
  source: DiscoverySource
}

export type PipelineStageProvenance = {
  inputHash: string
  outputHash: string
  durationMs: number
  version: string
  warnings: string[]
}

export type DiscoveryPipelineProvenance = {
  acquisition: PipelineStageProvenance
  normalization: PipelineStageProvenance
  correlation: PipelineStageProvenance
  projection: PipelineStageProvenance
  verification: PipelineStageProvenance
}

export type ReplayStatus = "exact" | "equivalent" | "contextual" | "invalid" | "impossible"

export type ReplayStageName =
  | "acquisition"
  | "normalization"
  | "correlation"
  | "projection"
  | "verification"

export type ReplayStageResult = {
  stage: ReplayStageName
  status: "passed" | "failed" | "contextual" | "skipped"
  expectedHash: string
  actualHash: string
  invariant: string
  warnings: string[]
}

export type AdapterCheckResult = {
  adapterId: string
  determinism: AdapterDeterminism
  status: "passed" | "contextual" | "failed"
  reason?: string
}

export type ProvenanceCheckKind =
  | "session-hash"
  | "stage-hash"
  | "claim-reference"
  | "projection-dependency"

export type ProvenanceCheckResult = {
  kind: ProvenanceCheckKind
  status: "passed" | "failed"
  targetId: string
  reason?: string
}

export type ReplayReport = {
  status: ReplayStatus
  sessionId: string
  sessionHash: string
  stageResults: ReplayStageResult[]
  adapterChecks: AdapterCheckResult[]
  provenanceChecks: ProvenanceCheckResult[]
  tamperDetected: boolean
  tamperDetails: string[]
  durationMs: number
}

/**
 * Backward-compatible alias for consumers that expect the older shape.
 *
 * @deprecated Use ReplayReport instead.
 */
export type ReplayResult = ReplayReport

export type DiscoverySession = {
  schemaVersion: typeof DISCOVERY_SESSION_SCHEMA_VERSION
  id: string
  /** Cryptographic hash of canonical session content. */
  hash: string
  /** Optional reference to a prior session for lineage. */
  parentSessionId?: string
  startedAt: number
  completedAt: number
  sources: DiscoverySource[]
  adapters: AdapterExecutionRecord[]
  executionOrder: string[]
  observations: NormalizedObservation[]
  evidenceGraph: EvidenceGraph
  projections: Record<string, unknown>
  projectionProvenance: Record<string, ProjectionProvenance>
  pipeline: DiscoveryPipelineProvenance
  replay: ReplayReport
}

export type DiscoveryContext = {
  options?: DiscoveryOptions
}

export type DiscoveryAdapter = {
  /** Stable adapter identifier. */
  readonly id: string

  /** Semantic version of the adapter contract implementation. */
  readonly version: string

  /**
   * Whether the adapter can be exactly replayed.
   * - deterministic: same source state always produces the same observations.
   * - contextual: observations depend on external state that may change.
   * - non-deterministic: observations include inherently random or sampled data.
   */
  readonly determinism: AdapterDeterminism

  /** Return true when this adapter can handle the given source. */
  canHandle(source: DiscoverySource): boolean

  /**
   * Collect immutable observations from the source.
   *
   * Adapters must not interpret observations, synthesize evidence, or
   * produce findings. They must not modify the observed system.
   */
  collectObservations(
    source: DiscoverySource,
    context: DiscoveryContext,
  ): Promise<Observation[]>
}

// ============================================================
// Engine
// ============================================================

export type DiscoveryEngineOptions = {
  /** @deprecated Use observationCapabilities instead. */
  adapters?: DiscoveryAdapter[]
  observationCapabilities?: ObservationCapability[]
  correlationCapabilities?: CorrelationCapability[]
  /** @deprecated Use projectionCapabilities instead. */
  projectionRegistry?: never
  projectionCapabilities?: ProjectionCapability[]
}

// ============================================================
// Consumption Layer
// ============================================================
// Contracts for downstream consumers of DiscoverySession output.
//
// Consumers are observational: they read projections and replay state
// but do not mutate the compiler pipeline. The registry enforces
// projection requirements and wraps every execution in a provenanced
// ConsumerResult envelope.
// ============================================================

export type ConsumerKind = "presentation" | "analytical" | "persist" | "integration"

export interface DiscoveryConsumer<TInput = unknown, TOutput = unknown> {
  id: string
  version: string
  kind: ConsumerKind
  description: string
  /** Projection type keys required by this consumer. */
  requiredProjections?: string[]
  consume(session: DiscoverySession, context?: TInput): TOutput
}

export type ConsumerResult<TOutput = unknown> = {
  consumerId: string
  consumerVersion: string
  outputType: string
  outputHash: string
  output: TOutput
  warnings: string[]
  durationMs: number
  provenance: {
    sessionId: string
    sessionHash: string
    consumedAt: number
  }
}

export interface ConsumerRegistry {
  register<TInput, TOutput>(consumer: DiscoveryConsumer<TInput, TOutput>): void
  unregister(id: string): void
  resolve<TInput, TOutput>(id: string): DiscoveryConsumer<TInput, TOutput> | undefined
  list(): DiscoveryConsumer<unknown, unknown>[]
  execute<TInput, TOutput>(id: string, session: DiscoverySession, context?: TInput): ConsumerResult<TOutput>
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

// ============================================================
// Capability Taxonomy (migrated from src/environment/types.ts)
// ============================================================
// These types describe the environment capability families and
// the discovery evidence model. They live here because capability
// reporting and graph projection are discovery projections.
// ============================================================

/** Canonical capability families supported by SYNTH */
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

/** A single observation produced by a discovery rule or capability */
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

/** Environmental assumption discovered or configured explicitly */
export type EnvironmentalAssumption = {
  id: string
  family: CapabilityFamily
  assumption: string
  source: "discovered" | "configured"
  confidence: DiscoveryConfidence
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

// ============================================================
// Capability Graph Types (migrated from src/environment/types.ts)
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
