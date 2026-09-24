import type { ReactNode } from 'react';
import {
  CircleOff,
  MousePointerClick,
  PenLine,
  UserPlus,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type FormsNotSentCalloutLabels = {
  notSentCalloutIntroTitle: string;
  notSentCalloutIntroDescription: string;
  notSentGoToAssignmentsTab: string;
  notSentAssignmentGuideBulk: string;
  notSentAssignmentGuideOr: string;
  notSentAssignmentGuideOpenAssign: string;
  notSentCalloutOnBehalfSectionTitle: string;
  notSentCalloutOnBehalfSectionHint: string;
  quickAssignOpenButton: string;
  quickAssignOpenButtonNamed: string;
  quickAssignOpenButtonNamedTooltip: string;
  enterResponseOnBehalf: string;
};

type FormsNotSentQuestionCalloutProps = {
  labels: FormsNotSentCalloutLabels;
  showOnBehalfBtn: boolean;
  showQuickAssignBtn: boolean;
  quickAssignRecipientName: string | null;
  onGoToAssignmentsTab: () => void;
  onOnBehalf: () => void;
  onQuickAssign: () => void;
  className?: string;
};

const actionBtnClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors';

function CompactAction({
  label,
  onClick,
  icon,
  className,
  title,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={cn(actionBtnClass, className)}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function FormsNotSentQuestionCallout({
  labels,
  showOnBehalfBtn,
  showQuickAssignBtn,
  quickAssignRecipientName,
  onGoToAssignmentsTab,
  onOnBehalf,
  onQuickAssign,
  className,
}: FormsNotSentQuestionCalloutProps) {
  const quickAssignLabel = quickAssignRecipientName
    ? labels.quickAssignOpenButtonNamed.replace('{name}', quickAssignRecipientName)
    : labels.quickAssignOpenButton;

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-2 rounded-lg border border-amber-200/80 bg-amber-50/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <CircleOff size={15} className="mt-0.5 shrink-0 text-amber-700" strokeWidth={2} aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">{labels.notSentCalloutIntroTitle}</p>
          <p className="text-[11px] leading-snug text-slate-600 line-clamp-2 sm:line-clamp-1">
            {labels.notSentCalloutIntroDescription}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
        <CompactAction
          label={labels.notSentGoToAssignmentsTab}
          onClick={onGoToAssignmentsTab}
          icon={<UserPlus size={13} strokeWidth={2.5} aria-hidden />}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        />

        {showQuickAssignBtn ? (
          <CompactAction
            label={quickAssignLabel}
            title={
              quickAssignRecipientName
                ? labels.quickAssignOpenButtonNamedTooltip
                : undefined
            }
            onClick={onQuickAssign}
            icon={<MousePointerClick size={13} strokeWidth={2.5} aria-hidden />}
            className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50"
          />
        ) : null}

        {showOnBehalfBtn ? (
          <CompactAction
            label={labels.enterResponseOnBehalf}
            onClick={onOnBehalf}
            icon={<PenLine size={13} strokeWidth={2.5} aria-hidden />}
            className="border-blue-300 bg-blue-600 text-white hover:bg-blue-700"
          />
        ) : null}
      </div>
    </div>
  );
}
