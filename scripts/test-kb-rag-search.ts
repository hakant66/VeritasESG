/**
 * Dev-only live retrieval smoke test against Qdrant + Gemini embeddings.
 *
 * Usage:
 *   npx tsx scripts/test-kb-rag-search.ts [customerId] ["query"]
 */

import dotenv from 'dotenv';
import { searchCustomerKbChunks } from '../server/lib/rag/searchCustomerKb.ts';

dotenv.config();

const AKKIM_CUSTOMER_ID = '6a213df07ae56bf26fd1a7bb';

async function main() {
  const customerId = process.argv[2]?.trim() || AKKIM_CUSTOMER_ID;
  const queries = process.argv[3]
    ? [process.argv[3]]
    : ['Akkim kaç çalışan?', 'Akkim vergi numarası', 'Yönetim kurulu başkanı kim'];

  for (const query of queries) {
    console.log(`\n=== Q: ${query} ===`);
    const hits = await searchCustomerKbChunks(customerId, query, 2);
    if (hits.length === 0) {
      console.log('(no hits)');
      continue;
    }
    for (const hit of hits) {
      console.log(
        `score: ${hit.score.toFixed(4)} | ${hit.documentName} #${hit.chunkIndex}`,
      );
      console.log(`${hit.text.slice(0, 280).replace(/\s+/g, ' ')}...`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
