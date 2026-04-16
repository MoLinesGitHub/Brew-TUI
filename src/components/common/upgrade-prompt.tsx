import React from 'react';
import { Box, Text } from 'ink';
import type { ViewId } from '../../lib/types.js';

const FEATURE_INFO: Record<string, { title: string; description: string }> = {
  profiles: {
    title: 'Package Profiles',
    description: 'Export and import your Homebrew setup across machines. Save named profiles for work, personal, or project-specific configurations.',
  },
  'smart-cleanup': {
    title: 'Smart Cleanup',
    description: 'Find orphaned packages, analyze disk usage per package, and reclaim disk space with one-click intelligent cleanup.',
  },
  history: {
    title: 'Action History',
    description: 'Track every install, uninstall, and upgrade with timestamps. Search and filter your package management history.',
  },
  'security-audit': {
    title: 'Security Audit',
    description: 'Scan installed packages against known vulnerabilities (CVEs). See severity levels, affected versions, and available fixes.',
  },
};

interface UpgradePromptProps {
  viewId: ViewId;
}

export function UpgradePrompt({ viewId }: UpgradePromptProps) {
  const info = FEATURE_INFO[viewId];
  if (!info) return null;

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      <Box
        borderStyle="double"
        borderColor="yellow"
        paddingX={4}
        paddingY={2}
        flexDirection="column"
        alignItems="center"
      >
        <Text bold color="yellow">{'\u2B50'} {info.title} — Pro Feature</Text>
        <Text> </Text>
        <Text color="white">{info.description}</Text>
        <Text> </Text>
        <Box flexDirection="column" alignItems="center">
          <Text color="cyan" bold>$9/month or $49/year</Text>
          <Text> </Text>
          <Text color="gray">Activate with:</Text>
          <Text color="green" bold>  brew-tui activate {'<'}your-license-key{'>'}</Text>
          <Text> </Text>
          <Text color="gray">Brew-TUI Pro — $9/month or $49/year</Text>
        </Box>
      </Box>
    </Box>
  );
}
