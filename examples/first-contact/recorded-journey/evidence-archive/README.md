# Evidence Archive — Canonical Recorded Journey

> **Archive A — Immutable Historical Evidence (pinned 2026-07-16)**
>
> This archive was produced **before EXP-PROGRAM-010 (Constitutional Hardening)**.
> It is replay-consistent but carries 36 known semantic graph violations
> (12 broken-parent / 12 orphan / 12 broken-navigation), preserved deliberately
> as pre-hardening forensic evidence (PROGRAM-010 finding F2).
>
> **Do not modify, regenerate, or delete any file in this directory.**
> Integrity is enforced by `archive-a.sha256`; verify with:
>
> ```bash
> node scripts/verify-first-contact-archive-a.js
> ```
>
> The post-hardening re-recording of the same canonical Mission lives in
> `../evidence-archive-b/` (EXP-FIRSTCONTACT-009).

This directory contains the raw evidence produced by executing the canonical First Contact Mission.

## Files

| File | Description |
|---|---|
| `events.jsonl` | Complete event log (32 events) from Genesis through Mission completion. |
| `replay-report.json` | Replay verification report proving State consistency. |
| `proof.json` | Example proof artifact certifying successful execution. |
| `commands.json` | Ordered list of human prompts and CLI invocations mapped to episodes. |
| `timeline.json` | Mapping of events to First Contact Specification episodes. |

## Verification

To reproduce:

```bash
cd examples/first-contact
npm run govern
synth explain replay
```

## Provenance

- Generated: 2026-07-15T01:43:26.469Z
- Mission: Space Mission Tracking Application
- Events: 32
- Replay: consistent
- Proof: passed
