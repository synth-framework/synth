> This ADR is required by **EXP-AI-001 — Genesis Protocol**.

# ADR-035 — Genesis Protocol

## Status

Accepted

## Context

SYNTH has established a complete upstream lifecycle: Genesis captures intent, Semantic Modeling produces canonical intent and domain artifacts, Canonical Knowledge preserves understanding, and Incremental Governance scales validation. However, there is no standardized contract through which external AI agents can discover and participate in this lifecycle. Each agent integration must infer SYNTH behavior from CLI help, documentation, and repository state.

Program 026 addresses this by defining an open interoperability layer. The Genesis Protocol is the core contract of that layer.

## Decision

1. The **Genesis Protocol** is the canonical contract for AI agent participation in SYNTH.
2. The protocol is implementation-independent. Agents implement the protocol; SYNTH exposes repository metadata and public commands that satisfy it.
3. The protocol covers five areas:
   - Repository discovery
   - Context classification
   - Discovery execution
   - Artifact production
   - Approval participation
   - Mission / Expedition interaction
   - Replay consumption
4. Agents recognize a SYNTH repository by the presence of `.synth/ai/` metadata and a valid `manifest.json`.
5. Repository metadata declares lifecycle phase, governance version, supported protocols, repository type, and mutation policy.
6. Discovery inputs may include natural language, existing artifacts, documents, URLs, diagrams, and images.
7. Discovery outputs are deterministic artifacts: Discovery Artifact, Intent Model, Domain Model, Mission Proposal, and Uncertainty Report.
8. Read-only phases never mutate repository state.
9. Mutating phases require explicit operator approval and emit events through the ExecutionGate.
10. Every agent-produced artifact must be reproducible from inputs and recorded decisions.

## Consequences

- Any capable AI agent can participate in SYNTH without repository-specific instructions.
- SYNTH becomes discoverable as a protocol rather than only usable as a framework.
- Multi-agent coordination becomes possible because all agents share the same contract.
- The protocol must be versioned and backward-compatible.

## Proof Impact

- P1 (event model): agent mutations emit standard SYNTH events.
- P2 (governance integration): agents participate through the ExecutionGate.
- P4 (deterministic derivation): identical repository metadata produces identical agent behavior.

## Kernel Impact

None. This ADR defines a protocol and metadata contracts without modifying Protected Assets.

## Constitutional Baseline Impact

None. The protocol preserves approval boundaries, append-only events, and hash-chain semantics.

## Related

- `docs/reference/genesis-protocol.md`
- `docs/expeditions/EXP-AI-001.md`
- `docs/expeditions/EXP-AI-003.md`
- `docs/adr/ADR-034-replay-recovery.md`
