# Program 027 Homepage Governability Incident Review

**Incident:** Governability regression — implementation conformed to expedition specifications but diverged from human intent.  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Status:** Root cause analyzed; corrective governance layer accepted; retrofit in progress.  
**Review date:** 2026-07-22  
**Related ADRs:** ADR-047, ADR-048  
**Related expeditions:** EXP-HOME-026, EXP-HOME-027, EXP-REFINE-008

---

## 1. Executive summary

Program 027 was chartered to make Mission Studio the SYNTH homepage. It had strong specifications, design tokens, component catalogs, explicit anti-goals, and approved expeditions. Despite this, the implementation drifted toward a generic SaaS dashboard aesthetic. The agent was **compliant with the expedition definitions of done** but **not converged with the originating human intent**.

This is a **governability certification failure**, not an implementation failure. The existing lifecycle governed execution correctness but did not provide a repeatable way to prove it prevented intent drift. The gap has since been addressed at the specification level by ADR-047 (Intent Refinement and Alignment Governance) and ADR-048 (Genesis Lifecycle and Alignment Contracts). This review reconstructs the failure as an immutable benchmark so that the replay can prove the failure mode is now preventable.

---

## 2. Timeline

| Phase | Artifact / gate | What happened |
|---|---|---|
| Charter | EXP-PROGRAM-027 | Mission Studio becomes the SYNTH homepage. |
| Design baseline | EXP-HOME-001, EXP-HOME-002, EXP-HOME-025 | Design language, component catalog, and anti-drift rules approved. |
| Synthesis | EXP-HOME-004 through EXP-HOME-018 | Implementation expeditions executed against their individual DoDs. |
| Observation | Homepage drift detected | Implementation accumulated generic dashboard patterns (metric cards, promotional sections, disconnected widgets) despite explicit anti-goals. |
| Diagnosis | ADR-047, ADR-048 | Root cause identified: no governed transformation from raw intent to executable understanding. |
| Corrective Genesis | EXP-HOME-026 | Intent Model captured explicit, implicit, forbidden, and allowed interpretations. |
| Corrective alignment | EXP-HOME-027 | Alignment Contract approved; Divergence Gate resolves to `aligned`. |
| Retrofit | EXP-REFINE-008 (proposed) | Program 027 paused; becomes pilot for the Genesis Layer. |

---

## 3. The failure mode

### 3.1 Symptom

The homepage began to look and behave like a conventional developer-tool landing page rather than a persistent Mission Studio workspace.

### 3.2 Root cause

The lifecycle began at the Mission artifact:

```text
Intent
  ↓
Mission
  ↓
Expedition
  ↓
Implementation
```

There was no governed checkpoint that asked:

> "Does the Mission artifact accurately represent the human intent?"

More precisely, the Mission allowed an **interpretation space** containing many admissible outcomes — generic dashboards, marketing pages, chat interfaces, persistent workspaces — all consistent with the same specification. Governance failed because it did not collapse that space to acceptable interpretations. The expeditions had strong DoDs, but each DoD validated a narrow slice of output. The aggregate output could satisfy every expedition while violating the overall experience contract.

### 3.3 Why existing governance did not catch it

| Existing mechanism | What it checked | Why it failed |
|---|---|---|
| Expedition DoDs | Per-expedition acceptance criteria | Each expedition was locally correct; no artifact checked global intent convergence. |
| Review Gates | Implementation against expedition spec | Specs did not encode the full intent; compliance ≠ convergence. |
| Design governance rules (EXP-HOME-025) | Visual rules and anti-patterns | Rules were advisory relative to expeditions, not binding at Mission creation. |
| Replay | Event determinism and state correctness | Replay verifies what was built, not whether it should have been built. |

### 3.4 The critical sentence

> The implementation was *compliant* with the specifications but not *converged* with the human intent.

This is the failure class the Genesis Layer was created to prevent.

---

## 4. What has changed

### 4.1 New lifecycle

```text
Human Intent
      ↓
Intent Model
      ↓
Refinement Session
      ↓
Refined Intent Artifact
      ↓
Alignment Contract
      ↓
Reference Evidence Binding
      ↓
Divergence Gate  ←  NEW: alignment checkpoint
      ↓
Mission
      ↓
Expedition
      ↓
Implementation
      ↓
Review Gate
      ↓
Acceptance Gate
      ↓
Convergence Certification  ←  NEW: outcome-vs-intent check
```

### 4.2 New artifacts

