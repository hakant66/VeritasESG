/**
 * UI strings for Compliance tab (completeness, consistency, climate).
 */

import { PathwayId } from './climateTypes';
import { LeverCategory } from './climateTypes';
import type { Language } from './i18n';

export type ComplianceStrings = {
  tabCompleteness: string;
  tabConsistency: string;
  tabClimate: string;
  completenessTitle: string;
  completenessDescription: string;
  consistencyTitle: string;
  consistencyDescription: string;
  climateTitle: string;
  climateDescription: string;
  cardCompleteness: string;
  cardCompletenessDesc: string;
  cardConsistency: string;
  cardConsistencyDesc: string;
  cardClimate: string;
  cardClimateDesc: string;
  dashboardTitle: string;
  frameworksToValidate: string;
  runValidation: string;
  runningValidation: string;
  validatingCompleteness: string;
  statusComplete: string;
  statusGapsFound: string;
  statusInProgress: string;
  completenessLabel: string;
  disclosuresAnswered: string;
  gapsByPriority: string;
  priorityCritical: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  validatedInSeconds: string;
  filterAll: string;
  noGapsInPriority: string;
  reason: string;
  suggested: string;
  viewRequirement: string;
  viewDetails: string;
  dismiss: string;
  alertGapsNeedAttention: string;
  alertCritical: string;
  alertHighPriority: string;
  alertAnd: string;
  alertGap: string;
  alertGaps: string;
  consistencyCheckTitle: string;
  selectFrameworksCompare: string;
  selectFrameworksMinTwo: string;
  checkConsistency: string;
  checking: string;
  checkingConsistency: string;
  results: string;
  unresolved: string;
  reconciled: string;
  noConflictsFound: string;
  noUnresolvedConflicts: string;
  noReconciledConflicts: string;
  noChecksYet: string;
  noConflictsDetected: string;
  noConflictsExplanation: string;
  checkedMappings: string;
  mapping: string;
  mappings: string;
  frameworks: string;
  conflict: string;
  conflicts: string;
  aboveThreshold: string;
  conflictReconciled: string;
  conflictUnresolved: string;
  source: string;
  likelyCauses: string;
  resolution: string;
  selectedValue: string;
  from: string;
  note: string;
  resolvedBy: string;
  at: string;
  resolveConflict: string;
  variance: string;
  noIdentifiedCauses: string;
  createScenario: string;
  scenarios: string;
  step1Pathway: string;
  step2Baseline: string;
  baselineEmissions: string;
  baselineYearHint: string;
  step3Levers: string;
  step4Name: string;
  scenarioNamePlaceholder: string;
  creating: string;
  leversSelected: string;
  leverSelected: string;
  loadingLevers: string;
  loadingScenarios: string;
  deleteScenarioConfirm: string;
  noScenariosYet: string;
  createFirstScenario: string;
  pathwaySelected: string;
  emissionsReductionBy2030: string;
  capex: string;
  techFeasibility: string;
  adoption: string;
  economics: string;
  sectorTargets2030: string;
  sectorPower: string;
  sectorIndustry: string;
  sectorTransport: string;
  filterByCategory: string;
  categoryAll: string;
  categoryEnergy: string;
  categoryProcess: string;
  categorySupplyChain: string;
  categoryRemoval: string;
  selectLevers: string;
  chosen: string;
  emission: string;
  payback: string;
  years: string;
  techRisk: string;
  noLeversInCategory: string;
  selectLeverHint: string;
  sbtAligned: string;
  reduction: string;
  totalCapex: string;
  annualOpexSavings: string;
  paybackPeriod: string;
  cumulativeRoi2030: string;
  riskAssessment: string;
  physicalRisk: string;
  transitionRisk: string;
  regulatoryRisk: string;
  marketRisk: string;
  strandedAssetsAtRisk: string;
  emissionsRoadmap: string;
  selectedLevers: string;
  deleteScenario: string;
  annualReduction: string;
  riskLow: string;
  riskMedium: string;
  riskHigh: string;
  probabilityHigh: string;
  probabilityMedium: string;
  probabilityLow: string;
  frameworkName: Record<string, string>;
  getPathways: () => Array<{
    id: string;
    pathwayId: PathwayId;
    pathwayName: string;
    description: string;
    emissionsReduction2030: number;
    emissionsReduction2050: number;
    characteristics: {
      capexRequired: string;
      adoptionChallenge: string;
      technicalFeasibility: string;
      economicFeasibility: string;
    };
    sectorTargets: {
      power: string;
      heavyIndustry: string;
      transport: string;
    };
  }>;
};

