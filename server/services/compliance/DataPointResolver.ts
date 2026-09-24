
import { isTsrsDataPointKey } from '../../lib/tsrsDataPointKey.ts';
import { isPrimarilyNumericAnswer, parseNumericDataPointValue } from './ConsistencyValidator.ts';

/** Fallback canonical keys when a TSRS paragraph answer is narrative-only. */
const TSRS_NUMERIC_ALTERNATE_KEYS: Record<string, string[]> = {
  'tsrs_2:Par.29a-i1': ['scope1_emissions'],
  'tsrs_2:Par.29a-i2': ['scope2_emissions'],
  'tsrs_2:Par.29a-v': ['scope2_emissions'],
  'tsrs_2:Par.29a-vi': ['scope3_emissions'],
  'tsrs_2:Par.29a-ii': ['emissions_intensity'],
  'tsrs_1:Par.45': ['emissions_intensity'],
};

export interface DataPoint {
  key: string;
  value: number | string | boolean;
  source: string;
  sourceId?: string;
  lastUpdated: Date;
}

/**
 * DataPointResolver normalizes data from multiple sources.
 * This is the single source of truth for all data points used by
 * CompletenessService, ConsistencyService, and ScenarioService.
 *
 * Pattern: Abstract away the complexity of fetching from different
 * collections so services only need to ask for a data point by key.
 */
export class DataPointResolver {
  private readonly tsrsRefToQuestionIds: Map<string, Set<string>>;

  constructor(
    private projectId: string,
    private project: any,
    private answers: any[],
    private emissions: any[],
    private dma: any[],
    private projectQuestions: any[] = []
  ) {
    this.tsrsRefToQuestionIds = DataPointResolver.buildTsrsRefIndex(projectQuestions);
  }

  private static buildTsrsRefIndex(projectQuestions: any[]): Map<string, Set<string>> {
    const index = new Map<string, Set<string>>();

    for (const question of projectQuestions) {
      const questionId = question.id || question._id?.toString();
      if (!questionId) continue;

      const tsrs1 = typeof question.tsrs1 === 'string' ? question.tsrs1.trim() : '';
      if (tsrs1) {
        const key = `tsrs_1:${tsrs1}`;
        const existing = index.get(key) ?? new Set<string>();
        existing.add(questionId);
        index.set(key, existing);
      }

      const tsrs2 = typeof question.tsrs2 === 'string' ? question.tsrs2.trim() : '';
      if (tsrs2) {
        const key = `tsrs_2:${tsrs2}`;
        const existing = index.get(key) ?? new Set<string>();
        existing.add(questionId);
        index.set(key, existing);
      }
    }

    return index;
  }

  private static hasAnswerContent(answer: string | undefined | null): boolean {
    return typeof answer === 'string' && answer.trim().length > 0;
  }

  /**
   * Resolve a single data point by key.
   * Returns null if not found.
   */
  async resolve(key: string): Promise<DataPoint | null> {
    switch (key) {
      // ============================================
      // EMISSIONS DATA POINTS (GHG Protocol)
      // ============================================
      case 'scope1_emissions':
        return this.resolveScope1Emissions();
      case 'scope2_emissions':
        return this.resolveScope2Emissions();
      case 'scope3_emissions':
        return this.resolveScope3Emissions();
      case 'total_emissions':
        return this.resolveTotalEmissions();
      case 'emissions_intensity':
        return this.resolveEmissionsIntensity();

      // ============================================
      // FINANCIAL DATA POINTS
      // ============================================
      case 'revenue':
        return this.resolveRevenue();
      case 'operating_expense':
        return this.resolveOperatingExpense();

      // ============================================
      // WORKFORCE DATA POINTS
      // ============================================
      case 'headcount':
        return this.resolveHeadcount();
      case 'employee_turnover_rate':
        return this.resolveEmployeeTurnoverRate();

      // ============================================
      // GOVERNANCE DATA POINTS
      // ============================================
      case 'board_size':
        return this.resolveBoardSize();
      case 'board_climate_committee':
        return this.resolveBoardClimateCommittee();

      default:
        if (isTsrsDataPointKey(key)) {
          return this.resolveTsrsParagraph(key);
        }
        return this.resolveFromAnswers(key);
    }
  }

