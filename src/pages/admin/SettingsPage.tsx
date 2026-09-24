import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save,
  Monitor,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Check,
  AlertCircle,
  Settings as SettingsIcon,
  Video,
  FileText,
  Globe,
  Plus,
  Trash2,
  Edit2,
  Tags,
  Loader2,
  Mail,
  Key,
  Server,
  Type,
  FolderKanban,
  Building2,
  Database,
  Code,
  FileCode,
  CheckSquare,
  Sparkles,
  Archive,
  Play,
  Clock,
} from 'lucide-react';
import { getHelpEmbedUrl, videoIframeAllow } from '../../lib/helpVideoEmbed';
import { cn } from '../../lib/utils';
import * as DB from '../../services/db';
import { Domain, type DomainCategory } from '../../types';
import {
  DEFAULT_DOMAIN_CATEGORY,
  DOMAIN_CATEGORIES,
  normalizeDomainCategory,
} from '../../lib/domainCategories';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import { HelpMarkdown } from '../../components/ui/HelpMarkdown';
import { MarkdownEditorModal } from '../../components/ui/MarkdownEditorModal';
import Modal from '../../components/ui/Modal';
import DemoManagement from '../../components/admin/DemoManagement';
import LlmSettingsPanel from '../../components/admin/LlmSettingsPanel';
import { apiRequest } from '../../lib/apiClient';
import { HELP_TOUR_CONFIG, type HelpTourKey } from '../../lib/helpTour';

