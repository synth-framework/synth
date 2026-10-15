# Final application samples from the three-path E2E

These are **agent-written final-state artifacts**, not SYNTH-generated applications or untouched intake fixtures. The original isolated fixtures and full command/result JSON are under `/home/user/todo-e2e-study/`. In this copy, `.synth/` state and generated docs are intentionally excluded; the synthetic decision is retained in [TEST-OPERATOR-DECISION.md](TEST-OPERATOR-DECISION.md).

- `greenfield/` began empty, with only the idea passed to first-contact before these files existed.
- `brownfield/` began with a root-level Node project and in-memory add/list/complete module and one baseline test. The new source preserves that API and has a dedicated isolated legacy-API test.
- `documentation/` began with `knowledge/product.md` and `knowledge/constraints.md` and no app. `knowledge/decision.md` was **later added by the agent** to represent the simulated test operator's resolution, before the second docs generation.

Use Node >=20 and run `npm test` within any of the three folders. Run `node src/cli.js add "A task"` and `node src/cli.js list` to try the CLI. Its default `.todo-data.json` is created in your working directory; set `TODO_DATA_FILE` to another path if desired. Running SYNTH's intake from these **final** copies is not a valid recreation of the initial empty/source-only fixtures, and because these copies live under the SYNTH Git checkout, their Git context also differs from the original isolated workspaces.

See the [executed E2E report](../todo-three-paths-e2e.md) for the actual CLI sequence, results and limitations.
