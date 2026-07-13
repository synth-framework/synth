# Coding Standards

## Architecture Conformance

All code must conform to the Synth architecture. This is not a style preference -- it is a structural requirement.

### Rules

1. **Domain logic must be pure** -- no side effects, no I/O, no external references
2. **Validation must happen before policy** -- schema check before authorization
3. **Policy must happen before execution** -- authorization before domain logic
4. **Events must have transaction IDs** -- every event produced by dispatch
5. **Store writes must go through the guard** -- never write directly to the event store
6. **Runtime must not be exported** -- internal only, never in public API
7. **Post-seal mutations must be impossible** -- frozen registry, frozen policy, frozen API

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Capabilities | PascalCase, VerbNoun | `CreateWorkItem`, `StartMilestone` |
| Events | SCREAMING_SNAKE, ENTITY_ACTION | `TICKET_STARTED`, `PROJECT_CREATED` |
| Invariants | I + number | `I1`, `I5` |
| Components | PascalCase | `CommandBus`, `RuntimeEngine` |
| Functions | camelCase | `applyDomain`, `computeStateHash` |
| Constants | SCREAMING_SNAKE | `GUARD_PASS` |
| Files | kebab-case | `synth-v5.js`, `verify-replay.js` |

## Code Organization

### Within the Kernel File

Organize code by architectural layer:

```
// P1: Cryptographic attestation
class InvocationPermit { ... }
class ExecutionCoordinator { ... }

// L3: Domain
function applyDomain(intent, state) { ... }

// L2: Policy
class PolicyEngine { ... }

// L2: Infrastructure
class EventStore { ... }

// L3: Runtime
class RuntimeEngine { ... }

// L1: Authority
class CommandBus { ... }

// API
class SynthAPI { ... }
```

### Dependency Rules

Dependencies must flow downward through layers:

```
API → CommandBus → PolicyEngine → (no upward deps)
               → ExecutionCoordinator → RuntimeEngine → Domain
               → EventStore (guarded)
```

**Forbidden:**
- RuntimeEngine depending on PolicyEngine
- Domain depending on EventStore
- EventStore depending on API

## Error Handling

### Invariant Violations

Use `InvariantViolation` for architectural constraint breaches:

```
throw new InvariantViolation("I5", "Registry must be frozen after bootstrap")
```

### Policy Blocks

Use `PolicyBlockedError` for policy denials:

```
throw new PolicyBlockedError(capability, reason, partition)
```

### Validation Failures

Return structured validation results:

```
{ valid: false, errors: [{ field, message, severity }] }
```

### Store Guard

The guard rejects direct writes with a clear error:

```
ILLEGAL_EVENTSTORE_WRITE: append() must be called through CommandBus
```

## Testing Standards

Every change must:
1. Pass all existing tests
2. Include new tests for new behavior
3. Include invariant tests for architectural changes
4. Pass all verification scripts (audit, replay, determinism)

See [Testing](testing.md) for detailed testing philosophy.

## Related Documents

- [Testing](testing.md) -- Testing philosophy and patterns
- [Contributing](contributing.md) -- Contribution workflow
