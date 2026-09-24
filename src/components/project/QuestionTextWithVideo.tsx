/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { normalizeVideoUrlInput } from '../../lib/helpVideoEmbed';
import {
  AciklamaVideoPlayer,
  resolveQuestionVideoEmbed,
} from './AciklamaVideoPlayer';
import {
  questionVideoPlayerWrapClass,
  questionVideoRowClass,
  questionVideoTextClass,
  tasksQuestionVideoPlayerWrapClass,
  tasksQuestionVideoRowClass,
  tasksQuestionVideoTextClass,
} from './questionVideoLayout';

type QuestionTextWithVideoProps = {
  videoUrl?: string | null;
  children: ReactNode;
  className?: string;
  textClassName?: string;
  videoTitle?: string;
  /** Görevler sayfası: dar ekranda bile metin | video iki sütun */
  tasksLayout?: boolean;
};

export function QuestionTextWithVideo({
  videoUrl,
  children,
  className,
  textClassName,
  videoTitle = 'Guidance video',
  tasksLayout = false,
}: QuestionTextWithVideoProps) {
  const normalizedUrl = normalizeVideoUrlInput(videoUrl);
  const hasVideo = Boolean(normalizedUrl && resolveQuestionVideoEmbed(videoUrl));
  const rowClass = tasksLayout ? tasksQuestionVideoRowClass : questionVideoRowClass;
  const textClass = tasksLayout ? tasksQuestionVideoTextClass : questionVideoTextClass;
  const playerClass = tasksLayout
    ? tasksQuestionVideoPlayerWrapClass
    : questionVideoPlayerWrapClass;

  if (!hasVideo) {
    return <div className={cn(textClassName, className)}>{children}</div>;
  }

  return (
    <div className={cn(rowClass, className)}>
      <div className={cn(textClass, textClassName)}>
        {children}
      </div>
      <AciklamaVideoPlayer
        videoUrl={videoUrl}
        title={videoTitle}
        className={playerClass}
      />
    </div>
  );
}