  private resolveTsrsParagraph(key: string): DataPoint | null {
    const questionIds = this.tsrsRefToQuestionIds.get(key);
    if (!questionIds || questionIds.size === 0) {
      return this.resolveTsrsAlternate(key);
    }

    const answer = this.answers.find((item: any) => {
      const questionId = item.questionId?.toString();
      if (!questionId || !questionIds.has(questionId)) return false;
      return DataPointResolver.hasAnswerContent(item.latestAnswer);
    });

    if (answer) {
      const raw = answer.latestAnswer;
      const numeric = parseNumericDataPointValue(raw);
      if (numeric !== null && isPrimarilyNumericAnswer(raw)) {
        return {
          key,
          value: numeric,
          source: 'project_question_answer',
          sourceId: answer._id?.toString(),
          lastUpdated: answer.updatedAt || answer.submittedAt || new Date(),
        };
      }
      if (DataPointResolver.hasAnswerContent(raw)) {
        return {
          key,
          value: String(raw).trim(),
          source: 'project_question_answer',
          sourceId: answer._id?.toString(),
          lastUpdated: answer.updatedAt || answer.submittedAt || new Date(),
        };
      }
    }

    return this.resolveTsrsAlternate(key, answer?._id?.toString());
  }

  private resolveTsrsAlternate(key: string, sourceId?: string): DataPoint | null {
    for (const altKey of TSRS_NUMERIC_ALTERNATE_KEYS[key] ?? []) {
      const altPoint = this.resolveCanonical(altKey);
      if (!altPoint) continue;
      const numeric = parseNumericDataPointValue(altPoint.value);
      if (numeric === null) continue;
      return {
        key,
        value: numeric,
        source: `${altPoint.source} (tsrs alternate)`,
        sourceId: sourceId ?? altPoint.sourceId,
        lastUpdated: altPoint.lastUpdated,
      };
    }
    return null;
  }

  private resolveCanonical(key: string): DataPoint | null {
    switch (key) {
      case 'scope1_emissions':
        return this.resolveScope1Emissions();
      case 'scope2_emissions':
        return this.resolveScope2Emissions();
      case 'scope3_emissions':
        return this.resolveScope3Emissions();
      case 'emissions_intensity':
        return this.resolveEmissionsIntensity();
      default:
        return null;
    }
  }

  private resolveScope1Emissions(): DataPoint | null {
    const emission = this.emissions.find((e: any) => e.scope === 'Scope 1' && e.latest === true);
    if (!emission) return null;

    return {
      key: 'scope1_emissions',
      value: emission.total || 0,
      source: 'emission_entry',
      sourceId: emission._id?.toString(),
      lastUpdated: emission.updatedAt || new Date()
    };
  }

  private resolveScope2Emissions(): DataPoint | null {
    const emission = this.emissions.find((e: any) => e.scope === 'Scope 2' && e.latest === true);
    if (!emission) return null;

    return {
      key: 'scope2_emissions',
      value: emission.total || 0,
      source: 'emission_entry',
      sourceId: emission._id?.toString(),
      lastUpdated: emission.updatedAt || new Date()
    };
  }

  private resolveScope3Emissions(): DataPoint | null {
    const emission = this.emissions.find((e: any) => e.scope === 'Scope 3' && e.latest === true);
    if (!emission) return null;

    return {
      key: 'scope3_emissions',
      value: emission.total || 0,
      source: 'emission_entry',
      sourceId: emission._id?.toString(),
      lastUpdated: emission.updatedAt || new Date()
    };
  }

  private resolveTotalEmissions(): DataPoint | null {
    const s1 = this.resolveScope1Emissions();
    const s2 = this.resolveScope2Emissions();
    const s3 = this.resolveScope3Emissions();

    const s1Val = typeof s1?.value === 'number' ? s1.value : 0;
    const s2Val = typeof s2?.value === 'number' ? s2.value : 0;
    const s3Val = typeof s3?.value === 'number' ? s3.value : 0;
    const total = s1Val + s2Val + s3Val;

    if (total === 0) return null;

    return {
      key: 'total_emissions',
      value: total,
      source: 'calculated',
      lastUpdated: new Date()
    };
  }

