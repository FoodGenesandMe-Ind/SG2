# Design registry

The source of truth for which UI is allowed. Agents build only from entries marked **Approved**. Anything new is pitched as **Proposed**, built from existing tokens, and shown to Nephi in Storybook. Only Nephi moves an entry to Approved.

## Statuses

- **Proposed** — pitched, visible in Storybook with the `proposed` tag, not yet allowed in product screens except as part of the same pitch.
- **Approved** — allowed everywhere. Exported from `@sgp/ui`.
- **Deprecated** — do not use in new work; listed with its replacement.

## How an entry moves

1. Agent builds the component or pattern in `packages/ui` with a Storybook story tagged `proposed` and adds a row below.
2. Nephi reviews in Storybook (or inside a prototype screen) and gives notes.
3. When Nephi approves, the story tag changes to `approved`, the component is exported from `packages/ui/src/index.ts`, and the row below is updated with the date.

## Foundations

| Name | Status | Story | Notes | Approved on |
| --- | --- | --- | --- | --- |
| Design tokens (chrome color, default data palette, type, spacing, radius, density, motion) | Proposed | Foundations/Tokens | Placeholder values in `design/tokens/tokens.css`, awaiting the foundations pitch. Status colors are client data, not tokens. | |

## Components

| Name | Status | Story | Notes | Approved on |
| --- | --- | --- | --- | --- |

## Patterns and screens

| Name | Status | Location | Notes | Approved on |
| --- | --- | --- | --- | --- |
| Prototype index | Scaffolding | `apps/prototype/src/App.tsx` | Developer index only, not a product design | |
