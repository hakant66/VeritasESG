/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin-managed switch between the two customer-profile-autofill engines
 * (see server/lib/rag/customerAutofill.ts vs customerAutofillGraph.ts).
 * Off (default engine) by default — platform_admin must opt in.
 */

export interface CustomerAutofillEngineSettings {
  /** true = LangGraph engine (retry + citation verification + conflict cross-check); false = default single-shot engine. */
  useGraphEngine: boolean;
  updatedAt?: number;
  updatedBy?: string;
}

export const CUSTOMER_AUTOFILL_ENGINE_SETTINGS_KEY = 'customerAutofillEngine';

export const DEFAULT_CUSTOMER_AUTOFILL_ENGINE_SETTINGS: CustomerAutofillEngineSettings = {
  useGraphEngine: false,
};

export function normalizeCustomerAutofillEngineSettings(
  raw: Record<string, unknown>,
): CustomerAutofillEngineSettings {
  return {
    useGraphEngine: Boolean(raw.useGraphEngine),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
  };
}
