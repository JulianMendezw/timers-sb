# Release Versioning Skill

Use this skill every time you release or when you want to cut a new app version with an updated changelog.

## What it does

- Bumps `package.json` version using semantic versioning.
- Updates `CHANGELOG.md` from Conventional Commit history.
- Supports patch, minor, major, and first-release flows.

## Required commit style

Use Conventional Commits so changelog sections are generated correctly:

- `feat:` → Features
- `fix:` → Bug Fixes
- `refactor:` → Refactors
- `docs:` → Documentation
- `chore:` → Chores

## Commands

- Dry run: `npm run release:dry-run`
- Patch: `npm run release:patch`
- Minor: `npm run release:minor`
- Major: `npm run release:major`
- Initial changelog only: `npm run release:first`

## Typical release flow

1. Ensure all intended commits are present and follow Conventional Commit format.
2. Run `npm run release:minor` (or patch/major as needed).
3. Review generated `CHANGELOG.md` and version bump.
4. Push commit and tags to remote (`git push --follow-tags`).

## Local-only bump (no commit/tag)

Use this when you only want to update files without creating git artifacts yet:

- `npm run release:minor -- --skip.commit --skip.tag`
