# SYNTH Simplification & Platform Roadmap

**Status:** Strategic roadmap  
**Date:** 2026-07-21  

---

## Diagnosis

The repository has reached an inflection point. It is no longer primarily suffering from **architectural fragmentation**. It is now suffering from **platform inconsistency**.

- **Architectural fragmentation** = multiple systems solving the same responsibility.
- **Platform inconsistency** = the same infrastructure operation implemented in many places without a canonical owner.

The earlier expeditions (kernel safety, extension model unification) were **structural simplification**. The remaining work is **platform canonicalization**.

The new optimization target:

> **Increase the proportion of the repository governed by canonical ownership.**

---

## Two coordinated programs

The roadmap splits into two programs that reinforce each other but optimize different things.

```
Program A — Repository Simplification
    Reduce conceptual complexity.

Program B — Platform Canonicalization
    Every infrastructure capability has one owner.
```

---

## Program A — Repository Simplification

**Goal:** Reduce conceptual complexity.

### Phase 1 — Governance Foundation ✅

- Kernel safety
- Execution boundary protection
- Constitutional baseline
- Replay integrity
- Mutation authority

Rule:

> Simplification must happen around the kernel, never through kernel expansion.

### Phase 2 — Shared Test Infrastructure ✅

- Shared CLI harness
- Shared fixtures
- Shared execution fixtures
- Shared governance fixtures
- Reusable lifecycle assertions

### Phase 3 — Extension Model ✅

See `docs/expeditions/EXP-SIMPLIFICATION-003.md`.

Result:

```
Before: src/adapters + src/environment + src/discovery
After:  src/discovery + src/mission-studio adapters + src/infra providers
```

Major reductions:

- Duplicate registries removed
- Duplicate evidence models removed
- Duplicate discovery responsibilities removed

### Phase 4 — Knowledge Simplification

Pending.

### Phase 5 — CLI Simplification

Pending.

### Phase 6 — Planning Simplification

Pending.

### Phase 7 — Governance Simplification

Pending.

### Metrics

- files removed
- duplicated abstractions removed
- exported symbols reduced
- dependency graph simplified
- responsibility cohesion

---

## Program B — Platform Canonicalization

**Goal:** Every infrastructure capability has one owner.

The Internal SDK is not a utilities folder. It is the **Canonical Infrastructure Contracts** surface of SYNTH.

```
One concern
      |
      v
One owner
      |
      v
Many consumers
```

Never:

```
Many implementations
      |
      v
Many consumers
```

### Stage 1 — Canonical Infrastructure Audit ✅

See `docs/expeditions/EXP-PLATFORM-001-canonical-infrastructure-audit.md`.

Current state:

```
278 TypeScript files
228 inline infrastructure consumers
15 audited concerns
8 concerns without canonical owners
```

Target:

```
278 files
1 canonical owner per infrastructure concern
N consumers per owner
```

### Stage 2 — Internal SDK

See `docs/expeditions/EXP-SIMPLIFICATION-003A.md` (EXP-PLATFORM-002).

#### SDK design principles

1. **One concern per module.** `sdk.paths` only paths. Never `paths + json`.
2. **Stateless.** Pure functions. `paths.runtimeData(root)`, not `paths.state()`.
3. **No business logic.** `workspace.findRoot()`, not `workspace.bootstrapRepository()`.
4. **Composable.** `json.read(paths.state(workspace.root()))`.
5. **No SDK module without deleting duplication.** Wrappers are not simplifications.
6. **Canonical ownership.** Every concern has exactly one authoritative implementation.

#### SDK structure

```
src/sdk/
├── workspace/
│   ├── root.ts
│   └── discovery.ts
├── paths/
│   ├── synth.ts
│   ├── runtime.ts
│   └── artifacts.ts
├── files/
│   ├── read.ts
│   ├── write.ts
│   └── atomic.ts
├── json/
│   ├── read.ts
│   └── write.ts
├── hashing/
│   ├── sha256.ts
│   ├── stable-id.ts
│   └── canonical.ts
├── manifest/
├── identity/
├── temp/
├── process/
├── events/
└── state/
```

Do **not** create:

