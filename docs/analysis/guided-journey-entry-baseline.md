# Guided journey: entry evidence baseline (synthetic, 2026-10-15)

This is the first **test workstream** slice under the accepted [build](../plans/guided-journey-synth-build-charter.md) and [test](../plans/guided-journey-test-charter.md) charter *scopes*. It does not approve or start a canonical Mission/Expedition. No private SVGs, actual customer repository, agent-run pilot, simulated human approval, alignment shortcut, or lifecycle event was used. The SVG-board descriptions below are unbranded test data. All workspaces were isolated temporary directories; the checked-in regression inputs in `tests/first-contact-onboard.test.js` reproduce the source-handoff cases.

## Before this slice: shipped entry points

Probed the built `dist/cli/entry.js` against four fresh temporary starting points. These are **observations**, not passing end-to-end guided-journey tests.

| Starting point | Observed entry evidence | Missing guidance (red acceptance) |
| --- | --- | --- |
| Empty + ambiguous specimen-board idea | `first-contact --dry-run` detected `empty`. After `first-contact start` with only the idea, `clarify` asked five fixed audience/stakeholder/runtime/language/capabilities questions. | No question/options yet about board content, token/manifest/notes inputs, layout ambiguity, verification, or web-versus-desktop trade-off. A generic baseline Mission is not an agreed build brief. |
| Root-level synthetic `package.json`, `src/board.js`, `tests/board.test.js` | `first-contact --dry-run` detected `brownfield`, but printed no source paths or test names. Separately, `discover . --export` reported Node, tests, 3 files and 5 observations and wrote a baseline; its CLI summary/baseline did not enumerate the three file paths. | The onboarding preview did not give the agent a concrete evidence handoff; `discover`'s count alone does not prove that existing renderer behavior was understood. No rewrite of that behavior is authorized. |
| `docs/` with two synthetic contradictory Markdown notes | `first-contact --dry-run` detected generic `brownfield`. `docs generate --knowledge-base ./docs` scanned 2 files and produced 7 projections. | The preview did not identify its documentation source. Projections and scan counts did not identify the local-only versus shared-cloud conflict or record a human choice. |
| `knowledge/` with the same two contradictory notes, no code | The same generic `brownfield` plan. `docs generate --knowledge-base ./knowledge` scanned 2 files and produced 7 projections; this explicit flag was necessary because the default is `./docs`. | No knowledge-specific next step, source-to-brief trace or conflict decision. A successful projection is not consent to one of the contradictory requirements. |

The old TODO E2E in [the prior report](todo-three-paths-e2e.md) remains a separate historical diagnostic; neither its synthetic decisions nor its final-state samples are being relabelled as this SVG fixture or the owner's real pilot.

## Small repair in this branch: source handoff, not source understanding

`first-contact --dry-run` (and the non-applying preview) now includes `sourceHandoff`: a bounded, sorted inventory of supported files under `docs/`, `knowledge/`, `src/` and `tests/`, plus root `package.json`; source-specific commands include `discover . --export` for existing code and an explicit `--knowledge-base ./knowledge` for knowledge files. Two populated document roots require an operator source selection; an empty `docs/` does not masquerade as a source. The preview's primary next step now points to source inspection (or a source-selection prompt), **not** to applying the governance plan before reading the inputs. The field says `sourceStatus: not-ingested` and explicitly warns that contents, contradictions and choices have **not** been reviewed. It does not parse arbitrary dropped files, make a design decision, run `docs generate`, change the existing approval route, or write governance state on dry-run. It caps traversal to 24 files per root and reports truncation rather than claiming completeness.

The two new regression cases were **red before** the implementation (`sourceHandoff` absent) and now pass. The ordinary `first-contact-onboard` test run also exposed a stale assertion expecting the legacy monolithic `event-log.jsonl`; it now inspects the actual partitioned event stream. A later pre-existing symlink/global-install test in that suite still returns empty stdout and fails JSON parsing; this source-preview change does not touch the CLI entrypoint or claim to fix that separate loader issue. The broader `first-contact-cli.test.js` also fails later on a legacy monolithic `event-log.jsonl` read, after its entry/start/clarify/project cases pass. Report both as red immediate-blast-radius checks, not a guided-journey pass.

## Still open (not silently green)

1. Ask contextual, source-grounded questions and show options/trade-offs; never label inferred answers as chosen. The local-only/shared-cloud conflict must remain unresolved until a human explicitly decides or defers it.
2. Ingest selected files with references/excerpts and errors, and trace source → proposal → choice → brief → plan. A path inventory or seven generated projections cannot satisfy this.
3. Keep architecture/template and Mission purpose aligned with the agreed brief, then check replay **and** verification after materialization. The prior TODO run observed a chatbot template after a CLI recommendation and post-materialization Drift; do not assume either was repaired here.
4. Test a Git-backed reviewable change and the owner-run SVG pilot only after their separate prerequisites and consent. Application code remains agent-written; avoid a second promotion ritual and do not conflate SYNTH with the application tests.

This file is an explicit red/partial baseline, not acceptance of the entire charter or permission to run a lifecycle ceremony.
