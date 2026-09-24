export type HelpTourKey =
  | 'dashboard'
  | 'customers'
  | 'customerDirectory'
  | 'projects'
  | 'knowledgeBase'
  | 'tasks'
  | 'users'
  | 'activities'
  | 'settings';

type HelpTourConfig = {
  key: HelpTourKey;
  urlField: string;
  mdField: string;
  titleField: string;
  orderField: string;
};

export const HELP_TOUR_CONFIG: readonly HelpTourConfig[] = [
  {
    key: 'dashboard',
    urlField: 'helpDashboardUrl',
    mdField: 'helpDashboardMd',
    titleField: 'helpDashboardTitle',
    orderField: 'helpDashboardOrder',
  },
  {
    key: 'customers',
    urlField: 'helpCustomersUrl',
    mdField: 'helpCustomersMd',
    titleField: 'helpCustomersTitle',
    orderField: 'helpCustomersOrder',
  },
  {
    key: 'customerDirectory',
    urlField: 'helpCustomerDirectoryUrl',
    mdField: 'helpCustomerDirectoryMd',
    titleField: 'helpCustomerDirectoryTitle',
    orderField: 'helpCustomerDirectoryOrder',
  },
  {
    key: 'projects',
    urlField: 'helpProjectsUrl',
    mdField: 'helpProjectsMd',
    titleField: 'helpProjectsTitle',
    orderField: 'helpProjectsOrder',
  },
  {
    key: 'knowledgeBase',
    urlField: 'helpKnowledgeBaseUrl',
    mdField: 'helpKnowledgeBaseMd',
    titleField: 'helpKnowledgeBaseTitle',
    orderField: 'helpKnowledgeBaseOrder',
  },
  {
    key: 'tasks',
    urlField: 'helpAssignmentsUrl',
    mdField: 'helpAssignmentsMd',
    titleField: 'helpAssignmentsTitle',
    orderField: 'helpAssignmentsOrder',
  },
  {
    key: 'users',
    urlField: 'helpUsersUrl',
    mdField: 'helpUsersMd',
    titleField: 'helpUsersTitle',
    orderField: 'helpUsersOrder',
  },
  {
    key: 'activities',
    urlField: 'helpActivitiesUrl',
    mdField: 'helpActivitiesMd',
    titleField: 'helpActivitiesTitle',
    orderField: 'helpActivitiesOrder',
  },
  {
    key: 'settings',
    urlField: 'helpSettingsUrl',
    mdField: 'helpSettingsMd',
    titleField: 'helpSettingsTitle',
    orderField: 'helpSettingsOrder',
  },
] as const;

export type HelpTourStep = {
  key: HelpTourKey;
  url: string;
  md: string;
  title: string;
  order: number;
};

type HelpTourSettings = Record<string, unknown>;

function asPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return null;
}

export function getHelpBannerTitle(settings: HelpTourSettings, key?: HelpTourKey): string {
  if (!key) return '';
  const cfg = HELP_TOUR_CONFIG.find((item) => item.key === key);
  if (!cfg) return '';
  return String(settings[cfg.titleField] ?? '').trim();
}

export function extractMarkdownHeading(md: string): string {
  const match = md.match(/^#{1,3}\s+(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

export function resolveHelpBannerTitle(options: {
  configuredTitle?: string;
  markdown?: string;
  pageFallback?: string;
}): string {
  const configured = options.configuredTitle?.trim() ?? '';
  if (configured) return configured;
  const fromMd = extractMarkdownHeading(options.markdown ?? '');
  if (fromMd) return fromMd;
  return options.pageFallback?.trim() ?? '';
}

export function buildHelpTourSteps(settings: HelpTourSettings): HelpTourStep[] {
  const steps = HELP_TOUR_CONFIG.flatMap((cfg) => {
    const url = String(settings[cfg.urlField] ?? '').trim();
    const md = String(settings[cfg.mdField] ?? '').trim();
    const title = String(settings[cfg.titleField] ?? '').trim();
    if (!url && !md) return [];

    const order =
      cfg.key === 'dashboard'
        ? 1
        : asPositiveInt(settings[cfg.orderField]);
    if (!order) return [];

    return [{ key: cfg.key, url, md, title, order }];
  });

  return steps.sort((a, b) => (a.order === b.order ? a.key.localeCompare(b.key) : a.order - b.order));
}
