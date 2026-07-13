# Contributing to Synth

Thank you for your interest in contributing to Synth.

## Governance

Synth is governed by its Architectural Constitution and ADRs. All significant work is done through **Expeditions**. Before starting work, check whether an approved Expedition covers your change.

- For architecture changes: an ADR is required.
- For public-facing changes: an Expedition is required.
- For bug fixes and documentation improvements: an issue or PR is sufficient.

## How to Contribute

1. **Open an issue** describing the bug, feature, or documentation improvement.
2. **Discuss the approach** before writing significant code.
3. **Fork the repository** and create a feature branch.
4. **Make your changes** following the project's conventions.
5. **Run the governance pipeline** locally:

   ```bash
   npm run govern
   ```

6. **Open a pull request** using the PR template.

## Development Setup

```bash
git clone <repository-url>
cd synth-v2
npm install
npm run build
npm test
```

## Conventions

- Follow the [File Naming Conventions](docs/guides/developer/file-naming-conventions.md).
- Use the seven public concepts in public-facing docs: Mission, Expedition, Evidence, Plan, Event, State, Replay.
- Keep internal component names out of operator-facing documentation.
- Write tests for new capabilities.

## Running Tests

```bash
npm run test
npm run test:all
npm run govern
```

## Questions?

Open a discussion or ask in an existing issue.
