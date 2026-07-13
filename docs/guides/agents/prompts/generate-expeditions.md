# Prompt: Generate Expeditions

Use this prompt after a Mission has been approved.

## Prompt

> For the approved Mission "<Mission Subject>", generate Expeditions using Synth. Run `synth expedition create --mission "..." --subject "..." --goal "..."` for each Expedition and report the proposals. Wait for my approval before running Genesis.

## Expected agent behavior

1. Identify the approved Mission subject.
2. Create one or more Expedition proposals.
3. Display each proposal with subject, goal, and linked Mission.
4. Wait for human approval.

## Safety

- Do not run Genesis or execution without approval.
- Keep Expeditions within the existing public vocabulary.
