/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Platform rehberi — roller, özellikler ve yenilikler (adım adım).
 * Route: #/platform
 */

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
} from 'lucide-react';
import { cn } from '../../lib/utils';

type Step = {
  id: string;
  title: string;
  subtitle: string;
  /** Displayed chapter label (TOC + step counter). Role detail steps are
   * sub-items of "2. Altı platform rolü" (2.a…2.f), so later chapters
   * continue the flat sequence from 3 rather than from array index. */
  stepNumber: string;
};

const STEPS: Step[] = [
  { id: 'welcome', title: 'Hoş geldiniz', subtitle: 'Bu rehberde neler var', stepNumber: '1' },
  { id: 'roles-map', title: 'Altı platform rolü', subtitle: 'Kim ne yapabilir — özet tablo', stepNumber: '2' },
  { id: 'role-admin', title: 'Platform Yöneticisi', subtitle: 'Platform temelini kurar', stepNumber: '2.a' },
  { id: 'role-manager', title: 'Danışman Yöneticisi', subtitle: 'Firmaları ve portföyü yönetir', stepNumber: '2.b' },
  { id: 'role-consultant', title: 'Danışman', subtitle: 'Atandığı projeleri yürütür', stepNumber: '2.c' },
  { id: 'role-contributor', title: 'Katılımcı', subtitle: 'Yalnızca atanan işleri tamamlar', stepNumber: '2.d' },
  { id: 'role-customer', title: 'Firma Kullanıcısı', subtitle: 'Müşteri portal erişimi', stepNumber: '2.e' },
  { id: 'role-auditor', title: 'Denetçi', subtitle: 'Salt okunur güvence incelemesi', stepNumber: '2.f' },
  { id: 'project-roles', title: 'Proje rolleri', subtitle: 'Admin · Editor · Katılımcı · Denetçi', stepNumber: '3' },
  { id: 'features-core', title: 'Temel özellikler', subtitle: 'Firmalar → şablonlar → projeler', stepNumber: '4' },
  { id: 'features-collect', title: 'Veri toplama', subtitle: 'Formlar, atamalar, görevler, sihirli bağlantılar', stepNumber: '5' },
  { id: 'features-advanced', title: 'İleri modüller', subtitle: 'Önemlilik, anketler, emisyon, yapay zeka', stepNumber: '6' },
  { id: 'workflow', title: 'Uçtan uca iş akışı', subtitle: 'Firma kurulumundan arşive', stepNumber: '7' },
  { id: 'whats-new', title: 'Yenilikler', subtitle: 'Son ürün ve platform değişiklikleri', stepNumber: '8' },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold tracking-tight text-slate-900">{children}</h2>;
}

