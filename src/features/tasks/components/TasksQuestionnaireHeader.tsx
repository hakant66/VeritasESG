/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../lib/utils';

export function computeQuestionnaireProgress(
  visibleQuestionIds: string[],
  answers: Record<string, { text?: string } | undefined>,
): { percent: number; answered: number; total: number } {
  const total = visibleQuestionIds.length;
  const answered = visibleQuestionIds.filter((id) =>
    Boolean(answers[id]?.text?.trim()),
  ).length;
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  return { percent, answered, total };
}

export function formatQuestionnaireProgressLabel(
  progress: { answered: number; total: number; percent: number },
): string {
  return `(${progress.answered}/${progress.total}) ${progress.percent}%`;
}

type TasksQuestionnaireHeaderProps = {
  visibleQuestionIds: string[];
  answers: Record<string, { text?: string } | undefined>;
  progressBarClassName?: string;
  className?: string;
  /** Stacked column for plan preview left pane (default: title left, progress right on wide screens). */
  layout?: 'default' | 'stacked';
};

export function TasksQuestionnaireHeader({
  visibleQuestionIds,
  answers,
  progressBarClassName = 'bg-blue-500',
  className,
  layout = 'default',
}: TasksQuestionnaireHeaderProps) {
  const { t } = useTranslation();
  const { percent } = computeQuestionnaireProgress(visibleQuestionIds, answers);

  return (
    <header
      className={cn(
        layout === 'stacked'
          ? 'flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-5'
          : 'flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {t.tasks.assignedQuestions}
        </h2>
        <p className="text-sm font-medium text-slate-500">
          {t.tasks.reportingRequirementsDesc}
        </p>
      </div>
      <div
        className={cn(
          'flex w-full flex-col gap-2',
          layout === 'stacked' ? 'min-w-0' : 'min-w-[200px] sm:max-w-xs',
        )}
      >
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>{t.tasks.overallProgress}</span>
          <span className="tabular-nums text-slate-700">{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn('h-full', progressBarClassName)}
          />
        </div>
      </div>
    </header>
  );
}
