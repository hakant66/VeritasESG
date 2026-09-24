/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LucideIcon } from 'lucide-react';
import {
  CircleUserRound,
  ClipboardCheck,
  Shield,
  ShieldCheck,
  User as UserIcon,
  UserRound,
  Users,
} from 'lucide-react';
import { normalizePlatformRole } from '../../lib/platformRoles.ts';
import { cn } from '../../lib/utils';

function watermarkForPlatformRole(role: string): {
  Icon: LucideIcon;
  colorClass: string;
} {
  switch (normalizePlatformRole(role)) {
    case 'customer':
      return { Icon: UserIcon, colorClass: 'text-emerald-100' };
    case 'consultant':
      return { Icon: CircleUserRound, colorClass: 'text-blue-100' };
    case 'consultant_manager':
      return { Icon: Shield, colorClass: 'text-indigo-100' };
    case 'auditor':
      return { Icon: ClipboardCheck, colorClass: 'text-amber-100' };
    case 'contributor':
      return { Icon: Users, colorClass: 'text-slate-100' };
    case 'platform_admin':
      return { Icon: ShieldCheck, colorClass: 'text-purple-100' };
    default:
      return { Icon: UserIcon, colorClass: 'text-slate-100' };
  }
}

type ProjectUserCardRoleWatermarkProps = {
  /** Platform user role, or omit for customer stakeholder cards */
  platformRole?: string;
  variant: 'platform' | 'stakeholder';
};

export function ProjectUserCardRoleWatermark({
  platformRole = '',
  variant,
}: ProjectUserCardRoleWatermarkProps) {
  const { Icon, colorClass } =
    variant === 'stakeholder'
      ? { Icon: UserRound, colorClass: 'text-teal-100' }
      : watermarkForPlatformRole(platformRole);

  return (
    <Icon
      size={80}
      aria-hidden
      className={cn(
        'pointer-events-none absolute -right-4 -bottom-4 -rotate-12 opacity-75 transition-transform duration-500 group-hover:rotate-0',
        colorClass,
      )}
    />
  );
}
