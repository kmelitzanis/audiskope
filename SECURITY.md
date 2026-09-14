# Secret scanning

The **Secret scanning / Scan secrets** GitHub Actions check runs on every push, pull request and manual dispatch. It scans all fetched Git history with Gitleaks 8.30.1, downloaded from the official release and verified against a pinned SHA-256. The release workflow requires the same scan before proceeding.

This uses the MIT-licensed Gitleaks CLI, not the separately licensed gitleaks-action wrapper. It requires no license key or paid scanner service. GitHub Actions usage remains subject to your account's quotas. No dependencies from the application are installed or executed by the scanning job. Repository access is read-only, checkout credentials are not persisted, and findings are fully redacted in logs. Reports containing secret values are not uploaded.

In GitHub repository settings, add **Scan secrets** as a required status check in the main branch ruleset and require pull requests to prevent merging a failing scan. Workflow files should be reviewed like other security-sensitive code. CI executes after upload: it cannot prevent a secret from being pushed initially, and no scanner detects every kind of confidential information. Enable GitHub secret push protection where available for pre-upload protection; a local Gitleaks pre-commit check provides another layer.

If a secret is detected, revoke/rotate it at its provider first, remove it from the code, and review whether history cleanup is needed. A deletion commit does not remove the secret from history. Do not paste live credentials into issues or PR discussions, and do not add broad scan exclusions to silence findings. Review any narrowly scoped false-positive exception.

For a local scan with Gitleaks installed: `gitleaks git . --log-opts="--all" --redact=100`. To inspect staged changes before committing: `gitleaks git . --staged --redact=100`.

Upstream: https://github.com/gitleaks/gitleaks (MIT). The scanner is development/CI tooling and is not bundled with Audiskope.
