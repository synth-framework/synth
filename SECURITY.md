# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Synth, please report it privately.

**Do not open a public issue.**

Instead, use [GitHub Security Advisories](https://github.com/synth-dev/synth-v2/security/advisories/new) to submit a vulnerability report. Include:

- A description of the vulnerability
- Steps to reproduce
- Affected versions
- Possible impact
- Suggested mitigation if known

We will acknowledge receipt within 72 hours and provide a timeline for a fix.

## Security Model

Synth's security relies on:

- A single mutation authority (`ExecutionGate`)
- Immutable, hash-chained events
- Deterministic replay for integrity verification
- Frozen registries and policy after sealing

For details, see [TRUST-BOUNDARY.md](docs/architecture/trust-boundary.md) and the adversarial audit tests.
