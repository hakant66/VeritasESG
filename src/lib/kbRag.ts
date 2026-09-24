/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Re-export for legacy imports. Prefer `features/knowledge-base/api/kbRag`.
 */

export {
  autofillCustomerFromKb,
  autofillTaskQuestionAnswer,
  chatKnowledgeBase,
  fetchTaskLlmProviderSummary,
  getKbDocumentIndexStatus,
  indexKbDocument,
  purgeKbDocumentIndex,
  searchCustomerKb,
  waitForKbDocumentIndexed,
  type BranchAutofillSuggestion,
  type CustomerAutofillFieldSuggestion,
  type CustomerAutofillGroupId,
  type CustomerAutofillResult,
  type CustomerKbSearchHit,
  type KbIngestJob,
  type KbIngestJobStatus,
  type KnowledgeChatResult,
  type KnowledgeChatSource,
  type StakeholderAutofillSuggestion,
  type TaskLlmProviderSummary,
  type TaskQuestionAutofillResult,
} from '../features/knowledge-base/api/kbRag.ts';
