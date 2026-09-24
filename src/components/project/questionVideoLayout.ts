/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Side-by-side question text (65%) + guidance video (35%). */
export const questionVideoRowClass =
  'flex w-full flex-col gap-4 md:flex-row md:items-start md:gap-5';

export const questionVideoTextClass =
  'min-w-0 w-full md:w-[65%] md:max-w-[65%] md:flex-[0_0_65%]';

/** Extra inset so video frame + shadow align with header actions (row already has p-6). */
export const questionVideoPlayerWrapClass =
  'min-w-0 w-full overflow-hidden md:w-[35%] md:max-w-[35%] md:flex-[0_0_35%] md:sticky md:top-4 md:box-border md:pr-5';

/** Görevler (#/tasks): metin + video her zaman yan yana (md beklemeden). */
export const tasksQuestionVideoRowClass =
  'flex w-full flex-col gap-5 sm:flex-row sm:items-start sm:gap-6';

export const tasksQuestionVideoTextClass =
  'min-w-0 w-full sm:w-[62%] sm:max-w-[62%] sm:flex-[0_0_62%]';

export const tasksQuestionVideoPlayerWrapClass =
  'min-w-0 w-full overflow-hidden sm:w-[38%] sm:max-w-[38%] sm:flex-[0_0_38%] sm:box-border';

/** Matches dashboard / PageHelpGuidance tutorial video frame (square corners + layered shadow). */
export const tutorialVideoFrameClass =
  'relative aspect-video w-full max-w-full min-h-[200px] overflow-hidden rounded-none border border-slate-200 bg-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.14),0_16px_36px_rgba(15,23,42,0.1)] md:min-h-[260px]';
