// ============================================================
// CORE: System Bootstrap (Control Boundary Architecture)
// ============================================================
// Strict initialization order with single mutation authority:
//
//   Infra → Domain → Policy → Validation → Registry
//     → Runtime (execution-only) → ExecutionGate → API
//     → Genesis (via gate)
//
// AFTER bootstrap, ALL mutations flow:
//   API → ExecutionGate → Runtime → Domain → EventStore
//
// The ExecutionGate is the single mutation authority.
// No component may mutate state except through the gate.
// ============================================================

import { createInfra } from "../infra/index.js"
import { createPolicyEngine } from "../policy/index.js"
import { validateInvocation } from "../validation/validator.js"
import { RuntimeEngine } from "../runtime/engine.js"
import { createAPI } from "../api/index.js"
import { createFileSystemSnapshotStore } from "../mission-studio/snapshot-store.js"
import { createCapabilityRegistry } from "../capability/index.js"
import { createAdapterRegistry } from "../adapters/registry.js"
import { GenesisIntake } from "../genesis/index.js"
import { Registry } from "../capability/registry.js"
import { ExecutionGate } from "../control/execution-gate.js"
import { Tracer, Logger } from "../observability/tracer.js"
import { GovernanceEngine } from "../governance/governance-engine.js"
import { TypeChecker, buildTypedIR } from "../compiler/type-checker.js"
import { PlanningEngine, PlanningCoordinator } from "../planning/index.js"
import { MissionStudio, MissionIntake } from "../mission-studio/index.js"
import { WorkspaceCognitionEnvironment, createStateReader } from "../workspace/index.js"

import type { InfraConfig } from "../infra/index.js"
import type { RuntimeConfig } from "../runtime/engine.js"
import type { GenesisInput } from "../genesis/intake.js"

export type SynthContext = {
  // Control layer (single mutation authority)
  gate: ExecutionGate

  // Execution layer (execution only)
  runtime: RuntimeEngine

  // Registry (read-only after bootstrap)
  capabilityRegistry: Registry

  // Infra (data plane)
  infra: Awaited<ReturnType<typeof createInfra>>

  // Supporting systems
  policyEngine: ReturnType<typeof createPolicyEngine>
  genesis: GenesisIntake
  tracer: Tracer
  logger: Logger
  governance: GovernanceEngine
  typeChecker: TypeChecker
  api: ReturnType<typeof createAPI>

  // Planning + Mission Studio + Workspace (read-only observation)
  planning: PlanningEngine
  missionIntake: MissionIntake
  missionStudio: MissionStudio
  workspace: WorkspaceCognitionEnvironment

  // Adapter ecosystem (external boundary)
  adapterRegistry: ReturnType<typeof createAdapterRegistry>

  // Lifecycle
  seal: () => void
  isSealed: boolean
}

export type BootstrapConfig = {
  infra?: InfraConfig
  runtime?: RuntimeConfig
  genesis?: GenesisInput
  skipGenesis?: boolean
}

