import type { EvaluationRule, DriftClassAdapter, ProposalEvaluationRuleSet, ProposalFeature } from "../types.js"

function booleanFeature(name: string, value: boolean): { kind: "boolean"; name: string; value: boolean } {
  return { kind: "boolean", name, value }
}

function getBoolean(features: Array<{ kind: string; name: string; value: unknown }>, name: string): boolean {
  const feature = features.find((f) => f.name === name && f.kind === "boolean")
  return feature?.value === true
}

// ------------------------------------------------------------------
// Drift-class rules
// ------------------------------------------------------------------

const genericDashboardRule: EvaluationRule = {
  id: "forbidden-drift-generic-dashboard",
  name: "Forbidden drift: generic dashboard",
  description: "Detects metric cards, promotional banners, and disconnected widgets.",
  severity: "blocking",
  contractClauses: {
    field: "forbiddenDrift",
    values: ["Generic SaaS dashboard with metric cards and promotional banners"],
  },
  featureNames: ["hasMetricCards", "hasPromotionalBanners", "hasDisconnectedWidgets"],
  evaluate: (features) => {
    const hasMetricCards = getBoolean(features, "hasMetricCards")
    const hasPromotionalBanners = getBoolean(features, "hasPromotionalBanners")
    const hasDisconnectedWidgets = getBoolean(features, "hasDisconnectedWidgets")
    return hasMetricCards || hasPromotionalBanners || hasDisconnectedWidgets ? "fail" : "pass"
  },
}

const marketingLandingRule: EvaluationRule = {
  id: "forbidden-interpretation-marketing-landing",
  name: "Forbidden interpretation: marketing-first landing",
  description: "Detects when Mission Studio appears as one section among many marketing sections.",
  severity: "blocking",
  contractClauses: {
    field: "forbiddenInterpretation",
    values: ["Marketing-first landing page where Mission Studio is one section among many"],
  },
  featureNames: ["hasMarketingHero", "hasFeatureGrid", "hasMissionStudioAsSection"],
  evaluate: (features) => {
    const hasMarketingHero = getBoolean(features, "hasMarketingHero")
    const hasFeatureGrid = getBoolean(features, "hasFeatureGrid")
    const hasMissionStudioAsSection = getBoolean(features, "hasMissionStudioAsSection")
    return hasMarketingHero || hasFeatureGrid || hasMissionStudioAsSection ? "fail" : "pass"
  },
}

const chatPrimaryRule: EvaluationRule = {
  id: "forbidden-interpretation-chat-primary",
  name: "Forbidden interpretation: chat-primary interface",
  description: "Detects chat bubbles or decorative AI imagery as the dominant interaction.",
  severity: "blocking",
  contractClauses: {
    field: "forbiddenInterpretation",
    values: ["Chat interface with decorative AI imagery"],
  },
  featureNames: ["hasChatPrimaryInteraction", "hasDecorativeAiImagery"],
  evaluate: (features) => {
    const hasChatPrimary = getBoolean(features, "hasChatPrimaryInteraction")
    const hasDecorativeAi = getBoolean(features, "hasDecorativeAiImagery")
    return hasChatPrimary || hasDecorativeAi ? "fail" : "pass"
  },
}

const pageJumpNavigationRule: EvaluationRule = {
  id: "forbidden-drift-page-jump-navigation",
  name: "Forbidden drift: page-jump navigation",
  description: "Detects lifecycle phases rendered as separate pages.",
  severity: "blocking",
  contractClauses: {
    field: "forbiddenDrift",
    values: ["Page-jump navigation instead of a persistent workspace"],
  },
  featureNames: ["hasSeparateLifecyclePages", "hasPageJumpNavigation"],
  evaluate: (features) => {
    const hasSeparatePages = getBoolean(features, "hasSeparateLifecyclePages")
    const hasPageJump = getBoolean(features, "hasPageJumpNavigation")
    return hasSeparatePages || hasPageJump ? "fail" : "pass"
  },
}

