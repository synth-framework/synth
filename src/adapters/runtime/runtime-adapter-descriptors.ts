// ============================================================
// RUNTIME ADAPTER DESCRIPTORS
// ============================================================
// Static descriptors for runtime/workflow adapters that do not have
// a dedicated TypeScript class but participate in the unified adapter
// catalog (EXP-ADAPTER-CATALOG-001).
//
// These descriptors mirror the legacy ADAPTER_CATALOG in
// first-contact/materialize/recommend.ts and will replace it once the
// catalog service is implemented.
// ============================================================

import type { AdapterDescriptor } from "../../types/adapter.js"

export const NEXTJS_RUNTIME_DESCRIPTOR: AdapterDescriptor = {
  id: "nextjs-runtime",
  name: "Next.js Runtime Adapter",
  version: "1.0.0",
  kind: "runtime",
  family: "runtime",
  description: "Runtime adapter for Next.js web applications",
  runtimes: ["web", "node"],
  languages: ["typescript", "javascript"],
  platforms: ["vercel"],
  capabilities: ["ui", "frontend", "react"],
  determinism: "deterministic",
}

export const API_ROUTE_DESCRIPTOR: AdapterDescriptor = {
  id: "api-route",
  name: "API Route Adapter",
  version: "1.0.0",
  kind: "runtime",
  family: "runtime",
  description: "Runtime adapter for HTTP API endpoints",
  runtimes: ["web", "node"],
  languages: ["typescript", "javascript"],
  platforms: ["vercel"],
  capabilities: ["api", "launch"],
  determinism: "deterministic",
}

export const PYTHON_CLI_DESCRIPTOR: AdapterDescriptor = {
  id: "python-cli",
  name: "Python CLI Adapter",
  version: "1.0.0",
  kind: "runtime",
  family: "runtime",
  description: "Runtime adapter for Python command-line tools",
  runtimes: ["cli"],
  languages: ["python"],
  platforms: [],
  capabilities: ["cli"],
  determinism: "deterministic",
}

export const TDD_DESCRIPTOR: AdapterDescriptor = {
  id: "tdd",
  name: "Test-Driven Development Adapter",
  version: "1.0.0",
  kind: "methodology",
  family: "runtime",
  description: "Methodology adapter that enforces test-driven development workflows",
  runtimes: [],
  languages: [],
  platforms: [],
  capabilities: ["testing", "test"],
  determinism: "deterministic",
}

export const RUNTIME_ADAPTER_DESCRIPTORS: AdapterDescriptor[] = [
  NEXTJS_RUNTIME_DESCRIPTOR,
  API_ROUTE_DESCRIPTOR,
  PYTHON_CLI_DESCRIPTOR,
  TDD_DESCRIPTOR,
]
