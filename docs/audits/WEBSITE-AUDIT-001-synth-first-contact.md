# WEBSITE-AUDIT-001 — SYNTH First Contact Audit

**Date:** 2026-07-14  
**Auditor:** Kimi Code CLI  
**Scope:** Public static website (`website/*.html`)  
**Approach:** Architectural / experiential audit from the perspective of a first-time visitor with zero prior knowledge of SYNTH. HTML/CSS implementation is intentionally ignored.

---

## 1. Site Inventory

| Page | File | Title | Primary Purpose | Intended Audience | Primary CTA | Nav Path from Home |
|---|---|---|---|---|---|---|
| Home | `index.html` | "Synth — Humans explore. SYNTH remembers. AI executes deterministically." | Position SYNTH and surface install + concepts | New visitors | "Get Started in 5 Minutes" | — (root) |
| Quick Start | `quick-start.html` | "Quick Start — Synth" | Install and run first commands | New users who want to try SYNTH | Implicit: run `synth init` | Header nav or home CTA |
| Architecture | `architecture.html` | "Architecture — Synth" | Explain public flow with 7 concepts | Visitors wanting conceptual overview | Read public architecture doc (external) | Header nav |
| Documentation | `docs.html` | "Documentation — Synth" | Index of operator/reference docs | Users looking for docs | External links to GitHub docs | Header nav |
| Examples | `examples.html` | "Examples — Synth" | Showcase certified examples | Users evaluating feasibility | "Browse examples" / GitHub | Header nav |
| Mission Studio | `mission-studio.html"` | "Mission Studio — Synth" | Explain planning environment | Users wanting to understand planning | Read Mission Studio Guide (external) | Header nav |
| Community | `community.html` | "Community — Synth" | Contribution and project status | Contributors / community | External links to GitHub | Header nav |

**Observations:**
- All pages share a single sticky header with the same 6 nav links.
- Every interior page has a footer link back to `index.html`.
- No search, no breadcrumbs, no table of contents on long pages.

---

## 2. Information Architecture

```text
Home
├── Docs
│   ├── Getting Started (GitHub)
│   ├── Mission Studio Guide (GitHub)
│   ├── Operator Journey (GitHub)
│   ├── FAQ (GitHub)
│   ├── Public Vocabulary (GitHub)
│   ├── Public Architecture (GitHub)
│   ├── Governance (GitHub)
│   ├── File Naming Conventions (GitHub)
│   ├── ADR Index (GitHub)
│   └── Public Release Program (GitHub)
├── Quick Start
│   ├── Install
│   ├── Initialize
│   ├── Create Mission Draft
│   ├── Approve Mission
│   ├── Validate / Govern
│   ├── Verify Replay
│   └── Read operator guide (GitHub)
├── Examples
│   └── GitHub example repos
├── Mission Studio
│   └── Mission Studio Guide (GitHub)
├── Architecture
│   └── Public Architecture Overview (GitHub)
└── Community
    ├── GitHub Repository
    ├── Issues
    ├── Discussions
    ├── Governance model
    └── ADR-004
```

**Orphan pages:** None. Every page is reachable from the header.

**Duplicate navigation:** The same 6-link header appears on every page. No sidebar or secondary nav exists, so duplication is structural rather than redundant.

**Dead ends:**
- Most documentation links point to GitHub markdown files; a visitor leaves the website entirely.
- `docs.html` is essentially a link list with no local content beyond headers.
- `architecture.html` and `mission-studio.html` both end with a single external link.

**Circular navigation:** None. The footer back-link only goes to Home.

---

## 3. First Contact Review

### What a visitor believes after 10 seconds

From the homepage hero:

> "Humans explore. SYNTH remembers. AI executes deterministically."  
> "From an idea to replayable software through Missions, Expeditions, and Proof."

A visitor learns:
- SYNTH is about turning ideas into software.
- It involves missions, expeditions, and proof.
- AI executes things deterministically.
- There is a one-line install command.

