# Documentation Integration Specification

> **Specification for linking the SYNTH Mission Studio Homepage to canonical documentation under EXP-HOME-014.**

---

## Purpose

Ensure every homepage concept is backed by stable, canonical SYNTH documentation. Visitors who want to go deeper can click from any artifact, capability, or architecture layer to the relevant reference.

---

## Link inventory

### Artifact → documentation mapping

| Homepage element | Target document | Open behavior |
|---|---|---|
| Intent concept / input | `docs/reference/public-vocabulary.md` | Same tab |
| Discovery artifact | `docs/guides/greenfield-discovery-lifecycle.md` | Same tab |
| Unknowns / constraints | `docs/reference/public-vocabulary.md` | Same tab |
| Domain artifact | `docs/architecture/projection-model.md` | Same tab |
| Mission artifact | `docs/operator/01-getting-started.md` | Same tab |
| Expedition artifact | `docs/operator/04-working-with-expeditions.md` | Same tab |
| Evidence concept | `docs/governance.md` | Same tab |
| Governance visualization | `docs/governance.md` | Same tab |
| Replay timeline | `docs/operator/09-replay.md` | Same tab |
| Architecture layer | `docs/architecture/<layer>.md` | Same tab |
| Capability item | `docs/reference/<capability>.md` | Same tab |
| Genesis label | `docs/guides/greenfield-discovery-lifecycle.md` | Same tab |
| Adapters section | `docs/adr/ADR-044-external-build-systems-are-adapters.md` | Same tab |

### Global links

| Element | Target | Behavior |
|---|---|---|
| Header logo | Homepage root | Same tab |
| Primary CTA | `docs/operator/01-getting-started.md` | Same tab |
| Footer / operator guide link | `docs/operator/` index | Same tab |
| GitHub link | Repository URL | New tab |

---

## Link behavior

- In-site documentation opens in the same tab.
- External links (GitHub, external references) open in a new tab with `rel="noopener noreferrer"`.
- Links use stable relative paths from the repository root.
- Anchors are avoided where possible; if used, they must be verified in CI.

---

## Link presentation

- Links inside artifact detail panels appear as subtle text links with an underline on hover.
- Capability cards use the entire card as a hit area with a visible focus ring.
- Icons indicate external links.
- Link color uses `--ms-accent` for visibility while remaining calm.

---

## Maintenance

- Link inventory is stored in this document.
- A CI check scans homepage source for documentation links and verifies the target files exist.
- If a target document moves, the homepage link and this inventory must be updated in the same PR.
- The check runs on every PR that touches `website/` or `docs/`.

---

## CI check specification

The link checker must:

1. Extract all relative documentation links from `website/` source files.
2. Resolve each link against the repository root.
3. Report any missing target as a build failure.
4. Skip external URLs (HTTP/HTTPS) but flag them for manual review if they 404.

---

## Acceptance criteria

- Every major homepage concept links to canonical documentation.
- Link inventory is complete and reviewable.
- In-site links open in the same tab; external links open in a new tab.
- CI prevents broken homepage-to-doc links from merging.
- All paths are stable relative paths.

---

## Out of scope

- Homepage content itself (other HOME expeditions).
- Search or navigation redesign.
- Documentation content authoring.

---

## Related documents

- [Artifact System Specification](artifact-system.md)
- [Capabilities Explorer Specification](capabilities-explorer.md)
- [Architecture Explorer Specification](architecture-explorer.md)
- [EXP-HOME-014 — Documentation Integration](../expeditions/EXP-HOME-014.md)
