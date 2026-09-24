# VeritasESG Kullanıcı Kılavuzu

VeritasESG, danışmanlık firmaları için geliştirilmiş bir **sürdürülebilirlik ve yönetişim (ESG) raporlama platformudur**. Bu kılavuz, platformu kullanan her rol için ayrı ayrı düzenlenmiştir. Hangi rolde olduğunuzu öğrenip ilgili bölüme geçebilirsiniz.

Bu kılavuz teknik bilgi gerektirmez. Her bölüm, "ne yapabilirsiniz" ve "nasıl yaparsınız" sorularına adım adım yanıt verir.

---

## İçindekiler

1. [Temel Kavramlar ve Terimler](#1-temel-kavramlar-ve-terimler)
2. [Giriş Yapma ve İlk Adımlar](#2-giriş-yapma-ve-ilk-adımlar)
3. [Roller ve Erişim Özeti](#3-roller-ve-erişim-özeti)
4. [Arayüze Genel Bakış (Menü ve Gezinme)](#4-arayüze-genel-bakış-menü-ve-gezinme)
5. [Platform Yöneticisi (Platform Admin)](#5-platform-yöneticisi-platform-admin)
6. [Danışman Yöneticisi (Consultant Manager)](#6-danışman-yöneticisi-consultant-manager)
7. [Danışman (Consultant)](#7-danışman-consultant)
8. [Proje Katılımcısı (Contributor)](#8-proje-katılımcısı-contributor)
9. [Firma Kullanıcısı (Customer)](#9-firma-kullanıcısı-customer)
10. [Denetçi (Auditor)](#10-denetçi-auditor)
11. [Harici Kişiler ve Güvenli Bağlantı (Magic Link)](#11-harici-kişiler-ve-güvenli-bağlantı-magic-link)
12. [Sık Karşılaşılan Sorunlar ve Çözümler](#12-sık-karşılaşılan-sorunlar-ve-çözümler)

---

## 1. Temel Kavramlar ve Terimler

Kılavuz boyunca geçen terimler:

| Terim | Anlamı |
| --- | --- |
| **Firma (Müşteri)** | Adına raporlama yaptığınız müşteri kuruluş. Şube, kişi ve ESG profili bilgilerini barındırır. |
| **Şube (Branch)** | Bir firmanın alt birimi / lokasyonu. |
| **Kişi (Contact)** | Firmadaki, kendisine soru yöneltilebilen bir kişi. Genellikle hesabı olmayan, bağlantıyla yanıt veren dış paydaştır. |
| **Şablon (Template)** | Yeni projelerin oluşturulduğu, sayfalar ve sorulardan oluşan tekrar kullanılabilir anket taslağı. |
| **Sektör (Segment)** | Şablonları sektör/hizmet alanına göre gruplayan kategori. |
| **Proje** | Bir firma için, bir şablondan başlatılan canlı raporlama çalışması. |
| **Soru** | Toplanacak tek bir veri noktası. İki dilli metinler ve tanımlı bir yanıt tipi içerir. |
| **Cevap (Yanıt)** | Bir soruya verilen yanıt; metin, seçim veya yüklenen dosya olabilir. |
| **Atama (Assignment)** | Bir sorunun (veya soru grubunun) yanıtlamaktan sorumlu kişiye bağlanması. |
| **Görev (Task)** | Atanan bir sorunun, sorumlu kullanıcıya **Görevler** sayfasında görünen hali. |
| **Kanıt (Evidence)** | Bir yanıta eklenen destekleyici dosya (belge, görsel). |
| **Bilgi Bankası** | Yapay zeka destekli sohbette referans alınan belge koleksiyonu. |

**Soruların iki dilli alanları** (Türkçe içerik girilirken kullanılan alan adları):

- `baslik` — sorunun başlığı
- `soru` — soru metni
- `ilgiliBirim` — sorumlu birim
- `aciklama` — açıklama / yönerge
- `ornekYanit` — örnek yanıt
- `soruCogaltma` — "şube bazında" çoğaltma. Etkinse, tek bir şablon sorusu projede her şube için bir kez oluşturulur.

---

## 2. Giriş Yapma ve İlk Adımlar

### E-posta ve parola ile giriş
1. Firmanızın verdiği web adresini açın. **Giriş** sayfasına gelirsiniz.
2. **E-posta** ve **Parola** alanlarını doldurup giriş yapın.

### Tek kullanımlık kod (OTP) ile giriş
Henüz parolanız yoksa veya size e-posta ile davet/atama gönderildiyse:
1. Giriş sayfasında kod ile giriş seçeneğini seçin ve **e-postanızı** girin.
2. Kod isteyin. Gelen kutunuza gelen sayısal **kodu** girerek giriş yapın.

> **Not:** Sistemde hiç kullanıcı yoksa, OTP isteyen **ilk** e-posta otomatik olarak **Platform Yöneticisi** olarak kaydedilir. Sonrasında tanınmayan e-postalara güvenlik gereği kod gönderilmez (yanıt yine de "başarılı" görünür).

### Parolayı sıfırlama
Giriş sayfasındaki parola sıfırlama bağlantısını kullanın; e-postanıza gelen güvenli bağlantı ile yeni parola belirleyin.

### Dil seçimi
Platform **Türkçe** ve **İngilizce** destekler. Giriş ekranı dili adres satırına `#/login?lang=tr` eklenerek Türkçeye sabitlenebilir.

---

## 3. Roller ve Erişim Özeti

Platformda altı rol vardır. Rolünüz, hangi menüleri ve işlemleri görebileceğinizi belirler.

| Rol (arayüzde) | İngilizce kod | Kapsam |
| --- | --- | --- |
| **Platform Yöneticisi** | `platform_admin` | Tüm sisteme tam erişim: kullanıcılar, şablonlar, ayarlar, denetim. |
| **Danışman Yöneticisi** | `consultant_manager` | Firmaları yönetir, tüm projeleri oluşturur ve denetler, danışman atar. |
| **Danışman** | `consultant` | Yalnızca kendisine atanan projeler; yanıt toplama, ilerleme takibi, yapay zeka sohbeti. |
| **Proje Katılımcısı** | `contributor` | Atanan projelerde sınırlı düzenleme. Yalnızca **Görevler** ve **Profil** menüleri. |
| **Firma Kullanıcısı** | `customer` | Dış müşteri. Yalnızca kendi firmasına atanan projeleri görür ve yanıt gönderir. |
| **Denetçi** | `auditor` | Salt-okunur. Yalnızca **Projeler** menüsünü görür; düzenleme yapamaz. |

**Menü görünürlüğü özeti** (gerçek erişim mantığına göre):

- **Yönetim** bölümü (Kullanıcılar, Sektörler, Kategoriler, Bilgi Bankası, Denetim, Çeviriler, Ayarlar): yalnızca **Platform Yöneticisi**.
- **Firmalar (yönetim görünümü)**: Platform Yöneticisi ve Danışman Yöneticisi.
- **Firma Dizini, Emisyon, Önemlilik**: Platform Yöneticisi, Danışman Yöneticisi, Danışman. (Firma Dizini, Danışman ve Firma Kullanıcısı için gizlidir.)
- **Proje Katılımcısı**: yalnızca **Görevler** ve **Profil**.
- **Denetçi**: yalnızca **Projeler** (salt-okunur).

---

## 4. Arayüze Genel Bakış (Menü ve Gezinme)

Giriş yaptığınızda sol tarafta bir **kenar çubuğu (menü)** görürsünüz. Menü içeriği rolünüze göre değişir. Olası menü öğeleri:

**Ana menü**
- **Kontrol Paneli** — Genel özet ve hızlı erişim.
- **Firmalar / Firma Dizini** — Müşteri kuruluşların listesi.
- **Projeler** — Raporlama çalışmaları.
- **Görevler** — Size atanan sorular.
- **Önemlilik** — Önemlilik (materiality) analizi.
- **Emisyon Verileri** / **Emisyon Hesaplama** — Karbon verileri ve hesaplama.
- **Yapay Zeka Sohbet** — Bilgi Bankası destekli sohbet.

**Hesabım**
- **Profil** — Ad, avatar ve parola ayarları.

**Yönetim** (yalnızca Platform Yöneticisi)
- **Kullanıcılar, Sektörler, Kategoriler, Bilgi Bankası, Denetim, Çeviriler, Ayarlar.**

Menüyü daraltıp genişletebilir (ok simgesi), masaüstünde kenarından sürükleyerek genişliğini ayarlayabilirsiniz. Mobil cihazda sol üstteki menü simgesinden açılır.

En altta **Çıkış Yap** bulunur.

---

## 5. Platform Yöneticisi (Platform Admin)

Platform Yöneticisi tüm sisteme erişebilir. Aşağıdaki bölümler size özeldir.

### 5.1 Kullanıcı ve İzin Yönetimi
**Yönetim → Kullanıcılar**

Yeni kullanıcı eklemek:
1. **Kullanıcılar** sayfasını açın.
2. **+ (Kullanıcı Ekle / Davet Et)** düğmesine basın.
3. Kullanıcının **e-posta**, **ad** ve **rol** bilgilerini girin (Platform Yöneticisi, Danışman Yöneticisi, Danışman, Proje Katılımcısı, Firma Kullanıcısı veya Denetçi).
4. Firma Kullanıcısı oluşturuyorsanız bağlı olacağı **firmayı** seçin.
5. Kaydedin. Kullanıcı, e-postasıyla OTP veya parola yöntemiyle giriş yapabilir.

Mevcut bir kullanıcıyı yönetmek:
- Listeden kullanıcıyı seçin. Sağda **detay paneli** açılır.
- **Rolünü değiştirebilir**, avatarını güncelleyebilir, parola sıfırlatabilir ve **etkinlik geçmişini** görebilirsiniz.
- Kullanıcıyı bir **projeye ekleyebilirsiniz**: "Projeye Ekle" ile proje ve proje içi rolünü (admin / editor / contributor / auditor) seçin.
- **Rol** ve **arama** filtreleriyle uzun listelerde hızlı bulun.

> **İpucu:** Platform rolü (örn. Danışman) ile proje rolü (örn. editor) ayrı kavramlardır. Platform rolü sistem genelinde, proje rolü tek bir projedeki yetkiyi belirler.

### 5.2 Şablon ve Soru Yönetimi
**Yönetim → (Şablonlar)** ve **Sektörler / Kategoriler**

- Şablonlar, yeni projelerin temelini oluşturur. Bir şablon **sayfalardan**, her sayfa **sorulardan** oluşur.
- Soru oluştururken iki dilli alanları doldurun: `baslik`, `soru`, `ilgiliBirim`, `aciklama`, `ornekYanit`.
- **Şube bazında çoğaltma** (`soruCogaltma`) gereken sorularda etkinleştirin; proje firmasının her şubesi için soru otomatik çoğaltılır.
- Şablonları **Sektörlere** atayarak ilgili projelerde kolay seçilmesini sağlayın.

### 5.3 Sektörler, Kategoriler ve Çeviriler
- **Sektörler** — Şablonları ve firmaları gruplayan sınıflandırma.
- **Kategoriler (Servis Kategorileri)** — Hizmet türü sınıflandırması.
- **Çeviriler** — Arayüzdeki metinlerin Türkçe/İngilizce karşılıklarını yönetin.

### 5.4 Bilgi Bankası
**Yönetim → Bilgi Bankası**
- Belge yükleyerek (KBDocument) yapay zeka sohbetinin referans alacağı içerik koleksiyonu oluşturun.
- Yüklenen belgeler **Yapay Zeka Sohbet** sayfasında yanıtlara kaynak olur.

### 5.5 Denetim Kayıtları
**Yönetim → Denetim**
- Kim hangi işlemi ne zaman yaptı? Kullanıcı oluşturma, yanıt gönderme ve diğer kritik işlemler burada kayıtlıdır.
- Bir cevabın kim tarafından (iç kullanıcı mı, bağlantıyla yanıt veren dış kişi mi) gönderildiği de izlenir.

### 5.6 Ayarlar
**Yönetim → Ayarlar**
- **Platform adı ve logoları** (kare/dikdörtgen).
- **Modül açma/kapama**: Projeler, Görevler, Önemlilik, Emisyon Verileri, Emisyon Hesaplama, Yapay Zeka Sohbet menülerini gizleyip gösterebilirsiniz.
- E-posta ve entegrasyon ayarları.

> **Not:** Bir modülü kapatırsanız ilgili menü tüm kullanıcılarda kaybolur. Yeniden açtığınızda geri gelir.

Platform Yöneticisi ayrıca **Danışman Yöneticisi**nin yapabildiği her şeyi (firma, proje, atama) yapabilir — bkz. Bölüm 6.

---

## 6. Danışman Yöneticisi (Consultant Manager)

Danışman Yöneticisi, müşteri ilişkilerinin ve tüm projelerin sahibidir. Tüm firmaları ve projeleri görür, danışman atar.

### 6.1 Firma (Müşteri) Yönetimi
**Firmalar** (yönetim görünümü) veya **Firma Dizini**

Yeni firma eklemek:
1. **Firmalar** sayfasında **+ (Yeni Firma)** düğmesine basın.
2. Firma adı, sektör/sınıflandırma ve temel bilgileri girin.
3. Kaydedin.

Firma profili içinde:
- **Şubeler (Branch)** ekleyin. Şube bazlı sorular bu şubelere göre çoğaltılır.
- **Kişiler (Contact)** ekleyin: ad, e-posta, görev. Bu kişiler sorulara atanabilir ve kendilerine güvenli bağlantı gönderilebilir.
- Firmanın **ESG profili** ve sınıflandırma bilgilerini güncelleyin.

### 6.2 Önemlilik (Materiality) Analizi
**Önemlilik / Önemlilik Değerlendirmesi (DMA)**

Firma sisteme alındıktan sonra, **proje başlatılmadan önce** önemlilik analizi yapılır. Bu analiz, raporlama çalışmasında hangi konuların işletme ve paydaşlar açısından önemli olduğunu belirler.

**İki seviye önemlilik yönetimi:**

1. **Yönetim Kısmı (Önemlilik Kriterleri Yönetimi)**
   - **Yönetim → Önemlilik** (veya sol menüde bulunuyorsa)
   - Üç raporlama standardı için materiality matrislerini yönetin:
     - **GRI** (Global Reporting Initiative) — 24 materyal konu
     - **ESRS/CRDS** (Avrupa Sürdürülebilirlik Raporlama Standartları) — 57 materyal konu
     - **ISSB (IFRS S1/S2)** (IFRS Sürdürülebilirlik Standartları) — 26 materyal konu
   - Her matrisin konularını görebilir, düzenleyebilir, Excel'e aktarabilirsiniz.

2. **Müşteri Değerlendirmesi (Önemlilik Değerlendirmesi - DMA)**
   - **Önemlilik Değerlendirmesi** sayfası
   - Firma seçip ilgili yıl için GRI/ESRS/ISSB konularını puanlandırın:
     - **Finansal Etki**, **Etki Şiddeti**, **Olasılık**, **Paydaş Endişesi** boyutlarına 1–5 arası puan
     - 4 ve üzeri puan "Önemli (Material)" olarak işaretlenir
   - Sonuç: Firma açısından hangi konuların materyal olduğu belirlenir

**Proje Oluşturmanın Önemlilik ile İlişkisi:**
Proje başlatılırken, önemlilik analizine göre seçilen materiality konuları otomatik olarak soru seti içine dahil edilir. Bu sayede proje, firmanın işletme açısından gerçekten önemli konularına odaklanır.

### 6.3 Önemlilik Anketleri (Paydaş Anketleri)
**Önemlilik Anketleri (sol menü) → firma seç → Yeni Anket**

Çifte önemlilik analizini paydaş katılımıyla derinleştirmek için anket modülü kullanılır. Paydaşlar (çalışanlar, yatırımcılar, tedarikçiler, müşteriler, yerel topluluk) **giriş yapmadan**, mobil uyumlu bir bağlantı üzerinden her konuyu puanlar; sonuçlar gerçek zamanlı olarak önemlilik matrisine dönüşür.

**Anket oluşturma ve yürütme adımları:**

1. **Firma ve anket seçimi** — *Önemlilik Anketleri* sayfasında firmayı seçin, **Yeni Anket** ile bir başlık girin (ör. "2026 Çifte Önemlilik Anketi").
2. **Konular ve IRO'lar (IRO'lar sekmesi)** — Konu uzun listesini **CSV ile içe aktarın** (mevcut önemlilik CSV biçimiyle uyumludur) ve her konu için **IRO** (Etki / Risk / Fırsat) tanımlayın: değer zinciri konumu (kendi operasyonu / yukarı / aşağı akış) ve kutupluluk (olumlu / olumsuz).
3. **Paydaşlar (Paydaşlar sekmesi)** — **Paydaş grupları** oluşturun ve her gruba bir **ağırlık** verin (ör. Yatırımcılar ×2). Paydaşları toplu ekleyin (her satıra "Ad, e-posta").
4. **Davet gönderme** — **Davet Gönder** ile paydaşlara benzersiz, girişsiz anket bağlantıları e-posta ile iletilir; anket "toplama" durumuna geçer.
5. **Hatırlatmalar** — Yanıt vermeyen paydaşlara, ayarlanan aralıklarla (varsayılan 3 ve 7 gün) otomatik hatırlatma gönderilir; yanıt gelince veya son tarih geçince durur.
6. **Sonuçlar (Sonuçlar sekmesi)** — Yanıtlar geldikçe **önemlilik matrisi** (finansal önemlilik × etki önemliliği) ve **puanlama tablosu** güncellenir. Puanlar paydaş grubu ağırlıklarına göre hesaplanır; sonuçları **CSV olarak dışa aktarabilirsiniz**.

**Puanlama:** Her IRO için finansal önemlilik ile etki şiddeti/kapsamı/olasılığı 1–5 (yapılandırılabilir) arası puanlanır. Konu düzeyinde toplulaştırma (maksimum veya ağırlıklı ortalama) ve **önemlilik eşiği** anket ayarlarından belirlenir; eşik değişiklikleri denetim kaydına yazılır.

**Ayarlar sekmesi:** Anket durumu (taslak / toplama / puanlama / tamamlandı), önemlilik eşiği, skala üst sınırı ve konu toplulaştırma yöntemi buradan yönetilir.

> **Not:** Yalnızca Platform Yöneticisi ve Danışman Yöneticisi anket oluşturabilir/düzenleyebilir. Paydaşlar yalnızca kendilerine özel bağlantı ile erişir; hesap gerekmez.

### 6.4 Proje Oluşturma ve Yönetme
**Projeler → + (Yeni Proje)**
1. Projeyi bir **firmaya** bağlayın.
2. Bir **şablon** seçin. Şablondaki sayfalar ve sorular projeye kopyalanır.
3. **Opsiyonel: Önemlilik temelli soru seçimi** — Projeyi oluştururken, ilgili firmanın önemlilik analizine göre filtrele (eğer önemlilik analizi tamamlanmışsa).
4. Şube bazlı sorular varsa, seçilen firmanın şubelerine göre otomatik çoğaltılır.
5. Proje adını ve tarihlerini belirleyip kaydedin.

Proje detay sayfasında yapabilecekleriniz:
- **Sorular / Sayfalar** sekmesinde tüm soruları görüntüleyin.
- **Kullanıcılar** sekmesinde projeye ekip üyesi davet edin ve proje rolü atayın.
- **Atamalar** ile soruları kişilere veya ekip üyelerine atayın.
- **Cevaplar** ve **Yorumlar**ı inceleyin.
- **İlerleme** durumunu takip edin.

### 6.5 Danışman ve Ekip Atama
Proje detayında **Kullanıcılar** sekmesi:
1. **Ekip Üyesi Davet Et** ile bir danışmanı veya katılımcıyı ekleyin.
2. Proje içi rol seçin: **admin**, **editor**, **contributor** veya **auditor**.
3. Davet edilen kişi e-posta ile bilgilendirilir.

### 6.6 Görev Atama ve Takip
**Görevler** sayfası (Danışman Yöneticisi için tüm projeleri ve arama filtresini içerir):
- Soruları sorumlulara atayın.
- Atanmış görevlerin durumunu (bekliyor / yanıtlandı / onaylandı) izleyin.
- Proje ve arama filtreleriyle yük dağılımını görün.

### 6.7 Rapor ve Dışa Aktarma
Proje detayından:
- **Markdown önizleme PDF** olarak rapor çıktısı alın.
- **Gönderimleri ZIP** olarak (yanıtlar + ekli kanıt dosyaları) dışa aktarın.
- Verileri **Excel (XLSX)** ile içe/dışa aktarın.

---

## 7. Danışman (Consultant)

Danışman, **yalnızca kendisine atanan projelerle** çalışır. Tüm firma dizinini veya tüm projeleri görmez; menüsünde **Firma Dizini** gizlidir.

### 7.1 Atanan Projeleri Görme
- **Projeler** menüsünde yalnızca üyesi olduğunuz projeler listelenir.
- Bir projeyi açarak sorularını, atamalarını ve cevaplarını görürsünüz.

### 7.2 Yanıt (Cevap) Toplama
Proje içinde:
1. İlgili **soruyu** açın.
2. Yanıtı doğrudan girin veya gerekli **kanıt dosyasını** yükleyin.
3. Kaydedin. Yanıt sürümleri (AnswerVersion) saklanır; geçmiş değişiklikler kaybolmaz.

Sorumlu kişi firma dışındaysa, ona **güvenli bağlantı** göndererek hesap açmadan yanıt vermesini sağlayabilirsiniz (bkz. Bölüm 11).

### 7.3 Soru ve Yorumlar
- Her soruda **yorum (CommentMessage)** alanı vardır. Ekip içi notlar ve müşteriyle yazışma buradan yürütülür.
- Eksik veya revizyon gereken yanıtlar için yorum bırakın.

### 7.4 Görevler ve İlerleme
**Görevler** menüsünde size atanan tüm sorular tek listede toplanır. Durumlarını güncelleyerek ilerlemeyi takip edin.

### 7.5 Yapay Zeka Sohbet (Bilgi Bankası)
**Yapay Zeka Sohbet** menüsü:
- ESG/raporlama sorularınızı doğal dilde sorun.
- Yanıtlar, yöneticinin yüklediği **Bilgi Bankası** belgelerinden referansla üretilir.
- Standartlar, örnek metinler ve metodoloji hakkında destek almak için kullanın.

> **Not:** Yapay zeka sohbeti, anahtar tanımlı değilse kullanılamayabilir. Menü görünmüyorsa modül yöneticiniz tarafından kapatılmış olabilir.

### 7.6 Emisyon ve Önemlilik
Danışman; **Emisyon Verileri**, **Emisyon Hesaplama** ve **Önemlilik** modüllerini (açıksa) kullanabilir. Bu modüller karbon verisi girişi ve önemlilik analizi içindir.

---

## 8. Proje Katılımcısı (Contributor)

Proje Katılımcısı, en sade arayüze sahiptir: yalnızca **Görevler** ve **Profil** menülerini görür.

### Yapabilecekleriniz
1. **Görevler** menüsünü açın. Size atanan tüm sorular burada listelenir.
2. Bir görevi açın, **yanıtı girin** veya **kanıt yükleyin**, kaydedin.
3. Gerekirse soruya **yorum** ekleyin.

### Sınırlamalar
- Proje oluşturamaz, firma yönetemez, başkalarına görev atayamazsınız.
- Yalnızca size açıkça atanmış sorulara erişebilirsiniz.

> **İpucu:** Genellikle atama e-postasındaki bağlantıdan OTP ile giriş yaparsınız. Görev görünmüyorsa, atamanın yapıldığından emin olmak için danışmanınıza ulaşın.

---

## 9. Firma Kullanıcısı (Customer)

Firma Kullanıcısı, müşteri kuruluştaki bir kişidir ve **yalnızca kendi firmasına ait projeleri** görür.

### Görünürlük
- Yalnızca sizin firmanıza bağlı projeler listelenir; başka firmaların verilerine erişemezsiniz.
- **Firma Dizini** menüsü sizde gizlidir.
- Bir projede **admin** veya **editor** rolünüz varsa daha geniş gezinme açılır; aksi halde yalnızca **Görevler** ve **Profil** görürsünüz.

### Yanıt Gönderme
1. **Projeler** (veya **Görevler**) üzerinden firmanıza atanmış soruları açın.
2. İstenen yanıtı girin, gereken **belgeleri/kanıtları** yükleyin.
3. Kaydedin. Danışmanınız yanıtınızı inceleyip yorum bırakabilir.

### İlerleme ve Yorumlar
- Projedeki kalan soruları ve tamamlanma durumunu görebilirsiniz.
- Danışmanın bıraktığı **yorumları** okuyup yanıtlayarak revizyonları tamamlayın.

> **Not:** Birçok dış paydaş, hiç hesap açmadan **güvenli bağlantı (magic link)** ile yanıt verir (bkz. Bölüm 11). Firma Kullanıcısı hesabı ise, projelerinizi düzenli takip etmek istediğinizde verilir.

---

## 10. Denetçi (Auditor)

Denetçi rolü **salt-okunurdur**. Amacı, projeleri ve yanıtları gözden geçirmek; hiçbir veriyi değiştirememektir.

### Görünürlük
- Menüde yalnızca **Projeler** görünür.
- Proje içindeki **soruları, cevapları ve yorumları** okuyabilirsiniz.
- Yanıt giremez, atama yapamaz, hiçbir alanı düzenleyemezsiniz.

### Tipik Kullanım
- Tamamlanmış veya devam eden bir raporlama çalışmasının doğruluğunu denetlemek.
- Cevapların kanıtlarla desteklenip desteklenmediğini kontrol etmek.
- Bağımsız gözetim ve uyum kontrolü.

> **İpucu:** Bir alanı düzenleyemiyorsanız bu bir hata değildir — denetçi rolü tasarımı gereği değişiklik yapamaz. Düzenleme gerekiyorsa Danışman veya Danışman Yöneticisine iletin.

---

## 11. Harici Kişiler ve Güvenli Bağlantı (Magic Link)

Firmadaki birçok kişi hesap açmadan yanıt verebilir. Danışmanlar, bir soruyu/anketi bu kişilere e-posta ile **güvenli bağlantı** göndererek iletir.

### Danışman / Danışman Yöneticisi tarafında
1. Proje detayında ilgili soruyu/atamayı açın ve **kişiye gönder** seçeneğini kullanın.
2. Sistem benzersiz bir **güvenli bağlantı** üretir (varsayılan geçerlilik **7 gün**).
3. Bağlantı kişinin e-postasına gönderilir; isterseniz **panoya kopyalayıp** kendiniz iletebilirsiniz.

### Harici kişi (Contact) tarafında
1. E-postadaki bağlantıya tıklar — giriş/parola gerekmez.
2. Açılan formda soruları görür, yanıtlarını yazar ve gerekli **belgeleri yükler**.
3. Gönder dediğinde yanıt projeye işlenir ve "kişi yanıtı" olarak kaydedilir (kim gönderdiyse denetim kaydında tutulur).

> **Bağlantı süresi dolduysa:** "Bağlantı Süresi Dolmuş veya Geçersiz" uyarısı görürsünüz. Danışmandan yeni bir bağlantı talep edin.

> **Önemlilik anketleri:** Paydaşlara gönderilen önemlilik anketi bağlantıları da aynı mantıkla çalışır (girişsiz, mobil uyumlu). Paydaş bağlantıyı açar, her konuyu 1–5 arası puanlar ve **Kaydet / Gönder** ile yanıtlar; yanıt gelene ya da son tarih geçene kadar otomatik hatırlatma gönderilir. Ayrıntı için bkz. **6.3 Önemlilik Anketleri**.

---

## 12. Sık Karşılaşılan Sorunlar ve Çözümler

| Sorun | Olası Neden / Çözüm |
| --- | --- |
| **Giriş yapamıyorum** | Parolayı sıfırlayın veya OTP ile girin. Tanınmayan e-postalara kod gönderilmez; doğru e-postayı kullandığınızdan emin olun. |
| **Beklediğim menüler yok** | Menüler role göre değişir. Örn. Yönetim menüleri yalnızca Platform Yöneticisinde; Firma Dizini Danışman ve Firma Kullanıcısında gizlidir. |
| **Bir modül (Görevler/Emisyon vb.) hiç görünmüyor** | İlgili modül **Ayarlar**'dan kapatılmış olabilir. Platform Yöneticisine başvurun. |
| **Görevlerim boş** | Size henüz soru atanmamış olabilir. Atama için danışmanınıza ulaşın. |
| **Bir alanı düzenleyemiyorum** | Denetçiyseniz bu normaldir (salt-okunur). Diğer rollerde, ilgili projede yeterli proje rolünüz olmayabilir. |
| **Güvenli bağlantı çalışmıyor** | Süresi dolmuş olabilir (varsayılan 7 gün). Yeni bağlantı isteyin. |
| **Anket bağlantısı açılmıyor / "Anket kapandı"** | Anket "toplama" durumunda değilse veya tamamlandı/son tarihi geçtiyse yanıt alınmaz. Danışmandan anketin durumunu kontrol etmesini isteyin. |
| **Anket sonuçları / matris boş** | Matris yanıtlar geldikçe oluşur. Henüz yeterli paydaş yanıtı yoksa boş görünür; davet ve hatırlatmaların gittiğinden emin olun. |
| **Yapay Zeka Sohbet yanıt vermiyor** | Yapay zeka anahtarı tanımlı olmayabilir veya modül kapalı olabilir. Yöneticinize danışın. |
| **Şube soruları eksik/yanlış** | Şube bazlı çoğaltma firma şubelerine bağlıdır. Firma profilinde şubelerin doğru tanımlı olduğundan emin olun; gerekirse danışman/yönetici çoğaltmayı yeniler. |
| **Yüklediğim büyük görsel kaydedilmedi** | Çok büyük dosyalar için depolama (S3/MinIO) yapılandırması gerekir. Sorun sürerse yöneticinize bildirin. |
| **Yanlış dil görüyorum** | Giriş ekranında dil `#/login?lang=tr` ile Türkçeye sabitlenebilir; uygulama içi çeviriler **Çeviriler** sayfasından yönetilir. |

---

Sorularınız için firmanızın platform yöneticisine başvurabilirsiniz. Bu kılavuz, platformun mevcut sürümüne göre hazırlanmıştır; arayüzde küçük farklılıklar görebilirsiniz.
