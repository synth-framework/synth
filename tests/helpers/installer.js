// ============================================================
// TEST HELPERS — Installer CLI runner
// ============================================================
// Shared runner for scripts/install.sh tests (installer-contract,
// installer-environment, installer-engine, installer-upgrade). Single home
// for the identical runInstaller blocks (expedition 7a79e79b, round 11/110).
//
// The base URL points at an unroutable address so engine/upgrade retry
// tests never touch the network; contract/environment assertions (help,
// profile output) are unaffected by the extra variable.
//
// Usage:
//   import { INSTALLER_PATH, runInstaller } from "./helpers/installer.js"
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs"
import path from "path"
import { makeTempDirSync } from "./workspace.js"

export const INSTALLER_PATH = path.resolve(process.cwd(), "scripts", "install.sh")

/**
 * Engine/upgrade-scoped runner: never touches the network (unroutable base
 * URL) unless the caller overrides it via env.
 */
export function runEngineInstaller(args = [], env = {}, timeout = 60000) {
  return runInstaller(args, env, timeout, { baseUrl: "http://localhost:1" })
}

/**
 * Build a fake npm executable that simulates install/uninstall/version
 * behavior. Superset of the per-file createFakeNpm copies:
 * - attempts/retry simulation always armed (maxFail/permanentFail; unused
 *   callers observe identical success paths)
 * - installed-stub version defaults to synthVersion ("2.0.0-rc.1", matching
 *   the old fixed stubs); pass versionFromTarget for upgrade tests that
 *   parse the version from the install target.
 */
export function createFakeNpm(options = {}) {
  const { prefix, synthVersion = "2.0.0-rc.1", viewVersion = "2.0.0-rc.1", maxFail = 0, permanentFail = false, versionFromTarget = false } = options
  const dir = makeTempDirSync("synth-installer-fake-npm-")
  const logFile = path.join(dir, "npm.log")
  const attemptsFile = path.join(dir, "attempts")

  const stubInstall = versionFromTarget
    ? ``
    : `if [ -n "$FAKE_NPM_PREFIX" ]; then
    mkdir -p "$FAKE_NPM_PREFIX/bin"
    cat > "$FAKE_NPM_PREFIX/bin/synth" <<'INNEREOF'
#!/usr/bin/env bash
if [ "$1" = "--version" ] || [ "$1" = "version" ]; then
  echo "synth ${synthVersion}"
  exit 0
fi
if [ "$1" = "init" ]; then
  mkdir -p .synth
  echo '{"status":"ok"}' > .synth/manifest.json
  echo '{"status":"ok","message":"initialized"}'
  exit 0
fi
if [ "$1" = "doctor" ]; then
  echo '{"status":"ok","name":"synth","version":"${synthVersion}","healthy":true,"checks":{"node":{"ok":true},"binary":{"ok":true},"version":{"ok":true},"manifest":{"ok":true}}}'
  exit 0
fi
echo "Unknown synth command: $1" >&2
exit 1
INNEREOF
    chmod +x "$FAKE_NPM_PREFIX/bin/synth"
  fi`

  const script = `#!/usr/bin/env bash
set -euo pipefail
FAKE_NPM_LOG="${logFile}"
FAKE_NPM_ATTEMPTS="${attemptsFile}"
FAKE_NPM_PREFIX="${prefix || ""}"
FAKE_SYNTH_VERSION="${synthVersion}"
FAKE_NPM_MAX_FAIL="${maxFail}"
FAKE_NPM_PERMANENT_FAIL="${permanentFail ? "true" : "false"}"

echo "$@" >> "$FAKE_NPM_LOG"

if [ "$1" = "--version" ]; then
  echo "10.0.0"
  exit 0
fi

if [ "$1" = "view" ]; then
  echo "${viewVersion}"
  exit 0
fi

if [ "$1" = "config" ] && [ "\${2:-}" = "get" ] && [ "\${3:-}" = "prefix" ]; then
  if [ -n "$FAKE_NPM_PREFIX" ]; then
    echo "$FAKE_NPM_PREFIX"
  else
    echo "/usr/local"
  fi
  exit 0
fi

if [ "$1" = "uninstall" ]; then
  if [ -n "$FAKE_NPM_PREFIX" ] && [ -f "$FAKE_NPM_PREFIX/bin/synth" ]; then
    rm -f "$FAKE_NPM_PREFIX/bin/synth"
  fi
  exit 0
fi

attempt=$(cat "$FAKE_NPM_ATTEMPTS" 2>/dev/null || echo 0)
attempt=$((attempt + 1))
echo "$attempt" > "$FAKE_NPM_ATTEMPTS"

if [ "$FAKE_NPM_PERMANENT_FAIL" = "true" ]; then
  echo "Simulated permanent failure" >&2
  exit 1
fi

if [ "$FAKE_NPM_MAX_FAIL" != "" ] && [ "$FAKE_NPM_MAX_FAIL" != "0" ] && [ "$attempt" -le "$FAKE_NPM_MAX_FAIL" ]; then
  echo "Simulated network failure (attempt $attempt)" >&2
  exit 1
fi
${versionFromTarget ? `
# Parse target version from install command
if [ "$1" = "install" ]; then
  target="\${@: -1}"
  installed_version="2.0.0"
  case "$target" in
    *@*) installed_version="\${target##*@}" ;;
  esac

  if [ -n "$FAKE_NPM_PREFIX" ]; then
    mkdir -p "$FAKE_NPM_PREFIX/bin"
    {
      printf '#!/usr/bin/env bash\\n'
      printf 'if [ "$1" = "--version" ] || [ "$1" = "version" ]; then\\n'
      printf '  echo "synth %s"\\n' "$installed_version"
      printf '  exit 0\\n'
      printf 'fi\\n'
      printf 'if [ "$1" = "init" ]; then\\n'
      printf '  mkdir -p .synth\\n'
      printf '  echo '"'"'{"status":"ok"}'"'"' > .synth/manifest.json\\n'
      printf '  echo '"'"'{"status":"ok","message":"initialized"}'"'"'\\n'
      printf '  exit 0\\n'
      printf 'fi\\n'
      printf 'if [ "$1" = "doctor" ]; then\\n'
      printf '  echo '"'"'{"status":"ok","name":"synth","version":"%s","healthy":true,"checks":{"node":{"ok":true},"binary":{"ok":true},"version":{"ok":true},"manifest":{"ok":true}}}'"'"'\\n' "$installed_version"
      printf '  exit 0\\n'
      printf 'fi\\n'
      printf 'echo "Unknown synth command: $1" >&2\\n'
      printf 'exit 1\\n'
    } > "$FAKE_NPM_PREFIX/bin/synth"
    chmod +x "$FAKE_NPM_PREFIX/bin/synth"
  fi
fi
` : ``}
${stubInstall}

exit 0
`

  fs.writeFileSync(path.join(dir, "npm"), script, { mode: 0o755 })
  return { dir, logFile, attemptsFile }
}

/** Run scripts/install.sh via bash and return split streams + status. */
export function runInstaller(args = [], env = {}, timeout = 60000, { baseUrl } = {}) {
  const result = spawnSync("bash", [INSTALLER_PATH, ...args], {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: {
      ...process.env,
      ...(baseUrl ? { SYNTH_INSTALLER_BASE_URL: baseUrl } : {}),
      ...env,
    },
    timeout,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
    error: result.error ?? null,
  }
}