**Unclear after 10 seconds:** whether SYNTH is a CLI, a framework, a methodology, a SaaS, or an AI agent platform.

### What a visitor believes after 30 seconds

After scanning the "Seven public concepts" and "Why Synth?" sections:

- SYNTH has a small vocabulary: Mission, Expedition, Evidence, Plan, Event, State, Replay.
- It values auditability, determinism, and governance.
- It is in "Era II — Adoption" and v2 is frozen.

**Still unclear:** the actual day-to-day interaction model. Is the user writing YAML? Chatting with an AI? Running CLI commands? All three?

### What a visitor believes after 2 minutes

A visitor who reads the homepage and clicks Architecture or Quick Start will understand:
- There is a flow: Idea → Mission → Planning → Approval → Commit → Execution → Events → State → Replay.
- You install a CLI, initialize a project, create a mission, approve it, validate, and verify replay.
- "Governance" is a first-class concept.

**Still likely unclear:**
- What problem this solves that Git + CI/CD + project management does not.
- Why deterministic execution matters for the user's context.
- The AI-native positioning is present but not dominant.

### Key questions a visitor can / cannot answer

| Question | Answerable? | Evidence |
|---|---|---|
| What problem does SYNTH solve? | Partially | "From an idea to replayable software" (index.html), auditability/determinism/governance cards (index.html) |
| Why is it different? | Partially | "AI executes deterministically" (hero), "Seven public concepts" (index.html) |
| Why should I care? | Weakly | Determinism/governance cards; no concrete risk or cost argument |

---

## 4. AI-First Audit

### Concepts evaluated

| Concept | Where it appears | Where it is missing |
|---|---|---|
| **AI is the primary interface** | Hero: "AI executes deterministically"; homepage note: "AI operators: read AGENTS.md first" (index.html) | No page explicitly says "AI is the primary interface"; CLI commands dominate Quick Start |
| **Humans define intent** | Hero: "Humans explore" (index.html); Mission Studio: "Capture the strategic goal" (mission-studio.html) | Not stated as a principle outside the hero tagline |
| **Agents execute** | Hero: "AI executes deterministically" (index.html); Mission Studio: "Mission Studio does not execute work" (mission-studio.html) | Could be clearer that AI agents are the expected executors |
| **CLI is an execution surface** | Quick Start is entirely CLI-driven (quick-start.html) | No page explicitly frames the CLI as "for agents and automation" rather than for humans |
| **Deterministic execution** | "Determinism" card (index.html); hero tagline (index.html) | Not explained with a concrete example or benefit |
| **Replay** | "Replay" concept card (index.html); public flow (index.html, architecture.html); Quick Start step 6 (quick-start.html) | No visual or interactive demonstration |
| **Governance** | "Governance" card (index.html); public flow mentions "Governance" (index.html); Quick Start step 5 (quick-start.html) | Not contrasted with ordinary code review or CI |

### Assessment

The AI-first message is **present but not central**. A first-time visitor scanning the homepage sees "AI executes deterministically" and an AI-operator note, but the rest of the site — especially Quick Start — reads like a conventional CLI tool tutorial. The CLI is presented as the user interface rather than as an execution surface for AI agents.

**Critical gap:** The site does not answer the user's likely question: *"So I chat with an AI and it runs SYNTH commands for me?"*

---

## 5. Constitutional Vocabulary Audit

### Term occurrences per page

| Term | index.html | quick-start.html | architecture.html | docs.html | examples.html | community.html | mission-studio.html |
|---|---|---|---|---|---|---|---|
| Mission | 7 | 3 | 2 | 0 | 0 | 0 | 3 |
| Genesis | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Expedition | 5 | 0 | 0 | 0 | 0 | 1 | 3 |
| Replay | 3 | 1 | 1 | 0 | 0 | 0 | 0 |
| Proof | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Evidence | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| Environment | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Capability | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Projection | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### Consistency

