// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import path from "path"
import { writeAgentArtifacts } from "./agent-artifacts.js"
import { createInitializationEngine } from "../initialization/engine.js"
import { createInitializationEvidenceStore } from "../initialization/evidence-store.js"
import { createFilesystemInitializationAdapter } from "../adapters/filesystem-initialization-adapter.js"
import { createDefaultAdapterCatalog } from "../adapters/adapter-catalog.js"
import { detectRecommendedAdapters } from "./detect-adapters.js"
import { createPosixFilesystemProvider, FILESYSTEM_WRITE_TOKEN } from "../infra/filesystem-provider.js"
import { printJson, printError } from "./print.js"
import { COMMANDS, PUBLIC_VOCABULARY } from "./usage.js"
import * as sdk from "../sdk/index.js"
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"
import { getVersion } from "./command-help.js"


export const DEFAULT_PROJECT_NAME = "Synth Project"


export async function cmdInit(args: string[], flags: Record<string, string | boolean>) {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const projectName = typeof flags.name === "string" ? flags.name : path.basename(targetDir)
  const synthDir = sdk.paths.synthDir(targetDir)
  const dataDir = sdk.paths.dataDir(targetDir)
  const governanceVersion = "2.1"
  const projectId = sdk.identity.uuid()

  const sourceType = typeof flags.source === "string" ? flags.source : "filesystem"
  const sourceLocation = typeof flags["source-location"] === "string" ? flags["source-location"] : targetDir
  const declaredIntent = typeof flags["declared-intent"] === "string" ? flags["declared-intent"] : undefined

  const explicitAdapters =
    typeof flags.adapters === "string" && flags.adapters.length > 0
      ? flags.adapters.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined
  const excludedAdapters =
    typeof flags["without-adapters"] === "string" && flags["without-adapters"].length > 0
      ? flags["without-adapters"].split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

  await sdk.files.ensureDirectory(synthDir)
  await sdk.files.ensureDirectory(dataDir)

  const adapterCatalog = createDefaultAdapterCatalog()
  const capabilities = adapterCatalog.list()

  const adapterSelection = await detectRecommendedAdapters({
    targetDir,
    explicitAdapters,
    excludedAdapters,
  })

  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: await getVersion(),
    governanceVersion,
    projectName,
    root: targetDir,
    generatedAt: new Date().toISOString(),
    commands: COMMANDS.map((c) => ({ name: c.name, description: c.description })),
    capabilities,
    adapters: {
      selected: adapterSelection.selected,
      config: adapterSelection.config,
      diagnostics: adapterSelection.diagnostics,
    },
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
    publicVocabulary: PUBLIC_VOCABULARY,
    govern: "npm run govern",
    quickStart: "synth init && synth docs generate && npm run govern",
  }

  await sdk.json.writeJson(sdk.paths.manifestPath(targetDir), manifest)

  // Bootstrap a file-backed runtime in the target directory so the
  // initialization itself is recorded as a replayable governance event.
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: sdk.paths.eventLogFile(targetDir),
      statePath: sdk.paths.stateFile(targetDir),
      checkpointPath: sdk.paths.checkpointsFile(targetDir),
    },
  })

  // Idempotency: if the project is already initialized, do not emit a
  // duplicate PROJECT_INITIALIZED event.
  const currentState = await ctx.runtime.getState()
  if (currentState.lifecycle !== "initialized") {
    // Resolve an initialization adapter, collect evidence, and build a
    // governed ProjectModel before recording the transition.
    const engine = createInitializationEngine({
      adapters: [createFilesystemInitializationAdapter(targetDir)],
    })

    const initResult = await engine.initialize({
      projectId,
      projectName,
      sourceType: sourceType as import("../adapters/initialization-adapter.js").SourceType,
      sourceLocation,
      declaredIntent,
    })

    if (!initResult.success) {
      printError(`Initialization failed: ${initResult.errors?.join(", ") || "unknown error"}`)
    }

    const evidenceStore = createInitializationEvidenceStore(createPosixFilesystemProvider(targetDir, FILESYSTEM_WRITE_TOKEN))
    const evidenceReference = await evidenceStore.persist(
      projectId,
      projectName,
      initResult.evidence,
      initResult.model,
    )

    const handleResult = await ctx.api.handleIntent({
      actor: "synth-cli",
      capability: "InitializeProject",
      payload: {
        projectId,
        name: projectName,
        governanceVersion,
        sourceType,
        sourceLocation,
        declaredIntent,
        adapterId: initResult.evidence.adapterId,
        adapterVersion: initResult.evidence.adapterVersion,
        evidenceReference,
        projectModel: initResult.model,
      },
    })

    if (handleResult.status !== "ok") {
      printError(`Project initialization failed: ${handleResult.error || JSON.stringify(handleResult)}`)
    }
  }

  const finalState = await ctx.runtime.getState()
  await writeAgentArtifacts(synthDir, projectName, finalState, manifest)

  printJson({
    status: "ok",
    message: "Synth project initialized",
    manifestPath: sdk.paths.manifestPath(targetDir),
    projectName,
    governanceVersion,
    lifecycle: "initialized",
    nextSteps: [
      "synth docs generate",
      "synth mission create --subject '...' --purpose '...'",
      "synth mission approve --draft-id <draft-id>",
      "npm run govern",
    ],
  })
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdInit(positional.slice(1), flags)
}
