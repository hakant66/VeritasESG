# PR-6 foundation: TanStack Query + shadcn/ui

## Added

- `src/app/providers.tsx` — `QueryClientProvider` wrapper
- `src/shared/ui/` — shadcn-style `Button`, `Input`, `Dialog`
- `src/shared/hooks/` — `useKbRagHealth`, `useLlmSettings` (+ save / Ollama mutations)
- `components.json` — shadcn CLI config for future components

## Pilot integration

- **Settings → LLM** panel uses Query for load/save and shows **KB RAG retrieval** status (`KbRagRetrievalStatus` + Dialog).

## Commands

```bash
npm run lint
npm run test:client
npm run smoke:ship
```

## Next (PR-7)

- Move Tasks to `src/features/tasks` and migrate data fetching to Query hooks.
