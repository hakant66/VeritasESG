/**
 * Default GHG emission factors bundled with the platform.
 * Values are kgCO2e per `activityUnit`. Sources noted per factor.
 */
const factors = [
  // SCOPE 1 — direct emissions from owned/controlled sources
  { name: 'Doğal Gaz', scope: 'SCOPE_1', category: 'Natural gas', activityUnit: 'kWh', factorValue: 0.20299, factorUnit: 'kgCO2e/kWh', source: 'DEFRA 2023', versionYear: 2023, country: 'Turkey', notes: 'GCV (üst ısıl değer) bazlı / Gross Calorific Value basis' },
  { name: 'Motorin (Diesel)', scope: 'SCOPE_1', category: 'Diesel', activityUnit: 'L', factorValue: 2.68, factorUnit: 'kgCO2e/L', source: 'DEFRA 2023', versionYear: 2023, country: 'Turkey' },
  { name: 'LPG', scope: 'SCOPE_1', category: 'LPG', activityUnit: 'L', factorValue: 1.555, factorUnit: 'kgCO2e/L', source: 'DEFRA 2023', versionYear: 2023, country: 'Turkey' },
  { name: 'Benzin', scope: 'SCOPE_1', category: 'Petrol', activityUnit: 'L', factorValue: 2.31, factorUnit: 'kgCO2e/L', source: 'DEFRA 2023', versionYear: 2023, country: 'Turkey' },
  { name: 'HFC-134a Soğutucu Gaz', scope: 'SCOPE_1', category: 'Refrigerants', activityUnit: 'kg', factorValue: 1530, factorUnit: 'kgCO2e/kg', source: 'IPCC AR6 GWP100', versionYear: 2023, country: 'Global' },
  { name: 'R410A Soğutucu Gaz', scope: 'SCOPE_1', category: 'Refrigerants', activityUnit: 'kg', factorValue: 2256, factorUnit: 'kgCO2e/kg', source: 'IPCC AR6 GWP100', versionYear: 2023, country: 'Global' },
  // SCOPE 2 — indirect emissions from purchased energy
  { name: 'Türkiye Şebeke Elektriği', scope: 'SCOPE_2', category: 'Purchased electricity', activityUnit: 'kWh', factorValue: 0.4463, factorUnit: 'kgCO2e/kWh', source: 'TEİAŞ 2022', versionYear: 2022, country: 'Turkey' },
  { name: 'Satın Alınan Buhar', scope: 'SCOPE_2', category: 'Purchased steam', activityUnit: 'MWh', factorValue: 270, factorUnit: 'kgCO2e/MWh', source: 'Industry default', versionYear: 2023, country: 'Turkey', userOverridable: true, notes: 'Sektör ortalaması — denetlenebilir kaynak yoksa kullanıcı tarafından güncellenebilir / Industry average, user-overridable' },
] as const;

/** Upsert all bundled emission factors, keyed by `name`. Safe to call repeatedly. */
export async function seedEmissionFactors(): Promise<number> {
  const { upsertEmissionFactorByName } = await import('../data/seedDataAccess.ts');
  await Promise.all(
    factors.map((factor) => upsertEmissionFactorByName(factor.name, { ...factor })),
  );
  return factors.length;
}

/**
 * Correct legacy emission factor records in place (idempotent; safe to run on
 * every startup). Must run BEFORE upserts so renamed records are matched.
 *
 * NOTE: Historical `EmissionEntry.factorValue` snapshots are intentionally left
 * untouched — they record the factor as it was at calculation time.
 */
export async function correctLegacyEmissionFactors(): Promise<void> {
  const { updateEmissionFactorByName } = await import('../data/seedDataAccess.ts');
  await updateEmissionFactorByName('Fuel-Oil / Motorin', { name: 'Motorin (Diesel)' });
  await updateEmissionFactorByName('HFC-134a Soğutucu Gaz', {
    factorValue: 1530,
    source: 'IPCC AR6 GWP100',
  });
  await updateEmissionFactorByName('R410A Soğutucu Gaz', {
    factorValue: 2256,
    source: 'IPCC AR6 GWP100',
  });
  await updateEmissionFactorByName('Satın Alınan Buhar', {
    userOverridable: true,
    notes:
      'Sektör ortalaması — denetlenebilir kaynak yoksa kullanıcı tarafından güncellenebilir / Industry average, user-overridable',
  });
  await updateEmissionFactorByName('Doğal Gaz', {
    notes: 'GCV (üst ısıl değer) bazlı / Gross Calorific Value basis',
  });
  console.log('[MIGRATION] Corrected legacy emission factors.');
}

