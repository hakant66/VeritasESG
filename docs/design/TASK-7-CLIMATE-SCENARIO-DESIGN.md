# Task 7: Climate Scenario Analysis Module - Design Document

**Status:** In Progress (Week 1)  
**Due:** Friday, June 14, 2026 (Design Review)  
**Owner:** Design Team C  

---

## Overview

The Climate Scenario Analysis module enables companies to model decarbonization pathways aligned with climate science (1.5°C, 2°C, 3°C+) and assess financial impacts of transition strategies.

**Key Capabilities:**
1. **GFANZ Pathway Selection** — Choose 1.5°C, 2°C, 3°C+ science-based targets
2. **Transition Lever Selection** — Pick decarbonization strategies (30+ options)
3. **Financial Impact Modeling** — Calculate stranded assets, physical risk, opportunity
4. **Roadmap Generation** — 5-10 year decarbonization plan with milestones
5. **SBT Alignment Checking** — Verify targets meet Science-Based Targets initiative criteria

---

## 1. GFANZ Pathways Research

### Net-Zero Transition Pathways Framework

[Reference: GFANZ Net-Zero Transition Pathways Initiative (2022)]

**1.5°C Pathway (Most Ambitious)**

- **Global Emissions Reduction:** 45% by 2030 vs. 2015 baseline; Net-zero by 2050
- **Sector Targets:** 
  - Power: 86% zero-carbon electricity by 2030
  - Heavy Industry: 23% emissions reduction by 2030
  - Transport: 45% zero-emission vehicles by 2030
- **Financial Impact:** High capex for renewables, efficiency, but opportunity from green tech
- **Risk Level:** Medium (technology proven, scaling challenge)

**2°C Pathway (Paris Agreement target)**

- **Global Emissions Reduction:** 25% by 2030 vs. 2015; Net-zero by 2070
- **Sector Targets:**
  - Power: 69% zero-carbon by 2030
  - Heavy Industry: 10% reduction by 2030
  - Transport: 25% zero-emission by 2030
- **Financial Impact:** Moderate capex, more time for transition, stranded asset risk rises 2030-2050
- **Risk Level:** Medium-High (timing pressure, tech scaling)

**3°C+ Pathway (Business-as-usual + some action)**

- **Global Emissions Reduction:** <5% by 2030; Warming 3°C+ by 2100
- **Sector Targets:** Minimal reductions, high reliance on offsets
- **Financial Impact:** Physical risk rises (climate damage), regulatory risk (carbon tax)
- **Risk Level:** Very High (stranded assets, reputation, regulation)

### Chemistry/Manufacturing Sector Specifics

For chemicals, petrochemicals, and manufacturing:

| Lever | 1.5°C | 2°C | 3°C+ | Financial Impact |
|-------|-------|-----|------|---|
| Renewable electricity | 100% by 2045 | 85% by 2050 | 30% by 2060 | High capex, positive ROI 10-15y |
| Energy efficiency | 3%/year to 2040 | 2%/year to 2050 | 0.5%/year | Medium capex, 3-5y payback |
| Process electrification | 50% by 2045 | 20% by 2050 | 5% by 2060 | Highest capex, long payback |
| Carbon capture (point source) | 20% of emissions by 2045 | 5% by 2050 | <1% | Emerging tech, high cost |
| Waste heat recovery | 50% potential by 2040 | 30% by 2050 | 10% by 2060 | Lower capex, 5-8y payback |
| Supply chain decarbonization | 40% by 2045 | 20% by 2050 | 5% by 2060 | Supplier capex, cost pass-through risk |

---

## 2. Transition Levers (30+ Strategies)

### Energy & Emissions Reduction (Direct)

