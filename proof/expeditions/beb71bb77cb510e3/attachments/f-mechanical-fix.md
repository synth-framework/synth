# F Mechanical Fix — .gitignore + Contract Reconciliation

Prepared fix for Expedition `beb71bb77cb510e3` "Canonicalize and standardize logs".
Addresses F.1 + F.2 of the ratified plan (the versioning gap F.3 is a separate expedition).

## 1. Stop tracking volatile derived files (currently committed by mistake)
```
git rm --cached .synth/data/cli-errors.jsonl
git rm --cached -r .synth/data/drafts
git rm --cached $(git ls-files '*.integrity.json' '.synth/data/*.integrity.json')
```
(if not yet tracked in a given checkout, skip the rm and just ignore)

## 2. .gitignore additions (append)
```
# SYNTH derived runtime artifacts (NOT the durable replay source)
.synth/data/cli-errors.jsonl
.synth/data/drafts/
*.integrity.json
.synth/ai/
.synth/context.json
.synth/discovery/
.synth/AGENT_CONTRACT.md

# Durable replay source stays tracked (negated ignores):
!.synth/data/event-log.jsonl
!.synth/data/canonical-state.json
```

## 3. Contract reconciliation (AGENTS.md SYNTH block + docs/architecture)
Replace the "Derived artifacts" claim that lists `.synth/data/canonical-state.json`
and `.synth/data/event-log.jsonl` as "derived, must not be committed" with:

> **Durable replay source (tracked):** `.synth/data/event-log.jsonl` and
> `.synth/data/canonical-state.json` are the committed, authoritative replay
> source of truth. They MUST be tracked. Derived/volatile artifacts that must
> be git-ignored: `.synth/data/cli-errors.jsonl`, `.synth/data/drafts/`,
> `*.integrity.json`, `.synth/ai/`, `.synth/context.json`, `.synth/discovery/`,
> `.synth/AGENT_CONTRACT.md`, `.synth/cache/`.

## Verification
- `git status --short` no longer lists derived `.synth` paths.
- `synth status` still reports `ok` and replay consistent.
- `synth explain replay` consistent true after the ignore change.
