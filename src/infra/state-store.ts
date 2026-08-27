// ============================================================
// INFRA: State Store
// ============================================================

import { promises as fs, unlink } from "fs"
import path from "path"
import type { CanonicalState, Transaction, CapabilityInvocation } from "../types/index.js"
import { computeStateHash } from "../runtime/replay.js"
import { dataDir } from "../sdk/paths/index.js"
import { IllegalMutationError } from "../sdk/errors/index.js"
import { telemetry } from "./telemetry.js"

const STATE_FILE = path.join(dataDir(process.cwd()), "canonical-state.json")
const SNAPSHOTS_DIR = path.join(dataDir(process.cwd()), "snapshots")

/** Top-level Record collections in CanonicalState that are split into
 *  per-entity derived files (e.g. .synth/data/expeditions/<id>.json). */
const PER_ENTITY_COLLECTIONS = [
  "workItems",
  "plans",
  "milestones",
  "projects",
  "missions",
  "expeditions",
  "objectives",
  "discoveries",
  "decisions",
  "referenceEvidence",
] as const

/** Module-private authorization token for StateStore writes.
 *  Only createInfra() can obtain it, ensuring canonical state mutations flow
 *  through the single mutation authority (ExecutionGate).
 */
const STATE_STORE_WRITE_TOKEN = Symbol("STATE_STORE_WRITE_TOKEN")

/** State store interface */
export interface IStateStore {
  initialize(): Promise<void>
  save(state: CanonicalState): Promise<void>
  load(): Promise<CanonicalState | null>
  beginTransaction(intent: CapabilityInvocation, txId?: string): Transaction
  commit(tx: Transaction, state: CanonicalState): Promise<void>
  rollback(tx: Transaction): Promise<void>
  computeHash(state: CanonicalState): string
}

/** State store — persists and loads canonical state.
 *
 *  Writes (save, commit, snapshot) require the module-private write token.
 *  Direct instantiation by application code is read-only; any write attempt
 *  throws IllegalMutationError. This mirrors the EventStore authorization
 *  model and ensures canonical state mutations flow through ExecutionGate.
 */
export class StateStore implements IStateStore {
  private filePath: string
  private authorized: boolean

  constructor(filePath: string = STATE_FILE, authToken?: symbol) {
    this.filePath = filePath
    this.authorized = authToken === STATE_STORE_WRITE_TOKEN
  }

  /** Create an authorized StateStore instance for the infrastructure layer. */
  static createAuthorized(filePath?: string): StateStore {
    return new StateStore(filePath, STATE_STORE_WRITE_TOKEN)
  }

  protected ensureAuthorized(): void {
    if (!this.authorized) {
      throw new IllegalMutationError(
        "ILLEGAL_STATESTORE_WRITE: StateStore writes must pass through the ExecutionGate. " +
          "Direct instantiation of StateStore is not an authorized mutation path."
      )
    }
  }

  async initialize(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
  }

  async save(state: CanonicalState): Promise<void> {
    this.ensureAuthorized()
    const span = telemetry.start("stateStore.save")
    const serialized = JSON.stringify(state, null, 2)
    try {
      await fs.writeFile(this.filePath, serialized)
      await this.writePerEntityState(state)
      telemetry.end(span)
    } catch (err) {
      telemetry.end(span, err)
      throw err
    }
  }

  /** Split the canonical state into per-entity derived files under
   *  .synth/data/<collection>/<id>.json, keeping canonical-state.json as a
   *  generated aggregate. Archived expeditions are relocated to
   *  .synth/data/expeditions/archived/<id>.json (composition with the
   *  archive-relocation deliverable). Stale entity files are pruned so the
   *  per-entity tree exactly mirrors the in-memory state. */
  private async writePerEntityState(state: CanonicalState): Promise<void> {
    const baseDir = path.dirname(this.filePath)
    const store = state as unknown as Record<string, Record<string, unknown>>
    for (const collection of PER_ENTITY_COLLECTIONS) {
      const entities = store[collection]
      if (!entities || typeof entities !== "object") continue
      const collDir = path.join(baseDir, collection)
      // Skip (and prune) empty collections so we don't leave empty dirs.
      if (Object.keys(entities).length === 0) {
        await this.removeDirQuietly(collDir)
        continue
      }
      if (collection === "expeditions") {
        await this.syncEntityDir(path.join(baseDir, "expeditions"), "archived", entities)
      } else {
        await this.syncEntityDir(collDir, null, entities)
      }
    }
  }

