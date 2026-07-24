// ============================================================
// INFRA: Checkpoint Store
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import type { ConsumerCheckpoint } from "../types/index.js"
import { dataDir } from "../sdk/paths/index.js"

const CHECKPOINT_FILE = path.join(dataDir(process.cwd()), "checkpoints.json")

export interface ICheckpointStore {
  initialize(): Promise<void>
  get(group: string, partition: number): ConsumerCheckpoint | undefined
  commit(checkpoint: ConsumerCheckpoint): Promise<void>
  reset(group: string, partition: number, timestamp?: number): Promise<void>
  getForGroup(group: string): ConsumerCheckpoint[]
  initCheckpoints(group: string, partitionCount: number, timestamp?: number): Promise<void>
}

export class CheckpointStore implements ICheckpointStore {
  private filePath: string
  private cache: Map<string, ConsumerCheckpoint> = new Map()
  private dirty = false

  constructor(filePath: string = CHECKPOINT_FILE) {
    this.filePath = filePath
  }

  async initialize(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    await this.loadAll()
  }

  private key(group: string, partition: number): string {
    return `${group}:${partition}`
  }

  async loadAll(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8")
      const data = JSON.parse(raw) as Record<string, ConsumerCheckpoint>
      this.cache.clear()
      for (const [key, value] of Object.entries(data)) {
        this.cache.set(key, value)
      }
      this.dirty = false
    } catch {
      this.cache.clear()
    }
  }

  async save(): Promise<void> {
    if (!this.dirty) return
    const data: Record<string, ConsumerCheckpoint> = {}
    for (const [key, value] of this.cache.entries()) {
      data[key] = value
    }
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2))
    this.dirty = false
  }

  get(group: string, partition: number): ConsumerCheckpoint | undefined {
    return this.cache.get(this.key(group, partition))
  }

  async commit(checkpoint: ConsumerCheckpoint): Promise<void> {
    const key = this.key(checkpoint.consumerGroup, checkpoint.partition)
    // Preserve the caller-provided updatedAt; do not discover wall-clock time here.
    this.cache.set(key, { ...checkpoint })
    this.dirty = true
    await this.save()
  }

  async reset(group: string, partition: number, timestamp?: number): Promise<void> {
    const key = this.key(group, partition)
    this.cache.set(key, {
      consumerGroup: group,
      partition,
      lastCommittedOffset: 0,
      updatedAt: timestamp ?? Date.now(),
    })
    this.dirty = true
    await this.save()
  }

  getForGroup(group: string): ConsumerCheckpoint[] {
    return Array.from(this.cache.values()).filter(
      (cp) => cp.consumerGroup === group
    )
  }

  async initCheckpoints(group: string, partitionCount: number, timestamp?: number): Promise<void> {
    const now = timestamp ?? Date.now()
    for (let i = 0; i < partitionCount; i++) {
      const key = this.key(group, i)
      if (!this.cache.has(key)) {
        this.cache.set(key, {
          consumerGroup: group,
          partition: i,
          lastCommittedOffset: 0,
          updatedAt: now,
        })
      }
    }
    this.dirty = true
    await this.save()
  }
}

export class InMemoryCheckpointStore implements ICheckpointStore {
  async initialize(): Promise<void> {}

  private checkpoints = new Map<string, ConsumerCheckpoint>()

  get(group: string, partition: number): ConsumerCheckpoint | undefined {
    return this.checkpoints.get(`${group}:${partition}`)
  }

  async commit(checkpoint: ConsumerCheckpoint): Promise<void> {
    // Preserve the caller-provided updatedAt; do not discover wall-clock time here.
    this.checkpoints.set(
      `${checkpoint.consumerGroup}:${checkpoint.partition}`,
      { ...checkpoint }
    )
  }

  async reset(group: string, partition: number, timestamp?: number): Promise<void> {
    this.checkpoints.set(`${group}:${partition}`, {
      consumerGroup: group,
      partition,
      lastCommittedOffset: 0,
      updatedAt: timestamp ?? Date.now(),
    })
  }

  getForGroup(group: string): ConsumerCheckpoint[] {
    return Array.from(this.checkpoints.values()).filter(
      (cp) => cp.consumerGroup === group
    )
  }

  async initCheckpoints(group: string, partitionCount: number, timestamp?: number): Promise<void> {
    const now = timestamp ?? Date.now()
    for (let i = 0; i < partitionCount; i++) {
      const key = `${group}:${i}`
      if (!this.checkpoints.has(key)) {
        this.checkpoints.set(key, {
          consumerGroup: group,
          partition: i,
          lastCommittedOffset: 0,
          updatedAt: now,
        })
      }
    }
  }
}
