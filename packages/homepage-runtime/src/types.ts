// ============================================================
// HOMEPAGE RUNTIME: Projection Contract
// ============================================================
// Stable interface between SYNTH runtime state and any UI.
// ============================================================

export type EntryMode = "greenfield" | "brownfield" | "knowledge" | "conversation"

export type WorkspacePhase =
  | "idle"
  | "intent"
  | "discovery"
  | "constraints"
  | "domain"
  | "mission"
  | "expeditions"
  | "governance"
  | "replay"
  | "architecture"
  | "repository"

export interface Confidence {
  overall: number
  byField: Record<string, number>
}

export interface IntentCard {
  kind: "intent"
  description: string
  goals: string[]
  successCriteria: string[]
  mode: EntryMode
}

export interface DiscoveryCard {
  kind: "discovery"
  findings: string[]
  capabilities: string[]
  constraints: string[]
}

export interface UnknownCard {
  kind: "unknown"
  field: string
  description: string
  confidence: number
}

export interface UnknownsCard {
  kind: "unknowns"
  items: UnknownCard[]
}

export interface DomainCard {
  kind: "domain"
  entities: string[]
  relationships: string[]
  boundedContexts: string[]
}

export interface MissionCard {
  kind: "mission"
  id: string
  name: string
  purpose: string
  objectives: string[]
  successCriteria: string[]
}

export interface ExpeditionCard {
  kind: "expedition"
  id: string
  missionId: string
  name: string
  goal: string
  status: "draft" | "proposed" | "committed" | "executing" | "completed"
}

export interface EvidenceCard {
  kind: "evidence"
  id: string
  observation: string
  confidence: number
  source: string
}

export interface ArchitectureCard {
  kind: "architecture"
  layer: string
  responsibility: string
  dependencies: string[]
}

export interface RepositoryCard {
  kind: "repository"
  status: "initialized" | "materialized" | "governed"
  artifacts: string[]
  eventCount: number
}

export interface ReplayProjection {
  offset: number
  totalEvents: number
  stateHash: string
  currentEventType?: string
}

export interface ArtifactProjection {
  phase: WorkspacePhase
  intent?: IntentCard
  discovery?: DiscoveryCard
  unknowns: UnknownsCard
  domain?: DomainCard
  mission?: MissionCard
  expeditions: ExpeditionCard[]
  evidence: EvidenceCard[]
  architecture?: ArchitectureCard[]
  repository?: RepositoryCard
  replay?: ReplayProjection
}

export interface WorkspaceStatus {
  phase: WorkspacePhase
  ready: boolean
  message: string
}

export interface ClarificationQuestion {
  id: string
  field: string
  description: string
}

export interface ClarificationAnswer {
  questionId: string
  content: string
}

export interface GenesisState {
  mode: EntryMode
  input: string
  intent?: IntentCard
  discovery?: DiscoveryCard
  unknowns: UnknownsCard
  domain?: DomainCard
  mission?: MissionCard
  expeditions: ExpeditionCard[]
  evidence: EvidenceCard[]
  architecture?: ArchitectureCard[]
  repository?: RepositoryCard
  answers: ClarificationAnswer[]
}

export interface SampleEvent {
  type: string
  payload: Record<string, unknown>
  timestamp?: string
}

export interface ReplayState {
  events: SampleEvent[]
  offset: number
  projection: ArtifactProjection
}

export interface DemoExample {
  id: string
  name: string
  input: string
  mode: EntryMode
}

export interface OperatorAdapter {
  proposeIntent(context: DemoContext): Promise<string>
  answerClarification(questions: ClarificationQuestion[]): Promise<ClarificationAnswer[]>
  approveMission(mission: MissionCard): Promise<boolean>
  selectExample(examples: DemoExample[]): Promise<string>
}

export interface DemoContext {
  examples: DemoExample[]
  selectedExampleId?: string
}

export interface GenesisResult {
  state: GenesisState
  projection: ArtifactProjection
}

export interface MissionRuntime {
  discover(input: string, mode: EntryMode): Promise<GenesisResult>
  clarify(state: GenesisState, answers: ClarificationAnswer[]): Promise<GenesisResult>
  buildMission(state: GenesisState): Promise<GenesisResult>
  buildExpeditions(state: GenesisState): Promise<GenesisResult>
  buildArchitecture(state: GenesisState): Promise<GenesisResult>
  buildRepository(state: GenesisState): Promise<GenesisResult>
  loadReplay(events: SampleEvent[]): Promise<ReplayState>
  stepReplay(state: ReplayState, direction: "forward" | "backward" | number): Promise<ReplayState>
  currentArtifacts(state: GenesisState | ReplayState): ArtifactProjection
}
