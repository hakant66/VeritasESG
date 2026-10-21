/**
 * UI tests for SectorClassificationFields — covers the Horizon review request:
 * - the manual "platform sectors" checkbox grid is gone (sectorIds is now derived)
 * - picking a SASB sub-sector auto-matches its macro sector
 * - picking a SASB sector no longer pushes a (wrong) NACE code
 * - entering a NACE code auto-matches its description and SASB classification
 *
 * The two SASB <select> elements aren't associated with their <label> via
 * htmlFor/id in the component, so tests address them by DOM order
 * (macro select first, sub-sector select second) rather than getByLabelText.
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
  const utils = render(
    <form>
      <SectorClassificationFields initial={initial} sectors={SECTORS} />
    </form>,
  );
  const selects = utils.container.querySelectorAll('select');
  return {
    ...utils,
    macroSelect: selects[0] as HTMLSelectElement,
    subSectorSelect: selects[1] as HTMLSelectElement,
  };
}

describe('SectorClassificationFields', () => {
  it('does not render the old manual platform-sector checkbox grid', () => {
    renderFields();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('lets a sub-sector be picked directly, without requiring a macro first', () => {
    const { subSectorSelect } = renderFields();
    expect(subSectorSelect).not.toBeDisabled();
    // Full catalog available up front (not filtered down to an empty list pre-macro).
    expect(subSectorSelect.options.length).toBeGreaterThan(1);
  });

  it('auto-matches the macro sector when a SASB sub-sector is selected, without touching NACE', async () => {
    const user = userEvent.setup();
    const { subSectorSelect, macroSelect, container } = renderFields();

    await user.selectOptions(subSectorSelect, 'RT-CH'); // Kimyasallar (Chemicals)

    expect(macroSelect.value).toBe('resource_transformation');

    const naceHidden = container.querySelector('input[name="naceCode"]') as HTMLInputElement;
    expect(naceHidden.value).toBe('');
  });

  it('auto-matches NACE description and SASB classification when a NACE code is entered', async () => {
    const user = userEvent.setup();
    const { macroSelect, subSectorSelect } = renderFields();

    const naceInput = screen.getByPlaceholderText(/ör\. C26/i);
    await user.type(naceInput, 'C20');
    await user.tab();

    const descInput = screen.getByPlaceholderText(/Sektör açıklaması/i) as HTMLInputElement;
    expect(descInput.value).toContain('Kimyasal');
    expect(macroSelect.value).toBe('resource_transformation');
    expect(subSectorSelect.value).toBe('RT-CH');
  });

  it('derives hidden sectorIds inputs from the matched sector instead of a manual checkbox', async () => {
    const user = userEvent.setup();
    const { subSectorSelect, container } = renderFields();

    await user.selectOptions(subSectorSelect, 'RT-CH'); // Kimyasallar -> Kimyevi Maddeler segment

    const sectorIdInputs = within(container).queryAllByDisplayValue('seg-chem');
    expect(sectorIdInputs.length).toBeGreaterThan(0);
    expect((sectorIdInputs[0] as HTMLInputElement).name).toBe('sectorIds');
  });
});
