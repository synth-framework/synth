> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive-b/) (Archive B, hardened pipeline). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — Replay

Replay re-derives the state from the event history and compares it against the operational state. For the canonical journey:

| Check | Result |
|---|---|
| Events replayed | 32 |
| Hash chain valid | true |
| Operational state hash | `1824574964` |
| Replayed state hash | `1824574964` |
| Divergences | 0 |
| Verdict | **CONSISTENT** |

> Operational state is bit-for-bit identical to replayed state.

## As executed

- `synth explain replay` _(ai-agent)_

## What this means

The 32 events are not a story about the execution — they _are_ the execution. Any state that claims to descend from this journey must replay to the same hash, bit for bit.

For the interactive replay experience, see the [website replay page](../../website/first-contact/replay.html) or regenerate it with `node scripts/generate-first-contact-projection.js`.
