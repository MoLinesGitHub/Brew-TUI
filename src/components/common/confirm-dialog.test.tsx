import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ConfirmDialog } from './confirm-dialog.js';
import { useModalStore } from '../../stores/modal-store.js';
import { useLocaleStore } from '../../i18n/index.js';

beforeEach(() => {
  useModalStore.setState({ _count: 0, isOpen: false });
  useLocaleStore.setState({ locale: 'en' });
});

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' });
});

describe('<ConfirmDialog>', () => {
  it('opens the modal store while mounted and releases on unmount', () => {
    const { unmount } = render(<ConfirmDialog message="really?" onConfirm={() => {}} onCancel={() => {}} />);
    expect(useModalStore.getState()._count).toBe(1);
    expect(useModalStore.getState().isOpen).toBe(true);

    unmount();
    expect(useModalStore.getState()._count).toBe(0);
    expect(useModalStore.getState().isOpen).toBe(false);
  });

  it('renders the message in the dialog body', () => {
    const { lastFrame } = render(<ConfirmDialog message="delete wget?" onConfirm={() => {}} onCancel={() => {}} />);
    expect(lastFrame()).toContain('delete wget?');
  });

  it('routes y/Y to onConfirm and n/N to onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { stdin } = render(<ConfirmDialog message="?" onConfirm={onConfirm} onCancel={onCancel} />);

    stdin.write('y');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    stdin.write('N');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('routes Spanish s/S to onConfirm only when locale is es', () => {
    useLocaleStore.setState({ locale: 'es' });
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { stdin } = render(<ConfirmDialog message="?" onConfirm={onConfirm} onCancel={onCancel} />);

    stdin.write('s');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not accept s/S when locale is en (audit i18n contract)', () => {
    useLocaleStore.setState({ locale: 'en' });
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { stdin } = render(<ConfirmDialog message="?" onConfirm={onConfirm} onCancel={onCancel} />);

    stdin.write('s');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