export async function bootstrap(config: BootstrapConfig = {}): Promise<SynthContext> {
  const logger = new Logger("bootstrap")
  logger.info("Starting Synth v2 bootstrap with Control Boundary...")

  // === STEP 1: INFRASTRUCTURE (data plane) ===
  logger.info("[1/13] Initializing infrastructure layer...")
  const infra = await createInfra(config.infra)

  // === STEP 2: DOMAIN (pure — no initialization needed) ===
  logger.info("[2/13] Domain layer ready (pure functions)")

  // === STEP 3: POLICY ENGINE ===
  logger.info("[3/13] Initializing policy engine...")
  const policyEngine = createPolicyEngine()

  // === STEP 4: VALIDATION (pure) ===
  logger.info("[4/13] Validation layer ready")

  // === STEP 5: CAPABILITY REGISTRY ===
  logger.info("[5/13] Initializing capability registry...")
  const capabilityRegistry = createCapabilityRegistry()

  // === STEP 6: RUNTIME ENGINE (execution-only) ===
  logger.info("[6/13] Initializing runtime engine (execution-only)...")
  const runtime = new RuntimeEngine(
    infra.eventStore,
    infra.stateStore,
    infra.checkpointStore,
    config.runtime,
  )

  // === STEP 7: EXECUTION GATE (control boundary — SINGLE MUTATION AUTHORITY) ===
  logger.info("[7/13] Initializing ExecutionGate (control boundary)...")
  const gate = new ExecutionGate(
    capabilityRegistry,
    policyEngine,
    runtime,
    infra.eventStore,
    infra.stateStore,
    validateInvocation,
  )

  // === STEP 8: PLANNING COGNITION ENGINE (PCE) ===
  logger.info("[8/13] Initializing Planning Cognition Engine...")
  const planningKey = "synth-planning-key-v1"
  const planningCoordinator = new PlanningCoordinator(gate, planningKey)
  const planning = new PlanningEngine(planningCoordinator, planningKey)

  // === STEP 9: MISSION STUDIO (read-only planning environment) ===
  logger.info("[9/13] Initializing Mission Studio (read-only planning environment)...")
  const missionIntake = new MissionIntake()
  const missionStudio = new MissionStudio({}, missionIntake)

  // === STEP 10: ADAPTER ECOSYSTEM (external boundary) ===
  logger.info("[10/13] Initializing Adapter Registry...")
  const adapterRegistry = createAdapterRegistry()

  // === STEP 11: WORKSPACE COGNITION ENVIRONMENT (read-only observation) ===
  logger.info("[11/13] Initializing Workspace Cognition Environment...")
  const stateReader = createStateReader({ eventStore: infra.eventStore, stateStore: infra.stateStore })
  const workspace = new WorkspaceCognitionEnvironment(stateReader, capabilityRegistry)

  // === STEP 12: API LAYER ===
  logger.info("[12/13] Initializing API layer...")
  const snapshotStore = createFileSystemSnapshotStore("./data/snapshots")
  const api = createAPI(gate, planning, missionStudio, adapterRegistry, snapshotStore)

  // === STEP 13: GENESIS (through the single mutation authority) ===
  logger.info("[13/13] Running genesis intake through ExecutionGate...")
  const genesis = new GenesisIntake(
    gate,
    capabilityRegistry,
  )

  if (config.genesis && !config.skipGenesis) {
    // Genesis seeds events through ExecutionGate.executeGenesis().
    // This is the ONLY allowed mutation path, even during bootstrap.
    const genesisResult = await genesis.initialize(config.genesis)

    // Register all capabilities from genesis
    for (const capName of capabilityRegistry.list()) {
      const cap = capabilityRegistry.resolve(capName)
      if (cap) runtime.registerCapability(cap)
    }

    logger.info(
      `Genesis complete: ${genesisResult.capabilitiesRegistered} capabilities, ${genesisResult.eventLogSeed.length} seed events, ${Object.keys(genesisResult.canonicalState.workItems).length} work items`
    )
  }

  // === GOVERNANCE + TYPE CHECKER (post-bootstrap integrity) ===
  const governance = new GovernanceEngine()
  const typeChecker = new TypeChecker()
  const tracer = new Tracer(1000)
  const caps = Array.from(capabilityRegistry.list())
    .map((name) => capabilityRegistry.resolve(name))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)
  const ir = buildTypedIR(caps)
  if (!ir.validity.valid) {
    logger.warn("Type check warnings:", { warnings: ir.validity.warnings })
  }

  // === SEAL (one-way transition to operational mode) ===
  let sealed = false
  function seal() {
    if (sealed) {
      throw new Error("INVARIANT_VIOLATION: system is already sealed")
    }
    capabilityRegistry.freeze()
    policyEngine.freeze()
    sealed = true
    logger.info("System sealed: registry and policy frozen")
  }

  logger.info("Synth v2 bootstrap complete!")
  logger.info(`Architecture: API → ExecutionGate → Runtime → Domain → EventStore`)
  logger.info(`Mutation authority: ExecutionGate (single point)`)

  return {
    gate,
    runtime,
    capabilityRegistry,
    infra,
    policyEngine,
    genesis,
    tracer,
    logger,
    governance,
    typeChecker,
    api,
    planning,
    missionIntake,
    missionStudio,
    workspace,
    adapterRegistry,
    seal,
    get isSealed() { return sealed },
  }
}
