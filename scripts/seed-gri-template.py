#!/usr/bin/env python3
"""
Build the question bank for the "GRI" Template (id 6a32c04c6380673899a1350d),
which previously had zero TemplatePage/Question rows (so "Form Ekle" -> GRI
produced an empty questionnaire for every project).

Content sourcing:
  - GRI 1, GRI 2 (all 30 disclosures) and GRI 3 (all 3 disclosures) use the
    REAL disclosure titles, extracted from the official GRI 1/2/3 Universal
    Standards PDFs already uploaded to this platform's Knowledge Base
    (kbdocuments), translated into Turkish question prompts.
  - The other 35 topic-specific standards (GRI 101-103, 201-207, 301-308,
    401-418) have no source document uploaded yet, so each gets one
    AI-estimated Turkish question. This tradeoff (speed over exhaustive
    sourcing) was explicitly chosen by the user; revisit if/when the real
    topic-standard PDFs are uploaded -- re-extract those sections the same
    way GRI 2/3 were done here.

Five TemplatePages are created, grouped per the user's own category split:
  Evrensel Standartlar / Yeni Nesil Konu Standartları / Ekonomik Standartlar /
  Çevresel Standartlar / Sosyal Standartlar.

Field conventions (kod/gri/bolum/thematicGroup/answerFormat/domainIds) were
reverse-engineered from the working Kimya Sektörü reference template.

Idempotent: re-running deletes and recreates every TemplatePage/Question
scoped to this templateId (ids are deterministic, derived from each
standard's code), so this is safe to run again after edits to this file.
Note: projects that already ran "Form Ekle" -> GRI keep a full per-field
snapshot in ProjectQuestion, so re-running this script does not affect
already-built projects; they'd need to re-run "Form Ekle" to pick up changes.

Usage (run from repo root, with the Docker Postgres stack up):
  python3 scripts/seed-gri-template.py
  docker cp /tmp/gri_template_seed.sql <postgres-container>:/tmp/gri_template_seed.sql
  docker compose exec -T postgres psql -U governance -d governance -f /tmp/gri_template_seed.sql
"""
import hashlib

TEMPLATE_ID = "6a32c04c6380673899a1350d"
SECTOR_ID = "6a0ca23c292055cbf641af36"  # generic/sector-agnostic, shared with TSRS1/TSRS2/GRI


def esc(s):
    return s.replace("'", "''")


def slug_id(prefix, *parts):
    """Deterministic id: stable across re-runs, so the delete+insert below is idempotent."""
    h = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:20]
    return f"{prefix}{h}"