- The seven public concepts (Mission, Expedition, Evidence, Plan, Event, State, Replay) are consistent across pages where they appear.
- **"Genesis"** does not appear on the website at all. It is part of the constitutional vocabulary but is absent from public-facing pages.
- **"Environment"**, **"Capability"**, and **"Projection"** are architectural concepts that do not appear. This may be intentional for Era II public vocabulary simplicity, but it means visitors cannot discover these ideas from the website.

### Implementation vocabulary leakage

- The homepage footer mentions "Era II — Adoption" and "ADR-004" without explanation. This is governance vocabulary that may confuse newcomers.
- "Protected Assets" appears only in external GitHub links; not on the website itself.
- "npm run govern" appears on homepage and Quick Start. It is CLI vocabulary, not constitutional vocabulary, but it is acceptable because it is an action the user performs.

---

## 6. Installation Journey

### Clicks from homepage to first command

1. Homepage → click "Get Started in 5 Minutes" → Quick Start.
2. Quick Start already shows `npm install -g @synth-framework/synth` as the first command.

**Friction / ambiguity:**
- The homepage shows `curl ... | sh`, but Quick Start leads with `npm install -g`. The two commands are equivalent, but a visitor may wonder which is canonical.
- No explanation of Node.js or npm prerequisites.
- No platform guidance (macOS, Linux, Windows, WSL).
- After `synth doctor`, the visitor must read a GitHub markdown doc to continue.

### Clicks to first successful mission

From homepage:
1. Quick Start
2. Run install
3. Run `synth init`
4. Run `synth mission create`
5. Run `synth mission approve`
6. Run `synth validate`
7. Run `npm run govern`

This is approximately **7 commands** and **1 page click**. The Quick Start page guides through all of them.

### Missing explanations

- What should the mission subject/purpose be?
- What happens during approval?
- What does `synth validate` do differently from `npm run govern`?
- Where does the proof artifact go and what does it prove?

---

## 7. Documentation Audit

### Documentation types present

| Page | Type | Notes |
|---|---|---|
| Home | Explanation + Marketing | Positions SYNTH and lists concepts |
| Quick Start | Tutorial | Step-by-step CLI commands |
| Architecture | Explanation | Conceptual flow |
| Documentation | Reference index | Link list to GitHub docs |
| Examples | Reference + How-to | Table of examples, one command |
| Mission Studio | Explanation | What it does and does not do |
| Community | Reference | Links and status |

### Discoverability

- Getting Started: reachable from `docs.html` and Quick Start step 7.
- Architecture: reachable from nav and home; external deep-link provided.
- Governance: reachable from `docs.html` and `community.html`.
- CLI: only through Quick Start; no dedicated CLI reference page on the website.
- API: not linked on website; only in generated `docs/generated/API.md`.
- Examples: reachable from nav, home, and `examples.html`.

### Mixed types

- `docs.html` mixes operator docs, reference docs, and contributor docs without clear grouping beyond headings.
- `quick-start.html` is a pure tutorial; no mixing issues.

---

## 8. Adoption Funnel

```text
Curious          ✅ Homepage hero + concepts
    ↓
Interested       ⚠️ Why Synth? cards are generic; no concrete differentiation
    ↓
Install          ✅ One-line install visible immediately on homepage and Quick Start
    ↓
First Mission    ✅ Quick Start guides through mission create/approve
    ↓
Understand Replay⚠️ Mentioned but not demonstrated
    ↓
Understand Governance ⚠️ Mentioned but not demonstrated
    ↓
Contributor      ✅ Community page links to GitHub issues/discussions
```

The funnel is mostly intact, but the **interested → install** transition relies on the visitor already valuing determinism and governance. There is no comparison, no concrete use case, and no social proof beyond examples.

---

## 9. Homepage Analysis

### Elements