/** Seed factors only when the collection is empty (idempotent startup hook). */
export async function seedEmissionFactorsIfEmpty(): Promise<void> {
  const { countEmissionFactors } = await import('../data/seedDataAccess.ts');
  const count = await countEmissionFactors();
  if (count === 0) {
    const seeded = await seedEmissionFactors();
    console.log(`[SEED] Seeded ${seeded} emission factors.`);
  }
}

/** Seed the emission-relevant metric definitions when none exist (idempotent). */
export async function seedMetricDefinitionsIfEmpty(): Promise<void> {
  const { countMetricDefinitions, insertMetricDefinitions } = await import('../data/seedDataAccess.ts');
  const count = await countMetricDefinitions();
  if (count > 0) return;

  await insertMetricDefinitions([
    // SCOPE 1
    { code: 'natural_gas_consumption',     name: 'Natural Gas Consumption',         nameTr: 'Doğal Gaz Tüketimi',         category: 'Energy',       unit: 'kWh',    isRequired: true,  scope: 'SCOPE_1' },
    { code: 'diesel_consumption',          name: 'Diesel Consumption',              nameTr: 'Motorin (Diesel) Tüketimi',  category: 'Fuel',         unit: 'L',      isRequired: true,  scope: 'SCOPE_1' },
    { code: 'petrol_consumption',          name: 'Petrol Consumption',              nameTr: 'Benzin Tüketimi',            category: 'Fuel',         unit: 'L',      isRequired: false, scope: 'SCOPE_1' },
    { code: 'lpg_consumption',             name: 'LPG Consumption',                 nameTr: 'LPG Tüketimi',               category: 'Fuel',         unit: 'L',      isRequired: false, scope: 'SCOPE_1' },
    { code: 'fuel_oil_consumption',        name: 'Fuel Oil Consumption',            nameTr: 'Fuel-Oil Tüketimi',          category: 'Fuel',         unit: 'L',      isRequired: false, scope: 'SCOPE_1' },
    // SCOPE 2
    { code: 'electricity_consumption',     name: 'Electricity Consumption',         nameTr: 'Elektrik Tüketimi',          category: 'Energy',       unit: 'kWh',    isRequired: true,  scope: 'SCOPE_2' },
    { code: 'district_heat_consumption',   name: 'District Heat / Steam',           nameTr: 'Satın Alınan Isı / Buhar',   category: 'Energy',       unit: 'kWh',    isRequired: false, scope: 'SCOPE_2' },
    // SCOPE 3
    { code: 's3_purchased_goods_spend',    name: 'Purchased Goods & Services',      nameTr: 'Satın Alınan Mal ve Hizmet', category: 'S3',           unit: 'kUSD',   isRequired: false, scope: 'SCOPE_3' },
    { code: 's3_upstream_logistics_tkm',   name: 'Upstream Logistics (ton-km)',     nameTr: 'Upstream Lojistik',          category: 'S3',           unit: 'ton-km', isRequired: false, scope: 'SCOPE_3' },
    { code: 's3_waste_to_landfill',        name: 'Waste to Landfill',               nameTr: 'Düzenli Depolama Atığı',     category: 'S3',           unit: 'ton',    isRequired: false, scope: 'SCOPE_3' },
    { code: 's3_waste_incinerated',        name: 'Waste Incinerated',               nameTr: 'Yakılan Atık',               category: 'S3',           unit: 'ton',    isRequired: false, scope: 'SCOPE_3' },
    { code: 's3_business_travel_air_short',name: 'Business Travel — Short Haul Air',nameTr: 'Kısa Mesafe Uçuş',          category: 'S3',           unit: 'km',     isRequired: false, scope: 'SCOPE_3' },
    { code: 's3_employee_commute_car',     name: 'Employee Commute — Car',          nameTr: 'Çalışan Ulaşımı (Araç)',     category: 'S3',           unit: 'km',     isRequired: false, scope: 'SCOPE_3' },
  ]);
  console.log('[Seed] MetricDefinitions seeded.');
}
