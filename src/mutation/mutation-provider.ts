// ============================================================
// MUTATION: Provider Contract
// ============================================================
// A mutation provider performs side-effecting mutations outside the
// canonical event store (filesystem, repository, deployment, etc.).
// All mutation requests are authorized by ExecutionGate before a
// provider is invoked.
// ============================================================

import type { MutationRequest, MutationResult } from "../types/index.js"

export interface MutationProvider {
  readonly namespace: string
  mutate(request: MutationRequest): Promise<MutationResult>
}

export class MutationProviderRegistry {
  private providers = new Map<string, MutationProvider>()

  register(provider: MutationProvider): void {
    this.providers.set(provider.namespace, provider)
  }

  resolve(namespace: string): MutationProvider | undefined {
    return this.providers.get(namespace)
  }
}
