# Expedition 2c9c6c62 — Verification sees the whole event log

Measured on /home/user/synth, branch arena/841cc45d-synth. BEFORE lines were captured
from the pre-change build (dist rebuilt from HEAD), AFTER lines from the post-change build.

## 0. Correction to the drafted diagnosis (recorded first)

The draft asserted that `src/verification/context.ts` could not see the partitioned log and that
`ReplayIntegrity` therefore passed vacuously on this repository, including in the runs that certified
PR #343. **That was measured wrong.** `buildVerificationContext` already builds the partition-aware
store (`createInfra` -> `PartitionedEventStore`), `hasEventLog` is true, and `synth verify` reported
6/6 pass with a real message before any edit. The correction was appended to the ledger with
`expedition refine` rather than by re-drafting, because the ledger is append-only.

What was actually broken is narrower and is fixed below: the *presence and location* of the event log
was answered by private path tests against the legacy monolithic file in three operator-facing places.

## 1. `synth log` told the operator their ledger did not exist

BEFORE (449 events on disk):
    {"status":"error","kind":"CLIError",
     "error":"No event log found at /home/user/synth/.synth/data/event-log.jsonl. Run 'synth init' or 'synth bootstrap' first.",
     "nextStep":"synth bootstrap . --approve"}

AFTER:
    {"status":"ok","kind":"EventLogQuery","layout":"segmented","total":449,"matched":449,"returned":2}
    newest event: EXPEDITION_REFINED at offset 449 (offsets are global log positions, not segment order)

The documented read-only query verb was instructing operators to re-bootstrap a healthy ledger.
Chunked layouts are read through `sdk.events.readEvents` (global order); concatenating segment files
would have produced wrong offsets, because partitions are routed by aggregate key.

## 2. `synth checkpoint` replay step certified nothing

BEFORE: {"ok": true, "detail": "No event log present; replay skipped"}
AFTER:  {"ok": true, "detail": "Event log consistent (449 events, segmented layout)"}

`ok: true` either way — the vacuous green is the point. It now reports the event count and the layout
that was actually examined.

## 3. `synth doctor` chain check skipped for the same reason

BEFORE: {"ok":true,"detail":"No event log present; chain skipped"}
AFTER:  {"ok":true,"detail":"449 event(s) chained (segmented layout)"}

For a legacy-only project the chain check now reads that file directly instead of asking the chunked
reader (which would have returned zero events and reported "Event log is empty" — the same lie).

## 4. A log-less project no longer reports a pass it did not earn

BEFORE (empty temp project): summary {"total":6,"pass":6,"fail":0,"warn":0}
    ReplayIntegrity: pass — "No event log present; replay integrity is vacuously satisfied."
AFTER:                     summary {"total":6,"pass":5,"fail":0,"warn":0,"skipped":1}
    ReplayIntegrity: skipped, skippedReason "no-event-log" —
    "No event log present (checked the chunked event-stream store and the legacy monolithic file); replay integrity was not checked."
    `synth verify` still exits 0: a skipped check is not a failure, and the completion gate (EXP-GATE-014)
    is fail-based, so nothing that used to work now blocks.

`CheckStatus` gained a fourth value; `VerificationSummary` gained `skipped`; `LifecycleDryRun.verifyResult`
reports it too, so a 5-of-6 tally cannot silently look like a shrinking pass count.

## 5. One authority, three layouts

`locateEventLog(root)` in src/infra/event-store.ts answers presence + layout + paths for:
  segmented        <data>/event-stream/partition-<n>/segment-XXXX.jsonl   (current write layout)
  partitioned-flat <data>/event-stream/partition-<n>.jsonl                (PartitionStore, legacy read)
  legacy-file      <data>/event-log.jsonl                                 (pre-chunking)
Precedence segmented > partitioned-flat > legacy-file, so a migrated project reports the layout it reads
from. It never throws (absent root -> layout "none") and takes the root explicitly, unlike the module-level
EVENT_LOG_FILE / EVENT_STREAM_DIR constants which are bound to process.cwd() at import time.
`PartitionStore.filePath` is now documented as a legacy read path with a warning not to existence-test it.
`buildVerificationContext` consults the same authority instead of keeping a second private notion of presence.

## 6. Measured, not assumed — left alone deliberately

* `src/verification/context.ts` was already partition-aware (see §0); only its presence test was unified.
* `resolveExplainPaths` (src/cli/explain-paths.ts) already reports streamDir/logDisplay for the chunked
  layout, and `synth explain paths` is not a CLI verb (`synth explain <replay|lineage|proposals|snapshots|graph|diagnostics|status|all>`),
  so the explain family needed no change.
* first-contact.ts:746/780/826, bootstrap-apply.ts:235, migrate.ts:26 and synth.ts:3131 pass
  `eventLogPath: sdk.paths.eventLogFile(...)` **into** `createInfra` as the legacy->chunked migration
  input. That is legitimate and was kept; only presence tests were forbidden.

## 7. Tests

tests/verify-engine.test.js (already registered as test:verify-engine and included in test:all, so
`npm run govern` executes it) — 10/10 PASS:
  5 pre-existing, with the uninitialized-project assertion changed from "pass === 6" to
  "pass === 5 && skipped === 1 && ReplayIntegrity === skipped && skippedReason === no-event-log"
  (that assertion is what encoded the vacuous pass as expected behaviour), plus 5 new:
  - locateEventLog across all three layouts, precedence, sorted paths, absent root
  - chunked ledger visible end-to-end: `synth log` (status ok, layout segmented, real offsets),
    `synth checkpoint` replay step (no "No event log present", reports a count),
    `synth doctor` replay + eventChain, and `synth verify` skipped === 0
  - legacy single-file layout still located and still queryable with unchanged offsets
  - source-level regression guard: synth.ts must import and call locateEventLog, must not contain
    `const logPath = sdk.paths.eventLogFile(`, and must still pass the legacy path to infra as
    migration input

Task suites PASS: verify-engine, first-operator-experience, synth-cli, replay, replay-graph-integrity,
graph-integrity, explain-observability, installer-verify.
node:test PASS: event-log-query 10/10, discovery-replay 9/9, replay-verifier-status 3/3,
event-log-lineage 1/1, initialization-replay 1/1.

Pre-existing failures, reproduced identically on a stashed clean baseline build, NOT caused by this change:
  lifecycle-dry-run 4 (stateDelta reads "unknown -> approved"; no hunk here touches stateDelta)
  first-contact-verify 1 (dist export RuleBasedCapabilityVerifier missing)
  first-contact-replay 1 (state divergence in materialized replay)

Repo state after the change: `synth verify` ok {"total":6,"pass":6,"fail":0,"warn":0,"skipped":0},
ReplayIntegrity pass "(449 events)"; `synth checkpoint` ok on branch arena/841cc45d-synth with
executing expedition 2c9c6c62a727ece8.
