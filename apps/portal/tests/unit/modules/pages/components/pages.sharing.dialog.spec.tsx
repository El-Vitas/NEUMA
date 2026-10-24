import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster, toast } from 'sonner';
import type { BlockAccess, SharingEntry, SharingMember } from '@/modules/pages/sharing/types/pages.sharing.types';
import en from '../../../../../messages/en.json';

type Outcome = { data: BlockAccess } | { serverError: string };

const getBlockAccess = mock(async (_input: { blockId: string }): Promise<Outcome> => ({ serverError: 'unexpected' }));
const setBlockPermissions = mock(
  async (_input: unknown): Promise<{ data: { blockId: string } } | { serverError: string }> => ({
    data: { blockId: 'block-1' },
  }),
);

mock.module('@/modules/pages/sharing/server/actions/pages.sharing.actions', () => ({
  getBlockAccessAction: getBlockAccess,
  setBlockPermissionsAction: setBlockPermissions,
}));

const { PagesSharingDialog } = await import('@/modules/pages/sharing/components/pages.sharing.dialog');

const member = (id: string, name: string, workspaceRole: SharingMember['workspaceRole'], canReadSpace = true) => ({
  canReadSpace,
  email: `${id}@example.com`,
  id,
  name,
  workspaceRole,
});
const members: SharingMember[] = [
  member('admin', 'Admin', 'ADMIN'),
  member('worker', 'Worker', 'WORKER'),
  member('client', 'Client', 'CLIENT'),
  member('outsider', 'Outsider', 'WORKER', false),
];
const userEntry = (id: string, role: SharingEntry['role']): SharingEntry => {
  const person = members.find((candidate) => candidate.id === id);
  return {
    principal: { kind: 'user', userId: id },
    role,
    user: person === undefined ? null : { email: person.email, id, name: person.name },
  };
};
const spaceEntry = (role: SharingEntry['role']): SharingEntry => ({ principal: { kind: 'space' }, role, user: null });
const parent = { id: 'parent', title: 'Parent page', type: 'page' };

const buildAccess = (overrides: Partial<BlockAccess> = {}): BlockAccess => ({
  blockId: 'block-1',
  entries: [],
  inherited: { entries: [], source: null },
  isDeclaredHere: false,
  members,
  source: null,
  spaceId: 'space-1',
  viewerId: 'admin',
  ...overrides,
});

const declared = (entries: SharingEntry[], inherited: BlockAccess['inherited'] = { entries: [], source: null }) =>
  buildAccess({ entries, inherited, isDeclaredHere: true, source: { id: 'block-1', title: 'Roadmap', type: 'page' } });

const inheritedFromParent = (entries: SharingEntry[]) =>
  buildAccess({ entries, inherited: { entries, source: parent }, source: parent });

const respondWith = (access: BlockAccess): void => {
  getBlockAccess.mockImplementation(async () => ({ data: access }));
};

const renderDialog = (props: Partial<Parameters<typeof PagesSharingDialog>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Toaster />
      <PagesSharingDialog
        blockId="block-1"
        onChanged={() => {}}
        onClose={() => {}}
        scope="page"
        spaceId="space-1"
        title="Roadmap"
        {...props}
      />
    </NextIntlClientProvider>,
  );

const saveButton = (): HTMLElement => screen.getByRole('button', { name: 'Save changes' });

