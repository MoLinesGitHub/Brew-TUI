import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useSecurityStore } from '../stores/security-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatCard } from '../components/common/stat-card.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { SectionHeader } from '../components/common/section-header.js';
import { GRADIENTS } from '../utils/gradient.js';
import { t, tp } from '../i18n/index.js';
import type { Severity } from '../lib/security/types.js';

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#6B7280',
  UNKNOWN: '#6B7280',
};

const SEVERITY_BADGE: Record<Severity, 'error' | 'warning' | 'muted'> = {
  CRITICAL: 'error',
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'muted',
  UNKNOWN: 'muted',
};

export function SecurityAuditView() {
  const { summary, loading, error, scan } = useSecurityStore();
  const [cursor, setCursor] = useState(0);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [confirmUpgrade, setConfirmUpgrade] = useState<string | null>(null);
  const stream = useBrewStream();

  useEffect(() => { scan(); }, []);

  const results = summary?.results ?? [];

  useInput((input, key) => {
    if (confirmUpgrade || stream.isRunning) return;

    if (input === 'r') { void scan(); return; }
    if (input === 'u' && results[cursor]) {
      setConfirmUpgrade(results[cursor].packageName);
      return;
    }

    if (input === 'j' || key.downArrow) setCursor((c) => Math.min(c + 1, Math.max(0, results.length - 1)));
    else if (input === 'k' || key.upArrow) setCursor((c) => Math.max(c - 1, 0));
    else if (key.return && results[cursor]) {
      setExpandedPkg(expandedPkg === results[cursor].packageName ? null : results[cursor].packageName);
    }
  });

  if (loading) return <Loading message={t('loading_security')} />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <Box flexDirection="column">
      <SectionHeader emoji={'\u{1F6E1}\uFE0F'} title={t('security_title')} gradient={GRADIENTS.ocean} />

      {summary && (
        <Box gap={1} marginY={1}>
          <StatCard label={t('security_scanned')} value={summary.totalPackages} color="#06B6D4" />
          <StatCard
            label={t('security_vulnerable')}
            value={summary.vulnerablePackages}
            color={summary.vulnerablePackages > 0 ? '#EF4444' : '#22C55E'}
          />
          {summary.criticalCount > 0 && <StatCard label={t('security_critical')} value={summary.criticalCount} color="#EF4444" />}
          {summary.highCount > 0 && <StatCard label={t('security_high')} value={summary.highCount} color="#EF4444" />}
          {summary.mediumCount > 0 && <StatCard label={t('security_medium')} value={summary.mediumCount} color="#F59E0B" />}
        </Box>
      )}

      {results.length === 0 && summary && (
        <Box marginTop={1}>
          <Box borderStyle="round" borderColor="#22C55E" paddingX={2} paddingY={0}>
            <Text color="#22C55E" bold>{'\u2714'} {t('security_noVulns')}</Text>
          </Box>
        </Box>
      )}

      {confirmUpgrade && (
        <Box marginY={1}>
          <ConfirmDialog
            message={t('security_confirmUpgrade', { name: confirmUpgrade })}
            onConfirm={async () => {
              const name = confirmUpgrade;
              setConfirmUpgrade(null);
              await stream.run(['upgrade', name]);
              void scan();
            }}
            onCancel={() => setConfirmUpgrade(null)}
          />
        </Box>
      )}

      {(stream.isRunning || stream.lines.length > 0) && (
        <Box marginY={1}>
          <ProgressLog lines={stream.lines} isRunning={stream.isRunning} title={t('hint_upgrade')} />
        </Box>
      )}

      {results.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {results.map((pkg, i) => {
            const isCurrent = i === cursor;
            const isExpanded = expandedPkg === pkg.packageName;

            return (
              <Box key={pkg.packageName} flexDirection="column">
                <Box gap={1}>
                  <Text color={isCurrent ? '#22C55E' : '#9CA3AF'}>{isCurrent ? '\u25B6' : ' '}</Text>
                  <StatusBadge label={pkg.maxSeverity} variant={SEVERITY_BADGE[pkg.maxSeverity]} />
                  <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? '#F9FAFB' : '#9CA3AF'}>
                    {pkg.packageName}
                  </Text>
                  <Text color="#9CA3AF">{pkg.installedVersion}</Text>
                  <Text color="#9CA3AF">{tp('plural_vulns', pkg.vulnerabilities.length)}</Text>
                  <Text color="#9CA3AF">{isExpanded ? '\u25BC' : '\u25B6'}</Text>
                </Box>

                {isExpanded && (
                  <Box flexDirection="column" paddingLeft={4} marginBottom={1}>
                    {pkg.vulnerabilities.map((vuln) => (
                      <Box key={vuln.id} flexDirection="column" marginBottom={1}>
                        <Box gap={1}>
                          <Text color={SEVERITY_COLORS[vuln.severity]} bold>{vuln.id}</Text>
                          <Text color="#9CA3AF">[{vuln.severity}]</Text>
                        </Box>
                        <Text color="#9CA3AF" wrap="wrap">{vuln.summary}</Text>
                        {vuln.fixedVersion && (
                          <Text color="#22C55E">{t('security_fixedIn', { version: vuln.fixedVersion })}</Text>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}

          <Box marginTop={1}>
            <Text color="#F9FAFB" bold>
              {cursor + 1}/{results.length}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
