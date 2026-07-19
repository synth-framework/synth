// ============================================================
// DISCOVERY OPERATIONAL ARTIFACT ADAPTER TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createOperationalArtifactDiscoveryAdapterWithProvider,
  createDefaultDiscoveryEngine,
  OPERATIONAL_ARTIFACT_ADAPTER_ID,
  OPERATIONAL_ARTIFACT_ADAPTER_VERSION,
} from "../dist/discovery/index.js"
import { createInMemoryFilesystemProvider } from "../dist/environment/index.js"

function makeFilesystem() {
  return createInMemoryFilesystemProvider({
    "/project/Dockerfile": "FROM node:20",
    "/project/docker-compose.yml": "services:",
    "/project/k8s/deployment.yaml": "apiVersion: apps/v1",
    "/project/migrations/001_init.sql": "CREATE TABLE",
    "/project/.github/workflows/ci.yml": "on: push",
    "/project/main.tf": "resource",
    "/project/README.md": "# Project",
  })
}

test("operational artifact adapter declares id, version, and determinism", () => {
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(makeFilesystem())

  assert.strictEqual(adapter.id, OPERATIONAL_ARTIFACT_ADAPTER_ID)
  assert.strictEqual(adapter.version, OPERATIONAL_ARTIFACT_ADAPTER_VERSION)
  assert.strictEqual(adapter.determinism, "deterministic")
})

test("operational artifact adapter canHandle returns true only for filesystem sources", () => {
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(makeFilesystem())

  assert.strictEqual(adapter.canHandle({ type: "filesystem", path: "/project" }), true)
  assert.strictEqual(adapter.canHandle({ type: "git", url: "https://example.com/repo.git" }), false)
  assert.strictEqual(adapter.canHandle({ type: "api", endpoint: "https://example.com/api" }), false)
})

test("operational artifact adapter returns observations with required provenance", async () => {
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(makeFilesystem())
  const source = { type: "filesystem", path: "/project" }

  const observations = await adapter.collectObservations(source, {})

  assert.ok(observations.length > 0, "observations are produced")
  for (const observation of observations) {
    assert.strictEqual(observation.adapterId, OPERATIONAL_ARTIFACT_ADAPTER_ID)
    assert.strictEqual(observation.adapterVersion, OPERATIONAL_ARTIFACT_ADAPTER_VERSION)
    assert.deepStrictEqual(observation.source, source)
    assert.strictEqual(typeof observation.fact, "string")
    assert.ok(observation.timestamp > 0, "timestamp is set")
  }
})

test("operational artifact adapter detects container artifacts", async () => {
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(makeFilesystem())
  const observations = await adapter.collectObservations({ type: "filesystem", path: "/project" }, {})

  const detected = observations.filter((o) => o.fact === "operational artifact detected")
  const kinds = detected.map((o) => `${o.payload.artifactType}:${o.payload.kind}`)

  assert.ok(kinds.includes("container:Dockerfile"), `expected container:Dockerfile in ${kinds.join(", ")}`)
  assert.ok(kinds.includes("container:docker-compose"), "expected container:docker-compose")
})

test("operational artifact adapter detects deployment artifacts", async () => {
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(makeFilesystem())
  const observations = await adapter.collectObservations({ type: "filesystem", path: "/project" }, {})

  const detected = observations.filter((o) => o.fact === "operational artifact detected")
  const deployment = detected.find((o) => o.payload.artifactType === "deployment")

  assert.ok(deployment, "expected deployment artifact")
  assert.strictEqual(deployment.payload.kind, "kubernetes-manifest")
})

test("operational artifact adapter detects database artifacts", async () => {
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(makeFilesystem())
  const observations = await adapter.collectObservations({ type: "filesystem", path: "/project" }, {})

  const detected = observations.filter((o) => o.fact === "operational artifact detected")
  const database = detected.find((o) => o.payload.artifactType === "database")

  assert.ok(database, "expected database artifact")
  assert.strictEqual(database.payload.kind, "migration-directory")
})

