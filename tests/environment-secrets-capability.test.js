// ============================================================
// SECRETS & IDENTITY CAPABILITY TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { hostname } from "node:os"
import { createEnvVarProvider } from "../dist/environment/index.js"

test("EnvVarProvider retrieves secrets by name", async () => {
  const provider = createEnvVarProvider({ GITHUB_TOKEN: "secret-value-123" })
  assert.strictEqual(await provider.getSecret("GITHUB_TOKEN"), "secret-value-123")
})

test("EnvVarProvider returns undefined for missing secrets", async () => {
  const provider = createEnvVarProvider({})
  assert.strictEqual(await provider.getSecret("MISSING"), undefined)
  assert.strictEqual(await provider.hasSecret("MISSING"), false)
})

test("EnvVarProvider checks secret existence", async () => {
  const provider = createEnvVarProvider({ NPM_TOKEN: "x" })
  assert.strictEqual(await provider.hasSecret("NPM_TOKEN"), true)
})

test("EnvVarProvider lists secret names only, never values", async () => {
  const provider = createEnvVarProvider({
    GITHUB_TOKEN: "ghp_abc",
    AWS_SECRET_ACCESS_KEY: "aws-secret",
    DB_PASSWORD: "hunter2",
    API_KEY: "key-1",
    MY_CREDENTIAL: "cred",
    PATH: "/usr/bin",
    HOME: "/home/user",
    EDITOR: "vim",
  })
  const names = await provider.listSecretNames()
  assert.deepStrictEqual(names, [
    "API_KEY",
    "AWS_SECRET_ACCESS_KEY",
    "DB_PASSWORD",
    "GITHUB_TOKEN",
    "MY_CREDENTIAL",
  ])
  // No value may leak through the listing
  for (const value of ["ghp_abc", "aws-secret", "hunter2", "key-1", "cred"]) {
    assert.ok(!names.includes(value), `secret value leaked: ${value}`)
  }
})

test("EnvVarProvider resolves identity from git author variables", async () => {
  const provider = createEnvVarProvider({
    GIT_AUTHOR_NAME: "Ada Lovelace",
    GIT_AUTHOR_EMAIL: "ada@example.com",
  })
  const identity = await provider.getIdentity()
  assert.strictEqual(identity.user, "Ada Lovelace")
  assert.strictEqual(identity.email, "ada@example.com")
  assert.strictEqual(identity.hostname, hostname())
  assert.strictEqual(identity.ci, false)
})

test("EnvVarProvider falls back to USER and GITHUB_ACTOR", async () => {
  const viaUser = createEnvVarProvider({ USER: "dev" })
  assert.strictEqual((await viaUser.getIdentity()).user, "dev")

  const viaActor = createEnvVarProvider({ GITHUB_ACTOR: "ci-bot", USER: "dev" })
  assert.strictEqual((await viaActor.getIdentity()).user, "ci-bot")

  const viaUsername = createEnvVarProvider({ USERNAME: "win-dev" })
  assert.strictEqual((await viaUsername.getIdentity()).user, "win-dev")
})

test("EnvVarProvider prefers git author over fallbacks", async () => {
  const provider = createEnvVarProvider({
    GIT_AUTHOR_NAME: "Ada",
    GITHUB_ACTOR: "ci-bot",
    USER: "dev",
  })
  assert.strictEqual((await provider.getIdentity()).user, "Ada")
})

test("EnvVarProvider detects CI environments", async () => {
  const ci = createEnvVarProvider({ CI: "true" })
  assert.strictEqual((await ci.getIdentity()).ci, true)

  const gha = createEnvVarProvider({ GITHUB_ACTIONS: "true" })
  assert.strictEqual((await gha.getIdentity()).ci, true)

  const local = createEnvVarProvider({ CI: "false" })
  assert.strictEqual((await local.getIdentity()).ci, false)
})

test("EnvVarProvider handles empty identity environments", async () => {
  const provider = createEnvVarProvider({})
  const identity = await provider.getIdentity()
  assert.strictEqual(identity.user, undefined)
  assert.strictEqual(identity.email, undefined)
  assert.strictEqual(identity.ci, false)
  assert.strictEqual(typeof identity.hostname, "string")
})

test("EnvVarProvider satisfies both capability interfaces", () => {
  const provider = createEnvVarProvider({})
  assert.strictEqual(provider.name, "env-var")
  assert.strictEqual(typeof provider.getSecret, "function")
  assert.strictEqual(typeof provider.hasSecret, "function")
  assert.strictEqual(typeof provider.listSecretNames, "function")
  assert.strictEqual(typeof provider.getIdentity, "function")
})
