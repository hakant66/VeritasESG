/**
 * Maps ESRS material topics to recommended template names/patterns.
 * When a topic is marked as material in DMA, suggests loading the corresponding module template.
 */

export interface TopicTemplateRecommendation {
  esrsId: string;
  templatePattern: string;
  templateNameTr: string;
  templateNameEn: string;
  description: string;
}

export const ESRS_TOPIC_TEMPLATE_RECOMMENDATIONS: Record<
  string,
  TopicTemplateRecommendation
> = {
  E1: {
    esrsId: 'E1',
    templatePattern: 'Emisyon Verileri',
    templateNameTr: 'Emisyon Verileri (Kapsam 1/2/3)',
    templateNameEn: 'Emission Data (Scope 1/2/3)',
    description: 'Climate change data collection template',
  },
  E2: {
    esrsId: 'E2',
    templatePattern: 'Kirlilik Metrikleri',
    templateNameTr: 'Kirlilik Metrikleri',
    templateNameEn: 'Pollution Metrics',
    description: 'Pollution metrics template (coming soon)',
  },
  E3: {
    esrsId: 'E3',
    templatePattern: 'Su Kaynakları',
    templateNameTr: 'Su Kaynakları Metrikleri',
    templateNameEn: 'Water Resources Metrics',
    description: 'Water management template (coming soon)',
  },
  S1: {
    esrsId: 'S1',
    templatePattern: 'Çalışan Metrikleri',
    templateNameTr: 'Çalışan Metrikleri',
    templateNameEn: 'Workforce Metrics',
    description: 'Own workforce data template (coming soon)',
  },
  G1: {
    esrsId: 'G1',
    templatePattern: 'Yönetişim Raporlaması',
    templateNameTr: 'Yönetişim Raporlaması',
    templateNameEn: 'Business Conduct',
    description: 'Governance reporting template (coming soon)',
  },
};

/**
 * Given a list of material ESRS topic IDs, returns recommended templates.
 */
export function getRecommendedTemplatesForMaterialTopics(
  materialTopicIds: string[],
): TopicTemplateRecommendation[] {
  const recommendations: TopicTemplateRecommendation[] = [];
  const seen = new Set<string>();

  for (const topicId of materialTopicIds) {
    const rec = ESRS_TOPIC_TEMPLATE_RECOMMENDATIONS[topicId];
    if (rec && !seen.has(rec.esrsId)) {
      recommendations.push(rec);
      seen.add(rec.esrsId);
    }
  }

  return recommendations;
}

/**
 * Find a template by matching its name against the recommendation pattern.
 * Returns the template ID if found, null otherwise.
 */
export function findTemplateByRecommendation(
  allTemplates: Array<{ id: string; baslik?: string; name?: string }>,
  recommendation: TopicTemplateRecommendation,
): string | null {
  for (const template of allTemplates) {
    const baslik = template.baslik || template.name || '';
    // Match if the template name contains the pattern (case-insensitive)
    if (
      baslik.toLowerCase().includes(recommendation.templatePattern.toLowerCase())
    ) {
      return template.id;
    }
  }
  return null;
}
