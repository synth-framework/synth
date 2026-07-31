// ============================================================
// EXP-GOV-024 — Replay Verifier Status Enum
// ============================================================
// Verifies that the replay verifier accepts the "committed" expedition
// status, which is used by EXPEDITION_COMMITTED and EXPEDITION_AUTHORIZED.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { EventStore } from "../dist/infra/event-store.js"
import { InMemoryStateStore } from "../dist/infra/state-store.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"

function makeEvent(type, payload) {
  return {
    id: `evt-${type}`,
    type,
    timestamp: 1,
    transactionId: "tx-test",
    capability: "test",
    actor: "test",
    payload,
  }
}

function writeTmpLog(events) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "replay-verifier-status-"))
  const logPath = path.join(dir, "event-log.jsonl")
  fs.writeFileSync(logPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n")
  return logPath
}

test("committed expedition status does not produce structural divergence", async () => {
  const events = [
    makeEvent("MISSION_CREATED", {
      mission: {
        id: "m1",
        name: "Mission 1",
        purpose: "purpose",
        status: "active",
        expeditions: [],
        metadata: {},
        createdAt: 1,
        updatedAt: 1,
      },
    }),
    makeEvent("EXPEDITION_CREATED", {
      expedition: {
        id: "e1",
        missionId: "m1",
        name: "Expedition 1",
        goal: "goal",
        status: "committed",
        objectives: [],
        discoveries: [],
        decisions: [],
        dependsOn: [],
        metadata: {},
        createdAt: 1,
        updatedAt: 1,
      },
    }),
  ]

  const logPath = writeTmpLog(events)
  const verifier = createReplayVerifier(new EventStore(logPath), new InMemoryStateStore())
  const report = await verifier.verify()

  const structuralDivergences = report.divergences.filter((d) =>
    d.key === "expedition.e1.status" && d.replayed === "valid_status_required"
  )
  assert.deepStrictEqual(structuralDivergences, [], "committed status should not be reported as valid_status_required")
})
