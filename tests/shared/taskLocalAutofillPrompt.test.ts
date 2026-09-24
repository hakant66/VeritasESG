/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  buildLocalAutofillStrictRules,
  getLocalAutofillNoContextMessage,
  isLegalOwnershipQuestion,
} from '../../lib/taskLocalAutofillPrompt.ts';

describe('taskLocalAutofillPrompt', () => {
  it('detects legal ownership questions', () => {
    expect(
      isLegalOwnershipQuestion({
        soru: 'Şirketin sahipli yapısı ve hukuki şeklini açıklayınız.',
      }),
    ).toBe(true);
  });

  it('includes halka açık prohibition for legal questions', () => {
    const rules = buildLocalAutofillStrictRules('tr', 'Akkim Kimya', {
      soru: 'Hukuki şekil ve halka açıklık',
    });
    expect(rules).toContain('halka açık');
    expect(rules).toContain('AKKIM RAPOR');
    expect(rules).toContain('Akkök Holding');
  });

  it('requires single no-context sentence without follow-up', () => {
    const msg = getLocalAutofillNoContextMessage('en');
    const rules = buildLocalAutofillStrictRules('en', 'Akkim', { soru: 'Legal form' });
    expect(rules).toContain(msg);
    expect(rules).toContain('ENTIRE response must be only this sentence');
  });
});