  private resolveEmissionsIntensity(): DataPoint | null {
    const total = this.resolveTotalEmissions();
    const revenue = this.resolveRevenue();

    if (!total || !revenue) return null;

    const totalVal = typeof total.value === 'number' ? total.value : 0;
    const revenueVal = typeof revenue.value === 'number' ? revenue.value : 0;

    if (revenueVal === 0) return null;

    return {
      key: 'emissions_intensity',
      value: totalVal / revenueVal,
      source: 'calculated',
      lastUpdated: new Date()
    };
  }

  private resolveRevenue(): DataPoint | null {
    if (!this.project?.financialData?.revenue) return null;

    return {
      key: 'revenue',
      value: this.project.financialData.revenue,
      source: 'project_financial_data',
      sourceId: this.project._id?.toString(),
      lastUpdated: this.project.updatedAt || new Date()
    };
  }

  private resolveOperatingExpense(): DataPoint | null {
    if (!this.project?.financialData?.operatingExpense) return null;

    return {
      key: 'operating_expense',
      value: this.project.financialData.operatingExpense,
      source: 'project_financial_data',
      sourceId: this.project._id?.toString(),
      lastUpdated: this.project.updatedAt || new Date()
    };
  }

  private resolveHeadcount(): DataPoint | null {
    if (!this.project?.workforce?.headcount) return null;

    return {
      key: 'headcount',
      value: this.project.workforce.headcount,
      source: 'project_workforce_data',
      sourceId: this.project._id?.toString(),
      lastUpdated: this.project.updatedAt || new Date()
    };
  }

  private resolveEmployeeTurnoverRate(): DataPoint | null {
    if (!this.project?.workforce?.turnoverRate) return null;

    return {
      key: 'employee_turnover_rate',
      value: this.project.workforce.turnoverRate,
      source: 'project_workforce_data',
      sourceId: this.project._id?.toString(),
      lastUpdated: this.project.updatedAt || new Date()
    };
  }

  private resolveBoardSize(): DataPoint | null {
    const answer = this.answers.find((a: any) => a.questionId?.toString().includes('board_size'));
    if (!answer?.value) return null;

    return {
      key: 'board_size',
      value: parseInt(answer.value as string),
      source: 'answer',
      sourceId: answer._id?.toString(),
      lastUpdated: answer.updatedAt || new Date()
    };
  }

  private resolveBoardClimateCommittee(): DataPoint | null {
    const answer = this.answers.find((a: any) =>
      a.questionId?.toString().includes('board_climate')
    );
    if (!answer?.value) return null;

    return {
      key: 'board_climate_committee',
      value: answer.value === 'yes' || answer.value === true,
      source: 'answer',
      sourceId: answer._id?.toString(),
      lastUpdated: answer.updatedAt || new Date()
    };
  }

  private resolveFromAnswers(key: string): DataPoint | null {
    const answer = this.answers.find((a: any) => a.questionId?.toString().includes(key));
    const value = answer?.latestAnswer ?? answer?.value;
    if (!DataPointResolver.hasAnswerContent(value)) return null;

    return {
      key,
      value,
      source: 'answer',
      sourceId: answer._id?.toString(),
      lastUpdated: answer.updatedAt || answer.submittedAt || new Date()
    };
  }

  /**
   * Check if a specific data point exists (non-null and non-empty)
   */
  async hasDataPoint(key: string): Promise<boolean> {
    const point = await this.resolve(key);
    if (!point) return false;

    // Empty values don't count
    if (typeof point.value === 'number' && point.value <= 0) return false;
    if (typeof point.value === 'string' && point.value.trim() === '') return false;
    if (typeof point.value === 'boolean' && !point.value) return false;

    return true;
  }

  /**
   * Batch resolve multiple data points (more efficient)
   */
  async resolveMany(keys: string[]): Promise<Map<string, DataPoint | null>> {
    const results = new Map<string, DataPoint | null>();
    for (const key of keys) {
      results.set(key, await this.resolve(key));
    }
    return results;
  }
}
