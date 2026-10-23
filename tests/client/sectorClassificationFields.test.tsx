/**
 * UI tests for SectorClassificationFields — covers:
 * - the manual "platform sectors" checkbox grid is gone (sectorIds is now derived)
 * - the component offers a "by SASB" vs "by NACE code" mode toggle (Horizon review request)
 * - in "by SASB" mode, picking a sub-sector auto-matches its macro sector and suggests a NACE code
 * - in "by NACE code" mode, entering a NACE code auto-matches its description and SASB classification
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectorClassificationFields } from '../../src/components/customer/SectorClassificationFields';
import type { Segment } from '../../src/types';

vi.mock('../../src/lib/AuthContext', () => ({
  useAuth: () => ({ profile: { language: 'tr' } }),
}));

vi.mock('../../src/lib/sectorClassificationCatalog', () => ({
  loadSectorClassificationCatalog: () =>
    new Promise(() => {
      /* never resolves in tests: component should already work off the builtin catalog */
    }),
}));

const SECTORS: Segment[] = [
  { id: 'seg-chem', name: 'Kimyevi Maddeler', type: 'sector', createdAt: 0 },
  { id: 'seg-auto', name: 'Otomotiv Endüstrisi', type: 'sector', createdAt: 0 },
  { id: 'seg-other', name: 'Diğer', type: 'sector', createdAt: 0 },
];

function renderFields(initial?: Parameters<typeof SectorClassificationFields>[0]['initial']) {
  return render(
    <form>
      <SectorClassificationFields initial={initial} sectors={SECTORS} />
    </form>,
  );
}

describe('SectorClassificationFields', () => {
  it('does not render the old manual platform-sector checkbox grid', () => {
    renderFields();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('defaults to "by SASB" mode with a single sub-sector select, grouped by macro', () => {
    const { container } = renderFields();
    const subSectorSelect = container.querySelector('select') as HTMLSelectElement;
    expect(subSectorSelect).toBeTruthy();
    expect(subSectorSelect.querySelectorAll('optgroup').length).toBeGreaterThan(0);
    expect(subSectorSelect.options.length).toBeGreaterThan(1);
  });

  it('auto-matches the macro sector and suggests a NACE code when a SASB sub-sector is selected', async () => {
    const user = userEvent.setup();
    const { container } = renderFields();

    const subSectorSelect = container.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(subSectorSelect, 'RT-CH'); // Kimyasallar (Chemicals)

    const macroHidden = container.querySelector('input[name="sasbMacroSector"]') as HTMLInputElement;
    expect(macroHidden.value).toBe('resource_transformation');

    const naceHidden = container.querySelector('input[name="naceCode"]') as HTMLInputElement;
    expect(naceHidden.value).not.toBe('');

    expect(screen.getByText(/önerildi/i)).toBeTruthy();
  });

  it('switches to "by NACE code" mode and auto-matches SASB classification from a typed code', async () => {
    const user = userEvent.setup();
    const { container } = renderFields();

    await user.click(screen.getByRole('button', { name: /nace koduna göre/i }));

    const naceInput = screen.getByPlaceholderText(/kod veya açıklama/i);
    await user.type(naceInput, 'C20');
    await user.tab();

    const descInput = screen.getByPlaceholderText(/Sektör açıklaması/i) as HTMLInputElement;
    expect(descInput.value).toContain('Kimyasal');

    const macroHidden = container.querySelector('input[name="sasbMacroSector"]') as HTMLInputElement;
    const subHidden = container.querySelector('input[name="sasbSubSectorSics"]') as HTMLInputElement;
    expect(macroHidden.value).toBe('resource_transformation');
    expect(subHidden.value).toBe('RT-CH');
  });

  it('derives hidden sectorIds inputs from the matched sector instead of a manual checkbox', async () => {
    const user = userEvent.setup();
    const { container } = renderFields();

    const subSectorSelect = container.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(subSectorSelect, 'RT-CH'); // Kimyasallar -> Kimyevi Maddeler segment

    const sectorIdInputs = within(container).queryAllByDisplayValue('seg-chem');
    expect(sectorIdInputs.length).toBeGreaterThan(0);
    expect((sectorIdInputs[0] as HTMLInputElement).name).toBe('sectorIds');
  });
});
