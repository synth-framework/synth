# Artifact System Specification

> **Specification for the SYNTH Mission Studio Homepage Artifact Cards.** Defines card variants, anatomy, interactions, and mapping to SYNTH concepts under EXP-HOME-004.

---

## Purpose

Provide a unified card system for every object produced during the Genesis demo and across the homepage. Every card maps to a real SYNTH artifact type.

---

## Card variants

| Variant | SYNTH concept | Typical content |
|---|---|---|
| **Intent Card** | Intent artifact | Raw user request, source mode, confidence hint. |
| **Discovery Card** | Discovery artifact | Extracted findings, observations, unknowns surfaced. |
| **Domain Card** | Domain model | Entities, relationships, bounded contexts. |
| **Mission Card** | Mission | Purpose, objectives, success criteria, status. |
| **Expedition Card** | Expedition | Subject, goal, status, dependencies. |
| **Evidence Card** | Evidence | Observation, confidence, source, chain. |
| **Replay Card** | Replay event | Event type, timestamp, state transition, hash. |
| **Architecture Card** | Architecture layer | Layer name, responsibility, dependencies. |

---

## Card anatomy

Every card follows the same structure:

1. **Semantic border** — left border colored by artifact concept (e.g., Mission uses `--ms-mission`).
2. **Type icon or badge** — identifies the artifact type.
3. **Title** — concise artifact name.
4. **Summary** — one or two sentences describing the artifact.
5. **Status/confidence indicator** — where applicable (e.g., "proposed", "approved", confidence score).
6. **Expandable detail panel** — revealed on click, showing full artifact fields.

---

## Interactions

- **Hover:** subtle elevation via `--ms-shadow-md`, cursor pointer.
- **Click:** expand detail panel; other cards remain visible but dim slightly.
- **Timeline scrub (Replay cards):** update card state to reflect event log position.
- **Focus:** visible focus ring using `--ms-accent`.

---

## Component taxonomy

- `ArtifactCard` — base container.
- `ArtifactHeader` — icon, title, status.
- `ArtifactSummary` — short description.
- `ArtifactDetail` — expanded content.
- `ArtifactStatusBadge` — status or confidence.
- `ArtifactTypeIcon` — semantic icon per variant.

---

## Mapping table

| UI element | SYNTH concept | Runtime artifact |
|---|---|---|
| Intent Card | Intent | `IntentArtifact` |
| Discovery Card | Discovery | `DiscoveryArtifact` |
| Domain Card | Domain model | `DomainModel` |
| Mission Card | Mission | `Mission` |
| Expedition Card | Expedition | `Expedition` |
| Evidence Card | Evidence | `Evidence` |
| Replay Card | Replay event | `SynthEvent` |
| Architecture Card | Architecture layer | `ArchitectureLayer` |

---

## Acceptance criteria

- Every card variant maps to a real SYNTH artifact type.
- Cards share a consistent anatomy and interaction model.
- Cards are accessible and responsive.
- No decorative card variant exists without a runtime mapping.

---

## Blockers / dependencies

- Card content for Discovery, Domain, Mission, and Expedition artifacts depends on the Genesis demo output defined in EXP-HOME-003.
- Replay card state synchronization depends on the sample event log defined in EXP-HOME-007.

---

## Related documents

- [LDS-002 — Mission Studio Design System](lds-002.md)
- [Mission Workspace Specification](mission-workspace.md)
- [EXP-HOME-004 — Artifact System](../expeditions/EXP-HOME-004.md)
- [EXP-HOME-003 — Genesis Experience](../expeditions/EXP-HOME-003.md)
- [EXP-HOME-007 — Replay Experience](../expeditions/EXP-HOME-007.md)
