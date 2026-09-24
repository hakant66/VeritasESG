import { createRequire } from 'module';
import { getPrisma } from '../server/data/prismaClient.ts';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const EXCEL_PATH = './docs/templates/GRI Materiality Matrix.xlsx';

async function seedGRIMateriality() {
  try {
    console.log(`Reading Excel file: ${EXCEL_PATH}`);
    const wb = XLSX.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

    console.log(`Found ${data.length} rows in Excel.`);

    const systemId = '_materiality_design_gri';
    const prisma = getPrisma();

    console.log(`Clearing existing GRI materiality data (customerId: ${systemId})...`);
    await prisma.gRIMaterialityMatrixRow.deleteMany({ where: { customerId: systemId } });

    console.log('Creating new rows from Excel data...');
    const docs = data.map((row: any, idx: number) => ({
      customerId: systemId,
      order: idx,
      subject: row['Materiality konusu'] || row.subject || '',
      griMapping: row['Ana GRI eşleşmesi'] || row.griMapping || '',
      disclosures: row['İlgili GRI disclosure / clause'] || row.disclosures || '',
      notes: row.Not || row.notes || '',
    }));

    console.log(`Inserting ${docs.length} rows...`);
    await prisma.gRIMaterialityMatrixRow.createMany({ data: docs });

    console.log('✓ GRI materiality data seeded successfully!');
    console.log(`Total rows inserted: ${docs.length}`);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedGRIMateriality();
