# WEBSITE-AUDIT-001 Executive Summary — SYNTH First Contact

**Scope:** Public static website (`website/*.html`)  
**Date:** 2026-07-14  
**Source:** `WEBSITE-AUDIT-001-synth-first-contact.md`

---

## Five Most Critical Findings

### 1. AI-native positioning is present but not central

The homepage hero says "AI executes deterministically" and includes an "AI operators: read AGENTS.md first" note. However, the Quick Start page is entirely a CLI tutorial, and no page explains the intended human-AI workflow. A visitor is more likely to perceive SYNTH as a governance-heavy CLI tool than an AI-native execution platform.

**Evidence:** `index.html` hero tagline vs. `quick-start.html` steps 1–6, which are all CLI commands.

### 2. The problem statement is abstract

"From an idea to replayable software" describes mechanism, not motivation. The site does not articulate the failure modes of current AI-assisted or manual engineering workflows that SYNTH prevents.

**Evidence:** `index.html` hero subtitle; no "Why SYNTH?" page or section beyond three generic cards (Auditability, Determinism, Governance).

### 3. Core documentation lives outside the website

The Documentation page (`docs.html`) is only a link list. Every operator and reference link sends the visitor to GitHub markdown files. This breaks the first-contact experience and makes the website feel like a thin wrapper.

**Evidence:** `docs.html` contains no local explanatory content; all links point to `github.com/synth-dev/synth-v2/blob/main/docs/...`.

### 4. No comparison with alternatives

Visitors will inevitably compare SYNTH to CI/CD, AI coding assistants, Git, and project management tools. The website never addresses these comparisons or explains why SYNTH is a different category.

**Evidence:** No comparison section exists on `index.html`, `architecture.html`, or elsewhere.

### 5. Homepage above-the-fold does not explain what SYNTH is

A visitor sees the tagline, subtitle, install command, and two buttons, but cannot determine whether SYNTH is a CLI, framework, methodology, or platform without scrolling and inferring.

**Evidence:** `index.html` hero section; the single most important message is clear only after reading the concepts and flow sections below the fold.

---

## Three Strongest Aspects of the Current Site

1. **Clear public vocabulary.** The seven public concepts (Mission, Expedition, Evidence, Plan, Event, State, Replay) are consistently presented and easy to remember.
2. **Immediate install command.** The one-line installer is visible above the fold on the homepage, lowering friction for curious visitors.
3. **Determinism as a differentiator.** The site prominently names determinism, replay, and governance — concepts that distinguish SYNTH from conventional tooling.

---

## Answer to the Key Question

> After spending five minutes on the website, would a technically sophisticated developer understand that SYNTH is an AI-native execution platform rather than another developer CLI or automation tool?

**Marginally.**

A sophisticated developer would notice the AI references in the hero and the AGENTS.md note. However, the CLI-centric Quick Start, the absence of an AI workflow explanation, and the lack of comparison with alternatives make it easy to conclude that SYNTH is a governance-heavy CLI framework. The website does not yet consistently reinforce the AI-native execution platform positioning.

---

## Top Five Recommendations (Priority Order)

### 1. Add a "Why SYNTH" page or section
Articulate the specific problem SYNTH solves and the failure modes of current workflows. This should precede or accompany the mechanism description.

### 2. Create an "AI Workflow" page
Explain the intended interaction: human describes intent, AI proposes a plan, human approves, AI executes via SYNTH CLI, Replay verifies. This is the single most important page missing from the site.

### 3. Host core documentation on the website
Move Getting Started, Public Vocabulary, and Public Architecture from GitHub markdown into website pages. Keep GitHub links for deep reference only.

### 4. Add a comparison / positioning section
Explicitly contrast SYNTH with CI/CD, AI coding assistants, Git, and project management tools. Clarify why SYNTH is a different category.

### 5. Clarify the homepage above-the-fold message
Add one sentence below the subtitle that states what SYNTH is, e.g., "A CLI and execution framework for AI-native software development."

---

## Proposed New Programs / Expeditions

The audit concludes that the website gaps are adoption-era content gaps, not architectural changes. No new constitutional program is required. The work fits within existing Era II — Adoption efforts.

Two expeditions are proposed:

### EXP-AX-006 — Website Narrative Alignment

**Objective:** Align the website with SYNTH's AI-native execution platform positioning.

**Deliverables:**
- Rewrite homepage hero and subtitle to state the problem and positioning clearly.
- Add a "Why SYNTH" page.
- Add an "AI Workflow" page.
- Add a comparison / positioning page or section.

**Acceptance:** A first-time visitor can answer "What is SYNTH?", "What problem does it solve?", and "How do I use it with AI?" within two minutes.

### EXP-AX-007 — Core Documentation on Website

**Objective:** Move foundational documentation from GitHub markdown onto the website.

**Deliverables:**
- Convert Getting Started, Public Vocabulary, and Public Architecture to website pages.
- Update `docs.html` to link to on-site pages first and GitHub reference second.
- Maintain synchronization with source markdown via projections.

**Acceptance:** A visitor can learn SYNTH fundamentals without leaving the website.

---

## Constitutional Alignment

These recommendations do not modify any Protected Asset. They are public-facing communication improvements consistent with:

- ADR-004 (Era II — Adoption)
- The seven-public-concepts vocabulary
- The Projection Rule (derived artifacts produced deterministically from source docs)

No architectural or governance changes are proposed.
