# EXP-SEC-001 — Execution Gate Bypass Hardening

> **Security expedition.** Close critical bypass paths that allow mutations outside the ExecutionGate.

**Status:** Proposed  
**Kind:** Security Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-038 — Audit Remediation  
**Phase:** 1 — Security  
**Authority:** Synth Architectural Constitution  
**Depends On:** ADR-050  
**Blocks:** None

---

```yaml
Impact:
  Constitutional: Yes (via ADR-050)
  Product: No
  User Facing: No
  Architecture Freeze: Lifted per ADR-050
  Requires ADR: ADR-050
```

---

## Findings Addressed

| ID | Finding | Severity |
|----|---------|----------|
| C1 | PartitionStore/SegmentStore/CheckpointStore have no authorization — direct filesystem write bypass | Critical |
| C2 | FilesystemProvider.writeFile() has no authorization — 22 import sites, unrestricted write path | Critical |
| C3 | GitAdapter uses `execSync(\`git ${args.join(" ")}\`)` — shell injection risk in 3 locations | Critical |
| M6 | EventStore stack-trace guard breaks on minification — fragile string match on "ExecutionGate" | Medium |
| M7 | `Object.freeze()` on Map is shallow in registry and policy engine | Medium |
| M8 | FilesystemMutationProvider and FilesystemWrite capability are dead code — imported but never wired | Medium |
| L3 | No token expiration/rotation for EventStore/StateStore write tokens | Low |
| L4 | Verification context creates unguarded store instances | Low |

---

## Deliverables

1. **PartitionStore/SegmentStore/CheckpointStore authorization** — Implement Symbol-token authorization matching EventStore pattern.
2. **FilesystemProvider write guard** — Require authorization token for `writeFile()`. Scope writes to workspace root.
3. **GitAdapter shell injection fix** — Replace `execSync` string interpolation with `execFile("git", args)` in all 3 locations.
4. **Stack-trace guard hardening** — Replace stack-trace string matching with explicit Symbol token parameter or equivalent.
5. **Deep freeze Registry/Policy contents** — Freeze each entry in the Map, not just the Map reference.
6. **Wire or remove dead mutation code** — Either register `FilesystemMutationProvider` in bootstrap or remove the dead import and `FilesystemWrite` capability.
7. **Integration tests** — Verify no mutation succeeds without ExecutionGate authorization.
8. **Adversarial audit update** — Add scenarios for each fixed bypass path.

---

## Acceptance Criteria

1. No `PartitionStore`, `SegmentStore`, or `CheckpointStore` write succeeds without authorization token.
2. No `FilesystemProvider.writeFile()` succeeds without authorization or for paths outside workspace root.
3. `execFile("git", args)` is used in all 3 Git adapter locations — no `execSync` with string interpolation.
4. Registry/policy engine contents resist mutation after `seal()` (deep freeze).
5. All existing tests pass; new adversarial tests pass.
6. Dead code paths are either wired or removed.

---

## Out of Scope

- Event schema changes.
- Public API changes to ExecutionGate.
- Performance optimization of authorization checks.

---

## Relationship to Other Work

- **ADR-050** — Authorizes freeze lift for execution path changes.
- **EXP-GOV-014** — Governance engine integrity (parallel, no overlap).
