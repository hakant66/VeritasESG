/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { documentPublicId } from './questionIds.ts';
import { resolveProjectIdKeys } from './assignmentQuestionSync.ts';
import {
  listConsultantManagerUsers,
  listPlatformUsersMatchingIds,
  listProjectUserAssignmentsForKeys,
} from '../data/workflowDataAccess.ts';

export type AuditReviewNotifyRecipient = {
  id: string;
  email: string;
  name: string;
  roleLabel: string;
};

export async function resolveAuditReviewNotificationRecipients(
  projectId: string,
): Promise<AuditReviewNotifyRecipient[]> {
  const projectKeys = await resolveProjectIdKeys(projectId);
  const keys = projectKeys.length > 0 ? projectKeys : [projectId];

  const links = await listProjectUserAssignmentsForKeys(keys);

  const userIds = [...new Set(links.map((l) => String(l.userId || '').trim()).filter(Boolean))];
  if (userIds.length === 0) return [];

  const users = await listPlatformUsersMatchingIds(userIds);

  const userById = new Map<string, (typeof users)[number]>();
  for (const user of users) {
    const id = documentPublicId(user as { _id?: unknown; legacyFirebaseId?: string; id?: string });
    if (id) userById.set(id, user);
    if (user.legacyFirebaseId) userById.set(String(user.legacyFirebaseId), user);
    if (user._id) userById.set(String(user._id), user);
    if (user.id) userById.set(String(user.id), user);
  }

  const seenEmails = new Set<string>();
  const recipients: AuditReviewNotifyRecipient[] = [];

  const pushUser = (
    user: (typeof users)[number],
    roleLabel: string,
  ) => {
    const email = String(user.email || '').trim();
    if (!email || seenEmails.has(email.toLowerCase())) return;
    seenEmails.add(email.toLowerCase());
    recipients.push({
      id: documentPublicId(user as { _id?: unknown; legacyFirebaseId?: string; id?: string }),
      email,
      name: String(user.name || email).trim(),
      roleLabel,
    });
  };

  for (const link of links) {
    const user = userById.get(String(link.userId || '').trim());
    if (!user) continue;
    const platformRole = String(user.role || '').trim();
    const projectRole = String(link.role || '').trim();

    if (projectRole === 'admin') {
      pushUser(user, 'Proje Yöneticisi');
    }
    if (
      platformRole === 'consultant' ||
      projectRole === 'editor' ||
      projectRole === 'contributor'
    ) {
      pushUser(user, 'Danışman');
    }
    if (platformRole === 'consultant_manager') {
      pushUser(user, 'Danışman Yöneticisi');
    }
  }

  const consultantManagers = await listConsultantManagerUsers();
  for (const user of consultantManagers) {
    pushUser(user, 'Danışman Yöneticisi');
  }

  return recipients;
}
