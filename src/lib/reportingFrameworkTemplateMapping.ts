/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Maps a customer's selected Raporlama Çerçevesi (reporting framework) keys to the
 * matching Template name(s), so a project's Formlar can be kept in sync with the
 * frameworks selected for that customer. Multiple matching templates (e.g. both
 * TSRS 1 and TSRS 2) are added side by side rather than replacing one another.
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

/** Returns every template implied by the given (selected) framework keys. */
export function findTemplatesForFrameworkKeys(
  frameworkKeys: string[],
  allTemplates: Pick<Template, 'id' | 'name'>[],
): ReportingFrameworkTemplateMatch[] {
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

  return matches;
}