| Artifact | Purpose | Introduced by |
|---|---|---|
| Intent Model | Capture explicit, implicit, forbidden, and ambiguous intent | ADR-047 |
| Refined Intent Artifact | Contract-ready interpretation | ADR-047 |
| Alignment Contract | Formal agreement between operator and SYNTH | ADR-047 / ADR-048 |
| Reference Evidence Binding | Bind requirements to images, designs, examples | ADR-048 |
| Divergence Gate | Block Mission creation until alignment is proven | ADR-047 / ADR-048 |
| Convergence Certification | Compare final outcome to original intent | ADR-047 / ADR-048 |

### 4.3 Program 027 retrofit status

| Retrofit step | Status |
|---|---|
| Intent Model (EXP-HOME-026) | ✅ Complete |
| Alignment Contract (EXP-HOME-027) | ✅ Approved |
| Reference Evidence Binding | ✅ Bound to design boards, LDS-002, component catalog |
| Divergence Gate | ✅ `aligned` |
| Mission Approval (EXP-HOME-028) | 📋 Pending |
| Convergence Certification criteria | ❌ Not yet defined |

---

## 5. Failure-to-fix traceability matrix

| Failure observed | Addressed by | Mechanism | Status | Proven? |
|---|---|---|---|---|
| Multiple infrastructure choices for same operation | EXP-PLATFORM-002 | Canonical Internal SDK | ✅ Complete | Yes — one owner per concern |
| Hidden construction inputs | EXP-PLATFORM-003 | Explicit timestamp/id parameters | ✅ Complete | Yes — construction consumes explicit inputs |
| Capability ambiguity | EXP-PLATFORM-001 | Canonical Infrastructure Matrix | ✅ Complete | Yes — responsibilities assigned |
| Intent captured incorrectly | EXP-PROGRAM-036 / ADR-047 | Intent Model + Refinement Layer | ✅ Specified | **No** — not yet exercised end-to-end |
| Agreement not validated before execution | EXP-PROGRAM-036 / ADR-048 | Alignment Contract + Divergence Gate | ✅ Specified | **No** — gate exists but has not rejected a real drift |
| Drift detected before implementation | Divergence Gate | `revision_required` / `rejected` states | ✅ Specified | **No** — no regression test proves rejection |
| Drift detected before merge | EXP-PROGRAM-035 / Review Gate | Review Gate, Acceptance Gate | 📋 In flight | **No** — gates not yet enforced against the retrofit |
| Implementation-vs-intent convergence | Convergence Certification | Compare outcome to Alignment Contract | ❌ Not defined | **No** — artifact and criteria absent |
| Authority ordering violations | ADR-046 | Runtime evaluates authority chain before representing state | ✅ Accepted | Partial — needs certification |

**Key insight:** The top half of the matrix (platform and construction) is proven. The bottom half (governance of intent and convergence) is specified but not yet demonstrated.

---

## 6. What remains unproven

1. **The Divergence Gate can reject a realistic drift.** It has approved the corrected Program 027 intent, but it has not yet been shown to reject an implementation-bound drift.
2. **The Alignment Contract is sufficient to prevent the original failure.** The contract forbids generic dashboards, but this has not been tested against a deliberately divergent proposal.
3. **Convergence Certification can detect post-implementation drift.** The artifact and criteria do not yet exist.
4. **The Genesis Layer generalizes beyond Program 027.** One pilot does not prove the layer works for arbitrary raw intent.

---

## 7. Recommendation

This incident review is **Phase 0** of the Governability Closure Roadmap (`docs/strategy/governability-closure-roadmap.md`).

Before Phase IV cleanup or Program 035/036 full implementation, run **EXP-GOVERNABILITY-001 — Governability Regression Certification**. The certification executes Phase 3 of the closure roadmap and should:

- Submit the original non-converged homepage proposal.
- Prove the Divergence Gate rejects it or demands revision.
- Prove the Alignment Contract cannot be approved without explicit anti-dashboard constraints.
- Define Convergence Certification criteria for Program 027.

Only after the certification passes should Program 027 implementation resume and the Genesis Layer be considered validated.

---

## 8. Related artifacts

- `docs/adr/ADR-047-intent-refinement-and-alignment-governance.md`
- `docs/adr/ADR-048-genesis-lifecycle-and-alignment-contracts.md`
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-HOME-026.md`
- `docs/expeditions/EXP-HOME-027.md`
- `docs/expeditions/EXP-REFINE-008.md`
- `docs/governance/program-027/intent-model.json`
- `docs/governance/program-027/alignment-contract.json`
- `docs/governance/program-027/refinement-report.json`
