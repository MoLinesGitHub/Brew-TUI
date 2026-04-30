import { beforeEach, describe, expect, it } from 'vitest';
import { useNavigationStore, getNextView, getPrevView, VIEWS } from './navigation-store.js';

beforeEach(() => {
  useNavigationStore.setState({
    currentView: 'dashboard',
    selectedPackage: null,
    selectedPackageType: null,
    viewHistory: [],
  });
});

describe('navigation-store: navigate / goBack', () => {
  it('navigates to a new view and pushes the previous onto history', () => {
    useNavigationStore.getState().navigate('installed');
    const s = useNavigationStore.getState();
    expect(s.currentView).toBe('installed');
    expect(s.viewHistory).toEqual(['dashboard']);
  });

  it('is a no-op when navigating to the current view', () => {
    useNavigationStore.getState().navigate('dashboard');
    const s = useNavigationStore.getState();
    expect(s.currentView).toBe('dashboard');
    expect(s.viewHistory).toEqual([]);
  });

  it('goBack pops the last view from history', () => {
    const { navigate, goBack } = useNavigationStore.getState();
    navigate('installed');
    navigate('outdated');
    goBack();
    const s = useNavigationStore.getState();
    expect(s.currentView).toBe('installed');
    expect(s.viewHistory).toEqual(['dashboard']);
  });

  it('goBack is a no-op when history is empty', () => {
    useNavigationStore.getState().goBack();
    const s = useNavigationStore.getState();
    expect(s.currentView).toBe('dashboard');
    expect(s.viewHistory).toEqual([]);
  });

  it('caps history at 20 entries (drops the oldest)', () => {
    const { navigate } = useNavigationStore.getState();
    // Alternate between two views to push 25 entries onto history.
    for (let i = 0; i < 25; i++) {
      navigate(i % 2 === 0 ? 'installed' : 'outdated');
    }
    expect(useNavigationStore.getState().viewHistory.length).toBeLessThanOrEqual(20);
  });
});

describe('navigation-store: selectPackage', () => {
  it('records package name and type', () => {
    useNavigationStore.getState().selectPackage('wget', 'formula');
    const s = useNavigationStore.getState();
    expect(s.selectedPackage).toBe('wget');
    expect(s.selectedPackageType).toBe('formula');
  });

  it('defaults the type to null', () => {
    useNavigationStore.getState().selectPackage('wget');
    expect(useNavigationStore.getState().selectedPackageType).toBeNull();
  });

  it('clears the selection with null', () => {
    useNavigationStore.getState().selectPackage('wget', 'formula');
    useNavigationStore.getState().selectPackage(null);
    const s = useNavigationStore.getState();
    expect(s.selectedPackage).toBeNull();
    expect(s.selectedPackageType).toBeNull();
  });
});

describe('navigation-store: tab cycle helpers', () => {
  it('VIEWS contains the canonical ordered tab list', () => {
    expect(VIEWS[0]).toBe('dashboard');
    expect(VIEWS).toContain('account');
  });

  it('getNextView wraps from the last entry to the first', () => {
    const last = VIEWS[VIEWS.length - 1]!;
    expect(getNextView(last)).toBe(VIEWS[0]);
  });

  it('getPrevView wraps from the first entry to the last', () => {
    expect(getPrevView(VIEWS[0]!)).toBe(VIEWS[VIEWS.length - 1]);
  });

  it('cycles forward and backward consistently', () => {
    const middle = VIEWS[Math.floor(VIEWS.length / 2)]!;
    expect(getPrevView(getNextView(middle))).toBe(middle);
  });

  // Documented limitation (audit B5): 'search' is not part of VIEWS, so
  // getNextView('search') returns VIEWS[0] (indexOf is -1 + 1 = 0). Lock the
  // current behavior so a future change to include it has to update the test.
  it('treats unlisted views (e.g. search) as before-VIEWS[0]', () => {
    expect(getNextView('search')).toBe(VIEWS[0]);
  });
});
