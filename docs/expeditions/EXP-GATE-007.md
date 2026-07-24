# EXP-GATE-007 — Acceptance Policies

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Phase:** Phase 2 — Artifacts  
**Depends On:** EXP-GATE-001, EXP-GATE-003, EXP-GATE-004  
**Blocks:** EXP-GATE-008, EXP-GATE-009, EXP-GATE-012

---

## Thesis

> **A gate without a resolver is a bottleneck wearing the mask of governance.**
>
> Every gate must declare not only *what* is decided but *who* is allowed to decide it. Without explicit acceptance policies, review authority drifts to whoever is available, and critical gates collapse into informal consensus or self-approval.

This expedition defines the authority model that assigns gate resolution to humans, AI agents, councils, engines, or asset owners, and supplies concrete examples for Refinement, Review, and Acceptance Gates.

---

## Purpose

Make gate resolution a governed, reproducible artifact by:

- Naming every class of resolver that may resolve a gate.
- Defining how each resolver is selected and recorded.
- Prohibiting an implementation agent from approving its own work under non-Automatic policies.
- Providing canonical policy examples for Refinement, Review, and Acceptance Gates.
- Establishing escalation rules for conflicts, unavailable resolvers, and policy gaps.

---

## Goal

Produce the **Acceptance Policy** artifact and schema that the execution engine and Mission Studio will use to:

1. Identify the resolver for any gate instance.
2. Enforce the self-approval prohibition.
3. Record resolver identity as a replayable governance event.
4. Escalate when a required resolver is unavailable or conflicted.
5. Map each policy to one of the three completion policies: Automatic, Human Approval Required, or AI Approval Required.

---

## Resolver Taxonomy

| Resolver | Definition | Typical Use |
|---|---|---|
| **Human** | A person with explicit authority over the domain or asset. | Design review, architecture decisions, product acceptance, experience-shaping work. |
| **AI** | An AI agent distinct from the implementation agent. | Documentation quality, naming consistency, style checks, generated asset review. |
| **Council** | A group of humans and/or AI agents with collective decision authority. | Cross-cutting changes, constitutional concerns, disputed reviews. |
| **Engine** | A deterministic validation or certification engine. | Automated evidence verification, regression gates, policy compliance checks. |
| **Asset Owner** | The human or team accountable for a Protected Asset touched by the work. | Changes that affect Protected Assets such as schemas, public vocabulary, or constitutional contracts. |

A single gate may require more than one resolver (for example, a human reviewer plus an asset-owner sign-off). The policy must list them in resolution order.

---

## Policy Schema

Every Acceptance Policy SHALL contain:

```text
policy_id                → unique identifier
gate_type                → Refinement | Review | Acceptance
completion_policy        → Automatic | Human Approval Required | AI Approval Required
resolvers                → ordered list of resolver entries
  resolver_type          → human | ai | council | engine | asset_owner
  qualifier              → optional role, team, or capability constraint
  required               → true | false
  fallback               → next resolver or escalation path
self_approval_allowed    → true | false
recorded_as              → event type in the event log
escalation_path          → default path when resolver is unavailable or conflicted
examples                 → concrete examples of covered expeditions
```

---

## Canonical Examples

### Refinement Gate — Human + Evidence

```yaml
policy_id: refinement-default
gate_type: refinement
completion_policy: Human Approval Required
resolvers:
  - resolver_type: human
    qualifier: mission_owner
    required: true
    fallback: escalate_to_council
self_approval_allowed: false
recorded_as: RefinedIntentApproved
escalation_path: council_review
examples:
  - Homepage design intent
  - New architectural program proposal
  - Protected asset change request
```

### Review Gate — Human for Design, AI for Docs

```yaml
policy_id: review-default
gate_type: review
completion_policy: Human Approval Required
resolvers:
  - resolver_type: human
    qualifier: design_reviewer
    required: true
    fallback: ai_style_review
  - resolver_type: ai
    qualifier: documentation_quality
    required: false
    fallback: skip
self_approval_allowed: false
recorded_as: ReviewGateDecision
escalation_path: council_review
examples:
  - Mission Studio UI changes → human design reviewer
  - Generated documentation → AI documentation reviewer
  - Mechanical refactoring → AI consistency reviewer
```

