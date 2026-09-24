# PR-7: `features/tasks` migration (C3)

## Structure

```
src/features/tasks/
  api/
    assignmentManage.ts   # PATCH/DELETE/resend assignment APIs
    tasksQueries.ts       # bootstrap + workflow DB reads
  hooks/
    useTasksPageData.ts
    useTasksWorkflowData.ts
    useAssignmentMutations.ts
  lib/
    workflowProjectIds.ts
  components/             # moved from src/components/tasks/*
  pages/
    TasksPage.tsx
```

## Query keys

- `['tasks', 'page-bootstrap', userId]`
- `['tasks', 'workflow', ...projectIds]`

Invalidate with `queryClient.invalidateQueries({ queryKey: ['tasks'] })`.

## Legacy imports

`src/lib/assignmentManageApi.ts` re-exports from `features/tasks/api/assignmentManage` for `ProjectDetailPage`.

## Verify

```bash
npm run test:client
npm run build
npm run smoke:ship
```

Manual: Görevlerim list, expand assignment, manage modal save, my-tasks workflow tabs refresh.