function SectionLead({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>;
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    info: 'border-blue-200 bg-blue-50/80 text-blue-950',
    warning: 'border-amber-200 bg-amber-50/80 text-amber-950',
    danger: 'border-red-200 bg-red-50/80 text-red-950',
    success: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
  };
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', tones[tone])}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 leading-relaxed opacity-90">{children}</div>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-slate-700">
                  {j === 1 && headers[1]?.toLowerCase().includes('kod') ? (
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-800">
                      {cell}
                    </code>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="mt-4 space-y-2.5">
      {items.map((item, i) => (
        <li key={item} className="flex gap-3 text-sm text-slate-700">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
            {i + 1}
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function StepWelcome() {
  return (
    <div className="space-y-5">
      <SectionTitle>VeritasESG — roller ve özellikler rehberi</SectionTitle>
      <SectionLead>
        VeritasESG, danışmanlık firmaları için sürdürülebilirlik ve yönetişim
        raporlama platformudur. Döngünün tamamını kapsar: firma dizini → sektör
        şablonları → raporlama projeleri → yapılandırılmış veri toplama → inceleme,
        önemlilik ve isteğe bağlı yapay zeka destekli bilgi sohbeti.
      </SectionLead>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { v: '6', l: 'Platform rolü' },
          { v: '4', l: 'Proje ekibi rolü' },
          { v: 'TR / EN', l: 'Arayüz dilleri' },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-2xl font-bold text-slate-900">{s.v}</p>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {s.l}
            </p>
          </div>
        ))}
      </div>
      <Callout tone="info" title="Bu sunumu nasıl kullanırsınız">
        Adım adım İleri / Geri ile ilerleyin veya soldaki içindekilerden atlayın.
        Her bölüm; oryantasyon, demo veya eğitim için bağımsız bir brifingdir.
      </Callout>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Gündem
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
          <li>1–2 · Platform amacı ve rol haritası</li>
          <li>2.a–2.f · Her platform rolü için ayrıntılı anlatım</li>
          <li>3 · Proje düzeyindeki roller</li>
          <li>4–6 · Özellik turu (temel → toplama → ileri)</li>
          <li>7 · Önerilen uçtan uca iş akışı</li>
          <li>8 · Yenilikler</li>
        </ul>
      </div>
    </div>
  );
}

function StepRolesMap() {
  return (
    <div className="space-y-5">
      <SectionTitle>Altı platform rolü — özet</SectionTitle>
      <SectionLead>
        Platform rolü kullanıcı hesabında (Kullanıcılar yönetimi) tanımlanır.
        Kenar çubuğu menülerini ve küresel yetkileri belirler. Proje rolü bir iş
        içindeki yetkiyi ayrıca sınırlar.
      </SectionLead>
      <SimpleTable
        headers={['Rol', 'Kod', 'Tipik kullanıcı', 'Yapabilir', 'Yapamaz']}
        rows={[
          [
            'Platform Yöneticisi',
            'platform_admin',
            'BT / ürün sahibi / lider ortak',
            'Tam erişim: kullanıcılar, ayarlar, sektörler, şablonlar, bilgi bankası, denetim, tüm firmalar ve projeler',
            '—',
          ],
          [
            'Danışman Yöneticisi',
            'consultant_manager',
            'Proje / pratik lideri',
            'Firmaları ve kişileri yönetir; tüm projeleri görür; ekip ve proje ayarlarını düzenler',
            'Platform kullanıcıları, sektörler, bilgi bankası, çeviriler, genel ayarlar, denetim günlüğü',
          ],
          [
            'Danışman',
            'consultant',
            'Analist / teslim danışmanı',
            'Atandığı projeler, formlar, görevler, atamalar; açıksa önemlilik ve emisyon',
            'Küresel firma kayıt yönetimi, platform yönetim menüleri',
          ],
          [
            'Katılımcı',
            'contributor',
            'Sınırlı dahili katılımcı',
            'Görevler + Profil; ait olduğu projelerde atanan soruları yanıtlar',
            'Firma yönetimi, şablonlar, yönetim, geniş proje kataloğu',
          ],
          [
            'Firma Kullanıcısı',
            'customer',
            'Giriş hesabı olan müşteri çalışanı',
            'Atandığı projeler/görevler; yükseltilmiş proje rolü daha geniş portal menüsü açar',
            'Diğer firmaların verisi; yönetim menüleri; küresel şablon oluşturma',
          ],
          [
            'Denetçi',
            'auditor',
            'İç veya dış güvence',
            'Projeleri okur; formları ve aktiviteyi düzenlemeden inceler',
            'Oluşturma, düzenleme, silme, atama, gönderme veya ayar değiştirme',
          ],
        ]}
      />
      <Callout tone="warning" title="Menü kısayolları">
        Katılımcılar Görevler + Profil odaklıdır. Denetçiler Projeler menüsünü
        (salt okunur) görür. Yükseltilmiş proje üyeliği olmayan firma
        kullanıcıları da benzer şekilde sınırlıdır.
      </Callout>
    </div>
  );
}

function StepRoleAdmin() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SectionTitle>Platform Yöneticisi</SectionTitle>
        <code className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-mono text-white">
          platform_admin
        </code>
      </div>
      <SectionLead>
        Firmanın örneğinin tam işletmecisidir. Teslim ekipleri müşteri işine
        başlamadan temelleri kurar.
      </SectionLead>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Adım adım sorumluluklar
      </h3>
      <NumberedList
        items={[
          'Giriş yapın → Profil’de rolünüzü doğrulayın.',
          'Ayarlar: marka, yardım videoları, raporlama alanları, modül aç/kapa (Projeler, Görevler, Önemlilik, Emisyon, Yapay Zeka Sohbet).',
          'Kullanıcılar: hesap oluşturun; altı rolden birini atayın; erişim / şifre desteği verin.',
          'Sektörler ve Hizmet kategorileri: sektör / hizmet hatlarını tanımlayın; raporlama şablonlarını (verisetlerini) bağlayın.',
          'Şablonlar: sayfalar + sorular (Veriseti / Sayfalar / Toplu işlemler); XLSX içe-dışa aktarım.',
          'Bilgi bankası: Yapay Zeka Sohbet’i besleyen metodoloji belgelerini yükleyin.',
          'Çeviriler: TR/EN arayüz metinlerini yönetin.',
          'Denetim: hassas platform eylemlerini gözden geçirin.',
          'Önemlilik Yönetimi: firma için önemlilik ölçütleri / DMA araçlarını tasarlayın.',
        ]}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Açık menüler
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Kontrol Paneli, Firmalar, Projeler, Görevler, Önemlilik, Önemlilik
            Anketleri, Emisyon, Yapay Zeka Sohbet, Kullanıcılar, Sektörler,
            Kategoriler, Bilgi Bankası, Önemlilik Tasarımı, Denetim, Çeviriler,
            Ayarlar, Profil
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Başarı göstergesi
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Yöneticiler, mühendislikten veri modeli düzeltmesi istemeden doğru
            sektör şablonlarından firma oluşturup proje başlatabilir.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepRoleManager() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SectionTitle>Danışman Yöneticisi</SectionTitle>
        <code className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-mono text-white">
          consultant_manager
        </code>
      </div>
      <SectionLead>
        Portföy sahibidir: resmi firma kaydını yönetir ve tüm projeleri görüp
        yürütebilir.
      </SectionLead>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Adım adım günlük akış
      </h3>
      <NumberedList
        items={[
          'Firmalar (yönetim): tüzel kişiyi kaydedin; sektörler, coğrafyalar, sürdürülebilirlik / raporlama çerçeveleri, NACE ve SASB sınıflandırması.',
          'Firma profilini açın → paydaşları (kişiler) ve şubeleri ekleyin.',
          'Firma veya Projeler’den raporlama projesi başlatın → şablon/veriseti, tarihler, durum seçin.',
          'Proje Kullanıcıları: danışman / firma kullanıcılarını proje rolleriyle ekleyin.',
          'Atama kurallarını (tek / çok alıcı), alanları ve yardım videosunu yapılandırın.',
          'Projeler arası Görevler’i izleyin; geciken atamaları / hatırlatmaları yükseltin.',
          'Açıksa Önceliklendirme / Anket modüllerini kullanın.',
        ]}
      />
      <Callout tone="info" title="Platform Yöneticisi sınırı">
        Yöneticiler sektör/şablon yapılandırmaz, platform genelinde kullanıcı
        davet etmez, bilgi bankasını düzenlemez; Denetim / Ayarlar / Çeviriler
        menülerini görmez.
      </Callout>
    </div>
  );
}

function StepRoleConsultant() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SectionTitle>Danışman</SectionTitle>
        <code className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-mono text-white">
          consultant
        </code>
      </div>
      <SectionLead>
        Teslim rolüdür; atandığı projelerle sınırlıdır (küresel firma yönetim
        listesi yok; firma dizini de bu rol için gizlidir).
      </SectionLead>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Adım adım proje çalışması
      </h3>
      <NumberedList
        items={[
          'Kontrol Paneli / Projeler → atandığınız işi açın.',
          'Genel bakış: ilerleme kartlarını kontrol edin (formlar, atamalar, kullanıcılar).',
          'Formlar: sayfa bazında yanıtları inceleyin; onaylayın / değişiklik isteyin; izinliyse kişi adına gönderin (Aktivite’de kayıtlı).',
          'Kullanıcılar ve atamalar: soruları seçin, kişilere veya kullanıcılara atayın, son tarih koyun, güvenli e-posta bağlantısını önizleyin/gönderin (çift gönderim korumalı).',
          'Plan: toplama dalgalarını planlayın.',
          'Aktivite: denetim soruları için kişi / ay filtresi kullanın.',
          'Görevler: kendi bekleyen işlerinizi yapın; paydaş görevlerini izleyin.',
          'İsteğe bağlı: Yapay Zeka Sohbet, Emisyon, Önemlilik görünümleri.',
        ]}
      />
    </div>
  );
}

