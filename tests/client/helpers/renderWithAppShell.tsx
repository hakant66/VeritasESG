/**
 * Shared render helpers for client UI tests (login shell, admin layout).
 */
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PlatformUser } from '../../../src/types';

export const defaultSettings = {
  platformName: 'VeritasESG',
  platformLogoSquareUrl: '',
  platformLogoRectangleUrl: '',
  moduleProjectsEnabled: true,
  moduleTasksEnabled: true,
  moduleImportanceEnabled: true,
  moduleEmissionDataEnabled: true,
  moduleEmissionCalculationEnabled: true,
  moduleAIChatEnabled: true,
  helpDashboardUrl: '',
  helpDashboardMd: '',
  helpDashboardTitle: '',
  helpCustomersUrl: '',
  helpCustomersMd: '',
  helpCustomersTitle: '',
  helpCustomerDirectoryUrl: '',
  helpCustomerDirectoryMd: '',
  helpCustomerDirectoryTitle: '',
  helpProjectsUrl: '',
  helpProjectsMd: '',
  helpProjectsTitle: '',
  helpAssignmentsUrl: '',
  helpAssignmentsMd: '',
  helpAssignmentsTitle: '',
  helpUsersUrl: '',
  helpUsersMd: '',
  helpUsersTitle: '',
  helpActivitiesUrl: '',
  helpActivitiesMd: '',
  helpActivitiesTitle: '',
  helpSettingsUrl: '',
  helpSettingsMd: '',
  helpSettingsTitle: '',
  helpKnowledgeBaseUrl: '',
  helpKnowledgeBaseMd: '',
  helpKnowledgeBaseTitle: '',
  helpDashboardOrder: null,
  helpCustomersOrder: null,
  helpCustomerDirectoryOrder: null,
  helpProjectsOrder: null,
  helpAssignmentsOrder: null,
  helpUsersOrder: null,
  helpActivitiesOrder: null,
  helpSettingsOrder: null,
  helpKnowledgeBaseOrder: null,
};

export function makeProfile(role: PlatformUser['role']): PlatformUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role,
    department: 'QA',
    isConfirmed: true,
    language: 'en',
    autoShowHelpOnOpen: false,
    createdAt: Date.now(),
  };
}

export function renderAdminLayout(
  ui: ReactElement,
  {
    path = '/',
    outlet = <div data-testid="page-outlet">Page content</div>,
  }: { path?: string; outlet?: ReactNode } = {},
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/*" element={ui}>
          <Route index element={outlet} />
          <Route path="projects" element={outlet} />
          <Route path="tasks" element={outlet} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}
