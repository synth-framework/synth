// ============================================================
// RUNTIME: Engine (Execution-Only)
// ============================================================
// The RuntimeEngine is now execution-only.
// It does NOT validate, policy-check, or resolve capabilities.
// Those decisions are made by the ExecutionGate (control layer).
//
// The Runtime ONLY does:
//   1. Execute domain logic for a given invocation
//   2. Persist events to the event store
//   3. Rebuild state from events
//   4. Commit transactions
//
// It NEVER decides WHETHER to execute.
// It ONLY executes WHAT it is told.
// ============================================================

import type {
  CapabilityInvocation,
  CanonicalState,
  Capability,
  ExecutionContext,
} from "../types/index.js"
import { EventStore, PartitionStore } from "../infra/event-store.js"
import type { IStateStore } from "../infra/state-store.js"
import type { ICheckpointStore } from "../infra/checkpoint-store.js"
import { execute } from "./executor.js"
import { rebuildState } from "./replay.js"
import { PartitionRouter, EventProducer, ConsumerGroup } from "./partition-router.js"

export type RuntimeConfig = {
  partitionCount?: number
  usePartitions?: boolean
}

export class RuntimeEngine {
  // Infra dependencies (data plane only)
  private eventStore: EventStore
  private stateStore: IStateStore

  // Optional partitioned components
  private partitionStore?: PartitionStore
  private partitionRouter?: PartitionRouter
  private producer?: EventProducer
  private consumerGroups: Map<string, ConsumerGroup> = new Map()
  private checkpointStore?: ICheckpointStore

  private config: RuntimeConfig

  constructor(
    eventStore: EventStore,
    stateStore: IStateStore,
    checkpointStore?: ICheckpointStore,
    config: RuntimeConfig = {},
  ) {
    this.eventStore = eventStore
    this.stateStore = stateStore
    this.checkpointStore = checkpointStore
    this.config = {
      partitionCount: 4,
      usePartitions: false,
      ...config,
    }

    if (this.config.usePartitions && this.config.partitionCount) {
      this.initializePartitioned()
    }
  }

  private initializePartitioned(): void {
    const count = this.config.partitionCount || 4
    this.partitionStore = new PartitionStore(count)
    this.partitionRouter = new PartitionRouter(count)

    if (this.partitionStore && this.partitionRouter) {
      this.producer = new EventProducer(this.partitionStore, this.partitionRouter)
    }
  }

  // ===== EXECUTE ONLY =====
  // The runtime does not validate, policy-check, or resolve.
  // The ExecutionGate has already made those decisions.

  private capabilityRegistry?: Map<string, Capability>

  /** Register a capability for runtime resolution (bootstrap only). */
  registerCapability(cap: Capability): void {
    if (!this.capabilityRegistry) {
      this.capabilityRegistry = new Map()
    }
    this.capabilityRegistry.set(cap.name, cap)
  }

  /** Execute a capability invocation. Assumes intent is pre-validated. */
  async execute(
    invocation: CapabilityInvocation,
    context: ExecutionContext,
  ): Promise<import("../types/index.js").ExecutionResult> {
    const currentState = await this.getState()
    const ctx = {
      ...context,
      currentState,
      capabilityRegistry: this.capabilityRegistry,
    }

    return execute(invocation, ctx)
  }

  // ===== STATE ACCESS (read-only observation) =====

  /** Get current canonical state (rebuilt from events) */
  async getState(): Promise<CanonicalState> {
    const events = await this.eventStore.loadAll()
    return rebuildState(events)
  }

  /** Get event count */
  async getEventCount(): Promise<number> {
    return this.eventStore.count()
  }

  /** Load all events (for replay/audit) */
  async loadEvents() {
    return this.eventStore.loadAll()
  }

  // ===== PARTITIONED STREAMING (optional) =====

  getConsumerGroup(groupId: string): ConsumerGroup {
    if (!this.consumerGroups.has(groupId)) {
      if (!this.partitionStore || !this.checkpointStore) {
        throw new RuntimeError("Partitioned mode not initialized")
      }
      const group = new ConsumerGroup(
        groupId,
        this.partitionStore,
        this.checkpointStore,
        this.config.partitionCount,
      )
      this.consumerGroups.set(groupId, group)
    }
    return this.consumerGroups.get(groupId)!
  }
}

export class RuntimeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RuntimeError"
  }
}
