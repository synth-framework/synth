# Knowledge Layer

**Part of:** SKR-001
**Status:** Active Architecture
**Date:** 2026-06-28

---

## Purpose

The Knowledge Layer defines the canonical representation of engineering knowledge. It is the vocabulary layer of the Synth architecture — what the system knows about engineering, independent of how that knowledge is executed, planned, or projected.

## Principle

> The Knowledge Layer defines the system's ubiquitous language. No execution terminology may become part of that language.

## Contents

This layer contains:

- **Canonical Node Types** — Mission, Expedition, Objective, WorkItem, Discovery, Decision, Artifact, Observation, Constraint
- **Canonical Relationship Types** — depends_on, implements, supports, derived_from, discovers, produces, invalidates, blocks, relates_to, references
- **Ubiquitous Language** — The vocabulary contract (ubiquitous-language.md)
- **Synth Knowledge Graph** — The root container for all canonical knowledge

## What This Layer Excludes

This layer explicitly excludes:
- Execution mechanisms (capabilities, primitives, instructions)
- Protocol objects (agents, tools, workflows, MCP, A2A)
- Vendor-specific concepts (GitHub, Jira, Linear)
- Runtime concerns (events, replay, determinism)
- Planning process (how decisions are made)

## Invariants

- **KI-001:** Canonical knowledge MUST NOT depend on execution
- **KI-008:** The Knowledge Layer defines the system's ubiquitous language

## Related Documents

- [SKR-001.md](SKR-001.md) — Full SKR specification
- [ubiquitous-language.md](../ubiquitous-language.md) — Vocabulary contract

---

*Part of SKR-001 — Synth Knowledge Representation*
