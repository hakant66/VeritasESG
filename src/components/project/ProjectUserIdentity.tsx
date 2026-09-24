/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { Camera } from 'lucide-react';
import { cn, formatPersonName } from '../../lib/utils';

function initialsFromName(name: string) {
  if (!name?.trim()) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export type ProjectUserIdentityProps = {
  name: string;
  email?: string;
  roleLabel: string;
  avatarUrl?: string | null;
  editable?: boolean;
  onAvatarClick?: () => void;
  avatarTitle?: string;
  avatarBadge?: ReactNode;
  nameExtras?: ReactNode;
  className?: string;
  /** Name → email → "Kullanıcı Rolü : …" (project users tab) */
  stackedUserInfo?: boolean;
  roleLabelPrefix?: string;
  /** Shown after role label (e.g. customer company name). */
  roleSuffix?: string | null;
  roleLabelClassName?: string;
  /** Denser avatar and typography for list rows */
  compact?: boolean;
};

export function ProjectUserIdentity({
  name,
  email,
  roleLabel,
  avatarUrl,
  editable = false,
  onAvatarClick,
  avatarTitle,
  avatarBadge,
  nameExtras,
  className,
  stackedUserInfo = false,
  roleLabelPrefix,
  roleSuffix,
  roleLabelClassName,
  compact = false,
}: ProjectUserIdentityProps) {
  const displayName = formatPersonName(name);
  const avatarClasses = cn(
    'relative shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100',
    compact ? 'h-9 w-9' : 'h-12 w-12 rounded-xl',
    editable &&
      onAvatarClick &&
      'group/avatar cursor-pointer transition-shadow hover:ring-2 hover:ring-slate-300',
  );

  const avatarContent = (
    <>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
          {initialsFromName(name)}
        </span>
      )}
      {editable && onAvatarClick && (
        <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white opacity-0 transition-all group-hover/avatar:bg-slate-900/45 group-hover/avatar:opacity-100">
          <Camera size={14} strokeWidth={2} />
        </span>
      )}
      {avatarBadge}
    </>
  );

  return (
    <div className={cn('flex min-w-0 items-center', compact ? 'gap-2.5' : 'gap-3', className)}>
      {editable && onAvatarClick ? (
        <button type="button" onClick={onAvatarClick} title={avatarTitle} className={avatarClasses}>
          {avatarContent}
        </button>
      ) : (
        <div className={avatarClasses}>{avatarContent}</div>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        {stackedUserInfo ? (
          <>
            <p
              className={cn(
                'flex flex-wrap items-center gap-2 font-bold leading-snug text-slate-900',
                compact ? 'text-[13px]' : 'text-sm',
              )}
            >
              <span className="min-w-0 truncate">{displayName}</span>
              {nameExtras}
            </p>
            {email ? (
              <p
                className={cn(
                  'truncate font-medium leading-snug text-slate-600 normal-case',
                  compact ? 'text-[11px]' : 'text-sm',
                )}
              >
                {email}
              </p>
            ) : null}
            {roleLabel ? (
              <p
                className={cn(
                  'font-medium leading-snug normal-case',
                  compact ? 'text-[10px]' : 'text-xs',
                  roleLabelClassName ?? 'text-slate-500',
                )}
              >
                {roleLabelPrefix}
                {roleLabel}
                {roleSuffix ? (
                  <span className="text-slate-600"> · {roleSuffix}</span>
                ) : null}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold leading-snug text-slate-900">
              <span className="min-w-0 truncate">{displayName}</span>
              {nameExtras}
            </p>
            <p className="truncate text-[10px] font-bold uppercase leading-none tracking-widest text-slate-400">
              {roleLabel}
            </p>
            {email ? (
              <p className="truncate text-[10px] font-medium leading-snug text-slate-400 normal-case">
                {email}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
