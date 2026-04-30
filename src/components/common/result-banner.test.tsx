import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import { ResultBanner } from './result-banner.js';

// First UI test in the suite — establishes the pattern that future component
// tests can copy. Renders the component into a virtual terminal and asserts on
// the captured frame, no real TTY required.

describe('<ResultBanner>', () => {
  it('renders the message verbatim for each status', () => {
    for (const status of ['success', 'error', 'warning', 'info'] as const) {
      const { lastFrame } = render(<ResultBanner status={status} message={`message-${status}`} />);
      expect(lastFrame()).toContain(`message-${status}`);
    }
  });

  it('uses a rounded border (Box borderStyle="round")', () => {
    const { lastFrame } = render(<ResultBanner status="success" message="hi" />);
    // Rounded border characters are ╭ ╮ ╰ ╯
    const frame = lastFrame() ?? '';
    expect(frame).toMatch(/[╭╮╰╯]/);
  });
});
