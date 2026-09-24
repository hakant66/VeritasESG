/**
 * Helper functions for variance detection and cause inference
 */

export interface VarianceAnalysis {
  absoluteDifference: number;
  percentageDifference: number;
  exceedsThreshold: boolean;
}

export function parseNumericDataPointValue(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const normalized = text.replace(/,/g, '');
  const matches = normalized.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const values = matches.map((token) => Number(token)).filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  return Math.max(...values);
}

/** True when the answer is essentially a numeric metric (not narrative disclosure text). */
export function isPrimarilyNumericAnswer(raw: unknown): boolean {
  const text = String(raw ?? '').trim();
  if (!text) return false;
  if (parseNumericDataPointValue(raw) === null) return false;
  const withoutMetricTokens = text
    .replace(/[\d.,\-\s]/g, '')
    .replace(/tco2e|tco₂e|mwh|kg|ton|%/gi, '')
    .trim();
  return withoutMetricTokens.length === 0;
}

export function calculateVariance(
  value1: number,
  value2: number,
  thresholdPercent: number
): VarianceAnalysis {
  if (value1 === 0 && value2 === 0) {
    return {
      absoluteDifference: 0,
      percentageDifference: 0,
      exceedsThreshold: false,
    };
  }

  const baseValue = Math.max(value1, value2);
  const absoluteDifference = Math.abs(value1 - value2);
  const percentageDifference = baseValue > 0 ? (absoluteDifference / baseValue) * 100 : 0;

  return {
    absoluteDifference,
    percentageDifference,
    exceedsThreshold: percentageDifference > thresholdPercent,
  };
}

export interface LikelyCause {
  cause: string;
  probability: 'high' | 'medium' | 'low';
  explanation: string;
}

export function inferCauses(
  varianceReasonGuide: string[],
  variancePercent: number
): LikelyCause[] {
  const causes: LikelyCause[] = [];

  for (const reason of varianceReasonGuide) {
    let probability: 'high' | 'medium' | 'low';

    if (variancePercent > 15) {
      probability = 'high';
    } else if (variancePercent > 8) {
      probability = 'medium';
    } else {
      probability = 'low';
    }

    causes.push({
      cause: reason,
      probability,
      explanation: getExplanation(reason),
    });
  }

  return causes.sort((a, b) => {
    const priorityMap = { high: 3, medium: 2, low: 1 };
    return priorityMap[b.probability] - priorityMap[a.probability];
  });
}

function getExplanation(cause: string): string {
  const explanations: Record<string, string> = {
    'Equity stake consolidation (subsidiaries >50%)':
      'IFRS S2 consolidates subsidiaries with >50% equity stake. GRI may use operational control instead. Check your consolidation scope and ownership structure.',
    'Leased facility scope (lessee vs lessor)':
      'IFRS and GRI handle leases differently. IFRS consolidates all leases (ASC 842). GRI uses lessee/lessor distinction. Verify your lease classification.',
    'Excluded materials or operations':
      'Different frameworks may exclude certain materials or operations. Scope boundaries vary—check what is included.',
    'Data quality / timing differences':
      'One framework may have fresher data or higher precision. Check audit logs for when each value was updated.',
    'Location-based vs market-based methodology':
      'Scope 2 has two methodologies. Ensure you are comparing like-for-like.',
    'Electricity grid mix changes': 'Grid emission factors change yearly. A year-end update can shift calculations significantly.',
    'Green power contract timing': 'RECs and green power contracts may expire. Timing differences can cause variance.',
    'Revenue definition (adjusted vs reported)':
      'IFRS may use adjusted revenue while GRI uses reported. Check your revenue definitions.',
    'Currency conversion differences':
      'If reporting in multiple currencies, conversion rates matter. Ensure consistent FX treatment.',
    'Reporting period alignment':
      'Check that both values are for the same period (calendar year, fiscal year, etc).',
    'Organic growth vs acquisition impacts':
      'Acquisitions change the scope. Ensure both frameworks include/exclude M&A the same way.',
  };

  return (
    explanations[cause] ||
    'Review this factor and validate your data sources and methodology.'
  );
}
