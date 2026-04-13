# Changelog

## Unreleased

Added
- package-first quickstart and README guidance for external service adoption
- packaged starter templates for a minimal Express verifier route
- packaged sample request body and env template for copy-paste onboarding
- starter asset verification as part of `npm run verify:package`

Changed
- verifier onboarding docs now use package imports instead of repo-relative imports
- runtime and route docs now follow a straight-line install -> env -> route -> curl flow

## 0.1.0 - 2026-04-08

Added
- standalone verifier package skeleton
- packaged sandbox fixtures
- package dry-run verification flow
- store-backed replay protection helpers
- Redis and database replay store adapter surfaces
- Express and Fastify route sample references

Changed
- verifier expected context now supports proof freshness windows
- Noctu reference integration now uses a production-shaped handler/dependency split

Fixed
- compatibility runner can now emit a machine-readable certification report
