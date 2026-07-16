# Evidence Archive B — Canonical Journey, Re-recorded

This directory contains the raw evidence produced by re-executing the canonical
First Contact Mission on the **hardened pipeline** (post EXP-PROGRAM-010), as
specified by **EXP-FIRSTCONTACT-009**.

Same mission. Same architecture. Hardened implementation.

## Relationship to Archive A

Archive A (`../evidence-archive/`) is the original pre-hardening recording. It is
replay-consistent but carries 36 known semantic graph violations, preserved
immutably as forensic evidence (PROGRAM-010 finding F2; integrity pinned by
`../evidence-archive/archive-a.sha256`).

Archive B is the same canonical Mission re-executed after hardening:

| Property | Archive A | Archive B |
|---|---|---|
| Recorded | 2026-07-15 (pre-hardening) | 2026-07-16 (post-hardening) |
| Events | 32 | 32 |
| Event type census | 12 types | identical to A |
| Replay consistent | yes | yes |
| Graph violations | 36 (12 broken-parent / 12 orphan / 12 broken-navigation) | **0** |
| `--strict-graph` | fails | **passes** |
| Snapshot artifacts | not persisted | persisted, signed, certified |
| Producer | assembled manually | reproducible: `node scripts/run.js` |

## Files

| File | Description |
|---|---|
| `events.jsonl` | Complete event log (32 events) from Genesis through Mission completion. |
| `replay-report.json` | Replay verification report re-derived from the archived log itself: consistent, chain valid, graph valid, zero violations. |
| `proof.json` | Example proof artifact certifying the execution (includes `graphValid` and `snapshotPersisted`). |
| `snapshots/` | Approved planning snapshot artifact, signed and certified on load (snapshot storage contract, EXP-HARDEN-002). |
| `commands.json` | Ordered list of human prompts and CLI invocations mapped to episodes. |
| `timeline.json` | Mapping of events to First Contact Specification episodes. |

## Re-record

Archive B is reproducible. From this example directory:

```bash
node scripts/run.js
```

The recording is strict: replay inconsistency or any aggregate graph violation
fails the run. Re-running replaces this archive with the new recording.

## Verification

From the repository root:

```bash
node scripts/verify-replay.js --log examples/first-contact/recorded-journey/evidence-archive-b/events.jsonl --strict-graph
```

Expected: 32 events, chain valid, consistent, graph valid, zero violations.

## Provenance

- Generated: 2026-07-16T03:58:02.246Z
- Mission: Space Mission Tracking Application
- Events: 32 (identical type census to Archive A)
- Replay: consistent; live hash == replay hash (`1824574964`)
- Graph: valid under `--strict-graph` (0 violations)
- Snapshot: `snapshots/7abf921b3a267bcf.json` (signature and proposal graph certified on load)
- Proof: passed
