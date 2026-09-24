/**
 * Maps MetricDefinition codes to EmissionFactor categories for auto-calculation.
 * Categories match seeded factors in `server/lib/emissionFactorSeed.ts`.
 */

export const metricToFactorCategory: Record<string, string> = {
  natural_gas_consumption: 'Natural gas',
  diesel_consumption: 'Diesel',
  petrol_consumption: 'Petrol',
  lpg_consumption: 'LPG',
  electricity_consumption: 'Purchased electricity',
  district_heat_consumption: 'Purchased steam',
};
