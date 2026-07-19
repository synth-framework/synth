// ============================================================
// CERTIFICATION PROFILES (EXP-GOV-009)
// ============================================================
// Maps validation contexts (local, PR, main, release) to the set of
// governance classes that must be validated. Profiles expand scope; they
// never reduce the validators required for safety.
// ============================================================

/** @typedef {"local-fast" | "pull-request" | "main-branch" | "release"} CertificationProfile */

/** Current version of the certification profile schema. */
export const PROFILES_VERSION = "1.0.0"

/**
 * @typedef {Object} ProfileDefinition
 * @property {CertificationProfile} name
 * @property {string} description
 * @property {import("./governance-classes.js").GovernanceClass[]} requiredClasses
 * @property {boolean} requireProofs
 * @property {boolean} allowSkip
 */

/** @type {Record<CertificationProfile, ProfileDefinition>} */
export const PROFILES = {
  "local-fast": {
    name: "local-fast",
    description: "Operator feedback loop; skips heavy integration suites when no runtime/kernel/compiler classes changed.",
    requiredClasses: ["documentation", "knowledge", "runtime", "kernel", "compiler", "release", "design", "tests"],
    requireProofs: false,
    allowSkip: true,
  },
  "pull-request": {
    name: "pull-request",
    description: "Merge confidence; runs all affected validators including integration suites.",
    requiredClasses: ["documentation", "knowledge", "runtime", "kernel", "compiler", "release", "design", "tests"],
    requireProofs: true,
    allowSkip: true,
  },
  "main-branch": {
    name: "main-branch",
    description: "Repository certification; validates all classes regardless of impact.",
    requiredClasses: ["documentation", "knowledge", "runtime", "kernel", "compiler", "release", "design", "tests"],
    requireProofs: true,
    allowSkip: false,
  },
  release: {
    name: "release",
    description: "Production certification; complete validation including proofs, audits, and freeze certification.",
    requiredClasses: ["documentation", "knowledge", "runtime", "kernel", "compiler", "release", "design", "tests"],
    requireProofs: true,
    allowSkip: false,
  },
}

/**
 * Resolve a profile name to its definition.
 *
 * @param {string} name
 * @returns {ProfileDefinition}
 */
export function resolveProfile(name) {
  if (name in PROFILES) {
    return PROFILES[/** @type {CertificationProfile} */ (name)]
  }
  // Default to pull-request semantics for unknown profiles.
  return PROFILES["pull-request"]
}

/**
 * Return the effective set of classes to validate for a profile and an
 * impact-derived set of classes. In strict profiles all classes are required;
 * in skippable profiles only the impacted classes are required, unless the
 * profile explicitly requires a class.
 *
 * @param {CertificationProfile | string} profileName
 * @param {import("./governance-classes.js").GovernanceClass[]} impactedClasses
 * @returns {import("./governance-classes.js").GovernanceClass[]}
 */
export function resolveClassesForProfile(profileName, impactedClasses) {
  const profile = resolveProfile(profileName)
  if (!profile.allowSkip) {
    return profile.requiredClasses
  }
  const impacted = new Set(impactedClasses)
  return profile.requiredClasses.filter((c) => impacted.has(c))
}

/**
 * Determine whether a validator is in scope for a profile. A validator is in
 * scope when at least one of its governance classes is required by the profile.
 *
 * @param {CertificationProfile | string} profileName
 * @param {import("./governance-classes.js").GovernanceClass[]} validatorClasses
 * @param {import("./governance-classes.js").GovernanceClass[]} impactedClasses
 * @returns {boolean}
 */
export function isValidatorInProfile(profileName, validatorClasses, impactedClasses) {
  const required = new Set(resolveClassesForProfile(profileName, impactedClasses))
  return validatorClasses.some((c) => required.has(c))
}
