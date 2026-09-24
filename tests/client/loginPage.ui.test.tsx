/**
 * UI tests for the public login screen.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../src/pages/LoginPage';
import { defaultSettings } from './helpers/renderWithAppShell';

const mockRefreshProfile = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../src/lib/AuthContext', () => ({
  useAuth: () => ({ refreshProfile: mockRefreshProfile }),
}));

vi.mock('../../src/lib/SettingsContext', () => ({
  useSettings: () => ({ settings: defaultSettings, loading: false }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../src/services/db', () => ({
  collection: vi.fn(),
}));

vi.mock('../../src/lib/apiClient', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    form: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <form {...props}>{children}</form>
    ),
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

function renderLogin(initialPath = '/login?lang=en') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders email and password fields on the default login mode', () => {
    renderLogin();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('shows forgot-password flow when user selects it', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /forgot password/i }));

    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  it('switches to OTP request mode', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /login with otp/i }));

    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).toBeNull();
  });

  it('uses Turkish copy when lang=tr is in the URL', () => {
    renderLogin('/login?lang=tr');

    expect(screen.getByRole('button', { name: /giriş yap/i })).toBeInTheDocument();
  });
});