# Real disclosure titles extracted from the uploaded GRI 1/2/3 PDFs (kbdocuments).
GRI2_DISCLOSURES = [
    ("2-1", "Organizasyonel Detaylar", "Şirketinizin yasal adı, mülkiyet ve hukuki yapısı, genel merkezinin bulunduğu yer ve faaliyet gösterdiği ülkeleri belirtiniz."),
    ("2-2", "Sürdürülebilirlik Raporuna Dahil Edilen İşletmeler", "Konsolide finansal tablolara dahil edilen tüm bağlı ortaklık ve iştirakleri, bunların bu sürdürülebilirlik raporuna dahil olup olmadığını belirterek listeleyiniz."),
    ("2-3", "Raporlama Dönemi, Sıklığı ve İletişim Noktası", "Sürdürülebilirlik raporlama döneminizi, finansal raporlama döneminizle ilişkisini, raporlama sıklığını ve raporla ilgili sorular için iletişim noktasını belirtiniz."),
    ("2-4", "Bilgilerin Yeniden Düzenlenmesi", "Önceki raporlama dönemlerinde verilen bilgilerde yapılan yeniden düzenlemeleri, nedenlerini ve etkilerini açıklayınız."),
    ("2-5", "Dış Güvence", "Sürdürülebilirlik raporlamanız için dış güvence (bağımsız denetim) alınıp alınmadığını; alındıysa kapsamını, yaklaşımını ve güvence sağlayan kuruluşu belirtiniz."),
    ("2-6", "Faaliyetler, Değer Zinciri ve Diğer İş İlişkileri", "Sektörünüzü, değer zincirinizi (tedarikçiler, ürün/hizmetler, pazarlar, müşteriler dahil) ve diğer önemli iş ilişkilerinizi tanımlayınız."),
    ("2-7", "Çalışanlar", "Toplam çalışan sayınızı cinsiyet ve bölgeye göre, istihdam türüne (daimi/geçici, tam/yarı zamanlı) göre dağılımıyla birlikte raporlayınız."),
    ("2-8", "Çalışan Olmayan İşçiler", "Şirketiniz için çalışan niteliğinde iş yapan ancak çalışan statüsünde olmayan kişilerin sayısını ve yaptıkları işin niteliğini belirtiniz."),
    ("2-9", "Yönetişim Yapısı ve Bileşimi", "En üst yönetim organınızın yapısını, komitelerini ve bileşimini (bağımsızlık, cinsiyet, yetkinlik dahil) açıklayınız."),
    ("2-10", "En Üst Yönetim Organının Atanması ve Seçimi", "En üst yönetim organı üyelerinin aday gösterilme ve seçilme süreçlerini açıklayınız."),
    ("2-11", "En Üst Yönetim Organının Başkanı", "En üst yönetim organının başkanının aynı zamanda üst düzey yönetici olup olmadığını belirtiniz."),
    ("2-12", "En Üst Yönetim Organının Etki Yönetimindeki Rolü", "En üst yönetim organının, ekonomik/çevresel/sosyal etkilerin yönetimini gözetmedeki rolünü açıklayınız."),
    ("2-13", "Etkilerin Yönetimine İlişkin Sorumluluğun Devri", "Etkilerin yönetimine ilişkin sorumluluğun üst yönetime nasıl devredildiğini ve raporlama sıklığını açıklayınız."),
    ("2-14", "En Üst Yönetim Organının Sürdürülebilirlik Raporlamasındaki Rolü", "En üst yönetim organının sürdürülebilirlik raporunun ve önemli konuların onaylanmasındaki rolünü belirtiniz."),
    ("2-15", "Çıkar Çatışmaları", "En üst yönetim organında çıkar çatışmalarının nasıl önlendiğini ve yönetildiğini açıklayınız."),
    ("2-16", "Kritik Endişelerin İletilmesi", "Kritik endişelerin en üst yönetim organına nasıl iletildiğini ve raporlama döneminde iletilen endişe sayısını belirtiniz."),
    ("2-17", "En Üst Yönetim Organının Kolektif Bilgisi", "En üst yönetim organının sürdürülebilirlik konularındaki bilgi birikimini geliştirmek için alınan önlemleri açıklayınız."),
    ("2-18", "En Üst Yönetim Organının Performans Değerlendirmesi", "En üst yönetim organının sürdürülebilirlik etkilerinin yönetimindeki performansının değerlendirilip değerlendirilmediğini açıklayınız."),
    ("2-19", "Ücretlendirme Politikaları", "En üst yönetim organı ve üst düzey yöneticiler için ücretlendirme politikalarını açıklayınız."),
    ("2-20", "Ücretlendirmenin Belirlenme Süreci", "Ücretlendirmenin belirlenme sürecini ve paydaşların bu sürece katılımını açıklayınız."),
    ("2-21", "Yıllık Toplam Ücretlendirme Oranı", "En yüksek ücretli kişinin yıllık toplam ücretlendirmesinin medyan çalışan ücretlendirmesine oranını belirtiniz."),
    ("2-22", "Sürdürülebilir Kalkınma Stratejisine İlişkin Beyan", "Kuruluşunuzun sürdürülebilir kalkınmaya katkısına ilişkin strateji beyanını üst düzey karar vericiden aktarınız."),
    ("2-23", "Politika Taahhütleri", "Sorumlu iş davranışına ilişkin politika taahhütlerinizi (insan haklarına saygı dahil) açıklayınız."),
    ("2-24", "Politika Taahhütlerinin Uygulanması", "Politika taahhütlerinin faaliyetlere ve iş ilişkilerine nasıl yerleştirildiğini açıklayınız."),
    ("2-25", "Olumsuz Etkileri Giderme Süreçleri", "Olumsuz etkileri gidermeye yönelik taahhütlerinizi ve süreçlerinizi açıklayınız."),
    ("2-26", "Danışma Alma ve Endişe Bildirme Mekanizmaları", "Çalışanların ve paydaşların endişe bildirebileceği ve danışma alabileceği mekanizmaları açıklayınız."),
    ("2-27", "Yasa ve Yönetmeliklere Uyum", "Raporlama döneminde tespit edilen önemli yasa/yönetmelik ihlallerini ve bunların sonuçlarını belirtiniz."),
    ("2-28", "Üyelik Dernekleri", "Üyesi olduğunuz sektör birlikleri, ticaret dernekleri ve diğer savunuculuk kuruluşlarını listeleyiniz."),
    ("2-29", "Paydaş Katılımı Yaklaşımı", "Paydaşlarınızı belirleme ve onlarla etkileşim kurma yaklaşımınızı açıklayınız."),
    ("2-30", "Toplu İş Sözleşmeleri", "Çalışanlarınızın yüzde kaçının toplu iş sözleşmesi kapsamında olduğunu belirtiniz."),
]

