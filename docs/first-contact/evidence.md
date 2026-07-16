> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive-b/) (Archive B, hardened pipeline). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — The Evidence

The canonical evidence archive lives at `examples/first-contact/recorded-journey/evidence-archive-b/` (Archive B, hardened pipeline). Each artifact answers a different question.

| Artifact | Question it answers |
|---|---|
| `events.jsonl` | What actually happened? The immutable 32-event history |
| `timeline.json` | How is the history taught? The eight-episode learning structure |
| `commands.json` | What was actually typed? Every human and AI command, per episode |
| `proof.json` | Did the governed pipeline accept it? The proof verdict |
| `replay-report.json` | Does the state match the history? The replay verification |
| `snapshots/` | Was the approved plan preserved? Signed, certified snapshot artifacts |

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
- Snapshot: `7abf921b3a267bcf`
- Seeded events: 25
- Execution intents: 6
- Total events: 32
- Replay consistent: true
- Graph valid: true
- Snapshot persisted: true
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
- Live state hash: `1824574964`
- Replayed state hash: `1824574964`
- Graph valid: true
- Graph violations: 0

## Two recordings, one journey

Archive A (`examples/first-contact/recorded-journey/evidence-archive/`) is the original pre-hardening recording, preserved immutably as forensic evidence (EXP-PROGRAM-010 finding F2; integrity hash-pinned and verified in CI). Archive B is the same canonical Mission re-executed on the hardened pipeline (EXP-FIRSTCONTACT-009). This comparison is derived from both archives and from fresh replay derivations through the frozen engine — it is not hand-authored.

| Property | Archive A (pre-hardening) | Archive B (hardened) |
|---|---|---|
| Recorded | 2026-07-15T01:50:11.541Z | 2026-07-16T03:58:02.246Z |
| Events | 32 | 32 |
| Event type census | 12 types | identical to A |
| Replay | consistent, chain valid | consistent, chain valid |
| Live state hash == replayed hash | `707567213` == `707567213` | `1824574964` == `1824574964` |
| Aggregate graph violations | 36 | 0 |
| — `broken-navigation` | 12 | 0 |
| — `broken-parent-reference` | 12 | 0 |
| — `orphan-aggregate` | 12 | 0 |
| `--strict-graph` verdict | fails | passes |
| Snapshot artifact persisted | no | yes |
| `graphValid` in proof | absent | true |

Cross-recording hashes differ because event identities are minted per execution; determinism is proven within each recording (live hash equals replayed hash). Archive A's violations are historical evidence of the defects EXP-PROGRAM-010 corrected; Archive B demonstrates the correction on the same mission.
