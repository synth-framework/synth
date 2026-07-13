# Branch Protection

SYNTH uses GitHub branch protection rules on `main` to guarantee that every change passes the canonical governance pipeline before it can be merged.

## Required rules

Enable the following rules for the `main` branch in **Settings → Branches → Branch protection rules**:

| Rule | Reason |
|---|---|
| **Require a pull request before merging** | Forces review and discussion. |
| **Require approvals** → at least 1 | Prevents unilateral changes. |
| **Dismiss stale pull request approvals** | Ensures reviewers see the latest code. |
| **Require status checks to pass** | `Proof Gate` must pass before merge. |
| **Require branches to be up to date before merging** | Guarantees the merged result was tested. |
| **Require conversation resolution before merging** | All review threads must be resolved. |
| **Restrict pushes that create files** | Only allow merges through pull requests. |
| **Do not allow bypassing the above settings** | Applies to administrators too. |

## Verification

After enabling the rules, open a test pull request. The **Proof Gate** check should appear as required. The merge button must remain disabled until the check passes.

## Why this matters

Branch protection is the control boundary between human chaos and deterministic AI execution. No human — including maintainers — can publish to `main` without `npm run govern` succeeding.
