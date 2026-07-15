# Prompt: Generate Expeditions

Use this prompt after a Mission has been approved.

## Prompt

> For the approved Mission "<Mission Subject>", generate Expeditions using Synth. Run `synth expedition create --mission "..." --subject "..." --goal "..."` for each Expedition and report the proposals. Wait for my approval before running Genesis.

## Expected agent behavior

1. Run `node scripts/generate-capability-report.js` and read the Capability Report. Scope Expeditions to capabilities the environment actually supports; if a required capability is degraded or unsupported, plan an alternative approach first (ADR-016).
2. Identify the approved Mission subject.
3. Create one or more Expedition proposals.
4. Display each proposal with subject, goal, and linked Mission.
5. Wait for human approval.

## Safety

- Do not run Genesis or execution without approval.
- Keep Expeditions within the existing public vocabulary.
- Do not assume Git, npm, GitHub, or any specific tool unless the Capability Report lists it as supported.
