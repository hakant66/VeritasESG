/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '../lib/utils';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LogIn, 
  Loader2, 
  Mail, 
  Lock, 
  ChevronRight, 
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import { apiRequest } from '../lib/apiClient';
import { setAuthToken } from '../lib/authToken';
import {
  resolveLoginBranding,
  loginPageShellClass,
  loginCardClass,
  loginMutedTextClass,
  loginHeadingClass,
  loginInputShellClass,
  loginPrimaryButtonClass,
} from '../lib/loginBranding';
import { resolveLoginLanguage } from '../lib/loginLanguage';
import { translations } from '../lib/i18n';
import {
  isAuditorPlatformUser,
  isCustomerPortalPlatformUser,
  isTasksAndProfileOnlyUser,
  isTasksOnlyPlatformUser,
} from '../lib/userRoles';
import * as DB from '../services/db';
import type { PlatformUser } from '../types';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isForceOtpRoute =
    location.pathname === '/login/forceotp' ||
    location.pathname.endsWith('/login/forceotp');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'otp-request' | 'otp-verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { refreshProfile } = useAuth();
  const { settings } = useSettings();

  const branding = useMemo(
    () => resolveLoginBranding(searchParams, settings),
    [searchParams, settings],
  );

  useEffect(() => {
    const prev = document.title;
    const next = branding.documentTitle || branding.title;
    if (next) document.title = next;
    return () => {
      document.title = prev;
    };
  }, [branding.documentTitle, branding.title]);

  const loginLang = useMemo(() => resolveLoginLanguage(searchParams), [searchParams]);
  const lt = useMemo(() => translations[loginLang].authLogin, [loginLang]);

  useEffect(() => {
    const qEmail = searchParams.get('email')?.trim();
    if (qEmail) setEmail(qEmail);
    if (isForceOtpRoute) {
      setMode('otp-request');
      setPassword('');
      setError(null);
    }
  }, [isForceOtpRoute, searchParams]);

  const effectiveMode =
    isForceOtpRoute && (mode === 'login' || mode === 'forgot') ? 'otp-request' : mode;

  const th = branding.theme;
  const linkMuted =
    th === 'dark'
      ? 'text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest'
      : 'text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest';
  const formHeading = th === 'dark' ? 'text-xl font-bold text-white' : 'text-xl font-bold text-slate-900';
  const formSub = th === 'dark' ? 'text-xs text-slate-400 leading-relaxed' : 'text-xs text-slate-500 leading-relaxed';
  const iconBoxBlue = th === 'dark' ? 'bg-blue-950/50 border border-blue-800/50' : 'bg-blue-50';
  const iconBoxEmerald = th === 'dark' ? 'bg-emerald-950/50 border border-emerald-800/50' : 'bg-emerald-50';
  const otpInputClass =
    th === 'dark'
      ? 'w-full px-4 py-3.5 bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/10 text-center text-2xl font-bold tracking-[0.5em] text-slate-100 placeholder:text-slate-600'
      : 'w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-center text-2xl font-bold tracking-[0.5em] placeholder:text-slate-200';
  const mailIconClass =
    th === 'dark'
      ? 'absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-slate-200 transition-colors'
      : 'absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors';
  const lockIconClass = mailIconClass;
  const otpEmailStrong = th === 'dark' ? 'font-bold text-white' : 'font-bold text-slate-900';
  const otpLinkClass =
    th === 'dark'
      ? 'text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest flex items-center gap-1.5'
      : 'text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-widest flex items-center gap-1.5';
  const backRowClass =
    th === 'dark'
      ? 'w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest'
      : 'w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest';

  const handleAuthToken = async (token: string) => {
    setAuthToken(token);
    await refreshProfile();
    try {
      const session = await apiRequest<{ profile: PlatformUser }>('/api/auth/me');
      const role = session.profile?.role;
      let destination = '/';
      if (isTasksOnlyPlatformUser(role)) {
        destination = '/tasks';
      } else if (isAuditorPlatformUser(role)) {
        destination = '/projects';
      } else if (isCustomerPortalPlatformUser(role) && session.profile?.id) {
        const memberships = await DB.projects.listAllUserAssignments(session.profile.id);
        destination = isTasksAndProfileOnlyUser(role, memberships) ? '/tasks' : '/';
      }
      navigate(destination);
    } catch {
      navigate('/');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await handleAuthToken(result.token);
    } catch (error: any) {
      console.error("Email login failed:", error);
      setError(error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password'
        ? 'Invalid email or password. Please try again.'
        : error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    try {
      await apiRequest<{ message: string }>('/api/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      setMode('otp-verify');
      setSuccess(lt.otpSent.replace('{email}', email));
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;

    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ token: string }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code: otpCode })
      });

      await handleAuthToken(result.token);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({
          email,
          clientOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });

      setSuccess(lt.resetEmailSent);
      setTimeout(() => setMode('login'), 3000);
    } catch (error: any) {
      console.error("Reset failed:", error);
      setError(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={loginPageShellClass(th)}>
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={loginCardClass(th)}
      >
        <div className="flex flex-col items-center text-center">
          <div className={cn(
            "flex items-center justify-center mb-6 overflow-hidden rounded-xl",
            th === 'dark' ? "bg-slate-800/60" : "bg-white",
            branding.logoRect ? "h-16 px-6" : "w-16 h-16 p-3"
          )}>
            {branding.logoRect ? (
              <img src={branding.logoRect} alt="" className="h-full object-contain" />
            ) : branding.logoSquare ? (
              <img src={branding.logoSquare} alt="" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className={cn("w-8 h-1 rounded-full", th === 'dark' ? "bg-white" : "bg-slate-900")} />
            )}
          </div>
          {!(branding.logoRect || branding.logoSquare) && (
            <h1 className={loginHeadingClass(th)}>
              {branding.title}
            </h1>
          )}
          <p className={cn("mt-2 text-sm font-medium opacity-80", loginMutedTextClass(th))}>
            {branding.tagline}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {effectiveMode === 'login' ? (
            <motion.form 
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleEmailLogin} 
              className="space-y-4"
            >
              <div className="space-y-4">
                <div className="relative group">
                  <Mail size={16} className={mailIconClass} />
                  <input
                    type="email"
                    required
                    aria-label={lt.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={lt.emailPlaceholder}
                    className={loginInputShellClass(th)}
                  />
                </div>
                <div className="relative group">
                  <Lock size={16} className={lockIconClass} />
                  <input
                    type="password"
                    required
                    aria-label={lt.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={lt.passwordPlaceholder}
                    className={loginInputShellClass(th)}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs animate-shake">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={loginPrimaryButtonClass(th)}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn size={16} />}
                {loading ? lt.signingIn : lt.signIn}
              </button>

              <div className="flex items-center justify-between px-1">
                <button 
                  type="button"
                  onClick={() => setMode('forgot')}
                  className={linkMuted}
                >
                  {lt.forgotPassword}
                </button>
                <button 
                  type="button"
                  onClick={() => setMode('otp-request')}
                  className={otpLinkClass}
                >
                  <KeyRound size={12} />
                  {lt.loginWithOtp}
                </button>
              </div>

            </motion.form>
          ) : effectiveMode === 'forgot' ? (
            <motion.form 
              key="forgot"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleForgotPassword} 
              className="space-y-6"
            >
              <div className="space-y-2 text-center">
                <h2 className={formHeading}>{lt.resetPasswordTitle}</h2>
                <p className={formSub}>{lt.resetPasswordHelp}</p>
              </div>

              <div className="relative group">
                <Mail size={16} className={mailIconClass} />
                <input
                  type="email"
                  required
                  aria-label={lt.emailPlaceholderCompany}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lt.emailPlaceholderCompany}
                  className={loginInputShellClass(th)}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={loginPrimaryButtonClass(th)}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight size={16} />}
                {lt.sendResetLink}
              </button>

              <button 
                type="button"
                onClick={() => setMode('login')}
                className={backRowClass}
              >
                <ArrowLeft size={14} />
                {lt.backToLogin}
              </button>
            </motion.form>
          ) : effectiveMode === 'otp-request' ? (
            <motion.form 
              key="otp-request"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleRequestOtp} 
              className="space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4", iconBoxBlue)}>
                  <KeyRound className="text-blue-600" size={24} />
                </div>
                <h2 className={formHeading}>{lt.otpLoginTitle}</h2>
                <p className={formSub}>{lt.otpLoginHelp}</p>
              </div>

              <div className="relative group">
                <Mail size={16} className={mailIconClass} />
                <input
                  type="email"
                  required
                  aria-label={lt.emailPlaceholderCompany}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lt.emailPlaceholderCompany}
                  className={loginInputShellClass(th)}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={loginPrimaryButtonClass(th)}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight size={16} />}
                {lt.sendCode}
              </button>

              {!isForceOtpRoute ? (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={backRowClass}
                >
                  <ArrowLeft size={14} />
                  {lt.backToLogin}
                </button>
              ) : null}
            </motion.form>
          ) : (
            <motion.form 
              key="otp-verify"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleVerifyOtp} 
              className="space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4", iconBoxEmerald)}>
                  <ShieldCheck className="text-emerald-600" size={24} />
                </div>
                <h2 className={formHeading}>{lt.verifyTitle}</h2>
                <p className={formSub}>
                  {lt.verifyHelpPrefix} <span className={otpEmailStrong}>{email}</span>
                </p>
              </div>

              <div className="relative group">
                <input
                  type="text"
                  required
                  aria-label={lt.verifyTitle}
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={lt.otpPlaceholder}
                  className={otpInputClass}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className={loginPrimaryButtonClass(th)}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn size={16} />}
                {lt.verifyAndLogin}
              </button>

              <button 
                type="button"
                onClick={() => setMode('otp-request')}
                className={backRowClass}
              >
                <ArrowLeft size={14} />
                {lt.tryAnotherEmail}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer hidden per request */}
      </motion.div>
    </div>
  );
}
