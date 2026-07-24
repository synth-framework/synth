# Capabilities Explorer Specification

> **Specification for the browsable capabilities grid on the SYNTH homepage.** Defines capabilities, cards, and documentation links under EXP-HOME-009.

---

## Purpose

Provide a browsable grid of SYNTH capabilities that reinforces the public vocabulary and links visitors to canonical documentation.

---

## Capabilities

```text
Mission
Discovery
Governance
Replay
Compiler
Kernel
Knowledge
Architecture
Adapters
```

---

## Capability details

| Capability | One-sentence description | Link target |
|---|---|---|
| Mission | Define and approve strategic goals. | `docs/operator/01-getting-started.md` |
| Discovery | Read-only exploration of repositories, knowledge, and conversations. | `docs/guides/greenfield-discovery-lifecycle.md` |
| Governance | Ensure actions match approved plans. | `docs/governance.md` |
| Replay | Rebuild state from events to prove correctness. | `docs/operator/09-replay.md` |
| Compiler | Validate capabilities and types before execution. | `docs/reference/capability-validation-map.json` |
| Kernel | Coordinate execution through the single mutation authority. | `docs/architecture/constitution.md` |
| Knowledge | Extract and govern canonical domain knowledge. | `docs/reference/canonical-knowledge-contract.md` |
| Architecture | Project layered architecture and dependencies. | `docs/architecture/` |
| Adapters | Integrate external tools and sources through stable contracts. | `docs/guides/agents/index.md` |

---

## Card behavior

- Each capability is an Artifact Card variant.
- Hover reveals a one-sentence description.
- Click links to the canonical documentation page.
- Cards use semantic colors from LDS-002.

---

## Component taxonomy

- `CapabilitiesGrid` — outer container.
- `CapabilityCard` — individual capability card.
- `CapabilityIcon` — semantic icon per capability.

---

## Acceptance criteria

- Each capability maps to a runtime SYNTH concept.
- Adapters are surfaced as a first-class capability with a clear link to adapter documentation.
- Grid is responsive and accessible.
- Links lead to canonical documentation.

---

## Blockers / dependencies

- Depends on Artifact Cards defined in EXP-HOME-004.
- Documentation links must remain stable; see EXP-HOME-014 for CI validation.

---

## Related documents

- [Artifact System Specification](artifact-system.md)
- [LDS-002 — Mission Studio Design System](lds-002.md)
- [EXP-HOME-009 — Capabilities Explorer](../expeditions/EXP-HOME-009.md)
- [EXP-HOME-014 — Documentation Integration](../expeditions/EXP-HOME-014.md)
