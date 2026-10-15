// Pure Win32 checkout-path checks: fixtures need not create illegal files.
export function portablePathProblems(paths) {
  const problems = new Set(), seen = new Map()
  for (const file of paths) {
    if (typeof file !== "string" || !file) { problems.add("Empty/non-string path"); continue }
    const components = file.split("/")
    for (let i = 0; i < components.length; i++) {
      const part = components[i]
      if (!part || /[<>:"\\|?*\x00-\x1f]/.test(part) || /[ .]$/.test(part)) problems.add(`Windows-invalid component: ${file}`)
      const stem = part.split(".")[0].trimEnd()
      if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³]|conin\$|conout\$)$/i.test(stem)) problems.add(`Windows-reserved name: ${file}`)
      if (part.length > 255) problems.add(`Component exceeds 255 characters: ${file}`)
      const prefix = components.slice(0, i + 1).join("/")
      const key = prefix.toLowerCase()
      if (seen.has(key) && seen.get(key) !== prefix) problems.add(`Case-insensitive collision: ${seen.get(key)} / ${prefix}`)
      else seen.set(key, prefix)
    }
  }
  return [...problems].sort()
}