GRI3_DISCLOSURES = [
    ("3-1", "Önemlilik Konularının Belirlenmesi Süreci", "Önemli konularınızı belirlemek için kullandığınız süreci (paydaş katılımı dahil) açıklayınız."),
    ("3-2", "Önemli Konular Listesi", "Önemlilik değerlendirmesi sonucu belirlenen önemli konularınızın listesini veriniz."),
    ("3-3", "Önemli Konuların Yönetimi", "Her önemli konu için gerçek ve potansiyel etkilerinizi, bunları yönetme yaklaşımınızı ve etkinliğini açıklayınız."),
]

TOPIC_STANDARDS = {
    "YENI_NESIL_KONU": [
        ("101", "Biyoçeşitlilik 2024", "Biyoçeşitlilik üzerindeki olumlu/olumsuz etkilerinizi, ekosistem dönüşümüne katkınızı ve biyoçeşitliliği koruma yaklaşımınızı açıklayınız."),
        ("102", "İklim Değişikliği 2025", "Sera gazı emisyonlarınızı (Kapsam 1/2/3), iklim geçiş planınızı ve iklim risklerine karşı dayanıklılığınızı açıklayınız."),
        ("103", "Enerji 2025", "Enerji tüketiminizi, enerji yoğunluğunuzu ve enerji verimliliği/yenilenebilir enerji çalışmalarınızı açıklayınız."),
    ],
    "EKONOMIK": [
        ("201", "Ekonomik Performans 2016", "Üretilen ve dağıtılan doğrudan ekonomik değeri, iklim değişikliğinin finansal etkilerini ve tanımlanmış fayda planı yükümlülüklerinizi açıklayınız."),
        ("202", "Pazar Varlığı 2016", "Standart giriş seviyesi ücretinizin yerel asgari ücretle oranını ve üst düzey yönetim atamalarında yerel halktan kişilerin oranını belirtiniz."),
        ("203", "Dolaylı Ekonomik Etkiler 2016", "Altyapı yatırımlarınızı, desteklenen hizmetleri ve toplum/ekonomi üzerindeki önemli dolaylı etkilerinizi açıklayınız."),
        ("204", "Satın Alma Uygulamaları 2016", "Yerel tedarikçilere yapılan harcamaların oranını ve tedarik zincirinizdeki uygulamaları açıklayınız."),
        ("205", "Yolsuzlukla Mücadele 2016", "Yolsuzluk riski değerlendirilen operasyonları, yolsuzlukla mücadele eğitimlerini ve tespit edilen yolsuzluk vakalarını belirtiniz."),
        ("206", "Rekabete Aykırı Davranış 2016", "Rekabete aykırı davranış, tröst ve tekelcilik uygulamaları nedeniyle açılan hukuki işlemleri belirtiniz."),
        ("207", "Vergi 2019", "Vergi yaklaşımınızı, vergi yönetişiminizi ve ülke bazında vergi raporlamanızı açıklayınız."),
    ],
    "CEVRESEL": [
        ("301", "Malzemeler 2016", "Kullanılan malzemelerin ağırlık/hacmini ve geri dönüştürülmüş girdi malzeme oranını belirtiniz."),
        ("302", "Enerji 2016", "Kuruluş içi enerji tüketimini, enerji yoğunluğunu ve enerji tüketiminin azaltılmasına yönelik çalışmaları açıklayınız."),
        ("303", "Su ve Atık Sular 2018", "Su kaynağı olarak ortak kaynak, su çekimi, su deşarjı ve su tüketimini açıklayınız."),
        ("304", "Biyoçeşitlilik 2016", "Korunan alanlarda veya biyoçeşitlilik değeri yüksek alanlarda sahip olunan/kiralanan/işletilen operasyonel sahaları açıklayınız."),
        ("305", "Emisyonlar 2016", "Doğrudan (Kapsam 1), enerji dolaylı (Kapsam 2) ve diğer dolaylı (Kapsam 3) sera gazı emisyonlarınızı açıklayınız."),
        ("306", "Atık Sular ve Atıklar / Atık 2016–2020", "Atık üretimini, atık türüne ve bertaraf yöntemine göre dağılımını ve atık azaltma yaklaşımınızı açıklayınız."),
        ("307", "Çevresel Uyum 2016", "Çevre yasa ve yönetmeliklerine uyumsuzluk nedeniyle ödenen önemli para cezalarını belirtiniz."),
        ("308", "Tedarikçi Çevresel Değerlendirmesi 2016", "Çevresel kriterlere göre taranan yeni tedarikçilerin oranını ve tedarik zincirindeki olumsuz çevresel etkileri açıklayınız."),
    ],
    "SOSYAL": [
        ("401", "İstihdam 2016", "Yeni işe alınan çalışan sayısını, işe alım oranını ve çalışanlara sağlanan yan hakları açıklayınız."),
        ("402", "İşçi-İşveren İlişkileri 2016", "Operasyonel değişikliklerle ilgili asgari bildirim süresini açıklayınız."),
        ("403", "İş Sağlığı ve Güvenliği 2018", "İş sağlığı ve güvenliği yönetim sisteminizi, iş kazası oranlarınızı ve meslek hastalıklarını açıklayınız."),
        ("404", "Eğitim ve Öğretim 2016", "Çalışan başına yıllık ortalama eğitim saatini ve performans/kariyer gelişimi değerlendirme oranını belirtiniz."),
        ("405", "Çeşitlilik ve Fırsat Eşitliği 2016", "Yönetim organı ve çalışanların cinsiyet/yaş/diğer çeşitlilik göstergelerine göre dağılımını açıklayınız."),
        ("406", "Ayrımcılığın Önlenmesi 2016", "Raporlama döneminde tespit edilen ayrımcılık vakalarını ve alınan düzeltici önlemleri belirtiniz."),
        ("407", "Örgütlenme ve Toplu Sözleşme Özgürlüğü 2016", "Örgütlenme özgürlüğünün risk altında olabileceği operasyon ve tedarikçileri açıklayınız."),
        ("408", "Çocuk İşçiliği 2016", "Çocuk işçiliği riski taşıyan operasyon ve tedarikçileri ve alınan önlemleri açıklayınız."),
        ("409", "Zorla veya Zorunlu Çalıştırma 2016", "Zorla veya zorunlu çalıştırma riski taşıyan operasyon ve tedarikçileri açıklayınız."),
        ("410", "Güvenlik Uygulamaları 2016", "İnsan hakları politika/prosedürleri konusunda eğitim almış güvenlik personeli oranını belirtiniz."),
        ("411", "Yerli Halkların Hakları 2016", "Yerli halkların haklarının ihlal edildiği tespit edilen vaka sayısını belirtiniz."),
        ("413", "Yerel Topluluklar 2016", "Yerel topluluk katılımı, etki değerlendirmesi ve gelişim programları uygulanan operasyonları açıklayınız."),
        ("414", "Tedarikçi Sosyal Değerlendirmesi 2016", "Sosyal kriterlere göre taranan yeni tedarikçilerin oranını ve tedarik zincirindeki olumsuz sosyal etkileri açıklayınız."),
        ("415", "Kamu Politikası 2016", "Siyasi katkıların parasal değerini ülke ve alıcıya göre belirtiniz."),
        ("416", "Müşteri Sağlığı ve Güvenliği 2016", "Ürün ve hizmet kategorilerinin sağlık ve güvenlik etkilerinin değerlendirilip değerlendirilmediğini açıklayınız."),
        ("417", "Pazarlama ve Etiketleme 2016", "Ürün ve hizmet bilgisi/etiketleme gereksinimlerini ve pazarlama iletişimiyle ilgili ihlalleri açıklayınız."),
        ("418", "Müşteri Gizliliği 2016", "Müşteri gizliliğinin ihlali ve müşteri verilerinin kaybına ilişkin doğrulanmış şikayetleri belirtiniz."),
    ],
}

