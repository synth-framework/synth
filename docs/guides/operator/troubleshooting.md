---
Title: Troubleshooting
Domain: operator
Audience: operators
Prerequisites: none
Knowledge Establishes: How to diagnose and recover from common installation and first-run issues
Depends On: ../operator/01-getting-started.md
Builds Toward: 12-faq.md
Version: 2.0.0
Status: stable
---

# Troubleshooting

This guide covers common issues when installing or first running Synth.

## Installation

### `curl` reports a 404 for the installer

The bootstrap installer is published to GitHub Pages. If the installer URL returns 404:

- Verify the base URL. The default is `https://synth-framework.github.io/synth/install.sh`.
- Check that the repository's GitHub Pages deployment completed after the latest merge to `main`.
- If your organization uses a custom domain, set the `SYNTH_INSTALLER_BASE_URL` environment variable.

### `synth` is not found after installation

The installer adds the Synth binary to npm's global `bin` directory. If your shell cannot find `synth`:

1. Ensure npm's global `bin` directory is on your `PATH`.
2. Reload your shell configuration:
   ```bash
   hash -r        # bash/zsh
   rehash         # zsh
   ```
3. If you installed with a custom prefix, ensure that prefix's `bin` directory is on your `PATH`.

### `synth doctor` reports unhealthy

Run `synth doctor` and check which check failed:

- **node** — Ensure Node.js >= 20 is installed.
- **binary** — Re-run the installer or install with `npm install -g @synth-framework/synth`.
- **version** — The installed binary may be corrupted. Reinstall.
- **manifest** — You are not inside a Synth project. Run `synth init` first.

### npm install fails behind a proxy

If the bootstrap installer cannot reach npm:

- Use npm directly with your proxy configuration:
  ```bash
  npm config set proxy http://proxy.example.com:8080
  npm install -g @synth-framework/synth
  ```
- Or set `HTTPS_PROXY` before running the installer.

## First run

### `synth init` fails

- Ensure you have write permission in the current directory.
- Check that `node` is available and meets the minimum version.
- Remove any partial `.synth/` directory and try again.

### `synth validate` reports unknown changes

- Run `synth explain replay` to verify the current state matches the event history.
- If the event log is corrupt, restore from backup or re-initialize the project.

## CI / GitHub Actions

See [Continuous Publication](continuous-publication.md) for the canonical CI setup. If installation in CI fails:

- Use the bootstrap installer or `npm install -g @synth-framework/synth`.
- Ensure the runner has Node.js >= 20.
- Cache `~/.npm` between runs to speed up installs.