const en: ComplianceStrings = {
  tabCompleteness: 'Framework Completeness',
  tabConsistency: 'Framework Consistency',
  tabClimate: 'Climate Scenarios',
  completenessTitle: 'Framework Completeness Validator',
  completenessDescription:
    'Verify that your project has all required data points for each reporting framework (IFRS S2, GRI 305, ESRS E1, TCFD).',
  consistencyTitle: 'Cross-Framework Consistency Checker',
  consistencyDescription:
    'Detect and resolve conflicts when the same metrics are reported differently across frameworks.',
  climateTitle: 'Climate Scenario Analysis',
  climateDescription:
    'Model decarbonization pathways (1.5°C, 2°C, 3°C+) and analyze financial impacts of transition strategies.',
  cardCompleteness: 'Completeness',
  cardCompletenessDesc: 'Check data point coverage',
  cardConsistency: 'Consistency',
  cardConsistencyDesc: 'Detect metric conflicts',
  cardClimate: 'Climate',
  cardClimateDesc: 'Model transition pathways',
  dashboardTitle: 'Compliance Dashboard',
  frameworksToValidate: 'Frameworks to Validate',
  runValidation: 'Run Validation',
  runningValidation: 'Running Validation...',
  validatingCompleteness: 'Validating completeness against selected frameworks...',
  statusComplete: 'Complete',
  statusGapsFound: 'Gaps Found',
  statusInProgress: 'In Progress',
  completenessLabel: 'Completeness',
  disclosuresAnswered: '{answered} of {total} required disclosures answered',
  gapsByPriority: 'Gaps by Priority',
  priorityCritical: 'Critical',
  priorityHigh: 'High',
  priorityMedium: 'Medium',
  priorityLow: 'Low',
  validatedInSeconds: 'Validated in {seconds}s',
  filterAll: 'All',
  noGapsInPriority: 'No gaps in this priority level',
  reason: 'Reason:',
  suggested: 'Suggested:',
  viewRequirement: 'View Requirement →',
  viewDetails: 'View Details',
  dismiss: 'Dismiss',
  alertGapsNeedAttention: 'need attention.',
  alertCritical: 'critical',
  alertHighPriority: 'high priority',
  alertAnd: ' and ',
  alertGap: ' gap',
  alertGaps: ' gaps',
  consistencyCheckTitle: 'Framework Consistency Check',
  selectFrameworksCompare: 'Select frameworks to compare (min. 2)',
  selectFrameworksMinTwo: 'Please select at least 2 frameworks for consistency checking',
  checkConsistency: 'Check Consistency',
  checking: 'Checking...',
  checkingConsistency: 'Checking framework consistency...',
  results: 'Results',
  unresolved: 'Unresolved',
  reconciled: 'Reconciled',
  noConflictsFound: 'No conflicts found.',
  noUnresolvedConflicts: 'No unresolved conflicts.',
  noReconciledConflicts: 'No reconciled conflicts.',
  noChecksYet:
    'No consistency checks run yet. Select frameworks and run a check to get started.',
  noConflictsDetected: 'No conflicts detected',
  noConflictsExplanation:
    'The selected frameworks are consistent for comparable metrics, or there was not enough numeric data in both sources to compare (emission entries and/or TSRS question answers).',
  checkedMappings: 'Checked {count} metric',
  mapping: 'mapping',
  mappings: 'mappings',
  frameworks: 'frameworks',
  conflict: 'conflict',
  conflicts: 'conflicts',
  aboveThreshold: 'above threshold.',
  conflictReconciled: 'Reconciled',
  conflictUnresolved: 'Unresolved',
  source: 'Source:',
  likelyCauses: 'Likely Causes',
  resolution: 'Resolution',
  selectedValue: 'Selected Value:',
  from: 'from',
  note: 'Note:',
  resolvedBy: 'Resolved by',
  at: 'at',
  resolveConflict: 'Resolve Conflict',
  variance: 'variance',
  noIdentifiedCauses: 'No identified causes',
  createScenario: 'Create Scenario',
  scenarios: 'Scenarios',
  step1Pathway: 'Step 1: Select Climate Pathway',
  step2Baseline: 'Step 2: Baseline Emissions',
  baselineEmissions: 'Baseline Emissions (tCO2e)',
  baselineYearHint: 'Based on your baseline year (typically 2023)',
  step3Levers: 'Step 3: Select Transition Levers',
  step4Name: 'Step 4: Scenario Name',
  scenarioNamePlaceholder: 'e.g., Aggressive 1.5°C Transition',
  creating: 'Creating...',
  leversSelected: 'levers selected',
  leverSelected: 'lever selected',
  loadingLevers: 'Loading transition levers...',
  loadingScenarios: 'Loading scenarios...',
  deleteScenarioConfirm: 'Delete this scenario?',
  noScenariosYet: 'No scenarios created yet.',
  createFirstScenario: 'Create Your First Scenario',
  pathwaySelected: '✓ Selected',
  emissionsReductionBy2030: '{percent}% by 2030',
  capex: 'Capex',
  techFeasibility: 'Tech Feasibility',
  adoption: 'Adoption',
  economics: 'Economics',
  sectorTargets2030: 'Sector Targets by 2030:',
  sectorPower: 'Power',
  sectorIndustry: 'Industry',
  sectorTransport: 'Transport',
  filterByCategory: 'Filter by Category',
  categoryAll: 'All',
  categoryEnergy: 'Energy',
  categoryProcess: 'Process',
  categorySupplyChain: 'Supply Chain',
  categoryRemoval: 'Carbon Removal',
  selectLevers: 'Select Levers',
  chosen: 'chosen',
  emission: 'Emission',
  payback: 'Payback',
  years: 'years',
  techRisk: 'Tech:',
  noLeversInCategory: 'No levers in this category',
  selectLeverHint: 'Select at least one lever to create a scenario',
  sbtAligned: 'SBT Aligned',
  reduction: 'reduction',
  totalCapex: 'Total Capex',
  annualOpexSavings: 'Annual Opex Savings',
  paybackPeriod: 'Payback Period',
  cumulativeRoi2030: 'Cumulative ROI 2030',
  riskAssessment: 'Risk Assessment',
  physicalRisk: 'Physical Risk',
  transitionRisk: 'Transition Risk',
  regulatoryRisk: 'Regulatory Risk',
  marketRisk: 'Market Risk',
  strandedAssetsAtRisk: 'Stranded Assets at Risk:',
  emissionsRoadmap: 'Emissions Roadmap',
  selectedLevers: 'Selected Levers',
  deleteScenario: 'Delete Scenario',
  annualReduction: 'annual reduction',
  riskLow: 'low',
  riskMedium: 'medium',
  riskHigh: 'high',
  probabilityHigh: 'high',
  probabilityMedium: 'medium',
  probabilityLow: 'low',
  frameworkName: {
    tsrs_1: 'TSRS 1 (Genel Hükümler)',
    tsrs_2: 'TSRS 2 (İklim)',
    ifrs_s2: 'IFRS S2 (Climate)',
    gri_305: 'GRI 305 (Emissions)',
    esrs_e1: 'ESRS E1 (Climate)',
    tcfd: 'TCFD (Disclosures)',
  },
  getPathways: () => [
    {
      id: '1_5_degree',
      pathwayId: PathwayId.OneFiveDegree,
      pathwayName: '1.5°C Net-Zero by 2050',
      description: 'Most ambitious pathway aligned with Paris Agreement 1.5°C limit',
      emissionsReduction2030: 45,
      emissionsReduction2050: 100,
      characteristics: {
        capexRequired: 'Very High',
        adoptionChallenge: 'High',
        technicalFeasibility: 'Medium (some tech emerging)',
        economicFeasibility: 'Medium-High',
      },
      sectorTargets: {
        power: '86% zero-carbon electricity by 2030',
        heavyIndustry: '23% emissions reduction by 2030',
        transport: '45% zero-emission vehicles by 2030',
      },
    },
    {
      id: '2_degree',
      pathwayId: PathwayId.TwoDegree,
      pathwayName: '2°C Aligned (Net-Zero by 2070)',
      description: 'Balanced pathway meeting Paris Agreement 2°C target',
      emissionsReduction2030: 25,
      emissionsReduction2050: 75,
      characteristics: {
        capexRequired: 'High',
        adoptionChallenge: 'Medium',
        technicalFeasibility: 'High (mature technologies)',
        economicFeasibility: 'Medium',
      },
      sectorTargets: {
        power: '69% zero-carbon by 2030',
        heavyIndustry: '10% reduction by 2030',
        transport: '25% zero-emission by 2030',
      },
    },
    {
      id: '3_plus_degree',
      pathwayId: PathwayId.ThreePlusDegree,
      pathwayName: '3°C+ (Business-as-Usual)',
      description: 'Minimal decarbonization, warming 3°C+ by 2100',
      emissionsReduction2030: 5,
      emissionsReduction2050: 20,
      characteristics: {
        capexRequired: 'Low',
        adoptionChallenge: 'Low',
        technicalFeasibility: 'Very High',
        economicFeasibility: 'High',
      },
      sectorTargets: {
        power: 'Minimal zero-carbon target',
        heavyIndustry: 'Minimal reduction',
        transport: 'Incremental improvements',
      },
    },
  ],
};

