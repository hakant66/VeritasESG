/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Camera, Lock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPersonName } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../lib/AuthContext';
import { getAuthToken } from '../../lib/authToken';
import * as DB from '../../services/db';
import { logActivity } from '../../services/db';
import type { Customer, PlatformUser } from '../../types';

function getInitials(name: string) {
  if (!name?.trim()) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export type EditPlatformUserModalProps = {
  user: PlatformUser | null;
  customers: Customer[];
  isPlatformAdmin: boolean;
  projectId?: string;
  projectDefaultCustomerId?: string;
  onClose: () => void;
  onSaved: (updated: PlatformUser) => void;
  showAlert: (
    title: string,
    description: string,
    type?: 'info' | 'warning' | 'danger',
  ) => void;
};

export function EditPlatformUserModal({
  user,
  customers,
  isPlatformAdmin,
  projectId,
  projectDefaultCustomerId,
  onClose,
  onSaved,
  showAlert,
}: EditPlatformUserModalProps) {
  const { t, lang } = useTranslation();

  const customersSorted = useMemo(() => {
    const sortLocale = lang === 'tr' ? 'tr' : 'en';
    return [...customers].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', sortLocale, { sensitivity: 'base' }),
    );
  }, [customers, lang]);
  const { user: currentUser, refreshProfile } = useAuth();
  const [editingUserRole, setEditingUserRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempAvatarPreviewUrl, setTempAvatarPreviewUrl] = useState<string | null>(
    null,
  );
  const [tempAvatarFile, setTempAvatarFile] = useState<File | null>(null);
  const [manualPassword, setManualPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEditingUserRole(user.role);
    setManualPassword('');
  }, [user?.id, user?.role]);

  const clearTempAvatar = useCallback(() => {
    if (tempAvatarPreviewUrl) {
      URL.revokeObjectURL(tempAvatarPreviewUrl);
    }
    setTempAvatarPreviewUrl(null);
    setTempAvatarFile(null);
  }, [tempAvatarPreviewUrl]);

  useEffect(() => {
    return () => {
      if (tempAvatarPreviewUrl) URL.revokeObjectURL(tempAvatarPreviewUrl);
    };
  }, [tempAvatarPreviewUrl]);

  const handleAvatarFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showAlert(t.common.error, 'Please select an image file.', 'warning');
      return;
    }
    clearTempAvatar();
    setTempAvatarFile(file);
    setTempAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const uploadProfileImage = async (file: File) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/uploads/profile-image', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success || !payload?.data?.url) {
      throw new Error(payload?.error || 'Failed to upload image.');
    }
    return payload.data.url as string;
  };

  const handleClose = () => {
    clearTempAvatar();
    setManualPassword('');
    onClose();
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const name = formatPersonName(formData.get('name') as string);
    const email = (formData.get('email') as string).trim();
    const role = formData.get('role') as PlatformUser['role'];
    const language = formData.get('language') as 'en' | 'tr';
    const customerId =
      role === 'customer'
        ? (formData.get('customerId') as string) || null
        : null;
    const departmentInput = formData.get('department') as string;
    const department =
      departmentInput?.trim() || (role === 'customer' ? 'Customer' : 'General');
    let avatarUrl = user.avatarUrl;

    if (!name || !email) return;

    setIsSubmitting(true);
    try {
      if (tempAvatarFile) {
        avatarUrl = await uploadProfileImage(tempAvatarFile);
      }
      await DB.platformUsers.update(user.id, {
        name,
        email,
        role,
        department,
        avatarUrl,
        language,
        customerId,
      });
      if (currentUser) {
        await logActivity(
          currentUser,
          'update',
          'platformUsers',
          user.id,
          `Updated profile for ${name} (${email})`,
          projectId,
        );
      }
      if (user.id === currentUser?.uid) {
        await refreshProfile();
      }
      onSaved({
        ...user,
        name,
        email,
        role,
        department,
        avatarUrl,
        language,
        customerId,
      });
      handleClose();
      showAlert(t.common.saved, t.users.editUserUpdated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.common.errorOccurred;
      showAlert(t.common.error, message, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualPasswordSet = async () => {
    if (!user || !manualPassword) return;
    if (manualPassword.length < 6) {
      showAlert(t.common.error, t.users.newPasswordPlaceholder, 'warning');
      return;
    }

    setPasswordLoading(true);
    try {
      const idToken = getAuthToken();
      if (!idToken) {
        throw new Error('Sistem oturumu bulunamadı. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch('/api/admin/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: idToken,
          targetUid: user.id,
          newPassword: manualPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Şifre güncellenemedi.');

      showAlert(t.common.saved, result.message || t.users.passwordHelp);
      setManualPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.common.errorOccurred;
      showAlert(t.common.error, message, 'danger');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {user ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {t.users.editUserTitle}
                </h3>
                <p className="text-sm text-slate-500">{t.users.editUserSub}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 transition-colors hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => void handleUpdateUser(e)} className="space-y-4 p-6">
              <div className="mb-4 flex justify-center">
                <div className="group relative">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                    {tempAvatarPreviewUrl || user.avatarUrl ? (
                      <img
                        src={tempAvatarPreviewUrl || user.avatarUrl || ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-slate-300">
                        {getInitials(user.name)}
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => handleAvatarFileSelect(e.target.files?.[0])}
                  />
                  <div className="absolute -bottom-2 -right-2 rounded-lg border border-slate-100 bg-white p-1.5 text-slate-400 shadow-sm transition-colors group-hover:text-slate-900">
                    <Camera size={14} />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {t.users.fullName}
                </label>
                <input
                  name="name"
                  defaultValue={user.name}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. Sarah Johnson"
                  onBlur={(e) => {
                    e.target.value = formatPersonName(e.target.value);
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {t.users.emailAddress}
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="sarah@agency.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t.common.role}
                  </label>
                  <select
                    name="role"
                    defaultValue={user.role}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                    onChange={(e) => setEditingUserRole(e.target.value)}
                  >
                    <option value="customer">{t.users.roles.customer}</option>
                    <option value="contributor">{t.users.roles.contributor}</option>
                    <option value="auditor">{t.users.roles.auditor}</option>
                    <option value="consultant">{t.users.roles.consultant}</option>
                    <option value="consultant_manager">
                      {t.users.roles.consultant_manager}
                    </option>
                    {isPlatformAdmin && (
                      <option value="platform_admin">
                        {t.users.roles.platform_admin}
                      </option>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t.common.department}
                  </label>
                  <input
                    name="department"
                    defaultValue={user.department}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="e.g. ESG Metrics"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {t.common.language}
                </label>
                <select
                  name="language"
                  defaultValue={user.language || 'tr'}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="en">{t.common.english}</option>
                  <option value="tr">{t.common.turkish}</option>
                </select>
              </div>

              {editingUserRole === 'customer' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-1"
                >
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t.users.assignedCompany}
                  </label>
                  <select
                    name="customerId"
                    defaultValue={user.customerId || projectDefaultCustomerId || ''}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">—</option>
                    {customersSorted.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}

              {isPlatformAdmin && (
                <div className="mt-2 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <Lock size={12} className="text-slate-400" />
                      {t.users.passwordOverride}
                    </label>
                    <span className="rounded border border-slate-100 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                      {t.users.platformAdminOnly}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder={t.users.newPasswordPlaceholder}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      disabled={passwordLoading || !manualPassword}
                      onClick={() => void handleManualPasswordSet()}
                      className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 disabled:opacity-50"
                    >
                      {passwordLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : null}
                      {t.common.save}
                    </button>
                  </div>
                  <p className="text-[10px] italic text-slate-400">{t.users.passwordHelp}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="minimal-button-primary flex flex-1 items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : null}
                  {t.common.saveChanges}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
