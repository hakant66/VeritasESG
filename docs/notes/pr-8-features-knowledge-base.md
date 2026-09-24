# PR-8: `features/knowledge-base` migration (C4)

## Structure

```
src/features/knowledge-base/
  api/
    kbRag.ts              # RAG chat, ingest, autofill APIs
    kbQueries.ts          # list + detail bootstrap reads
  hooks/
    useKnowledgeBaseListPageData.ts
    useKnowledgeBaseDetail.ts
    useKnowledgeChatPageData.ts
  lib/
    filterAccessibleKbs.ts
  pages/
    KnowledgeBasePage.tsx
    KnowledgeBaseDetailPage.tsx
    KnowledgeChatPage.tsx
```

## Query keys

- `['knowledge-base', 'list']`
- `['knowledge-base', 'detail', kbId]`
- `['knowledge-base', 'chat', userId]`

Invalidate with `queryClient.invalidateQueries({ queryKey: ['knowledge-base'] })`.

## Legacy imports

`src/lib/kbRag.ts` re-exports from `features/knowledge-base/api/kbRag` for `ProjectDetailPage`, customer modals, and tests.

## Verify

```bash
npm run test:client
npm run build
npm run smoke:ship
```

Manual: Bilgi Bankası list/create/edit, detail upload/re-index, chat scope filter and sample questions.