| Lever ID | Lever Name | Baseline Assumption | Annual Impact Range | Capex | Payback |
|----------|-----------|-------------------|-------------------|-------|---------|
| L001 | Renewable electricity (on-site) | 25% coverage | -2% to -8% emissions/y | High | 8-12y |
| L002 | Renewable electricity (PPAs) | 15% coverage | -1% to -5% emissions/y | Medium | 5-8y |
| L003 | Energy efficiency (buildings) | 2% improvement/y | -1% to -3% emissions/y | Medium | 3-5y |
| L004 | Energy efficiency (process) | 2% improvement/y | -2% to -6% emissions/y | Medium | 4-7y |
| L005 | Motor/pump optimization | 0% installed | -0.5% to -2% emissions/y | Low | 2-3y |
| L006 | LED/lighting retrofit | 20% coverage | -0.5% to -1% emissions/y | Low | 1-3y |
| L007 | Waste heat recovery | 10% potential | -1% to -3% emissions/y | Medium | 5-8y |
| L008 | Steam system optimization | 50% opportunity | -1% to -2% emissions/y | Low-Med | 3-5y |
| L009 | Compressed air optimization | 30% leakage rate | -0.5% to -1.5% emissions/y | Low | 1-2y |
| L010 | HVAC/refrigeration upgrades | Current: baseline | -1% to -2% emissions/y | Medium | 4-6y |

### Process & Technology Transformation

| L011 | Electrification (furnaces/drying) | <5% installed | -3% to -8% emissions/y | Very High | 12-20y |
| L012 | Alternative fuels (biogas, bio-oil) | <10% blending | -2% to -5% emissions/y | High | 8-15y |
| L013 | Hydrogen (green H₂ from renewables) | 0% (emerging) | -2% to -10% emissions/y | Very High | 15-25y |
| L014 | Process intensification | 0% benefit realized | -2% to -6% emissions/y | High | 8-12y |
| L015 | Circularity (recycled feedstock) | <20% of input | -1% to -5% emissions/y | Medium | 6-10y |

### Supply Chain & Scope 3

| L016 | Supplier engagement (low-carbon purchasing) | 20% active suppliers | -2% to -8% of Scope 3 | Low | 2-4y |
| L017 | Logistics optimization (fleet) | Current baseline | -1% to -4% Scope 3/y | Medium | 3-6y |
| L018 | Nearshoring (reduce transport) | <5% reduction opportunity | -0.5% to -2% Scope 3 | High | 5-10y |
| L019 | Waste-to-energy (incineration) | 30% waste to WTE | -1% to -3% Scope 3 | Medium | 5-8y |

### Carbon Removal & Offsets

| L020 | Carbon capture (point source, direct air) | 0% | -1% to -3% net/y | Very High | 20+y |
| L021 | Carbon offsets (reforestation, soil) | 0% | -1% to -5% net/y | Low-Med | 2-4y |
| L022 | Landfill gas capture | <5% potential | -0.5% to -1.5% | Medium | 4-6y |
| L023 | Methane reduction (leakage mitigation) | 5% of emissions | -1% to -3% emissions/y | Low-Med | 2-4y |

### Cross-Functional / Strategic

| L024 | Product design (lower-carbon alternatives) | 0% launched | -1% to -10% emissions/y | Medium | 3-5y |
| L025 | Manufacturing footprint optimization | Current baseline | -1% to -5% emissions/y | High | 5-10y |
| L026 | Demand reduction (customer engagement) | 0% uptake | -0.5% to -3% emissions/y | Low | 1-2y |
| L027 | Circular economy model (product-as-service) | 0% revenue | -2% to -10% emissions/y | Very High | 8-15y |
| L028 | Blockchain/smart contracts (supply chain visibility) | 0% | -0.5% to -2% via optimization | Low | 2-3y |
| L029 | Digital twins (operations optimization) | 0% deployed | -1% to -4% via optimization | Medium | 4-6y |
| L030 | Sustainability governance (carbon pricing internal) | No carbon shadow price | -0.5% to -3% via incentives | Low | 1-3y |

---

## 3. MongoDB Schema Design

### ClimateScenario Schema

