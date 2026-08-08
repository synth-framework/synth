// ============================================================
// BOOTSTRAP: Apply Phase
// ============================================================
// Generates proposals from repository analysis and, if approved,
// applies SYNTH configuration to the target directory.
// ============================================================

import path from "path"
import * as sdk from "../sdk/index.js"
import { bootstrap } from "../core/bootstrap.js"
import { injectIdentityContext } from "./identity-context.js"
import { analyzeRepository } from "./bootstrap-analyzer.js"
import { checkGovernDelegation, governDelegationMessage, npmCommand } from "./govern-delegation.js"
import { writeAgentArtifacts } from "./agent-artifacts.js"
import { generateAgentContext } from "./bootstrap-context.js"

export type BootstrapStage = {
  stage: string
  status: "pending" | "running" | "completed" | "failed" | "skipped"
  description: string
  durationMs?: number
}

export type BootstrapOptions = {
  approve: boolean
  dryRun: boolean
  withWebsite: boolean
  withExample: boolean
  projectName?: string
  streamStages?: boolean
}

type StageRunner = {
  stages: BootstrapStage[]
  run: <T>(name: string, description: string, fn: () => Promise<T>) => Promise<T>
}

function createStageRunner(streamStages?: boolean): StageRunner {
  const stages: BootstrapStage[] = []

  async function run<T>(name: string, description: string, fn: () => Promise<T>): Promise<T> {
    const stage: BootstrapStage = { stage: name, status: "running", description }
    stages.push(stage)
    const start = Date.now()
    if (streamStages) {
      console.error(JSON.stringify({ kind: "BootstrapStage", ...stage }))
    }
    try {
      const result = await fn()
      stage.status = "completed"
      stage.durationMs = Date.now() - start
      if (streamStages) {
        console.error(JSON.stringify({ kind: "BootstrapStage", ...stage }))
      }
      return result
    } catch (err) {
      stage.status = "failed"
      stage.durationMs = Date.now() - start
      if (streamStages) {
        console.error(JSON.stringify({ kind: "BootstrapStage", ...stage, error: String(err) }))
      }
      throw err
    }
  }

  return { stages, run }
}

function makeObservation(type: string, subject: string, timestamp: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "synth-bootstrap",
    type,
    payload: { subject, name: subject, ...overrides },
    evidenceReference: `evidence-${type}-${subject}`,
    confidence: "high",
    timestamp,
  }
}

async function generateProposals(analysis: Awaited<ReturnType<typeof analyzeRepository>>) {
  const timestamp = Date.now()
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })

  const missionSubject = analysis.repositoryType === "empty"
    ? "Establish deterministic governance baseline"
    : "Establish deterministic governance baseline"

  const missionPurpose = analysis.repositoryType === "empty"
    ? "Capture the current state of the repository, identify unknowns and inconsistencies, and produce a baseline that future Missions can build on."
    : "Capture the current state of the repository, identify unknowns and inconsistencies, and produce a baseline that future Missions can build on."

  const existingMissionObservation = analysis.observations.find(
    (observation) => observation.type === "mission",
  )

  const missionObservation = existingMissionObservation
    ? {
        ...existingMissionObservation,
        id: `obs-mission-${missionSubject.toLowerCase().replace(/\s+/g, "-")}`,
        payload: {
          ...existingMissionObservation.payload,
          name: missionSubject,
          subject: missionSubject,
          purpose: missionPurpose,
          discoverySessionId: analysis.discoverySessionId,
          discoverySessionHash: analysis.discoverySessionHash,
        },
      }
    : makeObservation("mission", missionSubject, timestamp, {
        purpose: missionPurpose,
        discoverySessionId: analysis.discoverySessionId,
        discoverySessionHash: analysis.discoverySessionHash,
      })

  const nonMissionObservations = analysis.observations.filter(
    (observation) => observation.type !== "mission",
  )

  const observations = [
    missionObservation,
    ...nonMissionObservations.slice(0, 20),
  ]

  const sessionResult = (await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { observations, timestamp },
  })) as { status: string; session?: unknown; error?: string }

  if (sessionResult.status !== "ok") {
    throw new Error(`Mission Studio session failed: ${JSON.stringify(sessionResult)}`)
  }

  const missionProposals = (await ctx.api.missionStudioOperation({
    operation: "proposeMissions",
    params: { observations, timestamp },
  })) as { status: string; proposals?: unknown[]; error?: string }

  const expeditionProposals = (await ctx.api.missionStudioOperation({
    operation: "proposeExpeditions",
    params: { observations, timestamp },
  })) as { status: string; proposals?: unknown[]; error?: string }

  const firstExpeditionSubject = "Brownfield Baseline Discovery"
  const firstExpeditionGoal =
    "Produce architecture, dependency, documentation, and capability inventories, plus a baseline snapshot and uncertainty report."

  return {
    missionSubject,
    missionPurpose,
    firstExpeditionSubject,
    firstExpeditionGoal,
    missionProposals: missionProposals.status === "ok" ? missionProposals.proposals || [] : [],
    expeditionProposals: expeditionProposals.status === "ok" ? expeditionProposals.proposals || [] : [],
  }
}

