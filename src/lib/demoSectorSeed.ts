/**
 * Demo customer-sector definitions and legacy-name → canonical key mapping
 * for Settings → Demo seed (see DemoManagement.tsx).
 */

export type SectorKey =
  | 'export'
  | 'agrifood'
  | 'chem'
  | 'auto'
  | 'elec'
  | 'machine'
  | 'steel'
  | 'cement'
  | 'resource_transformation'
  | 'other';

export type DemoSectorRow = { key: SectorKey; name: string; description: string };

/** Platform-admin demo sectors: Turkish when profile language is `tr`, otherwise English. */
export const DEMO_SECTOR_ROWS: Record<'tr' | 'en', DemoSectorRow[]> = {
  tr: [
    {
      key: 'export',
      name: 'Türkiye İhracatı',
      description: 'İhracat odaklı işletmeler ve uluslararası ticaret.',
    },
    {
      key: 'agrifood',
      name: 'Tarım ve Gıda Ürünleri',
      description: 'Tarım, gıda ve içecek üretimi ile tedarik zinciri.',
    },
    {
      key: 'chem',
      name: 'Kimyevi Maddeler',
      description: 'Kimya endüstrisi, hammaddeler ve özel kimyasallar.',
    },
    {
      key: 'auto',
      name: 'Otomotiv Endüstrisi',
      description: 'Taşıt üretimi, yan sanayi ve mobilite çözümleri.',
    },
    {
      key: 'elec',
      name: 'Elektrik Elektronik',
      description: 'Elektrik ekipmanları, elektronik ve otomasyon.',
    },
    {
      key: 'machine',
      name: 'Makina ve Aksamları',
      description: 'Makine imalatı, aksam ve endüstriyel ekipman.',
    },
    {
      key: 'steel',
      name: 'Demir ve Çelik Ürünleri',
      description: 'Metalürji, çelik ve demir-çelik ürünleri.',
    },
    {
      key: 'cement',
      name: 'Çimento - Cam - Seramik',
      description: 'Çimento, cam, seramik ve ilgili inşaat malzemeleri.',
    },
    {
      key: 'resource_transformation',
      name: 'Kaynak Dönüşümü (Resource Transformation)',
      description: 'Kimyasallar, endüstriyel ürünler, makine, havacılık/savunma ve otomotiv dönüşüm sektörleri.',
    },
    {
      key: 'other',
      name: 'Diğer',
      description: 'Diğer sektörler veya henüz sınıflandırılmamış faaliyetler.',
    },
  ],
  en: [
    {
      key: 'export',
      name: 'Turkey Exports',
      description: 'Export-oriented companies and international trade.',
    },
    {
      key: 'agrifood',
      name: 'Agriculture & Food Products',
      description: 'Farming, food & beverage production and supply chains.',
    },
    {
      key: 'chem',
      name: 'Chemicals',
      description: 'Chemical industry, feedstocks and specialty chemicals.',
    },
    {
      key: 'auto',
      name: 'Automotive Industry',
      description: 'Vehicle manufacturing, suppliers and mobility.',
    },
    {
      key: 'elec',
      name: 'Electrical & Electronics',
      description: 'Electrical equipment, electronics and automation.',
    },
    {
      key: 'machine',
      name: 'Machinery & Components',
      description: 'Machinery manufacturing and industrial equipment.',
    },
    {
      key: 'steel',
      name: 'Iron & Steel Products',
      description: 'Metallurgy, steel and ferrous products.',
    },
    {
      key: 'cement',
      name: 'Cement - Glass - Ceramics',
      description: 'Cement, glass, ceramics and related building materials.',
    },
    {
      key: 'resource_transformation',
      name: 'Resource Transformation',
      description: 'Chemicals, industrial goods, machinery, aerospace/defense and automotive transformation sectors.',
    },
    {
      key: 'other',
      name: 'Other',
      description: 'Other industries or activities not yet classified.',
    },
  ],
};

function nf(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Map any previous customer-sector label to a canonical key (new or legacy English/Turkish). */
export function legacyCustomerSectorNameToKey(raw: string): SectorKey {
  const n = nf(raw);
  if (!n) return 'other';

  for (const lang of ['tr', 'en'] as const) {
    for (const row of DEMO_SECTOR_ROWS[lang]) {
      if (nf(row.name) === n) return row.key;
    }
  }

  const exact: Record<string, SectorKey> = {
    'consumer goods': 'agrifood',
    retail: 'other',
    'financial services': 'other',
    energy: 'other',
    mobility: 'auto',
    'industrial goods': 'machine',
    services: 'other',
    tourism: 'other',
    'print, publishing & packaging': 'other',
  };
  if (exact[n]) return exact[n];

  if (
    n.includes('otomotiv') ||
    n.includes('mobility') ||
    n.includes('automotive') ||
    n.includes('volkswagen') ||
    n.includes('bmw') ||
    n.includes('arac') ||
    n.includes('auto')
  ) {
    return 'auto';
  }
  if (
    n.includes('consumer') ||
    n.includes('food') ||
    n.includes('beverage') ||
    n.includes('gida') ||
    n.includes('tarim') ||
    n.includes('tarım') ||
    n.includes('supermarket') ||
    n.includes('grocery')
  ) {
    return 'agrifood';
  }
  if (n.includes('chemical') || n.includes('kimya') || n.includes('kimyevi') || n.includes('pharma')) return 'chem';
  if (
    n.includes('elektrik') ||
    n.includes('electr') ||
    n.includes('electron') ||
    n.includes('tech') ||
    n.includes('software') ||
    n.includes('it ') ||
    n.includes(' bilgi')
  ) {
    return 'elec';
  }
  if (
    n.includes('machine') ||
    n.includes('makina') ||
    n.includes('makin') ||
    n.includes('industrial goods') ||
    n.includes('imalat')
  ) {
    return 'machine';
  }
  if (n.includes('steel') || n.includes('demir') || n.includes('celik') || n.includes('çelik') || n.includes('metalurji')) {
    return 'steel';
  }
  if (n.includes('cement') || n.includes('cam') || n.includes('seramik') || n.includes('çimento') || n.includes('glass')) {
    return 'cement';
  }
  if (
    n.includes('kaynak donusumu') ||
    n.includes('kaynak dönüşümü') ||
    n.includes('resource transformation') ||
    n.includes('resource_transformation')
  ) {
    return 'resource_transformation';
  }
  if (n.includes('ihracat') || n.includes('export') || n.includes('turkey') || n.includes('turkiye') || n.includes('türkiye')) {
    return 'export';
  }

  return 'other';
}
