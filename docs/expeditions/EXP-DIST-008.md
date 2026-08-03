# EXP-DIST-008 — Consume Program 043 Capability List in AI Projections

> Make the AI capability projection engine read the canonical `docs/reference/capability-list.json` produced by Program 043 and include those capabilities in generated agent skills, IDE rules, and the MCP manifest.

**Status:** Completed and accepted  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Authority:** EXP-PROGRAM-029 charter, EXP-PROGRAM-043 Workstream C (Capability Transparency)  
**Depends On:**
- EXP-DIST-001 — Canonical AI Capability Model
- EXP-DIST-002 — Agent Skill Projection Pipeline
- EXP-CAPTRANS-001 — `synth capabilities` command (Program 043)

**Blocks:** Future distribution surfaces that advertise installed CLI capabilities (MCP registry, npm metadata, website).

---

## Goal

Distributed SYNTH artifacts currently project commands, public vocabulary, protected assets, and governance lifecycle from the Canonical AI Capability Model. They do not yet advertise the runtime capabilities enumerated in `docs/reference/capability-list.json`.

This expedition closes that gap so that agent skills, IDE rules, and MCP manifests tell the same story as `synth capabilities`.

## Scope

### In scope

- Load `docs/reference/capability-list.json` in `scripts/project-ai-capabilities.js`.
- Validate the list schema (`synth-capability-list-v1`) and the `capabilities` array.
- Inject capability names/descriptions into every generated agent skill and IDE rules file.
- Add a `capabilities` field to the generated MCP manifest.
- Add a contract test proving that every capability in the list appears in the projected artifacts.
- Regenerate and commit all distribution artifacts under `distribution/`.
- Update Program 029 composition to record this expedition.

### Out of scope

- Changing the source of truth for capabilities (still `src/capability/registry.ts` via `scripts/generate-capability-list.js`).
- Live MCP server behavior changes beyond manifest content.
- New distribution surfaces (npm metadata, website) — those are deferred to EXP-DIST-004/006/007.

## Core abstraction

```text
src/capability/registry.ts
        ↓
scripts/generate-capability-list.js
        ↓
docs/reference/capability-list.json  ← Program 043 output
        ↓
scripts/project-ai-capabilities.js   ← reads both the canonical model and the capability list
        ↓
├── agent-skills/*.md                ← include "Capabilities" section
├── ide-rules/*                      ← include "Capabilities" section
└── mcp/manifest.json                ← include "capabilities" array
```

The canonical AI Capability Model remains the single source of truth for commands, vocabulary, protected assets, and workflows. The capability list is a secondary, versioned input that the projection engine merges deterministically.

## Acceptance criteria

1. `scripts/project-ai-capabilities.js` reads `docs/reference/capability-list.json` on every run.
2. Every generated agent skill contains a `## Capabilities` section listing all capabilities from the list.
3. Every generated IDE rules file contains a capabilities section appropriate to its format.
4. `distribution/mcp/manifest.json` contains a `capabilities` array with every capability name.
5. `tests/ai-capability-projection.test.js` asserts that the projection includes every capability from the list.
6. `npm run distribution:verify-freshness` passes after regenerating artifacts.
7. Program 029 composition documents EXP-DIST-008.

## Work plan

### Phase 1 — Load capability list

- Add `CAPABILITY_LIST_PATH` constant to `scripts/project-ai-capabilities.js`.
- Implement `readCapabilityList()` with schema validation.
- Pass the loaded capabilities into the projection pipeline.

### Phase 2 — Project capabilities into artifacts

- Add a shared `formatCapabilities(capabilities)` helper.
- Update each skill/rules template to include capabilities.
- Update `mcpManifest()` to emit a `capabilities` array.
- Keep model hashing based on the canonical model only, so source hashes remain stable.

### Phase 3 — Contract test

- Add a test that loads the capability list and verifies that generated projections contain every capability name.
- Run targeted projection and MCP tests.

### Phase 4 — Regenerate and close

- Run `node scripts/project-ai-capabilities.js`.
- Run `npm run distribution:verify-freshness`.
- Update `docs/expeditions/EXP-PROGRAM-029.md`.
- Mark EXP-DIST-008 as completed and accepted.

## Evidence

- [x] Projection script reads `docs/reference/capability-list.json`.
- [x] Generated skills and rules include capabilities.
- [x] MCP manifest includes `capabilities` array.
- [x] Contract test passes.
- [x] Distribution freshness passes.
- [x] Program 029 composition updated.

## Notes

- This expedition does not modify the Capability Model or the event model; it only consumes a Program 043 output.
- Keep the projection deterministic: capability ordering must follow the input file, and no timestamps may leak into generated artifacts.
- If the capability list is missing or malformed, the projection script should fail fast with a clear error rather than generate stale artifacts.