const tr: ComplianceStrings = {
  tabCompleteness: 'Çerçeve Bütünlüğü',
  tabConsistency: 'Çerçeve Tutarlılığı',
  tabClimate: 'İklim Senaryoları',
  completenessTitle: 'Çerçeve Bütünlük Doğrulayıcı',
  completenessDescription:
    'Projenizin her raporlama çerçevesi (IFRS S2, GRI 305, ESRS E1, TCFD) için gerekli tüm veri noktalarını içerdiğini doğrulayın.',
  consistencyTitle: 'Çapraz Çerçeve Tutarlılık Denetimi',
  consistencyDescription:
    'Aynı metrikler farklı çerçevelerde farklı raporlandığında çakışmaları tespit edin ve çözün.',
  climateTitle: 'İklim Senaryo Analizi',
  climateDescription:
    'Karbon azaltım yollarını (1,5°C, 2°C, 3°C+) modelleyin ve geçiş stratejilerinin finansal etkilerini analiz edin.',
  cardCompleteness: 'Bütünlük',
  cardCompletenessDesc: 'Veri noktası kapsamını kontrol et',
  cardConsistency: 'Tutarlılık',
  cardConsistencyDesc: 'Metrik çakışmalarını tespit et',
  cardClimate: 'İklim',
  cardClimateDesc: 'Geçiş yollarını modelle',
  dashboardTitle: 'Uyumluluk Paneli',
  frameworksToValidate: 'Doğrulanacak Çerçeveler',
  runValidation: 'Doğrulamayı Çalıştır',
  runningValidation: 'Doğrulama çalışıyor…',
  validatingCompleteness: 'Seçilen çerçevelere göre bütünlük doğrulanıyor…',
  statusComplete: 'Tamamlandı',
  statusGapsFound: 'Eksikler Bulundu',
  statusInProgress: 'Devam Ediyor',
  completenessLabel: 'Bütünlük',
  disclosuresAnswered: '{total} zorunlu açıklamadan {answered} yanıtlandı',
  gapsByPriority: 'Önceliğe Göre Eksikler',
  priorityCritical: 'Kritik',
  priorityHigh: 'Yüksek',
  priorityMedium: 'Orta',
  priorityLow: 'Düşük',
  validatedInSeconds: '{seconds} sn içinde doğrulandı',
  filterAll: 'Tümü',
  noGapsInPriority: 'Bu öncelik düzeyinde eksik yok',
  reason: 'Gerekçe:',
  suggested: 'Öneri:',
  viewRequirement: 'Gerekliliği Görüntüle →',
  viewDetails: 'Ayrıntıları Görüntüle',
  dismiss: 'Kapat',
  alertGapsNeedAttention: 'dikkat gerektiriyor.',
  alertCritical: 'kritik',
  alertHighPriority: 'yüksek öncelikli',
  alertAnd: ' ve ',
  alertGap: ' eksik',
  alertGaps: ' eksik',
  consistencyCheckTitle: 'Çerçeve Tutarlılık Kontrolü',
  selectFrameworksCompare: 'Karşılaştırılacak çerçeveleri seçin (en az 2)',
  selectFrameworksMinTwo: 'Tutarlılık kontrolü için en az 2 çerçeve seçin',
  checkConsistency: 'Tutarlılığı Kontrol Et',
  checking: 'Kontrol ediliyor…',
  checkingConsistency: 'Çerçeve tutarlılığı kontrol ediliyor…',
  results: 'Sonuçlar',
  unresolved: 'Çözülmemiş',
  reconciled: 'Uzlaştırıldı',
  noConflictsFound: 'Çakışma bulunamadı.',
  noUnresolvedConflicts: 'Çözülmemiş çakışma yok.',
  noReconciledConflicts: 'Uzlaştırılmış çakışma yok.',
  noChecksYet:
    'Henüz tutarlılık kontrolü yapılmadı. Çerçeveleri seçin ve kontrolü başlatın.',
  noConflictsDetected: 'Çakışma tespit edilmedi',
  noConflictsExplanation:
    'Seçilen çerçeveler karşılaştırılabilir metrikler için tutarlıdır veya her iki kaynakta karşılaştırma için yeterli sayısal veri yoktur (emisyon girişleri ve/veya TSRS soru yanıtları).',
  checkedMappings: '{count} metrik',
  mapping: 'eşlemesi',
  mappings: 'eşlemesi',
  frameworks: 'çerçeve',
  conflict: 'çakışma',
  conflicts: 'çakışma',
  aboveThreshold: 'eşik üzerinde.',
  conflictReconciled: 'Uzlaştırıldı',
  conflictUnresolved: 'Çözülmemiş',
  source: 'Kaynak:',
  likelyCauses: 'Olası Nedenler',
  resolution: 'Çözüm',
  selectedValue: 'Seçilen değer:',
  from: 'kaynak:',
  note: 'Not:',
  resolvedBy: 'Çözen:',
  at: 'tarih:',
  resolveConflict: 'Çakışmayı Çöz',
  variance: 'fark',
  noIdentifiedCauses: 'Belirlenen neden yok',
  createScenario: 'Senaryo Oluştur',
  scenarios: 'Senaryolar',
  step1Pathway: 'Adım 1: İklim Yolunu Seçin',
  step2Baseline: 'Adım 2: Baz Emisyonlar',
  baselineEmissions: 'Baz Emisyonlar (tCO2e)',
  baselineYearHint: 'Baz yılınıza göre (genellikle 2023)',
  step3Levers: 'Adım 3: Geçiş Kaldıraçlarını Seçin',
  step4Name: 'Adım 4: Senaryo Adı',
  scenarioNamePlaceholder: 'ör. Agresif 1,5°C Geçişi',
  creating: 'Oluşturuluyor…',
  leversSelected: 'kaldıraç seçildi',
  leverSelected: 'kaldıraç seçildi',
  loadingLevers: 'Geçiş kaldıraçları yükleniyor…',
  loadingScenarios: 'Senaryolar yükleniyor…',
  deleteScenarioConfirm: 'Bu senaryoyu silmek istiyor musunuz?',
  noScenariosYet: 'Henüz senaryo oluşturulmadı.',
  createFirstScenario: 'İlk Senaryonuzu Oluşturun',
  pathwaySelected: '✓ Seçildi',
  emissionsReductionBy2030: '2030’a kadar {percent}%',
  capex: 'Yatırım',
  techFeasibility: 'Teknik Uygunluk',
  adoption: 'Benimseme',
  economics: 'Ekonomi',
  sectorTargets2030: '2030 Sektör Hedefleri:',
  sectorPower: 'Enerji',
  sectorIndustry: 'Sanayi',
  sectorTransport: 'Ulaşım',
  filterByCategory: 'Kategoriye Göre Filtrele',
  categoryAll: 'Tümü',
  categoryEnergy: 'Enerji',
  categoryProcess: 'Süreç',
  categorySupplyChain: 'Tedarik Zinciri',
  categoryRemoval: 'Karbon Giderme',
  selectLevers: 'Kaldıraçları Seçin',
  chosen: 'seçildi',
  emission: 'Emisyon',
  payback: 'Geri Ödeme',
  years: 'yıl',
  techRisk: 'Teknik:',
  noLeversInCategory: 'Bu kategoride kaldıraç yok',
  selectLeverHint: 'Senaryo oluşturmak için en az bir kaldıraç seçin',
  sbtAligned: 'SBT Uyumlu',
  reduction: 'azalma',
  totalCapex: 'Toplam Yatırım',
  annualOpexSavings: 'Yıllık İşletme Tasarrufu',
  paybackPeriod: 'Geri Ödeme Süresi',
  cumulativeRoi2030: '2030 Birikmiş ROI',
  riskAssessment: 'Risk Değerlendirmesi',
  physicalRisk: 'Fiziksel Risk',
  transitionRisk: 'Geçiş Riski',
  regulatoryRisk: 'Düzenleyici Risk',
  marketRisk: 'Piyasa Riski',
  strandedAssetsAtRisk: 'Risk Altındaki Çıkmaz Varlıklar:',
  emissionsRoadmap: 'Emisyon Yol Haritası',
  selectedLevers: 'Seçilen Kaldıraçlar',
  deleteScenario: 'Senaryoyu Sil',
  annualReduction: 'yıllık azalma',
  riskLow: 'düşük',
  riskMedium: 'orta',
  riskHigh: 'yüksek',
  probabilityHigh: 'yüksek',
  probabilityMedium: 'orta',
  probabilityLow: 'düşük',
  frameworkName: {
    tsrs_1: 'TSRS 1 (Genel Hükümler)',
    tsrs_2: 'TSRS 2 (İklim)',
    ifrs_s2: 'IFRS S2 (İklim)',
    gri_305: 'GRI 305 (Emisyonlar)',
    esrs_e1: 'ESRS E1 (İklim)',
    tcfd: 'TCFD (Açıklamalar)',
  },
  getPathways: () => [
    {
      id: '1_5_degree',
      pathwayId: PathwayId.OneFiveDegree,
      pathwayName: '1,5°C — 2050’de Net Sıfır',
      description: 'Paris Anlaşması 1,5°C sınırıyla uyumlu en iddialı yol',
      emissionsReduction2030: 45,
      emissionsReduction2050: 100,
      characteristics: {
        capexRequired: 'Çok Yüksek',
        adoptionChallenge: 'Yüksek',
        technicalFeasibility: 'Orta (bazı teknolojiler gelişiyor)',
        economicFeasibility: 'Orta-Yüksek',
      },
      sectorTargets: {
        power: '2030’da %86 sıfır karbon elektrik',
        heavyIndustry: '2030’da %23 emisyon azaltımı',
        transport: '2030’da %45 sıfır emisyonlu araç',
      },
    },
    {
      id: '2_degree',
      pathwayId: PathwayId.TwoDegree,
      pathwayName: '2°C Uyumlu (2070’de Net Sıfır)',
      description: 'Paris Anlaşması 2°C hedefine uyumlu dengeli yol',
      emissionsReduction2030: 25,
      emissionsReduction2050: 75,
      characteristics: {
        capexRequired: 'Yüksek',
        adoptionChallenge: 'Orta',
        technicalFeasibility: 'Yüksek (olgun teknolojiler)',
        economicFeasibility: 'Orta',
      },
      sectorTargets: {
        power: '2030’da %69 sıfır karbon',
        heavyIndustry: '2030’da %10 azalma',
        transport: '2030’da %25 sıfır emisyon',
      },
    },
    {
      id: '3_plus_degree',
      pathwayId: PathwayId.ThreePlusDegree,
      pathwayName: '3°C+ (İş Olduğu Gibi)',
      description: 'Minimal karbon azaltımı, 2100’de 3°C+ ısınma',
      emissionsReduction2030: 5,
      emissionsReduction2050: 20,
      characteristics: {
        capexRequired: 'Düşük',
        adoptionChallenge: 'Düşük',
        technicalFeasibility: 'Çok Yüksek',
        economicFeasibility: 'Yüksek',
      },
      sectorTargets: {
        power: 'Minimal sıfır karbon hedefi',
        heavyIndustry: 'Minimal azalma',
        transport: 'Kademeli iyileştirmeler',
      },
    },
  ],
};