### Acceptance Gate — Certification Engine + Stakeholder

```yaml
policy_id: acceptance-default
gate_type: acceptance
completion_policy: Human Approval Required
resolvers:
  - resolver_type: engine
    qualifier: certification_suite
    required: true
    fallback: reject
  - resolver_type: human
    qualifier: stakeholder
    required: true
    fallback: escalate_to_council
self_approval_allowed: false
recorded_as: AcceptanceGateDecision
escalation_path: program_owner_review
examples:
  - Homepage release acceptance
  - Program milestone promotion
  - Public API version acceptance
```

---

## Escalation and Conflict Rules

1. **Unavailable resolver.** If the assigned resolver is unreachable within the policy-defined window, the fallback resolver is invoked. If no fallback exists, the gate escalates to the council or program owner.
2. **Conflicted resolver.** A resolver who implemented the work, owns the implementation agent, or materially benefits from approval is conflicted and MUST recuse. A conflicted resolver cannot satisfy a non-Automatic policy.
3. **Disputed decision.** A resolver decision may be challenged by another resolver, asset owner, or the implementation agent. The dispute escalates to the council defined for that policy.
4. **Missing policy.** If no policy applies to a gate, the default is Human Approval Required and escalation to the program owner.

---

## Acceptance Criteria

- The resolver taxonomy (human, AI, council, engine, asset owner) is documented with unambiguous definitions.
- A machine-readable Acceptance Policy schema exists and validates all canonical examples.
- Examples are provided for Refinement Gate, Review Gate, and Acceptance Gate.
- The self-approval prohibition is explicit: an implementation agent cannot resolve a gate for work it performed under Human or AI Approval Required policies.
- Escalation paths for unavailable, conflicted, and disputed resolvers are defined.
- Each policy maps cleanly to one of the three completion policies: Automatic, Human Approval Required, or AI Approval Required.
- Resolver identity and decision are recorded as replayable governance events in the event log.
- Mission Studio can display the assigned resolver and escalation state for any active gate.

---

## Out of Scope

- Implementing the engine that enforces these policies (EXP-GATE-008).
- Defining the Review Gate Package or Refined Intent Artifact schemas (EXP-GATE-005, EXP-GATE-006).
- Building the UI for resolver selection or council workflows.
- Real-time negotiation protocols between resolvers.

---

## Protected Assets

The following artifacts introduced or governed by this expedition SHALL NOT be modified without a governance event:

- Acceptance Policy schema
- Resolver taxonomy definitions
- Default policies for Refinement, Review, and Acceptance Gates
- Self-approval prohibition rule
- Escalation and conflict-resolution rules
- Gate engine logic that enforces resolver policies

Any change to these assets requires an Architecture Expedition and a new ADR.

---

## Relationship to Program 035

EXP-GATE-007 is the third expedition in **Phase 2 — Artifacts** of EXP-PROGRAM-035. It completes the artifact layer by defining *who* may resolve each gate, while EXP-GATE-001, EXP-GATE-003, and EXP-GATE-004 define the lifecycles and decision model, and EXP-GATE-005 and EXP-GATE-006 define the artifacts that flow through those gates.

Once accepted, this expedition unblocks Phase 3 engine work (EXP-GATE-008, EXP-GATE-009) and the certification phase (EXP-GATE-012). Program 027 will use these policies as the pilot certification project.

---

## Relationship to Other Work

- **EXP-PROGRAM-035 — Intent Refinement & Review Governance** provides the three-gate model this expedition staffs.
- **EXP-GATE-001 — Review Lifecycle**, **EXP-GATE-003 — Refinement Lifecycle**, and **EXP-GATE-004 — Decision Model** provide the gate semantics this expedition assigns resolvers to.
- **EXP-GATE-008 — Review Gate Engine** will enforce the policies defined here.
- **EXP-PROGRAM-027 — Mission Studio Homepage** will pilot these acceptance policies when it resumes.

---

## Long-Term Vision

Every SYNTH gate carries an explicit, auditable acceptance policy. Operators and AI agents always know who is allowed to resolve a gate, what happens when that resolver is unavailable, and how to challenge a conflicted decision. Governance becomes not a social convention but a replayable contract.
