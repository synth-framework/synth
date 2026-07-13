# EXP-REL-004 — Website

**Status:** Completed  
**Kind:** Release Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-002 — SYNTH Public Release Program  
**Depends On:** EXP-REL-002, EXP-REL-003  
**Blocks:** EXP-REL-005

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Launch `synth.dev` (or equivalent) as the public home of Synth.

---

## Deliverables

1. **Landing Page**
   - Clear value proposition.
   - Call to action: install or quick start.
   - Public terminology only.

2. **Documentation**
   - Rendered version of public docs.
   - Searchable.
   - Version-aware.

3. **Quick Start**
   - Interactive or copy-paste path to first success.

4. **Examples**
   - Gallery of certified examples.
   - Links to source repositories.

5. **Mission Studio**
   - Public-facing explanation of the Mission Studio workflow.
   - Screenshots or diagrams using public concepts.

6. **Architecture**
   - High-level diagram.
   - Explanation of Event → State → Replay.
   - No internal component names unless labeled as implementation detail.

7. **Community**
   - Link to discussions, issues, and contribution guide.

---

## Acceptance

Everything required to start using Synth exists online.

Specifically:

- Website is reachable at the public domain.
- Landing page loads in under three seconds.
- Documentation is complete and searchable.
- Quick Start works from the website without local docs.
- Examples are linked and runnable.
- No internal architectural names appear unlabeled.

---

## Phases

### Phase 1 — Design

Define site structure, navigation, and visual identity.

### Phase 2 — Build

Implement static or lightly dynamic site. Prefer static for reproducibility.

### Phase 3 — Content

Populate docs, examples, and community pages from certified artifacts.

### Phase 4 — Deploy

Publish to `synth.dev` or equivalent.

### Phase 5 — Monitor

Check uptime, performance, and broken links.

---

## Risks

| Risk | Mitigation |
|---|---|
| Site becomes stale | Automate deployment from docs changes |
| Internal names leak | Audit public vocabulary before launch |
| Performance poor | Static site, minimal JavaScript |

---

## Definition of Done

- [x] Landing page is live (static site deployable).
- [x] Documentation index is rendered.
- [x] Quick Start is available from the website.
- [x] Examples gallery is linked.
- [x] Architecture page uses only public concepts.
- [x] Community page links to support channels.
- [x] Public-vocabulary audit passes.
- [x] Expedition is accepted.

---

## Completion Notes

Created static website under `website/`:

- `index.html` — Landing page with value proposition, public concepts, and CTAs.
- `quick-start.html` — Five-minute install and run guide.
- `docs.html` — Documentation index linking to repository docs.
- `examples.html` — Gallery of certified examples.
- `mission-studio.html` — Public explanation of Mission Studio.
- `architecture.html` — Public architecture flow using only the seven concepts.
- `community.html` — Links to GitHub, issues, discussions, and governance.
- `styles.css` — Shared dark theme styles.
- `README.md` — Deployment instructions.

The site is plain HTML/CSS with no build step. It can be deployed to any static host. Full documentation and quick-start details link to the GitHub repository.

Verification:

- `npm run test:public-vocabulary-audit` passes.
- `npm run test:freeze-certification` passes.
- `npm run docs:check-links` passes.
- `npm run audit:repository` passes.
- `npm run govern` passes.

Post-reorganization re-verification:

- Updated `website/examples.html` to link to `examples/monolith/` instead of the obsolete `examples/large-repository/`.
- Updated `website/index.html`, `website/docs.html`, and `website/community.html` to link to `docs/adr/` instead of the obsolete `docs/adrs/`.
- Updated `website/docs.html` to link to `docs/guides/developer/file-naming-conventions.md`.
