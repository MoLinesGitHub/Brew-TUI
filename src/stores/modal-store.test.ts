import { beforeEach, describe, expect, it } from 'vitest';
import { useModalStore } from './modal-store.js';

// The reference-counter behavior is the whole point of this store. A boolean
// would let an inner ConfirmDialog's closeModal release the suppressor while
// an outer SearchView is still expecting global keys to be blocked. Lock the
// counter semantics here so any future refactor (e.g. converting to a Set of
// owners or back to a boolean) has to preserve them.

beforeEach(() => {
  useModalStore.setState({ _count: 0, isOpen: false });
});

describe('modal-store', () => {
  it('starts closed', () => {
    const s = useModalStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s._count).toBe(0);
  });

  it('opens after a single openModal()', () => {
    useModalStore.getState().openModal();
    const s = useModalStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s._count).toBe(1);
  });

  it('stays open while nested suppressors are active', () => {
    const { openModal, closeModal } = useModalStore.getState();
    openModal(); // outer
    openModal(); // inner
    expect(useModalStore.getState()._count).toBe(2);
    expect(useModalStore.getState().isOpen).toBe(true);

    closeModal(); // inner closes
    expect(useModalStore.getState()._count).toBe(1);
    expect(useModalStore.getState().isOpen).toBe(true);

    closeModal(); // outer closes
    expect(useModalStore.getState()._count).toBe(0);
    expect(useModalStore.getState().isOpen).toBe(false);
  });

  it('clamps the counter at zero on excess closeModal()', () => {
    useModalStore.getState().closeModal();
    useModalStore.getState().closeModal();
    expect(useModalStore.getState()._count).toBe(0);
    expect(useModalStore.getState().isOpen).toBe(false);
  });

  it('survives interleaved open/close pairs', () => {
    const { openModal, closeModal } = useModalStore.getState();
    openModal();
    openModal();
    closeModal();
    openModal();
    closeModal();
    closeModal();
    expect(useModalStore.getState()._count).toBe(0);
    expect(useModalStore.getState().isOpen).toBe(false);
  });
});
