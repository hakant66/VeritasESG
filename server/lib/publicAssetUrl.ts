/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolveS3PublicUrlBase } from './s3Storage.ts';

const LEGACY_CDN_HOSTS = new Set(
  (process.env.S3_LEGACY_CDN_HOSTS || 'cdn.impact-ai.co.uk')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getConfiguredPublicBase() {
  const raw = resolveS3PublicUrlBase();
  return raw || '';
}

function getPublicBasePrefix(base: string, bucket: string): string {
  if (!bucket) return base;
  try {
    const parsed = new URL(base);
    const path = parsed.pathname.replace(/\/+$/, '');
    const pathHasBucket = path.split('/').filter(Boolean).includes(bucket);
    return pathHasBucket ? base : `${base}/${bucket}`;
  } catch {
    return base;
  }
}

function getConfiguredS3EndpointHost() {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  if (!endpoint) return '';
  try {
    return new URL(endpoint).host.toLowerCase();
  } catch {
    return '';
  }
}

function isPrivateStorageHost(host: string) {
  const normalized = host.toLowerCase();
  if (normalized === '127.0.0.1:9000' || normalized === 'localhost:9000') {
    return true;
  }
  const endpointHost = getConfiguredS3EndpointHost();
  return !!endpointHost && normalized === endpointHost;
}

function extractObjectKeyFromPathname(pathname: string, bucket: string): string | null {
  const path = pathname.replace(/^\/+/, '');
  if (!path) return null;
  if (bucket && path.startsWith(`${bucket}/`)) {
    return path.slice(bucket.length + 1);
  }
  if (path.startsWith('storage/') && bucket) {
    const afterStorage = path.slice('storage/'.length);
    if (afterStorage.startsWith(`${bucket}/`)) {
      return afterStorage.slice(bucket.length + 1);
    }
  }
  return path;
}

/**
 * Rewrites private S3/MinIO URLs and legacy CDN hosts into the app public storage base.
 * Leaves data URLs unchanged.
 */
export function normalizePublicAssetUrl(url: string | undefined | null): string | undefined {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw) return undefined;
  if (raw.startsWith('data:')) return raw;

  const publicBase = getConfiguredPublicBase();
  if (!publicBase) return raw;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }

  const bucket = (process.env.S3_BUCKET || '').trim();
  const objectKey = extractObjectKeyFromPathname(parsed.pathname, bucket);
  if (!objectKey) return raw;

  const shouldRewrite =
    isPrivateStorageHost(parsed.host) || LEGACY_CDN_HOSTS.has(parsed.host.toLowerCase());

  if (!shouldRewrite) return raw;

  const prefix = getPublicBasePrefix(publicBase, bucket);
  return `${prefix}/${objectKey}`;
}
