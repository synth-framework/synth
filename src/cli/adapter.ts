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

import { createAdapterRegistry } from "../adapters/registry.js"

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
    console.log("Usage: adapter <command> [adapter] [args...]")
    process.exit(1)
  }

  const registry = createAdapterRegistry()

  switch (command) {
    case "list": {
      console.log("Available adapters:", registry.list().join(", "))
      break
    }

    case "enable": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      const state = await adapter.enable()
      console.log(`Adapter '${name}' enabled. State: ${state}`)
      break
    }

    case "disable": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      const state = await adapter.disable()
      console.log(`Adapter '${name}' disabled. State: ${state}`)
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
      console.log(`Adapter '${name}' configured. State: ${state}`)
      break
    }

    case "status": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      await adapter.enable()
      const status = await (adapter as any).status()
      console.log(JSON.stringify(status, null, 2))
      break
    }

    case "health": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      await adapter.enable()
      const health = await (adapter as any).health()
      console.log(JSON.stringify(health, null, 2))
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
      console.log(`Adapter '${name}' initialized. State: ${state}`)
      break
    }

    case "create-branch": {
      const branchName = adapterName
      if (!branchName) {
        console.error("Branch name required")
        process.exit(1)
      }
      const adapter = registry.create("repository")
      await adapter.enable()
      const state = await (adapter as any).createBranch(branchName)
      console.log(`Created branch '${branchName}'. State: ${state}`)
      break
    }

    case "checkout": {
      const branchName = adapterName
      if (!branchName) {
        console.error("Branch name required")
        process.exit(1)
      }
      const adapter = registry.create("repository")
      await adapter.enable()
      const state = await (adapter as any).checkout(branchName)
      console.log(`Checked out '${branchName}'. State: ${state}`)
      break
    }

    case "commit": {
      const message = adapterName
      if (!message) {
        console.error("Commit message required")
        process.exit(1)
      }
      const adapter = registry.create("repository")
      await adapter.enable()
      const state = await (adapter as any).commit(message)
      console.log(`Committed. State: ${state}`)
      break
    }

    case "promote": {
      const branchName = adapterName
      if (!branchName) {
        console.error("Branch name required")
        process.exit(1)
      }
      const adapter = registry.create("repository")
      await adapter.enable()
      const result = await (adapter as any).promote(branchName)
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "install-hooks": {
      const name = adapterName || "repository"
      const adapter = registry.create(name)
      await adapter.enable()
      const state = await (adapter as any).installHooks()
      console.log(`Hooks installed for '${name}'. State: ${state}`)
      break
    }

    case "github-create-issue": {
      const title = adapterName
      const body = rest.join(" ")
      if (!title) {
        console.error("Issue title required")
        process.exit(1)
      }
      const adapter = registry.create("github") as any
      await adapter.enable()
      const result = await adapter.createIssue(title, body)
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "github-create-pr": {
      const [title, head, base, ...bodyParts] = [adapterName, ...rest]
      if (!title || !head || !base) {
        console.error("Usage: github-create-pr <title> <head> <base> [body]")
        process.exit(1)
      }
      const adapter = registry.create("github") as any
      await adapter.enable()
      const result = await adapter.createPullRequest(title, head, base, bodyParts.join(" "))
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "github-merge-pr": {
      const number = parseInt(adapterName || "", 10)
      if (isNaN(number)) {
        console.error("Pull request number required")
        process.exit(1)
      }
      const adapter = registry.create("github") as any
      await adapter.enable()
      const result = await adapter.mergePullRequest(number)
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "tdd-generate-test": {
      const [requirement, targetModule, functionName] = [adapterName, ...rest]
      if (!requirement || !targetModule || !functionName) {
        console.error("Usage: tdd-generate-test <requirement> <target-module> <function-name>")
        process.exit(1)
      }
      const adapter = registry.create("tdd") as any
      await adapter.enable()
      const result = await adapter.generateTest(requirement, targetModule, functionName)
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "tdd-verify-failure": {
      const adapter = registry.create("tdd") as any
      await adapter.enable()
      const result = await adapter.verifyFailure()
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "tdd-verify-implementation": {
      const adapter = registry.create("tdd") as any
      await adapter.enable()
      const result = await adapter.verifyImplementation()
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "tdd-evidence": {
      const requirement = adapterName
      if (!requirement) {
        console.error("Requirement description required")
        process.exit(1)
      }
      const adapter = registry.create("tdd") as any
      await adapter.enable()
      const result = await adapter.generateEvidence(requirement)
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "bdd-create-feature": {
      const [missionId, name, ...descParts] = [adapterName, ...rest]
      if (!name) {
        console.error("Usage: bdd-create-feature <mission-id> <name> [description]")
        process.exit(1)
      }
      const adapter = registry.create("bdd") as any
      await adapter.enable()
      const result = await adapter.createFeature(missionId || undefined, name, descParts.join(" "))
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "bdd-create-scenario": {
      const [featureId, name, ...restArgs] = [adapterName, ...rest]
      if (!featureId || !name) {
        console.error("Usage: bdd-create-scenario <feature-id> <name>")
        process.exit(1)
      }
      const adapter = registry.create("bdd") as any
      await adapter.enable()
      const result = await adapter.createScenario(featureId, name, ["precondition"], "action", ["expected outcome"])
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "bdd-generate-tests": {
      const adapter = registry.create("bdd") as any
      await adapter.enable()
      const result = await adapter.generateAcceptanceTests(adapterName)
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "bdd-verify": {
      const adapter = registry.create("bdd") as any
      await adapter.enable()
      const result = await adapter.verifyBehavior(adapterName)
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    case "bdd-evidence": {
      const adapter = registry.create("bdd") as any
      await adapter.enable()
      const result = await adapter.generateBehaviorEvidence()
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
      break
    }

    default: {
      console.error(`Unknown command: ${command}`)
      process.exit(1)
    }
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message)
  process.exit(1)
})
