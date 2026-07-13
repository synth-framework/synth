// ============================================================
// MISSION STUDIO: Snapshot Store
// ============================================================
// Durable storage for ApprovedMissionModelSnapshots and the
// PlanningSessions that produced them.
//
// Snapshots are immutable. The store enforces immutability by
// refusing to overwrite an existing snapshot.
// ============================================================

import fs from "fs/promises"
import path from "path"
import type { StoredSnapshot, ApprovedMissionModelSnapshot, PlanningSession } from "./types.js"

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
  constructor(private dir: string) {}

  async save(stored: StoredSnapshot): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true })
    const filePath = this.filePath(stored.snapshot.id)

    try {
      await fs.access(filePath)
      throw new Error(`INVARIANT_VIOLATION: snapshot ${stored.snapshot.id} already exists`)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
    }

    const serialized = JSON.stringify(stored, replacer, 2)
    await fs.writeFile(filePath, serialized, "utf-8")
  }

  async get(snapshotId: string): Promise<StoredSnapshot | undefined> {
    const filePath = this.filePath(snapshotId)
    try {
      const content = await fs.readFile(filePath, "utf-8")
      return JSON.parse(content, reviver) as StoredSnapshot
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined
      throw err
    }
  }

  async list(lineageId?: string): Promise<StoredSnapshot[]> {
    await fs.mkdir(this.dir, { recursive: true })
    const entries = await fs.readdir(this.dir)
    const snapshots: StoredSnapshot[] = []

    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue
      const content = await fs.readFile(path.join(this.dir, entry), "utf-8")
      const stored = JSON.parse(content, reviver) as StoredSnapshot
      if (!lineageId || stored.snapshot.lineage?.lineageId === lineageId) {
        snapshots.push(stored)
      }
    }

    return snapshots.sort(
      (a, b) => (a.snapshot.lineage?.version ?? 0) - (b.snapshot.lineage?.version ?? 0),
    )
  }

  private filePath(snapshotId: string): string {
    const safeId = snapshotId.replace(/[^a-zA-Z0-9_-]/g, "_")
    return path.join(this.dir, `${safeId}.json`)
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
