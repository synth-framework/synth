import { makeTempDir } from "./helpers/workspace.js"
import { registerDiscoveryIntegrationTests } from "./helpers/discovery-integration-tests.js"

// ============================================================
// BOOTSTRAP-DISCOVERY INTEGRATION TESTS
// ============================================================
// Verifies that bootstrap analysis now consumes Discovery output and
// preserves the legacy RepositoryAnalysis contract.
// ============================================================

registerDiscoveryIntegrationTests(makeTempDir)