import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { PlatformUser, ProjectUserAssignment } from '../types';
import * as DB from '../services/db';
import { apiRequest } from './apiClient';
import { clearAuthToken, getAuthToken } from './authToken';
import {
  isCustomerPortalPlatformUser,
  isTasksAndProfileOnlyUser,
} from './userRoles';

interface AuthUser {
  uid: string;
  id: string;
  email: string;
  displayName?: string | null;
  emailVerified: boolean;
}

/** Any platform role — used for in-memory session test override. */
export type TestRoleOverride = PlatformUser['role'];

interface AuthContextType {
  user: AuthUser | null;
  /** Effective profile (may include in-memory test role override). */
  profile: PlatformUser | null;
  /** Profile from server — never modified by test override. */
  actualProfile: PlatformUser | null;
  testRoleOverride: TestRoleOverride | null;
  setTestRoleOverride: (role: TestRoleOverride | null) => void;
  clearTestRoleOverride: () => void;
  loading: boolean;
  /** Platform admin, consultant manager, or consultant (broad staff access). */
  isAdmin: boolean;
  /** Effective role is platform administrator only. */
  isPlatformAdmin: boolean;
  /** Platform admin or consultant manager — may open global create-customer / create-project flows */
  canCreateCustomersAndProjects: boolean;
  /** Platform admin or consultant manager — see all projects in list views */
  canListAllProjects: boolean;
  /** Contributor, or customer without project admin/editor on any project. */
  isTasksAndProfileOnly: boolean;
  /** Project team memberships for the signed-in user (customer access checks). */
  projectMemberships: ProjectUserAssignment[];
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [baseProfile, setBaseProfile] = useState<PlatformUser | null>(null);
  const [testRoleOverride, setTestRoleOverrideState] = useState<TestRoleOverride | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [projectMemberships, setProjectMemberships] = useState<ProjectUserAssignment[]>(
    [],
  );
  const [projectMembershipsReady, setProjectMembershipsReady] = useState(false);

  const loadSession = useCallback(async (clearTestOverride = true) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setBaseProfile(null);
        if (clearTestOverride) setTestRoleOverrideState(null);
        return;
      }

      const session = await apiRequest<{ user: AuthUser; profile: PlatformUser }>(
        '/api/auth/me',
      );
      setUser(session.user);
      setBaseProfile(session.profile);
      if (clearTestOverride) setTestRoleOverrideState(null);
    } catch (error: unknown) {
      console.error('Failed to load auth session:', error);
      clearAuthToken();
      setUser(null);
      setBaseProfile(null);
      setTestRoleOverrideState(null);
    }
  }, []);

  useEffect(() => {
    loadSession(true).finally(() => setLoading(false));
  }, [loadSession]);

  const profile = useMemo(() => {
    if (!baseProfile) return null;
    if (!testRoleOverride) return baseProfile;
    return { ...baseProfile, role: testRoleOverride };
  }, [baseProfile, testRoleOverride]);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectMemberships() {
      if (!profile?.id || !isCustomerPortalPlatformUser(profile.role)) {
        if (!cancelled) {
          setProjectMemberships([]);
          setProjectMembershipsReady(true);
        }
        return;
      }

      setProjectMembershipsReady(false);
      try {
        const list = await DB.projects.listAllUserAssignments(profile.id);
        if (!cancelled) {
          setProjectMemberships(list);
          setProjectMembershipsReady(true);
        }
      } catch (error) {
        console.error('Failed to load project memberships:', error);
        if (!cancelled) {
          setProjectMemberships([]);
          setProjectMembershipsReady(true);
        }
      }
    }

    if (!loading) {
      void loadProjectMemberships();
    } else {
      setProjectMemberships([]);
      setProjectMembershipsReady(false);
    }

    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.role, loading]);

  const setTestRoleOverride = useCallback((role: TestRoleOverride | null) => {
    setTestRoleOverrideState(role);
  }, []);

  const clearTestRoleOverride = useCallback(() => {
    setTestRoleOverrideState(null);
  }, []);

  const refreshProfile = async () => {
    await loadSession(false);
  };

  const logout = async () => {
    clearAuthToken();
    setUser(null);
    setBaseProfile(null);
    setTestRoleOverrideState(null);
    setProjectMemberships([]);
    setProjectMembershipsReady(false);
  };

  const role = profile?.role as string | undefined;
  const canCreateCustomersAndProjects =
    role === 'platform_admin' || role === 'consultant_manager';

  const isTasksAndProfileOnly = useMemo(() => {
    if (!profile) return false;
    if (isCustomerPortalPlatformUser(profile.role) && !projectMembershipsReady) {
      return true;
    }
    return isTasksAndProfileOnlyUser(profile.role, projectMemberships);
  }, [profile, projectMemberships, projectMembershipsReady]);

  const accessReady = !loading && projectMembershipsReady;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        actualProfile: baseProfile,
        testRoleOverride,
        setTestRoleOverride,
        clearTestRoleOverride,
        loading: !accessReady,
        isAdmin:
          role === 'platform_admin' ||
          role === 'consultant_manager' ||
          role === 'consultant',
        isPlatformAdmin: role === 'platform_admin',
        canCreateCustomersAndProjects,
        canListAllProjects: canCreateCustomersAndProjects,
        isTasksAndProfileOnly,
        projectMemberships,
        refreshProfile,
        logout,
      }}
    >
      {accessReady && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