CATEGORY_TITLES = {
    "YENI_NESIL_KONU": ("Yeni_Nesil_Konu_Standartlari", "YENİ NESİL KONU STANDARTLARI"),
    "EKONOMIK": ("Ekonomik_Standartlar", "EKONOMİK STANDARTLAR"),
    "CEVRESEL": ("Cevresel_Standartlar", "ÇEVRESEL STANDARTLAR"),
    "SOSYAL": ("Sosyal_Standartlar", "SOSYAL STANDARTLAR"),
}

rows_pages = []
rows_questions = []
page_order = 0
global_numara = 0


def add_page(title):
    global page_order
    page_order += 1
    pid = slug_id("grip-", TEMPLATE_ID, title)
    rows_pages.append((pid, title, page_order))
    return pid


def add_question(page_id, bolum, thematic_group, kod, baslik, soru):
    global global_numara
    global_numara += 1
    qid = slug_id("griq-", TEMPLATE_ID, kod)
    rows_questions.append((qid, page_id, bolum, thematic_group, kod, baslik, soru, global_numara))


# Page 1: Evrensel Standartlar (GRI 1, 2, 3) — built from real uploaded PDF text
p1 = add_page("Evrensel_Standartlar")
add_question(p1, "EVRENSEL STANDARTLAR", "Evrensel_Standartlar", "GRI 1",
             "GRI 1: Foundation 2021 Uyum Beyanı",
             "Bu raporun GRI Standartlarına (GRI 1: Foundation 2021 ilkeleri dahil) uygun olarak hazırlandığını ve raporlama dönemini, kapsamını belirtiniz.")
