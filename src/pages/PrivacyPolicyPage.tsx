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

export default function PrivacyPolicyPage() {
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
  const privacyEmail =
    settings.privacyEmail?.trim() ||
    settings.supportEmail?.trim() ||
    DEFAULT_CONTACT_EMAIL ||
    notSpecified;
  const supportEmail = settings.supportEmail?.trim() || privacyEmail;
  const websiteUrl = settings.websiteUrl?.trim();
  const lp = t.legalPages;
  const privacyT = lp.privacy;

  const fill = (text: string) =>
    text
      .replace('{platformName}', platformName)
      .replace('{legalEntityName}', legalEntityName)
      .replace('{privacyEmail}', privacyEmail);

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
              <h1 className="text-2xl font-bold text-slate-900">{privacyT.title}</h1>
            </div>
          </div>
          <Link to={user ? '/' : '/login'} className="minimal-button-secondary">
            {user ? lp.backToApp : lp.backToLogin}
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Link to="/terms-of-service" className="minimal-button-secondary">
            {privacyT.termsLink}
          </Link>
        </div>

        <div className="space-y-6 text-sm leading-6 text-slate-700">
          <p>
            <strong className="text-slate-900">{lp.effectiveDateLabel}</strong> {EFFECTIVE_DATE}
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{privacyT.legalEntityHeading}</h2>
            <p>{fill(privacyT.providedBy)}</p>
            <p>
              <strong className="text-slate-900">{privacyT.registeredAddress}</strong> {legalAddress}
            </p>
            <p>
              <strong className="text-slate-900">{privacyT.governingJurisdiction}</strong> {legalJurisdiction}
            </p>
            <p>
              <strong className="text-slate-900">{privacyT.privacyContact}</strong> {privacyEmail}
            </p>
            <p>
              <strong className="text-slate-900">{privacyT.supportContact}</strong> {supportEmail}
            </p>
            {websiteUrl ? (
              <p>
                <strong className="text-slate-900">{privacyT.website}</strong>{' '}
                <a href={websiteUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  {websiteUrl}
                </a>
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{privacyT.scopeTitle}</h2>
            <p>{fill(privacyT.scopeBody)}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{privacyT.dataProcessedTitle}</h2>
            <p>{privacyT.dataProcessedIntro}</p>
            <ul className="list-disc space-y-1 pl-5">
              {privacyT.dataProcessedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{privacyT.dataUseTitle}</h2>
            <ul className="list-disc space-y-1 pl-5">
              {privacyT.dataUseItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{privacyT.sharingTitle}</h2>
            <p>{privacyT.sharingBody}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{privacyT.retentionTitle}</h2>
            <p>{privacyT.retentionBody}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{privacyT.securityTitle}</h2>
            <p>{privacyT.securityBody}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{privacyT.rightsTitle}</h2>
            <p>{privacyT.rightsBody}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{privacyT.changesTitle}</h2>
            <p>{privacyT.changesBody}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{privacyT.contactTitle}</h2>
            <p>{fill(privacyT.contactBody)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
