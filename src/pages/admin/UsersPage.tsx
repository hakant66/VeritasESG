/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Users as UsersIcon, 
  Mail,
  Shield,
  Loader2,
  Trash2,
  UserCheck,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  User as UserIcon,
  ShieldCheck,
  Building,
  History,
  Clock,
  ExternalLink,
  Edit2,
  X,
  Camera,
  Lock,
  FolderKanban,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import * as DB from '../../services/db';
import { logActivity } from '../../services/db';
import { PlatformUser, AuditLog, Customer, Project, ProjectUserAssignment } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDateTimeAt, formatPersonName } from '../../lib/utils';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { parseApiErrorMessage } from '../../lib/parseApiError';
import { ApiClientError } from '../../lib/apiClient';
import { format } from 'date-fns';
import { useSettings } from '../../lib/SettingsContext';
import Modal from '../../components/ui/Modal';
import { getAuthToken } from '../../lib/authToken';
import {
  hasLegacyPlatformRoleInUsers,
  normalizePlatformRole,
} from '../../lib/platformRoles.ts';
import { projectMemberRoleForSelect } from '../../lib/userRoles';
import {
  PageHelpFullModal,
  PageHelpHeaderButton,
} from '../../components/admin/PageHelpGuidance';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  }
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function UsersPage() {
  const { user: currentUser, profile, refreshProfile } = useAuth();
  const { t, lang } = useTranslation();
  const { settings } = useSettings();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [userLogs, setUserLogs] = useState<AuditLog[]>([]);
  const [userProjectAssignments, setUserProjectAssignments] = useState<ProjectUserAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingProjectAssignments, setLoadingProjectAssignments] = useState(false);
  const [addToProjectModal, setAddToProjectModal] = useState<{
    isOpen: boolean;
    projectId: string;
    role: ProjectUserAssignment['role'];
  }>({ isOpen: false, projectId: '', role: 'contributor' });
  const [addToProjectSubmitting, setAddToProjectSubmitting] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [newUserRole, setNewUserRole] = useState<string>('customer');
  const [editingUserRole, setEditingUserRole] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tempAvatarPreviewUrl, setTempAvatarPreviewUrl] = useState<string | null>(null);
  const [tempAvatarFile, setTempAvatarFile] = useState<File | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [manualPassword, setManualPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Modal State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'danger' | 'confirm';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'info'
  });

  const showAlert = (title: string, description: string, type: 'info' | 'warning' | 'danger' = 'info') => {
    setModal({ isOpen: true, title, description, type });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void, type: 'confirm' | 'danger' = 'confirm') => {
    setModal({ isOpen: true, title, description, type, onConfirm });
  };

  const clearTempAvatar = () => {
    if (tempAvatarPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(tempAvatarPreviewUrl);
    }
    setTempAvatarPreviewUrl(null);
    setTempAvatarFile(null);
  };

  const handleAvatarFileSelect = (file: File | null | undefined) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('Invalid file type', 'Please upload JPG, PNG, or WEBP images only.', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showAlert('Image too large', 'Please upload an image smaller than 5MB.', 'warning');
      return;
    }
    if (tempAvatarPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(tempAvatarPreviewUrl);
    }
    setTempAvatarFile(file);
    setTempAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const uploadProfileImage = async (file: File) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No active session found. Please sign in again.');
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/uploads/profile-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success || !payload?.data?.url) {
      throw new Error(payload?.error || 'Failed to upload image.');
    }
    return payload.data.url as string;
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  useEffect(() => {
    if (!selectedUser) {
      setIsSidebarCollapsed(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    loadUsers();
    loadCustomers();
    loadProjects();
  }, []);

  useEffect(() => {
    return () => {
      if (tempAvatarPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(tempAvatarPreviewUrl);
      }
    };
  }, [tempAvatarPreviewUrl]);

  async function loadCustomers() {
    try {
      const data = await DB.customers.list();
      setCustomers(data || []);
    } catch (e) {
      console.error("Failed to load customers", e);
    }
  }

  async function loadProjects() {
    try {
      const data = await DB.projects.list();
      setProjects(data || []);
    } catch (e) {
      console.error('Failed to load projects', e);
    }
  }

  async function loadUserProjectAssignments(userId: string) {
    setLoadingProjectAssignments(true);
    try {
      const data = await DB.projects.listAllUserAssignments(userId);
      setUserProjectAssignments(data || []);
    } catch (e) {
      console.error('Failed to load project assignments', e);
      setUserProjectAssignments([]);
    } finally {
      setLoadingProjectAssignments(false);
    }
  }

  async function loadUsers() {
    setLoading(true);
    const path = 'platformUsers';
    try {
      const dataRaw = await DB.platformUsers.list();
      const safeDataRaw = dataRaw || [];
      const data = Array.from(new Map(safeDataRaw.map(u => [u.id, u])).values());
      setUsers(data);
      
      // Auto-migrate if any old roles detected or if specific user should be promoted
      const hasOldRoles = hasLegacyPlatformRoleInUsers(data);

      if (hasOldRoles) {
        console.log("Migration or promotion needed, migrating...");
        await DB.platformUsers.migrateRoles();
        const refreshedDataRaw = await DB.platformUsers.list(true);
        const safeRefreshedDataRaw = refreshedDataRaw || [];
        const refreshedData = Array.from(new Map(safeRefreshedDataRaw.map(u => [u.id, u])).values());
        setUsers(refreshedData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectUser = async (u: PlatformUser) => {
    setSelectedUser(u);
    setEditingUserRole(u.role);
    setLoadingDetails(true);
    setUserProjectAssignments([]);
    try {
      const [allLogs] = await Promise.all([
        DB.auditLogs.list(),
        loadUserProjectAssignments(u.id),
      ]);
      const safeLogs = allLogs || [];
      const filtered = safeLogs.filter(l => l && l.userId === u.id);
      setUserLogs(filtered.slice(0, 10));
    } catch (error) {
      console.error("Failed to load user activity:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getProjectName = useCallback(
    (projectId: string) => projects.find((p) => p.id === projectId)?.name ?? projectId,
    [projects],
  );

  const userAssignmentsWithProjects = useMemo(() => {
    const sortLocale = lang === 'tr' ? 'tr' : 'en';
    return [...userProjectAssignments]
      .map((a) => ({
        assignment: a,
        project: projects.find((p) => p.id === a.projectId),
      }))
      .sort((a, b) =>
        getProjectName(a.assignment.projectId).localeCompare(
          getProjectName(b.assignment.projectId),
          sortLocale,
          { sensitivity: 'base' },
        ),
      );
  }, [userProjectAssignments, projects, getProjectName, lang]);

  const activeProjectsForAdd = useMemo(() => {
    const sortLocale = lang === 'tr' ? 'tr' : 'en';
    const assignedIds = new Set(userProjectAssignments.map((a) => a.projectId));
    return projects
      .filter((p) => p.status === 'active' && !assignedIds.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name, sortLocale, { sensitivity: 'base' }));
  }, [projects, userProjectAssignments, lang]);

  const customersSorted = useMemo(() => {
    const sortLocale = lang === 'tr' ? 'tr' : 'en';
    return [...customers].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', sortLocale, { sensitivity: 'base' }),
    );
  }, [customers, lang]);

  const handleOpenAddToProject = () => {
    setAddToProjectModal({
      isOpen: true,
      projectId: activeProjectsForAdd[0]?.id ?? '',
      role: 'contributor',
    });
  };

  const handleAddToProject = async () => {
    if (!selectedUser || !addToProjectModal.projectId) return;
    setAddToProjectSubmitting(true);
    try {
      await DB.projects.assignUser(
        addToProjectModal.projectId,
        selectedUser.id,
        addToProjectModal.role,
      );
      if (currentUser) {
        await logActivity(
          currentUser,
          'create',
          'projectUserAssignments',
          `${addToProjectModal.projectId}_${selectedUser.id}`,
          `Added ${selectedUser.name} to project as ${addToProjectModal.role}`,
          addToProjectModal.projectId,
        );
      }
      await loadUserProjectAssignments(selectedUser.id);
      setAddToProjectModal({ isOpen: false, projectId: '', role: 'contributor' });
      showAlert(t.common.saved, t.users.projectAssignmentSuccess);
    } catch (err) {
      console.error(err);
      showAlert(t.common.error, t.users.projectAssignmentFailed, 'danger');
    } finally {
      setAddToProjectSubmitting(false);
    }
  };

  const handleUpdateProjectRole = async (
    assignmentId: string,
    role: ProjectUserAssignment['role'],
  ) => {
    if (!selectedUser) return;
    try {
      await DB.projects.updateUserRole(assignmentId, role);
      if (currentUser) {
        await logActivity(
          currentUser,
          'update',
          'projectUserAssignments',
          assignmentId,
          `Updated project role to ${role} for ${selectedUser.name}`,
        );
      }
      await loadUserProjectAssignments(selectedUser.id);
      showAlert(t.common.saved, t.users.projectRoleUpdated);
    } catch (err) {
      console.error(err);
      showAlert(t.common.error, t.users.projectAssignmentFailed, 'danger');
    }
  };

  const handleRemoveFromProject = (assignment: ProjectUserAssignment) => {
    if (!selectedUser) return;
    const projectName = getProjectName(assignment.projectId);
    showConfirm(
      t.users.removeFromProject,
      t.users.removeFromProjectConfirm
        .replace('{name}', selectedUser.name)
        .replace('{project}', projectName),
      async () => {
        try {
          await DB.projects.unassignUser(assignment.id);
          if (currentUser) {
            await logActivity(
              currentUser,
              'delete',
              'projectUserAssignments',
              assignment.id,
              `Removed ${selectedUser.name} from ${projectName}`,
              assignment.projectId,
            );
          }
          await loadUserProjectAssignments(selectedUser.id);
        } catch (err) {
          console.error(err);
          showAlert(t.common.error, t.users.projectAssignmentFailed, 'danger');
        }
      },
      'danger',
    );
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const name = formatPersonName(formData.get('name') as string);
    const email = (formData.get('email') as string).trim();
    const role = formData.get('role') as any;
    const language = formData.get('language') as 'en' | 'tr';
    const autoShowHelpOnOpen = (formData.get('helpAutoOpen') as string) === 'enabled';
    const customerId = role === 'customer' ? formData.get('customerId') as string : null;
    const departmentInput = formData.get('department') as string;
    const department = departmentInput?.trim() || (role === 'customer' ? 'Customer' : 'General');
    let avatarUrl = editingUser.avatarUrl;

    if (!name || !email) return;

    setIsSubmitting(true);
    const path = `platformUsers/${editingUser.id}`;
    try {
      if (tempAvatarFile) {
        avatarUrl = await uploadProfileImage(tempAvatarFile);
      }
      await DB.platformUsers.update(editingUser.id, { 
        name, 
        email, 
        role, 
        department, 
        avatarUrl,
        language,
        autoShowHelpOnOpen,
        customerId: customerId || null
      });
      if (currentUser) {
        await logActivity(currentUser, 'update', 'platformUsers', editingUser.id, `Updated profile for ${name} (${email})`);
      }
      
      // If we updated ourselves, refresh the Auth profile to update the UI
      if (editingUser.id === currentUser?.uid) {
        await refreshProfile();
      }
      
      setEditingUser(null);
      clearTempAvatar();
      // Refresh selected user if it was the one being edited
      if (selectedUser?.id === editingUser.id) {
        setSelectedUser({ 
          ...selectedUser, 
          name, 
          email, 
          role, 
          department, 
          avatarUrl, 
          language,
          autoShowHelpOnOpen,
          customerId: customerId || null
        });
      }
      loadUsers();
    } catch (err) {
      console.error(err);
      showAlert(
        t.common.error,
        parseApiErrorMessage(err, t.common.errorOccurred),
        err instanceof ApiClientError && err.code === 'db/email-duplicate' ? 'warning' : 'danger',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualPasswordSet = async () => {
    const targetUser = editingUser || selectedUser;
    if (!targetUser || !manualPassword) return;
    if (manualPassword.length < 6) {
      showAlert("Invalid Password", "Password must be at least 6 characters.", "warning");
      return;
    }

    setPasswordLoading(true);
    try {
      // 1. Get the app JWT token. Firebase fallback is kept only for unmigrated data flows.
      let idToken = getAuthToken();

      if (!idToken) {
        throw new Error("Sistem oturumu bulunamadı. Lütfen tekrar giriş yapın.");
      }

      const response = await fetch('/api/admin/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: idToken,
          targetUid: targetUser.id,
          newPassword: manualPassword
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Şifre güncellenemedi.');

      showAlert("Başarılı", result.message || "Kullanıcı şifresi başarıyla güncellendi.");
      setManualPassword('');
    } catch (err: any) {
      console.error(err);
      showAlert("Güncelleme Hatası", err.message, "danger");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formatPersonName(formData.get('name') as string);
    const email = (formData.get('email') as string).trim();
    const role = formData.get('role') as any;
    const language = formData.get('language') as 'en' | 'tr';
    const customerId = role === 'customer' ? formData.get('customerId') as string : null;
    const departmentInput = formData.get('department') as string;
    const department = departmentInput?.trim() || (role === 'customer' ? 'Customer' : 'General');
    let avatarUrl = '';

    if (!name || !email) return;

    setIsSubmitting(true);
    try {
      const existing = await DB.platformUsers.getByEmail(email);
      if (existing) {
        showAlert(
          t.users.createFailed,
          t.users.emailAlreadyExists.replace('{name}', existing.name || email),
          'warning',
        );
        return;
      }

      if (tempAvatarFile) {
        avatarUrl = await uploadProfileImage(tempAvatarFile);
      }
      const newUserId = await DB.platformUsers.create({ 
        name, 
        email, 
        role, 
        department, 
        avatarUrl,
        language,
        customerId: customerId || null
      });
      if (currentUser && newUserId) {
        await logActivity(currentUser, 'create', 'platformUsers', newUserId, `Invited user ${name} (${email}) as ${role}`);
      }
      setShowNewUser(false);
      clearTempAvatar();
      loadUsers();
    } catch (err) {
      console.error(err);
      showAlert(
        t.users.createFailed,
        parseApiErrorMessage(err, t.common.errorOccurred),
        err instanceof ApiClientError && err.code === 'db/email-duplicate' ? 'warning' : 'danger',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    showConfirm(
      t.common.removeUser,
      `${userName} isimli kullanıcıyı kaldırmak istediğinizden emin misiniz? Bu işlem platform erişimini sonlandıracaktır.`,
      async () => {
        const path = `platformUsers/${id}`;
        try {
          await DB.platformUsers.delete(id);
          if (currentUser) {
            await logActivity(currentUser, 'delete', 'platformUsers', id, `Removed platform user: ${userName}`);
          }
          if (selectedUser?.id === id) setSelectedUser(null);
          loadUsers();
          showAlert("User Removed", "The user has been successfully removed.");
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.DELETE, path);
          } catch (finalErr: any) {
            console.error(finalErr);
            showAlert("Removal Failed", `Failed to remove user: ${finalErr.message}`, "danger");
          }
        }
      },
      "danger"
    );
  };

  const normalizeRoleGroupKey = useCallback((role: string): string => {
    return normalizePlatformRole(role) ?? role;
  }, []);

  const getRoleLabel = useCallback(
    (role: string) => {
      const canonical = normalizePlatformRole(role);
      switch (canonical) {
        case 'platform_admin':
          return t.users.roles.platform_admin;
        case 'consultant_manager':
          return t.users.roles.consultant_manager;
        case 'consultant':
          return t.users.roles.consultant;
        case 'customer':
          return t.users.roles.customer;
        case 'contributor':
          return t.users.roles.contributor;
        case 'auditor':
          return t.users.roles.auditor;
        default:
          return role;
      }
    },
    [t],
  );

  const sortLocale = lang === 'tr' ? 'tr' : 'en';

  const usersGroupedByRole = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const filtered = users.filter((user) => {
      const matchesRole =
        roleFilter === 'all' || normalizeRoleGroupKey(user.role) === roleFilter;
      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        (user.department || '').toLowerCase().includes(search);
      return matchesRole && matchesSearch;
    });

    const byRole = new Map<string, PlatformUser[]>();
    for (const user of filtered) {
      const key = normalizeRoleGroupKey(user.role);
      const list = byRole.get(key) ?? [];
      list.push(user);
      byRole.set(key, list);
    }

    return Array.from(byRole.entries())
      .map(([roleKey, roleUsers]) => ({
        roleKey,
        roleLabel: getRoleLabel(roleKey),
        users: [...roleUsers].sort((a, b) =>
          a.name.localeCompare(b.name, sortLocale, { sensitivity: 'base' }),
        ),
      }))
      .sort((a, b) =>
        a.roleLabel.localeCompare(b.roleLabel, sortLocale, { sensitivity: 'base' }),
      );
  }, [
    users,
    roleFilter,
    searchTerm,
    normalizeRoleGroupKey,
    getRoleLabel,
    sortLocale,
  ]);

  const filteredUsersCount = useMemo(
    () => usersGroupedByRole.reduce((sum, g) => sum + g.users.length, 0),
    [usersGroupedByRole],
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'platform_admin': return ShieldCheck;
      case 'consultant_manager': return Shield;
      case 'consultant': return UserIcon;
      default: return UserIcon;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'platform_admin': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'consultant_manager': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'consultant': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-50 text-green-700 border-green-100';
      case 'update': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'delete': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="p-8 w-full max-w-none space-y-8">
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <UsersIcon className="text-blue-600" size={36} strokeWidth={2.5} />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t.users.title}</h1>
          </div>
          <p className="text-slate-500 font-light text-lg mt-1">{t.users.description}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-start gap-3">
          {(settings.helpUsersUrl || settings.helpUsersMd) && (
            <PageHelpHeaderButton
              helpUrl={settings.helpUsersUrl || ''}
              helpMd={settings.helpUsersMd || ''}
              isHelpModalOpen={isHelpModalOpen}
              setIsHelpModalOpen={setIsHelpModalOpen}
              title={t.dashboard.guidance}
            />
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 relative">
        {/* Left: User List / Sidebar */}
        <motion.div 
          initial={false}
          animate={{ 
            width: isSidebarCollapsed ? 48 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : '33.333333%'),
            marginRight: isSidebarCollapsed ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? 0 : 32)
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            "space-y-4 relative shrink-0 lg:overflow-hidden w-full lg:w-1/3",
            isSidebarCollapsed ? "bg-slate-50/50 rounded-lg" : "bg-transparent"
          )}
        >
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center pt-4">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50"
                title="Show Sidebar Directory"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-4 w-full min-w-[300px]">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.nav.users}</h2>
                  <button 
                    onClick={() => {
                      clearTempAvatar();
                      setShowNewUser(true);
                    }}
                    className="px-2 py-1 bg-slate-900 text-[9px] font-bold text-white uppercase tracking-widest rounded hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1"
                  >
                    <Plus size={10} />
                    {t.common.new}
                  </button>
                </div>
                {selectedUser && (
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1.5 bg-white border border-slate-100 rounded-md shadow-sm text-slate-400 hover:text-slate-900 transition-all"
                    title="Hide Sidebar"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    placeholder={t.users.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="relative group">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select 
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-1 focus:ring-slate-900 outline-none cursor-pointer appearance-none transition-all shadow-sm"
                  >
                    <option value="all">{t.common.all}</option>
                    <option value="customer">{t.users.roles.customer}</option>
                    <option value="contributor">{t.users.roles.contributor}</option>
                    <option value="auditor">{t.users.roles.auditor}</option>
                    <option value="consultant">{t.users.roles.consultant}</option>
                    <option value="consultant_manager">{t.users.roles.consultant_manager}</option>
                    <option value="platform_admin">{t.users.roles.platform_admin}</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-slate-400 text-sm italic">{t.common.loading}</div>
              ) : filteredUsersCount === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  {t.users.noUsers}
                </div>
              ) : (
                <motion.div className="space-y-5">
                  {usersGroupedByRole.map((group) => (
                    <div key={group.roleKey} className="space-y-2">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                        {group.roleLabel}
                        <span className="ml-1.5 font-medium text-slate-300">({group.users.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {group.users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-lg transition-all border text-left group",
                        selectedUser?.id === u.id 
                          ? "bg-white border-slate-900 shadow-sm ring-1 ring-slate-900" 
                          : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 overflow-hidden border border-slate-100",
                          selectedUser?.id === u.id ? "bg-slate-900" : "bg-slate-100"
                        )}>
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className={cn(
                              "text-[10px] font-bold",
                              selectedUser?.id === u.id ? "text-white" : "text-slate-500"
                            )}>
                              {getInitials(u.name)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className={cn("block font-bold text-sm truncate", selectedUser?.id === u.id ? "text-slate-900" : "text-slate-700")}>
                            {u.name}
                          </span>
                          <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none mb-1">
                            {getRoleLabel(u.role)}
                          </span>
                          <span className="block text-[10px] text-slate-400 truncate font-medium">
                            {u.email}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className={cn("shrink-0", selectedUser?.id === u.id ? "text-slate-900" : "text-slate-300")} />
                    </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        {/* Right: User Detail */}
        <div className="flex-1 min-w-0 transition-all duration-300 relative">
          <AnimatePresence mode="wait">
            {!selectedUser ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="minimal-card p-24 text-center text-slate-400 h-full flex flex-col justify-center items-center bg-slate-50/50"
              >
                <UserIcon size={48} className="text-slate-200 mb-4" />
                <p className="text-sm font-light">Select a team member to view their profile, permissions, and recent activity history.</p>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedUser.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Profile Summary */}
                <div className="minimal-card p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl font-bold text-slate-900 border border-slate-100 shrink-0 overflow-hidden">
                      {selectedUser.avatarUrl ? (
                         <img src={selectedUser.avatarUrl} alt={selectedUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        getInitials(selectedUser.name)
                      )}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight text-slate-900">{selectedUser.name}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <div className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5",
                          getRoleColor(selectedUser.role)
                        )}>
                          {(() => {
                            const Icon = getRoleIcon(selectedUser.role);
                            return <Icon size={12} />;
                          })()}
                          {getRoleLabel(selectedUser.role)}
                        </div>
                        <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-slate-200 bg-white text-slate-500">
                          {selectedUser.language === 'tr' ? t.common.turkish : t.common.english}
                        </div>
                        {selectedUser.customerId && (
                          <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 italic">
                            <Building size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">
                              {customers.find(c => c.id === selectedUser.customerId)?.name || 'Linked Company'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Building size={14} />
                          <span className="text-xs font-medium">{selectedUser.department}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Mail size={14} />
                          <span className="text-xs font-medium">{selectedUser.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        clearTempAvatar();
                        setEditingUserRole(selectedUser.role);
                        setEditingUser(selectedUser);
                      }}
                      className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                      title="Edit Profile"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(selectedUser.id, selectedUser.name)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Remove User"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 gap-6">
                  <section className="minimal-card p-6 space-y-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Shield size={14} /> {t.users.accountStatus}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm text-slate-500">{t.users.memberSince}</span>
                        <span className="text-sm font-medium text-slate-900">
                          {formatDateTimeAt(selectedUser.createdAt, lang) ?? '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm text-slate-500">{t.users.lastLoginAt}</span>
                        <span className="text-sm font-medium text-slate-900">
                          {formatDateTimeAt(selectedUser.lastLoginAt, lang) ?? t.users.lastLoginNever}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm text-slate-500">{t.users.accessLevel}</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-900">{getRoleLabel(selectedUser.role)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 text-slate-500">
                        <span className="text-sm">{t.users.verified}</span>
                        <div className="flex items-center gap-1 text-emerald-600">
                          <UserCheck size={14} />
                          <span className="text-xs font-bold uppercase">{t.users.systemVerified}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="minimal-card p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <FolderKanban size={14} /> {t.users.assignedProjects}
                      </h3>
                      <button
                        type="button"
                        onClick={handleOpenAddToProject}
                        disabled={activeProjectsForAdd.length === 0}
                        className="minimal-button-primary !py-2 px-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                      >
                        <Plus size={12} /> {t.users.addToProject}
                      </button>
                    </div>

                    {loadingProjectAssignments ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-slate-300" size={24} />
                      </div>
                    ) : userAssignmentsWithProjects.length === 0 ? (
                      <p className="text-sm text-slate-400 italic py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        {t.users.noAssignedProjects}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {userAssignmentsWithProjects.map(({ assignment, project }) => (
                          <div
                            key={assignment.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:border-slate-200 transition-colors"
                          >
                            <div className="min-w-0">
                              <Link
                                to={`/projects/${assignment.projectId}`}
                                className="text-sm font-bold text-slate-900 hover:text-blue-600 flex items-center gap-1.5"
                              >
                                {getProjectName(assignment.projectId)}
                                <ExternalLink size={12} className="opacity-60 shrink-0" />
                              </Link>
                              {project?.status && project.status !== 'active' && (
                                <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                  {project.status === 'closed'
                                    ? t.projectDetail.projectStatusClosed
                                    : t.projectDetail.projectStatusArchived}
                                </span>
                              )}
                              {project?.customerId && (
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  {customers.find((c) => c.id === project.customerId)?.name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={projectMemberRoleForSelect(assignment.role)}
                                onChange={(e) =>
                                  handleUpdateProjectRole(
                                    assignment.id,
                                    e.target.value as ProjectUserAssignment['role'],
                                  )
                                }
                                className="text-[10px] font-bold uppercase tracking-widest bg-white border border-slate-200 rounded-lg px-2 py-2 focus:ring-1 focus:ring-slate-900 outline-none cursor-pointer"
                              >
                                <option value="contributor">{t.projectDetail.projectContributor}</option>
                                <option value="editor">{t.projectDetail.projectEditor}</option>
                                <option value="auditor">{t.projectDetail.projectAuditor}</option>
                                <option value="admin">{t.projectDetail.projectAdmin}</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromProject(assignment)}
                                className="px-3 py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg uppercase tracking-widest transition-colors"
                              >
                                {t.users.removeFromProject}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Quick Password Reset (One-by-one update) */}
                  {profile?.role === 'platform_admin' && (
                    <section className="minimal-card p-6 space-y-4 border-slate-900/10 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <Lock size={14} /> {t.users.passwordOverride}
                        </h3>
                        <span className="text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                          {t.users.platformAdminOnly}
                        </span>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <input 
                            type="text"
                            value={manualPassword}
                            onChange={(e) => setManualPassword(e.target.value)}
                            placeholder={t.users.newPasswordPlaceholder}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-slate-900 outline-none shadow-sm transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={passwordLoading || !manualPassword}
                          onClick={handleManualPasswordSet}
                          className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                          {passwordLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                          {t.common.save}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        {t.users.passwordHelp}
                      </p>
                    </section>
                  )}
                </div>

                {/* Activity Feed Section */}
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex-grow mr-8">
                       {t.users.recentTrace}
                    </h3>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 uppercase font-bold">
                       <History size={12} /> {t.users.auditLog}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {loadingDetails ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-slate-300" />
                      </div>
                    ) : userLogs.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-sm bg-white border border-slate-100 rounded-lg border-dashed">
                        {t.users.noActivity}
                      </div>
                    ) : (
                      userLogs.map(log => (
                        <div key={log.id} className="minimal-card p-4 flex items-start justify-between group hover:border-slate-300 transition-all">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "mt-1 px-2 py-1 rounded-md border flex items-center justify-center shrink-0",
                              getActionColor(log.action)
                            )}>
                              <span className="text-[9px] font-bold uppercase tracking-tighter">{log.action}</span>
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                  {log.collection}
                                </span>
                                <p className="text-sm text-slate-700 leading-tight">{log.details}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock size={10} /> {format(log.timestamp, 'MMM d, HH:mm')}
                                </span>
                                <span className="text-[10px] text-slate-300 font-mono">ID: {log.recordId}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal
        isOpen={addToProjectModal.isOpen && !!selectedUser}
        onClose={() =>
          setAddToProjectModal({ isOpen: false, projectId: '', role: 'contributor' })
        }
        title={t.users.addToProjectTitle}
        description={t.users.addToProjectSub.replace('{name}', selectedUser?.name ?? '')}
        size="md"
        showFooterClose={false}
      >
        <div className="space-y-5 pt-2">
          <p className="text-xs text-slate-500">{t.users.onlyActiveProjectsListed}</p>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              {t.users.selectProject}
            </label>
            <select
              value={addToProjectModal.projectId}
              onChange={(e) =>
                setAddToProjectModal((prev) => ({ ...prev, projectId: e.target.value }))
              }
              className="minimal-input"
              disabled={activeProjectsForAdd.length === 0}
            >
              <option value="">{t.users.selectProjectPlaceholder}</option>
              {activeProjectsForAdd.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.customerId
                    ? ` — ${customers.find((c) => c.id === p.customerId)?.name ?? ''}`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              {t.users.selectProjectRole}
            </label>
            <select
              value={addToProjectModal.role}
              onChange={(e) =>
                setAddToProjectModal((prev) => ({
                  ...prev,
                  role: e.target.value as ProjectUserAssignment['role'],
                }))
              }
              className="minimal-input"
            >
              <option value="contributor">{t.projectDetail.projectContributor}</option>
              <option value="editor">{t.projectDetail.projectEditor}</option>
              <option value="auditor">{t.projectDetail.projectAuditor}</option>
              <option value="admin">{t.projectDetail.projectAdmin}</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                setAddToProjectModal({ isOpen: false, projectId: '', role: 'contributor' })
              }
              className="minimal-button-secondary flex-1"
              disabled={addToProjectSubmitting}
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleAddToProject}
              disabled={
                addToProjectSubmitting ||
                !addToProjectModal.projectId ||
                activeProjectsForAdd.length === 0
              }
              className="minimal-button-primary flex-1 flex items-center justify-center gap-2"
            >
              {addToProjectSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {addToProjectSubmitting ? t.common.saving : t.users.addToProject}
            </button>
          </div>
        </div>
      </Modal>

      {/* New User Modal */}
      <AnimatePresence>
        {showNewUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6">{t.common.inviteMember}</h2>
              <form onSubmit={handleCreateUser} className="space-y-5">
                <div className="flex justify-center mb-6">
                  <div className="relative group">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                      {tempAvatarPreviewUrl ? (
                        <img src={tempAvatarPreviewUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-slate-300" size={24} />
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        handleAvatarFileSelect(e.target.files?.[0]);
                      }}
                    />
                    <div className="absolute -bottom-2 -right-2 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 group-hover:text-slate-900 transition-colors">
                      <Plus size={14} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.users.fullName}</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="minimal-input"
                    placeholder="e.g. Sarah J. Consultant"
                    onBlur={(e) => {
                      e.target.value = formatPersonName(e.target.value);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.users.emailAddress}</label>
                  <input name="email" type="email" required className="minimal-input" placeholder="sarah@governanceiq.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.common.department}</label>
                    <input name="department" type="text" className="minimal-input" placeholder="Reporting" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.common.role}</label>
                    <select 
                      name="role" 
                      className="minimal-input"
                      onChange={(e) => {
                        const val = e.target.value;
                        // React state to force re-render for conditional field
                        setNewUserRole(val);
                      }}
                    >
                      <option value="customer">{t.users.roles.customer}</option>
                      <option value="contributor">{t.users.roles.contributor}</option>
                      <option value="auditor">{t.users.roles.auditor}</option>
                      <option value="consultant">{t.users.roles.consultant}</option>
                      <option value="consultant_manager">{t.users.roles.consultant_manager}</option>
                      <option value="platform_admin">{t.users.roles.platform_admin}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.common.language}</label>
                  <select name="language" className="minimal-input" defaultValue="en">
                    <option value="en">{t.common.english}</option>
                    <option value="tr">{t.common.turkish}</option>
                  </select>
                </div>
                {newUserRole === 'customer' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-1.5"
                  >
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.users.assignedCompany}</label>
                    <select name="customerId" required className="minimal-input">
                      <option value="">Select a Customer...</option>
                      {customersSorted.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </motion.div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { clearTempAvatar(); setShowNewUser(false); }} className="minimal-button-secondary flex-1">{t.common.cancel}</button>
                  <button type="submit" disabled={isSubmitting} className="minimal-button-primary flex-1">
                    {isSubmitting ? t.users.inviting : t.users.invite}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t.users.editUserTitle}</h3>
                  <p className="text-sm text-slate-500">{t.users.editUserSub}</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                      {tempAvatarPreviewUrl || editingUser.avatarUrl ? (
                        <img src={tempAvatarPreviewUrl || editingUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-slate-300">{getInitials(editingUser.name)}</span>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        handleAvatarFileSelect(e.target.files?.[0]);
                      }}
                    />
                    <div className="absolute -bottom-2 -right-2 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 group-hover:text-slate-900 transition-colors">
                      <Camera size={14} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.users.fullName}</label>
                  <input 
                    name="name"
                    defaultValue={editingUser.name}
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                    placeholder="e.g. Sarah Johnson"
                    onBlur={(e) => {
                      e.target.value = formatPersonName(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.users.emailAddress}</label>
                  <input 
                    name="email"
                    type="email"
                    defaultValue={editingUser.email}
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                    placeholder="sarah@agency.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.common.role}</label>
                    <select 
                      name="role"
                      defaultValue={editingUser.role}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none appearance-none"
                      onChange={(e) => setEditingUserRole(e.target.value)}
                    >
                      <option value="customer">{t.users.roles.customer}</option>
                      <option value="contributor">{t.users.roles.contributor}</option>
                      <option value="auditor">{t.users.roles.auditor}</option>
                      <option value="consultant">{t.users.roles.consultant}</option>
                      <option value="consultant_manager">{t.users.roles.consultant_manager}</option>
                      <option value="platform_admin">{t.users.roles.platform_admin}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.common.department}</label>
                    <input 
                      name="department"
                      defaultValue={editingUser.department}
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                      placeholder="e.g. ESG Metrics"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.common.language}</label>
                  <select 
                    name="language"
                    defaultValue={editingUser.language || 'en'}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none appearance-none"
                  >
                    <option value="en">{t.common.english}</option>
                    <option value="tr">{t.common.turkish}</option>
                  </select>
                </div>

                {profile?.role === 'platform_admin' ? (
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {t.profile.helpAutoOpenLabel}
                      </span>
                      <input
                        type="checkbox"
                        name="helpAutoOpen"
                        value="enabled"
                        defaultChecked={editingUser.autoShowHelpOnOpen === true}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-900/30"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500">
                      {editingUser.autoShowHelpOnOpen
                        ? t.profile.helpAutoOpenEnabled
                        : t.profile.helpAutoOpenDisabled}
                    </p>
                  </div>
                ) : null}

                {editingUserRole === 'customer' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-1"
                  >
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.users.assignedCompany}</label>
                    <select 
                      name="customerId" 
                      defaultValue={editingUser.customerId}
                      required 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                    >
                      <option value="">{t.common.selectItem.replace('{item}', t.nav.customers)}</option>
                      {customersSorted.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </motion.div>
                )}

                {/* Manual Password Set (Admins Only) */}
                {profile?.role === 'platform_admin' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Lock size={12} className="text-slate-400" />
                        {t.users.passwordOverride}
                      </label>
                      <span className="text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">{t.users.platformAdminOnly}</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={manualPassword}
                        onChange={(e) => setManualPassword(e.target.value)}
                        placeholder={t.users.newPasswordPlaceholder}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        disabled={passwordLoading || !manualPassword}
                        onClick={handleManualPasswordSet}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-slate-900/10"
                      >
                        {passwordLoading ? <Loader2 size={12} className="animate-spin" /> : t.common.save}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">{t.users.passwordHelp}</p>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => { clearTempAvatar(); setEditingUser(null); }}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-bold text-sm"
                  >
                    {t.common.cancel}
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 minimal-button-primary disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                    {t.common.saveChanges}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PageHelpFullModal
        helpUrl={settings.helpUsersUrl || ''}
        helpMd={settings.helpUsersMd || ''}
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        labels={{
          guidance: t.dashboard.guidance,
          interactiveTutorial: t.dashboard.interactiveTutorial,
          noVideo: t.dashboard.noVideo,
          dontShowOnFirstOpen: t.dashboard.dontShowOnFirstOpen,
        }}
      />

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        onConfirm={modal.onConfirm}
      />
    </div>
  );
}

