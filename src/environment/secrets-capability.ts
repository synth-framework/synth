// ============================================================
// ENVIRONMENT: Secrets & Identity Capability
// ============================================================
// Secrets and Identity capability provider interfaces and
// environment-variable reference implementation.
//
// Non-Disclosure Rule (ADR-014): secret values are never
// listed, logged, or included in evidence. Only names are
// discoverable; values are retrieved individually at the
// point of use.
// ============================================================

import { hostname } from "node:os"

/** Secrets capability provider interface */
export interface SecretsProvider {
  readonly name: string
  readonly version: string
  getSecret(name: string): Promise<string | undefined>
  hasSecret(name: string): Promise<boolean>
  listSecretNames(): Promise<string[]>
}

/** Identity context of the current environment */
export interface IdentityInfo {
  readonly user?: string
  readonly email?: string
  readonly hostname?: string
  readonly ci: boolean
}

/** Identity capability provider interface */
export interface IdentityProvider {
  readonly name: string
  readonly version: string
  getIdentity(): Promise<IdentityInfo>
}

/** Environment map type (subset of process.env semantics) */
export type EnvMap = Record<string, string | undefined>

/**
 * Naming heuristic for secret discovery over variable NAMES ONLY.
 * Values are never inspected or exposed by listSecretNames().
 */
const SECRET_NAME_PATTERN = /(TOKEN|SECRET|KEY|PASSWORD|CREDENTIAL)/

/**
 * Environment-variable provider satisfying both Secrets and
 * Identity capabilities. The env map is injectable for testing.
 */
export class EnvVarProvider implements SecretsProvider, IdentityProvider {
  readonly name = "env-var"
  readonly version = "1.0.0"
  private readonly env: EnvMap

  constructor(env: EnvMap = process.env) {
    this.env = env
  }

  async getSecret(name: string): Promise<string | undefined> {
    return this.env[name]
  }

  async hasSecret(name: string): Promise<boolean> {
    return this.env[name] !== undefined
  }

  async listSecretNames(): Promise<string[]> {
    return Object.keys(this.env)
      .filter((key) => SECRET_NAME_PATTERN.test(key))
      .sort()
  }

  async getIdentity(): Promise<IdentityInfo> {
    const user = this.env.GIT_AUTHOR_NAME
      ?? this.env.GITHUB_ACTOR
      ?? this.env.USER
      ?? this.env.USERNAME
    const email = this.env.GIT_AUTHOR_EMAIL ?? this.env.EMAIL
    const ci = this.env.CI === "true" || this.env.GITHUB_ACTIONS === "true"
    return {
      user,
      email,
      hostname: hostname(),
      ci,
    }
  }
}

export function createEnvVarProvider(env?: EnvMap): EnvVarProvider {
  return new EnvVarProvider(env)
}
