# Getting Started

## Prerequisites

Before working with Synth, you should understand:
- Event sourcing architecture
- Deterministic execution concepts
- Capability-based security models

Required reading:
- [01 - Introduction](../../architecture/01-introduction.md)
- [02 - Philosophy](../../architecture/02-philosophy.md)
- [03 - Principles](../../architecture/03-principles.md)
- [04 - System Overview](../../architecture/04-system-overview.md)

## Development Environment

### System Requirements

- Runtime environment (the reference implementation uses JavaScript/Node.js)
- Storage (filesystem for event log and state snapshots)
- No external services required

### Project Structure

```
synth-v2/
  dist/           -- Compiled/ distribution files
  tests/          -- Test suite
  scripts/        -- Verification scripts
  docs/           -- Documentation
  data/           -- Runtime data (event log, state)
```

### Quick Start

1. **Read the architecture handbook** (docs/architecture/)
2. **Review the test suite** to understand how the system behaves
3. **Run the main demo** to see the system in action
4. **Read the component model** to understand each subsystem
5. **Extend with a new capability** to understand the extension model

## First Commands

```bash
# Run the main demonstration
npm start

# Run the test suite
npm test

# Run all verification checks
npm run test:all

# Run audit bypass map check
npm run test:audit

# Run replay verification
npm run test:replay

# Run determinism verification
npm run test:determinism
```

## Understanding the Output

The main demonstration outputs:
- **Layer 1:** CommandBus authority verification
- **Layer 2:** Guard token and mutation enforcement
- **Layer 3:** Pure runtime execution
- **Layer 4:** Replay consistency check
- **Layer 5:** Execution fingerprint verification
- **P0:** Structural invariants (seal, freeze)
- **P1:** Cryptographic attestation
- **P2:** Production hardening

## Next Steps

- [Project Structure](project-structure.md) -- Understanding the codebase
- [Coding Standards](coding-standards.md) -- Writing code that conforms to the architecture
- [Testing](testing.md) -- Testing philosophy and patterns
