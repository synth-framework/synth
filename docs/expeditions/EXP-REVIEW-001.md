# EXP-REVIEW-001 — Program Convergence Review

> **Governance expedition.** Audit active and proposed programs against the current SYNTH architecture, classify every remaining expedition as Canonical / Rewrite / Archive / Merge, and produce a re-sequenced implementation roadmap before further execution.

**Status:** Completed  
**Started:** 2026-07-19  
**Completed:** 2026-07-19  
**Kind:** Governance Expedition  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Programs 004, 006, 009, 020, 027, and 029  

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Prevent wasted work by ensuring every remaining expedition in the portfolio still reflects today's SYNTH architecture before implementation resumes.

The architecture has materially shifted since several programs were chartered:

- **Genesis** (Program 022) now defines greenfield intent capture.
- **Discovery** (Program 006) is the canonical front door for brownfield systems.
- **Mission Studio Homepage** (Program 027) supersedes earlier website/design-system work.
- **AI Agent Interoperability** (Program 026) and **AI Ecosystem Distribution** (Program 029) introduce canonical AI capability projection.
- **Repository & Release Governance** (Program 028) governs promotion and versioning.

This review classifies every remaining expedition in the affected programs and proposes a coherent execution sequence.

---

## Method

For each program:

1. Read the program charter.
2. Read every remaining expedition file (or note missing files).
3. Classify each expedition:
   - **Canonical** — fits today's architecture; execute as written.
   - **Rewrite** — same objective, but assumptions or dependencies are stale.
   - **Archive** — superseded by newer work.
   - **Merge** — better owned by another program or expedition.
   - **Complete** — already implemented but not yet marked accepted in the charter.
4. Update expedition and program statuses to match reality.
5. Produce a re-sequenced roadmap.

---

## Classification Results

### EXP-PROGRAM-004 — First Contact Program

| Expedition | File Status | Classification | Rationale |
| --- | --- | --- | --- |
| EXP-DISCOVERY-001 | Proposed | **Complete** | Implemented and accepted as part of Program 006; `synth discover` is read-only and produces deterministic baselines. |
| EXP-BROWNFIELD-001 | Executing | **Complete** | Certification suite passes; discovery safety model, runtime transition contract, agent context contract, and CLI hardening are all implemented and tested. |
| EXP-CLI-001 | Completed | **Complete** | Govern delegation diagnostics, clean machine output, doctor layer split, discovery `--export`, and `shell: true` removal are implemented and certified. |
| EXP-RUNTIME-001 | Completed | **Complete** | Atomic mission approval, runtime event guarantees, drift detection, and `synth repair replay` are implemented and certified. |
| EXP-CERT-001 | Proposed | **Canonical** | Failure taxonomy, certification DSL, and `synth certify` runner remain needed; can proceed once current governance state is stable. |

**Program decision:** Close 004 after CERT-001 is accepted. The other four operational expeditions are already done; the charter's Definition of Done should reflect that.

---

### EXP-PROGRAM-006 — Discovery Platform

| Expedition | File Status | Classification | Rationale |
| --- | --- | --- | --- |
| EXP-DISCOVERY-001 through 007 | Completed | **Complete** | Discovery capability, engine, observation capabilities, projection, brownfield integration, replay, and non-CLI consumers are implemented and tested. |
| EXP-DISCOVERY-008 | Missing | **Rewrite** | The charter calls for operational discovery (deployments, databases, cloud, containers), but no expedition file exists. The scope is too broad to execute without a proper charter defining source contracts, adapter priorities, and sequencing. |

**Program decision:** Program 006 remains Active until EXP-DISCOVERY-008 is chartered and accepted. Do not begin implementation until the rewritten charter is approved.

---

### EXP-PROGRAM-009 — Canonical First Contact Experience

