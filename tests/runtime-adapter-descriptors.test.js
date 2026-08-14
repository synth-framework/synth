// ============================================================
// RUNTIME ADAPTER DESCRIPTOR CONTRACT TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  NEXTJS_RUNTIME_DESCRIPTOR,
  API_ROUTE_DESCRIPTOR,
  PYTHON_CLI_DESCRIPTOR,
  TDD_DESCRIPTOR,
  RUNTIME_ADAPTER_DESCRIPTORS,
} from "../dist/adapters/runtime/runtime-adapter-descriptors.js"

function assertDescriptorShape(descriptor) {
  assert.strictEqual(typeof descriptor.id, "string")
  assert.strictEqual(typeof descriptor.name, "string")
  assert.strictEqual(typeof descriptor.version, "string")
  assert.ok(["integration", "methodology", "intelligence", "planning", "runtime"].includes(descriptor.kind))
  assert.strictEqual(typeof descriptor.family, "string")
  assert.strictEqual(typeof descriptor.description, "string")
  assert.ok(Array.isArray(descriptor.capabilities))
  assert.ok(descriptor.capabilities.length > 0, "descriptor exposes at least one capability")
  assert.ok(["deterministic", "contextual", "non-deterministic"].includes(descriptor.determinism))
}

test("nextjs runtime descriptor has canonical shape", () => {
  assertDescriptorShape(NEXTJS_RUNTIME_DESCRIPTOR)
  assert.strictEqual(NEXTJS_RUNTIME_DESCRIPTOR.id, "nextjs-runtime")
  assert.ok(NEXTJS_RUNTIME_DESCRIPTOR.runtimes.includes("web"))
  assert.ok(NEXTJS_RUNTIME_DESCRIPTOR.languages.includes("typescript"))
})

test("api route descriptor has canonical shape", () => {
  assertDescriptorShape(API_ROUTE_DESCRIPTOR)
  assert.strictEqual(API_ROUTE_DESCRIPTOR.id, "api-route")
})

test("python cli descriptor has canonical shape", () => {
  assertDescriptorShape(PYTHON_CLI_DESCRIPTOR)
  assert.strictEqual(PYTHON_CLI_DESCRIPTOR.id, "python-cli")
  assert.ok(PYTHON_CLI_DESCRIPTOR.languages.includes("python"))
})

test("tdd descriptor has canonical shape", () => {
  assertDescriptorShape(TDD_DESCRIPTOR)
  assert.strictEqual(TDD_DESCRIPTOR.id, "tdd")
  assert.strictEqual(TDD_DESCRIPTOR.kind, "methodology")
})

test("runtime descriptor catalog contains all known runtime adapters", () => {
  assert.strictEqual(RUNTIME_ADAPTER_DESCRIPTORS.length, 4)
  for (const descriptor of RUNTIME_ADAPTER_DESCRIPTORS) {
    assertDescriptorShape(descriptor)
  }
})
