// ============================================================
// INFRA: Infrastructure Index
// ============================================================

export * from "./event-store.js"
export * from "./state-store.js"
export * from "./checkpoint-store.js"
export * from "./git-adapter.js"
export * from "./filesystem.js"
export * from "./event-store.guard.js"
export * from "./paths.js"
export * from "./migrate-data-dir.js"

import { EventStore, InMemoryEventStore, PartitionStore, SegmentStore } from "./event-store.js"
import { StateStore, InMemoryStateStore, type IStateStore } from "./state-store.js"
import { CheckpointStore, InMemoryCheckpointStore, type ICheckpointStore } from "./checkpoint-store.js"
import { GitAdapterImpl, GitAdapterStub } from "./git-adapter.js"
import { NodeFilesystemAdapter, InMemoryFilesystemAdapter } from "./filesystem.js"
import { createGuardedEventStore } from "./event-store.guard.js"

export type InfraConfig = {
  persistence?: "file" | "memory"
  partitionCount?: number
  gitEnabled?: boolean
  eventLogPath?: string
  statePath?: string
  checkpointPath?: string
  streamDir?: string
}

export type Infra = {
  eventStore: EventStore
  partitionStore: PartitionStore
  segmentStore: SegmentStore
  stateStore: IStateStore
  checkpointStore: ICheckpointStore
  git: GitAdapterImpl | GitAdapterStub
  fs: NodeFilesystemAdapter | InMemoryFilesystemAdapter
}

export async function createInfra(config: InfraConfig = {}): Promise<Infra> {
  const persistence = config.persistence || "file"
  const partitionCount = config.partitionCount || 4
  const gitEnabled = config.gitEnabled !== false
  const isFile = persistence === "file"

  // Memory persistence must never fall back to the default canonical log
  // path (EXP-HARDEN-006): the event store, like every other store, is
  // genuinely in-memory when persistence is not "file".
  const eventStore = createGuardedEventStore(
    isFile
      ? EventStore.createAuthorized(config.eventLogPath)
      : new InMemoryEventStore()
  )
  const partitionStore = new PartitionStore(partitionCount, config.streamDir)
  const segmentStore = new SegmentStore(1000, config.streamDir)

  const stateStore: IStateStore = isFile
    ? new StateStore(config.statePath)
    : new InMemoryStateStore()

  const checkpointStore: ICheckpointStore = isFile
    ? new CheckpointStore(config.checkpointPath)
    : new InMemoryCheckpointStore()

  const git = (isFile && gitEnabled)
    ? new GitAdapterImpl()
    : new GitAdapterStub()

  const fs = isFile
    ? new NodeFilesystemAdapter()
    : new InMemoryFilesystemAdapter()

  await eventStore.initialize()
  await partitionStore.initialize()
  await stateStore.initialize()
  await checkpointStore.initialize()

  return {
    eventStore,
    partitionStore,
    segmentStore,
    stateStore,
    checkpointStore,
    git,
    fs,
  }
}
