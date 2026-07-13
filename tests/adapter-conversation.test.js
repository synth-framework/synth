// ============================================================
// ADAPTER TESTS — Conversation Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createConversationAdapter } from "../dist/adapters/conversation/adapter.js"
import { createAdapterRegistry } from "../dist/adapters/registry.js"

test("AdapterRegistry lists conversation adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("conversation"))
})

test("ConversationAdapter starts in discovered state", () => {
  const adapter = createConversationAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "integration")
  assert.strictEqual(adapter.metadata.kind, "conversation")
})

test("ConversationAdapter transitions through lifecycle", async () => {
  const adapter = createConversationAdapter()
  await adapter.configure({ actorName: "Operator", turns: [] })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("ConversationAdapter extracts intent observation", async () => {
  const adapter = createConversationAdapter()
  await adapter.enable()
  adapter.submitTurn("operator", "I want to build a CRM.")
  const result = await adapter.observe()
  assert.strictEqual(result.errors.length, 0)
  const intent = result.observations.find((o) => o.category === "intent")
  assert.ok(intent, "Expected intent observation")
  assert.strictEqual(intent.subject, "CRM")
  assert.strictEqual(intent.confidence, "high")
  assert.strictEqual(intent.source.adapter, "conversation")
  assert.ok(intent.evidence.length > 0)
})

test("ConversationAdapter extracts actor observation", async () => {
  const adapter = createConversationAdapter()
  await adapter.enable()
  adapter.submitTurn("operator", "As a sales manager, I want a dashboard.")
  const result = await adapter.observe()
  const actor = result.observations.find((o) => o.category === "actor")
  assert.ok(actor, "Expected actor observation")
  assert.strictEqual(actor.subject, "sales manager")
})

test("ConversationAdapter extracts constraint observations", async () => {
  const adapter = createConversationAdapter()
  await adapter.enable()
  adapter.submitTurn("operator", "Users must log in. Data should be encrypted.")
  const result = await adapter.observe()
  const constraints = result.observations.filter((o) => o.category === "constraint")
  assert.strictEqual(constraints.length, 2)
  assert.ok(constraints[0].confidence === "medium")
})

test("ConversationAdapter ignores non-operator turns", async () => {
  const adapter = createConversationAdapter()
  await adapter.enable()
  adapter.submitTurn("assistant", "I will help you build a CRM.")
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 0)
})

test("ConversationAdapter falls back to unknown for unrecognized text", async () => {
  const adapter = createConversationAdapter()
  await adapter.enable()
  adapter.submitTurn("operator", "Purple elephants dance at midnight.")
  const result = await adapter.observe()
  const unknown = result.observations.find((o) => o.category === "unknown")
  assert.ok(unknown, "Expected unknown observation")
  assert.strictEqual(unknown.confidence, "low")
})

test("ConversationAdapter health check passes when enabled", async () => {
  const adapter = createConversationAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
