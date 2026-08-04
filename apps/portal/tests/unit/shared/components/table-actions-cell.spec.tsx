import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { TableActionsCell } from '@/shared/components/data-table/table-actions-cell';
import en from '../../../../messages/en.json';

const renderCell = (onClick: () => Promise<void>) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TableActionsCell actions={[{ destructive: true, icon: null, label: 'Delete', onClick }]} />
    </NextIntlClientProvider>,
  );

describe('TableActionsCell', () => {
  it('clears the pending state after an action rejects, keeping the menu usable', async () => {
    const onClick = mock(() => Promise.reject(new Error('network down')));
    renderCell(onClick);

    const getTrigger = () => document.querySelector('button[aria-label="Open actions menu"]') as HTMLButtonElement;
    const trigger = getTrigger();
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1, pointerType: 'mouse' });
    fireEvent.click(trigger);

    fireEvent.click(await screen.findByText('Delete'));

    await waitFor(() => expect(getTrigger().disabled).toBe(false));
  });
});