| Expedition | File Status | Classification | Rationale |
| --- | --- | --- | --- |
| EXP-FIRSTCONTACT-001 | Completed (pending external validation) | **Canonical** | `docs/reference/public-narrative.md` is the canonical narrative source. |
| EXP-FIRSTCONTACT-002 | Completed (pending acceptance) | **Canonical** | `docs/reference/first-contact-specification.md` defines the authoritative journey. |
| EXP-FIRSTCONTACT-003 | Completed | **Complete** | Canonical recorded journey produced. |
| EXP-FIRSTCONTACT-004 | Superseded | **Archive** | Split into 007 and 008 per charter note; no further action. |
| EXP-FIRSTCONTACT-005 | Proposed | **Rewrite** | Interactive Replay experience is still valid, but must consume Archive B and reflect the hardened replay contract. |
| EXP-FIRSTCONTACT-006 | Proposed | **Rewrite** | Comprehension validation is still needed, but references superseded 004 and must be aligned post-009. |
| EXP-FIRSTCONTACT-007 | Completed | **Complete** | Documentation projection from canonical evidence is in place. |
| EXP-FIRSTCONTACT-008 | Proposed | **Rewrite** | Remaining projections are needed, but dependency list is stale and does not reflect that 009 now blocks it. |
| EXP-FIRSTCONTACT-009 | Completed | **Complete** | Re-recorded canonical Mission on hardened pipeline; Archive B produced. |
| EXP-FIRSTCONTACT-010 | Accepted | **Canonical** | Agent ground-truth discovery experiment accepted. |
| EXP-FIRSTCONTACT-011 | Completed | **Complete** | Conversation-pattern system and quick-start projections are implemented; charter incorrectly lists it as Proposed. |

**Program decision:** Reconcile statuses, then complete the remaining rewritten expeditions (005, 006, 008) after 009 acceptance. The program is closer to closure than the charter currently suggests.

---

### EXP-PROGRAM-020 — Website Experience

| Expedition | File Status | Classification | Rationale |
| --- | --- | --- | --- |
| EXP-WEB-001 | Accepted | **Rewrite** | Homepage hero concept is directionally valid, but the visual spec predates LDS-002 and uses stale CLI vocabulary. Must align with Program 027. |
| EXP-WEB-002 | Missing | **Rewrite** | Scenario pages are still relevant, but should be chartered under Program 027 and use LDS-002. |
| EXP-WEB-003 | Missing | **Archive** | Website design system is superseded by EXP-HOME-001 / LDS-002. |

**Program decision:** Refocus Program 020 on website infrastructure (hosting, deployment, build, SEO, analytics, performance, accessibility). All user-facing homepage and scenario work moves to Program 027.

---

### EXP-PROGRAM-027 — Mission Studio Homepage

| Expedition | File Status | Classification | Rationale |
| --- | --- | --- | --- |
| EXP-HOME-001 | Proposed | **Canonical** | LDS-002 establishes runtime-first tokens and principles. |
| EXP-HOME-002 | Proposed | **Canonical** | Workspace layout and state machine align with Mission Studio semantics. |
| EXP-HOME-003 | Proposed | **Canonical** | Genesis experience is read-only and depends on existing EXP-AI-001. |
| EXP-HOME-004 | Proposed | **Canonical** | Artifact cards map directly to SYNTH concepts. |
| EXP-HOME-005 | Proposed | **Rewrite** | Uses "Execution" as a public phase; must use the canonical seven-concept vocabulary (Intent → Discovery → Mission → Expedition → Governance → Replay). |
| EXP-HOME-006 | Proposed | **Canonical** | Governance visualization is a valid projection. |
| EXP-HOME-007 | Proposed | **Canonical** | Replay timeline is a valid projection. |
| EXP-HOME-008 | Proposed | **Canonical** | Architecture explorer is a valid projection. |
| EXP-HOME-009 | Proposed | **Canonical** | Capabilities explorer is a valid projection. |
| EXP-HOME-010 | Proposed | **Canonical** | Responsive implementation is required. |
| EXP-HOME-011 | Proposed | **Canonical** | Accessibility is required. |
| EXP-HOME-012 | Proposed | **Canonical** | Performance budgets align with calm computing. |
| EXP-HOME-013 | Proposed | **Canonical** | Motion system aligns with calm computing. |
| EXP-HOME-014 | Proposed | **Canonical** | Documentation integration is required. |
| EXP-HOME-015 | Proposed | **Canonical** | Production certification is required. |

**Program decision:** Proceed after Discovery (Program 006) and Canonical First Contact (Program 009) are stable. Rewrite HOME-005 before execution.

---

### EXP-PROGRAM-029 — AI Ecosystem Distribution