const storybookAestheticRule: EvaluationRule = {
  id: "forbidden-drift-storybook-aesthetic",
  name: "Forbidden drift: storybook aesthetic",
  description: "Detects components displayed as isolated specimens.",
  severity: "blocking",
  contractClauses: {
    field: "forbiddenDrift",
    values: ["Disconnected storybook aesthetic"],
  },
  featureNames: ["hasComponentGrid", "hasIsolatedSpecimens"],
  evaluate: (features) => {
    const hasComponentGrid = getBoolean(features, "hasComponentGrid")
    const hasIsolatedSpecimens = getBoolean(features, "hasIsolatedSpecimens")
    return hasComponentGrid || hasIsolatedSpecimens ? "fail" : "pass"
  },
}

const placeholderArtifactsRule: EvaluationRule = {
  id: "forbidden-drift-placeholder-artifacts",
  name: "Forbidden drift: placeholder artifacts",
  description: "Detects fake terminal output, mock data, or placeholder screenshots.",
  severity: "blocking",
  contractClauses: {
    field: "forbiddenDrift",
    values: ["Placeholder artifacts", "Fake terminal output"],
  },
  featureNames: ["hasFakeTerminalOutput", "hasMockData", "hasPlaceholderScreenshots"],
  evaluate: (features) => {
    const hasFakeTerminal = getBoolean(features, "hasFakeTerminalOutput")
    const hasMockData = getBoolean(features, "hasMockData")
    const hasPlaceholderScreenshots = getBoolean(features, "hasPlaceholderScreenshots")
    return hasFakeTerminal || hasMockData || hasPlaceholderScreenshots ? "fail" : "pass"
  },
}

const hardcodedValuesRule: EvaluationRule = {
  id: "forbidden-drift-hardcoded-values",
  name: "Forbidden drift: hardcoded values",
  description: "Detects visual values outside the LDS-002 token system.",
  severity: "blocking",
  contractClauses: {
    field: "forbiddenDrift",
    values: ["Hardcoded values outside the LDS-002 token system"],
  },
  featureNames: ["hasHardcodedColors", "hasHardcodedSpacing", "hasNonTokenTypography"],
  evaluate: (features) => {
    const hasHardcodedColors = getBoolean(features, "hasHardcodedColors")
    const hasHardcodedSpacing = getBoolean(features, "hasHardcodedSpacing")
    const hasNonTokenTypography = getBoolean(features, "hasNonTokenTypography")
    return hasHardcodedColors || hasHardcodedSpacing || hasNonTokenTypography ? "fail" : "pass"
  },
}

const workspaceDilutionRule: EvaluationRule = {
  id: "forbidden-drift-workspace-dilution",
  name: "Forbidden drift: workspace dilution",
  description: "Detects when Mission Studio shell is present but not dominant.",
  severity: "blocking",
  contractClauses: {
    field: "forbiddenDrift",
    values: ["Workspace dilution", "Mission Studio not dominant"],
  },
  featureNames: ["hasMissionStudioShell", "hasDominantMarketingContent"],
  evaluate: (features) => {
    const hasShell = getBoolean(features, "hasMissionStudioShell")
    const hasDominantMarketing = getBoolean(features, "hasDominantMarketingContent")
    return hasShell && hasDominantMarketing ? "fail" : "pass"
  },
}

// ------------------------------------------------------------------
// Valid-branch rules
// ------------------------------------------------------------------

const persistentWorkspaceRule: EvaluationRule = {
  id: "required-behavior-persistent-workspace",
  name: "Required behavior: persistent workspace",
  description: "Requires persistent header, sidebar, and scroll-driven phases.",
  severity: "blocking",
  contractClauses: {
    field: "requiredBehaviors",
    values: ["Workspace persists while phases change"],
  },
  featureNames: ["hasPersistentHeader", "hasPersistentSidebar", "hasScrollDrivenPhases"],
  evaluate: (features) => {
    const hasHeader = getBoolean(features, "hasPersistentHeader")
    const hasSidebar = getBoolean(features, "hasPersistentSidebar")
    const hasScrollPhases = getBoolean(features, "hasScrollDrivenPhases")
    return hasHeader && hasSidebar && hasScrollPhases ? "pass" : "fail"
  },
}

const heroInvitationRule: EvaluationRule = {
  id: "allowed-interpretation-hero-invitation",
  name: "Allowed interpretation: hero invitation",
  description: "Permits a short hero that invites visitors into Mission Studio.",
  severity: "warning",
  contractClauses: {
    field: "allowedInterpretation",
    values: ["Hero section that invites visitors into Mission Studio"],
  },
  featureNames: ["hasShortHero", "hasHeroCtaIntoWorkspace", "hasPersistentWorkspace"],
  evaluate: (features) => {
    const hasShortHero = getBoolean(features, "hasShortHero")
    const hasCta = getBoolean(features, "hasHeroCtaIntoWorkspace")
    const hasWorkspace = getBoolean(features, "hasPersistentWorkspace")
    if (!hasShortHero) return "pass" // not using hero is still valid
    return hasCta && hasWorkspace ? "pass" : "fail"
  },
}