```typescript
interface ClimateScenario {
  _id: ObjectId;
  
  // Identity
  projectId: ObjectId;
  scenarioName: string;             // "1.5°C Aggressive Decarbonization"
  scenarioDescription: string;      // Narrative of the scenario
  
  // Pathway & Targets
  pathwayId: string;                // "1_5_degree" | "2_degree" | "3_plus_degree"
  pathwayName: string;              // "1.5°C Net-Zero by 2050"
  
  targetEmissions: {
    baselineYear: number;           // 2023
    baselineEmissions: number;      // tCO2e
    targetYear: number;             // 2030, 2050
    targetEmissions: number;        // tCO2e
    percentReduction: number;       // 45% by 2030
  }[];
  
  // Selected transition levers
  selectedLevers: {
    leverId: string;                // "L001"
    leverName: string;              // "Renewable electricity (on-site)"
    annualEmissionReduction: number;// -2% to -8% (user selects point in range)
    capex: number;                  // USD millions
    opex: number;                   // USD millions / year
    paybackPeriod: number;          // years
    implementationStart: number;    // 2025
    implementationEnd: number;      // 2030
  }[];
  
  // Financial impact (calculated)
  financialImpact: {
    totalCapex: number;             // Sum of all levers
    totalOpexSavings: number;       // /year when fully implemented
    netPresentValue: number;        // USD millions (at 8% discount rate)
    irr: number;                    // Internal rate of return %
    paybackPeriod: number;          // Years to recover capex via opex savings
    cumulativeROI: {
      year2030: number;
      year2035: number;
      year2050: number;
    };
  };
  
  // Risk assessment
  riskAssessment: {
    strandedAssets: number;         // USD millions at risk
    physicalRisk: "low" | "medium" | "high";  // From climate models
    transitionRisk: "low" | "medium" | "high"; // From tech adoption
    regulatoryRisk: "low" | "medium" | "high"; // Carbon tax, ESG regs
    marketRisk: "low" | "medium" | "high";     // Green premium demand
  };
  
  // SBT alignment
  sbtAlignment: {
    aligned: boolean;
    sbtInitiativeApproved?: boolean;
    nearTermTarget2030?: boolean;
    netZeroTarget2050?: boolean;
    confidenceLevel: "high" | "medium" | "low";
  };
  
  // Roadmap (generated)
  roadmap: {
    year: number;
    cumulativeEmissions: number;
    cumulativeCapex: number;
    activeLeverCount: number;
    keyMilestones: string[];
  }[];
  
  // Audit
  createdBy: ObjectId;
  ownerId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  legacyFirebaseId?: string;
  
  // Virtual
  id: string;
}

// Indexes
db.ClimateScenario.createIndex({ projectId: 1 })
db.ClimateScenario.createIndex({ pathwayId: 1 })
db.ClimateScenario.createIndex({ "sbtAlignment.aligned": 1 })
```

### TransitionLeverTemplate Schema

```typescript
interface TransitionLeverTemplate {
  _id: ObjectId;
  
  // Identity
  leverId: string;                  // "L001"
  leverName: string;                // "Renewable electricity (on-site)"
  category: string;                 // "energy" | "process" | "supply_chain" | "removal"
  
  // Technical specifications
  description: string;              // Detailed description
  applicableIndustries: string[];  // ["chemicals", "petrochemicals", "manufacturing"]
  trl: number;                      // Technology Readiness Level (1-9)
  maturitay: "emerging" | "growth" | "mature" | "declining";
  
  // Environmental impact range
  emissionReductionRange: {
    min: number;                    // -1% per year
    max: number;                    // -8% per year
    unit: string;                   // "%_emissions_per_year"
    assumptions: string;            // Description of baseline assumptions
  };
  
  // Economic parameters
  capexRange: {
    min: number;                    // USD millions
    max: number;
    perUnit: string;                // "per_MW_installed" | "per_facility" | "lump_sum"
  };
  opexRange: {
    min: number;                    // USD millions / year
    max: number;
    recurring: boolean;
  };
  paybackRange: {
    min: number;                    // years
    max: number;
  };
  
  // Implementation timeline
  implementationDuration: {
    min: number;                    // years
    max: number;
  };
  prototypeScaling: string;         // "12-24 months to pilot scale"
  
  // Risk factors
  technicalRisk: "low" | "medium" | "high";
  marketRisk: "low" | "medium" | "high";
  regulatoryRisk: "low" | "medium" | "high";
  
  // SBT eligibility
  sbtEligible: boolean;
  ifrsAlignment: string;            // How it contributes to IFRS S2 targets
  
  // References & sources
  references: {
    source: string;
    url: string;
    retrievedAt: Date;
  }[];
  
  // Audit
  createdBy: ObjectId;
  ownerId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  legacyFirebaseId?: string;
  
  // Virtual
  id: string;
}

// Indexes
db.TransitionLeverTemplate.createIndex({ leverId: 1 })
db.TransitionLeverTemplate.createIndex({ category: 1 })
db.TransitionLeverTemplate.createIndex({ applicableIndustries: 1 })
db.TransitionLeverTemplate.createIndex({ "emissionReductionRange.min": 1 })
```

