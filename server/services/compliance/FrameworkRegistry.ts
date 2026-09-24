import * as complianceData from '../../data/complianceDataAccess.ts';

/**
 * FrameworkRegistry provides cached access to framework requirements.
 * Caches in memory to avoid repeated database queries.
 *
 * Why: CompletenessService may call this many times per validation run.
 * Caching makes it fast.
 */
export class FrameworkRegistry {
  private cache: Map<string, any[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all requirements for a framework
   */
  async getFrameworkRequirements(frameworkId: string, includeOptional: boolean = false): Promise<any[]> {
    // Check cache
    const cacheKey = `${frameworkId}_${includeOptional}`;
    if (this.cache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (Date.now() < expiry) {
        return this.cache.get(cacheKey)!;
      }
    }

    const requirements = await complianceData.findFrameworkRequirements(frameworkId, includeOptional);

    // Update cache
    this.cache.set(cacheKey, requirements);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL_MS);

    return requirements;
  }

  /**
   * Get specific requirement by disclosure ID
   */
  async getRequirement(disclosureId: string): Promise<any | null> {
    return complianceData.findFrameworkRequirementByDisclosure(disclosureId);
  }

  /**
   * Get requirements by topic (e.g., all "emissions" requirements)
   */
  async getRequirementsByTopic(frameworkId: string, topicId: string): Promise<any[]> {
    return complianceData.findFrameworkRequirementsByTopic(frameworkId, topicId);
  }

  /**
   * Clear cache (call after seeding new frameworks)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
