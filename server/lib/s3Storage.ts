import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function isS3UploadConfigured(): boolean {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

export type S3Config = {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** App-proxied public base, e.g. https://giq.theleadai.co.uk/storage/governance-uploads */
export function resolveS3PublicUrlBase(): string | undefined {
  const explicit =
    process.env.S3_PUBLIC_URL_BASE?.trim() || process.env.S3_PUBLIC_BASE_URL?.trim() || '';
  if (explicit) return trimTrailingSlash(explicit);

  const appUrl = process.env.APP_PUBLIC_URL?.trim();
  const bucket = (process.env.S3_BUCKET || '').trim();
  if (appUrl && bucket && isS3UploadConfigured()) {
    return `${trimTrailingSlash(appUrl)}/storage/${bucket}`;
  }

  return undefined;
}

export function getS3Config(): S3Config | null {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  const region = process.env.S3_REGION || 'us-east-1';
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const forcePathStyle =
    (process.env.S3_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true';
  const publicBaseUrl = resolveS3PublicUrlBase();

  return {
    bucket,
    region,
    endpoint,
    forcePathStyle,
    publicBaseUrl,
    accessKeyId,
    secretAccessKey,
  };
}

export function getS3ConfigOrThrow(): S3Config {
  const config = getS3Config();
  if (!config) {
    throw new Error('S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY must be configured');
  }
  return config;
}

export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function buildPublicFileUrl(config: S3Config, objectKey: string): string {
  const trimmedBase = config.publicBaseUrl?.replace(/\/+$/, '');
  if (trimmedBase) {
    const bucket = (config.bucket || '').trim();
    if (!bucket) return `${trimmedBase}/${objectKey}`;
    try {
      const parsed = new URL(trimmedBase);
      const path = parsed.pathname.replace(/\/+$/, '');
      const pathHasBucket = path.split('/').filter(Boolean).includes(bucket);
      const prefix = pathHasBucket ? trimmedBase : `${trimmedBase}/${bucket}`;
      return `${prefix}/${objectKey}`;
    } catch {
      return `${trimmedBase}/${objectKey}`;
    }
  }
  if (config.endpoint) {
    const trimmedEndpoint = config.endpoint.replace(/\/+$/, '');
    if (config.forcePathStyle) {
      return `${trimmedEndpoint}/${config.bucket}/${objectKey}`;
    }
    const endpointUrl = new URL(trimmedEndpoint);
    return `${endpointUrl.protocol}//${config.bucket}.${endpointUrl.host}/${objectKey}`;
  }
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${objectKey}`;
}

export async function putObjectBuffer(options: {
  config: S3Config;
  objectKey: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  const client = createS3Client(options.config);
  await client.send(
    new PutObjectCommand({
      Bucket: options.config.bucket,
      Key: options.objectKey,
      Body: options.body,
      ContentType: options.contentType,
      ...(options.cacheControl ? { CacheControl: options.cacheControl } : {}),
    }),
  );
  return buildPublicFileUrl(options.config, options.objectKey);
}
