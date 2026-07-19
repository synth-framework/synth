// ============================================================
// Distribution Module Tests
// ============================================================
// EXP-PROGRAM-029
// ============================================================

import { getCapabilityModel } from "../dist/distribution/capability-model.js"
import {
  listProjectionTargets,
  project,
  projectAll,
} from "../dist/distribution/projection-engine.js"
import { handleRequest } from "../dist/distribution/mcp/server.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function testCapabilityModelSchema() {
  const model = getCapabilityModel()
  assert(model.schema === "synth-ai-capability-model-v1", "model schema should be v1")
  assert(model.project.name === "SYNTH", "project name should be SYNTH")
  assert(model.protocols.length >= 4, "model should define at least 4 protocols")
  assert(model.capabilities.length >= 6, "model should define at least 6 capabilities")
  assert(model.skills.length >= 6, "model should define at least 6 skills")
  assert(model.surfaces.length >= 5, "model should define at least 5 surfaces")
  assert(model.packages.length >= 3, "model should define at least 3 packages")
  console.log("[PASS] capability model has expected schema and content")
}

function testProjectionTargets() {
  const targets = listProjectionTargets()
  assert(targets.includes("chatgpt-skill"), "should project chatgpt skill")
  assert(targets.includes("claude-skill"), "should project claude skill")
  assert(targets.includes("cursor-rules"), "should project cursor rules")
  assert(targets.includes("mcp-manifest"), "should project mcp manifest")
  assert(targets.includes("package-metadata"), "should project package metadata")
  assert(targets.includes("website-section"), "should project website section")
  console.log("[PASS] projection targets include expected surfaces")
}

function testSkillProjection() {
  const model = getCapabilityModel()
  const result = project(model, "chatgpt-skill")
  assert(result.target === "chatgpt-skill", "target should match")
  assert(result.filename === "synth-chatgpt-skill.md", "filename should be synth-chatgpt-skill.md")
  assert(result.contentType === "markdown", "content type should be markdown")
  assert(result.content.includes("SYNTH"), "content should mention SYNTH")
  assert(result.content.includes("Mission"), "content should mention Mission")
  assert(result.content.includes("Genesis Protocol"), "content should mention Genesis Protocol")
  console.log("[PASS] chatgpt skill projection is generated")
}

function testIdeRulesProjection() {
  const model = getCapabilityModel()
  const cursor = project(model, "cursor-rules")
  assert(cursor.filename === ".cursorrules", "cursor rules filename should be .cursorrules")
  assert(cursor.content.includes("synth repo init"), "cursor rules should mention repo commands")

  const windsurf = project(model, "windsurf-rules")
  assert(windsurf.filename === ".windsurfrules", "windsurf rules filename should be .windsurfrules")

  const cline = project(model, "cline-rules")
  assert(cline.filename === ".clinerules", "cline rules filename should be .clinerules")
  console.log("[PASS] IDE rules projections are generated")
}

function testMcpManifestProjection() {
  const model = getCapabilityModel()
  const result = project(model, "mcp-manifest")
  assert(result.filename === "synth-mcp-manifest.json", "filename should be synth-mcp-manifest.json")
  const manifest = JSON.parse(result.content)
  assert(manifest.name === "synth", "manifest name should be synth")
  assert(Array.isArray(manifest.capabilities.tools), "manifest should list tool capabilities")
  assert(manifest.capabilities.tools.length >= 4, "manifest should have at least 4 tools")
  console.log("[PASS] MCP manifest projection is valid JSON")
}

function testPackageMetadataProjection() {
  const model = getCapabilityModel()
  const result = project(model, "package-metadata")
  const metadata = JSON.parse(result.content)
  assert(metadata.project.name === "SYNTH", "package metadata project name should be SYNTH")
  assert(Array.isArray(metadata.packages), "package metadata should list packages")
  assert(metadata.packages.some((p) => p.registry === "npm"), "should include npm packages")
  console.log("[PASS] package metadata projection is valid JSON")
}

function testProjectAll() {
  const model = getCapabilityModel()
  const results = projectAll(model)
  const targets = listProjectionTargets()
  assert(results.length === targets.length, "projectAll should return one result per target")
  const filenames = new Set(results.map((r) => r.filename))
  assert(filenames.size === results.length, "each projection should have a unique filename")
  console.log("[PASS] projectAll generates all projections")
}

async function testMcpInitialize() {
  const response = await handleRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
  })
  assert(response.jsonrpc === "2.0", "response should be jsonrpc 2.0")
  assert(response.id === 1, "response id should match")
  assert(response.result.protocolVersion === "2024-11-05", "initialize should return protocol version")
  assert(response.result.serverInfo.name === "synth-mcp-server", "server name should be synth-mcp-server")
  console.log("[PASS] MCP initialize responds correctly")
}

async function testMcpToolsList() {
  const response = await handleRequest({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  })
  assert(Array.isArray(response.result.tools), "tools/list should return tools array")
  assert(response.result.tools.length >= 4, "should expose at least 4 tools")
  assert(response.result.tools.some((t) => t.name === "synth_list_capabilities"), "should expose synth_list_capabilities")
  console.log("[PASS] MCP tools/list exposes SYNTH tools")
}

async function testMcpUnknownMethod() {
  const response = await handleRequest({
    jsonrpc: "2.0",
    id: 3,
    method: "unknown/method",
  })
  assert(response.error, "unknown method should return error")
  assert(response.error.code === -32601, "unknown method error code should be -32601")
  console.log("[PASS] MCP unknown method returns method not found")
}

async function main() {
  testCapabilityModelSchema()
  testProjectionTargets()
  testSkillProjection()
  testIdeRulesProjection()
  testMcpManifestProjection()
  testPackageMetadataProjection()
  testProjectAll()
  await testMcpInitialize()
  await testMcpToolsList()
  await testMcpUnknownMethod()
  console.log("\nAll distribution module tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
