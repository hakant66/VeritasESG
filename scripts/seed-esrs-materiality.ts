import { createRequire } from 'module';
import { getPrisma } from '../server/data/prismaClient.ts';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const EXCEL_PATH = './docs/templates/ESRS_CSRD_Materiality_Matrix.xlsx';

async function seedESRSMateriality() {
  try {
    console.log(`Reading Excel file: ${EXCEL_PATH}`);
    const wb = XLSX.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

    console.log(`Found ${data.length} rows in Excel (including headers).`);

    // Filter out header and separator rows
    const rows = data
      .filter((row: any) => {
        const noVal = row['ESRS / CSRD MATERYALİTE MATRİSİ — Resmi AR16 Sürdürülebilirlik Konuları Yapısı (ESRS 1 Appendix A)'];
        // Skip headers and section dividers
        if (!noVal || noVal === 'No') return false;
        if (typeof noVal === 'string' && noVal.includes('ESRS')) return false;
        return true;
      })
      .map((row: any) => {
        const code = row['__EMPTY'] || '';
        const topic = row['__EMPTY_1'] || '';
        const subtopic = row['__EMPTY_2'] || '';
        const subsubtopic = row['__EMPTY_3'] || '';
        const disclosure = row['__EMPTY_4'] || '';
        const materialityType = row['__EMPTY_5'] || '';
        const note = row['__EMPTY_6'] || '';

        // Build subject from topic hierarchy
        let subject = topic;
        if (subtopic) subject += ` → ${subtopic}`;
        if (subsubtopic && subsubtopic !== '—') subject += ` → ${subsubtopic}`;

        return {
          subject: subject || code,
          griMapping: code, // Use ESRS code instead
          disclosures: disclosure,
          notes: `Materyalite: ${materialityType}. ${note}`,
        };
      });

    console.log(`Filtered to ${rows.length} data rows.`);

    const systemId = '_materiality_design_esrs';
    const prisma = getPrisma();

    console.log(`Clearing existing ESRS materiality data (customerId: ${systemId})...`);
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

    console.log('✓ ESRS materiality data seeded successfully!');
    console.log(`Total rows inserted: ${docs.length}`);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedESRSMateriality();
