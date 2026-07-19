// ============================================================
// BOOTSTRAP: Apply Phase
// ============================================================
// Generates proposals from repository analysis and, if approved,
// applies SYNTH configuration to the target directory.
// ============================================================

import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import { spawn } from "child_process"
import { bootstrap } from "../core/bootstrap.js"
import { analyzeRepository } from "./bootstrap-analyzer.js"
import { checkGovernDelegation } from "./govern-delegation.js"
import { writeAgentArtifacts } from "./agent-artifacts.js"
import { generateAgentContext } from "./bootstrap-context.js"

export type BootstrapOptions = {
  approve: boolean
  dryRun: boolean
  withWebsite: boolean
  withExample: boolean
  projectName?: string
}

function makeObservation(type: string, subject: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "synth-bootstrap",
    type,
    payload: { subject, name: subject, ...overrides },
    evidenceReference: `evidence-${type}-${subject}`,
    confidence: "high",
    timestamp: Date.now(),
  }
}

async function generateProposals(analysis: Awaited<ReturnType<typeof analyzeRepository>>) {
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
    : makeObservation("mission", missionSubject, {
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
    params: { observations },
  })) as { status: string; session?: unknown; error?: string }

  if (sessionResult.status !== "ok") {
    throw new Error(`Mission Studio session failed: ${JSON.stringify(sessionResult)}`)
  }

  const missionProposals = (await ctx.api.missionStudioOperation({
    operation: "proposeMissions",
    params: { observations },
  })) as { status: string; proposals?: unknown[]; error?: string }

  const expeditionProposals = (await ctx.api.missionStudioOperation({
    operation: "proposeExpeditions",
    params: { observations },
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
  const synthDir = path.join(targetDir, ".synth")
  const dataDir = path.join(targetDir, ".synth", "data")
  const governanceVersion = "2.1"
  await fs.mkdir(synthDir, { recursive: true })
  await fs.mkdir(dataDir, { recursive: true })

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

  await fs.writeFile(path.join(synthDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8")

  // Record the initialization as a replayable governance event.
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
      checkpointPath: path.join(dataDir, "checkpoints.json"),
    },
  })
  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) ctx.runtime.registerCapability(cap)
  }

  const currentState = await ctx.runtime.getState()
  if (currentState.lifecycle !== "initialized") {
    const initResult = await ctx.api.handleIntent({
      actor: "synth-bootstrap",
      capability: "InitializeProject",
      payload: {
        projectId: crypto.randomUUID(),
        name: projectName,
        governanceVersion,
      },
    })
    if (initResult.status !== "ok") {
      throw new Error(`Project initialization failed: ${initResult.error || JSON.stringify(initResult)}`)
    }
  }

  await writeAgentArtifacts(synthDir, projectName)

  // Write the Agent Context Contract last so it takes precedence over the
  // generic runtime orientation context.json.
  if (agentContext) {
    await fs.writeFile(
      path.join(synthDir, "context.json"),
      JSON.stringify(agentContext, null, 2),
      "utf-8",
    )
  }
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
  await fs.mkdir(websiteDir, { recursive: true })

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

  await fs.writeFile(path.join(websiteDir, "index.html"), indexHtml, "utf-8")
  await fs.writeFile(path.join(websiteDir, "README.md"), `# ${projectName} Website\n\nStatic website generated by Synth bootstrap.\n`, "utf-8")
}

async function scaffoldExample(targetDir: string, projectName: string) {
  const examplesDir = path.join(targetDir, "examples")
  await fs.mkdir(examplesDir, { recursive: true })
  const exampleDir = path.join(examplesDir, "bootstrap-generated")
  await fs.mkdir(exampleDir, { recursive: true })

  await fs.writeFile(
    path.join(exampleDir, "README.md"),
    `# ${projectName} Example\n\nGenerated by Synth bootstrap.\n`,
    "utf-8",
  )
}

async function runGovern(targetDir: string): Promise<{ success: boolean; output: string }> {
  const verdict = checkGovernDelegation(targetDir)
  if (!verdict.allowed) return { success: false, output: verdict.message }
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", "govern"], {
      cwd: targetDir,
      stdio: "pipe",
      shell: true,
      env: verdict.childEnv,
    })

    let output = ""
    child.stdout?.on("data", (data) => { output += data })
    child.stderr?.on("data", (data) => { output += data })

    child.on("close", (code) => {
      resolve({ success: code === 0, output })
    })
  })
}

export async function runBootstrap(targetDir: string, options: BootstrapOptions) {
  const resolvedDir = path.resolve(targetDir)
  const projectName = options.projectName || path.basename(resolvedDir)

  const analysis = await analyzeRepository(resolvedDir)
  const proposals = await generateProposals(analysis)

  if (options.dryRun || !options.approve) {
    return {
      status: "pending-approval",
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
      nextSteps: ["Review the proposals", "Run 'synth bootstrap --approve' to apply"],
    }
  }

  // Apply phase
  await initSynthProject(resolvedDir, projectName, analysis.agentContext)

  // Generate docs only if docs directory exists; otherwise this is a fresh project.
  const docsDir = path.join(resolvedDir, "docs")
  try {
    await fs.access(docsDir)
    await generateDocs(resolvedDir)
  } catch {
    // no docs directory; skip generation
  }

  if (options.withWebsite) {
    await scaffoldWebsite(resolvedDir, projectName)
  }

  if (options.withExample) {
    await scaffoldExample(resolvedDir, projectName)
  }

  // Only run govern if the project already has package.json with govern script.
  const packageJsonPath = path.join(resolvedDir, "package.json")
  let governResult = {
    success: true,
    output: [
      "No package.json found; govern skipped.",
      "To enable governance, add a package.json with a \"govern\" script running the project's own validation (e.g. \"govern\": \"npm test\").",
      "Do not point \"govern\" at \"synth govern\", \"synth validate\", or \"npm run govern\" — they delegate back to \"npm run govern\" and would recurse.",
    ].join(" "),
  }
  try {
    await fs.access(packageJsonPath)
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"))
    if (packageJson.scripts?.govern) {
      governResult = await runGovern(resolvedDir)
    }
  } catch {
    // no package.json
  }

  return {
    status: governResult.success ? "ok" : "error",
    targetDir: resolvedDir,
    projectName,
    repositoryType: analysis.repositoryType,
    applied: {
      manifest: true,
      docs: true,
      website: options.withWebsite,
      example: options.withExample,
      govern: governResult.success,
    },
    governOutput: governResult.output,
  }
}