async function initSynthProject(
  targetDir: string,
  projectName: string,
  agentContext?: import("./bootstrap-context.js").AgentContext,
) {
  const root = sdk.workspace.root(targetDir)
  const governanceVersion = "2.1"
  await sdk.files.ensureDirectory(sdk.paths.synthDir(root))
  await sdk.files.ensureDirectory(sdk.paths.dataDir(root))

  const version = "2.0.0" // bootstrap does not need to read package.json; manifest will be regenerated on init
  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version,
    governanceVersion,
    projectName,
    root: targetDir,
    generatedAt: new Date().toISOString(),
    bootstrapped: true,
    commands: [
      { name: "version", description: "Print the installed Synth version" },
      { name: "init", description: "Initialize the current directory as a Synth project" },
      { name: "bootstrap", description: "Transform this repository into a Synth project" },
      { name: "govern", description: "Run the full governance pipeline" },
      { name: "status", description: "Report the current project state" },
      { name: "mission", description: "Mission Studio operations" },
      { name: "expedition", description: "Planning operations" },
      { name: "docs", description: "Documentation operations" },
      { name: "explain", description: "Explain operations" },
    ],
    capabilities: [
      "repository", "github", "tdd", "bdd", "conversation", "document",
      "filesystem", "specification", "knowledge-extraction", "confidence",
      "dependency", "architecture", "mission-builder", "expedition-builder",
      "objective-builder", "wizard",
    ],
    layout: {
      docs: "docs/",
      generatedDocs: "docs/generated/",
      examples: "examples/",
      data: ".synth/data/",
      proof: "proof/",
      src: "src/",
      tests: "tests/",
      scripts: "scripts/",
      website: "website/",
    },
    publicVocabulary: ["Mission", "Expedition", "Evidence", "Plan", "Event", "State", "Replay"],
    govern: "npm run govern",
    quickStart: "synth bootstrap --approve && npm run govern",
  }

  await sdk.json.writeJson(sdk.paths.manifestPath(root), manifest)

  // Record the initialization as a replayable governance event.
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: sdk.paths.eventLogFile(root),
      statePath: sdk.paths.stateFile(root),
      checkpointPath: sdk.paths.checkpointsFile(root),
    },
  })
  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) ctx.runtime.registerCapability(cap)
  }
  // EXP-IDENTITY-001: ensure every handleIntent call carries the CLI identity.
  injectIdentityContext(ctx.api)

  const currentState = await ctx.runtime.getState()
  if (currentState.lifecycle !== "initialized") {
    const initResult = await ctx.api.handleIntent({
      actor: "synth-bootstrap",
      capability: "InitializeProject",
      payload: {
        projectId: sdk.identity.uuid(),
        name: projectName,
        governanceVersion,
      },
    })
    if (initResult.status !== "ok") {
      throw new Error(`Project initialization failed: ${initResult.error || JSON.stringify(initResult)}`)
    }
  }

  const finalState = await ctx.runtime.getState()
  await writeAgentArtifacts(sdk.paths.synthDir(root), projectName, finalState, manifest)

  await writeDefaultCapabilityValidationMap(targetDir)

  // Write the Agent Context Contract last so it takes precedence over the
  // generic runtime orientation context.json.
  if (agentContext) {
    await sdk.json.writeJson(path.join(sdk.paths.synthDir(root), "context.json"), agentContext)
  }
}

