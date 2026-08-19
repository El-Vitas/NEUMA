import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { SidebarTreeResizeHandle } from '@/shared/components/portal/sidebar/sidebar-tree-resize-handle';
import en from '../../../../../../messages/en.json';

describe('SidebarTreeResizeHandle', () => {
  it('is a real slider carrying its current width and range, not a role pretending to be one', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SidebarTreeResizeHandle onChangeWidth={() => undefined} onPointerDown={() => undefined} width={260} />
      </NextIntlClientProvider>,
    );

    const handle = screen.getByRole('slider', { name: 'Resize the page tree' }) as HTMLInputElement;
    expect(handle.getAttribute('type')).toBe('range');
    expect(handle.getAttribute('min')).toBe('220');
    expect(handle.getAttribute('max')).toBe('480');
    expect(handle.value).toBe('260');
  });

  it('reports a width the browser changed on its own, such as with the arrow keys', () => {
    const onChangeWidth = mock(() => undefined);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SidebarTreeResizeHandle onChangeWidth={onChangeWidth} onPointerDown={() => undefined} width={260} />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByRole('slider', { name: 'Resize the page tree' }), { target: { value: '276' } });

    expect(onChangeWidth).toHaveBeenCalledWith(276);
  });

  it('lets the caller take over the drag instead of the native one', () => {
    const onPointerDown = mock(() => undefined);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SidebarTreeResizeHandle onChangeWidth={() => undefined} onPointerDown={onPointerDown} width={260} />
      </NextIntlClientProvider>,
    );

    fireEvent.pointerDown(screen.getByRole('slider', { name: 'Resize the page tree' }));

    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });
});