export const complianceTranslations: Record<Language, ComplianceStrings> = {
  en,
  tr,
};

export function getComplianceStrings(lang: Language): ComplianceStrings {
  return complianceTranslations[lang] ?? complianceTranslations.en;
}

export function getFrameworkOptions(ct: ComplianceStrings) {
  return [
    { id: 'tsrs_1', name: ct.frameworkName.tsrs_1 },
    { id: 'tsrs_2', name: ct.frameworkName.tsrs_2 },
    { id: 'ifrs_s2', name: ct.frameworkName.ifrs_s2 },
    { id: 'gri_305', name: ct.frameworkName.gri_305 },
    { id: 'esrs_e1', name: ct.frameworkName.esrs_e1 },
    { id: 'tcfd', name: ct.frameworkName.tcfd },
  ];
}

export function getLeverCategories(ct: ComplianceStrings) {
  return [
    { id: LeverCategory.Energy, name: ct.categoryEnergy },
    { id: LeverCategory.Process, name: ct.categoryProcess },
    { id: LeverCategory.SupplyChain, name: ct.categorySupplyChain },
    { id: LeverCategory.Removal, name: ct.categoryRemoval },
  ];
}

export function priorityLabel(
  ct: ComplianceStrings,
  priority: 'critical' | 'high' | 'medium' | 'low',
): string {
  switch (priority) {
    case 'critical':
      return ct.priorityCritical;
    case 'high':
      return ct.priorityHigh;
    case 'medium':
      return ct.priorityMedium;
    default:
      return ct.priorityLow;
  }
}

export function riskLabel(ct: ComplianceStrings, risk: string): string {
  switch (risk) {
    case 'low':
      return ct.riskLow;
    case 'medium':
      return ct.riskMedium;
    case 'high':
      return ct.riskHigh;
    default:
      return risk;
  }
}

export function probabilityLabel(ct: ComplianceStrings, probability: string): string {
  switch (probability) {
    case 'high':
      return ct.probabilityHigh;
    case 'medium':
      return ct.probabilityMedium;
    case 'low':
      return ct.probabilityLow;
    default:
      return probability;
  }
}
