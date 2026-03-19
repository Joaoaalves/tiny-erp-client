# Contributing

## Getting started

```bash
git clone https://github.com/your-org/tiny-erp-client
cd tiny-erp-client
npm install
```

## Development workflow

This project follows **Git Flow**:

| Branch | Purpose |
|---|---|
| `master` | Production releases only |
| `develop` | Integration branch — all features merge here |
| `feature/*` | New features and bug fixes |
| `release/*` | Release preparation (version bump, changelog) |

### Starting a feature

```bash
git checkout develop
git pull
git checkout -b feature/my-feature
```

### Finishing a feature

```bash
git checkout develop
git merge --no-ff feature/my-feature
git branch -d feature/my-feature
```

## Commands

```bash
npm run build          # compile to dist/
npm run dev            # watch mode
npm run test           # run tests once
npm run test:watch     # run tests in watch mode
npm run test:coverage  # run tests with coverage report
npm run typecheck      # type-check without emitting
npm run lint           # lint src/ and tests/
npm run lint:fix       # lint and auto-fix
npm run format         # format with Prettier
npm run docs:serve     # serve docs locally at localhost:3000
```

## Testing requirements

- **100% coverage** is required on all non-barrel source files.
- Tests live in `tests/` and mirror the `src/` structure.
- Use `vi.useFakeTimers()` for rate limiter tests.
- Use `vi.stubGlobal('fetch', ...)` or a stub `HttpClient` for HTTP tests.
- Never hit the real Tiny API in tests.

## Code standards

- **No `any`** — use `unknown` and narrow with guards.
- **English everywhere** — field names, comments, commit messages.
- **Portuguese → English translation** belongs in mappers, not endpoints.
- **Token safety** — the token must never appear in error messages or logs. Use `sanitizeUrl()` when constructing error messages that include URLs.
- **Conventional commits**: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`.

## Adding a new endpoint

1. Create `src/types/my-resource.ts` — define TypeScript interfaces (English names).
2. Create `src/mappers/my-resource.mapper.ts` — translate Tiny's PT fields → EN types.
3. Create `src/endpoints/my-resource/MyResourceEndpoint.ts` — implement methods using `RequestExecutor`.
4. Create `src/endpoints/my-resource/index.ts` — barrel export.
5. Register in `TinyClient.ts`.
6. Export public types from `src/index.ts`.
7. Write tests with 100% coverage.
8. Document in `docs/api-reference.md`.

## Pull request checklist

- [ ] All tests pass (`npm test`)
- [ ] Coverage is 100% (`npm run test:coverage`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] Formatted (`npm run format:check`)
- [ ] Changelog updated
- [ ] Docs updated if public API changed

## Releasing

Releases are prepared on a `release/*` branch:

```bash
git checkout develop
git checkout -b release/1.2.0

# bump version, update CHANGELOG.md
npm version 1.2.0 --no-git-tag-version

git commit -m "chore(release): prepare v1.2.0"
git checkout master
git merge --no-ff release/1.2.0
git tag v1.2.0

# back-merge into develop
git checkout develop
git merge --no-ff release/1.2.0
git branch -d release/1.2.0

npm publish
```
