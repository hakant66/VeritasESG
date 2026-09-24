/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { SettingsProvider } from './lib/SettingsContext';
import { AppProviders } from './app/providers.tsx';
import { isAuditorPlatformUser } from './lib/userRoles';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import ContactLayout from './components/layout/ContactLayout';

// Pages
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/admin/DashboardPage';
import CustomerSectorsPage from './pages/admin/CustomerSectorsPage';
import ServiceCategoriesPage from './pages/admin/ServiceCategoriesPage';
import TemplatesPage from './pages/admin/TemplatesPage';
import CustomersPage from './pages/admin/CustomersPage';
import ProjectsPage from './pages/admin/ProjectsPage';
import ProjectDetailPage from './pages/admin/ProjectDetailPage';
import TasksPage from './features/tasks/pages/TasksPage';
import EmissionsPage from './pages/admin/EmissionsPage';
import EmissionDataPage from './pages/admin/EmissionDataPage';
import DMAPage from './pages/admin/DMAPage';
import MaterialitySurveyListPage from './features/materiality-survey/pages/MaterialitySurveyListPage';
import SurveyRunnerPage from './features/materiality-survey/pages/SurveyRunnerPage';
import MaterialityDesignPage from './pages/admin/MaterialityDesignPage';
import UsersPage from './pages/admin/UsersPage';
import ProfilePage from './pages/admin/ProfilePage';
import TranslationsPage from './pages/admin/TranslationsPage';
import AuditPage from './pages/admin/AuditPage';
import SettingsPage from './pages/admin/SettingsPage';
import CustomerProfilePage from './pages/admin/CustomerProfilePage';
import CustomerDirectoryPage from './pages/admin/CustomerDirectoryPage';
import OrganizationalBoundaryOnboardingPage from './pages/admin/OrganizationalBoundaryOnboardingPage';
import KnowledgeBasePage from './features/knowledge-base/pages/KnowledgeBasePage';
import KnowledgeBaseDetailPage from './features/knowledge-base/pages/KnowledgeBaseDetailPage';
import KnowledgeChatPage from './features/knowledge-base/pages/KnowledgeChatPage';
import ContactResponsePage from './pages/contact/ContactResponsePage';
import PlatformGuidePage from './pages/admin/PlatformGuidePage';
import PlatformPresentationPage from './pages/admin/PlatformPresentationPage';

export default function App() {
  return (
    <AppProviders>
      <AuthProvider>
        <SettingsProvider>
          <AppRoutes />
        </SettingsProvider>
      </AuthProvider>
    </AppProviders>
  );
}

