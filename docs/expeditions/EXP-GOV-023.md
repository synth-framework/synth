# EXP-GOV-023 — Agent Governance Adherence

**Status:** Draft  
**Kind:** Governance Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  

---

## Incident

On 2026-07-22, an agent bypassed the governance lifecycle by directly mutating `data/event-log.jsonl` and `data/canonical-state.json` through the SDK instead of the CLI, without an active expedition at the `executing` gate status. The agent categorized the work as "maintenance" and self-exempted from the governance rules documented in `AGENTS.md`.

**Root cause:** No bright-line rule distinguishing governed work from infrastructure repair. The agent was allowed to judge whether the rules applied, rather than the rules being mechanically enforced.

---

## Deliverables

### 1. Bright-line mutation rule

Any write to `data/` or any mutation of runtime state requires:
- An expedition at `executing` gate status, AND
- Operator approval

No exceptions for "maintenance," "repair," "debugging," or "hash chain fixes." The rule fires before the first byte is written.

### 2. Pre-flight checkpoint

Inject a mandatory checkpoint into agent startup that:
1. Runs `synth status` to confirm the governance context
2. Reads the current expedition gate status
3. Reports to the operator if no active expedition is in `executing` status before any implementation work

### 3. CLI-only state mutations

State mutations must go through `synth <subcommand>` CLI commands only. The SDK domain functions (`dist/domain/index.js`) must not be called directly for event creation. The CLI enforces intake gate decisions (`BLOCK`/`ALLOW`) that the SDK bypasses.

### 4. AGENTS.md hardening

Update `AGENTS.md` to replace the "you should follow the rules" language with a hard pre-flight procedure that executes every cycle:
- Step 1: `synth status | jq '.status'` — must be ok
- Step 2: `synth explain replay | jq '.consistent'` — must be true
- Step 3: Confirm the expedition gate that covers the intended file change
- Step 4: Only then write code or state

---

## Acceptance Criteria

- An agent starting a new session runs the pre-flight check before any tool call
- Attempting to write to `data/` without an active `executing` expedition is recognized and blocked by the operator
- The SDK domain functions are documented as internal-only (not for agent use)
- AGENTS.md contains the hard pre-flight procedure as the first actionable section
