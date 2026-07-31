# EXP-EVENTLOG-001 — Event-Log Query CLI

> Add a read-only `synth log` command so operators can query the governance event log without reading raw `.jsonl`.

**Status:** Executing  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective  
**Depends On:** EXP-CLI-002 (clean output), EXP-CAPTRANS-001 (capability transparency)  
**Blocks:** None

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Operators and agents currently read `.synth/data/event-log.jsonl` (or `data/event-log.jsonl` for ungoverned directories) directly to understand what happened. This is error-prone and requires knowing the event schema. A small, read-only query CLI makes the event log inspectable.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| L1 | No event-log query CLI; operators read raw JSONL | High | Fixed |
| L2 | Hard to correlate events with an expedition | Medium | Fixed |

---

## Deliverables

### 1. `synth log` command

Supported queries:

- `synth log` — last 50 events in reverse chronological order.
- `synth log --expedition <id>` — events whose `aggregateId` or metadata references the expedition.
- `synth log --mission <id>` — events whose `aggregateId` or metadata references the mission.
- `synth log --type <event-type>` — filter by event type (prefix match allowed).
- `synth log --since <iso>` — events at or after the given ISO timestamp.
- `synth log --limit <n>` — cap the result count (default 50, max 1000).
- `synth log --format table` — human-readable table (default is JSONL-like line JSON).
- `synth log --format json` — one JSON object per line on stdout.

### 2. Output contract

Machine mode (default / `--format json`) emits one JSON object per event on stdout, in reverse chronological order. No diagnostic logs on stdout.

Human mode (`--format table`) emits a table with columns:

- `offset` — event log sequence number.
- `timestamp` — ISO timestamp.
- `type` — event type.
- `aggregate` — affected aggregate id.
- `summary` — one-line description derived from payload.

Example:

```text
offset  timestamp                  type                aggregate    summary
20      2026-07-31T04:12:01Z       EXPEDITION_STARTED  13ab9c7      expedition 13ab9c7 → executing
19      2026-07-31T04:11:22Z       EXPEDITION_COMMITTED 13ab9c7      expedition 13ab9c7 → committed
```

---

## Design Notes

### Read-only by construction

`synth log` is a query command. It must not append events, modify `canonical-state.json`, or write to the event log. The implementation opens the log in read-only mode and streams events through a filter pipeline.

### Event-log location

The command discovers the active event log using the same logic as the rest of the CLI:

1. If `.synth/data/event-log.jsonl` exists, use it.
2. Otherwise, if `data/event-log.jsonl` exists, use it.
3. Otherwise, error with `NO_EVENT_LOG_FOUND` and a suggestion to run `synth init` or `synth bootstrap`.

### Filtering

Filters are combined with AND semantics:

- `--expedition <id>` matches events where `aggregateId === id` or any nested `expeditionId`/`id` field in the payload equals `id`.
- `--mission <id>` matches events where `aggregateId === id` or payload references the mission.
- `--type <prefix>` matches events whose `type` starts with the given prefix (case-sensitive).
- `--since <iso>` matches events whose `timestamp` is greater than or equal to the given ISO string.

### Formatting

- `json` format preserves the original event object and adds `offset`.
- `table` format truncates long payloads and is intended for terminal review.

### Performance

The implementation streams the log once. For logs larger than 10,000 events, `--limit` is applied after filtering to avoid unbounded output.

---

## Acceptance Criteria

1. `synth log` returns the last 50 events without mutating state.
2. `synth log --expedition <id>` returns only events related to that expedition.
3. `synth log --format table` produces readable prose output.
4. `synth log --format json` emits exactly one JSON object per line on stdout.
5. `--since`, `--type`, and `--limit` filters compose correctly.
6. Existing event-log tests still pass.
7. `npm run build` succeeds and targeted tests pass.

---

## Out of Scope

- Event-log modification (delete, revert, edit).
- Full-text search across event payloads.
- SQL-like query language.

---

## Governance

### Protected

- Event model (read-only access).
- Append-only event log.

### Not included

- New event types.
- Changes to replay semantics.

---

## Snapshot

- Implemented `synth log` with `--expedition`, `--mission`, `--type`, `--since`, `--limit`, and `--format` filters.
- Read-only: command never appends events or writes to canonical state.

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-CAPTRANS-001.md`
- `docs/expeditions/EXP-CLI-002.md`
