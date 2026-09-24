/**
 * One-off: seed a reusable example/template Materiality Survey (ESRS double
 * materiality) so consultants can clone it into a real customer instead of
 * starting from a blank survey. Idempotent — safe to re-run.
 *
 * Run: npx tsx scripts/seed-materiality-survey-template.ts
 */

import { getPrisma } from '../server/data/prismaClient.ts';

const TEMPLATE_CUSTOMER_NAME = 'Şablon Kütüphanesi';
const TEMPLATE_SURVEY_TITLE = 'Örnek Önemlilik Anketi (Şablon)';

const TOPICS: Array<{
  subject: string;
  griMapping: string;
  disclosures: string;
  iros: Array<{
    description: string;
    iroType: 'impact' | 'risk' | 'opportunity';
    valueChainPosition: 'own_operations' | 'upstream' | 'downstream';
    polarity: 'positive' | 'negative';
  }>;
}> = [
  {
    subject: 'İklim Değişikliği — Sera Gazı Emisyonları',
    griMapping: 'GRI 305',
    disclosures: 'ESRS E1',
    iros: [
      {
        description: 'Üretim faaliyetlerinden kaynaklanan Kapsam 1-2 sera gazı emisyonlarının iklim değişikliğine katkısı.',
        iroType: 'impact',
        valueChainPosition: 'own_operations',
        polarity: 'negative',
      },
      {
        description: 'Karbon fiyatlandırması ve emisyon regülasyonlarının artmasından kaynaklanan geçiş riski.',
        iroType: 'risk',
        valueChainPosition: 'own_operations',
        polarity: 'negative',
      },
    ],
  },
  {
    subject: 'Su ve Deniz Kaynakları',
    griMapping: 'GRI 303',
    disclosures: 'ESRS E3',
    iros: [
      {
        description: 'Üretim tesislerinde yüksek su tüketiminin yerel su kaynakları üzerindeki etkisi.',
        iroType: 'impact',
        valueChainPosition: 'own_operations',
        polarity: 'negative',
      },
    ],
  },
  {
    subject: 'Kendi İşgücü — Çalışan Sağlığı ve Güvenliği',
    griMapping: 'GRI 403',
    disclosures: 'ESRS S1',
    iros: [
      {
        description: 'İş sağlığı ve güvenliği uygulamalarının çalışan güvenliği ve refahı üzerindeki olumlu etkisi.',
        iroType: 'impact',
        valueChainPosition: 'own_operations',
        polarity: 'positive',
      },
      {
        description: 'Yetersiz İSG uygulamalarından kaynaklanan iş kazası ve operasyonel durma riski.',
        iroType: 'risk',
        valueChainPosition: 'own_operations',
        polarity: 'negative',
      },
    ],
  },
  {
    subject: 'Tedarik Zincirinde Çalışan Hakları',
    griMapping: 'GRI 407-409',
    disclosures: 'ESRS S2',
    iros: [
      {
        description: 'Alt tedarikçilerde zorunlu/çocuk işçilik riskinin tedarik zincirindeki çalışanlar üzerindeki olumsuz etkisi.',
        iroType: 'impact',
        valueChainPosition: 'upstream',
        polarity: 'negative',
      },
    ],
  },
  {
    subject: 'İş Etiği ve Yolsuzlukla Mücadele',
    griMapping: 'GRI 205',
    disclosures: 'ESRS G1',
    iros: [
      {
        description: 'Güçlü etik uyum programının paydaş güveni ve marka itibarına katkısı; zayıf uygulamada yaptırım/itibar kaybı fırsatı.',
        iroType: 'opportunity',
        valueChainPosition: 'own_operations',
        polarity: 'positive',
      },
    ],
  },
];

async function main() {
  const prisma = getPrisma();

  let customer = await prisma.customer.findFirst({ where: { name: TEMPLATE_CUSTOMER_NAME } });
  if (!customer) {
    customer = await prisma.customer.create({ data: { name: TEMPLATE_CUSTOMER_NAME } });
    console.log(`Created template customer ${customer.id}`);
  } else {
    console.log(`Using existing template customer ${customer.id}`);
  }

  const existingSurvey = await prisma.materialitySurvey.findFirst({
    where: { customerId: customer.id, title: TEMPLATE_SURVEY_TITLE },
  });
  if (existingSurvey) {
    console.log(`Template survey already exists (${existingSurvey.id}); nothing to do.`);
    return;
  }

  const survey = await prisma.materialitySurvey.create({
    data: {
      customerId: customer.id,
      title: TEMPLATE_SURVEY_TITLE,
      standardRef: 'ESRS',
      status: 'draft',
      isTemplate: true,
      materialThreshold: 3,
    },
  });

  let order = 0;
  for (const topic of TOPICS) {
    const row = await prisma.gRIMaterialityMatrixRow.create({
      data: {
        customerId: customer.id,
        order: order++,
        subject: topic.subject,
        griMapping: topic.griMapping,
        disclosures: topic.disclosures,
      },
    });
    await prisma.materialityIro.createMany({
      data: topic.iros.map((iro, i) => ({
        surveyId: survey.id,
        topicRef: row.id,
        description: iro.description,
        iroType: iro.iroType,
        valueChainPosition: iro.valueChainPosition,
        polarity: iro.polarity,
        sortOrder: i,
      })),
    });
  }

  console.log(`Created template survey ${survey.id} with ${TOPICS.length} topics.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
