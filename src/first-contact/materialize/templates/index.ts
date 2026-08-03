// ============================================================
// FIRST CONTACT: Workflow Template Catalog
// ============================================================
// Canonical workflow templates for EXP-AIFC-011. Each template is a
// deterministic sequence of phases with required adapters and explicit
// phase linkage.
// ============================================================

import type { WorkflowTemplate } from "../types.js"

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "nextjs-chatbot",
    name: "Next.js Full-Stack Chatbot",
    architectureTypes: [
      "arch-web-nextjs",
      "Next.js + Vercel static app",
      "Next.js + Vercel + external API",
      "nextjs-chatbot",
      "nextjs-fullstack",
      "nextjs",
    ],
    phases: [
      {
        id: "ui-component",
        title: "UI Component",
        description: "Build the conversational UI components and chat surface.",
        expeditionSubject: "UI Component Implementation",
        requiredAdapters: ["nextjs-runtime"],
        nextPhase: "api-route",
      },
      {
        id: "api-route",
        title: "API Route",
        description: "Implement the serverless API route that powers the chat backend.",
        expeditionSubject: "API Route Implementation",
        requiredAdapters: ["api-route"],
        nextPhase: "integration-test",
      },
      {
        id: "integration-test",
        title: "Integration Test",
        description: "Add integration tests that exercise the UI and API together.",
        expeditionSubject: "Integration Test Coverage",
        requiredAdapters: ["tdd"],
        nextPhase: "documentation",
      },
      {
        id: "documentation",
        title: "Documentation",
        description: "Document the chatbot architecture, API contract, and runbook.",
        expeditionSubject: "Documentation and Runbook",
        requiredAdapters: [],
        nextPhase: null,
      },
    ],
  },
  {
    id: "python-cli",
    name: "Python CLI",
    architectureTypes: [
      "arch-cli-python",
      "Python CLI with Click + Jinja2",
      "python-cli",
      "python",
    ],
    phases: [
      {
        id: "intent",
        title: "Intent Capture",
        description: "Capture the CLI commands, arguments, and operator intent.",
        expeditionSubject: "CLI Intent Capture",
        requiredAdapters: ["python-cli"],
        nextPhase: "test",
      },
      {
        id: "test",
        title: "Test",
        description: "Write unit and invocation tests for the CLI entry points.",
        expeditionSubject: "CLI Test Coverage",
        requiredAdapters: ["tdd"],
        nextPhase: "package",
      },
      {
        id: "package",
        title: "Package",
        description: "Package the CLI for distribution via pip or zipapp.",
        expeditionSubject: "CLI Packaging",
        requiredAdapters: [],
        nextPhase: "publish",
      },
      {
        id: "publish",
        title: "Publish",
        description: "Publish the package artifact and tag a release.",
        expeditionSubject: "CLI Release",
        requiredAdapters: ["repository"],
        nextPhase: null,
      },
    ],
  },
  {
    id: "generic-greenfield",
    name: "Generic Greenfield",
    architectureTypes: [
      "arch-fallback",
      "generic-greenfield",
      "greenfield",
    ],
    phases: [
      {
        id: "baseline-capture",
        title: "Baseline Capture",
        description: "Record the approved intent, architecture, and constraints as governed state.",
        expeditionSubject: "Greenfield Baseline Capture",
        requiredAdapters: ["repository"],
        nextPhase: "architecture-validation",
      },
      {
        id: "architecture-validation",
        title: "Architecture Validation",
        description: "Validate the selected architecture assumptions and produce the first working increment.",
        expeditionSubject: "Architecture Validation",
        requiredAdapters: [],
        nextPhase: "first-increment",
      },
      {
        id: "first-increment",
        title: "First Increment",
        description: "Deliver the first governed increment with evidence and replay checks.",
        expeditionSubject: "First Increment Delivery",
        requiredAdapters: ["tdd"],
        nextPhase: null,
      },
    ],
  },
]
