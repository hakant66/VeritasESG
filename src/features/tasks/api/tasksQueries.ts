/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as DB from '../../../services/db.ts';
import type {
  Answer,
  Assignment,
  Contact,
  PlatformUser,
  Project,
  ProjectUserAssignment,
  Question,
} from '../../../types';

export type TasksPageBootstrap = {
  assignments: Assignment[];
  projects: Project[];
  myProjectAssignments: ProjectUserAssignment[];
  platformUsers: PlatformUser[];
  contacts: Contact[];
};

export type TasksWorkflowData = {
  questionsByProject: Record<string, Question[]>;
  answersByProject: Record<string, Answer[]>;
};

export async function fetchTasksPageBootstrap(userId: string): Promise<TasksPageBootstrap> {
  const [assignments, projects, myProjectAssignments, platformUsers, contacts] = await Promise.all([
    DB.assignments.listAll(),
    DB.projects.list(),
    DB.projects.listAllUserAssignments(userId),
    DB.platformUsers.list(),
    DB.contacts.listAll(),
  ]);
  return {
    assignments,
    projects,
    myProjectAssignments,
    platformUsers,
    contacts,
  };
}

export async function fetchTasksWorkflowData(projectIds: string[]): Promise<TasksWorkflowData> {
  if (projectIds.length === 0) {
    return { questionsByProject: {}, answersByProject: {} };
  }

  const uniqueIds = [...new Set(projectIds.filter(Boolean))];
  const questionsByProject: Record<string, Question[]> = {};
  const answersByProject: Record<string, Answer[]> = {};

  await Promise.all(
    uniqueIds.map(async (projectId) => {
      const [project, answerList] = await Promise.all([
        DB.projects.get(projectId),
        DB.projects.listAnswers(projectId),
      ]);
      answersByProject[projectId] = answerList;
      questionsByProject[projectId] = await DB.questions.listForProject(
        projectId,
        project?.templateId,
      );
    }),
  );

  return { questionsByProject, answersByProject };
}
