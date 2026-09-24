#!/usr/bin/env python3
"""Generate Atamalar ve Görevler workflow documentation as .docx."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.oxml.ns import qn


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "Atamalar_ve_Gorevler_Akisi.docx"


def set_default_font(doc: Document, name: str = "Calibri", size: int = 11) -> None:
    style = doc.styles["Normal"]
    style.font.name = name
    style.font.size = Pt(size)
    style._element.rPr.rFonts.set(qn("w:eastAsia"), name)


def add_title(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(22)
    run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)


def add_subtitle(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.font.size = Pt(11)
    run.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)


def add_h1(doc: Document, text: str) -> None:
    doc.add_heading(text, level=1)


def add_h2(doc: Document, text: str) -> None:
    doc.add_heading(text, level=2)


def add_h3(doc: Document, text: str) -> None:
    doc.add_heading(text, level=3)


def add_para(doc: Document, text: str, bold: bool = False) -> None:
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold


def add_bullets(doc: Document, items: list[str]) -> None:
    for item in items:
        doc.add_paragraph(item, style="List Bullet")


def add_numbered(doc: Document, items: list[str]) -> None:
    for item in items:
        doc.add_paragraph(item, style="List Number")


def add_table(doc: Document, headers: list[str], rows: list[list[str]]) -> None:
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    hdr_cells = table.rows[0].cells
    for i, header in enumerate(headers):
        hdr_cells[i].text = header
        for paragraph in hdr_cells[i].paragraphs:
            for run in paragraph.runs:
                run.bold = True
    for row in rows:
        cells = table.add_row().cells
        for i, value in enumerate(row):
            cells[i].text = value
    doc.add_paragraph()


def build_document() -> Document:
    doc = Document()
    set_default_font(doc)

    today = date.today().strftime("%d.%m.%Y")
    add_title(doc, "VeritasESG")
    add_title(doc, "Atamalar ve Görevler Akışı")
    add_subtitle(doc, f"Teknik ve kullanıcı dokümantasyonu — {today}")
    doc.add_paragraph()

    add_para(
        doc,
        "Bu belge, VeritasESG platformunda proje sorularının kişilere atanması, "
        "açık atama yönetimi, e-posta ile resmî görev iletimi ve "
        "«Atamalar ve Görevler» (#/tasks) sayfasındaki yanıt akışını adım adım açıklar.",
    )
    doc.add_page_break()

    add_h1(doc, "1. Genel Bakış")
    add_para(
        doc,
        "Atama (Assignment), bir projedeki bir veya daha fazla sorunun belirli bir alıcıya "
        "(platform kullanıcısı veya müşteri paydaşı) devredilmesini ifade eder. "
        "Görevler sayfası, alıcıların yanıt vermesi ve yöneticilerin tüm atamaları izlemesi "
        "için merkezi ekrandır.",
    )
    add_bullets(
        doc,
        [
            "Menü yolu: Sol menü → Atamalar ve Görevler (#/admin/tasks)",
            "Proje tarafı: Proje detayı → Formlar / Kullanıcılar ve Atamalar sekmeleri",
            "Alıcı türleri: user (platform kullanıcısı) veya contact (harici paydaş)",
        ],
    )

    add_h2(doc, "1.1 Temel Kavramlar")
    add_table(
        doc,
        ["Kavram", "Açıklama"],
        [
            ["Açık Atama", "Soru kişiye ayrılmış; henüz e-posta gönderilmemiş, deadline yok. Görevler sayfasında görünmez."],
            ["Resmî / Gönderilmiş Atama", "sentAt veya token dolu; alıcıya bildirim gitti veya platformda görev olarak görünür."],
            ["Birleştirme", "Aynı alıcıya ait birden fazla açık atamanın tek görev + e-posta haline getirilmesi."],
            ["Alıcı (recipient)", "recipientId + recipientType ile tanımlanan kişi; isim ve e-posta kullanıcı/paydaş kaydından gelir."],
            ["Atama referansı (REF)", "message alanında YYYYMMDDHHMM-XX-XXXXX formatında otomatik üretilen kod."],
        ],
    )

    add_h1(doc, "2. Atama Türleri ve Durum Mantığı")
    add_h2(doc, "2.1 Açık Atama (Quick Assignment)")
    add_para(
        doc,
        "Danışman, Formlar sekmesinde soru gezerken «Kullanıcıya Açık Atama Yap» ile "
        "soruyu bir platform kullanıcısına önceden ayırır. Bu aşamada alıcı bilgilendirilmez.",
    )
    add_bullets(
        doc,
        [
            "API: POST /api/projects/:projectId/quick-assignment",
            "Oluşturulan kayıt: status=pending, beginDate=şimdi, sentAt yok, deadline yok",
            "message: «Açık atama (email gönderilmedi)»",
            "Aynı soru + aynı alıcı için ikinci açık atama oluşturulamaz",
            "Soru satırında «Açık Atama: {isim}» butonu görünür; üzerine gelindiğinde: "
            "«Bu soruyu şu kişiye ayırdım, ama henüz resmî görev olarak iletmedim.»",
        ],
    )

    add_h2(doc, "2.2 Açık Atama Güncelleme")
    add_para(doc, "Yalnızca açık atamalarda alıcı değiştirilebilir:")
    add_bullets(
        doc,
        [
            "API: PATCH /api/projects/:projectId/quick-assignment/:assignmentId",
            "Koşul: sentAt ve deadline boş olmalı",
            "Gönderilmiş atamalarda alıcı değişikliği bu yolla yapılamaz",
        ],
    )

    add_h2(doc, "2.3 Resmî Atama (E-posta ile Gönderim)")
    add_para(
        doc,
        "Proje → Formlar veya Kullanıcılar/Atamalar üzerinden «Soru Ata» akışı ile "
        "soru(lar), alıcı, başlangıç/bitiş tarihi ve e-posta metni seçilir.",
    )
    add_numbered(
        doc,
        [
            "Alıcı seçilir (platform kullanıcısı veya paydaş)",
            "Soru(lar) işaretlenir",
            "Başlangıç tarihi (beginDate) ve son tarih (deadline) girilir",
            "E-posta konusu/gövdesi özelleştirilir",
            "Kayıt oluşturulur: sentAt=dolu, status=pending",
            "Paydaş (contact) ise JWT magic link üretilir (/api/auth/generate-token)",
            "E-posta /api/email/send-assignment ile gönderilir",
            "Atanan kişi Görevler sayfasında görevi görür veya paydaş linke tıklar",
        ],
    )

    add_h2(doc, "2.4 Açık Atamaları Birleştirme")
    add_para(
        doc,
        "Kullanıcılar/Atamalar sekmesinde «Açık Atamaları Birleştir ve Email Gönder» "
        "ile aynı alıcıya ait açık atamalar tek pakete dönüştürülür.",
    )
    add_bullets(
        doc,
        [
            "API: POST /api/projects/:projectId/merge-assignments",
            "Girdi: assignmentIds[], beginDate, deadline, isteğe bağlı message",
            "Tüm questionIds birleştirilir (tekrarlar elenir)",
            "Yeni atama: sentAt=dolu; eski açık atamalar silinir",
            "Ardından e-posta gönderim adımı tamamlanır",
        ],
    )

    add_h2(doc, "2.5 Gönderilmiş Atama Tanımı (kod)")
    add_para(
        doc,
        "Sistem bir atamanın «link gönderilmiş / resmî» sayılması için şu koşulu kullanır "
        "(src/lib/questionWorkflow.ts → isAssignmentLinkSent):",
    )
    add_bullets(
        doc,
        [
            "sentAt sayısal ve > 0, VEYA",
            "token alanı dolu (paydaş magic link atamaları)",
        ],
    )
    add_para(
        doc,
        "Açık atama: sentAt yok VE deadline yok → Görevler sayfasında listelenmez.",
        bold=True,
    )

    doc.add_page_break()

    add_h1(doc, "3. Veri Modeli (Assignment)")
    add_table(
        doc,
        ["Alan", "Tip / Değer", "Anlam"],
        [
            ["projectId", "string", "Atamanın bağlı olduğu proje"],
            ["recipientId", "string", "PlatformUser.id veya Contact.id"],
            ["recipientType", "user | contact", "Alıcı türü"],
            ["questionIds", "string[]", "Atanan soru kimlikleri"],
            ["beginDate", "timestamp", "Görev başlangıç tarihi"],
            ["deadline", "timestamp", "Son teslim tarihi (açık atamada yok)"],
            ["sentAt", "timestamp", "Resmî gönderim zamanı (açık atamada yok)"],
            ["token / tokenExpiry", "string / date", "Paydaş magic link (contact atamaları)"],
            ["message", "string", "REF kodu veya birleştirme notu"],
            ["assignedBy / assignedByName", "string", "Atamayı yapan danışman"],
            ["status", "pending | completed | overdue", "Görev durumu"],
        ],
    )

    add_h1(doc, "4. Atamalar ve Görevler Sayfası (#/tasks)")
    add_h2(doc, "4.1 Sayfa Bölümleri")
    add_bullets(
        doc,
        [
            "Üst: arama, proje filtresi, durum filtresi (Tüm Bekleyenler, Görevlerim vb.)",
            "Görevlerim (workflow) görünümü: size gönderilmiş resmî atamalar varsa aktif",
            "Yönetici listesi: platform_admin / consultant_manager tüm atamaları kart olarak görür",
        ],
    )

    add_h2(doc, "4.2 Alıcı Bilgisinin Gösterimi")
    add_para(
        doc,
        "Her atama kartında «Gönderen → Alıcı» satırı bulunur. Alıcı adının yanında "
        "e-posta adresi de gösterilir (gri renkte). Örnek:",
    )
    add_para(doc, "Alıcı: Teoman Customeruser3  teoman@ornek.com", bold=True)
    add_bullets(
        doc,
        [
            "E-posta, platformUsers veya contacts kaydından okunur",
            "Kayıtta e-posta yoksa yalnızca isim gösterilir",
            "Paydaş atamalarında «PAYDAŞ» etiketi eklenir",
        ],
    )

    add_h2(doc, "4.3 Kim Ne Görür?")
    add_table(
        doc,
        ["Rol", "Görevlerim", "Tüm atamalar listesi", "Silme"],
        [
            ["platform_admin", "Kendine atanan resmî görevler", "Evet", "Tamamlanan atamalar (koşullu)"],
            ["consultant_manager", "Aynı", "Evet", "Aynı"],
            ["consultant / contributor", "Kendine atanan", "Proje erişimine göre", "Hayır"],
            ["customer / auditor", "Kendine atanan", "Sınırlı / salt okunur", "Hayır"],
            ["Görev-only kullanıcı", "Ana ekran", "Hayır", "Hayır"],
        ],
    )

    add_h2(doc, "4.4 Görevlerim (Workflow) Görünümü")
    add_para(
        doc,
        "Kullanıcıya resmî olarak gönderilmiş atamalar (isAssignmentLinkSent=true ve "
        "recipientId eşleşmesi) proje bazında gruplanır.",
    )
    add_bullets(
        doc,
        [
            "Görünüm modları: «Tüm Soruları Göster» (flat) / «Atamalara Göre Grupla» (grouped)",
            "Sekmeler: Tümü, Bekleyen Sorularım, Yanıt Verildi, Danışman geri gönderdi, Onaylandı",
            "Son aktivite filtresi: Bugün, Dün, Bu hafta, Bu ay",
            "Her atama özeti: REF, atama tarihi, gönderen → alıcı (+ e-posta), soru sayısı",
        ],
    )

    add_h2(doc, "4.5 Yanıt Verme Akışı")
    add_numbered(
        doc,
        [
            "Kullanıcı Görevler sayfasında «Çalışmaya Başla» veya soru satırını açar",
            "Metin / sayı / dosya kanıtı girer; otomatik kayıt yapılır",
            "«AI ile doldur» (Sparkles): Bilgi bankası RAG ile öneri metin doldurur; "
            "«AI ile cevaplanmıştır, lütfen kontrol ediniz ve onaylayiniz» uyarısı eklenir",
            "«Danışmana Gönder» ile atama status=completed olur",
            "Danışman proje ekranında yanıtı inceler, onaylar veya geri gönderir",
        ],
    )

    add_para(
        doc,
        "Yanıt yazma yetkisi: canRespondOnTasksPage — atama tamamlanmamış olmalı ve "
        "oturum açan kullanıcı isAssignmentRecipient ile eşleşmeli (uid, profile.id, contactId).",
    )

    doc.add_page_break()

    add_h1(doc, "5. Proje Tarafı Akış Diyagramı")
    add_para(doc, "Aşağıdaki akış danışman perspektifinden özetlenmiştir:")
    add_numbered(
        doc,
        [
            "Proje oluştur → sorular şablondan klonlanır",
            "Formlar sekmesinde soruları incele",
            "(Opsiyonel) Açık atama: soruyu kişiye ayır, e-posta gönderme",
            "Birden fazla açık atama birikirse → Birleştir ve Email Gönder",
            "VEYA doğrudan Soru Ata modalı ile tek seferde resmî atama + e-posta",
            "Alıcı Görevler sayfasında veya (paydaş ise) e-posta linkinde yanıtlar",
            "Danışman inceleme / onay döngüsü",
        ],
    )

    add_h1(doc, "6. E-posta ve Erişim Linkleri")
    add_h2(doc, "6.1 Platform Kullanıcısı (user)")
    add_bullets(
        doc,
        [
            "E-postada Görevler sayfasına yönlendirme linki gönderilir",
            "Kullanıcı platforma giriş yaparak #/tasks üzerinden yanıtlar",
            "contributor rolünde OTP zorunlu giriş linki kullanılabilir (assignmentAccessLink.ts)",
        ],
    )

    add_h2(doc, "6.2 Paydaş (contact)")
    add_bullets(
        doc,
        [
            "JWT token ile magic link: #/respond/{token}",
            "Token süresi yapılandırılabilir (varsayılan ~7 gün)",
            "Giriş gerektirmez; yanıt contact response olarak audit log'a yazılır",
        ],
    )

    add_h2(doc, "6.3 E-posta CC")
    add_para(
        doc,
        "Atamayı yapan danışman, alıcı e-postasından farklıysa gizli CC olarak eklenir "
        "(assignmentAssignerCcRecipients).",
    )

    add_h1(doc, "7. Atama İptali ve Değişiklik")
    add_table(
        doc,
        ["İşlem", "Nereden", "Koşul"],
        [
            ["Açık atama alıcısını değiştir", "Formlar → Açık Atama modalı", "sentAt ve deadline yok"],
            ["Atamayı sil", "Proje → Kullanıcılar/Atamalar", "Anlamlı yanıt yok; proje admin"],
            ["Tamamlanan atamayı sil", "Görevler sayfası", "platform_admin / consultant_manager"],
            ["Gönderilmiş atamada alıcı değiştir", "Doğrudan desteklenmiyor", "Sil + yeniden ata"],
            ["Sahipsiz atama temizliği", "Görevler → Sahipsizleri Temizle", "Alıcı veya soru yok + completed"],
        ],
    )

    add_h1(doc, "8. Sık Karşılaşılan Durumlar")
    add_h2(doc, "8.1 «Görevlerim» boş görünüyor")
    add_bullets(
        doc,
        [
            "Atama hâlâ açık (e-posta gönderilmemiş) olabilir → Birleştir ve gönder",
            "Giriş yapılan hesap recipientId ile eşleşmiyor olabilir → doğru kullanıcıyla giriş",
            "Atama başka e-posta adresine atanmış olabilir (MongoDB recipientId kontrolü)",
        ],
    )

    add_h2(doc, "8.2 Açık atama Görevler'de görünmüyor")
    add_para(
        doc,
        "Bu beklenen davranıştır. Açık atamalar yalnızca proje Formlar/Kullanıcılar "
        "ekranında yönetilir; resmî gönderim sonrası Görevler'e düşer.",
    )

    add_h2(doc, "8.3 Yanıt kaydedilmiyor")
    add_bullets(
        doc,
        [
            "Atama status=completed ise düzenleme kapanır",
            "Kullanıcı alıcı değilse canRespondOnTasksPage=false",
            "Proje erişimi veya oturum süresi dolmuş olabilir",
        ],
    )

    add_h1(doc, "9. İlgili API Uç Noktaları")
    add_table(
        doc,
        ["Metot", "Uç nokta", "Açıklama"],
        [
            ["POST", "/api/projects/:id/quick-assignment", "Açık atama oluştur"],
            ["PATCH", "/api/projects/:id/quick-assignment/:assignmentId", "Açık atama alıcı güncelle"],
            ["POST", "/api/projects/:id/merge-assignments", "Açık atamaları birleştir"],
            ["POST", "/api/auth/generate-token", "Paydaş magic link token"],
            ["POST", "/api/email/send-assignment", "Atama e-postası gönder"],
            ["POST", "/api/kb-rag/tasks/autofill-answer", "Görev sorusu AI otomatik doldurma"],
            ["GET/POST", "/api/db/assignments", "Atama CRUD (Mongo REST)"],
        ],
    )

    add_h1(doc, "10. İlgili Kaynak Dosyalar")
    add_bullets(
        doc,
        [
            "src/pages/admin/TasksPage.tsx — Görevler ana sayfası",
            "src/components/tasks/TasksMyAssignmentsView.tsx — Görevlerim workflow",
            "src/components/tasks/TasksAssignmentSummaryCard.tsx — Atama özet kartı (alıcı + e-posta)",
            "src/pages/admin/ProjectDetailPage.tsx — Soru ata, birleştirme, açık atama UI",
            "src/components/project/QuickAssignModal.tsx — Açık atama modalı",
            "src/components/project/MergeAssignmentsStep.tsx — Birleştirme adımı",
            "src/lib/questionWorkflow.ts — isAssignmentLinkSent, workflow sekmeleri",
            "src/lib/taskRespondent.ts — Alıcı eşleştirme ve yanıt yetkisi",
            "server.ts — quick-assignment, merge-assignments API",
            "server/models/index.ts — Assignment şeması",
        ],
    )

    add_h1(doc, "11. Sürüm Notu")
    add_para(
        doc,
        f"Bu doküman {today} tarihinde VeritasESG kod tabanından üretilmiştir. "
        "Alıcı satırında e-posta gösterimi, AI ile doldur (RAG) ve açık atama tooltip "
        "metinleri bu sürümde mevcuttur.",
    )

    return doc


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = build_document()
    doc.save(str(OUTPUT))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
