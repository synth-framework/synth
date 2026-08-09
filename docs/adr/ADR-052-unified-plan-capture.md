# ADR-052 — Unified Plan Capture for Mission and Expedition Inception

**Status:** Proposed  
**Date:** 2026-08-09  
**Author:** Expedition `dfb19911ba0c758d` — Unify draft/plan/intent capture  
**Deciders:** Operator (pending acceptance)  

---

## Context

SYNTH currently exposes at least five overlapping ways to capture intent before a Mission exists:

| Command | Artifact produced | Lifecycle path |
|---|---|---|
| `synth first-contact start "<intent>"` | Filesystem draft in `.synth/first-contact/draft.json` | `clarify → project → verify → approve → materialize` → runtime Mission + Expeditions |
| `synth intent create --file <path>` | Event-log `INTENT_MODEL_CREATED` | `refine → submit → alignment contract → mission` |
| `synth alignment prepare` | Event-log `INTENT_MODEL_CREATED` + `ALIGNMENT_CONTRACT_CREATED` (approved) | Direct input to `mission approve --alignment-contract-id` |
| `synth mission create --subject ... --purpose ...` | Filesystem draft in `.synth/drafts/<id>.json` | `mission approve --alignment-contract-id` |
| `synth govern <intent>` | Router: uninitialized → `first-contact`, governed → `mission create` | Depends on project state |

Each path has a different schema, different persistence model (event log vs. filesystem), different confidence/unknowns representation, and different next-step hints. Agents and operators must choose the right path based on project state and prior knowledge, which is the dominant source of onboarding friction observed in the field.

The existing `AlignmentContract` is already the gate that authorizes Mission approval (`mission approve --alignment-contract-id`). That makes the AlignmentContract the de facto source of truth for "what we agreed to do." The problem is that the artifacts that feed into it are fragmented.

## Decision

Introduce a single **Plan** concept and a canonical `synth plan` namespace. A Plan is a transient intent artifact; its durable, approved form is an `AlignmentContract` in the event log. All capture paths converge on the same event-log model:

1. **Capture** produces an `INTENT_MODEL_CREATED` event.
2. **Refine** produces `REFINEMENT_SESSION_STARTED`, `REFINEMENT_QUESTION_ANSWERED`, and `REFINEMENT_REPORT_CREATED` events.
3. **Prepare / Submit** produce an `ALIGNMENT_CONTRACT_CREATED` + approved events.
4. **Mission creation** consumes an approved Alignment Contract.

### Proposed canonical surface

| Command | Purpose | Replaces / Unifies |
|---|---|---|
| `synth plan capture --intent "..." [--source cli|file|first-contact] [--file <path>]` | Create or update a Plan (IntentModel). | `intent create`, `first-contact start`, bare `govern <intent>` on governed projects |
| `synth plan refine --plan-id <id> [--answers <path>]` | Run the clarification loop. | `intent refine`, `first-contact clarify` |
| `synth plan prepare --intent "..."` | Quick path: capture + approve an Alignment Contract in one step. | `alignment prepare` |
| `synth plan show --id <id>` | Show plan, refinement status, linked contract, and next step. | `intent` status queries, `first-contact status` (post-capture) |
| `synth plan submit --id <id>` | Mark the Plan sufficient and create an Alignment Contract. | `intent submit` + `alignment approve` |
| `synth mission create --plan-id <id> \| --alignment-contract-id <id>` | Create a Mission from an approved Plan/Contract. | `mission create` (kept, but contract linkage made explicit) |

### First-contact remains the onboarding entry point

`synth first-contact` is kept for **uninitialized** projects. After repository detection, the greenfield/brownfield onboarding flow should call the same Plan capture capability rather than maintaining a separate filesystem-only draft. The filesystem draft becomes an adapter that feeds the unified Plan model.

### Migration and backward compatibility

- Phase 1 (this ADR): Add `synth plan` namespace; keep existing commands as aliases.
- Phase 2: Update help and agent guides to recommend `synth plan`.
- Phase 3 (future mission): Deprecate `intent create`, `alignment prepare`, and filesystem-only `first-contact` drafts once the unified path is proven.

## Consequences

### Positive

- One mental model for intent capture across all project phases.
- All plans are replayable because they live in the event log (or are imported into it).
- Mission approval has a single prerequisite: an approved Alignment Contract, regardless of how the Plan was captured.
- Agent guidance can be simplified to: "capture plan → refine → submit → create mission."

### Negative / Risks

- Adds a new namespace before old ones are removed, temporarily increasing surface area.
- First-contact filesystem drafts must be bridged into the event log without duplicating state.
- Requires careful deprecation to avoid breaking existing missions and scripts.

## Proof Impact

- **P2 — CLI contract:** New `synth plan` namespace must emit deterministic JSON and pass `--help` routing.
- **P3 — Governance lifecycle:** Plan → Refine → Submit → Mission creation must be exercisable end-to-end in tests.
- **P4 — Replay:** Because Plans are event-log based, replay consistency is preserved.

## Kernel Impact

None. The proposal uses existing capabilities (`CreateIntentModel`, `StartRefinementSession`, `CreateAlignmentContract`, `ApproveAlignmentContract`, `CreateMission`) and adds only CLI routing and a thin Plan state projection.

## Constitutional Baseline Impact

None. The event model, protected assets, and ExecutionGate authority remain unchanged.

## Related

- ADR-047 — Intent refinement and alignment governance
- ADR-048 — Genesis lifecycle and alignment contracts
- Expedition `b769c7a4a28087bb` — Audit and unify CLI command surface
- Expedition `dfb19911ba0c758d` — Unify draft/plan/intent capture
