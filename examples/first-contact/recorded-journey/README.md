# Recorded Journey — First Contact

This directory contains the canonical recorded journey for the SYNTH First Contact experience.

## Artifacts

The recorded journey is intentionally split into three artifacts, following the SYNTH projection pattern:

```text
Reality
    ↓
Authoritative Source
    ↓
Deterministic Projection
    ↓
Consumer Experience
```

### 1. Raw Recording

File: `raw-recording.md`

The complete narrative transcript of the canonical Mission execution. It includes human prompts, representative AI-agent reasoning, actual CLI invocations, and actual SYNTH event output.

### 2. Educational Projection

File: `educational-projection.md`

The raw recording mapped onto the First Contact Specification episodes, with suggested clip lengths, narrative focus, and evidence references. This is the source for website pages, video clips, tutorials, and conference demos.

### 3. Evidence Archives

Two archives preserve the same canonical Mission:

- `evidence-archive/` — **Archive A**: the original pre-hardening recording, preserved immutably as forensic evidence (EXP-PROGRAM-010 finding F2; integrity pinned by `archive-a.sha256`).
- `evidence-archive-b/` — **Archive B**: the same Mission re-executed on the hardened pipeline (EXP-FIRSTCONTACT-009), reproducible via `node scripts/run.js` from `examples/first-contact/`.

Archive A's raw assets:

- `events.jsonl` — 32 immutable events
- `replay-report.json` — Replay verification output
- `proof.json` — Example proof artifact
- `commands.json` — Ordered human prompts and CLI invocations
- `timeline.json` — Mapping of events to First Contact episodes

Archive B carries the same artifacts plus `snapshots/` (signed, certified planning snapshot), with zero aggregate graph violations under `--strict-graph`.

## Canonical Mission

**Build me a Space Mission Tracking Application.**

Track space missions, crew assignments, and launch windows with a simple, realistic implementation.

## Execution Summary

Archive A (original recording):

- Generated: 2026-07-15T01:43:26.469Z
- Events: 32
- Replay: consistent
- State hash: 707567213
- Proof: passed

Archive B (hardened re-recording, EXP-FIRSTCONTACT-009):

- Generated: 2026-07-16T03:58:02.246Z
- Events: 32 (identical event-type census)
- Replay: consistent; graph valid under `--strict-graph` (0 violations)
- State hash: 1824574964
- Proof: passed

## Relationship to EXP-PROGRAM-009

- EXP-FIRSTCONTACT-002 defined the First Contact Specification.
- EXP-FIRSTCONTACT-003 (this artifact) produced the canonical recorded journey.
- EXP-FIRSTCONTACT-004 will project this journey into public experiences.
- EXP-FIRSTCONTACT-009 re-recorded the journey on the hardened pipeline (Archive B) and preserved Archive A as immutable forensic evidence.
