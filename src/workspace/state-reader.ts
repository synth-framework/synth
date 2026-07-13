// ============================================================
// WORKSPACE: StateReader adapter
// ============================================================
// Adapts infrastructure stores to the read-only StateReader
// interface used by the workspace subsystem.
// ============================================================

import { EventStore } from "../infra/event-store.js"
import { IStateStore } from "../infra/state-store.js"
import { rebuildState } from "../runtime/replay.js"
import { ReplayVerifier } from "../core/replay-verifier.js"
import type { StateReader, HealthReport, HealthCheck } from "./types.js"

export type StateReaderDeps = {
  eventStore: EventStore
  stateStore: IStateStore
}

export function createStateReader(deps: StateReaderDeps): StateReader {
  return new InfraStateReader(deps)
}

class InfraStateReader implements StateReader {
  constructor(private deps: StateReaderDeps) {}

  async loadState() {
    const stored = await this.deps.stateStore.load()
    if (stored) return stored
    const events = await this.deps.eventStore.loadAll()
    return rebuildState(events)
  }

  async loadEvents() {
    return this.deps.eventStore.loadAll()
  }

  async checkHealth(): Promise<HealthReport> {
    const checks: HealthCheck[] = []
    try {
      await this.deps.eventStore.loadAll()
      checks.push({ name: "event_store_readable", status: "pass" })
    } catch (err) {
      checks.push({ name: "event_store_readable", status: "fail", detail: (err as Error).message })
    }

    try {
      await this.deps.stateStore.load()
      checks.push({ name: "state_store_readable", status: "pass" })
    } catch (err) {
      checks.push({ name: "state_store_readable", status: "fail", detail: (err as Error).message })
    }

    return {
      status: checks.every((c) => c.status === "pass") ? "healthy" : "unhealthy",
      checks,
      summary: {
        pass: checks.filter((c) => c.status === "pass").length,
        warn: checks.filter((c) => c.status === "warn").length,
        fail: checks.filter((c) => c.status === "fail").length,
      },
    }
  }

  async verifyReplay() {
    const verifier = new ReplayVerifier(this.deps.eventStore, this.deps.stateStore)
    return verifier.verify()
  }
}
