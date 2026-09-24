/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VideoEmbedResult = {
  type: 'iframe' | 'video';
  url: string;
};

const SYNTHESIA_UUID_RE =
  /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; microphone; screen-wake-lock';

export const videoIframeAllow = IFRAME_ALLOW;

export function normalizeVideoUrlInput(raw: string | undefined | null): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function synthesiaEmbedUrl(normalized: string): string | null {
  if (!normalized.includes('synthesia.io')) return null;
  if (normalized.includes('/embeds/videos/')) return normalized;
  const uuidMatch = normalized.match(SYNTHESIA_UUID_RE);
  if (uuidMatch) {
    return `https://share.synthesia.io/embeds/videos/${uuidMatch[0]}`;
  }
  const tail = normalized.split('/').pop()?.split('?')[0] ?? '';
  if (tail.length > 20) {
    return `https://share.synthesia.io/embeds/videos/${tail}`;
  }
  return normalized;
}

/** Resolves any help / tutorial URL to an iframe `src` (YouTube, Vimeo, Synthesia, direct file). */
export function getHelpEmbedUrl(url: string | undefined | null): string {
  const embed = getVideoEmbed(url);
  if (embed?.type === 'iframe') return embed.url;
  if (embed?.type === 'video') return embed.url;
  const normalized = normalizeVideoUrlInput(url);
  return normalized;
}

/** Resolves a help / question video URL to an embeddable iframe or direct video file. */
export function getVideoEmbed(url: string | undefined | null): VideoEmbedResult | null {
  const normalized = normalizeVideoUrlInput(url);
  if (!normalized) return null;

  const ytWatch = normalized.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytWatch) {
    return { type: 'iframe', url: `https://www.youtube.com/embed/${ytWatch[1]}` };
  }

  const ytEmbed = normalized.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  );
  if (ytEmbed) {
    return { type: 'iframe', url: `https://www.youtube.com/embed/${ytEmbed[1]}` };
  }

  const vimeoMatch = normalized.match(
    /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/(\d+)|player\.vimeo\.com\/video\/(\d+))/,
  );
  const vimeoId = vimeoMatch?.[1] || vimeoMatch?.[2];
  if (vimeoId) {
    return { type: 'iframe', url: `https://player.vimeo.com/video/${vimeoId}` };
  }

  const loomMatch = normalized.match(
    /(?:https?:\/\/)?(?:www\.)?loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/,
  );
  if (loomMatch) {
    return { type: 'iframe', url: `https://www.loom.com/embed/${loomMatch[1]}` };
  }

  const synthesia = synthesiaEmbedUrl(normalized);
  if (synthesia) {
    return { type: 'iframe', url: synthesia };
  }

  if (normalized.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return { type: 'video', url: normalized };
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return { type: 'iframe', url: normalized };
  }

  return null;
}

/** Playable embed for UI players; falls back to normalised https URL when possible. */
export function resolveVideoEmbedForDisplay(
  videoUrl: string | undefined | null,
): VideoEmbedResult | null {
  const normalized = normalizeVideoUrlInput(videoUrl);
  if (!normalized) return null;
  const direct = getVideoEmbed(normalized);
  if (direct) return direct;
  return { type: 'iframe', url: normalized };
}
