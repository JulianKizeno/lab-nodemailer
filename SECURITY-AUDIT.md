# Security review — 2026-11-14

This is a partial remediation, not a certification that the repository is free of vulnerabilities. Changes remain in a draft pull request pending review.

## .

npm findings before: {"info": 0, "low": 7, "moderate": 17, "high": 34, "critical": 11, "total": 69}. After remediation: {"info": 0, "low": 0, "moderate": 1, "high": 0, "critical": 0, "total": 1}.
Counts refer to dependency findings in this project, including development dependencies. Projects without a committed lockfile were first resolved to create an auditable baseline.

Real HTTP/MongoDB authentication integration tests: PASS.

Application startup and HTTP rendering smoke check: PASS.

### Remaining advisories

- `hbs`: moderate; no fix offered by npm. https://github.com/advisories/GHSA-7f5c-rpf4-86p8

Do not treat compatible lockfile updates as completion of the framework migrations above.