---

## 4. API Contract

### GET /api/climate/pathways

**Purpose:** Fetch GFANZ pathway definitions.

**Response:**
```json
{
  "success": true,
  "pathways": [
    {
      "id": "1_5_degree",
      "name": "1.5°C Net-Zero by 2050",
      "emissionsReduction2030": 45,
      "description": "Most ambitious pathway aligned with Paris Agreement 1.5°C limit...",
      "characteristics": {
        "capexRequired": "Very High",
        "adoptionChallenge": "High",
        "technicalFeasibility": "Medium (some tech still emerging)",
        "economicFeasibility": "Medium-High (long payback, but costs declining)"
      }
    },
    {
      "id": "2_degree",
      "name": "2°C Aligned (Net-Zero by 2070)",
      ...
    },
    {
      "id": "3_plus_degree",
      "name": "3°C+ (Business-as-Usual + Some Action)",
      ...
    }
  ]
}
```

---

### GET /api/climate/levers

**Purpose:** Fetch available transition levers filtered by industry.

**Query Parameters:**
```
GET /api/climate/levers?industry=chemicals&category=energy
```

**Response:**
```json
{
  "success": true,
  "levers": [
    {
      "id": "L001",
      "name": "Renewable electricity (on-site)",
      "category": "energy",
      "description": "...",
      "applicableIndustries": ["chemicals", "petrochemicals"],
      "emissionReductionRange": { "min": -2, "max": -8 },
      "capexRange": { "min": 5, "max": 50 },
      "paybackRange": { "min": 8, "max": 12 },
      "sbtEligible": true
    },
    ...
  ]
}
```

---

### POST /api/climate/scenarios

**Purpose:** Create a new climate scenario for a project.

**Request Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "scenarioName": "Aggressive 1.5°C Transition",
  "pathwayId": "1_5_degree",
  "selectedLevers": [
    { "leverId": "L001", "annualEmissionReduction": -5 },
    { "leverId": "L003", "annualEmissionReduction": -2 },
    { "leverId": "L007", "annualEmissionReduction": -1.5 }
  ],
  "userId": "current-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "scenario": {
    "id": "scenario_001",
    "projectId": "507f1f77bcf86cd799439011",
    "scenarioName": "Aggressive 1.5°C Transition",
    "pathwayName": "1.5°C Net-Zero by 2050",
    "targetEmissions": [
      { "year": 2030, "target": 8000, "reduction": 45 },
      { "year": 2050, "target": 0 }
    ],
    "financialImpact": {
      "totalCapex": 85000000,
      "totalOpexSavings": 12000000,
      "netPresentValue": 42000000,
      "irr": 12.5,
      "paybackPeriod": 7
    },
    "sbtAlignment": { "aligned": true },
    "roadmap": [
      { "year": 2025, "cumulativeEmissions": 14500 },
      { "year": 2030, "cumulativeEmissions": 8000 },
      ...
    ]
  }
}
```

---

### POST /api/climate/financial-impact

**Purpose:** Calculate financial impact of a scenario.

**Request Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "baselineEmissions": 14500,
  "baselineYear": 2023,
  "targetYear": 2030,
  "selectedLevers": [
    { "leverId": "L001", "capexMillions": 30, "opexSavingsMillions": 3 },
    ...
  ],
  "discountRate": 0.08
}
```

**Response:**
```json
{
  "success": true,
  "impact": {
    "totalCapex": 85000000,
    "totalOpexSavings": 12000000,
    "netPresentValue": 42000000,
    "irr": 12.5,
    "paybackPeriod": 7,
    "strandedAssets": {
      "carbonTax": 15000000,
      "lossOfMarket": 8000000,
      "regulation": 5000000
    },
    "physicalRisk": {
      "propertyDamage": 2000000,
      "businessInterruption": 5000000,
      "supplyChainDisruption": 3000000
    },
    "opportunityCosts": {
      "greenPremium": 5000000,
      "newMarkets": 8000000,
      "operationalEfficiency": 12000000
    }
  }
}
```

---

### POST /api/climate/sbt-alignment

**Purpose:** Check if scenario meets SBT initiative criteria.

