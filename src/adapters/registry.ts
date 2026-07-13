// ============================================================
// ADAPTER: Registry
// ============================================================
// Central registry for Synth adapters. Core code depends only on
// adapter interfaces, not on specific implementations.
// ============================================================

import type { Adapter } from "../types/index.js"
import { createGitRepositoryAdapter, GitRepositoryAdapter } from "./repository/git.js"
import { createGitHubAdapter, GitHubAdapterImpl } from "./github/adapter.js"
import { createTddAdapter, TddAdapterImpl } from "./tdd/adapter.js"
import { createBddAdapter, BddAdapterImpl } from "./bdd/adapter.js"
import { createConversationAdapter, ConversationAdapterImpl } from "./conversation/adapter.js"
import { createDocumentAdapter, DocumentAdapterImpl } from "./document/adapter.js"
import { createFilesystemAdapter, FilesystemAdapterImpl } from "./filesystem/adapter.js"
import { createSpecificationAdapter, SpecificationAdapterImpl } from "./specification/adapter.js"
import { createKnowledgeExtractionAdapter, KnowledgeExtractionAdapterImpl } from "./knowledge/adapter.js"
import { createConfidenceAdapter, ConfidenceAdapterImpl } from "./confidence/adapter.js"
import { createDependencyAdapter, DependencyAdapterImpl } from "./dependency/adapter.js"
import { createArchitectureAdapter, ArchitectureAdapterImpl } from "./architecture/adapter.js"
import { createMissionBuilderAdapter, MissionBuilderAdapterImpl } from "./mission-builder/adapter.js"
import { createExpeditionBuilderAdapter, ExpeditionBuilderAdapterImpl } from "./expedition-builder/adapter.js"
import { createObjectiveBuilderAdapter, ObjectiveBuilderAdapterImpl } from "./objective-builder/adapter.js"
import { createWizardAdapter, WizardAdapterImpl } from "./wizard/adapter.js"

export type AdapterConstructor = () => Adapter

export class AdapterRegistry {
  private adapters = new Map<string, Adapter>()
  private factories = new Map<string, AdapterConstructor>()

  constructor() {
    this.registerFactory("repository", () => createGitRepositoryAdapter())
    this.registerFactory("github", () => createGitHubAdapter())
    this.registerFactory("tdd", () => createTddAdapter())
    this.registerFactory("bdd", () => createBddAdapter())
    this.registerFactory("conversation", () => createConversationAdapter())
    this.registerFactory("document", () => createDocumentAdapter())
    this.registerFactory("filesystem", () => createFilesystemAdapter())
    this.registerFactory("specification", () => createSpecificationAdapter())
    this.registerFactory("knowledge-extraction", () => createKnowledgeExtractionAdapter())
    this.registerFactory("confidence", () => createConfidenceAdapter())
    this.registerFactory("dependency", () => createDependencyAdapter())
    this.registerFactory("architecture", () => createArchitectureAdapter())
    this.registerFactory("mission-builder", () => createMissionBuilderAdapter())
    this.registerFactory("expedition-builder", () => createExpeditionBuilderAdapter())
    this.registerFactory("objective-builder", () => createObjectiveBuilderAdapter())
    this.registerFactory("wizard", () => createWizardAdapter())
  }

  registerFactory(name: string, factory: AdapterConstructor): void {
    this.factories.set(name, factory)
  }

  create(name: string): Adapter {
    const factory = this.factories.get(name)
    if (!factory) throw new Error(`UNKNOWN_ADAPTER: ${name}`)
    const adapter = factory()
    this.adapters.set(name, adapter)
    return adapter
  }

  get(name: string): Adapter | undefined {
    return this.adapters.get(name)
  }

  getRepositoryAdapter(): GitRepositoryAdapter {
    const adapter = this.adapters.get("repository")
    if (!adapter) throw new Error("REPOSITORY_ADAPTER_NOT_CREATED")
    return adapter as unknown as GitRepositoryAdapter
  }

  getGitHubAdapter(): GitHubAdapterImpl {
    const adapter = this.adapters.get("github")
    if (!adapter) throw new Error("GITHUB_ADAPTER_NOT_CREATED")
    return adapter as unknown as GitHubAdapterImpl
  }

