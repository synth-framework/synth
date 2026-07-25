# Era III Retrospective — SYNTH Platform v1.0

> **Era:** III — Architecture & Release  
> **Outcome:** SYNTH Platform v1.0 released (`@synth-framework/synth@2.4.1`)  
> **Baseline tag:** `era-iii-baseline`  
> **Retrospective date:** 2026-07-25

---

## Purpose

This document captures institutional knowledge from Era III. It is not an ADR, a program charter, or a technical specification. It is the engineering memory of how SYNTH moved from an evolving architecture to a released, frozen platform.

---

## What worked

### Governance lifecycle as the central abstraction

Making the mission → expedition → evidence → plan → event → replay → state lifecycle explicit turned ad hoc engineering work into inspectable history. Every state change became traceable to a decision.

### ExecutionGate as the single mutation authority

Centralizing all writes through one boundary made guarantees possible. Once the gate existed, concepts like replay, audit, and certification became mechanical rather than social.

### Deterministic replay as the certification mechanism

Instead of asserting that the system is correct, SYNTH demonstrates it by replaying events and comparing hashes. This shifted validation from trust to evidence.

### Freezing the public vocabulary to seven concepts

Restricting operator-facing explanations to **Mission, Expedition, Evidence, Plan, Event, State, Replay** made the platform teachable. Everything else became implementation detail.

### Documentation as deterministic projections

Treating generated docs as a committed baseline meant documentation drift became detectable. Freshness checks guaranteed that published docs reflected canonical repository state.

### Clean-clone certification

The requirement that a fresh clone can build, test, govern, and certify itself eliminated hidden local state. It became the strongest release gate.

---

## What surprised us

### The installer broke the release, not the architecture

The most expensive v1.0 defect was not in the kernel, the SDK, or the governance model. It was the bootstrap installer's inability to parse the new JSON `--version` contract and the published package's missing `docs/adr` dependency. The gap between "source tree works" and "published package works" was larger than expected.

### CLI contract stability mattered earlier than expected

Changing `synth --version` and error responses to JSON broke external tooling (the installer) that parsed text output. This validated the decision to treat the CLI as a public protocol.

### Documentation projections caught real drift

`docs:verify-freshness` repeatedly identified stale generated docs, undefined scripts in `test:all`, and mismatched metadata. These checks became a quality net for the entire repository.

### Most proposed programs were not v1.0 blockers

Dozens of proposed expeditions and programs felt urgent during development. The portfolio review showed that most were naturally Era IV work: distribution, adoption, operator optimization, and task orchestration.

---

## Major architectural decisions

| Decision | Rationale | Outcome |
| --- | --- | --- |
| ExecutionGate as sole mutation authority | Prevents bypasses and makes audit possible | Central boundary held through release |
| Event-sourced state with deterministic replay | State is a pure function of history | Replay became the certification mechanism |
| Seven-concept public vocabulary | Limits conceptual surface area | Operator and AI-facing interfaces became stable |
| SDK canonicalization | Consolidated duplicated platform ownership | Single public surface for v1.x |
| Documentation projections as committed artifacts | Drift becomes mechanically detectable | Docs stayed synchronized with source |
| Governance lifecycle freeze | Architecture era ends with certified baseline | v1.0 platform is frozen |
| Patch-only maintenance on v1.0 | Protects the released baseline | New capabilities must enter Era IV |

---

## Dead ends

### Experience Projection System (EXP-FIRSTCONTACT-004)

Attempted to combine nine projection targets into one expedition. The targets had different audiences and different delivery rhythms. The expedition was superseded by smaller, focused first-contact work.

### Website Experience program (EXP-PROGRAM-020)

Treated the website as a separate product surface. It was superseded by EXP-PROGRAM-027, which made Mission Studio the canonical homepage and first-contact experience.

### Hero-first homepage design (EXP-WEB-001)