- **Hero title:** "Humans explore. SYNTH remembers. AI executes deterministically."
- **Hero subtitle:** "From an idea to replayable software through Missions, Expeditions, and Proof."
- **Install snippet:** `curl -fsSL https://synth-framework.github.io/synth/install.sh | sh`
- **Alt install:** `npm install -g @synth-framework/synth`
- **Buttons:** "Get Started in 5 Minutes" (primary), "View on GitHub" (secondary)
- **AI operator note:** Links to AGENTS.md
- **Sections:** Seven public concepts, Public flow, Why Synth?, Example gallery
- **Footer:** Era / governance status

### Visual hierarchy

1. Hero tagline (largest)
2. Subtitle
3. Install command
4. CTA buttons
5. Seven concepts grid
6. Public flow diagram
7. Why Synth? cards
8. Example gallery
9. Footer

### Single most important message

> SYNTH turns human intent into replayable, governable software through a small set of concepts.

### Would a visitor understand SYNTH without scrolling?

**No.** Above the fold, a visitor sees the tagline, subtitle, install command, and two buttons. They understand that SYNTH is related to AI, missions, and replayability, but they do not understand what it *is* (CLI, framework, methodology) or what problem it solves until they scroll to the concepts and Why Synth? sections.

---

## 10. Content Density

| Page | Beginner | Intermediate | Advanced | Risk |
|---|---|---|---|---|
| Home | Medium | Medium | Low | Beginners may not understand "Era II" or "Replay" without scrolling |
| Quick Start | Medium | Medium | Low | Good tutorial pacing; assumes CLI comfort |
| Architecture | Medium | Low | Low | Concepts are abstract without examples |
| Documentation | Low | Low | Low | Just a link list; no content density issue |
| Examples | Medium | Low | Low | Table is clear; running examples requires CLI familiarity |
| Mission Studio | Medium | Low | Low | Clear separation of planning vs execution |
| Community | Low | Low | Low | Links and status only |

**Beginner abandonment risk:** Moderate. The homepage hero is abstract, and the first external documentation link goes to a GitHub markdown file, which can feel unfriendly to non-technical users.

**Expert depth:** Low. Experts are pushed to GitHub markdown files for depth; the website itself stays at an overview level.

---

## 11. Missing Content

| Missing item | Impact | Evidence / rationale |
|---|---|---|
| **Why SYNTH? / Problem statement** | High | Homepage subtitle describes mechanism, not motivation |
| **AI workflow explanation** | Critical | AI message is present but not explained as a workflow |
| **First mission walkthrough on-site** | High | Quick Start sends user to GitHub markdown for continuation |
| **Interactive or animated demo** | Medium | No visualization of mission → expedition → replay |
| **Comparison with existing workflows** | High | Visitors will compare to CI/CD, Git, AI coding tools; site does not address this |
| **CLI reference page** | Medium | CLI commands are scattered in Quick Start |
| **Testimonials / case studies** | Medium | Only examples table provides social proof |
| **FAQ on website** | Low | FAQ exists in GitHub docs but not on website |
| **Public vocabulary page on website** | Medium | Linked externally; could be a first-class page |

---

## 12. Competitive Positioning

A first-time visitor is likely to compare SYNTH to:

- **GitHub Actions / CI/CD** — because of `npm run govern` and validation language.
- **Cursor / Claude Code / Copilot** — because of "AI executes".
- **Terraform / Pulumi** — because of deterministic state and replay.
- **Git** — because of event log / immutable history language.
- **Project management tools** — because of Mission / Expedition vocabulary.

### Does the website explain why SYNTH is different?

**Partially.** The homepage lists auditability, determinism, and governance, but it does not explicitly contrast these with the comparison tools above. A visitor may think *"This sounds like CI/CD with extra steps"* or *"This sounds like an AI agent wrapper"* without seeing the unifying argument.

---

## 13. Strengths

1. **Clear public vocabulary.** The seven concepts are consistently presented.
2. **Install command is immediate.** The homepage shows a one-line installer above the fold.
3. **Conceptual flow is visible.** The public flow diagram communicates the lifecycle.
4. **Determinism is prominent.** A rare differentiator that is clearly named.
5. **AI operator note.** Signals that SYNTH is designed for AI agents, not just humans.
6. **Examples are concrete.** The examples table links to real repositories.
7. **Governance is first-class.** Not treated as an afterthought.
8. **Mission Studio boundary is clear.** Explicitly states what it does *not* do.
9. **Consistent navigation.** Same header on every page.
10. **Clean visual hierarchy.** Sections and cards make scanning easy.

