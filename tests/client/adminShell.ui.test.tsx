/**
 * UI tests for the authenticated admin shell (sidebar navigation & role gating).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import AdminLayout from '../../src/components/layout/AdminLayout';
import { defaultSettings, makeProfile, renderAdminLayout } from './helpers/renderWithAppShell';

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
const mockSettings = vi.hoisted(() => ({
  platformName: 'VeritasESG',
  platformLogoSquareUrl: '',
  platformLogoRectangleUrl: '',
  moduleProjectsEnabled: true,
  moduleTasksEnabled: true,
  moduleImportanceEnabled: true,
  moduleEmissionDataEnabled: true,
  moduleEmissionCalculationEnabled: true,
  moduleAIChatEnabled: true,
}));

vi.mock('../../src/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../src/lib/SettingsContext', () => ({
  useSettings: () => ({ settings: mockSettings, loading: false }),
}));

vi.mock('motion/react', () => {
  const MotionStub = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      layout: _layout,
      ...rest
    } = props;
    return <div {...rest}>{children}</div>;
  };
  return {
    motion: new Proxy(
      {},
      {
        get: () => MotionStub,
      },
    ),
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

function stubAuth(role: ReturnType<typeof makeProfile>['role'], extras?: Record<string, unknown>) {
  const profile = makeProfile(role);
  mockUseAuth.mockReturnValue({
    profile,
    isAdmin: ['platform_admin', 'consultant_manager', 'consultant'].includes(role),
    isTasksAndProfileOnly: role === 'contributor',
    logout: mockLogout,
    ...extras,
  });
}

describe('AdminLayout UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockSettings, defaultSettings);
  });

  it('renders primary navigation for platform_admin', () => {
    stubAuth('platform_admin');
    renderAdminLayout(<AdminLayout />);

    expect(screen.getAllByRole('link', { name: /^dashboard$/i })[0]).toHaveAttribute('href', '/');
    expect(screen.getAllByRole('link', { name: /^projects$/i })[0]).toHaveAttribute('href', '/projects');
    expect(screen.getAllByRole('link', { name: /^tasks$/i })[0]).toHaveAttribute('href', '/tasks');
    expect(screen.getAllByRole('link', { name: /^emission data$/i })[0]).toHaveAttribute(
      'href',
      '/emission-data',
    );
    expect(screen.getAllByRole('link', { name: /^emission calculation$/i })[0]).toHaveAttribute(
      'href',
      '/emissions',
    );
    expect(screen.getAllByRole('link', { name: /^ai chat$/i })[0]).toHaveAttribute('href', '/chat');
  });

  it('hides customers directory link for consultant role', () => {
    stubAuth('consultant');
    renderAdminLayout(<AdminLayout />);

    expect(screen.queryByRole('link', { name: /^customers$/i })).toBeNull();
    expect(screen.getAllByRole('link', { name: /^projects$/i }).length).toBeGreaterThan(0);
  });

  it('limits auditor navigation to projects and platform guide', () => {
    stubAuth('auditor');
    renderAdminLayout(<AdminLayout />, { path: '/projects' });

    expect(screen.getAllByRole('link', { name: /^projects$/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /^tasks$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^emission data$/i })).toBeNull();
    expect(screen.getAllByRole('link', { name: /^platform guide$/i }).length).toBeGreaterThan(0);
  });

  it('shows tasks-only shell for contributor without broader project access', () => {
    stubAuth('contributor', { isTasksAndProfileOnly: true });
    renderAdminLayout(<AdminLayout />);

    expect(screen.getAllByRole('link', { name: /^tasks$/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /^projects$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^emission calculation$/i })).toBeNull();
  });

  it('renders page outlet content and signed-in identity in the shell', () => {
    stubAuth('platform_admin');
    renderAdminLayout(<AdminLayout />, {
      outlet: <div data-testid="dashboard-body">Dashboard widgets</div>,
    });

    expect(screen.getByTestId('dashboard-body')).toHaveTextContent('Dashboard widgets');
    expect(screen.getAllByText('Test User').length).toBeGreaterThan(0);
  });

  it('hides emission and chat modules when disabled in platform settings', () => {
    stubAuth('platform_admin');
    mockSettings.moduleEmissionDataEnabled = false;
    mockSettings.moduleEmissionCalculationEnabled = false;
    mockSettings.moduleAIChatEnabled = false;

    renderAdminLayout(<AdminLayout />);

    expect(screen.queryByRole('link', { name: /^emission data$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^emission calculation$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^ai chat$/i })).toBeNull();
  });
});
