// ============================================================
// CLI: Adapter Management
// ============================================================
// Usage: node dist/cli/adapter.js <command> [adapter] [args...]
//
// Examples:
//   node dist/cli/adapter.js enable repository
//   node dist/cli/adapter.js disable repository
//   node dist/cli/adapter.js status repository
//   node dist/cli/adapter.js health repository
//   node dist/cli/adapter.js configure repository path=. remote=origin defaultBranch=main promotionMode=direct
//   node dist/cli/adapter.js create-branch feature/test
//   node dist/cli/adapter.js commit "message"
//   node dist/cli/adapter.js promote feature/test
// ============================================================

import { createAdapterRegistry } from "../mission-studio/adapter-registry.js"
import { printJson, printError } from "./print.js"

function parseConfigArgs(args: string[]): Record<string, string> {
  const config: Record<string, string> = {}
  for (const arg of args) {
    const [key, value] = arg.split("=")
    if (key && value !== undefined) config[key] = value
  }
  return config
}

async function main() {
  const [command, adapterName, ...rest] = process.argv.slice(2)

  if (!command) {
    printError("Usage: adapter <command> [adapter] [args...]")
  }

  const registry = createAdapterRegistry()

  switch (command) {
    case "list": {
      printJson({ status: "ok", kind: "AdapterList", adapters: registry.list() })
      break
    }

    case "info": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      printJson({
        status: "ok",
        kind: "AdapterInfo",
        name,
        metadata: adapter.metadata,
        state: adapter.state,
        health: adapter.health,
      })
      break
    }

    case "enable": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      const state = await adapter.enable()
      printJson({ status: "ok", kind: "AdapterEnabled", name, state })
      break
    }

    case "disable": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      const state = await adapter.disable()
      printJson({ status: "ok", kind: "AdapterDisabled", name, state })
      break
    }

    case "configure": {
      const name = adapterName || "repository"
      const config = parseConfigArgs(rest)
      const adapter = registry.create(name)
      await adapter.configure({
        path: config.path || process.cwd(),
        remote: config.remote || "origin",
        defaultBranch: config.defaultBranch || "main",
        promotionBranch: config.promotionBranch,
        promotionMode: (config.promotionMode as any) || "direct",
        username: config.username,
        email: config.email,
        signingKey: config.signingKey,
      })
      const state = await adapter.validate()
      printJson({ status: "ok", kind: "AdapterConfigured", name, state })
      break
    }

    case "status": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      await adapter.enable()
      const status = await (adapter as any).status()
      printJson(status)
      break
    }

    case "health": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      await adapter.enable()
      const health = await (adapter as any).health()
      printJson(health)
      break
    }

    case "init":
    case "initialize": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      await adapter.configure({
        path: process.cwd(),
        remote: "origin",
        defaultBranch: "main",
        promotionMode: "direct",
      })
      const state = await (adapter as any).initialize()
      printJson({ status: "ok", kind: "AdapterInitialized", name, state })
      break
    }

    case "create-branch": {
      const branchName = adapterName
      if (!branchName) {
        printError("Branch name required")
      }
      const adapter = registry.create("repository")
      await adapter.enable()
      const state = await (adapter as any).createBranch(branchName)
      printJson({ status: "ok", kind: "BranchCreated", branchName, state })
      break
    }

    case "checkout": {
      const branchName = adapterName
      if (!branchName) {
        printError("Branch name required")
      }
      const adapter = registry.create("repository")
      await adapter.enable()
      const state = await (adapter as any).checkout(branchName)
      printJson({ status: "ok", kind: "BranchCheckedOut", branchName, state })
      break
    }

    case "commit": {
      const message = adapterName
      if (!message) {
        printError("Commit message required")
      }
      const adapter = registry.create("repository")
      await adapter.enable()
      const state = await (adapter as any).commit(message)
      printJson({ status: "ok", kind: "CommitCreated", message, state })
      break
    }

    case "promote": {
      const branchName = adapterName
      if (!branchName) {
        printError("Branch name required")
      }
      const adapter = registry.create("repository")
      await adapter.enable()
      const result = await (adapter as any).promote(branchName)
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "install-hooks": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      await adapter.enable()
      const state = await (adapter as any).installHooks()
      printJson({ status: "ok", kind: "HooksInstalled", name, state })
      break
    }

    case "github-create-issue": {
      const title = adapterName
      const body = rest.join(" ")
      if (!title) {
        printError("Issue title required")
      }
      const adapter = registry.create("github") as any
      await adapter.enable()
      const result = await adapter.createIssue(title, body)
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "github-create-pr": {
      const [title, head, base, ...bodyParts] = [adapterName, ...rest]
      if (!title || !head || !base) {
        printError("Usage: github-create-pr <title> <head> <base> [body]")
      }
      const adapter = registry.create("github") as any
      await adapter.enable()
      const result = await adapter.createPullRequest(title, head, base, bodyParts.join(" "))
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "github-merge-pr": {
      const number = parseInt(adapterName || "", 10)
      if (isNaN(number)) {
        printError("Pull request number required")
      }
      const adapter = registry.create("github") as any
      await adapter.enable()
      const result = await adapter.mergePullRequest(number)
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "tdd-generate-test": {
      const [requirement, targetModule, functionName] = [adapterName, ...rest]
      if (!requirement || !targetModule || !functionName) {
        printError("Usage: tdd-generate-test <requirement> <target-module> <function-name>")
      }
      const adapter = registry.create("tdd") as any
      await adapter.enable()
      const result = await adapter.generateTest(requirement, targetModule, functionName)
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "tdd-verify-failure": {
      const adapter = registry.create("tdd") as any
      await adapter.enable()
      const result = await adapter.verifyFailure()
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "tdd-verify-implementation": {
      const adapter = registry.create("tdd") as any
      await adapter.enable()
      const result = await adapter.verifyImplementation()
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "tdd-evidence": {
      const requirement = adapterName
      if (!requirement) {
        printError("Requirement description required")
      }
      const adapter = registry.create("tdd") as any
      await adapter.enable()
      const result = await adapter.generateEvidence(requirement)
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "bdd-create-feature": {
      const [missionId, name, ...descParts] = [adapterName, ...rest]
      if (!name) {
        printError("Usage: bdd-create-feature <mission-id> <name> [description]")
      }
      const adapter = registry.create("bdd") as any
      await adapter.enable()
      const result = await adapter.createFeature(missionId || undefined, name, descParts.join(" "))
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "bdd-create-scenario": {
      const [featureId, name, ...restArgs] = [adapterName, ...rest]
      if (!featureId || !name) {
        printError("Usage: bdd-create-scenario <feature-id> <name>")
      }
      const adapter = registry.create("bdd") as any
      await adapter.enable()
      const result = await adapter.createScenario(featureId, name, ["precondition"], "action", ["expected outcome"])
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "bdd-generate-tests": {
      const adapter = registry.create("bdd") as any
      await adapter.enable()
      const result = await adapter.generateAcceptanceTests(adapterName)
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "bdd-verify": {
      const adapter = registry.create("bdd") as any
      await adapter.enable()
      const result = await adapter.verifyBehavior(adapterName)
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    case "bdd-evidence": {
      const adapter = registry.create("bdd") as any
      await adapter.enable()
      const result = await adapter.generateBehaviorEvidence()
      printJson(result)
      process.exit(result.success ? 0 : 1)
      break
    }

    default: {
      printError(`Unknown command: ${command}`)
    }
  }
}

main().catch((err) => {
  printError(`FATAL: ${err.message}`)
})