```
src/sdk/utils
src/sdk/helpers
src/sdk/common
```

#### SDK execution order

**Wave 1 — Repository Reality**

1. `sdk.workspace` (P0) — removes the hidden assumption that `process.cwd() == repository root`
2. `sdk.paths` (P0) — prevents `.synth/data` vs `data/` class failures

**Wave 2 — File and Serialization Boundary**

3. `sdk.files` (P1)
4. `sdk.json` (P1)
5. `sdk.hashing` (P1)

**Wave 3 — Platform Identity**

6. `sdk.manifest` (P1)
7. `sdk.identity` (P2)
8. `sdk.temp` (P2)
9. `sdk.process` (P2)

**Wave 4 — Kernel Access Facades**

10. `sdk.events` (P2)
11. `sdk.state` (P2)

Important constraint: `sdk.events` and `sdk.state` are facades, not replacements for `EventStore` and `StateStore`.

```
Application
     |
     v
sdk.events
     |
     v
EventStore
     |
     v
event-log.jsonl
```

### Stage 3 — Platform Refinement

- Filesystem contract cleanup
- Utility extraction
- Naming consistency

See `docs/expeditions/EXP-PLATFORM-004-utility-extraction.md`.

### Stage 4 — Construction Consistency

New audit category: **Construction Consistency Audit**.

Question:

> How many ways are objects created?

Examples:

```
new DiscoveryEngine()
new DiscoveryContext()
new DiscoverySession()
```

Target:

```
one composition boundary
many consumers
```

See `docs/expeditions/EXP-PLATFORM-003-construction-canonicalization.md`.

---

## Maturity model

| Stage | Focus | Status |
| --- | --- | --- |
| I | Architectural stabilization (kernel safety, governance boundaries) | ✅ Complete |
| II | Structural simplification (extension model, shared test infrastructure) | ✅ Largely complete |
| III | Platform canonicalization (internal SDK, infrastructure ownership) | **Current phase** |
| IV | Repository refinement (utility extraction, naming, construction consistency) | Next |
| V | Domain refinement (knowledge, CLI, planning, governance) | Future |
| VI | Public platform readiness (external SDK, extension APIs, documentation) | Long-term |

---

## Audit framework

The composable audit framework described in ADR-049 now falls into three categories.

### Repository audits

Concerned with architecture.

- Simplification
- Responsibility
- Cohesion
- Dead code
- Dependency
- Boundary
- Layering

### Platform audits

Concerned with canonical infrastructure.

- Canonical Infrastructure
- SDK Adoption
- Construction Consistency
- Filesystem
- Path Composition
- JSON
- Process Execution
- Configuration
- State Access
- Event Access

### Quality audits

Concerned with operational excellence.

- Security
- Maintainability
- AI Adaptability
- Testability
- Performance
- Documentation
- Public API Stability
- SYNTH Core Alignment

See: `docs/adr/ADR-049-repository-quality-audit-framework.md`

---

## Universal simplification decision matrix

| Responsibility | Contract | Authority | Consumer Dependency | Decision |
|---|---|---|---|---|
| Same | Same | Same | None | Merge |
| Same | Equivalent | Same | None | Dedicated Expedition |
| Same | Different | Same | Any | Redesign Before Merge |
| Different | Any | Any | Any | Keep Separate |
| Same | Same | Different | Any | Keep Separate |
| Any | Any | Any | Consumers Depend | Preserve Until Refactored |

---

## Success metrics

| Metric | Direction |
|---|---|
| Architectural models | Decrease |
| Infrastructure implementations | Decrease |
| Construction patterns | Decrease |
| Naming collisions | Decrease |
| Public concepts | Decrease |
| Canonical SDK coverage | Increase |
| Determinism | Increase |
| Discoverability | Increase |
| AI navigability | Increase |

---

## Conclusion

The repository has crossed a maturity boundary. The kernel already achieved conceptual compression. The next compression target is operational consistency.

The Internal SDK is the correct mechanism for that compression without expanding the canonical vocabulary. Combined with the Canonical Infrastructure Audit, Construction Consistency Audit, and the broader composable audit suite, this program ensures that every expedition increases canonical ownership and reduces implementation diversity.
