/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  resolveVideoEmbedForDisplay,
  videoIframeAllow,
} from '../../lib/helpVideoEmbed';
import { tutorialVideoFrameClass } from './questionVideoLayout';

type AciklamaVideoPlayerProps = {
  videoUrl?: string | null;
  title?: string;
  className?: string;
};

export function resolveQuestionVideoEmbed(
  videoUrl?: string | null,
) {
  return resolveVideoEmbedForDisplay(videoUrl);
}

export function AciklamaVideoPlayer({
  videoUrl,
  title = 'Guidance video',
  className,
}: AciklamaVideoPlayerProps) {
  const embed = resolveVideoEmbedForDisplay(videoUrl);

  if (!embed) return null;

  return (
    <div className={className}>
      <div className={tutorialVideoFrameClass}>
        {embed.type === 'iframe' ? (
          <iframe
            src={embed.url}
            title={title}
            className="absolute inset-0 h-full w-full border-0"
            allow={videoIframeAllow}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <video
            src={embed.url}
            className="h-full w-full"
            controls
            playsInline
          />
        )}
      </div>
    </div>
  );
}
