# Deep Dive: Initial / External-System Adapters

## Purpose

Initial adapters bridge **project reality** into SYNTH. They run during onboarding and project initialization. Their job is to answer: *"What exists out there, and what can SYNTH infer about the project from it?"*

They are **not** Mission Studio reasoning plugins. They touch real systems: the filesystem, git, GitHub, package manifests, operational config files.

## The initialization pipeline

```
OPERATOR INPUT
│
├─► synth init
│   │
│   ▼
├─► cmdInit() in src/cli/synth.ts
│   │
│   ├─► createInitializationEngine()
│   │   │
│   │   ├─► createDefaultAdapterCatalog()
│   │   │   │
│   │   │   └─► registerFrom(createFilesystemInitializationAdapter())
│   │   │       └─► descriptor id: "filesystem-initialization"
│   │   │           family: "initialization"
│   │   │           capabilities: ["filesystem-scan", "lifecycle-inference", "domain-inference"]
│   │   │
│   │   └─► defaultAdapters() = catalog.query({ family: "initialization" })
│   │       └─► [ { id: "filesystem-initialization", ... } ]
│   │
│   └─► engine.initialize({ sourceType: "filesystem", sourceLocation: targetDir })
│       │
│       ├─► find adapter where adapter.canHandle(input)
│       │   └─► FilesystemInitializationAdapter.canHandle({ sourceType: "filesystem" }) → true
│       │
│       ├─► adapter.collectEvidence(input)
│       │   │
│       │   ├─► walkTopLevel(fs, location)
│       │   │   └─► entries, fileCount, directoryCount, extensions
│       │   │
│       │   ├─► inferLifecycleStage(entries, fileCount, extensions)
│       │   │   └─► "specification" | "implementation" | "unknown"
│       │   │
│       │   ├─► infer domains from entries
│       │   │   └─► documentation, architecture, implementation
│       │   │
│       │   └─► return InitializationEvidence
│       │       ├─ adapterId: "filesystem"
│       │       ├─ sourceType: "filesystem"
│       │       ├─ lifecycleStage
│       │       ├─ intent
│       │       ├─ domains
│       │       ├─ constraints
│       │       ├─ summary
│       │       └─ confidence
│       │
│       ├─► evidenceToProjectModelInput(evidence)
│       │   └─► ProjectModelInput
│       │
│       └─► createProjectModel(ProjectModelInput)
│           └─► ProjectModel
│               ├─ identity
│               ├─ intent
│               ├─ lifecycleStage
│               ├─ domains
│               ├─ constraints
│               ├─ evidence
│               └─ confidence
│
└─► write manifest.json
    └─► manifest.capabilities = adapterCatalog.list()
```

## Adapter-by-adapter review

### `initialization:filesystem`

| Aspect | Detail |
|---|---|
| **What it does** | Scans a directory and produces a pre-implementation `ProjectModel` |
| **Input** | `InitializationInput { sourceType: "filesystem", sourceLocation: path }` |
| **Internal API** | `canHandle(input)`, `collectEvidence(input): Promise<InitializationEvidence>` |
| **What it reads** | Directory entries, file extensions, presence of `src`, `tests`, `knowledge`, `docs`, `architecture`, `package.json`, etc. |
| **What it returns** | `InitializationEvidence` with `lifecycleStage`, `intent`, `domains`, `constraints`, `summary`, `confidence` |
| **Called from** | `src/initialization/engine.ts` → `createInitializationEngine()` |
| **Side effects** | None. Read-only. |
| **Future extensions** | `initialization:repository` (read git history), `initialization:conversation` (operator Q&A), `initialization:documentation` (read knowledge docs) |

### `discovery:filesystem`

| Aspect | Detail |
|---|---|
| **What it does** | Produces immutable observations about a filesystem directory |
| **Input** | `DiscoverySource { type: "filesystem", path }` |
| **Internal API** | `canHandle(source)`, `collectObservations(source, context): Promise<Observation[]>` |
| **What it reads** | Files, directories, `package.json` dependencies/scripts, file extensions |
| **What it returns** | `Observation[]` — facts like "package.json exists", "file extension .ts observed", "manifest detected" |
| **Called from** | `src/discovery/engine.ts` → `createDefaultDiscoveryEngine()` |
| **Side effects** | None. Read-only. |
| **Determinism** | deterministic |

### `discovery:git`

| Aspect | Detail |
|---|---|
| **What it does** | Produces immutable observations about a Git repository |
| **Input** | `DiscoverySource { type: "filesystem", path }` (it looks for `.git` under the path) |
| **Internal API** | `canHandle(source)`, `collectObservations(source, context): Promise<Observation[]>` |
| **What it reads** | `.git/`, remotes, branches, tags, commits, HEAD, working tree state |
| **What it returns** | `Observation[]` — facts like "git repository detected", "remote exists", "branch exists", "commit observed" |
| **Called from** | `src/discovery/engine.ts` → `createDefaultDiscoveryEngine()` |
| **Side effects** | None. Read-only. Local git commands only. |
| **Determinism** | deterministic for committed state; contextual if working tree is dirty |
| **Behavior when no git** | Returns a single observation: `{ fact: "git repository not detected", payload: { path } }` |