  getTddAdapter(): TddAdapterImpl {
    const adapter = this.adapters.get("tdd")
    if (!adapter) throw new Error("TDD_ADAPTER_NOT_CREATED")
    return adapter as unknown as TddAdapterImpl
  }

  getBddAdapter(): BddAdapterImpl {
    const adapter = this.adapters.get("bdd")
    if (!adapter) throw new Error("BDD_ADAPTER_NOT_CREATED")
    return adapter as unknown as BddAdapterImpl
  }

  getConversationAdapter(): ConversationAdapterImpl {
    const adapter = this.adapters.get("conversation")
    if (!adapter) throw new Error("CONVERSATION_ADAPTER_NOT_CREATED")
    return adapter as unknown as ConversationAdapterImpl
  }

  getDocumentAdapter(): DocumentAdapterImpl {
    const adapter = this.adapters.get("document")
    if (!adapter) throw new Error("DOCUMENT_ADAPTER_NOT_CREATED")
    return adapter as unknown as DocumentAdapterImpl
  }

  getFilesystemAdapter(): FilesystemAdapterImpl {
    const adapter = this.adapters.get("filesystem")
    if (!adapter) throw new Error("FILESYSTEM_ADAPTER_NOT_CREATED")
    return adapter as unknown as FilesystemAdapterImpl
  }

  getSpecificationAdapter(): SpecificationAdapterImpl {
    const adapter = this.adapters.get("specification")
    if (!adapter) throw new Error("SPECIFICATION_ADAPTER_NOT_CREATED")
    return adapter as unknown as SpecificationAdapterImpl
  }

  getKnowledgeExtractionAdapter(): KnowledgeExtractionAdapterImpl {
    const adapter = this.adapters.get("knowledge-extraction")
    if (!adapter) throw new Error("KNOWLEDGE_EXTRACTION_ADAPTER_NOT_CREATED")
    return adapter as unknown as KnowledgeExtractionAdapterImpl
  }

  getConfidenceAdapter(): ConfidenceAdapterImpl {
    const adapter = this.adapters.get("confidence")
    if (!adapter) throw new Error("CONFIDENCE_ADAPTER_NOT_CREATED")
    return adapter as unknown as ConfidenceAdapterImpl
  }

  getDependencyAdapter(): DependencyAdapterImpl {
    const adapter = this.adapters.get("dependency")
    if (!adapter) throw new Error("DEPENDENCY_ADAPTER_NOT_CREATED")
    return adapter as unknown as DependencyAdapterImpl
  }

  getArchitectureAdapter(): ArchitectureAdapterImpl {
    const adapter = this.adapters.get("architecture")
    if (!adapter) throw new Error("ARCHITECTURE_ADAPTER_NOT_CREATED")
    return adapter as unknown as ArchitectureAdapterImpl
  }

  getMissionBuilderAdapter(): MissionBuilderAdapterImpl {
    const adapter = this.adapters.get("mission-builder")
    if (!adapter) throw new Error("MISSION_BUILDER_ADAPTER_NOT_CREATED")
    return adapter as unknown as MissionBuilderAdapterImpl
  }

  getExpeditionBuilderAdapter(): ExpeditionBuilderAdapterImpl {
    const adapter = this.adapters.get("expedition-builder")
    if (!adapter) throw new Error("EXPEDITION_BUILDER_ADAPTER_NOT_CREATED")
    return adapter as unknown as ExpeditionBuilderAdapterImpl
  }

  getObjectiveBuilderAdapter(): ObjectiveBuilderAdapterImpl {
    const adapter = this.adapters.get("objective-builder")
    if (!adapter) throw new Error("OBJECTIVE_BUILDER_ADAPTER_NOT_CREATED")
    return adapter as unknown as ObjectiveBuilderAdapterImpl
  }

  getWizardAdapter(): WizardAdapterImpl {
    const adapter = this.adapters.get("wizard")
    if (!adapter) throw new Error("WIZARD_ADAPTER_NOT_CREATED")
    return adapter as unknown as WizardAdapterImpl
  }

  list(): string[] {
    return Array.from(this.factories.keys())
  }
}

export function createAdapterRegistry(): AdapterRegistry {
  return new AdapterRegistry()
}