**Request Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "scenarioId": "scenario_001",
  "baselineYear": 2023,
  "targetYear": 2030,
  "targetReduction": 45
}
```

**Response:**
```json
{
  "success": true,
  "alignment": {
    "aligned": true,
    "sbtInitiativeApproved": false,
    "reasonsForAlignment": [
      "Reduction % meets 1.5°C pathway (45% by 2030 vs. baseline 2023)",
      "Levers selected are recognized by SBT initiative",
      "Scope 1+2 covered; Scope 3 partially (improve to full alignment)"
    ],
    "reasonsForMisalignment": [
      "Scope 3 coverage incomplete (need >50% of suppliers engaged)"
    ],
    "recommendations": [
      "Expand supplier engagement from 20% to 60% coverage",
      "Add L016 (supplier engagement) to scenario"
    ]
  }
}
```

---

## 5. Service Layer Design

### ScenarioService

```typescript
class ScenarioService {
  
  async createScenario(
    projectId: string,
    scenarioName: string,
    pathwayId: string,
    selectedLeverIds: string[]
  ): Promise<ClimateScenario> {
    // 1. Fetch current project emissions
    const project = await Project.findById(projectId);
    const emissions = await EmissionEntry.find({ projectId, latest: true });
    const baselineEmissions = this.sumEmissions(emissions);
    
    // 2. Fetch pathway definition
    const pathway = await this.getPathway(pathwayId);
    
    // 3. Fetch lever details
    const levers = await TransitionLeverTemplate.find({
      leverId: { $in: selectedLeverIds }
    });
    
    // 4. Calculate scenario (see ScenarioCalculator service)
    const calculated = await this.calculator.calculate(
      baselineEmissions,
      pathway,
      levers
    );
    
    // 5. Generate roadmap
    const roadmap = this.generateRoadmap(
      baselineEmissions,
      calculated.projectedEmissions,
      levers
    );
    
    // 6. Persist scenario
    const scenario: ClimateScenario = {
      projectId,
      scenarioName,
      pathwayId,
      pathwayName: pathway.name,
      targetEmissions: pathway.targets,
      selectedLevers: levers.map(l => ({
        leverId: l.leverId,
        leverName: l.leverName,
        annualEmissionReduction: calculated.leverImpact[l.leverId],
        capex: l.capexRange.max,
        paybackPeriod: l.paybackRange.max
      })),
      financialImpact: calculated.financialImpact,
      riskAssessment: calculated.riskAssessment,
      sbtAlignment: calculated.sbtAlignment,
      roadmap,
      createdBy: projectId
    };
    
    return ClimateScenario.create(scenario);
  }
  
  generateRoadmap(
    baselineEmissions: number,
    projectedEmissions: Map<number, number>,
    levers: TransitionLeverTemplate[]
  ): Milestone[] {
    const roadmap: Milestone[] = [];
    
    for (let year = 2025; year <= 2050; year += 5) {
      const emissions = projectedEmissions.get(year) || 0;
      const activeLeverCount = levers.filter(l =>
        year >= (l.implementationStart || 2025) &&
        year <= (l.implementationEnd || 2050)
      ).length;
      
      roadmap.push({
        year,
        cumulativeEmissions: emissions,
        cumulativeCapex: this.sumCapex(levers, year),
        activeLeverCount,
        keyMilestones: this.generateMilestones(year, levers)
      });
    }
    
    return roadmap;
  }
}
```

### ScenarioCalculator (Math Module)

```typescript
class ScenarioCalculator {
  
  async calculate(
    baselineEmissions: number,
    pathway: Pathway,
    levers: TransitionLeverTemplate[]
  ): Promise<ScenarioCalculation> {
    // 1. Calculate year-by-year emissions reduction
    const projectedEmissions = this.projectEmissions(
      baselineEmissions,
      levers
    );
    
    // 2. Calculate financial impacts
    const financialImpact = this.calculateFinancial(levers);
    
    // 3. Calculate risk assessment
    const riskAssessment = this.calculateRisk(projectedEmissions, levers);
    
    // 4. Check SBT alignment
    const sbtAlignment = this.checkSBTAlignment(
      projectedEmissions,
      pathway,
      levers
    );
    
    return {
      projectedEmissions,
      leverImpact: this.mapLeverImpact(levers),
      financialImpact,
      riskAssessment,
      sbtAlignment
    };
  }
  