function StepRoleContributor() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SectionTitle>Katılımcı (Contributor)</SectionTitle>
        <code className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-mono text-white">
          contributor
        </code>
      </div>
      <SectionLead>
        Yalnızca atanan anket işlerini tamamlaması gereken kişiler için dar
        dahili roldür. Kenar çubuğu bilerek sadedir.
      </SectionLead>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Görünen menü
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>Kontrol Paneli</li>
            <li>Görevler</li>
            <li>Profil</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Adım adım
          </p>
          <NumberedList
            items={[
              'Giriş yapın (şifre veya atama e-postasındaki OTP).',
              'Görevler → bekleyen atamalarınızı açın.',
              'Soruları yanıtlayın; gerekirse kanıt ekleyin.',
              'Danışmana gönderin; aşama kapanana kadar tekrar düzenleyebilirsiniz.',
            ]}
          />
        </div>
      </div>
      <Callout tone="warning" title="Proje “katılımcı” rolüyle karıştırmayın">
        Platformdaki <strong>Katılımcı</strong> rolü menüleri sınırlar. Proje
        içindeki <strong>katılımcı</strong> rolü düzenleme yetkisini sınırlar.
        İkisi farklı katmanlardır.
      </Callout>
    </div>
  );
}

function StepRoleCustomer() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SectionTitle>Firma Kullanıcısı (Customer)</SectionTitle>
        <code className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-mono text-white">
          customer
        </code>
      </div>
      <SectionLead>
        Giriş hesabı olan müşteri çalışanıdır; kendi firmasına bağlıdır. Yalnızca
        e-posta bağlantısı kullanan paydaş kişiden farklıdır.
      </SectionLead>
      <SimpleTable
        headers={['Durum', 'Ne görür', 'Ne yapmalı']}
        rows={[
          [
            'Yükseltilmiş proje rolü yok',
            'Görevler + Profil tarzı erişim',
            'Yalnızca atanan görevleri tamamlar',
          ],
          [
            '≥1 projede admin veya editor',
            'Daha geniş portal (projeler + ilgili menü)',
            'Formlarda çalışır / kendi işlerinde iş birliği yapar',
          ],
          [
            'Girişsiz paydaş',
            'Jetonlu atama / anket sayfaları',
            'E-posta bağlantısını kullanır — hesap gerekmez',
          ],
        ]}
      />
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Firma kullanıcısı için adım adım
      </h3>
      <NumberedList
        items={[
          'Danışmanlıktan davet / şifre alın.',
          'Giriş yapın → atanan Projeler veya Görevler’i açın.',
          'Yalnızca kendi firmanızın formlarını doldurun.',
          'Son tarihleri izleyin; hatırlatmalara yanıt verin.',
        ]}
      />
    </div>
  );
}

