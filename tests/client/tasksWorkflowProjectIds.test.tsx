import { describe, expect, it } from 'vitest';
import {
  selectWorkflowAssignments,
  workflowProjectIdsFromAssignments,
} from '../../src/features/tasks/lib/workflowProjectIds';
import type { TasksPageBootstrap } from '../../src/features/tasks/api/tasksQueries';

const bootstrap: TasksPageBootstrap = {
  assignments: [
    {
      id: 'a1',
      projectId: 'p1',
      recipientId: 'user-1',
      questionIds: ['q1'],
      status: 'pending',
      sentAt: Date.now(),
    },
    {
      id: 'a2',
      projectId: 'p2',
      recipientId: 'user-2',
      questionIds: ['q2'],
      status: 'pending',
    },
  ],
  projects: [],
  myProjectAssignments: [],
  platformUsers: [],
  contacts: [],
};

describe('workflowProjectIds', () => {
  it('selects sent assignments for regular users', () => {
    const selected = selectWorkflowAssignments(bootstrap, { uid: 'user-1' }, {
      id: 'user-1',
      role: 'contributor',
      email: 'u@test.com',
      createdAt: '',
    });
    expect(selected.map((a) => a.id)).toEqual(['a1']);
    expect(workflowProjectIdsFromAssignments(selected)).toEqual(['p1']);
  });

  it('returns unique project ids', () => {
    const ids = workflowProjectIdsFromAssignments([
      { id: '1', projectId: 'p1', questionIds: [], status: 'pending' },
      { id: '2', projectId: 'p1', questionIds: [], status: 'pending' },
      { id: '3', projectId: 'p2', questionIds: [], status: 'pending' },
    ]);
    expect(ids).toEqual(['p1', 'p2']);
  });
});
