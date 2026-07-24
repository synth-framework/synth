// ============================================================
// INFRA: State Store
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import type { CanonicalState, Transaction, CapabilityInvocation } from "../types/index.js"
import { computeStateHash } from "../runtime/replay.js"
import { dataDir } from "../sdk/paths/index.js"
import { IllegalMutationError } from "../core/errors.js"

const STATE_FILE = path.join(dataDir(process.cwd()), "canonical-state.json")
const SNAPSHOTS_DIR = path.join(dataDir(process.cwd()), "snapshots")

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
    const serialized = JSON.stringify(state, null, 2)
    await fs.writeFile(this.filePath, serialized)
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
