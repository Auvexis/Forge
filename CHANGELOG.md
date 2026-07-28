# Changelog

All notable Fabric release changes are documented here.

## 0.1.0-alpha.7 - 2026-07-28

### Fixed

- Made additive workflow database migrations idempotent for existing local databases.
- Fixed startup failures caused by `duplicate column name: published_at` in partially migrated installations.

### Added

- Added workflow migration regression coverage for partially migrated SQLite schemas.
- Published alpha npm package as `@auvexis/fabric@0.1.0-alpha.7`.
- Published alpha Docker images for API, client and gateway.

### Verified

- API, client and gateway type-check/build passed.
- API Node test suite passed with `1034` passing tests and `1` skipped test.
- npm package smoke passed through the gateway at `/home` and `/profiles`.
- Docker production compose smoke passed through the gateway at `/`, `/home` and `/profiles`.
- npm audit reported `0` vulnerabilities from the root workspace lockfile.

### Notes

- Fabric is still alpha software.
- Use the `alpha` npm dist-tag or explicit Docker image tag for alpha deployments.