for kod, baslik, soru in GRI2_DISCLOSURES:
    add_question(p1, "EVRENSEL STANDARTLAR", "Evrensel_Standartlar", f"GRI {kod}", baslik, soru)
for kod, baslik, soru in GRI3_DISCLOSURES:
    add_question(p1, "EVRENSEL STANDARTLAR", "Evrensel_Standartlar", f"GRI {kod}", baslik, soru)

# Remaining category pages — AI-estimated single question per standard
for key, items in TOPIC_STANDARDS.items():
    thematic, bolum = CATEGORY_TITLES[key]
    pid = add_page(thematic)
    for kod, baslik, soru in items:
        add_question(pid, bolum, thematic, f"GRI {kod}", baslik, soru)

assert len(rows_pages) == 5
assert len(rows_questions) == 1 + len(GRI2_DISCLOSURES) + len(GRI3_DISCLOSURES) + sum(len(v) for v in TOPIC_STANDARDS.values())

# --- emit SQL (idempotent: clear this template's existing content first) ---
out = ["BEGIN;"]
out.append(f'DELETE FROM questions WHERE "templateId" = \'{TEMPLATE_ID}\';')
out.append(f'DELETE FROM templatepages WHERE "templateId" = \'{TEMPLATE_ID}\';')

for pid, title, order in rows_pages:
    out.append(
        f"INSERT INTO templatepages (id, \"templateId\", title, \"order\", \"briefText\", \"pageKind\", \"createdAt\", \"updatedAt\") "
        f"VALUES ('{pid}', '{TEMPLATE_ID}', '{esc(title)}', {order}, '', 'customer_question_set', now(), now());"
    )
for qid, page_id, bolum, thematic_group, kod, baslik, soru, numara in rows_questions:
    out.append(
        f"INSERT INTO questions (id, \"templateId\", \"sectorId\", \"pageId\", \"domainIds\", bolum, kod, baslik, soru, "
        f"\"answerFormat\", gri, \"thematicGroup\", numara, \"order\", \"createdAt\", \"updatedAt\") "
        f"VALUES ('{qid}', '{TEMPLATE_ID}', '{SECTOR_ID}', '{page_id}', '[]', '{esc(bolum)}', '{esc(kod)}', '{esc(baslik)}', "
        f"'{esc(soru)}', 'textarea', '{esc(kod)}', '{esc(thematic_group)}', {numara}, {numara - 1}, now(), now());"
    )
out.append("COMMIT;")

with open("/tmp/gri_template_seed.sql", "w") as f:
    f.write("\n".join(out))

print(f"pages={len(rows_pages)} questions={len(rows_questions)}")
print("Wrote /tmp/gri_template_seed.sql")
