import React from 'react';
import { Box } from 'ink';
import { Header } from './header.js';
import { Footer } from './footer.js';
import { SPACING } from '../../utils/spacing.js';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box flexDirection="column" width="100%">
      <Header />
      <Box flexDirection="column" flexGrow={1} paddingX={SPACING.sm} paddingY={SPACING.xs}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
