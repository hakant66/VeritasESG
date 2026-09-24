/**
 * One-off: rename TechCorp → Akkim Kimya and populate customer profile fields.
 * Run: docker exec -i governanceiq-mongo-1 mongosh mongodb://127.0.0.1:27017/governance < scripts/seed-akkim-customer.js
 */

const customerId = '6a213df07ae56bf26fd1a7bb';
const kimyaSectorId = '6a1d90148098c82d41bbd240';

const description = [
  "Türkiye'nin öncü kimyasal madde üreticisi Akkim Kimya, 1977'de Yalova'da kurulmuştur. İştirakleriyle birlikte 1400'ü aşkın çalışanı ile 5 farklı lokasyonda üretim yapan Akkim, ürün çeşitliliğiyle kimya sektöründe özel bir yere sahiptir.",
  'Akkim; klor-alkali ve türevleri, peroksitler, metilaminler, persülfatlar, bisülfitler, karboksimetil selüloz, silikon polimerleri, tekstil yardımcı maddeleri, kâğıt ve su kimyasalları, yapı kimyasalları ve plastik katkılarını kapsayan geniş ürün yelpazesiyle 6 kıtada 70\'den fazla ülkeye hizmet veren bir kimya şirketidir.',
  'Temel kimyasallar ve performans kimyasallarında birçok üründe pazar lideri olan şirket; temizlik, hijyen, su arıtma, tekstil, kâğıt, endüstriyel kaplamalar, inşaat, plastik, gıda, ilaç, tarım, metal, enerji, deterjan, sondaj ve madencilik sektörlerinin çözüm ortağıdır.',
  "2013 yılında kurulan Ar-Ge Merkezi'nde iyi analiz edilmiş gereksinimlere zengin çeşitlilikte ürünlerle karşılık yaratmaya çalışan Akkim, küresel standartlarda inovasyon yapabilen bir organizasyona dönüşmüştür.",
  'Sürdürülebilir kalkınma yolundaki evrensel ilkelerin yaygınlaşmasına öncülük eden Birleşmiş Milletler Küresel İlkeler Sözleşmesi\'ni 2007 yılında imzalayan Akkim Kimya, kimya sektöründe sürdürülebilirlik alanında örnek şirketlerdendir.',
].join('\n\n');

const brandPortfolio = [
  'Akkim Kimya (ana şirket)',
  'Akcoat (Gizem Frit) — kimyasal kaplama malzemeleri',
  'Akkim Europe (eski Dinox) — Almanya satış ve pazarlama',
  'Akkim Spain (Megacolor) — seramik baskı mürekkepleri',
  'USK Kimya — karboksimetil selüloz',
  'Akkim Silikon Kimya — silikon polimerleri',
  'Akualys — ultrafiltrasyon membran modülleri',
].join('\n');

const naceDescription =
  'Diğer metal tuzları ve temel inorganik kimyasalların imalatı (izotoplar ve bunların bileşikleri, oksometalik-peroksometalik asitlerin tuzları, siyanürler, boratlar, hidrojen peroksit, kükürt, kavrulmuş demir piritler, piezo-elektrik kuvarsı vb.)';

const operationGeographies =
  'Türkiye (İstanbul merkez ofis; Yalova ve Nazilli üretim tesisleri), Almanya (Akkim Europe), İspanya (Akkim Spain); 6 kıtada 70\'ten fazla ülkeye ihracat.';

const reportingBoundaryNote =
  '1 Ocak 2022 – 31 Aralık 2023 raporlama dönemi; İstanbul Merkez Ofis, Yalova ve Nazilli üretim tesisleri (Akkim Kimya Sanayi ve Ticaret A.Ş. konsolide sınırları).';

const businessResilienceAssessment =
  '2023 yılında konsolide 13,6 milyar TL ciro; organik ve inorganik büyüme ile 2027\'de 1 milyar ABD doları ciro hedefi. Hammadde fiyat düşüşüne karşın satış fiyatlarının korunması, dövize endeksli satışlar ve sıkı maliyet kontrolü karlılığı desteklemiştir.';

