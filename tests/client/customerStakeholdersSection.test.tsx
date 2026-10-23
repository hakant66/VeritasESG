/**
 * UI tests for CustomerStakeholdersSection — covers:
 * - a visible "at least one stakeholder is required" warning when none are registered
 * - a visible error message (instead of a silent failure) when saving a stakeholder fails
 * - onContactsChange notifies the parent form so it can gate its own save
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerStakeholdersSection } from '../../src/components/customer/CustomerStakeholdersSection';
import type { Contact } from '../../src/types';

const listByCustomer = vi.fn();
const create = vi.fn();
const branchesListByCustomer = vi.fn();

vi.mock('../../src/lib/AuthContext', () => ({
  useAuth: () => ({ profile: { language: 'tr' } }),
}));

vi.mock('../../src/services/db', () => ({
  contacts: {
    listByCustomer: (...args: unknown[]) => listByCustomer(...args),
    create: (...args: unknown[]) => create(...args),
    update: vi.fn(),
    delete: vi.fn(),
  },
  branches: {
    listByCustomer: (...args: unknown[]) => branchesListByCustomer(...args),
  },
}));

beforeEach(() => {
  listByCustomer.mockReset();
  create.mockReset();
  branchesListByCustomer.mockReset();
  branchesListByCustomer.mockResolvedValue([]);
});

describe('CustomerStakeholdersSection', () => {
  it('shows a required-stakeholder warning when none are registered yet', async () => {
    listByCustomer.mockResolvedValue([]);
    render(<CustomerStakeholdersSection customerId="cust-1" />);

    await waitFor(() => {
      expect(screen.getByText(/en az bir paydaş kaydı gereklidir/i)).toBeTruthy();
    });
  });

  it('notifies the parent of the contact count via onContactsChange', async () => {
    const onContactsChange = vi.fn();
    const existing: Contact[] = [
      { id: 'c1', customerId: 'cust-1', name: 'Ayşe', email: 'ayse@example.com', createdAt: 0 } as Contact,
    ];
    listByCustomer.mockResolvedValue(existing);

    render(<CustomerStakeholdersSection customerId="cust-1" onContactsChange={onContactsChange} />);

    await waitFor(() => {
      expect(onContactsChange).toHaveBeenCalledWith(existing);
    });
    expect(screen.queryByText(/en az bir paydaş kaydı gereklidir/i)).toBeNull();
  });

  it('shows an inline error instead of failing silently when saving a stakeholder fails', async () => {
    const user = userEvent.setup();
    listByCustomer.mockResolvedValue([]);
    create.mockRejectedValue(new Error('network down'));

    render(<CustomerStakeholdersSection customerId="cust-1" />);

    await waitFor(() => expect(screen.getByText(/yeni paydaş ekle/i)).toBeTruthy());
    await user.click(screen.getByRole('button', { name: /yeni paydaş ekle/i }));

    await user.type(screen.getByPlaceholderText(/ad soyad|isim/i) ?? screen.getAllByRole('textbox')[0], 'Test Kişi');
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
    await user.type(emailInput, 'test@example.com');

    const submitButtons = screen.getAllByRole('button', { name: /yeni paydaş ekle/i });
    await user.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/paydaş kaydedilemedi/i)).toBeTruthy();
    });
    expect(create).toHaveBeenCalled();
  });
});
