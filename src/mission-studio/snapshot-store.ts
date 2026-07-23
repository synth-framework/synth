// ============================================================
// MISSION STUDIO: Snapshot Store
// ============================================================
// Durable storage for ApprovedMissionModelSnapshots and the
// PlanningSessions that produced them.
//
// Snapshots are immutable. The store enforces immutability by
// refusing to overwrite an existing snapshot. The filesystem
// implementation certifies every record on load (schema version,
// structure, proposal graph, signature, and lineage chain) and
// rejects tampered or malformed files loudly.
// ============================================================

import type { FilesystemProvider } from "../infra/filesystem-provider.js"
import { createPosixFilesystemProvider } from "../infra/filesystem-provider.js"
import type { StoredSnapshot, ApprovedMissionModelSnapshot, PlanningSession } from "./types.js"
import { certifySnapshot, migrateStoredSnapshot } from "./snapshot-integrity.js"

/** Snapshot store contract. Implementations may be filesystem, memory, or external. */
export interface SnapshotStore {
  /** Persist a snapshot and its session. Immutable: existing ids are rejected. */
  save(stored: StoredSnapshot): Promise<void>

  /** Retrieve a snapshot by id. */
  get(snapshotId: string): Promise<StoredSnapshot | undefined>

  /** List snapshots, optionally filtered to a single lineage. */
  list(lineageId?: string): Promise<StoredSnapshot[]>
}

// ============================================================
// In-Memory Implementation
// ============================================================

export class InMemorySnapshotStore implements SnapshotStore {
  private snapshots = new Map<string, StoredSnapshot>()

  async save(stored: StoredSnapshot): Promise<void> {
    if (this.snapshots.has(stored.snapshot.id)) {
      throw new Error(`INVARIANT_VIOLATION: snapshot ${stored.snapshot.id} already exists`)
    }
    this.snapshots.set(stored.snapshot.id, this.clone(stored))
  }

  async get(snapshotId: string): Promise<StoredSnapshot | undefined> {
    const stored = this.snapshots.get(snapshotId)
    return stored ? this.clone(stored) : undefined
  }

  async list(lineageId?: string): Promise<StoredSnapshot[]> {
    const all = Array.from(this.snapshots.values())
    const filtered = lineageId ? all.filter((s) => s.snapshot.lineage?.lineageId === lineageId) : all
    return filtered
      .sort((a, b) => (a.snapshot.lineage?.version ?? 0) - (b.snapshot.lineage?.version ?? 0))
      .map((s) => this.clone(s))
  }

  private clone(stored: StoredSnapshot): StoredSnapshot {
    return JSON.parse(JSON.stringify(stored, replacer), reviver) as StoredSnapshot
  }
}

export function createInMemorySnapshotStore(): SnapshotStore {
  return new InMemorySnapshotStore()
}

// ============================================================
// Filesystem Implementation
// ============================================================

export class FileSystemSnapshotStore implements SnapshotStore {
  private readonly fs: FilesystemProvider

  constructor(private dir: string, fsProvider?: FilesystemProvider) {
    this.fs = fsProvider ?? createPosixFilesystemProvider(dir)
  }

  async save(stored: StoredSnapshot): Promise<void> {
    await this.fs.ensureDirectory(".")
    const name = this.fileName(stored.snapshot.id)

    if (await this.fs.pathExists(name)) {
      throw new Error(`INVARIANT_VIOLATION: snapshot ${stored.snapshot.id} already exists`)
    }

    const serialized = JSON.stringify(stored, replacer, 2)
    await this.fs.writeFile(name, serialized)
  }

  async get(snapshotId: string): Promise<StoredSnapshot | undefined> {
    const content = await this.fs.readFile(this.fileName(snapshotId))
    if (content === undefined) return undefined
    return this.loadVerified(snapshotId, content, new Set([snapshotId]))
  }

  async list(lineageId?: string): Promise<StoredSnapshot[]> {
    await this.fs.ensureDirectory(".")
    const entries = await this.fs.listDirectory(".")
    const snapshots: StoredSnapshot[] = []

    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue
      const content = await this.fs.readFile(entry)
      if (content === undefined) continue
      const stored = await this.loadVerified(entry, content, new Set())
      if (!lineageId || stored.snapshot.lineage?.lineageId === lineageId) {
        snapshots.push(stored)
      }
    }

    return snapshots.sort(
      (a, b) => (a.snapshot.lineage?.version ?? 0) - (b.snapshot.lineage?.version ?? 0),
    )
  }

  /**
   * Parse, migrate, and certify a stored snapshot record. The ancestor
   * chain is verified first: a snapshot with a lineage parent can only
   * be certified against its parent's signature, so a tampered ancestor
   * invalidates every descendant. Tampered or malformed files are
   * rejected loudly.
   */
  private async loadVerified(
    label: string,
    content: string,
    visited: Set<string>,
  ): Promise<StoredSnapshot> {
    let raw: StoredSnapshot
    try {
      raw = JSON.parse(content, reviver) as StoredSnapshot
    } catch (err) {
      throw new Error(
        `INVARIANT_VIOLATION: snapshot ${label} is malformed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    let stored: StoredSnapshot
    try {
      stored = migrateStoredSnapshot(raw)
    } catch (err) {
      throw new Error(
        `INVARIANT_VIOLATION: snapshot ${label} cannot be loaded: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    const parentId = stored.snapshot?.lineage?.parentId
    let parent: ApprovedMissionModelSnapshot | undefined
    if (typeof parentId === "string" && parentId.length > 0) {
      if (visited.has(parentId)) {
        throw new Error(`INVARIANT_VIOLATION: snapshot lineage cycle detected at ${parentId}`)
      }
      visited.add(parentId)
      const parentContent = await this.fs.readFile(this.fileName(parentId))
      if (parentContent === undefined) {
        throw new Error(
          `INVARIANT_VIOLATION: snapshot ${label} references missing lineage parent ${parentId}`,
        )
      }
      parent = (await this.loadVerified(parentId, parentContent, visited)).snapshot
    }

    const violations = certifySnapshot(stored, parent)
    if (violations.length > 0) {
      throw new Error(
        `INVARIANT_VIOLATION: snapshot ${label} failed certification: ${violations.join("; ")}`,
      )
    }

    return stored
  }

  private fileName(snapshotId: string): string {
    const safeId = snapshotId.replace(/[^a-zA-Z0-9_-]/g, "_")
    return `${safeId}.json`
  }
}

export function createFileSystemSnapshotStore(dir: string): SnapshotStore {
  return new FileSystemSnapshotStore(dir)
}

// ============================================================
// Serialization Helpers (Map support)
// ============================================================

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return { __type: "Map", value: Array.from(value.entries()) }
  }
  return value
}

function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value) && (value as any).__type === "Map") {
    return new Map((value as any).value)
  }
  return value
}
