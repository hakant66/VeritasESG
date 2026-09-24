/**
 * Dev-only live knowledge chat smoke test (Qdrant retrieval + server Gemini).
 *
 * Usage:
 *   npx tsx scripts/test-kb-rag-chat.ts [kbId] ["query"]
 */

import dotenv from 'dotenv';
import { answerKnowledgeChatQuery } from '../server/lib/rag/knowledgeChatAnswer.ts';

dotenv.config();

const AKKIM_KB_ID = '6a24c1e182d4ac80fe13c349';

async function main() {
  const kbId = process.argv[2]?.trim() || AKKIM_KB_ID;
  const query = process.argv[3]?.trim() || 'Akkim kaç çalışan?';

  const result = await answerKnowledgeChatQuery({
    query,
    kbIds: [kbId],
    lang: 'tr',
    userContext: { customerName: 'Akkim Kimya' },
    customerId: '6a213df07ae56bf26fd1a7bb',
  });

  console.log(JSON.stringify({
    query: result.query,
    chunkCount: result.chunkCount,
    sourceCount: result.sources.length,
    sources: result.sources,
    answerPreview: result.answer.slice(0, 500),
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
