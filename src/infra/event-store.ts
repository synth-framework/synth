// ============================================================
// INFRA: Event Store (Append-Only Log)
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import type { SynthEvent, PartitionedEvent } from "../types/index.js"
import { IllegalMutationError } from "../core/errors.js"
import { dataDir } from "../sdk/paths/index.js"

const EVENT_LOG_FILE = path.join(dataDir(process.cwd()), "event-log.jsonl")
const EVENT_STREAM_DIR = path.join(dataDir(process.cwd()), "event-stream")

/** Module-private authorization token for EventStore writes.
 *  Only createGuardedEventStore can obtain it, ensuring writes flow
 *  through the single mutation authority.
 */
export const EVENT_STORE_WRITE_TOKEN = Symbol("EVENT_STORE_WRITE_TOKEN")

export class EventStore {
  private filePath: string
  private authorized: boolean

  constructor(filePath?: string, authToken?: symbol) {
    this.filePath = filePath ?? EVENT_LOG_FILE
    this.authorized = authToken === EVENT_STORE_WRITE_TOKEN
  }

  /** Return the canonical event log path, or undefined for in-memory stores. */
  getFilePath(): string | undefined {
    return this.filePath
  }

  /** Return the directory containing the event log, or undefined for in-memory stores. */
  getDataDir(): string | undefined {
    const filePath = this.getFilePath()
    return filePath ? path.dirname(filePath) : undefined
  }

  /** Create an authorized EventStore instance for the guarded wrapper. */
  static createAuthorized(filePath?: string): EventStore {
    return new EventStore(filePath, EVENT_STORE_WRITE_TOKEN)
  }

  protected ensureAuthorized(): void {
    if (!this.authorized) {
      throw new IllegalMutationError(
        "ILLEGAL_EVENTSTORE_WRITE: EventStore writes must pass through the ExecutionGate. " +
          "Direct instantiation of EventStore is not an authorized mutation path."
      )
    }
  }

  async initialize(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
  }

  async append(event: SynthEvent, _authToken?: symbol): Promise<void> {
    this.ensureAuthorized()
    const line = JSON.stringify(event) + "\n"
    await fs.appendFile(this.filePath, line)
  }

  async appendBatch(events: SynthEvent[], _authToken?: symbol): Promise<void> {
    this.ensureAuthorized()
    if (events.length === 0) return
    const lines = events.map((e: SynthEvent) => JSON.stringify(e)).join("\n") + "\n"
    await fs.appendFile(this.filePath, lines)
  }

  async loadAll(): Promise<SynthEvent[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8")
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line: string) => JSON.parse(line))
    } catch {
      return []
    }
  }

  async count(): Promise<number> {
    const events = await this.loadAll()
    return events.length
  }

  async getLastEvent(): Promise<SynthEvent | null> {
    const events = await this.loadAll()
    return events.length > 0 ? events[events.length - 1] : null
  }
}

/** In-memory event store (memory persistence mode).
 *  Never touches the filesystem: `persistence: "memory"` must not fall
 *  back to the default canonical log path (EXP-HARDEN-006). Carries the
 *  same write authorization as the file-backed store, so ExecutionGate
 *  remains the single mutation authority. */
export class InMemoryEventStore extends EventStore {
  private events: SynthEvent[] = []

  constructor() {
    super(undefined, EVENT_STORE_WRITE_TOKEN)
  }

  override getFilePath(): string | undefined {
    return undefined
  }

  async initialize(): Promise<void> {}

  async append(event: SynthEvent, _authToken?: symbol): Promise<void> {
    this.ensureAuthorized()
    this.events.push(JSON.parse(JSON.stringify(event)))
  }

  async appendBatch(events: SynthEvent[], _authToken?: symbol): Promise<void> {
    this.ensureAuthorized()
    for (const event of events) {
      this.events.push(JSON.parse(JSON.stringify(event)))
    }
  }

  async loadAll(): Promise<SynthEvent[]> {
    return this.events.map((event) => JSON.parse(JSON.stringify(event)))
  }

  async count(): Promise<number> {
    return this.events.length
  }

  async getLastEvent(): Promise<SynthEvent | null> {
    const last = this.events[this.events.length - 1]
    return last ? JSON.parse(JSON.stringify(last)) : null
  }
}

export const PARTITION_STORE_WRITE_TOKEN = Symbol("PARTITION_STORE_WRITE_TOKEN")
export const SEGMENT_STORE_WRITE_TOKEN = Symbol("SEGMENT_STORE_WRITE_TOKEN")

export class PartitionStore {
  static createAuthorized(partitionCount?: number, baseDir?: string): PartitionStore {
    return new PartitionStore(partitionCount, baseDir, PARTITION_STORE_WRITE_TOKEN)
  }

  private baseDir: string
  private partitionCount: number
  private authorized: boolean