async function writeDefaultCapabilityValidationMap(targetDir: string) {
  const referenceDir = path.join(targetDir, "docs", "reference")
  await sdk.files.ensureDirectory(referenceDir)

  const packageJsonPath = path.join(targetDir, "package.json")
  let packageJson: Record<string, any> = {}
  let hasPackageJson = false
  try {
    packageJson = await sdk.json.readJson(packageJsonPath)
    hasPackageJson = true
  } catch {
    // No package.json; write the map anyway so synth validate can run.
  }

  // Choose a validation script that exists or can be safely added.
  const scripts = packageJson.scripts || {}
  // Always point the capability validation map at the "govern" script so that
  // `synth validate --full` and `npm run govern` follow the same path.
  const validationScript = "govern"

  if (hasPackageJson && !scripts.govern) {
    // Build a project-specific govern script from existing npm scripts.
    // Avoid synth/validate/npm-run-govern to prevent recursion through the
    // governance delegation guard (see src/cli/govern-delegation.ts).
    const parts: string[] = []
    if (scripts.build) parts.push("npm run build")
    if (scripts.test) parts.push("npm test")
    if (scripts["docs:check-links"]) parts.push("npm run docs:check-links")
    if (scripts.proof) parts.push("npm run proof")

    if (parts.length > 0) {
      scripts.govern = parts.join(" && ")
    } else {
      // No project validation scripts exist yet. Provide an informative no-op
      // that tells the operator how to wire a real pipeline.
      scripts.govern = "echo 'SYNTH governance pipeline not configured. Add build, test, docs:check-links, or proof scripts to package.json and update this govern script.'"
    }
    packageJson.scripts = scripts
    await sdk.json.writeJson(packageJsonPath, packageJson)
  }

  const map = {
    schema: "synth-capability-validation-map-v1",
    description: "Default capability validation map generated by synth bootstrap.",
    lintScope: ["src/"],
    typecheckScope: ["src/"],
    capabilities: {
      ProjectConfig: {
        unitTests: [],
        integrationTests: [],
        benchmarks: [],
        proofs: [validationScript],
        lintScope: ["package.json", ".synth/ai/"],
        typecheckScope: [],
        governanceClass: "tests",
      },
    },
  }

  await sdk.json.writeJson(path.join(referenceDir, "capability-validation-map.json"), map)
}

async function generateDocs(targetDir: string) {
  const originalCwd = process.cwd()
  process.chdir(targetDir)
  try {
    const ctx = await bootstrap({
      skipGenesis: true,
      infra: { persistence: "memory" },
    })
    const result = await ctx.api.documentationOperation({
      operation: "generateDocs",
      params: { knowledgeBaseDir: "./docs", outDir: "./docs/generated" },
    })
    return result
  } finally {
    process.chdir(originalCwd)
  }
}

async function scaffoldWebsite(targetDir: string, projectName: string) {
  const websiteDir = path.join(targetDir, "website")
  await sdk.files.ensureDirectory(websiteDir)

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <h1>${projectName}</h1>
  <p>Governed by Synth.</p>
</body>
</html>
`

  await sdk.files.writeFile(path.join(websiteDir, "index.html"), indexHtml)
  await sdk.files.writeFile(path.join(websiteDir, "README.md"), `# ${projectName} Website\n\nStatic website generated by Synth bootstrap.\n`)
}

async function scaffoldExample(targetDir: string, projectName: string) {
  const examplesDir = path.join(targetDir, "examples")
  await sdk.files.ensureDirectory(examplesDir)
  const exampleDir = path.join(examplesDir, "bootstrap-generated")
  await sdk.files.ensureDirectory(exampleDir)

  await sdk.files.writeFile(
    path.join(exampleDir, "README.md"),
    `# ${projectName} Example\n\nGenerated by Synth bootstrap.\n`,
  )
}

