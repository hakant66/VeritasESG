import type { Express, Request, Response } from 'express';
import { isS3UploadConfigured } from './s3Storage.ts';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

/**
 * Public GET proxy: /storage/{bucket}/{objectKey} → MinIO (S3_ENDPOINT).
 * Lets avatars use APP_PUBLIC_URL instead of a separate CDN hostname.
 */
export function registerStorageProxyRoutes(app: Express) {
  if (!isS3UploadConfigured()) return;

  const bucket = (process.env.S3_BUCKET || '').trim();
  const endpoint = trimTrailingSlash(process.env.S3_ENDPOINT?.trim() || '');
  if (!bucket || !endpoint) return;

  const mountPath = `/storage/${bucket}`;

  app.use(mountPath, async (req: Request, res: Response) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.status(405).setHeader('Allow', 'GET, HEAD').end();
      return;
    }

    const rawSuffix = req.path.replace(/^\/+/, '');
    if (!rawSuffix) {
      res.status(404).end();
      return;
    }

    const upstreamUrl = `${endpoint}/${bucket}/${rawSuffix}`;

    try {
      const upstream = await fetch(upstreamUrl, { method: req.method });
      if (!upstream.ok) {
        res.status(upstream.status).end();
        return;
      }

      const contentType = upstream.headers.get('content-type');
      const cacheControl = upstream.headers.get('cache-control');
      if (contentType) res.setHeader('Content-Type', contentType);
      if (cacheControl) res.setHeader('Cache-Control', cacheControl);
      else res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      if (req.method === 'HEAD') {
        res.status(200).end();
        return;
      }

      const body = Buffer.from(await upstream.arrayBuffer());
      res.status(200).send(body);
    } catch (err: any) {
      console.error('[STORAGE PROXY]', upstreamUrl, err?.message || err);
      res.status(502).json({ error: 'Storage proxy failed' });
    }
  });
}