  private projectEmissions(
    baselineEmissions: number,
    levers: TransitionLeverTemplate[]
  ): Map<number, number> {
    const emissions = new Map<number, number>();
    
    let current = baselineEmissions;
    for (let year = 2023; year <= 2050; year++) {
      // Sum reduction from all active levers
      let yearlyReduction = 0;
      for (const lever of levers) {
        const isActive = year >= (lever.implementationStart || 2025) &&
                         year <= (lever.implementationEnd || 2050);
        if (isActive) {
          // Ramp up implementation over first few years
          const rampupYears = lever.implementationEnd - lever.implementationStart;
          const rampFactor = Math.min(1, (year - lever.implementationStart) / rampupYears);
          yearlyReduction += lever.emissionReductionRange.max * rampFactor;
        }
      }
      
      current = Math.max(0, current * (1 + yearlyReduction / 100));
      emissions.set(year, current);
    }
    
    return emissions;
  }
  
  private calculateFinancial(
    levers: TransitionLeverTemplate[]
  ): FinancialImpact {
    let totalCapex = 0;
    let totalOpexSavings = 0;
    
    for (const lever of levers) {
      totalCapex += lever.capexRange.max;
      totalOpexSavings += lever.opexRange.max;
    }
    
    const discountRate = 0.08;
    const npv = this.calculateNPV(totalCapex, totalOpexSavings, discountRate);
    const irr = this.calculateIRR(totalCapex, totalOpexSavings);
    const payback = totalCapex / totalOpexSavings;
    
    return {
      totalCapex,
      totalOpexSavings,
      netPresentValue: npv,
      irr,
      paybackPeriod: payback
    };
  }
  
  private calculateNPV(
    initialCapex: number,
    annualSavings: number,
    discountRate: number,
    years: number = 20
  ): number {
    let npv = -initialCapex;
    for (let year = 1; year <= years; year++) {
      npv += annualSavings / Math.pow(1 + discountRate, year);
    }
    return npv;
  }
  
  private calculateIRR(
    initialCapex: number,
    annualSavings: number,
    years: number = 20
  ): number {
    // Newton-Raphson method to find IRR
    let rate = 0.1;
    for (let i = 0; i < 100; i++) {
      let npv = -initialCapex;
      let derivative = 0;
      for (let year = 1; year <= years; year++) {
        npv += annualSavings / Math.pow(1 + rate, year);
        derivative -= year * annualSavings / Math.pow(1 + rate, year + 1);
      }
      rate = rate - npv / derivative;
      if (Math.abs(npv) < 0.01) break;
    }
    return rate * 100;
  }
}
```

### SbtService

```typescript
class SbtService {
  
  async checkAlignment(
    baselineYear: number,
    baselineEmissions: number,
    targetYear: number,
    targetEmissions: number,
    selectedLevers: TransitionLeverTemplate[]
  ): Promise<SBTAlignment> {
    const targetReductionPercent =
      ((baselineEmissions - targetEmissions) / baselineEmissions) * 100;
    
    // 1. Check if reduction meets 1.5°C / 2°C pathways
    const aligned1_5 = targetReductionPercent >= 45 && targetYear === 2030;
    const aligned2_0 = targetReductionPercent >= 25 && targetYear === 2030;
    
    // 2. Check if levers are SBT-eligible
    const elegibleLevers = selectedLevers.filter(l => l.sbtEligible);
    const leverCoverage = elegibleLevers.length / selectedLevers.length;
    
    // 3. Check scope coverage
    const scope3Coverage = this.estimateScope3Coverage(selectedLevers);
    const scope3Sufficient = scope3Coverage >= 0.5;
    
    return {
      aligned: aligned1_5 || aligned2_0,
      sbtInitiativeApproved: aligned1_5 && scope3Sufficient,
      nearTermTarget2030: aligned1_5 || aligned2_0,
      netZeroTarget2050: targetYear >= 2050,
      confidenceLevel: leverCoverage > 0.8 ? "high" : "medium"
    };
  }
  
