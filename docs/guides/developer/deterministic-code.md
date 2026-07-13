---
Title: Writing Deterministic Code
Domain: developer
Audience: developers
Prerequisites: building-capabilities.md, philosophy/02-deterministic-engineering.md
Knowledge Establishes: How to write code that produces the same output given the same input, every time
Depends On: building-capabilities.md, philosophy/02-deterministic-engineering.md
Builds Toward: testing-replay.md
Version: 1.0.0
Status: stable
---

# Writing Deterministic Code

## The Determinism Rule

Given the same inputs, your code must produce the same outputs. Every time. No exceptions.

## What Breaks Determinism

| Source | Why It Breaks | Fix |
|--------|--------------|-----|
| `Math.random()` | Different output each run | Pass randomness as input |
| `Date.now()` | Different time each run | Pass timestamp as input |
| `JSON.stringify({a:1,b:2})` | Key order not guaranteed | Use `sortKeys()` |
| External API calls | Network dependency | Mock in domain, call in runtime |
| File system reads | I/O dependency | Read before domain, pass data |
| Global mutable state | Hidden inputs | Pass all state as parameters |

## The Pure Function Pattern

```javascript
// PURE: same inputs → same outputs
function startWorkItem(workItem, timestamp) {
  return { ...workItem, status: "active", updatedAt: timestamp }
}

// IMPURE: different outputs each call
function startWorkItemBad(workItem) {
  return { ...workItem, status: "active", updatedAt: Date.now() }
}
```

## Sorting Keys

Objects with the same keys in different orders must produce the same hash:

```javascript
import { sortKeys } from "./util"

sortKeys({ b: 1, a: 2 }) // { a: 2, b: 1 }
sortKeys({ a: 2, b: 1 }) // { a: 2, b: 1 }
// Same output → same hash
```

## Timestamp Handling

Pass timestamps from the caller, not from `Date.now()`:

```javascript
// In the runtime (outside domain)
const timestamp = Date.now()
const result = startWorkItem(workItem, timestamp)

// Domain function is pure
function startWorkItem(workItem, timestamp) {
  return { ...workItem, status: "active", updatedAt: timestamp }
}
```

## Testing Determinism

```javascript
// Test: same input → same output
const t1 = startWorkItem(workItem, 1000)
const t2 = startWorkItem(workItem, 1000)
assert.deepEqual(t1, t2) // Must pass

// Test: different timestamp → different output
const t3 = startWorkItem(workItem, 2000)
assert.notDeepEqual(t1, t3) // Must pass
```

## Related Documents

- [Building Capabilities](building-capabilities.md)
- [Testing Replay](testing-replay.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