test("operational artifact adapter detects CI/CD artifacts", async () => {
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(makeFilesystem())
  const observations = await adapter.collectObservations({ type: "filesystem", path: "/project" }, {})

  const detected = observations.filter((o) => o.fact === "operational artifact detected")
  const cicd = detected.find((o) => o.payload.artifactType === "cicd")

  assert.ok(cicd, "expected CI/CD artifact")
  assert.strictEqual(cicd.payload.kind, "github-workflow")
})

test("operational artifact adapter detects infrastructure artifacts", async () => {
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(makeFilesystem())
  const observations = await adapter.collectObservations({ type: "filesystem", path: "/project" }, {})

  const detected = observations.filter((o) => o.fact === "operational artifact detected")
  const infra = detected.find((o) => o.payload.artifactType === "infrastructure")

  assert.ok(infra, "expected infrastructure artifact")
  assert.strictEqual(infra.payload.kind, "terraform")
})

test("operational artifact adapter reports missing paths", async () => {
  const fs = createInMemoryFilesystemProvider({})
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(fs)

  const observations = await adapter.collectObservations({ type: "filesystem", path: "/missing" }, {})

  assert.strictEqual(observations.length, 1)
  assert.strictEqual(observations[0].fact, "operational artifact scan path does not exist")
})

test("operational artifact adapter reports non-directory paths", async () => {
  const fs = createInMemoryFilesystemProvider({ "/file.txt": "hello" })
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(fs)

  const observations = await adapter.collectObservations({ type: "filesystem", path: "/file.txt" }, {})

  assert.strictEqual(observations.length, 1)
  assert.strictEqual(observations[0].fact, "operational artifact scan path is not a directory")
})

test("operational artifact adapter does not modify the source filesystem", async () => {
  const fs = makeFilesystem()
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(fs)

  await adapter.collectObservations({ type: "filesystem", path: "/project" }, {})

  assert.strictEqual(await fs.pathExists("/project/Dockerfile"), true)
  assert.strictEqual(await fs.pathExists("/project/.synth-discovery"), false)
})

test("operational artifact adapter emits family observations", async () => {
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(makeFilesystem())
  const observations = await adapter.collectObservations({ type: "filesystem", path: "/project" }, {})

  const families = observations
    .filter((o) => o.fact === "operational artifact family observed")
    .map((o) => o.payload.artifactType)

  assert.ok(families.includes("container"))
  assert.ok(families.includes("deployment"))
  assert.ok(families.includes("database"))
  assert.ok(families.includes("cicd"))
  assert.ok(families.includes("infrastructure"))
})

test("operational artifacts are projected into ProjectModel capabilities", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
    "/project/Dockerfile": "FROM node:20",
    "/project/k8s/deployment.yaml": "apiVersion: apps/v1",
    "/project/migrations/001_init.sql": "CREATE TABLE",
    "/project/.github/workflows/ci.yml": "on: push",
    "/project/main.tf": "resource",
  })
  const adapter = createOperationalArtifactDiscoveryAdapterWithProvider(fs)
  const engine = createDefaultDiscoveryEngine({
    observationCapabilities: [
      (await import("../dist/discovery/capabilities/filesystem-capability.js")).createFilesystemObservationCapabilityWithProvider(fs),
      (await import("../dist/discovery/capabilities/operational-artifact-capability.js")).createOperationalArtifactObservationCapabilityWithProvider(fs),
    ],
  })

  const session = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })

  const capabilities = session.projections["project-model"].capabilities.map((c) => c.name)

  assert.ok(capabilities.includes("containerization"), `expected containerization in ${capabilities.join(", ")}`)
  assert.ok(capabilities.includes("deployment"), "expected deployment")
  assert.ok(capabilities.includes("database"), "expected database")
  assert.ok(capabilities.includes("continuous-integration"), "expected continuous-integration")
  assert.ok(capabilities.includes("infrastructure-as-code"), "expected infrastructure-as-code")
})