function StepRoleAuditor() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SectionTitle>Denetçi (Auditor)</SectionTitle>
        <code className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-mono text-white">
          auditor
        </code>
      </div>
      <SectionLead>
        Güvence odaklı, salt okunur roldür. Platform denetçileri öncelikle
        Projeler’i görür; düzenleme kontrolleri gizlenir veya devre dışıdır.
      </SectionLead>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Adım adım inceleme
      </h3>
      <NumberedList
        items={[
          'Giriş yapın → Projeler.',
          'İşi açın → durum için Genel bakış.',
          'Formlar: yanıtları, rehberi, gönderim geçmişini okuyun — kaydet/ata yok.',
          'Aktivite: kim neyi ne zaman değiştirdiğini yeniden kurun.',
          'İsteğe bağlı: tek bir işte aynı davranış için proje düzeyinde denetçi rolü.',
        ]}
      />
      <Callout tone="danger" title="Katı kural">
        Denetçiler yanıtları, atamaları, kullanıcıları veya ayarları
        değiştirememelidir. Düzenleme gerekiyorsa rolü değiştirin — salt okunur
        arayüzü aşmaya çalışmayın.
      </Callout>
    </div>
  );
}

function StepProjectRoles() {
  return (
    <div className="space-y-5">
      <SectionTitle>Proje ekibi rolleri</SectionTitle>
      <SectionLead>
        Platform kullanıcısı projeye eklenirken (Kullanıcılar sekmesi) seçilir.
        Platform rolünden bağımsızdır — örneğin bir Firma Kullanıcısı yalnızca bir
        işte Proje Editörü olabilir.
      </SectionLead>
      <SimpleTable
        headers={['Proje rolü', 'Amaç', 'Tipik yetkiler']}
        rows={[
          [
            'admin',
            'O projede iş lideri',
            'Ayarlar, ekip, atamalar, hassas işlemler',
          ],
          [
            'editor',
            'Günlük teslim',
            'Formlar, yanıtlar, yorumlar, çoğu içerik düzenlemesi',
          ],
          [
            'contributor',
            'Sınırlı katılımcı',
            'İzinli maddelerde yanıt / yorum (eski viewer buraya map edilir)',
          ],
          [
            'auditor',
            'Proje kapsamlı güvence',
            'Her şeyi görür; hiçbir şeyi değiştirmez',
          ],
        ]}
      />
      <Callout tone="info" title="İki katman nasıl birleşir">
        Platform rolü küresel menüleri belirler. Proje rolü tek proje içindeki
        değiştirme haklarını belirler. İşini bitirmesine yetecek en düşük yetkiyi
        verin.
      </Callout>
    </div>
  );
}