  private estimateScope3Coverage(levers: TransitionLeverTemplate[]): number {
    const scope3Levers = levers.filter(l =>
      ["supply_chain", "removal"].includes(l.category)
    ).length;
    return scope3Levers / levers.length;
  }
}
```

---

## 6. UI/UX Design

### ScenarioBuilder Component

**Multi-Step Workflow:**

```
Step 1: Pathway Selection
┌──────────────────────────────────────┐
│ Choose your climate scenario          │
├──────────────────────────────────────┤
│                                      │
│ ○ 1.5°C Net-Zero by 2050            │
│   45% reduction by 2030              │
│   Most ambitious, highest capex      │
│                                      │
│ ○ 2°C Aligned (Net-Zero by 2070)    │
│   25% reduction by 2030              │
│   Moderate pace, balanced capex      │
│                                      │
│ ○ 3°C+ (Business-as-Usual +)        │
│   <5% reduction by 2030              │
│   Lowest cost, highest risk          │
│                                      │
│                       [Next] [Cancel]│
└──────────────────────────────────────┘

Step 2: Lever Selection
┌──────────────────────────────────────┐
│ Select transition levers              │
├──────────────────────────────────────┤
│ Energy (0/5 selected)                │
│ ☐ Renewable electricity (on-site)    │
│ ☐ Renewable electricity (PPAs)       │
│ ☐ Energy efficiency (buildings)      │
│ ☐ Energy efficiency (process)        │
│ ☐ Motor/pump optimization            │
│                                      │
│ Process & Technology (0/5 selected)  │
│ ☐ Electrification (furnaces)         │
│ ☐ Alternative fuels                  │
│ [... more]                           │
│                                      │
│ Supply Chain (0/4 selected)          │
│ ☐ Supplier engagement                │
│ [... more]                           │
│                                      │
│ [Preview Impact]    [Back] [Next]    │
└──────────────────────────────────────┘

Step 3: Lever Details (Optional Fine-Tuning)
┌──────────────────────────────────────┐
│ Renewable electricity (on-site)      │
├──────────────────────────────────────┤
│ Annual emission reduction:           │
│ [===●========] -5% (Range: -2% to -8%)│
│                                      │
│ Capex: €30M (Range: €5M to €50M)    │
│ Payback: 10 years (Range: 8-12 y)   │
│                                      │
│ Implementation: 2025-2030            │
│                                      │
│ SBT Eligible: ✓ Yes                  │
│                                      │
│                       [Back] [Next]  │
└──────────────────────────────────────┘

Step 4: Review & Create
┌──────────────────────────────────────┐
│ Review Your Scenario                 │
├──────────────────────────────────────┤
│ Name: [Aggressive 1.5°C Transition]  │
│ Pathway: 1.5°C Net-Zero by 2050     │
│ Levers Selected: 8                   │
│                                      │
│ Financial Summary                    │
│ Total Capex: €85M                    │
│ Annual Opex Savings: €12M            │
│ NPV (20-year): €42M                  │
│ IRR: 12.5%                           │
│                                      │
│ Risk Assessment                      │
│ Stranded Assets Risk: €28M           │
│ Physical Risk: Medium                │
│ Transition Risk: Medium              │
│                                      │
│ SBT Alignment: ✓ Aligned             │
│                                      │
│           [Create Scenario] [Cancel] │
└──────────────────────────────────────┘
```

### FinancialImpactDashboard

**Layout:**

```
Financial Impact Analysis
═════════════════════════════════════════

Capex Timeline
─────────────────────────────────────────
2025: €15M  ▓▓▓▓▓▓
2026: €25M  ▓▓▓▓▓▓▓▓▓▓
2027: €30M  ▓▓▓▓▓▓▓▓▓▓▓▓
2028: €12M  ▓▓▓▓▓

Total Capex: €82M

Cumulative Cash Flow
─────────────────────────────────────────
Year   Cumulative Capex   Annual Savings   Net
2025   -€15M              €0               -€15M
2027   -€70M              €8M              -€62M
2030   -€82M              €12M/y           -€46M
2035   -€82M              €12M/y            €8M (Payback reached)
2040   -€82M              €12M/y            €38M
2050   -€82M              €12M/y           €158M

Return on Investment (ROI)
─────────────────────────────────────────
Net Present Value (8% discount): €42M
Internal Rate of Return: 12.5%
Payback Period: 7 years
20-Year Cumulative Benefit: €158M

Risk-Adjusted Returns
─────────────────────────────────────────
Stranded Assets at Risk (Carbon Tax): €15M
  Mitigation: Transition faster → lock in transition benefits

Physical Risk (Climate Damage): €10M
  Mitigation: Renewable energy reduces grid exposure

Transition Risk (Technology): €3M
  Mitigation: Diversify lever portfolio
