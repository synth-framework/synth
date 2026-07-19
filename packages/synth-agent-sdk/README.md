# @synth-framework/agent-sdk

Language-agnostic SDK for AI agent interoperability with SYNTH.

## Purpose

This SDK lets any capable AI agent:

- Detect a SYNTH-governed repository.
- Parse the Genesis Protocol.
- Consume `.synth/ai/` metadata.
- Determine the correct next workflow.
- Respect mutation policies and approval boundaries.

## Usage

```ts
import { resolveRepositoryContext, parseSynthCommand, isMutatingCommand } from "@synth-framework/agent-sdk"

const context = await resolveRepositoryContext("/path/to/repo")
if (!context.isSynthGoverned) {
  // Not a SYNTH repository
}

const command = parseSynthCommand("synth mission create --subject X --purpose Y")
if (isMutatingCommand(command)) {
  // Require governance verification before proceeding
}
```

## Modules

- `protocol` — Genesis Protocol parsing and command classification.
- `metadata` — Consumer for `.synth/ai/` repository metadata.

## Compliance

A compliant agent uses only public SYNTH CLI commands and the metadata contracts exposed by this SDK. It does not depend on SYNTH implementation internals.
