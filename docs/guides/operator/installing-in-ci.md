---
Title: Installing Synth in CI
Domain: operator
Audience: operators
Prerequisites: none
Knowledge Establishes: How to install and verify Synth in a CI environment
Depends On: ../operator/01-getting-started.md
Builds Toward: continuous-publication.md
Version: 2.0.0
Status: stable
---

# Installing Synth in CI

Synth is designed to run in CI as deterministically as it runs locally. The recommended approaches are the bootstrap installer or a direct npm install.

## Bootstrap installer

```yaml
- name: Install Synth
  run: curl -fsSL https://synth-framework.github.io/synth/install.sh | sh

- name: Verify installation
  run: |
    synth --version
    synth doctor
```

## npm install

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"

- name: Install Synth
  run: npm install -g @synth-framework/synth

- name: Verify installation
  run: |
    synth --version
    synth doctor
```

## Full example: validate a Synth project

```yaml
name: Validate
on: [push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Synth
        run: curl -fsSL https://synth-framework.github.io/synth/install.sh | sh

      - name: Validate
        run: synth validate --full
```

## Notes

- The bootstrap installer requires `curl` and a POSIX-compatible shell.
- Node.js >= 20 is required.
- If you use a custom installer base URL, set the `SYNTH_INSTALLER_BASE_URL` environment variable.
