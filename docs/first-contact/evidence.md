> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive/). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — The Evidence

The canonical evidence archive lives at `examples/first-contact/recorded-journey/evidence-archive/`. Each artifact answers a different question.

| Artifact | Question it answers |
|---|---|
| `events.jsonl` | What actually happened? The immutable 32-event history |
| `timeline.json` | How is the history taught? The eight-episode learning structure |
| `commands.json` | What was actually typed? Every human and AI command, per episode |
| `proof.json` | Did the governed pipeline accept it? The proof verdict |
| `replay-report.json` | Does the state match the history? The replay verification |

## Event distribution

| Event type | Count |
|---|---|
| `SYSTEM_GENESIS` | 1 |
| `MISSION_CREATED` | 1 |
| `PLAN_CREATED` | 5 |
| `EXPEDITION_CREATED` | 5 |
| `WORK_ITEM_CREATED` | 7 |
| `OBJECTIVE_ADDED` | 7 |
| `MISSION_APPROVED` | 1 |
| `EXPEDITION_APPROVED` | 1 |
| `EXPEDITION_STARTED` | 1 |
| `OBJECTIVE_COMPLETED` | 1 |
| `EXPEDITION_COMPLETED` | 1 |
| `MISSION_COMPLETED` | 1 |

## Proof summary

- Example: `first-contact`
- Snapshot: `467ac6bb90ff18fb`
- Seeded events: 25
- Execution intents: 6
- Total events: 32
- Replay consistent: true
- Overall verdict: **PASS**

Documentation projections produced during the journey:

- `README.md`
- `ARCHITECTURE.md`
- `API.md`
- `OPERATOR_GUIDE.md`
- `DEVELOPER_GUIDE.md`
- `ARCHITECT_GUIDE.md`
- `AI_CONTEXT.md`

## Replay facts

- Consistent: true
- Chain valid: true
- Live state hash: `707567213`
- Replayed state hash: `707567213`