async function runGovern(targetDir: string): Promise<{ success: boolean; output: string }> {
  const verdict = checkGovernDelegation(targetDir)
  if (!verdict.allowed) return { success: false, output: verdict.message }
  const result = await sdk.process.spawn(npmCommand(), ["run", "govern"], {
    cwd: targetDir,
    env: verdict.childEnv,
  })
  return { success: result.status === 0, output: result.stdout + result.stderr }
}

export async function runBootstrap(targetDir: string, options: BootstrapOptions) {
  const resolvedDir = path.resolve(targetDir)
  const projectName = options.projectName || path.basename(resolvedDir)
  const { stages, run } = createStageRunner(options.streamStages)

  const analysis = await run("analyze", "Inspect repository structure and history", () =>
    analyzeRepository(resolvedDir)
  )

  const proposals = await run("propose", "Generate mission and expedition proposals", () =>
    generateProposals(analysis)
  )

  if (options.dryRun || !options.approve) {
    return {
      status: "pending-approval",
      kind: "BootstrapPlan",
      targetDir: resolvedDir,
      projectName,
      repositoryType: analysis.repositoryType,
      sourceHistory: analysis.sourceHistory,
      analysis: {
        languages: analysis.languages,
        frameworks: analysis.frameworks,
        hasTests: analysis.hasTests,
        fileCount: analysis.fileCount,
        observationCount: analysis.observations.length,
      },
      proposals,
      agentContext: analysis.agentContext,
      stages,
      nextSteps: ["Review the proposals", "Run 'synth bootstrap --approve' to apply"],
    }
  }

  // Apply phase
  await run("init", "Create .synth/ manifest and data directory", () =>
    initSynthProject(resolvedDir, projectName, analysis.agentContext)
  )

  // Generate docs only if docs directory exists; otherwise this is a fresh project.
  const docsDir = path.join(resolvedDir, "docs")
  if (await sdk.files.exists(docsDir)) {
    await run("docs", "Generate initial documentation", () => generateDocs(resolvedDir))
  } else {
    stages.push({ stage: "docs", status: "skipped", description: "No docs/ directory present" })
  }

  if (options.withWebsite) {
    await run("website", "Scaffold static website", () => scaffoldWebsite(resolvedDir, projectName))
  } else {
    stages.push({ stage: "website", status: "skipped", description: "--with-website not requested" })
  }

  if (options.withExample) {
    await run("example", "Scaffold example directory", () => scaffoldExample(resolvedDir, projectName))
  } else {
    stages.push({ stage: "example", status: "skipped", description: "--with-example not requested" })
  }

  // Only run govern if the project already has package.json with govern script.
  const packageJsonPath = path.join(resolvedDir, "package.json")
  let governResult = {
    success: true,
    output: governDelegationMessage("missing-package-json"),
  }
  if (await sdk.files.exists(packageJsonPath)) {
    const packageJson = await sdk.json.readJson<Record<string, any>>(packageJsonPath)
    if (packageJson.scripts?.govern) {
      governResult = await run("govern", "Run full governance pipeline", () => runGovern(resolvedDir))
    } else {
      stages.push({ stage: "govern", status: "skipped", description: "No govern script in package.json" })
      governResult = {
        success: true,
        output: governDelegationMessage("missing-govern-script"),
      }
    }
  } else {
    stages.push({ stage: "govern", status: "skipped", description: "No package.json present" })
  }

  const nextSteps = governResult.success
    ? ["synth status", "synth mission create --subject '...' --purpose '...'"]
    : ["Review the govern output above", "Fix the reported issue", "Run 'synth bootstrap --approve' again"]

  return {
    status: governResult.success ? "ok" : "error",
    kind: "BootstrapResult",
    targetDir: resolvedDir,
    projectName,
    repositoryType: analysis.repositoryType,
    applied: {
      manifest: true,
      docs: await sdk.files.exists(docsDir),
      website: options.withWebsite,
      example: options.withExample,
      govern: governResult.success,
    },
    governOutput: governResult.output,
    stages,
    nextSteps,
  }
}
