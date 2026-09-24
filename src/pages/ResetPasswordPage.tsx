/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '../lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useSettings } from '../lib/SettingsContext';
import { apiRequest } from '../lib/apiClient';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('This reset link is missing or invalid. Request a new link from the login page.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });
      setSuccess(data.message || 'Password updated successfully.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full minimal-card p-10 space-y-8 bg-white shadow-2xl shadow-slate-200"
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              'bg-white flex items-center justify-center mb-6 overflow-hidden',
              settings.platformLogoRectangleUrl ? 'h-16 px-6' : 'w-16 h-16 p-3',
            )}
          >
            {settings.platformLogoRectangleUrl ? (
              <img src={settings.platformLogoRectangleUrl} alt="Logo" className="h-full object-contain" />
            ) : settings.platformLogoSquareUrl ? (
              <img src={settings.platformLogoSquareUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="w-8 h-1 bg-slate-900 rounded-full" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Set a new password</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium opacity-80">
            Choose a password you have not used here before.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
            <input
              type="password"
              required
              disabled={!token}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-sm disabled:opacity-50"
            />
          </div>
          <div className="relative group">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
            <input
              type="password"
              required
              disabled={!token}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-sm disabled:opacity-50"
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
            disabled={loading || !token}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock size={16} />}
            {loading ? 'Saving…' : 'Update password'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={14} />
            Back to login
          </button>
        </form>
      </motion.div>
    </div>
  );
}
