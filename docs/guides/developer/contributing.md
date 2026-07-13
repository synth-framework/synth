# Contributing

## Contribution Workflow

1. **Read the architecture handbook** before making changes
2. **Understand the invariants** your change must preserve
3. **Write tests** for new behavior
4. **Run the full test suite** before submitting
5. **Run verification scripts** before submitting
6. **Review the architectural rules** in the AI contributor guide

## Architecture Review Checklist

Before any change is accepted, it must pass:

- [ ] All existing tests pass
- [ ] New tests cover new behavior
- [ ] Invariant tests pass (I1-I8)
- [ ] Audit bypass map shows no illegal paths
- [ ] Replay verification passes
- [ ] Determinism verification passes
- [ ] Documentation updated (if needed)
- [ ] Cross-references maintained

## What Requires Review

| Change Type | Review Required |
|-------------|----------------|
| New capability | Yes |
| New policy | Yes |
| Domain logic change | Yes (architecture review) |
| Invariant change | Yes (architecture review) |
| Kernel component change | Yes (architecture review) |
| Test addition | No (if following patterns) |
| Documentation update | No (if accurate) |
| Bug fix | Yes |

## Prohibited Changes

The following must never be changed without explicit architectural approval:

- Single mutation authority (I1)
- Append-only event store
- Guard token mechanism
- Event immutability
- Permit validation semantics
- Seal irreversibility
- Determinism requirements

## Extension Guidelines

Preferred way to add functionality:

1. Register a new capability (before seal)
2. Register a new policy (before seal)
3. Implement domain logic
4. Add tests
5. Verify replay still passes

See [16 - Extension Model](../../architecture/16-extension-model.md) for details.

## Refactoring Guidelines

When refactoring:

1. Ensure all invariants are preserved
2. Ensure no new mutation paths are created
3. Ensure the public API surface is unchanged (or updated intentionally)
4. Run full test suite
5. Run verification scripts

## Questions to Ask

Before making a change, ask:

- Does this preserve the single mutation authority?
- Does this maintain deterministic execution?
- Does this respect the trust boundaries?
- Does this violate any invariant?
- Does this create a new mutation path?
- Can this be done as an extension instead of a modification?

## Related Documents

- [Coding Standards](coding-standards.md) -- Code conventions
- [Testing](testing.md) -- Testing requirements
- [AI-Safe Components](ai-safe-components.md) -- AI-specific guidance
