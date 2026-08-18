// ============================================================
// WORKSPACE: Subsystem Index
// ============================================================
// Decoupled observation layer. Read-only state interface.
// ============================================================

export type { StateReader, HealthReport, HealthCheck, HealthStatus } from "./types.js"
export { createStateReader } from "./state-reader.js"
export type { StateReaderDeps } from "./state-reader.js"
export { ExecutionArtifactAdapter } from "./artifact-adapter.js"
export type { ArtifactProjection } from "./artifact-adapter.js"
export { CanonicalLanguageAuditor } from "./language-auditor.js"
export type { AuditResult, AuditIssue, LanguageReport, LoadFromFileResult } from "./language-auditor.js"
export { SemanticVerifier } from "./semantic-verifier.js"
export type { SemanticAssertion, SemanticVerificationResult } from "./semantic-verifier.js"
export { RepositoryHealth } from "./repository-health.js"
export type { RepositoryHealthResult, HealthCheckEntry } from "./repository-health.js"
export { WorkspaceCognitionEnvironment } from "./workspace.js"
export type { WorkspaceDescriptor, EnvironmentReport, EnvironmentCheck } from "./workspace.js"