function AppRoutes() {
  const { user, profile, loading, isTasksAndProfileOnly } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const isFullAdmin = profile?.role === 'platform_admin';
  const isTasksOnly = isTasksAndProfileOnly;
  const isAuditor = isAuditorPlatformUser(profile?.role);
  const tasksOnlyGuard = (element: ReactNode) =>
    isTasksOnly ? <Navigate to="/tasks" replace /> : element;
  const auditorGuard = (element: ReactNode) =>
    isAuditor ? <Navigate to="/projects" replace /> : element;

  return (
    <HashRouter>
      <Routes>
        {/* Public auth */}
        <Route
          path="/login/forceotp"
          element={
            user ? (
              <Navigate
                to={isTasksOnly ? '/tasks' : isAuditor ? '/projects' : '/'}
                replace
              />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to={isTasksOnly ? '/tasks' : isAuditor ? '/projects' : '/'}
                replace
              />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Contact responses (Token based) */}
        <Route element={<ContactLayout />}>
          <Route path="/respond/:token" element={<ContactResponsePage />} />
        </Route>

        {/* Public materiality survey (tokenized, no login) */}
        <Route path="/materiality-survey/:token" element={<SurveyRunnerPage />} />

        {/* Admin protected routes */}
        <Route path="/" element={user ? <AdminLayout /> : <Navigate to="/login" />}>
          <Route
            index
            element={
              isAuditor ? (
                <Navigate to="/projects" replace />
              ) : (
                tasksOnlyGuard(<DashboardPage />)
              )
            }
          />
          <Route 
            path="sectors" 
            element={auditorGuard(tasksOnlyGuard(isFullAdmin ? <CustomerSectorsPage /> : <Navigate to="/" />))} 
          />
          <Route 
            path="service-categories" 
            element={auditorGuard(tasksOnlyGuard(isFullAdmin ? <ServiceCategoriesPage /> : <Navigate to="/" />))} 
          />
          <Route 
            path="templates/:sectorId" 
            element={auditorGuard(tasksOnlyGuard(
              (isFullAdmin || profile?.role === 'consultant_manager' || profile?.role === 'consultant')
                ? <TemplatesPage />
                : <Navigate to="/" />,
            ))}
          />
          <Route 
            path="customers" 
            element={auditorGuard(tasksOnlyGuard(
              (isFullAdmin || profile?.role === 'consultant_manager') ? <CustomersPage /> : <Navigate to="/" />,
            ))} 
          />
          <Route path="customers/:customerId" element={
            auditorGuard(tasksOnlyGuard(
              profile?.role === 'customer' ? <Navigate to="/" replace /> : <CustomerProfilePage />
            ))
          } />
          <Route 
            path="customer-directory" 
            element={auditorGuard(tasksOnlyGuard(
              profile?.role === 'contributor' ||
                profile?.role === 'consultant' ||
                profile?.role === 'customer'
                ? <Navigate to="/" />
                : <CustomerDirectoryPage />,
            ))}
          />
          <Route
            path="organizational-boundary-onboarding"
            element={auditorGuard(tasksOnlyGuard(
              profile?.role === 'contributor' ||
                profile?.role === 'consultant' ||
                profile?.role === 'customer'
                ? <Navigate to="/" />
                : <OrganizationalBoundaryOnboardingPage />,
            ))}
          />
          <Route 
            path="users" 
            element={auditorGuard(tasksOnlyGuard(isFullAdmin ? <UsersPage /> : <Navigate to="/" />))} 
          />
          <Route 
            path="audit" 
            element={auditorGuard(tasksOnlyGuard(isFullAdmin ? <AuditPage /> : <Navigate to="/" />))} 
          />
          <Route 
            path="translations" 
            element={auditorGuard(tasksOnlyGuard(isFullAdmin ? <TranslationsPage /> : <Navigate to="/" />))} 
          />
          <Route 
            path="settings" 
            element={auditorGuard(tasksOnlyGuard(isFullAdmin ? <SettingsPage /> : <Navigate to="/" />))} 
          />
          <Route path="projects" element={tasksOnlyGuard(<ProjectsPage />)} />
          <Route path="projects/:projectId" element={tasksOnlyGuard(<ProjectDetailPage />)} />
          <Route path="tasks" element={auditorGuard(<TasksPage />)} />
          <Route
            path="emissions"
            element={auditorGuard(tasksOnlyGuard(
              (isFullAdmin || profile?.role === 'consultant_manager' || profile?.role === 'consultant')
                ? <EmissionsPage />
                : <Navigate to="/" />,
            ))}
          />
          <Route
            path="materiality"
            element={auditorGuard(tasksOnlyGuard(
              (isFullAdmin || profile?.role === 'consultant_manager' || profile?.role === 'consultant')
                ? <DMAPage />
                : <Navigate to="/" />,
            ))}
          />
          <Route
            path="materiality-surveys"
            element={auditorGuard(tasksOnlyGuard(
              (isFullAdmin || profile?.role === 'consultant_manager' || profile?.role === 'consultant')
                ? <MaterialitySurveyListPage />
                : <Navigate to="/" />,
            ))}
          />
          <Route
            path="materiality_design"
            element={auditorGuard(tasksOnlyGuard(
              isFullAdmin || profile?.role === 'consultant_manager'
                ? <MaterialityDesignPage />
                : <Navigate to="/" />,
            ))}
          />
          <Route
            path="emission-data"
            element={auditorGuard(tasksOnlyGuard(
              (isFullAdmin || profile?.role === 'consultant_manager' || profile?.role === 'consultant')
                ? <EmissionDataPage />
                : <Navigate to="/" />,
            ))}
          />
          <Route path="chat" element={auditorGuard(tasksOnlyGuard(<KnowledgeChatPage />))} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="platform" element={<PlatformGuidePage />} />
          <Route path="platform-sunumu" element={<PlatformPresentationPage />} />

          <Route 
            path="knowledge-base" 
            element={auditorGuard(tasksOnlyGuard(isFullAdmin ? <KnowledgeBasePage /> : <Navigate to="/" />))} 
          />
          <Route 
            path="knowledge-base/:kbId" 
            element={auditorGuard(tasksOnlyGuard(isFullAdmin ? <KnowledgeBaseDetailPage /> : <Navigate to="/" />))} 
          />
        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to={isTasksOnly ? '/tasks' : isAuditor ? '/projects' : '/'}
              replace
            />
          }
        />
      </Routes>
    </HashRouter>
  );
}
