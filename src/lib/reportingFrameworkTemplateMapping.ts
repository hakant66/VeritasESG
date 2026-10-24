/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Maps a customer's selected Raporlama Çerçevesi (reporting framework) keys to the
 * matching Template name, so a project can auto-load the right Formlar when exactly
 * one selected framework has a known template. A project can only have one active
 * template at a time (Form Ekle replaces everything), so when more than one selected
 * framework matches a template, auto-load is intentionally skipped as ambiguous.
 */
import type { ReportingFrameworkKey } from '../../lib/reportingFrameworkKeys';
import type { Template } from '../types';

export const REPORTING_FRAMEWORK_TEMPLATE_NAME: Partial<Record<ReportingFrameworkKey, string>> = {
  gri: 'GRI',
  tsrs_1: 'TSRS1',
  tsrs_2: 'TSRS2',
};

export type ReportingFrameworkTemplateMatch = {
  templateId: string;
  templateName: string;
  frameworkKey: ReportingFrameworkKey;
};

/**
 * Returns the single template implied by the given framework keys, or null when
 * zero or more than one selected framework maps to a known template.
 */
export function findSingleTemplateForFrameworkKeys(
  frameworkKeys: string[],
  allTemplates: Pick<Template, 'id' | 'name'>[],
): ReportingFrameworkTemplateMatch | null {
  const matches: ReportingFrameworkTemplateMatch[] = [];

  for (const key of frameworkKeys) {
    const templateName = REPORTING_FRAMEWORK_TEMPLATE_NAME[key as ReportingFrameworkKey];
    if (!templateName) continue;
    const template = allTemplates.find(
      (t) => t.name.trim().toLowerCase() === templateName.toLowerCase(),
    );
    if (template) {
      matches.push({ templateId: template.id, templateName: template.name, frameworkKey: key as ReportingFrameworkKey });
    }
  }

  if (matches.length !== 1) return null;
  return matches[0];
}
