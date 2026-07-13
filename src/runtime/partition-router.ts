// ============================================================
// RUNTIME: Partition Router + Producer + Consumer
// ============================================================
// Kafka-like semantics: partitioned append-only log with
// deterministic routing, consumer groups, and offset tracking.
// ============================================================

import crypto from "crypto"
import type { PartitionedEvent, ConsumerCheckpoint } from "../types/index.js"
import { stableStringify } from "../core/hash.js"
import { PartitionStore } from "../infra/event-store.js"
import type { ICheckpointStore } from "../infra/checkpoint-store.js"
import { rebuildState } from "./replay.js"

function deterministicPartitionEventId(params: {
  type: string
  partitionKey: string
  partition: number
  offset: number
  transactionId: string
}): string {
  const data = JSON.stringify({
    type: params.type,
    partitionKey: params.partitionKey,
    partition: params.partition,
    offset: params.offset,
    transactionId: params.transactionId,
  })
  return crypto.createHash("sha256").update(data).digest("hex")
}

/** Partition router — deterministic key → partition mapping */
export class PartitionRouter {
  private partitionCount: number

  constructor(partitionCount: number = 4) {
    this.partitionCount = partitionCount
  }

  /** Route a key to a partition using stable hash */
  route(key: string): number {
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash + char) | 0
    }
    return Math.abs(hash) % this.partitionCount
  }
}

/** Event producer — writes events to partitioned log */
export class EventProducer {
  constructor(
    private store: PartitionStore,
    private router: PartitionRouter
  ) {}

  /** Produce an event */
  async produce(params: {
    partitionKey: string
    type: string
    payload: Record<string, unknown>
    actor: string
    capability: string
    transactionId: string
  }): Promise<PartitionedEvent> {
    const partition = this.router.route(params.partitionKey)
    const lastOffset = await this.store.getLastOffset(partition)
    const offset = lastOffset + 1

    const previousHash = crypto
      .createHash("sha256")
      .update(`partition-${partition}-offset-${offset - 1}`)
      .digest("hex")
    const eventBase = {
      id: deterministicPartitionEventId({
        type: params.type,
        partitionKey: params.partitionKey,
        partition,
        offset,
        transactionId: params.transactionId,
      }),
      type: params.type,
      timestamp: offset,
      transactionId: params.transactionId,
      capability: params.capability,
      actor: params.actor,
      payload: params.payload,
      partitionKey: params.partitionKey,
      partition,
      offset,
      previousHash,
    }
    const event: PartitionedEvent = {
      ...eventBase,
      eventHash: crypto.createHash("sha256").update(stableStringify(eventBase)).digest("hex"),
    }

    await this.store.append(partition, event)
    return event
  }

  /** Produce multiple events */
  async produceBatch(
    params: {
      partitionKey: string
      actor: string
      capability: string
      transactionId: string
    },
    events: Array<{ type: string; payload: Record<string, unknown> }>
  ): Promise<PartitionedEvent[]> {
    const produced: PartitionedEvent[] = []

    for (const event of events) {
      const pe = await this.produce({
        ...params,
        type: event.type,
        payload: event.payload,
      })
      produced.push(pe)
    }

    return produced
  }
}

/** Consumer group — replays events and builds state */
export class ConsumerGroup {
  private groupId: string
  private partitionCount: number

  constructor(
    groupId: string,
    private store: PartitionStore,
    private checkpoints: ICheckpointStore,
    partitionCount: number = 4
  ) {
    this.groupId = groupId
    this.partitionCount = partitionCount
  }

  /** Initialize checkpoints for this group */
  async initialize(): Promise<void> {
    await this.checkpoints.initCheckpoints(this.groupId, this.partitionCount)
  }

  /** Replay all events from all partitions (full rebuild) */
  async replayAll(): Promise<PartitionedEvent[]> {
    const allEvents: PartitionedEvent[] = []

    for (let i = 0; i < this.partitionCount; i++) {
      const events = await this.store.readPartition(i)
      allEvents.push(...events)
    }

    // Sort by offset for deterministic ordering
    return allEvents.sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  }

  /** Consume events from a partition starting from checkpoint */
  async consumePartition(partition: number): Promise<PartitionedEvent[]> {
    const checkpoint = this.checkpoints.get(this.groupId, partition)
    const startOffset = checkpoint?.lastCommittedOffset ?? 0

    const events = await this.store.readPartition(partition)
    return events.filter((e) => (e.offset ?? 0) > startOffset)
  }

  /** Consume all new events across all partitions */
  async consumeAll(): Promise<PartitionedEvent[]> {
    const allEvents: PartitionedEvent[] = []

    for (let i = 0; i < this.partitionCount; i++) {
      const events = await this.consumePartition(i)
      allEvents.push(...events)
    }

    return allEvents.sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  }

  /** Commit offset for a partition */
  async commitOffset(partition: number, offset: number): Promise<void> {
    await this.checkpoints.commit({
      consumerGroup: this.groupId,
      partition,
      lastCommittedOffset: offset,
      updatedAt: offset,
    })
  }

  /** Build state from all events (full replay) */
  async buildState(): Promise<ReturnType<typeof rebuildState>> {
    const events = await this.replayAll()
    return rebuildState(events)
  }

  /** Get current checkpoint positions */
  async getCheckpoints(): Promise<ConsumerCheckpoint[]> {
    return this.checkpoints.getForGroup(this.groupId)
  }
}
