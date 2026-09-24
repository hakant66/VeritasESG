export type TsrsFrameworkId = 'tsrs_1' | 'tsrs_2';

export function makeTsrsDataPointKey(frameworkId: TsrsFrameworkId, paragraphRef: string): string {
  return `${frameworkId}:${paragraphRef.trim()}`;
}

export function parseTsrsDataPointKey(
  key: string
): { frameworkId: TsrsFrameworkId; paragraphRef: string } | null {
  const match = key.match(/^(tsrs_[12]):(.+)$/);
  if (!match) return null;
  return {
    frameworkId: match[1] as TsrsFrameworkId,
    paragraphRef: match[2].trim(),
  };
}

export function isTsrsDataPointKey(key: string): boolean {
  return parseTsrsDataPointKey(key) !== null;
}
