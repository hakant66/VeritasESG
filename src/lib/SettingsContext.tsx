import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from './apiClient';

interface AppSettings {
  platformName: string;
  platformLogoSquareUrl: string;
  platformLogoRectangleUrl: string;
  moduleProjectsEnabled: boolean;
  helpDashboardUrl: string;
  helpDashboardMd: string;
  helpDashboardTitle: string;
  helpCustomersUrl: string;
  helpCustomersMd: string;
  helpCustomersTitle: string;
  helpCustomerDirectoryUrl: string;
  helpCustomerDirectoryMd: string;
  helpCustomerDirectoryTitle: string;
  helpProjectsUrl: string;
  helpProjectsMd: string;
  helpProjectsTitle: string;
  helpAssignmentsUrl: string;
  helpAssignmentsMd: string;
  helpAssignmentsTitle: string;
  helpUsersUrl: string;
  helpUsersMd: string;
  helpUsersTitle: string;
  helpActivitiesUrl: string;
  helpActivitiesMd: string;
  helpActivitiesTitle: string;
  helpSettingsUrl: string;
  helpSettingsMd: string;
  helpSettingsTitle: string;
  helpKnowledgeBaseUrl: string;
  helpKnowledgeBaseMd: string;
  helpKnowledgeBaseTitle: string;
  helpDashboardOrder: number | null;
  helpCustomersOrder: number | null;
  helpCustomerDirectoryOrder: number | null;
  helpProjectsOrder: number | null;
  helpAssignmentsOrder: number | null;
  helpUsersOrder: number | null;
  helpActivitiesOrder: number | null;
  helpSettingsOrder: number | null;
  helpKnowledgeBaseOrder: number | null;
}

const defaultSettings: AppSettings = {
  platformName: 'VeritasESG',
  platformLogoSquareUrl: '',
  platformLogoRectangleUrl: '',
  moduleProjectsEnabled: true,
  helpDashboardUrl: '',
  helpDashboardMd: '',
  helpDashboardTitle: '',
  helpCustomersUrl: '',
  helpCustomersMd: '',
  helpCustomersTitle: '',
  helpCustomerDirectoryUrl: '',
  helpCustomerDirectoryMd: '',
  helpCustomerDirectoryTitle: '',
  helpProjectsUrl: '',
  helpProjectsMd: '',
  helpProjectsTitle: '',
  helpAssignmentsUrl: '',
  helpAssignmentsMd: '',
  helpAssignmentsTitle: '',
  helpUsersUrl: '',
  helpUsersMd: '',
  helpUsersTitle: '',
  helpActivitiesUrl: '',
  helpActivitiesMd: '',
  helpActivitiesTitle: '',
  helpSettingsUrl: '',
  helpSettingsMd: '',
  helpSettingsTitle: '',
  helpKnowledgeBaseUrl: '',
  helpKnowledgeBaseMd: '',
  helpKnowledgeBaseTitle: '',
  helpDashboardOrder: 1,
  helpCustomersOrder: null,
  helpCustomerDirectoryOrder: null,
  helpProjectsOrder: null,
  helpAssignmentsOrder: null,
  helpUsersOrder: null,
  helpActivitiesOrder: null,
  helpSettingsOrder: null,
  helpKnowledgeBaseOrder: null,
};

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const [branding, global] = await Promise.all([
          apiRequest<Partial<AppSettings>>('/api/settings/branding').catch(() => ({})),
          apiRequest<Partial<AppSettings>>('/api/settings/global').catch(() => ({})),
        ]);

        if (!cancelled) {
          setSettings(prev => ({ ...prev, ...branding, ...global }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const name =
      settings.platformName?.trim() || defaultSettings.platformName;
    document.title = name;
  }, [loading, settings.platformName]);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