---

## 14. Weaknesses

| Rank | Weakness | Severity | Evidence |
|---|---|---|---|
| 1 | AI-native positioning is underdeveloped | **Critical** | Hero mentions AI, but Quick Start is CLI-centric; no AI workflow page |
| 2 | Problem statement is abstract | **Critical** | "From an idea to replayable software" describes mechanism, not pain or value |
| 3 | Most documentation lives on GitHub | **High** | `docs.html` is a link list; user leaves the website for depth |
| 4 | No comparison with alternatives | **High** | Visitor must infer differentiation from CI/CD, AI tools, Git |
| 5 | Homepage above-the-fold does not explain what SYNTH is | **High** | Tagline + subtitle do not clarify CLI vs framework vs platform |
| 6 | "Genesis" is absent from public vocabulary | **Medium** | Constitutional vocabulary gap |
| 7 | Era / ADR references are unexplained | **Medium** | Footer on homepage mentions "Era II — Adoption" and "ADR-004" |
| 8 | Two install commands with no canonical guidance | **Medium** | Homepage shows curl; Quick Start leads with npm |
| 9 | No on-site first mission walkthrough | **Medium** | Quick Start ends with external GitHub link |
| 10 | No CLI reference page on website | **Low** | Commands only in Quick Start |

---

## 15. Evidence-Based Recommendations

### Critical

1. **Add a "Why SYNTH" page or section.** Cite the abstract subtitle on `index.html` and the lack of a problem statement. Explain the specific failure modes of current AI/human engineering workflows that SYNTH prevents.

2. **Create an "AI Workflow" page.** Cite the AI note on `index.html` and the CLI-centric `quick-start.html`. Show the intended interaction: human describes intent → AI proposes plan → human approves → AI executes via SYNTH CLI → Replay verifies.

### High

3. **Bring core documentation onto the website.** Cite `docs.html` being only a link list. Host Getting Started, Public Vocabulary, and Public Architecture as website pages so visitors do not leave the site for foundational understanding.

4. **Add a comparison or positioning section.** Cite competitive ambiguity in Section 12. Explicitly contrast SYNTH with CI/CD, AI coding assistants, and Git.

5. **Clarify the homepage above-the-fold message.** Cite Section 9. Add one sentence below the subtitle that states what SYNTH is (e.g., "A CLI and execution framework for AI-native software development").

### Medium

6. **Resolve the dual install command ambiguity.** Cite homepage curl vs Quick Start npm. Recommend one canonical command and present the other as an alternative.

7. **Add a "First Mission" on-site walkthrough.** Cite Quick Start ending with an external link. Include expected output and what the user should observe.

8. **Explain Era / ADR references or remove them from the homepage footer.** Cite unexplained footer on `index.html`.

### Low

9. **Add a CLI reference page on the website.** Cite commands scattered in `quick-start.html`.

10. **Consider surfacing "Genesis" in public vocabulary if it remains constitutional.** Cite absence in Section 5.

---

## Key Question Answer

> After spending five minutes on the website, would a technically sophisticated developer understand that SYNTH is an AI-native execution platform rather than another developer CLI or automation tool?

**Marginally.**

A sophisticated developer would see:
- The hero mentions AI and determinism (index.html).
- The AI operator note points to AGENTS.md (index.html).
- The public flow and seven concepts suggest a structured execution model.

However, the **Quick Start page** is entirely a CLI tutorial, and the website never explicitly states the intended AI-human division of labor. Without reading between the lines, the developer is more likely to conclude that SYNTH is a governance-heavy CLI framework than an AI-native execution platform.

**Conclusion:** The website has the right ingredients but does not yet consistently communicate the AI-native execution platform positioning.
