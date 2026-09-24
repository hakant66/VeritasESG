export { CompletenessService } from './CompletenessService';
export { ConsistencyService } from './ConsistencyService';
export { DataPointResolver } from './DataPointResolver';
export { FrameworkRegistry } from './FrameworkRegistry';
export { ClimateScenarioService } from './ClimateScenarioService';
export type { Gap } from './CompletenessService';
export { calculateVariance, inferCauses } from './ConsistencyValidator';
export {
  calculateFinancialImpact,
  calculateEmissionReductions,
  assessRisk,
  checkSBTAlignment,
} from './ScenarioCalculator';
