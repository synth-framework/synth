# Repository Authority Index (RAI)

**Version:** 1.0  
**Authority:** EXP-CONT-002 — Interruption Benchmark  
**Status:** Draft

---

## Purpose

The Repository Authority Index (RAI) quantifies how much of an operator's intent a SYNTH repository can reconstruct after a reasoning session is interrupted and all conversation history is dropped.

RAI is not a subjective quality score. It is a reproducible, per-checkpoint measurement derived from public CLI outputs. A repository with a high RAI can be resumed by a zero-history operator using only `synth explain resume`, `synth status`, `synth explain identity`, and `synth explain all`.

---

## Dimensions

| Dimension | Question | Score 0 | Score 0.5 | Score 1.0 |
|---|---|---|---|---|
| **Identity** | Can the agent determine what kind of repository this is, what phase it occupies, and which direction it is transforming? | No identity projection available | Partial (kind or phase only) | Full identity (kind, phase, authority, inputs, outputs, direction) |
| **Mission** | Can the agent identify the active mission and its status? | No mission reconstructable | Mission name/status unclear or requires inference | Active mission name and status are explicit |
| **Decisions** | Can the agent reconstruct durable approvals, rejections, and pending decisions? | No decision record | Decisions exist but are incomplete or uncertified | Full decision history with chain validity |
| **Next Action** | Can the agent determine the correct next command without reading source? | No next action provided | Next action requires interpretation or is vague | Explicit next command with reason |
| **Confidence** | Does the briefing expose uncertainty rather than invent certainty? | Forged or silent confidence | Confidence shown but not grounded | Confidence derived from evidence; warnings for fragile state |

---

## Scoring

For each checkpoint:

```text
RAI_checkpoint = average(score across 5 dimensions)
```

Aggregate RAI for a project:

```text
RAI_aggregate = average(RAI_checkpoint across all checkpoints)
```

Scores are recorded as decimals between 0.00 and 1.00.

---

## Checkpoints

The canonical interruption benchmark uses six checkpoints:

| Checkpoint | State | Expected intent |
|---|---|---|
| A | After `synth init` | Project initialized; next step is mission creation |
| B | After mission draft created | Mission draft exists; may need evidence before approval |
| C | After mission approved | Mission approved; next step is expedition creation |
| D | After expedition created | Expedition exists; ready to start |
| E | After expedition completed | Expedition complete; pending acceptance or next expedition |
| F | After proof generated | Governance proof produced; cycle complete |

At each checkpoint:

1. Record the expected operator intent.
2. Kill the process and drop conversation context.
3. Start a fresh agent with zero history.
4. Allow the agent to invoke only public read-only CLI commands.
5. Score each dimension by comparing reconstructed intent to expected intent.

---

## Measurement Rules

1. **Zero-history constraint.** The scoring agent may not read source code, raw `data/` files beyond CLI output, or use prior context.
2. **Public vocabulary only.** The agent may reason using only the seven public concepts: Mission, Expedition, Evidence, Plan, Event, State, Replay.
3. **Deterministic projection.** All information must come from deterministic CLI commands; no hand-authored narrative files may be consulted.
4. **Warning value.** A warning that correctly signals fragile or incomplete state contributes to the Confidence dimension but does not alone raise other dimensions.
5. **Failure mode preservation.** A checkpoint that reproduces a known historical failure (e.g., approved mission lost to memory) scores 0.0 on the affected dimensions and is recorded as evidence.

---

## Interpretation

| RAI Range | Meaning |
|---|---|
| 0.90 – 1.00 | Fully resumable; zero-history operator can continue correctly |
| 0.70 – 0.89 | Mostly resumable; minor gaps require one clarification |
| 0.50 – 0.69 | Partially resumable; operator may reconstruct intent incorrectly |
| 0.30 – 0.49 | Poorly resumable; significant source inspection likely |
| 0.00 – 0.29 | Not resumable; operator must reinvent intent |

---

## Relationship to other concepts

- **RAI complements replay.** Replay proves that events reconstruct state. RAI measures whether that reconstructed state is sufficient for a new reasoning system to continue.
- **RAI is a projection.** Like documentation and identity, RAI is computed from replayable evidence; it is never hand-authored.
- **RAI is versioned.** As SYNTH evolves, the same checkpoint matrix can be re-run to measure improvement or regression.
