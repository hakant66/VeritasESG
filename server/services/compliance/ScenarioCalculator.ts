/**
 * Helper functions for climate scenario calculations
 */

export interface SelectedLever {
  leverId: string;
  leverName: string;
  annualEmissionReduction: number; // as percentage
  capex: number; // millions
  opex: number; // millions/year
  paybackPeriod: number;
  implementationStart: number;
  implementationEnd: number;
}

export interface FinancialImpactResult {
  totalCapex: number;
  totalOpexSavings: number;
  netPresentValue: number;
  irr: number;
  paybackPeriod: number;
  cumulativeROI: {
    year2030: number;
    year2035: number;
    year2050: number;
  };
}

export interface RiskAssessment {
  strandedAssets: number;
  physicalRisk: 'low' | 'medium' | 'high';
  transitionRisk: 'low' | 'medium' | 'high';
  regulatoryRisk: 'low' | 'medium' | 'high';
  marketRisk: 'low' | 'medium' | 'high';
}

export function calculateFinancialImpact(
  baselineEmissions: number,
  baselineYear: number,
  targetYear: number,
  levers: SelectedLever[],
  discountRate: number = 0.08
): FinancialImpactResult {
  const totalCapex = levers.reduce((sum, l) => sum + (l.capex || 0), 0);
  const totalOpexSavings = levers.reduce((sum, l) => sum + (l.opex || 0), 0);

  // NPV calculation with discount rate
  const years = targetYear - baselineYear;
  let npv = -totalCapex; // Initial investment
  for (let year = 1; year <= years; year++) {
    npv += totalOpexSavings / Math.pow(1 + discountRate, year);
  }

  // IRR approximation (Newton-Raphson would be more accurate but this is simpler)
  const irr = totalOpexSavings > 0 ? (totalOpexSavings / totalCapex) * 100 : 0;

  // Payback period (simple)
  const paybackPeriod = totalOpexSavings > 0 ? totalCapex / totalOpexSavings : 999;

  // Cumulative ROI at different checkpoints
  const roi2030 = Math.min(30, years) * totalOpexSavings > 0
    ? ((Math.min(30, years) * totalOpexSavings - totalCapex) / totalCapex) * 100
    : -100;

  const roi2035 = Math.min(35, years) * totalOpexSavings > 0
    ? ((Math.min(35, years) * totalOpexSavings - totalCapex) / totalCapex) * 100
    : -100;

  const roi2050 = Math.min(50, years) * totalOpexSavings > 0
    ? ((Math.min(50, years) * totalOpexSavings - totalCapex) / totalCapex) * 100
    : -100;

  return {
    totalCapex,
    totalOpexSavings,
    netPresentValue: npv,
    irr: Math.round(irr * 100) / 100,
    paybackPeriod: Math.round(paybackPeriod * 100) / 100,
    cumulativeROI: {
      year2030: Math.round(roi2030 * 100) / 100,
      year2035: Math.round(roi2035 * 100) / 100,
      year2050: Math.round(roi2050 * 100) / 100,
    },
  };
}

export function calculateEmissionReductions(
  baselineEmissions: number,
  baselineYear: number,
  targetYear: number,
  levers: SelectedLever[]
): { year: number; emissions: number }[] {
  const roadmap: { year: number; emissions: number }[] = [];
  const years = targetYear - baselineYear;

  // Calculate annual reduction rate from levers
  const totalReductionRate = levers.reduce((sum, l) => sum + l.annualEmissionReduction, 0);
  const averageReductionRate = totalReductionRate / 100; // Convert percentage to decimal

  for (let y = 0; y <= years; y++) {
    const year = baselineYear + y;
    // Compound reduction over time
    const emissionsAtYear =
      baselineEmissions * Math.pow(1 + averageReductionRate, y);
    roadmap.push({
      year,
      emissions: Math.round(emissionsAtYear),
    });
  }

  return roadmap;
}

export function assessRisk(
  pathwayId: string,
  baselineEmissions: number,
  targetEmissions: number,
  levers: SelectedLever[]
): RiskAssessment {
  const reductionPercentage = ((baselineEmissions - targetEmissions) / baselineEmissions) * 100;

  // Pathway determines baseline risk
  let physicalRisk: 'low' | 'medium' | 'high' = 'high';
  let regulatoryRisk: 'low' | 'medium' | 'high' = 'high';

  if (pathwayId === '1_5_degree') {
    physicalRisk = 'low';
    regulatoryRisk = 'low';
  } else if (pathwayId === '2_degree') {
    physicalRisk = 'medium';
    regulatoryRisk = 'medium';
  } else {
    physicalRisk = 'high';
    regulatoryRisk = 'high';
  }

  // Transition and market risk based on lever selection and capex
  const totalCapex = levers.reduce((sum, l) => sum + (l.capex || 0), 0);
  let transitionRisk: 'low' | 'medium' | 'high' = 'medium';
  let marketRisk: 'low' | 'medium' | 'high' = 'medium';

  if (totalCapex > 100 || reductionPercentage > 40) {
    transitionRisk = 'high';
  } else if (totalCapex < 10 && reductionPercentage < 10) {
    transitionRisk = 'low';
  }

  // Stranded assets estimation (simplified)
  const strandedAssets = baselineEmissions * 1000 * (1 - reductionPercentage / 100);

  return {
    strandedAssets: Math.round(strandedAssets),
    physicalRisk,
    transitionRisk,
    regulatoryRisk,
    marketRisk,
  };
}

export function checkSBTAlignment(
  reductionPercentage: number,
  targetYear: number,
  pathwayId: string
): {
  aligned: boolean;
  nearTermTarget2030?: boolean;
  netZeroTarget2050?: boolean;
  confidenceLevel: 'high' | 'medium' | 'low';
} {
  let aligned = false;
  let confidenceLevel: 'high' | 'medium' | 'low' = 'low';

  // 1.5°C pathway requires 45% by 2030, net-zero by 2050
  if (pathwayId === '1_5_degree') {
    const nearTermOK = targetYear >= 2030 && reductionPercentage >= 45;
    const netZeroOK = targetYear <= 2050;
    aligned = nearTermOK && netZeroOK;
    confidenceLevel = aligned ? 'high' : 'medium';
    return {
      aligned,
      nearTermTarget2030: nearTermOK,
      netZeroTarget2050: netZeroOK,
      confidenceLevel,
    };
  }

  // 2°C pathway requires 25% by 2030, net-zero by 2070
  if (pathwayId === '2_degree') {
    const nearTermOK = targetYear >= 2030 && reductionPercentage >= 25;
    const netZeroOK = targetYear <= 2070;
    aligned = nearTermOK && netZeroOK;
    confidenceLevel = aligned ? 'high' : 'medium';
    return {
      aligned,
      nearTermTarget2030: nearTermOK,
      netZeroTarget2050: netZeroOK,
      confidenceLevel,
    };
  }

  // 3°C+ not SBT aligned
  return {
    aligned: false,
    confidenceLevel: 'low',
  };
}
