// ============================================================
// HOMEPAGE RUNTIME: Curated Demonstration Library
// ============================================================
// Deterministic demo missions that visitors can explore and that
// serve as regression test fixtures.
// ============================================================

import type { DemoExample } from "./types.js"

export const demoExamples: DemoExample[] = [
  {
    id: "ai-product-homepage",
    name: "AI Product Homepage",
    input: "Create a homepage for an AI product.",
    mode: "greenfield",
  },
  {
    id: "markdown-editor",
    name: "Markdown Editor",
    input: "Build a markdown editor with live preview and file export.",
    mode: "greenfield",
  },
  {
    id: "space-mission-tracker",
    name: "Space Mission Tracker",
    input: "Create a web app to track space missions, launches, and crew assignments.",
    mode: "greenfield",
  },
  {
    id: "recipe-organizer",
    name: "Recipe Organizer",
    input: "Make a recipe organizer with search, tags, and shopping list export.",
    mode: "greenfield",
  },
  {
    id: "crm",
    name: "CRM",
    input: "Build a CRM with contacts, deals, and task tracking for a sales team.",
    mode: "greenfield",
  },
  {
    id: "inventory-system",
    name: "Inventory System",
    input: "Create an inventory system with products, stock levels, and restock alerts.",
    mode: "greenfield",
  },
  {
    id: "portfolio-website",
    name: "Portfolio Website",
    input: "Make a responsive portfolio website with projects and contact form.",
    mode: "greenfield",
  },
]

export function getDemoExample(id: string): DemoExample | undefined {
  return demoExamples.find((example) => example.id === id)
}

export function getAllDemoExamples(): DemoExample[] {
  return demoExamples
}