  private async removeDirQuietly(dir: string): Promise<void> {
    await (fs as unknown as {
      rm: (d: string, o: { recursive: boolean; force: boolean }) => Promise<void>
    })
      .rm(dir, { recursive: true, force: true })
      .catch(() => {})
  }

  private async syncEntityDir(
    dir: string,
    archiveSubdir: string | null,
    entities: Record<string, unknown>,
  ): Promise<void> {
    await fs.mkdir(dir, { recursive: true })
    const archiveDir = archiveSubdir ? path.join(dir, archiveSubdir) : null
    if (archiveDir) await fs.mkdir(archiveDir, { recursive: true })

    const activeIds = new Set<string>()
    const archiveIds = new Set<string>()

    for (const [id, entity] of Object.entries(entities)) {
      const isArchived =
        archiveDir !== null && (entity as { status?: string })?.status === "archived"
      const targetDir = isArchived ? (archiveDir as string) : dir
      const targetIds = isArchived ? archiveIds : activeIds
      await fs.mkdir(targetDir, { recursive: true })
      await fs.writeFile(
        path.join(targetDir, `${id}.json`),
        JSON.stringify(entity, null, 2),
      )
      targetIds.add(id)
    }

    await this.pruneStale(dir, activeIds)
    if (archiveDir) await this.pruneStale(archiveDir, archiveIds)
  }

  private async pruneStale(dir: string, currentIds: Set<string>): Promise<void> {
    let files: string[]
    try {
      files = await fs.readdir(dir)
    } catch {
      return
    }
    for (const file of files) {
      if (!file.endsWith(".json")) continue
      const id = file.slice(0, -".json".length)
      if (!currentIds.has(id)) {
        await new Promise<void>((resolve) =>
          unlink(path.join(dir, file), () => resolve()),
        )
      }
    }
  }

  async load(): Promise<CanonicalState | null> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8")
      return JSON.parse(raw) as CanonicalState
    } catch {
      return null
    }
  }

  beginTransaction(intent: CapabilityInvocation, txId?: string): Transaction {
    return {
      id: txId || `tx-${intent.actor}-${intent.capability}`,
      intent,
      status: "pending",
      startedAt: 0,
      beforeStateHash: "",
      events: [],
    }
  }

  async commit(tx: Transaction, state: CanonicalState): Promise<void> {
    this.ensureAuthorized()
    tx.status = "committed"
    tx.finishedAt = tx.startedAt
    await this.save(state)
  }

  async rollback(tx: Transaction): Promise<void> {
    tx.status = "rolledback"
    tx.finishedAt = tx.startedAt
  }

  computeHash(state: CanonicalState): string {
    return computeStateHash(state)
  }

  async snapshot(state: CanonicalState, name: string): Promise<void> {
    this.ensureAuthorized()
    await fs.mkdir(SNAPSHOTS_DIR, { recursive: true })
    const file = path.join(SNAPSHOTS_DIR, `snapshot-${name}-${Date.now()}.json`)
    await fs.writeFile(file, JSON.stringify(state, null, 2))
  }

  async loadSnapshot(name: string): Promise<CanonicalState | null> {
    try {
      const files = await fs.readdir(SNAPSHOTS_DIR)
      const snapshotFile = files
        .filter((f: string) => f.startsWith(`snapshot-${name}`))
        .sort()
        .pop()
      if (!snapshotFile) return null
      const raw = await fs.readFile(path.join(SNAPSHOTS_DIR, snapshotFile), "utf-8")
      return JSON.parse(raw) as CanonicalState
    } catch {
      return null
    }
  }
}

/** In-memory state store (for testing / fast access) */
export class InMemoryStateStore implements IStateStore {
  private state: CanonicalState | null = null

  async initialize(): Promise<void> {}

  async save(state: CanonicalState): Promise<void> {
    this.state = JSON.parse(JSON.stringify(state))
  }

  async load(): Promise<CanonicalState | null> {
    return this.state ? JSON.parse(JSON.stringify(this.state)) : null
  }

  beginTransaction(intent: CapabilityInvocation, txId?: string): Transaction {
    return {
      id: txId || `tx-${intent.actor}-${intent.capability}`,
      intent,
      status: "pending",
      startedAt: 0,
      beforeStateHash: "",
      events: [],
    }
  }

  async commit(_tx: Transaction, state: CanonicalState): Promise<void> {
    this.state = JSON.parse(JSON.stringify(state))
  }

  async rollback(tx: Transaction): Promise<void> {
    tx.status = "rolledback"
    tx.finishedAt = tx.startedAt
  }

  computeHash(state: CanonicalState): string {
    return computeStateHash(state)
  }
}
