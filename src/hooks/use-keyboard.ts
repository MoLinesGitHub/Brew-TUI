import { useInput } from 'ink';
import { useNavigationStore, getNextView, getPrevView } from '../stores/navigation-store.js';
import type { ViewId } from '../lib/types.js';

const VIEW_KEYS: Record<string, ViewId> = {
  '1': 'dashboard',
  '2': 'installed',
  '3': 'search',
  '4': 'outdated',
  '5': 'services',
  '6': 'doctor',
  '7': 'profiles',
  '8': 'smart-cleanup',
  '9': 'history',
  '0': 'security-audit',
};

export function useGlobalKeyboard(opts?: { onQuit?: () => void; disabled?: boolean }) {
  const navigate = useNavigationStore((s) => s.navigate);
  const currentView = useNavigationStore((s) => s.currentView);
  const goBack = useNavigationStore((s) => s.goBack);

  useInput((input, key) => {
    if (opts?.disabled) return;

    if (input === 'q' || (key.ctrl && input === 'c')) {
      opts?.onQuit?.();
      return;
    }

    if (key.escape) {
      goBack();
      return;
    }

    if (key.tab && key.shift) {
      navigate(getPrevView(currentView));
      return;
    }
    if (key.tab) {
      navigate(getNextView(currentView));
      return;
    }

    if (input in VIEW_KEYS) {
      navigate(VIEW_KEYS[input]!);
    }
  }, { isActive: !opts?.disabled });
}