interface AppSettings {
  platformName: string;
  platformLogoSquareUrl: string;
  platformLogoRectangleUrl: string;
  moduleProjectsEnabled: boolean;
  moduleTasksEnabled: boolean;
  moduleImportanceEnabled: boolean;
  moduleEmissionDataEnabled: boolean;
  moduleEmissionCalculationEnabled: boolean;
  moduleAIChatEnabled: boolean;
  assignmentRemindersEnabled: boolean;
  assignmentReminderDaysBefore: number;
  assignmentReminderDaysAfter: number;
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
  platformName: 'GovernanceIQ',
  platformLogoSquareUrl: '',
  platformLogoRectangleUrl: '',
  moduleProjectsEnabled: true,
  moduleTasksEnabled: true,
  moduleImportanceEnabled: false,
  moduleEmissionDataEnabled: false,
  moduleEmissionCalculationEnabled: false,
  moduleAIChatEnabled: true,
  assignmentRemindersEnabled: true,
  assignmentReminderDaysBefore: 3,
  assignmentReminderDaysAfter: 3,
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

export default function SettingsPage() {
  const { profile, loading: authLoading, clearTestRoleOverride } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Clear test role override on mount to ensure real role is checked
  useEffect(() => {
    clearTestRoleOverride();
  }, [clearTestRoleOverride]);

  // Check admin access
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!profile || profile.role !== 'platform_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Erişim Reddedildi</h1>
          <p className="text-slate-600">Platform Yöneticisi rolü gerekli</p>
        </motion.div>
      </div>
    );
  }

  const activeTab = (searchParams.get('tab') as 'platform' | 'content' | 'domains' | 'modules' | 'demo' | 'llm' | 'api' | 'backup') || 'platform';
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState<{
    name: string;
    description: string;
    category: DomainCategory;
  }>({ name: '', description: '', category: DEFAULT_DOMAIN_CATEGORY });
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null);
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [editDomainForm, setEditDomainForm] = useState<{
    name: string;
    description: string;
    category: DomainCategory;
  }>({ name: '', description: '', category: DEFAULT_DOMAIN_CATEGORY });
  const [savingDomainId, setSavingDomainId] = useState<string | null>(null);
  const [platformApiKey, setPlatformApiKey] = useState('impact-platform-fixed-token-2024');

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsData, domainsList, apiKeyData] = await Promise.all([
          apiRequest<Partial<AppSettings>>('/api/settings/global').catch(() => ({})),
          DB.domains.list(),
          apiRequest<{ apiKey: string }>('/api/admin/platform-api-key').catch(() => null),
        ]);
        
        setSettings({
          ...defaultSettings,
          ...settingsData,
          helpDashboardOrder: 1,
          helpCustomersOrder: normalizeHelpOrder((settingsData as any).helpCustomersOrder),
          helpCustomerDirectoryOrder: normalizeHelpOrder((settingsData as any).helpCustomerDirectoryOrder),
          helpProjectsOrder: normalizeHelpOrder((settingsData as any).helpProjectsOrder),
          helpAssignmentsOrder: normalizeHelpOrder((settingsData as any).helpAssignmentsOrder),
          helpUsersOrder: normalizeHelpOrder((settingsData as any).helpUsersOrder),
          helpActivitiesOrder: normalizeHelpOrder((settingsData as any).helpActivitiesOrder),
          helpSettingsOrder: normalizeHelpOrder((settingsData as any).helpSettingsOrder),
          helpKnowledgeBaseOrder: normalizeHelpOrder((settingsData as any).helpKnowledgeBaseOrder),
        });
        setDomains(domainsList);
        if (apiKeyData?.apiKey) {
          setPlatformApiKey(apiKeyData.apiKey);
        }
      } catch (error) {
        console.error("Error fetching settings/domains:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const domainCategoryLabel = (category: DomainCategory) => {
    switch (category) {
      case 'sasb_issb':
        return t.settingsPage.domainCategorySasbIssb;
      case 'gri':
        return t.settingsPage.domainCategoryGri;
      case 'other':
        return t.settingsPage.domainCategoryOther;
      case 'esg':
      default:
        return t.settingsPage.domainCategoryEsg;
    }
  };

  const normalizeHelpOrder = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
    }
    return null;
  };

  const helpSections: Array<{
    key: HelpTourKey;
    title: string;
    urlField: keyof AppSettings;
    mdField: keyof AppSettings;
    titleField: keyof AppSettings;
    orderField: keyof AppSettings;
  }> = [
    {
      key: 'dashboard',
      title: t.settingsPage.helpSectionDashboard,
      urlField: 'helpDashboardUrl',
      mdField: 'helpDashboardMd',
      titleField: 'helpDashboardTitle',
      orderField: 'helpDashboardOrder',
    },
    {
      key: 'customers',
      title: t.customers.title,
      urlField: 'helpCustomersUrl',
      mdField: 'helpCustomersMd',
      titleField: 'helpCustomersTitle',
      orderField: 'helpCustomersOrder',
    },
    {
      key: 'customerDirectory',
      title: t.settingsPage.helpSectionCustomerDirectory,
      urlField: 'helpCustomerDirectoryUrl',
      mdField: 'helpCustomerDirectoryMd',
      titleField: 'helpCustomerDirectoryTitle',
      orderField: 'helpCustomerDirectoryOrder',
    },
    {
      key: 'projects',
      title: t.settingsPage.helpSectionProjectsList,
      urlField: 'helpProjectsUrl',
      mdField: 'helpProjectsMd',
      titleField: 'helpProjectsTitle',
      orderField: 'helpProjectsOrder',
    },
    {
      key: 'knowledgeBase',
      title: t.settingsPage.helpSectionKnowledgeBase,
      urlField: 'helpKnowledgeBaseUrl',
      mdField: 'helpKnowledgeBaseMd',
      titleField: 'helpKnowledgeBaseTitle',
      orderField: 'helpKnowledgeBaseOrder',
    },
    {
      key: 'tasks',
      title: t.settingsPage.helpSectionTasksList,
      urlField: 'helpAssignmentsUrl',
      mdField: 'helpAssignmentsMd',
      titleField: 'helpAssignmentsTitle',
      orderField: 'helpAssignmentsOrder',
    },
    {
      key: 'users',
      title: t.settingsPage.helpSectionUsers,
      urlField: 'helpUsersUrl',
      mdField: 'helpUsersMd',
      titleField: 'helpUsersTitle',
      orderField: 'helpUsersOrder',
    },
    {
      key: 'activities',
      title: t.settingsPage.helpSectionActivities,
      urlField: 'helpActivitiesUrl',
      mdField: 'helpActivitiesMd',
      titleField: 'helpActivitiesTitle',
      orderField: 'helpActivitiesOrder',
    },
    {
      key: 'settings',
      title: t.settingsPage.helpSectionSettings,
      urlField: 'helpSettingsUrl',
      mdField: 'helpSettingsMd',
      titleField: 'helpSettingsTitle',
      orderField: 'helpSettingsOrder',
    },
  ];

  const handleAddDomain = async () => {
    if (!newDomain.name.trim()) return;
    setIsAddingDomain(true);
    try {
      await DB.domains.create(newDomain.name, newDomain.description, newDomain.category);
      const updatedDomains = await DB.domains.list();
      setDomains(updatedDomains);
      setNewDomain({ name: '', description: '', category: DEFAULT_DOMAIN_CATEGORY });
    } catch (err) {
      console.error("Failed to add domain", err);
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleDeleteDomain = (domain: Domain) => {
    setDomainToDelete(domain);
  };

  const confirmDeleteDomain = async () => {
    if (!domainToDelete) return;
    try {
      await DB.domains.delete(domainToDelete.id);
      setDomains(domains.filter(d => d.id !== domainToDelete.id));
      if (editingDomainId === domainToDelete.id) {
        setEditingDomainId(null);
      }
    } catch (err) {
      console.error("Failed to delete domain", err);
    } finally {
      setDomainToDelete(null);
    }
  };

  const startEditDomain = (domain: Domain) => {
    setEditingDomainId(domain.id);
    setEditDomainForm({
      name: domain.name,
      description: domain.description || '',
      category: normalizeDomainCategory(domain.category),
    });
  };

  const cancelEditDomain = () => {
    setEditingDomainId(null);
    setEditDomainForm({ name: '', description: '', category: DEFAULT_DOMAIN_CATEGORY });
  };

  const saveEditDomain = async () => {
    if (!editingDomainId || !editDomainForm.name.trim()) return;
    setSavingDomainId(editingDomainId);
    try {
      await DB.domains.update(editingDomainId, {
        name: editDomainForm.name.trim(),
        description: editDomainForm.description.trim(),
        category: editDomainForm.category,
      });
      const updatedDomains = await DB.domains.list();
      setDomains(updatedDomains);
      setEditingDomainId(null);
      setEditDomainForm({ name: '', description: '', category: DEFAULT_DOMAIN_CATEGORY });
    } catch (err) {
      console.error('Failed to update domain', err);
      alert(t.settingsPage.domainsUpdateFailed);
    } finally {
      setSavingDomainId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    const normalizedOrderSettings = HELP_TOUR_CONFIG.reduce<Record<string, number | null>>((acc, cfg) => {
      const raw = settings[cfg.orderField as keyof AppSettings];
      acc[cfg.orderField] = cfg.key === 'dashboard' ? 1 : normalizeHelpOrder(raw);
      return acc;
    }, {});

    try {
      // 1. Save critical fields to global (admin only)
      await apiRequest('/api/settings/global', {
        method: 'PUT',
        body: JSON.stringify({
        ...settings,
        ...normalizedOrderSettings,
        updatedAt: Date.now(),
        updatedBy: profile?.id
        }),
      });

      // 2. Sync public branding and help content to branding document (public read)
      await apiRequest('/api/settings/branding', {
        method: 'PUT',
        body: JSON.stringify({
        platformName: settings.platformName,
        platformLogoSquareUrl: settings.platformLogoSquareUrl,
        platformLogoRectangleUrl: settings.platformLogoRectangleUrl,
        helpDashboardUrl: settings.helpDashboardUrl,
        helpDashboardMd: settings.helpDashboardMd,
        helpDashboardTitle: settings.helpDashboardTitle,
        helpCustomersUrl: settings.helpCustomersUrl,
        helpCustomersMd: settings.helpCustomersMd,
        helpCustomersTitle: settings.helpCustomersTitle,
        helpCustomerDirectoryUrl: settings.helpCustomerDirectoryUrl,
        helpCustomerDirectoryMd: settings.helpCustomerDirectoryMd,
        helpCustomerDirectoryTitle: settings.helpCustomerDirectoryTitle,
        helpProjectsUrl: settings.helpProjectsUrl,
        helpProjectsMd: settings.helpProjectsMd,
        helpProjectsTitle: settings.helpProjectsTitle,
        helpAssignmentsUrl: settings.helpAssignmentsUrl,
        helpAssignmentsMd: settings.helpAssignmentsMd,
        helpAssignmentsTitle: settings.helpAssignmentsTitle,
        helpUsersUrl: settings.helpUsersUrl,
        helpUsersMd: settings.helpUsersMd,
        helpUsersTitle: settings.helpUsersTitle,
        helpActivitiesUrl: settings.helpActivitiesUrl,
        helpActivitiesMd: settings.helpActivitiesMd,
        helpActivitiesTitle: settings.helpActivitiesTitle,
        helpSettingsUrl: settings.helpSettingsUrl,
        helpSettingsMd: settings.helpSettingsMd,
        helpSettingsTitle: settings.helpSettingsTitle,
        helpKnowledgeBaseUrl: settings.helpKnowledgeBaseUrl,
        helpKnowledgeBaseMd: settings.helpKnowledgeBaseMd,
        helpKnowledgeBaseTitle: settings.helpKnowledgeBaseTitle,
        ...normalizedOrderSettings,
        updatedAt: Date.now()
        }),
      });

      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-none space-y-8">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex items-center gap-4">
            <SettingsIcon className="text-blue-600" size={36} strokeWidth={2.5} />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-display">{t.settingsPage.title}</h1>
          </div>
          <p className="mt-1 text-lg font-light text-slate-500">{t.settingsPage.subtitle}</p>
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-start gap-3">
          {activeTab !== 'llm' && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="group flex shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-xl bg-slate-900 px-6 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-slate-200/20 transition-all hover:shadow-slate-200/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : status === 'success' ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Save size={14} className="group-hover:scale-110 transition-transform" />
            )}
            {saving ? t.common.saving : status === 'success' ? t.common.saved : t.common.saveChanges}
          </button>
          )}

          {(settings.helpSettingsUrl || settings.helpSettingsMd) && (
            <button 
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              className="group self-start rounded-xl border border-transparent p-2 text-slate-400 transition-all hover:border-slate-100 hover:bg-white hover:text-slate-900"
              title={t.settingsPage.settingsGuidanceTooltip}
            >
              <HelpCircle size={22} className="group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {status === 'error' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{t.settingsPage.saveFailed}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
          {[
            { id: 'platform', label: t.settingsPage.tabPlatform, icon: Monitor },
            { id: 'content', label: t.settingsPage.tabContent, icon: HelpCircle },
            { id: 'domains', label: t.settingsPage.tabDomains, icon: Globe },
            { id: 'modules', label: t.settingsPage.tabModules, icon: CheckSquare },
            { id: 'demo', label: t.settingsPage.tabDemo, icon: Database },
            { id: 'llm', label: t.settingsPage.tabLlm, icon: Sparkles },
            { id: 'backup', label: t.settingsPage.tabBackup, icon: Archive },
            { id: 'api', label: t.settingsPage.tabApi, icon: Code },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Platform Settings Tab */}
        {activeTab === 'platform' && (
          <div className="lg:col-span-12">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <Monitor size={18} className="text-slate-600" />
                </div>
                <h2 className="font-bold text-slate-900">{t.settingsPage.sectionBrandingTitle}</h2>
              </div>
              <div className="p-8 space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10 items-start">
                  {/* Platform Name - Spans full width initially in this 2-col setup */}
                  <div className="space-y-3 lg:col-span-2 max-w-2xl">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {t.settingsPage.labelPlatformName}
                    </label>
                    <input 
                      type="text"
                      value={settings.platformName || ''}
                      onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-base font-medium"
                      placeholder={t.settingsPage.placeholderPlatformName}
                    />
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{t.settingsPage.helpPlatformName}</p>
                  </div>

                  {/* Square Logo */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {t.settingsPage.labelLogoSquare}
                    </label>
                    <div className="space-y-4">
                      <input 
                        type="text"
                        value={settings.platformLogoSquareUrl || ''}
                        onChange={(e) => setSettings({ ...settings, platformLogoSquareUrl: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-sm"
                        placeholder={t.settingsPage.placeholderLogoUrl}
                      />
                      {settings.platformLogoSquareUrl && (
                        <div className="w-16 h-16 bg-white flex items-center justify-center p-2.5 shrink-0">
                          <img src={settings.platformLogoSquareUrl} alt={t.settingsPage.altLogoSquarePreview} className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{t.settingsPage.helpLogoSquare}</p>
                  </div>

                  {/* Rectangle Logo */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {t.settingsPage.labelLogoRect}
                    </label>
                    <div className="space-y-4">
                      <input 
                        type="text"
                        value={settings.platformLogoRectangleUrl || ''}
                        onChange={(e) => setSettings({ ...settings, platformLogoRectangleUrl: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-sm"
                        placeholder={t.settingsPage.placeholderLogoUrl}
                      />
                      {settings.platformLogoRectangleUrl && (
                        <div className="h-16 px-5 bg-white flex items-center justify-center p-2.5 shrink-0 w-fit min-w-[120px]">
                          <img src={settings.platformLogoRectangleUrl} alt={t.settingsPage.altLogoRectPreview} className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{t.settingsPage.helpLogoRect}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Domain Management Tab */}
        {activeTab === 'domains' && (
          <div className="lg:col-span-12">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <Globe size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">{t.settingsPage.domainsHeading}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {t.settingsPage.domainsSubheading}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Add New Domain */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tags size={14} className="text-slate-400" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{t.settingsPage.domainsAddSection}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.settingsPage.domainsNameLabel}</label>
                      <input 
                        type="text"
                        value={newDomain.name}
                        onChange={(e) => setNewDomain({ ...newDomain, name: e.target.value })}
                        placeholder={t.settingsPage.domainsNamePlaceholder}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.settingsPage.domainsCategoryLabel}</label>
                      <select
                        value={newDomain.category}
                        onChange={(e) =>
                          setNewDomain({
                            ...newDomain,
                            category: normalizeDomainCategory(e.target.value),
                          })
                        }
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-sm"
                      >
                        {DOMAIN_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {domainCategoryLabel(cat)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.settingsPage.domainsDescLabel}</label>
                      <input 
                        type="text"
                        value={newDomain.description}
                        onChange={(e) => setNewDomain({ ...newDomain, description: e.target.value })}
                        placeholder={t.settingsPage.domainsDescPlaceholder}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleAddDomain}
                      disabled={!newDomain.name.trim() || isAddingDomain}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isAddingDomain ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      {t.settingsPage.domainsAddButton}
                    </button>
                  </div>
                </div>

                {/* Domains Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {domains.length === 0 ? (
                    <div className="col-span-full py-12 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Globe size={20} className="text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">{t.settingsPage.domainsEmpty}</p>
                    </div>
                  ) : (
                    domains.map(domain => (
                      <motion.div 
                        key={domain.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 group hover:border-slate-300 transition-colors"
                      >
                        {editingDomainId === domain.id ? (
                          <>
                            <div className="grid grid-cols-1 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.settingsPage.domainsNameLabel}</label>
                                <input
                                  type="text"
                                  value={editDomainForm.name}
                                  onChange={(e) => setEditDomainForm((f) => ({ ...f, name: e.target.value }))}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-sm font-medium"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.settingsPage.domainsCategoryLabel}</label>
                                <select
                                  value={editDomainForm.category}
                                  onChange={(e) =>
                                    setEditDomainForm((f) => ({
                                      ...f,
                                      category: normalizeDomainCategory(e.target.value),
                                    }))
                                  }
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-sm"
                                >
                                  {DOMAIN_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {domainCategoryLabel(cat)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.settingsPage.domainsDescLabel}</label>
                                <input
                                  type="text"
                                  value={editDomainForm.description}
                                  onChange={(e) => setEditDomainForm((f) => ({ ...f, description: e.target.value }))}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEditDomain}
                                disabled={savingDomainId === domain.id}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
                              >
                                {t.settingsPage.domainsCancel}
                              </button>
                              <button
                                type="button"
                                onClick={saveEditDomain}
                                disabled={!editDomainForm.name.trim() || savingDomainId === domain.id}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                              >
                                {savingDomainId === domain.id ? <Loader2 size={14} className="animate-spin" /> : null}
                                {t.settingsPage.domainsSave}
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <Tags size={14} className="text-slate-400 shrink-0" />
                                <span className="truncate">{domain.name}</span>
                              </h4>
                              <span className="mt-1.5 inline-flex w-fit items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                {domainCategoryLabel(normalizeDomainCategory(domain.category))}
                              </span>
                              {domain.description ? (
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{domain.description}</p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditDomain(domain)}
                                className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                                title={t.settingsPage.domainsEdit}
                                aria-label={t.settingsPage.domainsEdit}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteDomain(domain)}
                                className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                                title={t.settingsPage.domainsDelete}
                                aria-label={t.settingsPage.domainsDelete}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Help Contents Tab */}
        {activeTab === 'content' && (
          <div className="lg:col-span-12">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <HelpCircle size={18} className="text-slate-600" />
                </div>
                <h2 className="font-bold text-slate-900">{t.settingsPage.sectionHelpContentsTitle}</h2>
              </div>
              
              <div className="p-8 space-y-12">
                {helpSections.map((section, idx) => (
                  <div key={section.key} className="space-y-12">
                    <HelpSectionRow
                      title={section.title}
                      bannerTitle={String(settings[section.titleField] || '')}
                      onBannerTitleChange={(val) => setSettings({ ...settings, [section.titleField]: val })}
                      videoUrl={String(settings[section.urlField] || '')}
                      onVideoChange={(val) => setSettings({ ...settings, [section.urlField]: val })}
                      mdText={String(settings[section.mdField] || '')}
                      onMdChange={(val) => setSettings({ ...settings, [section.mdField]: val })}
                      orderValue={
                        section.key === 'dashboard'
                          ? 1
                          : normalizeHelpOrder(settings[section.orderField])
                      }
                      onOrderChange={(val) => setSettings({ ...settings, [section.orderField]: val })}
                      orderLocked={section.key === 'dashboard'}
                    />
                    {idx < helpSections.length - 1 ? <div className="h-px bg-slate-100" /> : null}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Modules Tab */}
        {activeTab === 'modules' && (
          <div className="lg:col-span-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <CheckSquare size={18} className="text-slate-600" />
                </div>
                <h2 className="font-bold text-slate-900">{t.settingsPage.sectionModulesTitle}</h2>
              </div>
              <div className="p-8 space-y-4">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={settings.moduleProjectsEnabled !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        moduleProjectsEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    {t.settingsPage.moduleProjects}
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={settings.moduleTasksEnabled !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        moduleTasksEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    {t.settingsPage.moduleTasks}
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={settings.moduleImportanceEnabled !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        moduleImportanceEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    {t.settingsPage.moduleImportance}
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={settings.moduleEmissionDataEnabled !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        moduleEmissionDataEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    {t.settingsPage.moduleEmissionData}
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={settings.moduleEmissionCalculationEnabled !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        moduleEmissionCalculationEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    {t.settingsPage.moduleEmissionCalculation}
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={settings.moduleAIChatEnabled !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        moduleAIChatEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    {t.settingsPage.moduleAIChat}
                  </span>
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {t.settingsPage.assignmentRemindersTitle}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t.settingsPage.assignmentRemindersHint}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.assignmentRemindersEnabled !== false}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            assignmentRemindersEnabled: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        {t.settingsPage.assignmentRemindersEnabled}
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="text-sm">
                      <span className="block text-slate-600 font-medium mb-1">
                        {t.settingsPage.assignmentReminderDaysBefore}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={settings.assignmentReminderDaysBefore ?? 3}
                        disabled={settings.assignmentRemindersEnabled === false}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            assignmentReminderDaysBefore: Math.max(
                              0,
                              Math.min(30, Number(e.target.value) || 0),
                            ),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="block text-slate-600 font-medium mb-1">
                        {t.settingsPage.assignmentReminderDaysAfter}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={settings.assignmentReminderDaysAfter ?? 3}
                        disabled={settings.assignmentRemindersEnabled === false}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            assignmentReminderDaysAfter: Math.max(
                              0,
                              Math.min(30, Number(e.target.value) || 0),
                            ),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Demo Management Tab */}
        {activeTab === 'demo' && (
          <div className="lg:col-span-12">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <DemoManagement />
            </motion.div>
          </div>
        )}

        {activeTab === 'llm' && (
          <div className="lg:col-span-12">
            <LlmSettingsPanel />
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div className="lg:col-span-12">
            <BackupSettingsTab />
          </div>
        )}

        {/* API Guideline Tab */}
        {activeTab === 'api' && (
          <div className="lg:col-span-12">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <Code size={18} className="text-slate-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{t.settingsPage.apiPageTitle}</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t.settingsPage.apiPageSubtitle}</p>
                </div>
              </div>

              <div className="p-8 space-y-10">
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Server size={14} className="text-blue-500" />
                    {t.settingsPage.apiAuthTitle}
                  </h3>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {t.settingsPage.apiAuthIntroBefore}
                      <code className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-900 font-mono text-[13px]">x-api-key</code>
                      {t.settingsPage.apiAuthIntroAfter}
                    </p>
                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
                      <Key size={16} className="text-slate-400" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.settingsPage.apiFixedTokenLabel}</p>
                        <p className="font-mono text-sm text-slate-900 truncate">{platformApiKey}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <p className="text-sm text-slate-600 leading-relaxed border-l-4 border-slate-900 pl-4 py-1">
                  {t.settingsPage.apiEntityIdsNote}
                </p>

                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={14} className="text-violet-500" />
                    {t.settingsPage.apiListCustomersTitle}
                  </h3>
                  <div className="space-y-6">
                    <p className="text-sm text-slate-600 leading-relaxed">{t.settingsPage.apiListCustomersIntro}</p>
                    <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-slate-100 overflow-x-auto">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase">GET</span>
                        <code className="text-slate-300 text-sm">/api/v1/customer/customers</code>
                      </div>
                      <div className="space-y-4 font-mono text-[13px]">
                        <div>
                          <p className="text-slate-500 mb-1"># {t.settingsPage.apiCurlExampleLabel}</p>
                          <p className="text-blue-400">curl -X GET \</p>
                          <p className="pl-4 text-blue-400">"{window.location.origin}/api/v1/customer/customers" \</p>
                          <p className="pl-4 text-blue-400">-H "x-api-key: {platformApiKey}"</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{t.settingsPage.apiQueryParamsTitle}</h4>
                        <div className="flex items-start justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <code className="text-[13px] font-bold text-slate-900">{t.settingsPage.apiQueryNoneLabel}</code>
                            <p className="text-[11px] text-slate-500 mt-1">{t.settingsPage.apiQueryNoneCustomersHelp}</p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{t.settingsPage.apiOptional}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{t.settingsPage.apiResponseStructureTitle}</h4>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-600 max-h-64 overflow-y-auto">
                          <pre>{JSON.stringify({
                            success: true,
                            count: 2,
                            customers: [
                              {
                                id: '…',
                                name: 'Acme Corp',
                                sectorIds: ['…'],
                                websiteUrl: 'https://…',
                                logoUrl: 'https://…',
                              },
                            ],
                          }, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <FolderKanban size={14} className="text-amber-500" />
                    {t.settingsPage.apiListProjectsTitle}
                  </h3>
                  <div className="space-y-6">
                    <p className="text-sm text-slate-600 leading-relaxed">{t.settingsPage.apiListProjectsIntro}</p>
                    <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-slate-100 overflow-x-auto">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase">GET</span>
                        <code className="text-slate-300 text-sm">/api/v1/customer/projects?customerId={'{CUSTOMER_ID}'}</code>
                      </div>
                      <div className="space-y-4 font-mono text-[13px]">
                        <div>
                          <p className="text-slate-500 mb-1"># {t.settingsPage.apiCurlExampleLabel}</p>
                          <p className="text-blue-400">curl -X GET \</p>
                          <p className="pl-4 text-blue-400 break-all">"{window.location.origin}/api/v1/customer/projects?customerId=YOUR_CUSTOMER_ID" \</p>
                          <p className="pl-4 text-blue-400">-H "x-api-key: {platformApiKey}"</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{t.settingsPage.apiQueryParamsTitle}</h4>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <code className="text-[13px] font-bold text-slate-900">{t.settingsPage.apiCustomerIdParam}</code>
                              <p className="text-[11px] text-slate-500 mt-1">{t.settingsPage.apiCustomerIdParamDesc}</p>
                            </div>
                            <span className="text-[10px] font-bold text-red-500 uppercase">{t.settingsPage.apiRequired}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{t.settingsPage.apiResponseStructureTitle}</h4>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-600 max-h-64 overflow-y-auto">
                          <pre>{JSON.stringify({
                            success: true,
                            customer: { id: '…', name: '…', sectorIds: ['…'] },
                            projectCount: 1,
                            projects: [
                              {
                                id: '…',
                                customerId: '…',
                                templateId: null,
                                domainIds: ['…'],
                                name: 'ESG Audit',
                                category: 'Project',
                                status: 'active',
                              },
                            ],
                          }, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Database size={14} className="text-green-500" />
                    {t.settingsPage.apiGetDataTitle}
                  </h3>
                  <div className="space-y-6">
                    <p className="text-sm text-slate-600 leading-relaxed">{t.settingsPage.apiGetDataIntro}</p>
                    <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-slate-100 overflow-x-auto">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase">GET</span>
                        <code className="text-slate-300 text-sm">/api/v1/customer/project-data</code>
                      </div>
                      
                      <div className="space-y-4 font-mono text-[13px]">
                        <div>
                          <p className="text-slate-500 mb-1"># {t.settingsPage.apiCurlExampleLabel}</p>
                          <p className="text-blue-400">curl -X GET \</p>
                          <p className="pl-4 text-blue-400">"{window.location.origin}/api/v1/customer/project-data?projectName=ESG%20Audit%20Batch%201" \</p>
                          <p className="pl-4 text-blue-400">-H "x-api-key: {platformApiKey}"</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{t.settingsPage.apiQueryParamsTitle}</h4>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <code className="text-[13px] font-bold text-slate-900">projectName</code>
                              <p className="text-[11px] text-slate-500 mt-1">{t.settingsPage.apiProjectNameDesc}</p>
                            </div>
                            <span className="text-[10px] font-bold text-red-500 uppercase">{t.settingsPage.apiRequired}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{t.settingsPage.apiResponseStructureTitle}</h4>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-600 max-h-72 overflow-y-auto">
                          <pre>{JSON.stringify({
                            success: true,
                            project: {
                              id: '…',
                              customerId: '…',
                              templateId: null,
                              domainIds: ['…'],
                              name: '…',
                              status: 'active',
                              category: 'Project',
                              createdAt: 0,
                            },
                            dataCount: 1,
                            submissions: [
                              {
                                answerId: '…',
                                assignmentId: '…',
                                contactId: '…',
                                projectId: '…',
                                questionId: '…',
                                templateId: '…',
                                sectorId: '…',
                                pageId: '…',
                                questionCode: 'ESG-01',
                                questionTitle: '…',
                                latestAnswer: '…',
                                latestFileUrl: 'https://…',
                              },
                            ],
                          }, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isHelpModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpModalOpen(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full h-full max-w-none flex flex-col p-4 sm:p-12 relative z-10"
            >
              <div className="flex items-center justify-between mb-8 text-white">
                <div>
                  <h3 className="text-3xl font-bold font-display tracking-tight">
                    {t.settingsPage.helpModalTitle}
                  </h3>
                  <div className="text-white/40 text-xs font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {t.settingsPage.helpModalSubtitle}
                  </div>
                </div>
                <button 
                  onClick={() => setIsHelpModalOpen(false)}
                  className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95 group"
                >
                  <Plus size={24} className="rotate-45 group-hover:rotate-[135deg] transition-transform duration-500" />
                </button>
              </div>

              <div className={cn(
                "flex-1 min-h-0 grid gap-8",
                settings.helpSettingsMd ? "lg:grid-cols-2" : "grid-cols-1"
              )}>
                {/* Video Column */}
                <div className="bg-black rounded-[32px] overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                  <div className="flex-1 relative">
                    {settings.helpSettingsUrl ? (
                      <iframe 
                        src={getHelpEmbedUrl(settings.helpSettingsUrl)} 
                        loading="lazy" 
                        title={t.settingsPage.helpModalVideoTitle} 
                        allowFullScreen 
                        className="absolute inset-0 w-full h-full border-none"
                        allow={videoIframeAllow}
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                        {t.settingsPage.noVideoAvailable}
                      </div>
                    )}
                  </div>
                </div>

                {/* Markdown Column (Conditional) */}
                {settings.helpSettingsMd && (
                  <div className="bg-white rounded-[32px] shadow-2xl border border-white/10 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      <HelpMarkdown>{settings.helpSettingsMd}</HelpMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={!!domainToDelete}
        onClose={() => setDomainToDelete(null)}
        title={t.settingsPage.domainsDeleteTitle}
        description={
          domainToDelete
            ? t.settingsPage.domainsDeleteDescription.replace('{name}', domainToDelete.name)
            : ''
        }
        type="danger"
        confirmLabel={t.settingsPage.domainsDeleteConfirm}
        cancelLabel={t.settingsPage.domainsDeleteCancel}
        onConfirm={confirmDeleteDomain}
      />
    </div>
  );
}

interface HelpSectionRowProps {
  title: string;
  bannerTitle: string;
  onBannerTitleChange: (val: string) => void;
  videoUrl: string;
  onVideoChange: (val: string) => void;
  mdText: string;
  onMdChange: (val: string) => void;
  orderValue: number | null;
  onOrderChange: (val: number | null) => void;
  orderLocked?: boolean;
}

function HelpSectionRow({
  title,
  bannerTitle,
  onBannerTitleChange,
  videoUrl,
  onVideoChange,
  mdText,
  onMdChange,
  orderValue,
  onOrderChange,
  orderLocked = false,
}: HelpSectionRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mdModalOpen, setMdModalOpen] = useState(false);
  const [mdDraft, setMdDraft] = useState(mdText);
  const { t } = useTranslation();

  useEffect(() => {
    if (!mdModalOpen) {
      setMdDraft(mdText);
    }
  }, [mdText, mdModalOpen]);

  const openMdEditor = () => {
    setMdDraft(mdText);
    setMdModalOpen(true);
  };

  const saveMdEditor = () => {
    onMdChange(mdDraft);
    setMdModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left py-2 hover:bg-slate-50 rounded-xl transition-colors px-2 -mx-2 group"
      >
        <h3 className="text-sm font-bold text-slate-900 border-l-2 border-slate-900 pl-4">{title}</h3>
        <ChevronDown size={18} className={cn("text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t.settingsPage.helpRowTitleLabel}
                </label>
                <input
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => onBannerTitleChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-sm font-semibold"
                  placeholder={t.settingsPage.helpRowTitlePlaceholder}
                />
                <p className="text-[10px] text-slate-400 italic">{t.settingsPage.helpRowTitleHint}</p>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t.settingsPage.helpRowOrderLabel}
                </label>
                <input
                  type="number"
                  min={1}
                  value={orderValue ?? ''}
                  onChange={(e) => {
                    if (orderLocked) return;
                    const next = e.target.value.trim();
                    if (!next) {
                      onOrderChange(null);
                      return;
                    }
                    const parsed = Number(next);
                    onOrderChange(Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null);
                  }}
                  disabled={orderLocked}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-xs disabled:opacity-70"
                  placeholder={t.settingsPage.helpRowOrderPlaceholder}
                />
                <p className="text-[10px] text-slate-400 italic">
                  {orderLocked ? t.settingsPage.helpRowOrderDashboardLocked : t.settingsPage.helpRowOrderHint}
                </p>
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t.settingsPage.helpRowVideoLabel}
                </label>
                <div className="relative group">
                  <Video size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                  <input 
                    type="text"
                    value={videoUrl}
                    onChange={(e) => onVideoChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-xs"
                    placeholder={t.settingsPage.helpRowVideoPlaceholder}
                  />
                </div>
              </div>

              {/* Guidance Markdown */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t.settingsPage.helpRowMdLabel}
                </label>
                <div className="relative group">
                  <FileText size={14} className="absolute left-4 top-[18px] text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                  <textarea 
                    value={mdText}
                    onChange={(e) => onMdChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-sm font-mono leading-relaxed resize-none min-h-[120px]"
                    placeholder={t.settingsPage.helpRowMdPlaceholder}
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={openMdEditor}
                    title={t.templates.openMarkdownEditor}
                    aria-label={t.templates.openMarkdownEditor}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                  >
                    <FileCode size={16} strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 italic">{t.settingsPage.helpRowMdHint}</p>
              </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MarkdownEditorModal
        isOpen={mdModalOpen}
        onClose={() => setMdModalOpen(false)}
        markdown={mdDraft}
        onMarkdownChange={setMdDraft}
        onSave={saveMdEditor}
        pdfFileName={`help-${title.replace(/\s+/g, '-').toLowerCase()}`}
      />
    </div>
  );
}

interface ScheduledJob {
  _id: string;
  name: string;
  command: string;
  cronExpression: string;
  enabled: boolean;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'error' | 'running' | 'never';
  lastRunOutput?: string;
  nextRunAt?: string;
}

type ScheduleMode = 'hourly' | 'daily' | 'weekly';

function BackupSettingsTab() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [defaultEngine, setDefaultEngine] = useState<{ engine: string; command: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());

  const engineLabel = (engine: string | undefined) =>
    engine === 'postgres' ? 'PostgreSQL' : engine === 'mysql' ? 'MySQL' : 'Veritabanı';

  const loadJobs = async () => {
    try {
      setLoadError(null);
      const list = (await apiRequest<ScheduledJob[]>('/api/admin/scheduled-jobs')) || [];
      setJobs(list);
      setPollingIds((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        for (const j of list) {
          if (j.lastRunStatus !== 'running') next.delete(j._id);
        }
        return next;
      });
    } catch (err: any) {
      const errorMsg = err?.message || String(err) || 'Bilinmeyen hata';
      console.error('Failed to load scheduled jobs:', err);
      setLoadError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    apiRequest<{ engine: string; command: string }>('/api/admin/scheduled-jobs/default-command')
      .then(setDefaultEngine)
      .catch(() => setDefaultEngine(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pollingIds.size === 0) return;
    const interval = setInterval(() => loadJobs(), 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingIds.size]);

  const createDefaultJob = async (asAdditional: boolean) => {
    setCreating(true);
    try {
      const defaults = await apiRequest<{ engine: string; command: string }>(
        '/api/admin/scheduled-jobs/default-command',
      );
      const baseName =
        defaults.engine === 'postgres'
          ? 'PostgreSQL Yedekleme'
          : defaults.engine === 'mysql'
            ? 'MySQL Yedekleme'
            : 'Veritabanı Yedekleme';
      const newJob = await apiRequest<ScheduledJob>('/api/admin/scheduled-jobs', {
        method: 'POST',
        body: JSON.stringify({
          name: asAdditional ? `${baseName} ${jobs.length + 1}` : baseName,
          command: defaults.command,
          cronExpression: '0 2 * * *',
          enabled: false,
        }),
      });
      setJobs((prev) => [newJob, ...prev]);
    } catch (err: any) {
      const errorMsg = err?.message || String(err) || 'Bilinmeyen hata';
      console.error('Failed to create default job:', err);
      setLoadError(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleJobUpdated = (updated: ScheduledJob) => {
    setJobs((prev) => prev.map((j) => (j._id === updated._id ? updated : j)));
  };

  const handleJobDeleted = (id: string) => {
    setJobs((prev) => prev.filter((j) => j._id !== id));
    setPollingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleJobRunning = (id: string) => {
    setPollingIds((prev) => new Set(prev).add(id));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (loadError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-slate-100 bg-red-50/50 flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg border border-red-200">
            <AlertCircle size={18} className="text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-red-900">Yedekleme İşleri Yüklenemedi</h2>
            <p className="text-xs text-red-700 font-bold uppercase tracking-widest mt-0.5">API Hatası</p>
          </div>
        </div>
        <div className="p-8">
          <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
            <p className="text-sm text-red-900 font-mono break-words">{loadError}</p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              loadJobs();
            }}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-bold"
          >
            Tekrar Yükle
          </button>
        </div>
      </motion.div>
    );
  }

  if (jobs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <Archive size={18} className="text-slate-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{engineLabel(defaultEngine?.engine)} Yedekleme Kurulmadı</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Varsayılan İş Oluştur</p>
          </div>
        </div>
        <div className="p-8 space-y-4">
          <p className="text-sm text-slate-600">
            Otomatik {engineLabel(defaultEngine?.engine)} yedeklemeleri için varsayılan bir yedekleme işi oluşturunuz. İş kurulduktan sonra zamanlama ve ayarları Settings'den yapılandırabilisiniz.
          </p>
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs">
            <p className="font-mono text-slate-700 break-words">
              <span className="font-bold">Komut:</span> {defaultEngine?.command || 'yükleniyor…'}
              <br />
              <span className="font-bold">Yolu:</span> backups/
              <br />
              <span className="font-bold">Başlangıç:</span> Devre dışı (siz etkinleştirene kadar)
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => createDefaultJob(false)}
              disabled={creating}
              className={cn(
                'flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all',
                creating
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Oluşturuluyor...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Plus size={16} />
                  Varsayılan İşi Oluştur
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setLoading(true);
                loadJobs();
              }}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
            >
              Yenile
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {jobs.map((j) => (
        <BackupJobCard
          key={j._id}
          job={j}
          onUpdated={handleJobUpdated}
          onDeleted={handleJobDeleted}
          onRunning={() => handleJobRunning(j._id)}
        />
      ))}
      <button
        onClick={() => createDefaultJob(true)}
        disabled={creating}
        className={cn(
          'w-full py-3 px-4 rounded-xl font-bold text-sm border-2 border-dashed transition-all flex items-center justify-center gap-2',
          creating
            ? 'border-slate-100 text-slate-300 cursor-not-allowed'
            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
        )}
      >
        {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
        Yeni Yedekleme İşi Ekle
      </button>
    </div>
  );
}

function BackupJobCard({
  job,
  onUpdated,
  onDeleted,
  onRunning,
}: {
  job: ScheduledJob;
  onUpdated: (job: ScheduledJob) => void;
  onDeleted: (id: string) => void;
  onRunning: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('daily');
  const [hourlyInterval, setHourlyInterval] = useState('2');
  const [dailyHour, setDailyHour] = useState('02');
  const [dailyMinute, setDailyMinute] = useState('00');
  const [weeklyDay, setWeeklyDay] = useState('0');
  const [weeklyHour, setWeeklyHour] = useState('02');
  const [weeklyMinute, setWeeklyMinute] = useState('00');

  const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const isRunning = job.lastRunStatus === 'running';

  const syncCronToUI = (cron: string) => {
    // Parse cron: minute hour * * dayOfWeek
    const parts = cron.split(' ');
    if (parts.length < 5) return;

    const [min, hour, , , dow] = parts;

    if (hour.startsWith('*/')) {
      setScheduleMode('hourly');
      setHourlyInterval(hour.substring(2));
    } else if (dow === '*') {
      setScheduleMode('daily');
      setDailyHour(hour.padStart(2, '0'));
      setDailyMinute(min.padStart(2, '0'));
    } else {
      setScheduleMode('weekly');
      setWeeklyDay(dow);
      setWeeklyHour(hour.padStart(2, '0'));
      setWeeklyMinute(min.padStart(2, '0'));
    }
  };

  useEffect(() => {
    syncCronToUI(job.cronExpression);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.cronExpression]);

  // Saves immediately with the just-changed value (rather than reading state
  // after a setTimeout(0), which raced the pending setState and saved the
  // previous mode/hour/day on the very click that changed it).
  const saveScheduleWith = async (overrides: Partial<{
    mode: ScheduleMode;
    hourly: string;
    dh: string;
    dm: string;
    wd: string;
    wh: string;
    wm: string;
  }>) => {
    const mode = overrides.mode ?? scheduleMode;
    const hourly = overrides.hourly ?? hourlyInterval;
    const dh = overrides.dh ?? dailyHour;
    const dm = overrides.dm ?? dailyMinute;
    const wd = overrides.wd ?? weeklyDay;
    const wh = overrides.wh ?? weeklyHour;
    const wm = overrides.wm ?? weeklyMinute;
    const newCron =
      mode === 'hourly'
        ? `0 */${hourly} * * *`
        : mode === 'daily'
          ? `${dm} ${dh} * * *`
          : `${wm} ${wh} * * ${wd}`;

    try {
      const updated = await apiRequest<ScheduledJob>(`/api/admin/scheduled-jobs/${job._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: job.name,
          command: job.command,
          cronExpression: newCron,
        }),
      });
      onUpdated(updated);
    } catch (err) {
      console.error('Failed to save schedule:', err);
    }
  };

  const toggleJob = async () => {
    try {
      const updated = await apiRequest<ScheduledJob>(`/api/admin/scheduled-jobs/${job._id}/toggle`, {
        method: 'POST',
      });
      onUpdated(updated);
    } catch (err) {
      console.error('Failed to toggle job:', err);
    }
  };

  const runNow = async () => {
    const previousStatus = job.lastRunStatus;
    onUpdated({ ...job, lastRunStatus: 'running' });
    onRunning();
    try {
      await apiRequest(`/api/admin/scheduled-jobs/${job._id}/run`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to run job:', err);
      onUpdated({ ...job, lastRunStatus: previousStatus });
    }
  };

  const deleteJob = async () => {
    if (!window.confirm(`"${job.name}" işini silmek istediğinize emin misiniz?`)) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/scheduled-jobs/${job._id}`, { method: 'DELETE' });
      onDeleted(job._id);
    } catch (err) {
      console.error('Failed to delete job:', err);
      setDeleting(false);
    }
  };

  const getStatusBadge = () => {
    switch (job.lastRunStatus) {
      case 'success':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full"><Check size={12} /> Başarılı</span>;
      case 'error':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-3 py-1 rounded-full"><AlertCircle size={12} /> Hata</span>;
      case 'running':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full"><Loader2 size={12} className="animate-spin" /> Çalışıyor</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full">— Henüz çalışmadı</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg border border-slate-200">
          <Archive size={18} className="text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-900 truncate">{job.name}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Yedekleme Ayarları</p>
        </div>
        <button
          onClick={deleteJob}
          disabled={deleting}
          title="İşi sil"
          className={cn(
            'p-2 rounded-lg border transition-all shrink-0',
            deleting
              ? 'border-slate-100 text-slate-300 cursor-not-allowed'
              : 'border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-600 hover:bg-red-50'
          )}
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      <div className="p-8 space-y-8">
        {/* Etkin/Devre dışı toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div>
            <p className="font-semibold text-slate-900 text-sm">Yedeklemeleri etkinleştir</p>
            <p className="text-xs text-slate-500 mt-1">Zamanlanan yedeklemeler otomatik olarak çalışacak</p>
          </div>
          <button
            onClick={toggleJob}
            className={cn(
              'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
              job.enabled
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-slate-300 hover:bg-slate-400'
            )}
          >
            <span
              className={cn(
                'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                job.enabled ? 'translate-x-7' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {/* Zamanlama seçimi */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Zamanlama Modu</label>
          <div className="grid grid-cols-3 gap-3">
            {(['hourly', 'daily', 'weekly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setScheduleMode(mode);
                  void saveScheduleWith({ mode });
                }}
                className={cn(
                  'p-3 rounded-xl border transition-all text-xs font-bold uppercase',
                  scheduleMode === mode
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                {mode === 'hourly' && 'Her X saatte bir'}
                {mode === 'daily' && 'Her gün'}
                {mode === 'weekly' && 'Haftalık'}
              </button>
            ))}
          </div>
        </div>

        {/* Zamanlama parametreleri */}
        {scheduleMode === 'hourly' && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Her kaç saatte bir?</label>
            <select
              value={hourlyInterval}
              onChange={(e) => {
                setHourlyInterval(e.target.value);
                void saveScheduleWith({ hourly: e.target.value });
              }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5"
            >
              {[1, 2, 4, 6, 8, 12, 24].map((n) => (
                <option key={n} value={String(n)}>
                  Her {n} saatte bir
                </option>
              ))}
            </select>
          </div>
        )}

        {scheduleMode === 'daily' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Saat</label>
              <select
                value={dailyHour}
                onChange={(e) => {
                  setDailyHour(e.target.value);
                  void saveScheduleWith({ dh: e.target.value });
                }}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              >
                {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Dakika</label>
              <select
                value={dailyMinute}
                onChange={(e) => {
                  setDailyMinute(e.target.value);
                  void saveScheduleWith({ dm: e.target.value });
                }}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              >
                {['00', '15', '30', '45'].map((m) => (
                  <option key={m} value={m}>
                    :{m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {scheduleMode === 'weekly' && (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Gün</label>
              <select
                value={weeklyDay}
                onChange={(e) => {
                  setWeeklyDay(e.target.value);
                  void saveScheduleWith({ wd: e.target.value });
                }}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              >
                {DAYS.map((day, idx) => (
                  <option key={idx} value={String(idx)}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Saat</label>
              <select
                value={weeklyHour}
                onChange={(e) => {
                  setWeeklyHour(e.target.value);
                  void saveScheduleWith({ wh: e.target.value });
                }}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              >
                {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Dakika</label>
              <select
                value={weeklyMinute}
                onChange={(e) => {
                  setWeeklyMinute(e.target.value);
                  void saveScheduleWith({ wm: e.target.value });
                }}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              >
                {['00', '15', '30', '45'].map((m) => (
                  <option key={m} value={m}>
                    :{m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Sonraki çalışma zamanı */}
        {job.nextRunAt && (
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
            <Clock size={16} className="text-blue-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-900">Sonraki çalışma</p>
              <p className="text-xs text-blue-700 mt-0.5">
                {new Date(job.nextRunAt).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
        )}

        {/* Şimdi çalıştır butonu */}
        <button
          onClick={runNow}
          disabled={isRunning || !job.enabled}
          className={cn(
            'w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2',
            isRunning || !job.enabled
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          )}
        >
          <Play size={14} />
          {isRunning ? 'Çalışıyor...' : 'Şimdi Çalıştır'}
        </button>

        {/* Son çalışma durumu */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Son Çalışma Durumu</label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Durum</span>
              {getStatusBadge()}
            </div>
            {job.lastRunAt && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Tarih</span>
                <span className="text-slate-900">
                  {new Date(job.lastRunAt).toLocaleString('tr-TR')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Log çıktısı */}
        {job.lastRunOutput && (
          <details className="group">
            <summary className="cursor-pointer flex items-center gap-2 py-2 px-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
              <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
              <span className="text-xs font-semibold text-slate-700">Log Çıktısını Göster</span>
            </summary>
            <pre className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-[10px] overflow-auto max-h-64 text-slate-600 font-mono">
              {job.lastRunOutput}
            </pre>
          </details>
        )}
      </div>
    </motion.div>
  );
}