A marketing-hero approach to the homepage did not match SYNTH's deterministic, event-sourced identity. Superseded by the Genesis Experience under Program 027.

### Numeric quorum in governance gates

Considered implementing `N of M` approval policies. Deferred because v1.0's governance model resolves around a single accountable operator. Numeric quorum requires a different state machine and event model, and no v1.0 workflow required it.

---

## Important simplifications

### Reduced public vocabulary

Many intermediate concepts were introduced during development. Only seven survived as public-facing terms.

### Canonical SDK ownership

Multiple infrastructure concerns had overlapping or duplicate owners. Canonicalization assigned exactly one program owner to each concern.

### Repository simplification

Removed structural duplication, resolved identity collisions (e.g., `EXP-SIMPLIFICATION-003A` → `EXP-PLATFORM-002`), and normalized expedition statuses.

### Removed synthetic review decisions

The acceptance gate previously synthesized missing review evidence. Changed to require authentic review decisions, strengthening the evidentiary chain.

### Deferred non-blocking capabilities

Task orchestration, advanced governance semantics, and architectural convergence were deferred to Era IV. This protected the v1.0 release scope.

---

## Concepts removed or deferred

| Concept | Disposition | Reason |
| --- | --- | --- |
| Numeric quorum | Deferred to v2 | No v1.0 workflow required it; changes gate state model |
| Ticket entity | Removed from kernel | Replaced by WorkItem via ASC-001 |
| Experience Projection System | Superseded | Too many unrelated targets in one charter |
| Website as separate program | Superseded | Integrated into Mission Studio |
| Hero homepage | Superseded | Did not match SYNTH identity |
| Unclassified direct writes | Removed | All writes flow through ExecutionGate |

---

## Lessons learned

### Release engineering is part of the product

A working source tree is not a release. Installation, packaging, and clean-clone certification are first-class deliverables.

### The CLI is an API

Human-readable output changes break tooling. The CLI must have a stable machine contract from the moment external tools depend on it.

### Governance administration is not implementation

Closing programs, promoting expeditions, and rebaselining portfolios are legitimate post-release activities. They should not be forced into the expedition lifecycle.

### Architecture should respond to adoption

After v1.0, the largest architectural investments (Task Engine, Architectural Convergence) should wait for real operator and ecosystem feedback.

### Determinism is expensive but worth it

Making discovery evidence, documentation projections, replay, and build artifacts deterministic required sustained effort. It also made certification and clean-clone validation possible.

---

## Metrics

| Metric | Era III result |
| --- | --- |
| npm releases | `2.4.0` (deprecated), `2.4.1` (stable) |
| Governance validator findings | 0 errors, 0 warnings at release |
| Clean-clone certification | Passing |
| Install certification (ubuntu + macos) | Passing |
| Public vocabulary concepts | 7 |
| Frozen architectural pillars | 8 |
| Terminal v1.0 expeditions | All v1.0-contributing expeditions closed |
| Documentation projection freshness | Passing |

---

## Future guidance

### For maintainers

- v1.0 is frozen. Patch releases on `2.4.x` may fix defects, security issues, and documentation errors.
- Any change touching the kernel, SDK, event model, capability registry, governance lifecycle, or replay engine requires a new Era IV architectural program.
- The CLI contract remains stable for v1.x.

### For architects

- Use `docs/PLATFORM.md` as the canonical description of what SYNTH is today.
- Use `docs/Era-IV-Roadmap.md` for the proposed evolution.
- New programs must identify an adoption or operator-effort metric before implementation planning.

### For contributors

- Start with `docs/PLATFORM.md`, then the Operator Guide.
- All new capabilities enter through the Era IV program lifecycle, not as direct patches to v1.0.

---

## Closing note

Era III ended not with a feature list but with a certified, frozen platform. The most important output of this era is the boundary it established: between what is stable and what is allowed to evolve. Future work should respect that boundary deliberately.
