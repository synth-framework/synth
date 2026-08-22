# Finalized CLI Command Set + Lazy Loader Design (expedition 70a5c5ed2bda5f1b)

## Command set (one shared verb vocabulary; reduce knowledge quorum)

### Lifecycle — mission AND expedition share the SAME verbs
create -> approve -> start -> finish --disposition complete|archive|cancel
plus: evidence, show, list, report, move, delete (delete/move explicit; destructive/admin)
(Replaces 5 termination verbs: complete/finish/cancel/archive/delete.)

### Correctness / release / integrity (3 orthogonal verbs)
- check            (adaptive validation; = old `validate`)
- check --full     (all invariants + replay; absorbs old `validate --full` + `verify` no-sub)
- check --repair   (absorbs old `repair`)
- govern           (release gate: build + test + adversarial audit + proof)
- verify           (cryptographic signatures + Merkle roots; old `verify signatures`)

### Inspect
- status           (default; absorbs `checkpoint`)
- explain <aspect> (deep: replay, lineage, graph, diagnostics, governance)
- report           (exportable)

### Setup
- init             (greenfield)
- init --import    (absorbs `discover` + `migrate`); `genesis` internal

### Generate / support
- docs, certify, release  (kept)
- doctor  (absorbs capabilities/adapter/repo/snapshot/log/task/ai)

Net: ~13 top-level, one learned-once verb set; 5 termination verbs -> 1.

## Lazy CLI loader (both prongs combined)
1. Thin entrypoint parses argv[2] (group) then `await import('./groups/<group>.js')`.
   Mission Studio / Planning Cognition / adapters load only inside the group that needs them.
2. Command-weight gate: light groups (version, help, status, explain, docs) SKIP the
   13-step bootstrap entirely; heavy groups run it inside their module.
3. Benchmark target: version/help < 100ms, status/explain < 300ms cold.

## Sequencing
Do loader (e5fdf756) first — it restructures dispatch into per-group modules.
Then verb consolidation (68b59f0e) collapses verbs WITHIN that new structure.