  constructor(partitionCount: number = 4, baseDir: string = EVENT_STREAM_DIR, authToken?: symbol) {
    this.partitionCount = partitionCount
    this.baseDir = baseDir
    this.authorized = authToken === PARTITION_STORE_WRITE_TOKEN
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true })
  }

  private filePath(partition: number): string {
    return path.join(this.baseDir, `partition-${partition}.jsonl`)
  }

  route(key: string): number {
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash + char) | 0
    }
    return Math.abs(hash) % this.partitionCount
  }

  protected ensureAuthorized(): void {
    if (!this.authorized) {
      throw new IllegalMutationError(
        "ILLEGAL_PARTITIONSTORE_WRITE: PartitionStore writes must pass through the ExecutionGate. " +
          "Direct instantiation of PartitionStore is not an authorized mutation path."
      )
    }
  }

  async append(partition: number, event: PartitionedEvent): Promise<void> {
    this.ensureAuthorized()
    const file = this.filePath(partition)
    await fs.mkdir(path.dirname(file), { recursive: true })
    const line = JSON.stringify(event) + "\n"
    await fs.appendFile(file, line)
  }

  async readPartition(partition: number): Promise<PartitionedEvent[]> {
    try {
      const file = this.filePath(partition)
      const raw = await fs.readFile(file, "utf-8")
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line: string) => JSON.parse(line))
    } catch {
      return []
    }
  }

  async readAll(): Promise<PartitionedEvent[]> {
    const all: PartitionedEvent[] = []
    for (let i = 0; i < this.partitionCount; i++) {
      const events = await this.readPartition(i)
      all.push(...events)
    }
    return all.sort((a: PartitionedEvent, b: PartitionedEvent) => (a.offset ?? 0) - (b.offset ?? 0))
  }

  async getLastOffset(partition: number): Promise<number> {
    const events = await this.readPartition(partition)
    if (events.length === 0) return 0
    return events[events.length - 1].offset ?? 0
  }
}

export class SegmentStore {
  static createAuthorized(maxSegmentSize?: number, baseDir?: string): SegmentStore {
    return new SegmentStore(maxSegmentSize, baseDir, SEGMENT_STORE_WRITE_TOKEN)
  }
  private baseDir: string
  private maxSegmentSize: number
  private authorized: boolean

  constructor(maxSegmentSize: number = 1000, baseDir: string = EVENT_STREAM_DIR, authToken?: symbol) {
    this.maxSegmentSize = maxSegmentSize
    this.baseDir = baseDir
    this.authorized = authToken === SEGMENT_STORE_WRITE_TOKEN
  }

  private segmentDir(partition: number): string {
    return path.join(this.baseDir, `partition-${partition}`)
  }

  private segmentPath(partition: number, segmentId: string): string {
    return path.join(this.segmentDir(partition), `${segmentId}.jsonl`)
  }

  private async getCurrentSegmentId(partition: number): Promise<string> {
    const dir = this.segmentDir(partition)
    await fs.mkdir(dir, { recursive: true })

    try {
      const files = await fs.readdir(dir)
      const segments = files
        .filter((f: string) => f.endsWith(".jsonl"))
        .sort()

      if (segments.length === 0) return "segment-0001"

      const currentSegment = segments[segments.length - 1]
      const currentPath = path.join(dir, currentSegment)
      const raw = await fs.readFile(currentPath, "utf-8")
      const eventCount = raw.split("\n").filter(Boolean).length

      if (eventCount >= this.maxSegmentSize) {
        const num = parseInt(segments[segments.length - 1].replace("segment-", "").replace(".jsonl", ""))
        return `segment-${String(num + 1).padStart(4, "0")}`
      }

      return currentSegment.replace(".jsonl", "")
    } catch {
      return "segment-0001"
    }
  }

  protected ensureAuthorized(): void {
    if (!this.authorized) {
      throw new IllegalMutationError(
        "ILLEGAL_SEGMENTSTORE_WRITE: SegmentStore writes must pass through the ExecutionGate. " +
          "Direct instantiation of SegmentStore is not an authorized mutation path."
      )
    }
  }

  async append(partition: number, event: PartitionedEvent): Promise<void> {
    this.ensureAuthorized()
    const segmentId = await this.getCurrentSegmentId(partition)
    const file = this.segmentPath(partition, segmentId)
    const line = JSON.stringify(event) + "\n"
    await fs.appendFile(file, line)
  }

  async readSegment(partition: number, segmentId: string): Promise<PartitionedEvent[]> {
    try {
      const file = this.segmentPath(partition, segmentId)
      const raw = await fs.readFile(file, "utf-8")
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line: string) => JSON.parse(line))
    } catch {
      return []
    }
  }

  async readPartition(partition: number): Promise<PartitionedEvent[]> {
    const dir = this.segmentDir(partition)
    try {
      const files = await fs.readdir(dir)
      const all: PartitionedEvent[] = []

      for (const file of files.filter((f: string) => f.endsWith(".jsonl")).sort()) {
        const segmentId = file.replace(".jsonl", "")
        const events = await this.readSegment(partition, segmentId)
        all.push(...events)
      }

      return all
    } catch {
      return []
    }
  }
}
