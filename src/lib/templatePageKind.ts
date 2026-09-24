/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TemplatePageKind = 'customer_question_set' | 'audit_question_set';

export const TEMPLATE_PAGE_KINDS: TemplatePageKind[] = [
  'customer_question_set',
  'audit_question_set',
];

export function isTemplatePageKind(value: string | undefined): value is TemplatePageKind {
  return value === 'customer_question_set' || value === 'audit_question_set';
}

/** Legacy pages without pageKind are treated as customer question sets. */
export function normalizeTemplatePageKind(
  kind: string | undefined,
): TemplatePageKind {
  return kind === 'audit_question_set' ? 'audit_question_set' : 'customer_question_set';
}

export function isAuditQuestionSetPage(page: {
  pageKind?: string;
}): boolean {
  return normalizeTemplatePageKind(page.pageKind) === 'audit_question_set';
}

export function isCustomerQuestionSetPage(page: {
  pageKind?: string;
}): boolean {
  return normalizeTemplatePageKind(page.pageKind) === 'customer_question_set';
}
