# EXP-PROGRAM-037 — Ecosystem Adoption & Community Growth

**Status:** Proposed  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Ecosystem adoption, community growth, and AI discoverability  
**Era:** III — Architecture  
**Architecture Impact:** Medium  
**Constitutional Impact:** Low  
**Public Impact:** High  
**Execution Impact:** High

---

## Mission

> **Transform SYNTH from a repository into an ecosystem that developers discover, trust, adopt, contribute to, extend, and recommend.**
>
> The objective is maximizing meaningful adoption, not impressions. Growth follows trust, trust follows evidence, and evidence follows product quality. Every growth activity must leave SYNTH's deterministic execution model intact.

---

## Principles

- **Growth follows trust.** Awareness without credibility is noise.
- **Trust follows evidence.** Claims must be backed by working code, clear documentation, and replayable outcomes.
- **Evidence follows product quality.** The fastest way to grow is to make SYNTH work flawlessly.
- **Community follows trust.** A community forms around a system people believe in.
- **Everything remains deterministic.** Growth tactics must not weaken the event model, governance gates, or replay guarantees.
- **No growth activity should compromise engineering integrity.** Marketing never outpaces the product.

---

## Success Metrics

Success is measured by meaningful signals, not vanity:

- Repository stars
- Contributors
- Successful installations
- Returning users
- Missions executed
- Documentation completion
- Homepage completion
- Skill downloads
- SDK downloads
- Community questions answered
- Independent blog posts
- Third-party integrations
- AI agents capable of using SYNTH

Each metric is defined, sourced, owned, and reviewed in **EXP-ADOPT-019 — Metrics**.

---

## Program Phases

Program 037 is executed in five phases. Phases I and II build platform and launch assets. Phase III educates developers. Phase IV grows the community. Phase V establishes SYNTH in the AI ecosystem.

### Phase I — Platform Foundations

Make SYNTH discoverable and trustworthy before any outreach begins.

```text
EXP-ADOPT-001  Brand Presence
EXP-ADOPT-002  Repository Readiness
EXP-ADOPT-003  Documentation Hub
EXP-ADOPT-004  Homepage Launch
EXP-ADOPT-005  Installation Experience
EXP-ADOPT-019  Metrics
```

### Phase II — Launch Assets

Create the content and assets needed for a credible public launch.

```text
EXP-ADOPT-006  Examples Library
EXP-ADOPT-007  Video Library
EXP-ADOPT-008  Documentation Articles
EXP-ADOPT-009  Launch Campaign
```

### Phase III — Developer Education

Build relationships with developers and make it easy to learn SYNTH.

```text
EXP-ADOPT-010  Developer Outreach
EXP-ADOPT-011  Community Programs
EXP-ADOPT-012  OSS Contribution Experience
EXP-ADOPT-013  Conference Material
```

### Phase IV — Community

Sustain engagement through content, conversation, and listening.

```text
EXP-ADOPT-014  Social Media Assets
EXP-ADOPT-015  Content Calendar
EXP-ADOPT-021  Community Listening & Feedback Loop
```

### Phase V — AI Ecosystem

Ensure AI agents and LLMs can discover, understand, extend, and recommend SYNTH.

```text
EXP-ADOPT-016  AI Discoverability
EXP-ADOPT-017  Skill Ecosystem
EXP-ADOPT-018  Integration Showcase
EXP-ADOPT-020  Launch Certification
```

---

## Platform Strategy

| Purpose                     | Platforms                                           |
| ----------------------------| ----------------------------------------------------|
| Developer Hub               | GitHub                                              |
| Package Distribution        | npm                                                 |
| Documentation               | Homepage, Docs                                      |
| Long-form Technical Content | Dev.to, Hashnode, Medium                            |
| Engineering Community       | Reddit, Hacker News, Lobsters                       |
| Professional Network        | LinkedIn                                            |
| Real-time Updates           | X, Bluesky, Mastodon                                |
| Community                   | Discord                                             |
| Video                       | YouTube                                             |
| Launch Events               | Product Hunt, Indie Hackers                         |
| AI Discovery                | LLM documentation, MCP registries, Skill registries |

---

## Protected Assets

The following assets introduced or governed by this Program SHALL NOT be modified without a governance event:

- Ecosystem metrics taxonomy and definitions
- Launch readiness checklist
- Brand voice and visual identity guidelines
- Installation success telemetry schema
- Skill registry schema
- `packages/synth-agent-sdk` public API surface
- `packages/homepage-runtime` public contract
- Community code of conduct and moderation guidelines
- Contributor license agreement (CLA) / DCO process

Any change to these assets requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Building discoverable, high-integrity public assets | Optimizing for vanity metrics over meaningful adoption |
| Measuring installation success, returning users, and missions executed | Treating impressions or stars as primary success signals |
| Answering community questions with evidence | Making undocumented marketing claims |
| Enabling contributors through clear process and recognition | Allowing growth tactics to bypass governance gates |
| Creating deterministic, runnable examples | Publishing examples that cannot be reproduced |
| Publishing skills and integrations that extend SYNTH | Publishing skills that weaken deterministic execution |
| Showcasing third-party integrations with working examples | Claiming integrations that are not tested or maintained |
| Optimizing documentation for both humans and LLMs | Hiding or obfuscating documentation from crawlers |
| Running a launch campaign after certification | Launching before the launch certification gate passes |
| Storing large assets outside the event log with links/hashes | Storing large binary assets inside the event log |

---

## Out of Scope

- Paid advertising campaigns.
- Re-architecting core execution, governance, or replay systems.
- Monetization, licensing changes, or commercial partnerships.
- Real-time chat-based community moderation automation.
- Owning or controlling external platforms (GitHub, npm, Discord, etc.).
- Training custom foundation models on SYNTH code.
- Replacing the existing Mission → Expedition → Replay lifecycle.

---

## Success Criteria

Program 037 is complete only when:

- Every expedition in Phases I–V is accepted or explicitly waived.
- The SYNTH repository passes a first-time reader test.
- Installation succeeds via bootstrap, npm, npx, and SDK paths on supported platforms.
- The documentation hub is complete, searchable, and cross-linked.
- The homepage is launched and monitored.
- The examples library covers common use cases and runs in CI.
- At least 8 documentation articles are published and cross-posted.
- The launch campaign is executed and measured against the metrics baseline.
- Community channels are active and moderated.
- At least 5 skills are published to a public registry.
- SYNTH documentation is discoverable and usable by LLMs and AI agents.
- A launch certification record exists and all blocking defects are resolved.
- A community feedback loop converts signals into evidence and missions.

---

## Relationship to Other Work

- **EXP-PROGRAM-027 — Mission Studio Homepage** provides the homepage that this program launches and promotes.
- **EXP-PROGRAM-035 — Intent Refinement & Review Governance** and **EXP-PROGRAM-036 — Intent Refinement & Alignment Governance** provide the gates that every growth expedition must pass.
- **EXP-PROGRAM-032 — AI Agent Integration** informs the AI discoverability and skill ecosystem expeditions.
- **EXP-PROGRAM-022 — Genesis** provides the lifecycle that community missions and expeditions extend.
- **packages/homepage-runtime** and **packages/synth-agent-sdk** are the primary public packages this program promotes and protects.

---

## Long-Term Vision

SYNTH becomes a self-sustaining ecosystem: developers discover it through trusted channels, install it without friction, learn it through examples and articles, contribute with confidence, extend it through skills and integrations, and recommend it because the evidence supports the claim. AI agents participate naturally, treating SYNTH as a deterministic execution primitive. Growth is a byproduct of engineering integrity, and every adoption signal is replayable.