| Expedition | File Status | Classification | Rationale |
| --- | --- | --- | --- |
| EXP-DIST-001 | Proposed | **Canonical** | Canonical AI Capability Model is the foundation; name should remain distinct from the protected runtime Capability Model. |
| EXP-DIST-002 | Missing | **Canonical** | Agent Skill Projection Pipeline is needed but not yet chartered. |
| EXP-DIST-003 | Proposed | **Canonical** | MCP Server aligns with existing projection-layer architecture. |
| EXP-DIST-004 | Proposed | **Canonical** | npm package distribution is needed; agent-sdk package already exists. |
| EXP-DIST-005 | Proposed | **Canonical** | IDE rules projection is needed. |
| EXP-DIST-006 | Missing | **Canonical** | GitHub templates and Actions are needed but not yet chartered. |
| EXP-DIST-007 | Missing | **Merge** | "Website as Discovery Surface" is better owned by Program 027 (Mission Studio Homepage). |

**Program decision:** Do not start Program 029 until Homepage (027) and AI Interoperability (026) are stable. Charter missing expeditions before execution.

---

## Re-Sequenced Roadmap

```text
Phase 0 — Convergence Review (this expedition)
        │
        ▼
EXP-PROGRAM-006  Discovery Platform
        │
        ▼
EXP-PROGRAM-009  Canonical First Contact Experience
        │
        ▼
EXP-PROGRAM-004  First Contact Program (close after CERT-001)
        │
        ▼
EXP-PROGRAM-027  Mission Studio Homepage
        │
        ▼
EXP-PROGRAM-020  Website Experience (infrastructure only)
        │
        ▼
EXP-PROGRAM-029  AI Ecosystem Distribution
```

### Rationale

1. **Discovery must stabilize first.** The Homepage and Distribution surfaces project Discovery behavior; if Discovery changes, those surfaces drift.
2. **Canonical First Contact defines the narrative.** The Homepage must project the same journey.
3. **First Contact operational hardening closes next.** CERT-001 is the last remaining 004 expedition.
4. **Homepage follows narrative and Discovery.** This prevents implementing UI that will be invalidated by upstream changes.
5. **Website infrastructure follows the Homepage.** Hosting, build, SEO, and analytics assume the final surface exists.
6. **Distribution is last.** Skills, rules, MCP manifests, and templates depend on stable Homepage and protocol specifications.

---

## Required Actions

1. Update EXP-PROGRAM-004 Definition of Done to mark DISCOVERY-001, BROWNFIELD-001, CLI-001, and RUNTIME-001 as completed and accepted.
2. Update EXP-PROGRAM-009 statuses to reflect completed/accepted expeditions and rewrite 005, 006, and 008.
3. Update EXP-PROGRAM-020 scope to infrastructure-only and archive WEB-003.
4. Rewrite EXP-HOME-005 to use canonical public vocabulary.
5. Author EXP-DISCOVERY-008 with scoped operational-discovery contracts before Program 006 closure.
6. Charter missing EXP-DIST-002, 006, and relocate DIST-007 into Program 027.
7. Add the **Convergence Review Gate** to program governance: no active program may resume implementation until its charter and expeditions are reconciled with the current architecture.

---

## Acceptance Criteria

- [ ] Every remaining expedition in Programs 004, 006, 009, 020, 027, and 029 has a classification.
- [ ] Superseded/archived work is explicitly marked and no longer scheduled for implementation.
- [ ] Program charters reflect the actual status of their expeditions.
- [ ] Re-sequenced roadmap is recorded and adopted.
- [ ] Convergence review gate is documented.
- [ ] `npm run test:expedition-governance` passes.

---

## Related Documents

| Document | Relationship |
| --- | --- |
| `docs/expeditions/EXP-PROGRAM-004.md` | First Contact Program charter. |
| `docs/expeditions/EXP-PROGRAM-006.md` | Discovery Platform charter. |
| `docs/expeditions/EXP-PROGRAM-009.md` | Canonical First Contact Experience charter. |
| `docs/expeditions/EXP-PROGRAM-020.md` | Website Experience charter. |
| `docs/expeditions/EXP-PROGRAM-027.md` | Mission Studio Homepage charter. |
| `docs/expeditions/EXP-PROGRAM-029.md` | AI Ecosystem Distribution charter. |
| `docs/reference/public-vocabulary.md` | Seven-concept vocabulary constraint. |

