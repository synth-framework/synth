# EXP-DIST-001 — Canonical AI Capability Model

> Define the single source of truth from which all agent skills, IDE rules, MCP manifests, and documentation projections are generated.

**Status:** Completed and accepted  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Authority:** Synth Architectural Constitution, EXP-PROGRAM-029 charter  
**Adoption metric:** Number of distinct distribution surfaces generated from one canonical model  
**Target:** ≥ 3 surfaces (agent skill, IDE rules, MCP manifest)  

---

## Goal

Create a stable, versioned AI Capability Model that describes everything an AI agent or IDE needs to know in order to work correctly inside a SYNTH-governed repository. This model becomes the canonical source for all Era IV distribution projections.

The model must be:

1. **Complete enough** to generate useful skills, rules, and manifests.
2. **Stable enough** to version and publish.
3. **Small enough** to remain maintainable as SYNTH evolves.

---

## Scope

### In scope

- A machine-readable canonical model describing SYNTH capabilities, commands, constraints, and workflows.
- A projection engine that transforms the canonical model into platform-specific artifacts.
- Initial projections for:
  - Agent skills / system prompts
  - IDE rules (Cursor, Cline, Windsurf, Roo, Aider, Continue.dev)
  - MCP server manifest
- Contract tests proving that identical model inputs produce deterministic outputs.

### Out of scope

- Live MCP server implementation (EXP-DIST-003)
- npm package publishing infrastructure (EXP-DIST-004)
- GitHub templates and Actions (EXP-DIST-006)
- Website redesign (EXP-DIST-007)

---

## Core abstraction

```text
AI Capability Model
        ↓
Projection Engine
        ↓
├── agent-skills/
│   ├── claude.md
│   ├── codex.md
│   ├── cursor.md
│   └── ...
├── ide-rules/
│   ├── .cursor/rules.mdc
│   ├── .clinerules
│   └── ...
└── mcp/
    └── manifest.json
```

The canonical model lives in the source tree as a structured artifact. Projections are generated, deterministic, and committed so drift is detectable.

---

## Acceptance criteria

1. A canonical model file exists under `src/distribution/ai-capability-model.json` (or equivalent structured source).
2. The model describes at minimum:
   - Public vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)
   - CLI commands and their safety classification (READ_ONLY, PROPOSAL_ONLY, MUTATING)
   - Protected assets and escalation rules
   - Governance lifecycle phases
   - Common operator workflows
3. A projection script `scripts/project-ai-capabilities.js` reads the model and writes artifacts to `distribution/`.
4. Projections are generated for at least three surfaces:
   - Agent skill / system prompt
   - IDE rules
   - MCP manifest
5. Contract tests assert deterministic output and detect schema drift.
6. Documentation projection freshness passes after the new artifacts are committed.

---

## Work plan

### Phase 1 — Model design

- Survey existing capability definitions in `src/capabilities/` and `src/cli/`.
- Define the canonical schema.
- Author the initial model.

### Phase 2 — Projection engine

- Implement the projection script.
- Add deterministic output guarantees (stable ordering, no timestamps).

### Phase 3 — Initial projections

- Generate agent skill files.
- Generate IDE rule files.
- Generate MCP manifest.

### Phase 4 — Validation

- Add contract tests.
- Run `npm run docs:verify-freshness`.
- Update `docs/Era-IV-Roadmap.md` to reflect EXP-DIST-001 as completed.

---

## Evidence

- [x] Canonical model source committed.
- [x] Projection engine committed.
- [x] Generated artifacts committed.
- [x] Contract tests passing.
- [x] Documentation freshness passing.

---

## Notes

- This expedition intentionally produces architecture, not a live service. Live distribution channels are owned by downstream EXP-DIST expeditions.
- The model should be conservative. It is easier to add capabilities later than to remove incorrectly published ones.
- All projections must respect the v1.0 frozen architecture. No projection may introduce a new governance concept.
