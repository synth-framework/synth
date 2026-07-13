---
Title: Performance
Domain: developer
Audience: developers
Prerequisites: architecture-overview.md
Knowledge Establishes: Performance characteristics and optimization strategies for Synth
Depends On: architecture-overview.md
Builds Toward: none (terminal)
Version: 1.0.0
Status: stable
---

# Performance

## Performance Characteristics

### Event Log Growth

The event log grows monotonically. Storage is proportional to total history, not state size.

**Mitigation:** Partitioning, snapshots, archival.

### State Reconstruction

Replay requires processing all events. Time is O(n) where n = event count.

**Mitigation:** Snapshots provide O(1) state access. Replay only needed for verification.

### Permit Validation

HMAC-SHA256 computation adds ~0.1ms per operation.

### Chain Verification

Verifying the full chain is O(n). Use periodically, not per-event.

## Optimization Strategies

1. **Snapshots:** Save state periodically. Avoid full replay.
2. **Partitioning:** Distribute events across partitions.
3. **Batching:** Process multiple events together.
4. **Lazy Loading:** Load state on demand.

## Benchmarks

| Operation | Time (1000 events) | Time (10000 events) |
|-----------|-------------------|---------------------|
| Append event | ~0.1ms | ~0.1ms |
| State reconstruction | ~5ms | ~50ms |
| Chain verification | ~10ms | ~100ms |
| Replay verify | ~8ms | ~80ms |

## Related Documents

- [Project Structure](project-structure.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