```

### DecarbonizationRoadmap

**Interactive Timeline:**

```
Decarbonization Roadmap: 2025-2050
═════════════════════════════════════════

Baseline (2023): 14,500 tCO2e/year
Target 1.5°C (2030): 8,000 tCO2e/year (45% reduction)
Net-Zero: 2050

     Emissions (tCO2e)
   16,000 │
          │     ●
   14,000 │   ●   
          │ ●       ●
   12,000 │         │         ●
          │         │         │       ●
   10,000 │         │         │       │       ●
          │         │         │       │       │ ●
    8,000 │─────────●         │       │       │ │ ●
          │                   │       │       │ │ │ ●
    6,000 │                   ├───────┤       │ │ │ │ ●
          │                   │       │       │ │ │ │ │ ●
    4,000 │                   │       ├───────┤ │ │ │ │ │ ●
          │                   │       │       │ │ │ │ │ │ │ ●
    2,000 │                   │       │       │ │ │ │ │ │ │ │ ●
          │                   │       │       │ │ │ │ │ │ │ │ │ ──●
        0 │                   │       │       │ │ │ │ │ │ │ │ │
          └─────────────────────────────────────┴─┴─┴─┴─┴─┴─┴──────
           2023  2025  2027  2029  2031  2035  2040  2045  2050

PHASE 1 (2025-2030): Foundation
└─ L001: Renewable electricity 50% by 2028
└─ L003: Energy efficiency -3%/year
└─ L007: Waste heat recovery 40%
└─ L016: Supplier engagement 40% by 2030
Emissions Target: 8,000 tCO2e (-45%)

PHASE 2 (2030-2040): Acceleration  
└─ L011: Furnace electrification 30%
└─ L017: Fleet optimization -4%/year
└─ L021: Carbon offsets 10%
Emissions Target: 3,000 tCO2e (-79%)

PHASE 3 (2040-2050): Net-Zero
└─ L012: Alternative fuels 80%
└─ L020: Carbon capture 30%
└─ L027: Circular economy model 50%
Emissions Target: 0 tCO2e (Net-Zero)

Key Milestones:
2025: First solar facility operational
2027: 50% renewable electricity achieved
2030: SBT near-term target met (45% reduction)
2035: Furnace electrification rollout begins
2040: 80% emissions reduction milestone
2045: 95% of scope 3 suppliers engaged
2050: Net-Zero achieved
```

---

## 7. Reference Data Seeding

**File:** `server/lib/transitionLeverSeed.ts`

Contains all 30+ TransitionLeverTemplate records.

**File:** `server/lib/climatePathwaySeed.ts`

Contains 1.5°C, 2°C, 3°C+ pathway definitions with targets per year.

---

## 8. Timeline & Deliverables

| Milestone | Date | Deliverable |
|-----------|------|-------------|
| GFANZ pathway research | Wed June 12 | Pathway spec (this doc Section 1) |
| Transition levers enumeration | Wed June 12 | 30+ levers with impact ranges |
| Schema design | Thu June 12 | Mongoose schemas approved |
| API contracts | Thu June 13 | API spec frozen |
| Calculation algorithms (spike) | Fri June 14 | ScenarioCalculator POC |
| **Design Review** | **Fri June 14** | **Design Team C presents** |

---

## 9. Success Criteria

- ✅ 1.5°C, 2°C, 3°C+ pathways researched & verified vs. GFANZ
- ✅ 30+ transition levers enumerated with realistic impact ranges
- ✅ Financial impact calculations auditable (±10% accuracy)
- ✅ Scenario creation <2 seconds
- ✅ SBT alignment checking >95% accuracy
- ✅ Roadmap provides actionable guidance
- ✅ Schemas extensible for Priority 2 (S1/G1 modules)

---

## Next Steps (Week 2)

**Backend Dev (Tasks 8-9):** Implement ScenarioService, calculations, SBT checking  
**Frontend Dev (Tasks 10-11):** Build ScenarioBuilder, FinancialImpactDashboard, Roadmap  
**Both:** Lock API contracts Friday design review

---

**Design Lead Sign-Off:**

- [ ] GFANZ pathways accurate and complete
- [ ] Transition levers realistic and comprehensive
- [ ] Calculation algorithms sound
- [ ] API contracts final
- [ ] Design review passed
- [ ] Team ready to implement

