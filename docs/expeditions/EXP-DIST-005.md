# EXP-DIST-005 — IDE Rules Projection

> Complete the IDE rules surface by projecting the Canonical AI Capability Model into Windsurf, Roo, Aider, and Continue.dev rule formats.

**Status:** Completed and accepted  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Authority:** Synth Architectural Constitution, EXP-PROGRAM-029 charter  
**Depends On:** EXP-DIST-001 — Canonical AI Capability Model, EXP-DIST-002 — Agent Skill Projection Pipeline  
**Adoption metric:** Number of supported IDEs with generated rules  
**Target:** ≥ 6 IDEs (Cursor, Cline, Windsurf, Roo, Aider, Continue.dev)

---

## Goal

Provide SYNTH governance guidance inside the IDEs and coding agents where developers already work. Every supported IDE receives a deterministic rules file derived from the same Canonical AI Capability Model, ensuring consistent behavior across editors.

---

## Scope

### In scope

- IDE rule projections for:
  - Cursor (`.cursor/rules.mdc`) — already present; verify and align
  - Cline (`.clinerules`) — already present; verify and align
  - Windsurf (`.windsurfrules`)
  - Roo (`.roorules`)
  - Aider (`.aider-instructions.md`)
  - Continue.dev (`.continue/rules.md`)
- A shared template contract consistent with agent skills.
- Contract tests asserting all IDE rules are deterministic and fresh.

### Out of scope

- Live MCP server implementation (EXP-DIST-003)
- Agent skill expansion beyond current platforms (EXP-DIST-002)
- npm package publishing (EXP-DIST-004)
- Website redesign (EXP-DIST-007)

---

## Core abstraction

```text
Canonical AI Capability Model
        ↓
IDE Rule Templates
        ↓
├── ide-rules/.cursor/rules.mdc
├── ide-rules/.clinerules
├── ide-rules/.windsurfrules
├── ide-rules/.roorules
├── ide-rules/.aider-instructions.md
└── ide-rules/.continue/rules.md
```

---

## Acceptance criteria

1. IDE rules exist for Cursor, Cline, Windsurf, Roo, Aider, and Continue.dev.
2. Each rules file includes:
   - SYNTH identity and public vocabulary
   - Discovery-safe command guidance
   - Mutating command and approval guidance
   - Protected assets and escalation rules
   - Governance lifecycle summary
3. All IDE rules share the same canonical source and are deterministic.
4. `npm run distribution:verify-freshness` passes.
5. `npm run docs:verify-freshness` passes.

---

## Work plan

### Phase 1 — Charter and model update

- Create EXP-DIST-005 charter.
- Add Windsurf, Roo, Aider, and Continue.dev targets to the canonical model.

### Phase 2 — Template implementation

- Add Windsurf rules template.
- Add Roo rules template.
- Add Aider instructions template.
- Add Continue.dev rules template.
- Align existing Cursor and Cline rules with the shared structure.

### Phase 3 — Projection and validation

- Generate all IDE rule files.
- Update contract tests to assert the expanded surface.
- Run `npm run distribution:verify-freshness`.

### Phase 4 — Documentation and closure

- Regenerate documentation projections.
- Update `docs/Era-IV-Roadmap.md`.
- Mark expedition as `Completed and accepted`.

---

## Evidence

- [x] EXP-DIST-005 charter committed.
- [x] Canonical model updated with new IDE targets.
- [x] Six IDE rule files generated and committed.
- [x] Projection engine templates committed.
- [x] Contract tests passing.
- [x] Distribution and documentation freshness passing.

---

## Notes

- Keep each rules file native to its platform's conventions while keeping content semantically identical.
- Do not introduce new governance concepts; all guidance must derive from the frozen v1.0 model.