### `discovery:operational-artifacts`

| Aspect | Detail |
|---|---|
| **What it does** | Produces observations about operational config files (Docker, k8s, DB, CI/CD) |
| **Input** | `DiscoverySource { type: "filesystem", path }` |
| **Internal API** | `canHandle(source)`, `collectObservations(source, context): Promise<Observation[]>` |
| **What it reads** | `Dockerfile`, `docker-compose.yml`, k8s manifests, helm charts, `schema.sql`, `.github/workflows/*.yml` |
| **What it returns** | `Observation[]` — facts like "operational artifact detected", "artifactType: container" |
| **Called from** | `src/discovery/engine.ts` → `createDefaultDiscoveryEngine()` |
| **Side effects** | None. Read-only. |
| **Determinism** | deterministic |

### `repository` (Git reference implementation)

| Aspect | Detail |
|---|---|
| **What it does** | Performs all Git-side operations for SYNTH (the only module allowed to run git commands for mutations) |
| **Internal API** | Lifecycle: `discover()`, `configure(config)`, `validate()`, `enable()`, `disable()`, `healthCheck()` |
| **Operations API** | `initialize()`, `status()`, `checkHealth()`, `createBranch(name)`, `checkout(name)`, `commit(message)`, `installHooks()`, `createSnapshot(opts)`, `promote(branch)`, `merge(source, target)` |
| **What it reads/writes** | Local `.git/`, working tree, remotes, hooks |
| **Called from** | `src/cli/adapter.ts` (manual CLI), Mission Studio registry (`getRepositoryAdapter()`), future lifecycle hooks |
| **Side effects** | Creates branches, commits, tags, snapshots, installs hooks |
| **Configuration** | `{ path, remote, defaultBranch, promotionMode, username, email, signingKey, snapshotPolicy, autoTagOnComplete, autoCommitOnStateChange }` |
| **Health checks** | initialized, branch valid, hooks installed, proof current |
| **Behavior when no repo** | `validate()` fails if path has no `.git`; `initialize()` can create one if asked |

### `github`

| Aspect | Detail |
|---|---|
| **What it does** | Performs GitHub API operations for issues, pull requests, and releases |
| **Internal API** | Lifecycle: `discover()`, `configure(config)`, `validate()`, `enable()`, `disable()`, `healthCheck()` |
| **Operations API** | `status()`, `checkHealth()`, `createIssue()`, `updateIssue()`, `closeIssue()`, `createPullRequest()`, `reviewPullRequest()`, `mergePullRequest()`, `createRelease()`, `syncRepository()` |
| **What it reads/writes** | GitHub REST API |
| **Called from** | `src/cli/adapter.ts` (manual CLI), Mission Studio registry (`getGitHubAdapter()`), future PR/issue automation |
| **Side effects** | Creates/updates GitHub issues, PRs, releases |
| **Configuration** | `{ owner, repo, token, baseUrl?, defaultBranch? }` |
| **Health checks** | authenticated, repository reachable, default branch exists |
| **Behavior when no token** | `validate()`/health check fails; adapter stays in error state until configured |

## How initial adapters relate to Mission Studio

Initial adapters produce the **first ProjectModel and observations**. Mission Studio adapters consume those observations later to propose missions/expeditions.

```
External reality
       │
       ▼
┌─────────────────┐
│ Initial adapters │
│ (filesystem,    │
│  git discovery, │
│  repository,    │
│  github)        │
└────────┬────────┘
         │
         ├─► ProjectModel ──► manifest.json + event-log
         │
         └─► Observation[] ──► EvidenceGraph
                  │
                  ▼
         ┌─────────────────┐
         │ Mission Studio  │
         │ adapters        │
         │ (evidence,      │
         │  intelligence,  │
         │  planning)      │
         └─────────────────┘
```

## Proposed naming cleanup

| Current | Proposed | Reason |
|---|---|---|
| `filesystem` init adapter descriptor id | `initialization:filesystem` | Clear domain; no collision with Mission Studio `evidence:filesystem` |
| `filesystem` Mission Studio adapter | `evidence:filesystem` | It reads files as evidence, not for project intake |
| `discovery:filesystem` | keep | Already namespaced |
| `discovery:git` | keep | Already namespaced |
| `repository` | `integration:repository` or keep `repository` | It is the versioning integration adapter |
| `github` | `integration:github` or keep `github` | GitHub integration adapter |
| `tdd` runtime + MS | `methodology:tdd` | Single canonical methodology adapter |

## Open questions for follow-up

1. Should `initialization:filesystem` be auto-run during `synth init`, or should the operator choose the source type?
2. If git is detected during discovery, should SYNTH auto-configure the `repository` adapter, or ask the operator?
3. If no repository exists, should SYNTH suggest initializing one so the versioning adapter can be used later?
4. Should the `repository` adapter be the generic versioning interface, with `git` as one implementation, allowing future `svn`, `mercurial`, etc.?
5. Should GitHub adapter auto-enable when a git remote points to github.com and `GITHUB_TOKEN` is present?