const customerUpdate = {
  name: 'Akkim Kimya',
  legalName: 'AKKİM KİMYA SANAYİ VE TİCARET A.Ş.',
  sectorIds: [kimyaSectorId],
  address: 'MİRALAY ŞEFİK BEY SOKAK AKHAN NO:15 GÜMÜŞSUYU BEYOĞLU / İSTANBUL',
  websiteUrl: 'https://www.akkim.com.tr',
  website: 'https://www.akkim.com.tr',
  description,
  brandPortfolio,
  sectoralDefinition: 'C20 — Kimyasalların ve kimyasal ürünlerin imalatı',
  naceCode: 'C20',
  naceDescription,
  sasbMacroSector: 'resource_transformation',
  sasbSubSectorSics: 'RT-CH',
  headquartersCountry: 'Turkey',
  operationGeographies,
  employeeCountTotal: 1400,
  employeeCountBlueCollar: 0,
  employeeCountWhiteCollar: 0,
  employeeCountMale: 0,
  employeeCountFemale: 0,
  taxNumber: '0110033222',
  reportingCurrency: 'TRY',
  annualTurnoverMeur: 330,
  reportingFrameworkKeys: ['tsrs_1', 'tsrs_2', 'gri', 'tcfd', 'esrs_csrd'],
  csrdScopeEmployeeCount: 1400,
  csrdScopeTurnoverMeur: 330,
  isPublicInterestEntity: false,
  country: 'Turkey',
  email: 'info@akkim.com.tr',
  phone: '+90 212 381 71 00',
  type: 'A.Ş.',
  updatedAt: new Date(),
  esgSummary: {
    reportingBoundaryNote,
    financialYearStart: '2022-01-01',
    financialYearEnd: '2023-12-31',
    sustainabilityCapexForecastMeur: 0.59,
    rdExpenditureMeur: 27,
    sustainabilityExecutive: 'Yönetim Kurulu / Sürdürülebilirlik Komitesi',
    businessResilienceAssessment,
    ethicsPolicyStatus: 'yes',
    gdprKvkkPolicyStatus: 'yes',
    climateRiskInRegister: 'yes',
    supplierSocialAuditStatus: 'yes',
    avgTrainingHoursPerEmployee: 133,
    femaleManagerPercent: 0,
    turnoverPercent: 0,
  },
};

const result = db.customers.updateOne(
  { _id: ObjectId(customerId) },
  { $set: customerUpdate },
);

printjson({ matched: result.matchedCount, modified: result.modifiedCount });

const facilities = [
  {
    name: 'İstanbul Merkez Ofis',
    type: 'Merkez ofis',
    address: 'Miralay Şefik Bey Sokak Akhan No:15, Gümüşsuyu, Beyoğlu / İstanbul',
  },
  {
    name: 'Yalova Üretim Tesisi',
    type: 'Üretim tesisi',
    address: 'Yalova, Türkiye',
  },
  {
    name: 'Nazilli Üretim Tesisi',
    type: 'Üretim tesisi',
    address: 'Nazilli, Aydın, Türkiye',
  },
  {
    name: 'Akkim Europe',
    type: 'Satış ve pazarlama',
    address: 'Almanya',
  },
  {
    name: 'Akkim Spain (Megacolor)',
    type: 'Üretim tesisi',
    address: 'İspanya',
  },
];

db.branches.deleteMany({ customerId });
for (const facility of facilities) {
  db.branches.insertOne({
    customerId,
    name: facility.name,
    type: facility.type,
    address: facility.address,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

print('branches:', db.branches.countDocuments({ customerId }));
printjson(db.customers.findOne({ _id: ObjectId(customerId) }, { name: 1, legalName: 1, taxNumber: 1, websiteUrl: 1, employeeCountTotal: 1 }));
