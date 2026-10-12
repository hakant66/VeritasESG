import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import { isAuditorPlatformUser } from '../lib/userRoles';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isTasksAndProfileOnly } = useAuth();
  const { settings } = useSettings();

  const platformName = settings.platformName?.trim() || 'VeritasESG';
  const logoUrl = settings.platformLogoRectangleUrl || settings.platformLogoSquareUrl;
  const isAuditor = isAuditorPlatformUser(profile?.role);
  const role = profile?.role;
  const isPlatformAdmin = role === 'platform_admin';
  const isConsultantManager = role === 'consultant_manager';
  const isConsultant = role === 'consultant';
  const isContributor = role === 'contributor';
  const isCustomer = role === 'customer';

  const homePath = user
    ? isTasksAndProfileOnly
      ? '/tasks'
      : isAuditor
        ? '/projects'
        : '/'
    : '/login';

  const primaryLinksRaw = user
    ? [
        { to: homePath, label: 'Go to Home' },
        { to: '/profile', label: 'Open Profile' },
        { to: '/projects', label: 'Browse Projects' },
        ...(isAuditor ? [] : [{ to: '/tasks', label: 'View Tasks' }]),
        ...(isPlatformAdmin ? [{ to: '/users', label: 'Users' }, { to: '/settings', label: 'Settings' }] : []),
        ...(isConsultantManager ? [{ to: '/customers', label: 'Customers' }, { to: '/materiality_design', label: 'Materiality Design' }] : []),
        ...(isConsultant ? [{ to: '/customers', label: 'Customers' }, { to: '/materiality', label: 'Materiality' }] : []),
        ...(isContributor || isCustomer ? [{ to: '/projects', label: 'My Projects' }] : []),
      ]
    : [
        { to: '/login', label: 'Sign In' },
        { to: '/reset-password', label: 'Reset Password' },
      ];

  const seen = new Set<string>();
  const primaryLinks = primaryLinksRaw.filter((link) => {
    if (seen.has(link.to)) return false;
    seen.add(link.to);
    return true;
  });

  return (
    <div className={user ? 'py-10' : 'min-h-screen bg-slate-50 flex items-center justify-center px-4'}>
      <div className="minimal-card w-full max-w-2xl p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-6">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${platformName} logo`}
              className="h-10 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
              404
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{platformName}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Page not found</h1>
          </div>
        </div>

        <p className="text-slate-600 leading-relaxed">
          The page <span className="font-mono text-slate-800">{location.pathname}</span> does not exist,
          may have been moved, or you may not have access to it.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {primaryLinks.map((link) => (
            <Link key={link.to + link.label} to={link.to} className="minimal-button-primary">
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="minimal-button-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
