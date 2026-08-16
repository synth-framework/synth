/**
 * Knip config for SYNTH
 * Use default report, scan src/ excluding node_modules/.git/.synth/dist
 */

module.exports = {
  files: ["src/**/*.ts"],
  exclude: ["**/node_modules/**", "**/.git/**", "**/.synth/**", "**/dist/**", "**/tests/**", "**/docs/**"],
};
