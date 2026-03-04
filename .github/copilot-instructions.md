# Copilot Instructions

When creating or modifying UI components in this repository, follow Atomic Design by default.

## Reusable-first rule (required)

- Always check if the UI can be composed from existing atoms/molecules before creating a new component.
- If repeated markup/behavior appears in 2+ places, extract it into the lowest valid atomic level.
- Favor generic, prop-driven APIs over feature-specific hardcoded variants.
- Keep styles and naming reusable (avoid feature-only class names in shared atoms/molecules).

## Atomic design rules (required)

- Place components by responsibility:
  - **Atoms**: Small, reusable primitives (`src/components/atoms/`)
  - **Molecules**: Compositions of atoms for a focused UI function (`src/components/molecules/`)
  - **Organisms**: Larger feature sections composed of atoms/molecules (`src/components/organisms/`)
- Do not put feature-heavy or multi-purpose UI in `atoms`.
- Prefer reusing existing atoms before creating new molecules/organisms.

## For every new component

- Choose the **lowest valid atomic level** (atom first, then molecule, then organism).
- Keep one component per folder when styles are colocated.
- Create colocated style files (`.scss`) only when needed, matching existing project style.
- Keep props explicit and strongly typed in TypeScript.
- Avoid business/data-fetching logic inside atoms and most molecules; keep that in hooks/lib or parent organisms.
- Keep components presentational and reusable unless they are explicitly feature-organisms.

## Naming and structure

- Use PascalCase component names and file names (for example: `StatusBadge.tsx`).
- Keep folder names clear and feature-oriented.
- Export components in a way consistent with nearby components in the same atomic layer.

## PR quality checks Copilot must apply

- Verify the chosen layer is correct (atom/molecule/organism).
- Confirm no duplicate component exists at the same layer.
- Confirm imports flow upward (atoms can be used by molecules/organisms; organisms should not be imported into atoms).
- Keep edits minimal and consistent with existing styling and architecture.
