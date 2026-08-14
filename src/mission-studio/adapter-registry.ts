// ============================================================
// MISSION STUDIO: Adapter Registry
// ============================================================
// Central registry for Mission Studio planning and intelligence
// adapters. These adapters produce observations for mission and
// expedition planning, not for the discovery pipeline.
//
// The registry is now catalog-driven: it queries the unified
// AdapterCatalog for adapters in the "planning" and "intelligence"
// families and registers their factories from a canonical provider
// map. This removes the previous hardcoded factory list while
// preserving typed getters for known adapters.
// ============================================================

import type { Adapter } from "../types/index.js"
import type { AdapterDescriptor } from "../types/adapter.js"
import {
  createDefaultAdapterCatalog,
  type AdapterCatalog,
} from "../adapters/adapter-catalog.js"
import { createGitRepositoryAdapter, GitRepositoryAdapter } from "../adapters/repository/git.js"
import { createGitHubAdapter, GitHubAdapterImpl } from "../adapters/github/adapter.js"
import { createTddAdapter, TddAdapterImpl } from "../adapters/tdd/adapter.js"
import { createBddAdapter, BddAdapterImpl } from "../adapters/bdd/adapter.js"
import { createConversationAdapter, ConversationAdapterImpl } from "../adapters/conversation/adapter.js"
import { createDocumentAdapter, DocumentAdapterImpl } from "../adapters/document/adapter.js"
import { createFilesystemAdapter, FilesystemAdapterImpl } from "../adapters/filesystem/adapter.js"
import { createSpecificationAdapter, SpecificationAdapterImpl } from "../adapters/specification/adapter.js"
import { createKnowledgeExtractionAdapter, KnowledgeExtractionAdapterImpl } from "../adapters/knowledge/adapter.js"
import { createConfidenceAdapter, ConfidenceAdapterImpl } from "../adapters/confidence/adapter.js"
import { createDependencyAdapter, DependencyAdapterImpl } from "../adapters/dependency/adapter.js"
import { createArchitectureAdapter, ArchitectureAdapterImpl } from "../adapters/architecture/adapter.js"
import { createMissionBuilderAdapter, MissionBuilderAdapterImpl } from "../adapters/mission-builder/adapter.js"
import { createExpeditionBuilderAdapter, ExpeditionBuilderAdapterImpl } from "../adapters/expedition-builder/adapter.js"
import { createObjectiveBuilderAdapter, ObjectiveBuilderAdapterImpl } from "../adapters/objective-builder/adapter.js"
import { createWizardAdapter, WizardAdapterImpl } from "../adapters/wizard/adapter.js"

export type AdapterConstructor = () => Adapter

/** Canonical factory provider for Mission Studio catalog adapters. */
const PLANNING_ADAPTER_FACTORIES: Record<string, AdapterConstructor> = {
  repository: () => createGitRepositoryAdapter(),
  github: () => createGitHubAdapter(),
  tdd: () => createTddAdapter(),
  bdd: () => createBddAdapter(),
  conversation: () => createConversationAdapter(),
  document: () => createDocumentAdapter(),
  filesystem: () => createFilesystemAdapter(),
  specification: () => createSpecificationAdapter(),
  "knowledge-extraction": () => createKnowledgeExtractionAdapter(),
  confidence: () => createConfidenceAdapter(),
  dependency: () => createDependencyAdapter(),
  architecture: () => createArchitectureAdapter(),
  "mission-builder": () => createMissionBuilderAdapter(),
  "expedition-builder": () => createExpeditionBuilderAdapter(),
  "objective-builder": () => createObjectiveBuilderAdapter(),
  wizard: () => createWizardAdapter(),
}

export class AdapterRegistry {
  private adapters = new Map<string, Adapter>()
  private factories = new Map<string, AdapterConstructor>()
  private catalog: AdapterCatalog

  constructor(catalog: AdapterCatalog = createDefaultAdapterCatalog()) {
    this.catalog = catalog
    this.seedFromFactoryMap()
  }

  private seedFromFactoryMap(): void {
    // The factory map defines which adapters Mission Studio knows how to
    // instantiate. Metadata for each adapter comes from the catalog.
    for (const [name, factory] of Object.entries(PLANNING_ADAPTER_FACTORIES)) {
      this.registerFactory(name, factory)
    }
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

  /** Return the canonical descriptor for a registered adapter, if indexed. */
  descriptor(name: string): AdapterDescriptor | undefined {
    return this.catalog.resolve(name)
  }

  /** Return canonical descriptors for all registered adapters. */
  descriptors(): AdapterDescriptor[] {
    return this.list()
      .map((name) => this.catalog.resolve(name))
      .filter((descriptor): descriptor is AdapterDescriptor => descriptor !== undefined)
  }
}

export function createAdapterRegistry(catalog?: AdapterCatalog): AdapterRegistry {
  return new AdapterRegistry(catalog)
}
