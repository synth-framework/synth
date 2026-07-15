# Synth Example: First Contact

The canonical recorded journey for the SYNTH First Contact experience.

## Mission

**Build me a Space Mission Tracking Application.**

Track space missions, crew assignments, and launch windows with a simple, realistic implementation.

## Expeditions

1. **Design Data Model** — Design the data model for missions, crew, and launch windows.
2. **Scaffold Application** — Scaffold the application structure and core modules.
3. **Implement Mission Views** — Implement mission listing and detail views.
4. **Implement Crew Workflow** — Add crew assignment workflow.
5. **Validate Implementation** — Validate the implementation with the operator and generate documentation.

## Run

```bash
npm run govern
```

This executes the Mission through Mission Studio, Genesis, execution, Replay verification, and documentation generation.

## Expected Results

- A replay-consistent event log in `data/event-log.jsonl`.
- A generated proof artifact in `proof/`.
- Generated documentation in `docs-generated/` (local build artifact).
- A recorded journey narrative in `recorded-journey/`.

## Known Limitations

This journey validates:

- ✓ Mission creation
- ✓ Expedition execution
- ✓ Event sourcing
- ✓ Replay integrity
- ✓ Proof generation

Future hardening (EXP-PROGRAM-010):

- Aggregate relationship validation
- Snapshot persistence
- Lineage enforcement

This record demonstrates a governed execution path. It is not yet evidence that every implementation layer fully realizes the constitutional guarantees.

## Relationship to EXP-PROGRAM-009

This example produces the canonical execution evidence for the First Contact Specification defined in EXP-FIRSTCONTACT-002. The recorded journey is the authoritative source from which website copy, tutorials, videos, and conference demos are projected.
