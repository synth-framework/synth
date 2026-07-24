// ============================================================
// ADAPTER TESTS — Specification Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createSpecificationAdapter } from "../dist/adapters/specification/adapter.js"
import { createAdapterRegistry } from "../dist/mission-studio/adapter-registry.js"
import fs from "fs"
import path from "path"

const FIXTURES_DIR = path.join(process.cwd(), "tests", "specification-adapter-fixtures")

function cleanFixtures() {
  fs.rmSync(FIXTURES_DIR, { recursive: true, force: true })
  fs.mkdirSync(FIXTURES_DIR, { recursive: true })
}

function writeFixture(relativePath, content) {
  const fullPath = path.join(FIXTURES_DIR, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content)
}

test("AdapterRegistry lists specification adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("specification"))
})

test("SpecificationAdapter starts in discovered state", () => {
  const adapter = createSpecificationAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "integration")
  assert.strictEqual(adapter.metadata.kind, "specification")
})

test("SpecificationAdapter transitions through lifecycle", async () => {
  cleanFixtures()
  const adapter = createSpecificationAdapter()
  await adapter.configure({ specificationsDirectory: FIXTURES_DIR })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("SpecificationAdapter extracts OpenAPI capabilities", async () => {
  cleanFixtures()
  writeFixture(
    "api.openapi.json",
    JSON.stringify({
      openapi: "3.0.0",
      paths: {
        "/users": {
          get: { operationId: "listUsers", summary: "List users" },
          post: { operationId: "createUser", summary: "Create user" },
        },
      },
    }),
  )

  const adapter = createSpecificationAdapter()
  await adapter.configure({ specificationsDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.errors.length, 0)

  const evidence = result.observations.find((o) => o.category === "evidence")
  assert.ok(evidence, "Expected evidence observation")
  assert.strictEqual(evidence.metadata.format, "openapi")
  assert.strictEqual(evidence.metadata.version, "3.0.0")

  const capabilities = result.observations.filter((o) => o.category === "capability")
  assert.strictEqual(capabilities.length, 2)
  assert.ok(capabilities.some((o) => o.subject === "listUsers"))
  assert.ok(capabilities.some((o) => o.subject === "createUser"))
})

test("SpecificationAdapter extracts AsyncAPI capabilities", async () => {
  cleanFixtures()
  writeFixture(
    "events.asyncapi.yaml",
    `asyncapi: '2.6.0'
channels:
  user.signedup:
    operations:
      sendUserSignedUp:
        action: send
`,
  )

  const adapter = createSpecificationAdapter()
  await adapter.configure({ specificationsDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  const evidence = result.observations.find((o) => o.category === "evidence")
  assert.ok(evidence)
  assert.strictEqual(evidence.metadata.format, "asyncapi")
  assert.strictEqual(evidence.metadata.version, "2.6.0")

  const capabilities = result.observations.filter((o) => o.category === "capability")
  assert.strictEqual(capabilities.length, 1)
  assert.strictEqual(capabilities[0].subject, "sendUserSignedUp")
})

test("SpecificationAdapter extracts GraphQL capabilities", async () => {
  cleanFixtures()
  writeFixture(
    "schema.graphql",
    `type Query {
      user(id: ID!): User
      users: [User]
    }
    type User {
      id: ID!
      name: String
    }`,
  )

  const adapter = createSpecificationAdapter()
  await adapter.configure({ specificationsDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  const capabilities = result.observations.filter((o) => o.category === "capability")
  assert.ok(capabilities.length >= 2)
  assert.ok(capabilities.some((o) => o.subject === "Query.user"))
  assert.ok(capabilities.some((o) => o.subject === "Query.users"))
})

test("SpecificationAdapter extracts Protocol Buffer capabilities", async () => {
  cleanFixtures()
  writeFixture(
    "api.proto",
    `syntax = "proto3";
service UserService {
  rpc GetUser (UserRequest) returns (User);
  rpc ListUsers (Empty) returns (UserList);
}`,
  )

  const adapter = createSpecificationAdapter()
  await adapter.configure({ specificationsDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  const capabilities = result.observations.filter((o) => o.category === "capability")
  assert.strictEqual(capabilities.length, 2)
  assert.ok(capabilities.some((o) => o.subject === "UserService.GetUser"))
  assert.ok(capabilities.some((o) => o.subject === "UserService.ListUsers"))
})

test("SpecificationAdapter emits evidence for JSON Schema", async () => {
  cleanFixtures()
  writeFixture(
    "user.schema.json",
    JSON.stringify({
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "User",
      type: "object",
      properties: { id: { type: "string" } },
    }),
  )

  const adapter = createSpecificationAdapter()
  await adapter.configure({ specificationsDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  const evidence = result.observations.find((o) => o.category === "evidence")
  assert.ok(evidence)
  assert.strictEqual(evidence.metadata.format, "jsonschema")
})

test("SpecificationAdapter scans explicit file list", async () => {
  cleanFixtures()
  writeFixture("a.openapi.json", JSON.stringify({ openapi: "3.0.0", paths: {} }))
  writeFixture("b.openapi.json", JSON.stringify({ openapi: "3.0.0", paths: {} }))

  const adapter = createSpecificationAdapter()
  await adapter.configure({ files: [path.join(FIXTURES_DIR, "a.openapi.json")] })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].subject, "a.openapi.json")
})

test("SpecificationAdapter returns empty batch for missing directory", async () => {
  const missingDir = path.join(process.cwd(), "tests", "specification-adapter-missing")
  fs.rmSync(missingDir, { recursive: true, force: true })

  const adapter = createSpecificationAdapter()
  await adapter.configure({ specificationsDirectory: missingDir })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 0)
  assert.strictEqual(result.errors.length, 0)
})

test("SpecificationAdapter health check passes when enabled", async () => {
  const adapter = createSpecificationAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
