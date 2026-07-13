---
Title: Building New Capabilities
Domain: developer
Audience: developers
Prerequisites: architecture-overview.md, philosophy/02-deterministic-engineering.md
Knowledge Establishes: How to add new capabilities to Synth correctly
Depends On: architecture-overview.md, philosophy/02-deterministic-engineering.md
Builds Toward: planning-components.md, deterministic-code.md
Version: 1.0.0
Status: stable
---

# Building New Capabilities

## What Is a Capability?

A capability is a type of action that can be performed in Synth. Examples: CreateWorkItem, StartExpedition, RecordDiscovery.

## Adding a New Capability

### Step 1: Define the Domain Function

Add a pure function to the domain:

```javascript
function createFeature(id, name, overrides = {}) {
  return { id, name, status: "draft", createdAt: Date.now(), ...overrides }
}
```

### Step 2: Add to applyDomain

Handle the new capability in `applyDomain`:

```javascript
case "CreateFeature": return {
  events: [{
    type: "FEATURE_CREATED",
    payload: { feature: createFeature(String(intent.payload.id), String(intent.payload.name), intent.payload) }
  }]
}
```

### Step 3: Add to applyEvent

Handle the new event type in `applyEvent`:

```javascript
case "FEATURE_CREATED":
  if (p.feature) state.features[p.feature.id] = p.feature
  break
```

### Step 4: Register the Capability

Add to the capability registry:

```javascript
{ name: "CreateFeature", inputSchema: { types: { id: "string", name: "string" } }, outputSchema: { events: ["FEATURE_CREATED"] }, preconditions: [], sideEffects: false }
```

### Step 5: Add Validation

If the capability requires an ID, add to the `idRequired` list in `validateInvocation`.

### Step 6: Test

Add tests for the new capability. Ensure replay consistency.

## Rules

- Domain functions must be pure (no side effects)
- Events must be immutable
- State mutations must be deterministic
- Capabilities must be registered before the seal

## Related Documents

- [Deterministic Code](deterministic-code.md)
- [Testing Replay](testing-replay.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
