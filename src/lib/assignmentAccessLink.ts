/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  isAssignmentOtpPlatformUser,
  isProjectContributorRole,
} from './userRoles';

/**
 * Firma / contributor platform kullanıcısı + proje rolü contributor → OTP giriş linki.
 * (respond veya /projects linki yerine)
 */
export function usesContributorOtpAssignmentLogin(
  platformRole: string | undefined,
  projectMemberRole: string | undefined,
): boolean {
  return (
    isAssignmentOtpPlatformUser(platformRole) &&
    isProjectContributorRole(projectMemberRole)
  );
}

export function buildContributorForceOtpLoginUrl(origin: string, email: string): string {
  const trimmed = email.trim();
  const params = new URLSearchParams();
  if (trimmed) params.set('email', trimmed);
  const qs = params.toString();
  return `${origin}/#/login/forceotp${qs ? `?${qs}` : ''}`;
}

export type AssignmentAccessLinkResult = {
  linkForEmail: string;
  /** Link shown in admin UI after send (empty = hide respond-style copy box). */
  generatedLinkForModal: string;
  usesOtpLogin: boolean;
};

export function resolveAssignmentAccessLink(opts: {
  origin: string;
  projectId: string;
  recipientEmail: string;
  recipientType: 'contact' | 'user';
  respondMagicLink: string;
  platformRole?: string;
  projectMemberRole?: string;
}): AssignmentAccessLinkResult {
  if (
    opts.recipientType === 'user' &&
    usesContributorOtpAssignmentLogin(opts.platformRole, opts.projectMemberRole)
  ) {
    const link = buildContributorForceOtpLoginUrl(opts.origin, opts.recipientEmail);
    return {
      linkForEmail: link,
      generatedLinkForModal: link,
      usesOtpLogin: true,
    };
  }

  if (opts.recipientType === 'contact' && opts.respondMagicLink) {
    return {
      linkForEmail: opts.respondMagicLink,
      generatedLinkForModal: opts.respondMagicLink,
      usesOtpLogin: false,
    };
  }

  const fallback = opts.respondMagicLink || `${opts.origin}/#/projects/${opts.projectId}`;
  return {
    linkForEmail: fallback,
    generatedLinkForModal: opts.respondMagicLink,
    usesOtpLogin: false,
  };
}
