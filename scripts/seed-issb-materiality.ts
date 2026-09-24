import { createRequire } from 'module';
import { getPrisma } from '../server/data/prismaClient.ts';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const EXCEL_PATH = './docs/templates/ISSB_IFRS_S1_S2_Materiality_Matrix.xlsx';

async function seedISSBMateriality() {
  try {
    console.log(`Reading Excel file: ${EXCEL_PATH}`);
    const wb = XLSX.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

    console.log(`Found ${data.length} rows in Excel (including headers).`);

    // Filter out header rows and map to data structure
    const colHeader = 'ISSB (IFRS S1/S2) MATERYALİTE MATRİSİ — Resmi SASB 26 Genel Konu Kategorisi (GIC) Yapısı';
    const rows = data
      .filter((row: any) => {
        const idCol = row[colHeader];
        // Keep only rows where first column is a number (actual data rows)
        return typeof idCol === 'number';
      })
      .map((row: any) => {
        const subject = row['__EMPTY'] || '';
        const scope = row['__EMPTY_1'] || '';
        const standard = row['__EMPTY_2'] || '';
        const rationale = row['__EMPTY_3'] || '';

        return {
          subject: subject.trim(),
          griMapping: standard.trim(), // IFRS standard
          disclosures: scope.trim(),
          notes: rationale.trim(),
        };
      });

    console.log(`Filtered to ${rows.length} data rows.`);

    const systemId = '_materiality_design_issb';
    const prisma = getPrisma();

    console.log(`Clearing existing ISSB materiality data (customerId: ${systemId})...`);
    await prisma.gRIMaterialityMatrixRow.deleteMany({ where: { customerId: systemId } });

    console.log('Creating new rows from Excel data...');
    const docs = rows.map((row: any, idx: number) => ({
      customerId: systemId,
      order: idx,
      subject: row.subject,
      griMapping: row.griMapping,
      disclosures: row.disclosures,
      notes: row.notes,
    }));

    console.log(`Inserting ${docs.length} rows...`);
    await prisma.gRIMaterialityMatrixRow.createMany({ data: docs });

    console.log('✓ ISSB materiality data seeded successfully!');
    console.log(`Total rows inserted: ${docs.length}`);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedISSBMateriality();
