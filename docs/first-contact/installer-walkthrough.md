> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive-b/) (Archive B, hardened pipeline). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — Installer Walkthrough Projection

First-contact copy shown after installation. Derived from the commands executed in Episode 8 of the canonical journey.

## Welcome

SYNTH is installed. The fastest way to understand it is to walk through one complete Mission, recorded end to end.

## Your first five minutes

1. **Install SYNTH.**

   ```
   curl -fsSL https://synth.dev/install.sh | sh
   ```

2. **Verify installation health.**

   ```
   synth doctor
   ```

3. **Initialize a new SYNTH project.**

   ```
   synth init
   ```

4. **Create the user's first Mission.**

   ```
   synth mission create --subject "Space Mission Tracker" --purpose "Track missions, crew, and launch windows."
   ```

## What happened?

You just created your first Mission. SYNTH recorded every command as an immutable Event. Run `synth explain replay` at any time to prove the current State matches the event history.
