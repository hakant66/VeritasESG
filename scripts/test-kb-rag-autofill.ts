/**
 * Dev-only live autofill smoke test.
 *
 * Usage:
 *   npx tsx scripts/test-kb-rag-autofill.ts [customerId]
 */

import dotenv from 'dotenv';
import { autofillCustomerFromKb } from '../server/lib/rag/customerAutofill.ts';

dotenv.config();

const AKKIM_CUSTOMER_ID = '6a213df07ae56bf26fd1a7bb';

async function main() {
  const customerId = process.argv[2]?.trim() || AKKIM_CUSTOMER_ID;

  const result = await autofillCustomerFromKb(customerId, 'Akkim Kimya', ['basic', 'workforce', 'sector']);
  console.log(JSON.stringify({
    customerId: result.customerId,
    chunkCount: result.chunkCount,
    suggestionCount: Object.keys(result.suggestions).length,
    suggestions: result.suggestions,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