const deterministicDemoRule: EvaluationRule = {
  id: "allowed-interpretation-deterministic-demo",
  name: "Allowed interpretation: deterministic demo",
  description: "Permits a simulated operator adapter demonstrating deterministic execution.",
  severity: "warning",
  contractClauses: {
    field: "allowedInterpretation",
    values: ["Demo operator adapter that simulates AI execution deterministically"],
  },
  featureNames: ["hasDemoOperatorAdapter", "hasDeterministicExecution"],
  evaluate: (features) => {
    const hasAdapter = getBoolean(features, "hasDemoOperatorAdapter")
    const hasDeterministic = getBoolean(features, "hasDeterministicExecution")
    if (!hasAdapter) return "pass" // not using demo is still valid
    return hasDeterministic ? "pass" : "fail"
  },
}

const lightThemeDefaultRule: EvaluationRule = {
  id: "allowed-variation-light-theme-default",
  name: "Allowed variation: light-theme default",
  description: "Permits light theme default with optional dark mode. An unspecified theme is also valid.",
  severity: "warning",
  contractClauses: {
    field: "allowedVariation",
    values: ["Light workspace theme as the default experience"],
  },
  featureNames: ["hasLightThemeDefault", "hasOptionalDarkMode"],
  evaluate: (features) => {
    const declared = features.some((f) => f.name === "hasLightThemeDefault")
    if (!declared) return "pass"
    const hasLightDefault = getBoolean(features, "hasLightThemeDefault")
    return hasLightDefault ? "pass" : "fail"
  },
}

// ------------------------------------------------------------------
// Rule set assembly
// ------------------------------------------------------------------

export const program027RuleSet: ProposalEvaluationRuleSet = {
  id: "program-027-homepage",
  version: 1,
  rules: [
    genericDashboardRule,
    marketingLandingRule,
    chatPrimaryRule,
    pageJumpNavigationRule,
    storybookAestheticRule,
    placeholderArtifactsRule,
    hardcodedValuesRule,
    workspaceDilutionRule,
    persistentWorkspaceRule,
    heroInvitationRule,
    deterministicDemoRule,
    lightThemeDefaultRule,
  ],
  driftClassAdapters: [
    { driftClassId: "D01", name: "Generic dashboard", description: "Metric cards, promotional banners, disconnected widgets", ruleIds: [genericDashboardRule.id] },
    { driftClassId: "D02", name: "Marketing-first landing", description: "Mission Studio as one section among many", ruleIds: [marketingLandingRule.id] },
    { driftClassId: "D03", name: "Chat-primary interface", description: "Chat bubbles or decorative AI imagery", ruleIds: [chatPrimaryRule.id] },
    { driftClassId: "D04", name: "Page-jump navigation", description: "Lifecycle phases as separate pages", ruleIds: [pageJumpNavigationRule.id] },
    { driftClassId: "D05", name: "Storybook aesthetic", description: "Components as isolated specimens", ruleIds: [storybookAestheticRule.id] },
    { driftClassId: "D06", name: "Placeholder artifacts", description: "Fake terminal output, mock data, placeholders", ruleIds: [placeholderArtifactsRule.id] },
    { driftClassId: "D07", name: "Hardcoded values", description: "Values outside LDS-002 token system", ruleIds: [hardcodedValuesRule.id] },
    { driftClassId: "D08", name: "Workspace dilution", description: "Mission Studio shell present but not dominant", ruleIds: [workspaceDilutionRule.id] },
  ],
}

// ------------------------------------------------------------------
// Convenience helpers for constructing proposals
// ------------------------------------------------------------------

export function buildProposal(features: Record<string, boolean>): { kind: "feature-list"; features: ProposalFeature[] } {
  return {
    kind: "feature-list",
    features: Object.entries(features).map(([name, value]) => booleanFeature(name, value)),
  }
}

export {
  booleanFeature,
  getBoolean,
}
