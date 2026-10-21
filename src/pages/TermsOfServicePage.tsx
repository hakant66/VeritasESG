import { Link } from 'react-router-dom';
import { useSettings } from '../lib/SettingsContext';
import { useAuth } from '../lib/AuthContext';
import { useTranslation } from '../hooks/useTranslation';

const EFFECTIVE_DATE = 'October 12, 2026';
const DEFAULT_LEGAL_ENTITY_NAME = 'LeadAI Limited';
const DEFAULT_LEGAL_ADDRESS_EN = 'Morley Road, TW1 2HG, London, United Kingdom';
const DEFAULT_LEGAL_ADDRESS_TR = 'Morley Road, TW1 2HG, Londra, Birleşik Krallık';
const DEFAULT_CONTACT_EMAIL = 'info@leadai.world';
const DEFAULT_LEGAL_JURISDICTION = 'England and Wales';

export default function TermsOfServicePage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const notSpecified = lang === 'tr' ? 'Belirtilmemiş.' : 'Not specified.';
  const defaultLegalAddress =
    lang === 'tr' ? DEFAULT_LEGAL_ADDRESS_TR : DEFAULT_LEGAL_ADDRESS_EN;

  const platformName = settings.platformName?.trim() || 'VeritasESG';
  const logoUrl = settings.platformLogoRectangleUrl || settings.platformLogoSquareUrl;
  const legalEntityName = settings.legalEntityName?.trim() || DEFAULT_LEGAL_ENTITY_NAME;
  const legalAddress = settings.legalAddress?.trim() || defaultLegalAddress;
  const legalJurisdiction = settings.legalJurisdiction?.trim() || DEFAULT_LEGAL_JURISDICTION;
  const supportEmail =
    settings.supportEmail?.trim() ||
    settings.privacyEmail?.trim() ||
    DEFAULT_CONTACT_EMAIL ||
    notSpecified;
  const websiteUrl = settings.websiteUrl?.trim();
  const lp = t.legalPages;
  const termsT = lp.terms;

  const fill = (text: string) =>
    text
      .replace('{platformName}', platformName)
      .replace('{legalEntityName}', legalEntityName)
      .replace('{legalJurisdiction}', legalJurisdiction)
      .replace('{supportEmail}', supportEmail);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-4xl minimal-card p-6 sm:p-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${platformName} logo`}
                className="h-10 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-slate-900" />
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{platformName}</p>
              <h1 className="text-2xl font-bold text-slate-900">{termsT.title}</h1>
            </div>
          </div>
          <Link to={user ? '/' : '/login'} className="minimal-button-secondary">
            {user ? lp.backToApp : lp.backToLogin}
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Link to="/privacy-policy" className="minimal-button-secondary">
            {termsT.privacyLink}
          </Link>
        </div>

        <div className="space-y-6 text-sm leading-6 text-slate-700">
          <p>
            <strong className="text-slate-900">{lp.effectiveDateLabel}</strong> {EFFECTIVE_DATE}
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{termsT.agreementTitle}</h2>
            <p>{fill(termsT.agreementBody)}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{termsT.providerTitle}</h2>
            <p>{fill(termsT.providerBody)}</p>
            <p>
              <strong className="text-slate-900">{termsT.registeredAddress}</strong> {legalAddress}
            </p>
            <p>
              <strong className="text-slate-900">{termsT.governingJurisdiction}</strong> {legalJurisdiction}
            </p>
            {websiteUrl ? (
              <p>
                <strong className="text-slate-900">{termsT.website}</strong>{' '}
                <a href={websiteUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  {websiteUrl}
                </a>
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{termsT.accountTitle}</h2>
            <ul className="list-disc space-y-1 pl-5">
              {termsT.accountItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{termsT.acceptableUseTitle}</h2>
            <p>{termsT.acceptableUseIntro}</p>
            <ul className="list-disc space-y-1 pl-5">
              {termsT.acceptableUseItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{termsT.dataTitle}</h2>
            <p>{termsT.dataBody}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{termsT.availabilityTitle}</h2>
            <p>{termsT.availabilityBody}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{termsT.liabilityTitle}</h2>
            <p>{termsT.liabilityBody}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{termsT.terminationTitle}</h2>
            <p>{termsT.terminationBody}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{termsT.lawTitle}</h2>
            <p>{fill(termsT.lawBody)}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{termsT.contactTitle}</h2>
            <p>{fill(termsT.contactBody)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
