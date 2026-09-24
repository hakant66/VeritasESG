/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Paperclip } from 'lucide-react';
import type { Answer, Assignment, Question } from '../../types';
import { cn } from '../../lib/utils';

const TOOLTIP_WIDTH_PX = 340;
const TOOLTIP_GAP_PX = 12;
const TOOLTIP_MAX_HEIGHT_PX = 360;

function personInitials(name: string): string {
  if (!name?.trim()) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

type TooltipAnchor = {
  x: number;
  y: number;
  placeAbove: boolean;
  maxHeight: number;
};

export type PlanGanttBarStatus = 'completed' | 'overdue' | 'active';

export type PlanGanttAssignmentBarLabels = {
  question: string;
  noResponseYet: string;
  tasksCount: string;
};

export type PlanGanttAssignmentBarProps = {
  assignments: Assignment[];
  questionIds: string[];
  recipientId: string;
  startPct: number;
  durationPct: number;
  bDate: number;
  dDate: number;
  barStatus: PlanGanttBarStatus;
  recipientName: string;
  recipientAvatarUrl?: string;
  statusSubtitle: string;
  questions: Question[];
  answers: Answer[];
  dateLocale: string;
  labels: PlanGanttAssignmentBarLabels;
  isSelected?: boolean;
  onBarClick: () => void;
};

export function PlanGanttAssignmentBar({
  assignments,
  questionIds,
  recipientId,
  startPct,
  durationPct,
  bDate,
  dDate,
  barStatus,
  recipientName,
  recipientAvatarUrl,
  statusSubtitle,
  questions,
  answers,
  dateLocale,
  labels,
  isSelected = false,
  onBarClick,
}: PlanGanttAssignmentBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<TooltipAnchor | null>(null);

  const updateAnchor = useCallback(() => {
    const el = barRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const halfW = TOOLTIP_WIDTH_PX / 2;
    const x = Math.min(
      window.innerWidth - halfW - 12,
      Math.max(halfW + 12, rect.left + rect.width / 2),
    );

    const spaceAbove = rect.top - TOOLTIP_GAP_PX;
    const spaceBelow = window.innerHeight - rect.bottom - TOOLTIP_GAP_PX;
    const placeAbove = spaceAbove >= spaceBelow && spaceAbove > 96;
    const available = placeAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(
      TOOLTIP_MAX_HEIGHT_PX,
      Math.max(96, available - 8),
    );

    setAnchor({
      x,
      y: placeAbove ? rect.top - TOOLTIP_GAP_PX : rect.bottom + TOOLTIP_GAP_PX,
      placeAbove,
      maxHeight,
    });
  }, []);

  const hideTooltip = useCallback(() => setAnchor(null), []);

  useEffect(() => {
    if (!anchor) return;
    const onReposition = () => updateAnchor();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [anchor, updateAnchor]);

  const taskLabel = labels.tasksCount.replace('{count}', String(questionIds.length));

  const findAnswerForQuestion = (qId: string): Answer | undefined => {
    const assignmentIds = new Set(assignments.map((a) => a.id));
    return (
      answers.find(
        (a) => assignmentIds.has(a.assignmentId) && a.questionId === qId,
      ) ??
      answers.find((a) => a.contactId === recipientId && a.questionId === qId)
    );
  };

  return (
    <>
      <div
        className="relative flex min-h-[4.5rem] flex-1 items-center bg-white/20 p-4"
        onMouseEnter={updateAnchor}
        onMouseLeave={hideTooltip}
        onFocus={updateAnchor}
        onBlur={hideTooltip}
      >
        <div
          ref={barRef}
          role="button"
          tabIndex={0}
          className={cn(
            'relative z-10 flex h-8 cursor-pointer items-center rounded-md border px-3 shadow-sm transition-all hover:z-[50] hover:scale-[1.02] active:scale-100',
            isSelected && 'ring-2 ring-slate-900 ring-offset-2',
            barStatus === 'completed'
              ? 'border-green-600 bg-green-500 text-white'
              : barStatus === 'overdue'
                ? 'animate-pulse border-red-500 bg-red-400 text-white'
                : 'border-blue-600 bg-blue-500 text-white',
          )}
          onClick={onBarClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onBarClick();
            }
          }}
          style={{
            marginLeft: `${startPct * 100}%`,
            width: `${durationPct * 100}%`,
          }}
        >
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-bold uppercase tracking-widest">
            {taskLabel}{' '}
            {new Date(bDate).toLocaleDateString(dateLocale, {
              day: 'numeric',
              month: 'short',
            })}{' '}
            →{' '}
            {new Date(dDate).toLocaleDateString(dateLocale, {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      </div>

      {anchor
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[10050] w-[min(21.25rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl"
              style={{
                left: anchor.x,
                top: anchor.y,
                transform: anchor.placeAbove
                  ? 'translate(-50%, -100%)'
                  : 'translate(-50%, 0)',
                maxHeight: anchor.maxHeight,
              }}
            >
              <div className="mb-3 flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {recipientAvatarUrl ? (
                    <img
                      src={recipientAvatarUrl}
                      alt={recipientName}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-900">
                      {personInitials(recipientName)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {recipientName}
                  </p>
                  <p className="text-xs text-slate-500">{statusSubtitle}</p>
                </div>
              </div>
              <div
                className="space-y-3 overflow-y-auto pr-0.5 custom-scrollbar"
                style={{ maxHeight: Math.max(96, anchor.maxHeight - 88) }}
              >
                {questionIds.map((qId, qIdx) => {
                  const qObj = questions.find((q) => q.id === qId);
                  const ansObj = findAnswerForQuestion(qId);
                  const questionText = qObj?.soru?.trim() || labels.question;

                  return (
                    <div key={`q-plan-${qId}-${qIdx}`} className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {labels.question} {qIdx + 1}
                      </p>
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">
                        {questionText}
                      </p>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                        <p className="line-clamp-4 text-sm leading-relaxed text-slate-700">
                          {ansObj?.latestAnswer?.trim() || (
                            <span className="italic text-slate-400">
                              {labels.noResponseYet}
                            </span>
                          )}
                        </p>
                        {ansObj?.comment ? (
                          <div className="mt-2 flex gap-2 border-t border-slate-200/80 pt-2">
                            <MessageSquare
                              size={13}
                              className="mt-0.5 shrink-0 text-blue-500"
                              aria-hidden
                            />
                            <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                              {ansObj.comment}
                            </p>
                          </div>
                        ) : null}
                        {ansObj?.evidenceName ? (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Paperclip
                              size={13}
                              className="shrink-0 text-emerald-600"
                              aria-hidden
                            />
                            <span className="truncate text-xs font-medium text-emerald-700">
                              {ansObj.evidenceName}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
