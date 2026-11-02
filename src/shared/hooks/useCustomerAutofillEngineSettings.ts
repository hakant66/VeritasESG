/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_CUSTOMER_AUTOFILL_ENGINE_SETTINGS,
  type CustomerAutofillEngineSettings,
} from '../../../lib/customerAutofillEngineSettings.ts';
import { apiRequest } from '../../lib/apiClient.ts';

export type CustomerAutofillEngineSettingsResponse = {
  settings: CustomerAutofillEngineSettings;
};

export const customerAutofillEngineSettingsQueryKey = ['admin', 'customer-autofill-engine-settings'] as const;

export async function fetchCustomerAutofillEngineSettings(): Promise<CustomerAutofillEngineSettingsResponse> {
  return apiRequest<CustomerAutofillEngineSettingsResponse>('/api/admin/customer-autofill-engine/settings');
}

export function useCustomerAutofillEngineSettings() {
  return useQuery({
    queryKey: customerAutofillEngineSettingsQueryKey,
    queryFn: fetchCustomerAutofillEngineSettings,
    select: (data) => ({
      settings: { ...DEFAULT_CUSTOMER_AUTOFILL_ENGINE_SETTINGS, ...data.settings },
    }),
  });
}

export function useSaveCustomerAutofillEngineSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: CustomerAutofillEngineSettings) =>
      apiRequest<CustomerAutofillEngineSettingsResponse>('/api/admin/customer-autofill-engine/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(customerAutofillEngineSettingsQueryKey, data);
    },
  });
}
