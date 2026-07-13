---
Title: AI-Safe Components
Domain: developer
Audience: developers
Prerequisites: building-capabilities.md, agents/constitution.md
Knowledge Establishes: How to build components that agents can use safely and correctly
Depends On: building-capabilities.md, agents/constitution.md
Builds Toward: none (terminal)
Version: 1.0.0
Status: stable
---

# AI-Safe Components

## What Makes a Component AI-Safe

An AI-safe component:
1. Has clear, documented behavior
2. Validates all inputs
3. Reports errors clearly
4. Produces deterministic output
5. Has no hidden side effects

## Input Validation

Agents may provide unexpected inputs. Validate everything:

```javascript
function validateCreateWorkItem(payload) {
  if (!payload.id) return { valid: false, error: "Missing id" }
  if (!payload.name) return { valid: false, error: "Missing name" }
  if (typeof payload.id !== "string") return { valid: false, error: "id must be string" }
  return { valid: true }
}
```

## Error Messages

Error messages should be clear enough for an agent to understand and report:

```javascript
// Good: specific, actionable
"POLICY_BLOCKED: StartWorkItem on W-1 denied — work item status is 'complete'"

// Bad: vague, unhelpful
"Error: invalid state"
```

## No Hidden State

Components should not rely on hidden mutable state:

```javascript
// Bad: hidden state
let counter = 0
function generateId() { return `id-${counter++}` }

// Good: deterministic
function generateId(seed) { return `id-${seed}` }
```

## Documentation

Document every capability with:
- Purpose
- Input schema
- Output schema
- Error conditions
- Examples

## Related Documents

- [Building Capabilities](building-capabilities.md)
- [Agent Constitution](../agents/constitution.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
