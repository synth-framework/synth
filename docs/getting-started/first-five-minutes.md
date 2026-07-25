# Your First Five Minutes with SYNTH

> A zero-to-governed walkthrough for first-time operators.

SYNTH is a deterministic execution system for engineering work. This guide takes you from installation to your first approved Mission in a few minutes.

---

## Before you start

- Node.js 20 or later
- A terminal
- A directory where you want to create your first governed project

---

## 1. Verify the installation

```bash
synth --version
```

Expected output:

```json
{
  "status": "ok",
  "version": "2.3.0",
  "name": "synth",
  "schema": "synth-cli-v1"
}
```

Then check the environment:

```bash
synth doctor
```

In an empty directory `synth doctor` reports `warning` because no project has been initialized yet. The response includes a `nextSteps` field telling you exactly what to do next.

---

## 2. Initialize a project

```bash
synth init --name "My First Project"
```

This creates:

- `.synth/manifest.json` — project metadata and command registry
- `.synth/data/` — event log, canonical state, and drafts
- `.synth/AGENT_CONTRACT.md` — rules for any AI agent that works in this repository

The CLI returns structured JSON with `lifecycle: "initialized"` and the next commands to run.

Run `synth doctor` again to confirm the project is healthy:

```bash
synth doctor
```

Now `status` should be `ok` and `healthy` should be `true`.

---

## 3. Discover what you have

```bash
synth discover
```

`discover` is read-only. It analyzes the current directory and reports:

- repository type
- languages and frameworks
- whether tests exist
- agent context and classification

No files are written unless you explicitly add `--export`.

---

## 4. Create your first Mission

A Mission captures intent. Every Mission starts as a draft.

```bash
synth mission create \
  --subject "Hello SYNTH" \
  --purpose "Learn the SYNTH governance lifecycle."
```

Save the `draftId` from the response. The CLI also suggests the next step.

If the draft confidence is below the approval threshold, the CLI tells you to add evidence.

---

## 5. Prepare an Alignment Contract

Missions are approved against an Alignment Contract.

```bash
synth alignment prepare
```

Save the `contractId` from the response.

---

## 6. Add evidence if needed

If `synth status` shows a low-confidence blocker, add evidence:

```bash
synth mission evidence add \
  --draft-id <draft-id> \
  --subject "Domain knowledge" \
  --purpose "Why this mission matters" \
  --confidence high
```

Evidence creates an immutable successor draft. Use the new `draftId` for approval. Repeat until confidence crosses the threshold.

---

## 7. Approve the Mission

```bash
synth mission approve \
  --draft-id <draft-id> \
  --alignment-contract-id <contract-id>
```

When approval succeeds, the CLI returns the runtime `missionId` and the approved snapshot id.

---

## 8. Check status

```bash
synth status
```

You should see:

- `phase: "approved"`
- one active Mission
- no blockers
- a suggested next action, such as creating an Expedition

---

## Recovery: when something goes wrong

Every SYNTH CLI error is structured JSON with `kind`, `code`, `suggestion`, and `requiredAction` fields.

| Situation | What to do |
| --- | --- |
| `synth mission create` missing `--subject` | Add `--subject "..."` |
| `synth mission approve` fails with `LifecycleBlocked` | Run `synth alignment prepare` first |
| Draft not found | Check the `draftId` and use the latest successor draft |
| Low confidence | Run `synth mission evidence add` |
| `synth doctor` shows `warning` | Follow the `nextSteps` field |

---

## What you have now

- A governed SYNTH project
- A recorded initialization event
- An approved Mission
- A deterministic, replayable state

The next step is to create an Expedition under the approved Mission and begin governed execution.

```bash
synth expedition create \
  --mission <mission-id> \
  --subject "First Expedition" \
  --goal "Prove the governance lifecycle end-to-end."
```

---

## Learn more

- `synth --help` — list commands
- `synth doctor` — verify health
- `synth status` — see current state
- `synth validate` — run the adaptive validator
- `npm run govern` — run the full governance pipeline
