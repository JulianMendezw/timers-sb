# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Component Scaffolding (Atomic Design)

Create new components with atomic layer placement using:

```bash
npm run scaffold:component -- --level atom --name StatusBadge
```

Options:

- `--level` (required): `atom`, `molecule`, or `organism`
- `--name` (required): component name (for example, `StatusBadge`)
- `--folder` (optional): folder name override under the atomic level
- `--no-style` (optional): skip `.scss` file creation

Generated path format:

- `src/components/<atoms|molecules|organisms>/<folder>/<ComponentName>.tsx`
- `src/components/<atoms|molecules|organisms>/<folder>/<ComponentName>.scss`

## Team Checklist (Atomic + Reusable-First)

- Start with reuse: check existing atoms/molecules before creating new UI.
- If markup/behavior repeats in 2+ places, extract to the lowest valid layer.
- Keep components prop-driven and presentational (feature/data logic in hooks or parent organisms).
- Keep styles colocated with each component (`Component.tsx` + `Component.scss`).
- Keep naming consistent: PascalCase component/file names, clear folder names.
- Keep dependency direction correct: atoms → molecules → organisms.

Recommended creation flow:

1. Scaffold at the lowest valid layer:

  ```bash
  npm run scaffold:component -- --level atom --name StatusBadge
  ```

2. Implement generic props first (avoid feature-specific hardcoding).
3. Move shared styles into the component’s own `.scss` file.
4. Compose upward (organisms should assemble molecules/atoms).
5. Validate before merge:

  ```bash
  npm run build
  npm run lint
  ```

## Releases and Changelog

This project uses **automated versioning** with conventional commits. When you merge to `main`, the version and changelog are automatically updated based on your commit messages.

### How It Works

1. **Use conventional commit messages** in your feature branches:
  - `fix:` → patch version bump (1.0.0 → 1.0.1)
  - `feat:` → minor version bump (1.0.0 → 1.1.0)
  - `BREAKING CHANGE:` → major version bump (1.0.0 → 2.0.0)
  - `refactor:`, `docs:`, `chore:` → included in changelog, patch bump

2. **Merge to `main`** → GitHub Actions automatically:
  - Analyzes all commits since the last release
  - Determines the version bump (patch/minor/major)
  - Updates `package.json` and `CHANGELOG.md`
  - Creates a git tag and pushes everything
  - Triggers Netlify deployment

### Commit Message Examples

```bash
git commit -m "feat: add new timer pause functionality"
git commit -m "fix: resolve timer display bug"
git commit -m "refactor: simplify product rotation logic"
git commit -m "feat: add export feature

BREAKING CHANGE: changes API response format"
```

### Manual Override (Optional)

If you need to manually trigger a release or run locally:

```bash
npm run release:dry-run    # Preview changes
npm run release:patch      # Force patch release
npm run release:minor      # Force minor release
npm run release:major      # Force major release
```

Or trigger manually via GitHub Actions tab with version override.

### Reference

- `.github/skills/release-versioning/SKILL.md`
- Workflow file: `.github/workflows/release.yml`
- Config: `.versionrc.json`
