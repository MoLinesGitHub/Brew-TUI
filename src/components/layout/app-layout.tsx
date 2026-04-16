import React from 'react';
import { Box } from 'ink';
import { Header } from './header.js';
import { Footer } from './footer.js';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box flexDirection="column" width="100%">
      <Header />
      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