describe('PagesSharingDialog', () => {
  beforeEach(() => {
    setBlockPermissions.mockImplementation(async () => ({ data: { blockId: 'block-1' } }));
  });

  afterEach(() => {
    mock.clearAllMocks();
    toast.dismiss();
  });

  describe('loading', () => {
    it('says it is loading, then shows the access', async () => {
      respondWith(declared([userEntry('admin', 'full')]));
      renderDialog();

      expect(screen.getByText('Loading who has access…')).toBeDefined();
      expect(await screen.findByText('People with access')).toBeDefined();
      expect(getBlockAccess).toHaveBeenCalledWith({ blockId: 'block-1' });
    });

    it('tells someone without full access that only people with full access can see this', async () => {
      getBlockAccess.mockImplementation(async () => ({ serverError: 'forbidden' }));
      renderDialog();

      expect(await screen.findByText('Only people with full access can see and change who has access.')).toBeDefined();
      expect(screen.queryByText('People with access')).toBeNull();
    });

    it('offers to try again after any other failure', async () => {
      getBlockAccess.mockImplementationOnce(async () => ({ serverError: 'offline' }));
      respondWith(declared([userEntry('admin', 'full')]));
      renderDialog();

      expect(await screen.findByText('Could not load who has access.')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

      expect(await screen.findByText('People with access')).toBeDefined();
    });

    it('words the title for a block, not a page', async () => {
      respondWith(declared([userEntry('admin', 'full')]));
      renderDialog({ scope: 'block', title: '' });

      expect(await screen.findByText('Restrict access to this block')).toBeDefined();
    });
  });

  describe('a page that inherits', () => {
    it('names where the access comes from and lists it without letting it be changed', async () => {
      respondWith(inheritedFromParent([userEntry('admin', 'full'), spaceEntry('reader')]));
      renderDialog();

      expect(await screen.findByText('Follows the access of “Parent page”.')).toBeDefined();
      expect(screen.getByText('Admin')).toBeDefined();
      expect(screen.queryByLabelText('Access for Admin')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Remove Admin' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Stop inheriting' })).toBeDefined();
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
    });

    it('says it follows the space when nothing above declares', async () => {
      respondWith(buildAccess());
      renderDialog();

      expect(await screen.findByText(/Follows the space\./)).toBeDefined();
    });

    it('copies the access as its own when it stops inheriting, and saves it', async () => {
      respondWith(inheritedFromParent([userEntry('admin', 'full'), spaceEntry('reader')]));
      const onChanged = mock(() => undefined);
      const onClose = mock(() => undefined);
      renderDialog({ onChanged, onClose });
      fireEvent.click(await screen.findByRole('button', { name: 'Stop inheriting' }));

      expect((screen.getByLabelText('Access for Admin') as HTMLSelectElement).value).toBe('full');
      fireEvent.click(saveButton());

      await waitFor(() => {
        expect(setBlockPermissions).toHaveBeenCalledWith({
          blockId: 'block-1',
          permissions: [
            { principal: { kind: 'user', userId: 'admin' }, role: 'full' },
            { principal: { kind: 'space' }, role: 'reader' },
          ],
          spaceId: 'space-1',
        });
        expect(onChanged).toHaveBeenCalledWith({ blockId: 'block-1', hasOwnPermissions: true });
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('starts from the space default when nothing above declares: admins full, the rest of the space editing', async () => {
      respondWith(buildAccess());
      renderDialog();
      fireEvent.click(await screen.findByRole('button', { name: 'Stop inheriting' }));

      fireEvent.click(saveButton());

      await waitFor(() => {
        expect(setBlockPermissions).toHaveBeenCalledWith({
          blockId: 'block-1',
          permissions: [
            { principal: { kind: 'user', userId: 'admin' }, role: 'full' },
            { principal: { kind: 'space' }, role: 'editor' },
          ],
          spaceId: 'space-1',
        });
      });
    });
  });

  describe('a page with its own access', () => {
    it('lists the people with their role, and the space as one more entry', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('worker', 'editor'), spaceEntry('reader')]));
      renderDialog();

      expect(await screen.findByText('Has its own access settings.')).toBeDefined();
      expect((screen.getByLabelText('Access for Worker') as HTMLSelectElement).value).toBe('editor');
      expect((screen.getByLabelText('Access for Everyone in the space') as HTMLSelectElement).value).toBe('reader');
      expect(screen.getByText('You')).toBeDefined();
    });

    it('changes a role and saves only what changed in the declaration', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('worker', 'reader')]));
      renderDialog();
      fireEvent.change(await screen.findByLabelText('Access for Worker'), { target: { value: 'editor' } });

      fireEvent.click(saveButton());

      await waitFor(() => {
        expect(setBlockPermissions).toHaveBeenCalledWith({
          blockId: 'block-1',
          permissions: [
            { principal: { kind: 'user', userId: 'admin' }, role: 'full' },
            { principal: { kind: 'user', userId: 'worker' }, role: 'editor' },
          ],
          spaceId: 'space-1',
        });
      });
    });

    it('keeps save off until something changes', async () => {
      respondWith(declared([userEntry('admin', 'full')]));
      renderDialog();

      await screen.findByText('People with access');

      expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
    });

    it('removes a person', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('worker', 'editor')]));
      renderDialog();
      fireEvent.click(await screen.findByRole('button', { name: 'Remove Worker' }));

      expect(screen.queryByLabelText('Access for Worker')).toBeNull();
      fireEvent.click(saveButton());

      await waitFor(() => {
        expect(setBlockPermissions).toHaveBeenCalledWith({
          blockId: 'block-1',
          permissions: [{ principal: { kind: 'user', userId: 'admin' }, role: 'full' }],
          spaceId: 'space-1',
        });
      });
    });

    it('adds a person from the workspace, leaving out those listed and those who cannot open the space', async () => {
      respondWith(declared([userEntry('admin', 'full')]));
      renderDialog();
      const picker = await screen.findByLabelText('Add a person');

      const options = within(picker)
        .getAllByRole('option')
        .map((option) => option.textContent);
      expect(options).toEqual(['Choose a person', 'Worker', 'Client']);
      fireEvent.change(picker, { target: { value: 'worker' } });
      fireEvent.change(screen.getByLabelText('Role for the new person'), { target: { value: 'full' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      expect((screen.getByLabelText('Access for Worker') as HTMLSelectElement).value).toBe('full');
      fireEvent.click(saveButton());

      await waitFor(() => {
        expect(setBlockPermissions).toHaveBeenCalledWith({
          blockId: 'block-1',
          permissions: [
            { principal: { kind: 'user', userId: 'admin' }, role: 'full' },
            { principal: { kind: 'user', userId: 'worker' }, role: 'full' },
          ],
          spaceId: 'space-1',
        });
      });
    });

    it('offers a client only reading', async () => {
      respondWith(declared([userEntry('admin', 'full')]));
      renderDialog();

      fireEvent.change(await screen.findByLabelText('Add a person'), { target: { value: 'client' } });

      const roles = within(screen.getByLabelText('Role for the new person'))
        .getAllByRole('option')
        .map((option) => option.textContent);
      expect(roles).toEqual(['Can read']);
      expect(screen.getByText('Clients can only read.')).toBeDefined();
    });

    it('goes back to following what is above by saving no declaration', async () => {
      const above = [userEntry('admin', 'full'), spaceEntry('reader')];
      respondWith(declared([userEntry('admin', 'full')], { entries: above, source: parent }));
      const onChanged = mock(() => undefined);
      renderDialog({ onChanged });
      fireEvent.click(await screen.findByRole('button', { name: 'Go back to following “Parent page”' }));

      fireEvent.click(saveButton());

      await waitFor(() => {
        expect(setBlockPermissions).toHaveBeenCalledWith({ blockId: 'block-1', permissions: null, spaceId: 'space-1' });
        expect(onChanged).toHaveBeenCalledWith({ blockId: 'block-1', hasOwnPermissions: false });
      });
    });

    it('offers to go back to following the space when nothing above declares', async () => {
      respondWith(declared([userEntry('admin', 'full')]));
      renderDialog();

      expect(await screen.findByRole('button', { name: 'Go back to following the space' })).toBeDefined();
    });
  });

  describe('locking yourself out', () => {
    it('warns, and asks to confirm, when you give up your access but another person keeps full access', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('worker', 'full')]));
      renderDialog();
      fireEvent.click(await screen.findByRole('button', { name: 'Remove Admin' }));

      expect(screen.getByText(/You will lose access to this page\./)).toBeDefined();
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(screen.getByRole('checkbox', { name: 'I understand and want to continue' }));
      expect((saveButton() as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(saveButton());

      await waitFor(() => {
        expect(setBlockPermissions).toHaveBeenCalledWith({
          blockId: 'block-1',
          permissions: [{ principal: { kind: 'user', userId: 'worker' }, role: 'full' }],
          spaceId: 'space-1',
        });
      });
    });

    it('warns that you keep reading but cannot manage when you lower your own role', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('worker', 'full')]));
      renderDialog();
      fireEvent.change(await screen.findByLabelText('Access for Admin'), { target: { value: 'editor' } });

      expect(screen.getByText(/no longer be able to change who has access here/)).toBeDefined();
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
    });

    it('stops a change after which nobody would hold full access, with no way to confirm it', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('worker', 'reader')]));
      renderDialog();
      fireEvent.change(await screen.findByLabelText('Access for Admin'), { target: { value: 'editor' } });

      expect(screen.getByRole('alert').textContent).toContain('Nobody would be left with full access');
      expect(screen.queryByRole('checkbox', { name: 'I understand and want to continue' })).toBeNull();
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
    });

    it('stops going back to following a parent that would leave you and everyone else without full access', async () => {
      const above = [userEntry('worker', 'editor')];
      respondWith(declared([userEntry('admin', 'full')], { entries: above, source: parent }));
      renderDialog();
      fireEvent.click(await screen.findByRole('button', { name: 'Go back to following “Parent page”' }));

      expect(screen.getByRole('alert')).toBeDefined();
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
    });

    it('does not count a client who was listed as full as someone who could give access back', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('client', 'full')]));
      renderDialog();
      fireEvent.change(await screen.findByLabelText('Access for Admin'), { target: { value: 'reader' } });

      expect(screen.getByRole('alert')).toBeDefined();
    });
  });

  describe('when saving fails', () => {
    it('says the person no longer has full access', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('worker', 'reader')]));
      setBlockPermissions.mockImplementation(async () => ({ serverError: 'forbidden' }));
      const onClose = mock(() => undefined);
      renderDialog({ onClose });
      fireEvent.change(await screen.findByLabelText('Access for Worker'), { target: { value: 'editor' } });

      fireEvent.click(saveButton());

      expect(await screen.findByText('You do not have full access, so you cannot change this.')).toBeDefined();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('says a locked page cannot change who has access', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('worker', 'reader')]));
      setBlockPermissions.mockImplementation(async () => ({ serverError: 'locked' }));
      renderDialog();
      fireEvent.change(await screen.findByLabelText('Access for Worker'), { target: { value: 'editor' } });

      fireEvent.click(saveButton());

      expect(await screen.findByText('The page is locked. Unlock it to change who has access.')).toBeDefined();
    });

    it('says nobody would keep full access when the server refuses the change for that reason', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('worker', 'reader')]));
      setBlockPermissions.mockImplementation(async () => ({ serverError: 'conflict' }));
      renderDialog();
      fireEvent.change(await screen.findByLabelText('Access for Worker'), { target: { value: 'editor' } });

      fireEvent.click(saveButton());

      expect(
        await screen.findByText('The server refused it: nobody would be left with full access to this block.'),
      ).toBeDefined();
    });

    it('keeps the draft and says to try again after any other failure', async () => {
      respondWith(declared([userEntry('admin', 'full'), userEntry('worker', 'reader')]));
      setBlockPermissions.mockImplementation(async () => ({ serverError: 'offline' }));
      renderDialog();
      fireEvent.change(await screen.findByLabelText('Access for Worker'), { target: { value: 'editor' } });

      fireEvent.click(saveButton());

      expect(await screen.findByText('Could not update the access. Try again.')).toBeDefined();
      expect((screen.getByLabelText('Access for Worker') as HTMLSelectElement).value).toBe('editor');
    });
  });
});
