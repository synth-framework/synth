---
Title: Best Practices
Domain: operator
Audience: operators
Prerequisites: All previous operator documents
Knowledge Establishes: Operational wisdom for working effectively with Synth
Depends On: 01-getting-started.md through 10-recovery.md
Builds Toward: 12-faq.md
Version: 1.0.0
Status: stable
---

# Best Practices

## Expedition Design

**Do:** Create expeditions with 2-5 objectives.
**Don't:** Create expeditions with 20 objectives. Split them.

**Do:** Write clear objective titles ("Implement OAuth 2.0 PKCE flow").
**Don't:** Write vague titles ("Do auth stuff").

**Do:** Record discoveries as they happen.
**Don't:** Wait until the end. You will forget.

**Do:** Make decisions explicit with alternatives and consequences.
**Don't:** Make decisions implicitly. They won't be recorded.

## Side Quest Management

**Do:** Record side quests immediately.
**Don't:** Let them accumulate silently.

**Do:** Bound side quests with clear completion criteria.
**Don't:** Let side quests become unbounded exploration.

**Do:** Resolve side quests before completing the expedition.
**Don't:** Leave side quests dangling.

## Decision Quality

**Do:** Always consider at least two alternatives.
**Don't:** Make decisions where there is only one option.

**Do:** Evaluate both positive and negative consequences.
**Don't:** Only list the benefits.

**Do:** Link decisions to discoveries.
**Don't:** Make decisions without context.

## System Operation

**Do:** Check replay consistency regularly.
**Don't:** Assume state is correct.

**Do:** Monitor the event chain.
**Don't:** Ignore chain break warnings.

**Do:** Verify seal status after bootstrap.
**Don't:** Operate an unsealed system in production.

## Documentation

**Do:** Record reasoning in discoveries, not in events.
**Don't:** Put LLM reasoning traces in payloads.

**Do:** Write clear descriptions.
**Don't:** Write "fixed stuff."

**Do:** Include context in discoveries.
**Don't:** Write context-free observations.

## Collaboration

**Do:** Review each other's discoveries.
**Don't:** Work in isolation.

**Do:** Challenge decisions respectfully.
**Don't:** Accept decisions without understanding.

**Do:** Share side quests that affect multiple expeditions.
**Don't:** Duplicate discovery work.

## Confidence and Progress

**Do:** Pay attention to confidence scores, not just completion.
**Don't:** Declare victory at 100% completion with 20% confidence.

**Do:** Investigate when confidence drops.
**Don't:** Ignore declining confidence.

**Do:** Complete expeditions when both progress and confidence are high.
**Don't:** Rush to completion.

## Related Documents

- [FAQ](12-faq.md) — Common questions
- [All operator documents](.) — Practical guides

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