function StepFeaturesCore() {
  return (
    <div className="space-y-5">
      <SectionTitle>Temel özellikler — kurulum katmanı</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          {
            t: 'Firmalar ve sınıflandırma',
            items: [
              'Tüzel kişiler, paydaşlar, şubeler, logolar, coğrafyalar, markalar, çalışan kırılımları.',
              'Raporlama çerçeveleri / ESG sekmeleri — "Raporlama" sekmesinde CSRD (AB) kapsam kontrolüne ek olarak TSRS (Türkiye) eşikleri de referans olarak gösterilir: >500M TL varlık / >1 milyar TL ciro / >250 çalışan (2\'si), tüm bankalar, ilk dönem 2024, denetim 2026.',
              'NACE ve SASB alanları birbirini önerir.',
              'Dizin gezintisi ile yönetim Firmalar listesi (role göre).',
            ],
          },
          {
            t: 'Sektörler ve şablonlar',
            items: [
              'Müşteri sektörleri ve hizmet kategorileri verisetlerini gruplar.',
              'Şablon çalışma alanı: Veriseti, Sayfalar, Toplu işlemler.',
              'Sayfa türleri: firma / denetim soru seti; Excel içe-dışa aktarım; şube çoğaltma.',
              'Sayfalar sıralı listelenir ve soru sayıları görünür.',
            ],
          },
          {
            t: 'Projeler',
            items: [
              'Şablon sayfa/sorularını bir müşteri için raporlama döngüsüne kopyalar.',
              'Durum: aktif / kapalı / arşiv; oluştururken isteğe bağlı şablon.',
              'Sekmeler: Genel bakış, Formlar, Kullanıcılar ve atamalar, Plan, Aktivite.',
            ],
          },
          {
            t: 'Kimlik doğrulama ve profil',
            items: [
              'E-posta/şifre veya e-posta ile tek kullanımlık kod.',
              'Şifre sıfırlama; ilk kullanıcı otomatik platform yöneticisi.',
              'Profil: rol, projeler, son aktiviteler.',
            ],
          },
        ].map((card) => (
          <div
            key={card.t}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="font-semibold text-slate-900">{card.t}</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate-600">
              {card.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepFeaturesCollect() {
  return (
    <div className="space-y-5">
      <SectionTitle>Veri toplama — operasyon katmanı</SectionTitle>
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-900">Formlar</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Sayfa gruplu anketler; rehber, örnekler, gönderim geçmişi, onaylar ve
            kişi adına gönderme (denetim kayıtlı).
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-900">
            Atamalar ve sihirli bağlantılar
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate-600">
            <li>
              Soru setlerini platform kullanıcılarına veya firma kişilerine son
              tarihle atayın.
            </li>
            <li>
              Kişiler güvenli e-posta bağlantısını açar (hesap gerekmez), yanıtlar,
              kanıt ekler, danışmana gönderir.
            </li>
            <li>
              Aynı atamanın yanlışlıkla iki kez gönderilmesi engellenir; hatırlatmalar
              kaydedilip yeniden gönderilebilir.
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-900">Görevler</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Projeler arası iş kuyruğu. Yöneticiler daha zengin filtreler görür;
            katılımcılar / sınırlı firma kullanıcıları günlük işlerini burada
            yapar. Açıksa aciliyet / onay akışlarını destekler.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepFeaturesAdvanced() {
  return (
    <div className="space-y-5">
      <SectionTitle>İleri modüller</SectionTitle>
      <SectionLead>
        Modül görünürlüğü Ayarlar’da (platform yöneticisi) kontrol edilir; role
        göre de süzülür.
      </SectionLead>
      <SimpleTable
        headers={['Modül', 'Ne yapar', 'Kim kullanır']}
        rows={[
          [
            'Önemlilik / DMA',
            'Önemlilik ölçüt tasarımı ve müşteri değerlendirme puanlaması',
            'Yönetici (tasarım); danışman yöneticisi ve danışman (değerlendirme)',
          ],
          [
            'Önemlilik Anketleri',
            'Paydaş anketleri: davet, hatırlatma, sonuç matrisi ve dışa aktarma',
            'Yöneticiler; dış paydaşlar bağlantıyla',
          ],
          [
            'Emisyon verisi / Emisyon',
            'Emisyon verisi girişi ve hesaplama iş akışları',
            'Admin, danışman yöneticisi, danışman',
          ],
          [
            'Bilgi bankası + Yapay Zeka Sohbet',
            'Belge yükleme ve firma içeriğine dayalı sohbet',
            'Admin belgeleri yönetir; danışmanlar sorar',
          ],
          [
            'Denetim / Çeviriler / Ayarlar',
            'Platform yönetimi, dil, marka, alanlar, modüller',
            'Yalnızca platform yöneticisi',
          ],
        ]}
      />
      <Callout tone="success" title="Önemlilik Anketi">
        Paydaşlara anket gönderip hatırlatabilir, sonuçları matriste
        görüntüleyip dışa aktarabilirsiniz. Türkçe ve İngilizce desteklenir.
      </Callout>
    </div>
  );
}

function StepWorkflow() {
  const steps = [
    {
      t: 'Temel kurulum',
      d: 'Admin alanları, sektörleri, şablonları, modülleri, markayı, bilgi bankasını yapılandırır.',
    },
    {
      t: 'Müşteri kurulumu',
      d: 'Yönetici firmayı, NACE/SASB + çerçeveleri, paydaşları, şubeleri oluşturur.',
    },
    {
      t: 'Önceliklendirme (isteğe bağlı)',
      d: 'DMA / Önemlilik Anketi çalıştırın; rapor kapsamına girecek konuları netleştirin.',
    },
    {
      t: 'Proje başlatma',
      d: 'Yönetici/danışman şablondan proje oluşturur; tarih ve alanları ayarlar.',
    },
    {
      t: 'Ekibi kurma',
      d: 'Kullanıcıları proje rolleriyle ekleyin; tek / çok atama kuralını netleştirin.',
    },
    {
      t: 'Atama ve toplama',
      d: 'Sihirli bağlantı / görev gönderin; kişiler ve katılımcılar kanıt sunar.',
    },
    {
      t: 'İnceleme ve güvence',
      d: 'Danışmanlar Formlar’ı inceler; denetçiler Aktivite’yi okur; aşamalar onaylanır.',
    },
    {
      t: 'Kapatma',
      d: 'Projeyi kapalı/arşiv yapın; sonraki döngü için denetim izini koruyun.',
    },
  ];
  return (
    <div className="space-y-5">
      <SectionTitle>Önerilen uçtan uca iş akışı</SectionTitle>
      <SectionLead>
        Yeni bir raporlama döngüsü için bu sırayı izleyin.
      </SectionLead>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li
            key={s.t}
            className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-slate-900">{s.t}</p>
              <p className="mt-0.5 text-sm text-slate-600">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepWhatsNew() {
  return (
    <div className="space-y-5">
      <SectionTitle>Yenilikler — son değişiklikler</SectionTitle>
      <SectionLead>
        Son dönemde öne çıkan ürün geliştirmeleri.
      </SectionLead>
      <SimpleTable
        headers={['Alan', 'Ne değişti', 'Ne işe yarar']}
        rows={[
          [
            'Önemlilik Anketleri',
            'Paydaşlara anket gönderme, hatırlatma, sonuç matrisi ve dışa aktarma',
            'Önemlilik değerlendirmesini daha geniş katılımla toplama',
          ],
          [
            'Önemlilik Anketleri — Şablon',
            'Sayfada Yardım butonu (IRO nedir, anket nasıl işler); anketleri şablon olarak kaydetme ve şablondan/varolan anketten kopyalayarak yeni anket oluşturma',
            'Sıfırdan başlamadan hızlı anket kurulumu ve tutarlı IRO tanımları',
          ],
          [
            'NACE / SASB',
            'Firma sınıflandırmasında NACE ve SASB alanları birbirini önerir',
            'Sektör eşlemesini kolay ve tutarlı tutma',
          ],
          [
            'Firma formu',
            'Raporlama, öncelikler ve ESG sekmeleri daha net ayrıldı',
            'Firma bilgilerini daha rahat düzenleme',
          ],
          [
            'Atamalar',
            'Yanlışlıkla çift gönderim engellendi; hatırlatmalar eklendi',
            'Tekrarlayan atama ve kaçan takipleri azaltma',
          ],
          [
            'Görevler / organizasyonel sınır',
            'Aciliyet ve onay akışları; organizasyonel sınır tanım sihirbazı',
            'Daha düzenli operasyon ve raporlama kapsamı',
          ],
        ]}
      />
      <Callout tone="info" title="Eğitim ipucu">
        On dakikada üç erişim kalıbını göstermek için iki hesap (yönetici +
        katılımcı) ve bir e-posta bağlantısıyla demo yapın.
      </Callout>
    </div>
  );
}

function renderStep(id: string) {
  switch (id) {
    case 'welcome':
      return <StepWelcome />;
    case 'roles-map':
      return <StepRolesMap />;
    case 'role-admin':
      return <StepRoleAdmin />;
    case 'role-manager':
      return <StepRoleManager />;
    case 'role-consultant':
      return <StepRoleConsultant />;
    case 'role-contributor':
      return <StepRoleContributor />;
    case 'role-customer':
      return <StepRoleCustomer />;
    case 'role-auditor':
      return <StepRoleAuditor />;
    case 'project-roles':
      return <StepProjectRoles />;
    case 'features-core':
      return <StepFeaturesCore />;
    case 'features-collect':
      return <StepFeaturesCollect />;
    case 'features-advanced':
      return <StepFeaturesAdvanced />;
    case 'workflow':
      return <StepWorkflow />;
    case 'whats-new':
      return <StepWhatsNew />;
    default:
      return <StepWelcome />;
  }
}

export default function PlatformGuidePage() {
  const [index, setIndex] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const safeIndex = Math.min(Math.max(index, 0), STEPS.length - 1);
  const step = STEPS[safeIndex];
  const progress = useMemo(
    () => ((safeIndex + 1) / STEPS.length) * 100,
    [safeIndex],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [safeIndex]);

  const go = (i: number) => setIndex(Math.min(Math.max(i, 0), STEPS.length - 1));

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <div className="border-b border-slate-200/90 bg-white">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-blue-700">
              <BookOpen size={18} strokeWidth={2.25} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Platform rehberi
              </span>
            </div>
            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">
              VeritasESG sunumu
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Roller, özellikler ve yenilikler — adım adım Türkçe rehber
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 lg:hidden"
            onClick={() => setTocOpen((o) => !o)}
          >
            <List size={14} />
            İçindekiler
          </button>
        </div>
        <div className="h-1 w-full bg-slate-100">
          <div
            className="h-1 bg-slate-900 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside
          className={cn(
            'lg:sticky lg:top-4 lg:self-start',
            tocOpen ? 'block' : 'hidden lg:block',
          )}
        >
          <nav
            aria-label="İçindekiler"
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              İçindekiler
            </p>
            <ul className="max-h-[70vh] space-y-0.5 overflow-y-auto">
              {STEPS.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      go(i);
                      setTocOpen(false);
                    }}
                    className={cn(
                      'w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                      i === safeIndex
                        ? 'bg-slate-900 font-semibold text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    <span className="tabular-nums opacity-70">{s.stepNumber}.</span>{' '}
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-500">
              Adım {step.stepNumber} / 8
              <span className="mx-2 text-slate-300">·</span>
              {step.subtitle}
            </p>
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            {renderStep(step.id)}
          </article>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => go(safeIndex - 1)}
              className="minimal-button-secondary inline-flex h-10 items-center gap-1.5 px-4 disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Geri
            </button>
            <p className="hidden text-sm font-medium text-slate-700 sm:block">
              {step.title}
            </p>
            <button
              type="button"
              disabled={safeIndex === STEPS.length - 1}
              onClick={() => go(safeIndex + 1)}
              className="minimal-button-primary inline-flex h-10 items-center gap-1.5 px-4 disabled:pointer-events-none disabled:opacity-40"
            >
              İleri
              <ChevronRight size={16} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
