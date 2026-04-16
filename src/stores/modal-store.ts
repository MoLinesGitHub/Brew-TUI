import { create } from 'zustand';

interface ModalState {
  // Reference counter: >0 means at least one suppressor is active.
  // Using a counter (not a boolean) prevents a nested suppressor's cleanup
  // from prematurely unblocking global keyboard when a sibling suppressor is
  // still active (e.g. SearchView holds results open while a ConfirmDialog
  // mounts and then dismisses).
  _count: number;
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  _count: 0,
  isOpen: false,
  openModal: () =>
    set((s) => {
      const next = s._count + 1;
      return { _count: next, isOpen: next > 0 };
    }),
  closeModal: () =>
    set((s) => {
      const next = Math.max(0, s._count - 1);
      return { _count: next, isOpen: next > 0 };
    }),
}));
