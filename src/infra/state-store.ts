// ============================================================
// INFRA: State Store
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import type { CanonicalState, Transaction, CapabilityInvocation } from "../types/index.js"
import { computeStateHash } from "../runtime/replay.js"
import { getRuntimeDataDir } from "./paths.js"

const STATE_FILE = path.join(getRuntimeDataDir(process.cwd()), "canonical-state.json")
const SNAPSHOTS_DIR = path.join(getRuntimeDataDir(process.cwd()), "snapshots")

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

/** State store — persists and loads canonical state */
export class StateStore implements IStateStore {
  private filePath: string

  constructor(filePath: string = STATE_FILE) {
    this.filePath = filePath
  }

  async initialize(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
  }

  async save(state: CanonicalState): Promise<void> {
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
