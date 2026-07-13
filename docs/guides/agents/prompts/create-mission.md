# Prompt: Create a Mission

Use this prompt to capture human intent as a Synth Mission Draft and request explicit approval.

## Prompt

> Create a Synth Mission with subject "<Subject>" and purpose "<Purpose>". Run `synth mission create --subject "..." --purpose "..."` to generate a Mission Draft, review the proposals, unknowns, and confidence, then ask me whether to approve it. If I approve, run `synth mission approve --draft-id <draft-id>` before creating Expeditions.

## Agentic lifecycle

```text
Human intent
↓
synth mission create
↓
Mission Draft (Planning Session + Proposals + Confidence + Unknowns)
↓
Human review
↓
synth mission approve --draft-id <draft-id>
↓
Approved Mission Model Snapshot
↓
Genesis / Execution
```

## Expected agent behavior

1. Run `synth mission create --subject "..." --purpose "..."`.
2. Capture the returned `draftId` and `proposals`.
3. Report:
   - Proposed Mission name and purpose.
   - Confidence score.
   - Unknowns that block or weaken approval.
   - Clarifying questions, if any.
4. Wait for explicit human approval.
5. If approved, run `synth mission approve --draft-id <draft-id>`.
6. If approval is denied by Mission Studio, gather additional evidence and create a new Mission Draft.

## Example output

```text
Mission Draft created.

Draft ID:
    2a41fd2cc4a352ec

Confidence:
    0.67

Proposed Mission:
    SYNTH Migration — Adopt SYNTH governance for deterministic execution.

Mission Studio requires additional evidence. Approval was not performed.

Next step:
    synth mission approve --draft-id 2a41fd2cc4a352ec
```

## Safety

- Mission Studio is read-only. `synth mission create` does not mutate execution state.
- `synth mission approve` is the only CLI path that produces an Approved Mission Model Snapshot.
- Do not proceed to Genesis or execution without a successful approval.
