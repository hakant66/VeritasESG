/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { buildSectoralDefinitionLegacy } from '../../data/sectorClassification';
import { EsgSectionCard } from './EsgSectionCard';
import { FormField, PolicyStatusSelect } from './FormField';

type CustomerEsgSummaryTabProps = {
  customer?: Customer | null;
};

function numDefault(v?: number) {
  return v === undefined || v === null ? '' : String(v);
}

export function CustomerEsgSummaryTab({ customer }: CustomerEsgSummaryTabProps) {
  const { t } = useTranslation();
  const esg = customer?.esgSummary ?? {};
  const sectoralDisplay =
    customer?.sectoralDefinition?.trim() ||
    buildSectoralDefinitionLegacy(customer?.naceCode ?? '', customer?.naceDescription ?? '');

  return (
    <div className="space-y-5">
      <EsgSectionCard sectionNumber={1} title={t.customers.esgSection1Title}>
        <FormField label={t.customers.legalNameLabel} fullWidth>
          <input
            name="legalName"
            type="text"
            className="minimal-input"
            defaultValue={customer?.legalName || customer?.name}
            placeholder={t.customers.legalNamePlaceholder}
          />
        </FormField>
        <FormField label={t.customers.brandPortfolio} fullWidth>
          <textarea
            name="brandPortfolio"
            className="minimal-input h-20"
            defaultValue={customer?.brandPortfolio}
            placeholder={t.customers.brandPortfolioPlaceholder}
          />
        </FormField>
        <FormField label={t.customers.naceCodeLabel}>
          <input type="text" className="minimal-input bg-slate-100" readOnly value={customer?.naceCode ?? ''} />
          <p className="text-[10px] text-slate-500">{t.customers.esgNaceReadonlyHint}</p>
        </FormField>
        <FormField label={t.customers.sectoralDefinition}>
          <input type="text" className="minimal-input bg-slate-100" readOnly value={sectoralDisplay} />
        </FormField>
        <FormField label={t.customers.operationalGeographies} fullWidth>
          <textarea
            name="operationGeographies"
            className="minimal-input h-20"
            defaultValue={customer?.operationGeographies}
            placeholder={t.customers.operationalGeographiesPlaceholder}
          />
        </FormField>

        <FormField label={t.customers.totalEmployees} fullWidth>
          <input
            name="employeeCountTotal"
            type="number"
            className="minimal-input"
            defaultValue={numDefault(customer?.employeeCountTotal)}
          />
        </FormField>

        <div className="md:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t.customers.blueCollar}>
            <input
              name="employeeCountBlueCollar"
              type="number"
              className="minimal-input"
              defaultValue={numDefault(customer?.employeeCountBlueCollar)}
            />
          </FormField>
          <FormField label={t.customers.whiteCollar}>
            <input
              name="employeeCountWhiteCollar"
              type="number"
              className="minimal-input"
              defaultValue={numDefault(customer?.employeeCountWhiteCollar)}
            />
          </FormField>
          <FormField label={t.customers.male}>
            <input
              name="employeeCountMale"
              type="number"
              className="minimal-input"
              defaultValue={numDefault(customer?.employeeCountMale)}
            />
          </FormField>
          <FormField label={t.customers.female}>
            <input
              name="employeeCountFemale"
              type="number"
              className="minimal-input"
              defaultValue={numDefault(customer?.employeeCountFemale)}
            />
          </FormField>
          <FormField label={t.customers.employeeCountPermanent}>
            <input
              name="employeeCountPermanent"
              type="number"
              className="minimal-input"
              defaultValue={numDefault(customer?.employeeCountPermanent)}
            />
          </FormField>
          <FormField label={t.customers.employeeCountTemporary}>
            <input
              name="employeeCountTemporary"
              type="number"
              className="minimal-input"
              defaultValue={numDefault(customer?.employeeCountTemporary)}
            />
          </FormField>
        </div>

        <FormField label={t.customers.esgReportingBoundaryNote} fullWidth>
          <textarea
            name="esg_reportingBoundaryNote"
            className="minimal-input h-20"
            defaultValue={esg.reportingBoundaryNote}
          />
        </FormField>
      </EsgSectionCard>

      <EsgSectionCard sectionNumber={2} title={t.customers.esgSection2Title}>
        <FormField label={t.customers.esgFinancialYearStart}>
          <input
            name="esg_financialYearStart"
            type="date"
            className="minimal-input"
            defaultValue={esg.financialYearStart}
          />
        </FormField>
        <FormField label={t.customers.esgFinancialYearEnd}>
          <input name="esg_financialYearEnd" type="date" className="minimal-input" defaultValue={esg.financialYearEnd} />
        </FormField>
        <FormField label={t.customers.annualTurnoverMeurLabel}>
          <input
            name="annualTurnoverMeur"
            type="number"
            min={0}
            step="any"
            className="minimal-input"
            defaultValue={numDefault(customer?.annualTurnoverMeur)}
          />
        </FormField>
        <FormField label={t.customers.totalAssetsMeurLabel}>
          <input
            name="totalAssetsMeur"
            type="number"
            min={0}
            step="any"
            className="minimal-input"
            defaultValue={numDefault(customer?.totalAssetsMeur)}
          />
        </FormField>
        <FormField label={t.customers.esgEbitda}>
          <input
            name="esg_ebitdaMeur"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.ebitdaMeur)}
          />
        </FormField>
        <FormField label={t.customers.esgNetProfit}>
          <input
            name="esg_netProfitMeur"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.netProfitMeur)}
          />
        </FormField>
        <FormField label={t.customers.esgEquity}>
          <input
            name="esg_equityMeur"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.equityMeur)}
          />
        </FormField>
        <FormField label={t.customers.esgSustainabilityCapex}>
          <input
            name="esg_sustainabilityCapexForecastMeur"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.sustainabilityCapexForecastMeur)}
          />
        </FormField>
        <FormField label={t.customers.esgRdExpenditure}>
          <input
            name="esg_rdExpenditureMeur"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.rdExpenditureMeur)}
          />
        </FormField>
      </EsgSectionCard>

      <EsgSectionCard sectionNumber={3} title={t.customers.esgSection3Title}>
        <FormField label={t.customers.esgSustainabilityExecutive} fullWidth>
          <input
            name="esg_sustainabilityExecutive"
            type="text"
            className="minimal-input"
            defaultValue={esg.sustainabilityExecutive}
          />
        </FormField>
        <FormField label={t.customers.esgBusinessResilience} fullWidth>
          <textarea
            name="esg_businessResilienceAssessment"
            className="minimal-input h-24"
            defaultValue={esg.businessResilienceAssessment}
          />
        </FormField>
        <FormField label={t.customers.esgEthicsPolicy}>
          <PolicyStatusSelect name="esg_ethicsPolicyStatus" defaultValue={esg.ethicsPolicyStatus} />
        </FormField>
        <FormField label={t.customers.esgGdprKvkk}>
          <PolicyStatusSelect name="esg_gdprKvkkPolicyStatus" defaultValue={esg.gdprKvkkPolicyStatus} />
        </FormField>
        <FormField label={t.customers.esgClimateRiskRegister}>
          <PolicyStatusSelect name="esg_climateRiskInRegister" defaultValue={esg.climateRiskInRegister} />
        </FormField>
      </EsgSectionCard>

      <EsgSectionCard sectionNumber={4} title={t.customers.esgSection4Title}>
        <FormField label={t.customers.esgElectricityMwh}>
          <input
            name="esg_electricityMwh"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.electricityMwh)}
          />
        </FormField>
        <FormField label={t.customers.esgNaturalGasMwh}>
          <input
            name="esg_naturalGasMwh"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.naturalGasMwh)}
          />
        </FormField>
        <FormField label={t.customers.esgFuelMwh}>
          <input
            name="esg_fuelMwh"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.fuelMwh)}
          />
        </FormField>
        <FormField label={t.customers.esgRenewableEnergyPercent}>
          <input
            name="esg_renewableEnergyPercent"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.renewableEnergyPercent)}
          />
        </FormField>
        <FormField label={t.customers.esgScope1}>
          <input
            name="esg_scope1EmissionsTco2e"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.scope1EmissionsTco2e)}
          />
        </FormField>
        <FormField label={t.customers.esgScope2}>
          <input
            name="esg_scope2EmissionsTco2e"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.scope2EmissionsTco2e)}
          />
        </FormField>
        <FormField label={t.customers.esgScope3}>
          <input
            name="esg_scope3EmissionsTco2e"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.scope3EmissionsTco2e)}
          />
        </FormField>
        <FormField label={t.customers.esgWaterWithdrawal}>
          <input
            name="esg_waterWithdrawalM3"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.waterWithdrawalM3)}
          />
        </FormField>
        <FormField label={t.customers.esgWasteRecycling}>
          <input
            name="esg_wasteRecyclingPercent"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.wasteRecyclingPercent)}
          />
        </FormField>
      </EsgSectionCard>

      <EsgSectionCard sectionNumber={5} title={t.customers.esgSection5Title}>
        <FormField label={t.customers.esgLtiRate}>
          <input
            name="esg_ltiFrequencyRate"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.ltiFrequencyRate)}
          />
        </FormField>
        <FormField label={t.customers.esgTrainingHours}>
          <input
            name="esg_avgTrainingHoursPerEmployee"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.avgTrainingHoursPerEmployee)}
          />
        </FormField>
        <FormField label={t.customers.esgFemaleManagers}>
          <input
            name="esg_femaleManagerPercent"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.femaleManagerPercent)}
          />
        </FormField>
        <FormField label={t.customers.esgTurnover}>
          <input
            name="esg_turnoverPercent"
            type="number"
            step="any"
            className="minimal-input"
            defaultValue={numDefault(esg.turnoverPercent)}
          />
        </FormField>
        <FormField label={t.customers.esgSupplierAudit}>
          <PolicyStatusSelect name="esg_supplierSocialAuditStatus" defaultValue={esg.supplierSocialAuditStatus} />
        </FormField>
      </EsgSectionCard>
    </div>
  );
}
