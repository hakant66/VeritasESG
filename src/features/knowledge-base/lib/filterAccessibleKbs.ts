/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { knowledgeBases, projects } from '../../../services/db.ts';
import {
  knowledgeBaseDomainIds,
  type KnowledgeBase,
  type PlatformUser,
  type Project,
} from '../../../types';

export function filterAccessibleKnowledgeBases(
  allKbs: KnowledgeBase[],
  profile: PlatformUser | null | undefined,
  userProjects: Project[],
): KnowledgeBase[] {
  const domainIds = Array.from(new Set(userProjects.flatMap((p) => p.domainIds || [])));

  return allKbs.filter((kb) => {
    if (profile?.role === 'platform_admin') return true;
    if (kb.customerId && kb.customerId === profile?.customerId) return true;
    if (kb.projectId && userProjects.some((p) => p.id === kb.projectId)) return true;

    const kbDoms = knowledgeBaseDomainIds(kb);
    if (kbDoms.length > 0 && kbDoms.some((id) => domainIds.includes(id))) return true;

    if (!kb.customerId && !kb.projectId && kbDoms.length === 0) return true;

    return false;
  });
}

export async function fetchKnowledgeChatPageData(
  userId: string,
  profile: PlatformUser | null | undefined,
): Promise<{ availableKbs: KnowledgeBase[]; userProjects: Project[] }> {
  const isAdminUser = profile?.role === 'platform_admin';
  const allKbs = await knowledgeBases.list(isAdminUser ? undefined : profile?.customerId);
  const userProjects = await projects.list(userId, profile?.customerId);
  const availableKbs = filterAccessibleKnowledgeBases(allKbs, profile, userProjects);
  return { availableKbs, userProjects };
}
