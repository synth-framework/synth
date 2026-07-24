/**
 * Tailwind CSS configuration re-exporting LDS-002 tokens.
 *
 * This file is generated from website/tokens.json. Do not edit values here;
 * update the canonical token file and regenerate this config instead.
 */

const tokens = require("./tokens.json")

function flattenTokens(prefix, obj, result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}-${key}` : key
    if (value.value !== undefined) {
      result[path] = value.value
    } else {
      flattenTokens(path, value, result)
    }
  }
  return result
}

const lightColors = flattenTokens("", tokens.themes.light.color)
const darkColors = flattenTokens("", tokens.themes.dark.color)

module.exports = {
  darkMode: "class",
  content: ["./*.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: lightColors,
      fontFamily: {
        sans: tokens.typography.font.sans.value,
        mono: tokens.typography.font.mono.value,
      },
      fontSize: Object.fromEntries(
        Object.entries(tokens.typography.size).map(([k, v]) => [k, v.value])
      ),
      spacing: Object.fromEntries(
        Object.entries(tokens.spacing).map(([k, v]) => [k, v.value])
      ),
      borderRadius: Object.fromEntries(
        Object.entries(tokens.radius).map(([k, v]) => [k, v.value])
      ),
      boxShadow: Object.fromEntries(
        Object.entries(tokens.elevation).map(([k, v]) => [k, v.value])
      ),
      transitionDuration: Object.fromEntries(
        Object.entries(tokens.motion.duration).map(([k, v]) => [k, v.value])
      ),
      transitionTimingFunction: Object.fromEntries(
        Object.entries(tokens.motion.easing).map(([k, v]) => [k, v.value])
      ),
    },
  },
  plugins: [
    function darkThemePlugin({ addVariant }) {
      addVariant("dark", ".dark &")
    },
  ],
}
