/**
 * Organizasyonel Sınır Tanımı — onboarding draft model (TR-only wizard).
 */

export type OrgSiteKind =
  | 'fabrika'
  | 'ofis'
  | 'depo'
  | 'magaza'
  | 'saha'
  | 'diger';

export type OrgSubsidiary = {
  id: string;
  name: string;
  country: string;
  ownershipPercent: string;
  notes: string;
};

export type OrgSite = {
  id: string;
  name: string;
  kind: OrgSiteKind;
  country: string;
  city: string;
  address: string;
};

export type OrgBusinessUnit = {
  id: string;
  name: string;
  description: string;
};

export type OrgParentCompany = {
  legalName: string;
  brandName: string;
  headquartersCountry: string;
  headquartersCity: string;
  headquartersAddress: string;
  websiteUrl: string;
  taxNumber: string;
  sectorId: string;
};

export type OrganizationalBoundaryDraft = {
  parent: OrgParentCompany;
  subsidiaries: OrgSubsidiary[];
  sites: OrgSite[];
  businessUnits: OrgBusinessUnit[];
  consolidationNotes: string;
};

export const ORG_SITE_KIND_LABELS: Record<OrgSiteKind, string> = {
  fabrika: 'Fabrika / üretim tesisi',
  ofis: 'Ofis',
  depo: 'Depo / lojistik',
  magaza: 'Mağaza / şube',
  saha: 'Saha / operasyon noktası',
  diger: 'Diğer',
};

export const EMPTY_ORG_BOUNDARY_DRAFT: OrganizationalBoundaryDraft = {
  parent: {
    legalName: '',
    brandName: '',
    headquartersCountry: 'Türkiye',
    headquartersCity: '',
    headquartersAddress: '',
    websiteUrl: '',
    taxNumber: '',
    sectorId: '',
  },
  subsidiaries: [],
  sites: [],
  businessUnits: [],
  consolidationNotes: '',
};

export function newOrgEntityId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Persistable Turkish summary for Customer.description */
export function buildOrganizationalBoundaryDescription(
  draft: OrganizationalBoundaryDraft,
): string {
  const lines: string[] = [
    '## Organizasyonel sınır tanımı',
    '',
    'Bu kayıt, raporlama sınırının belirlenmesi için yapılandırılmış onboarding sihirbazı ile oluşturulmuştur.',
    '',
    '### Ana şirket',
    `- Yasal unvan: ${draft.parent.legalName || '—'}`,
    `- Ticari / marka adı: ${draft.parent.brandName || '—'}`,
    `- Genel merkez: ${[draft.parent.headquartersCity, draft.parent.headquartersCountry].filter(Boolean).join(', ') || '—'}`,
    '',
  ];

  lines.push('### Uluslararası iştirakler');
  if (draft.subsidiaries.length === 0) {
    lines.push('- Tanımlanmadı');
  } else {
    for (const s of draft.subsidiaries) {
      const ownership = s.ownershipPercent.trim()
        ? ` (%${s.ownershipPercent.trim()} sahiplik)`
        : '';
      lines.push(
        `- ${s.name || 'Adsız iştirak'} — ${s.country || 'Ülke belirtilmedi'}${ownership}${s.notes ? ` — ${s.notes}` : ''}`,
      );
    }
  }
  lines.push('');

  lines.push('### Operasyonel sahalar');
  if (draft.sites.length === 0) {
    lines.push('- Tanımlanmadı');
  } else {
    for (const site of draft.sites) {
      const kind = ORG_SITE_KIND_LABELS[site.kind] || site.kind;
      const place = [site.city, site.country].filter(Boolean).join(', ');
      lines.push(
        `- ${site.name || 'Adsız saha'} (${kind})${place ? ` — ${place}` : ''}${site.address ? ` — ${site.address}` : ''}`,
      );
    }
  }
  lines.push('');

  lines.push('### İş birimleri');
  if (draft.businessUnits.length === 0) {
    lines.push('- Tanımlanmadı');
  } else {
    for (const unit of draft.businessUnits) {
      lines.push(
        `- ${unit.name || 'Adsız birim'}${unit.description ? ` — ${unit.description}` : ''}`,
      );
    }
  }

  if (draft.consolidationNotes.trim()) {
    lines.push('', '### Konsolidasyon / sınır notları', draft.consolidationNotes.trim());
  }

  return lines.join('\n');
}

export function buildOperationGeographies(
  draft: OrganizationalBoundaryDraft,
): string {
  const countries = new Set<string>();
  if (draft.parent.headquartersCountry.trim()) {
    countries.add(draft.parent.headquartersCountry.trim());
  }
  for (const s of draft.subsidiaries) {
    if (s.country.trim()) countries.add(s.country.trim());
  }
  for (const site of draft.sites) {
    if (site.country.trim()) countries.add(site.country.trim());
  }
  return [...countries].join(', ');
}
