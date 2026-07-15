# Evidence Archive — Canonical Recorded Journey

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
