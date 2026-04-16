import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useSecurityStore } from '../stores/security-store.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatCard } from '../components/common/stat-card.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { t, tp } from '../i18n/index.js';
import type { Severity } from '../lib/security/types.js';

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: 'red',
  HIGH: 'red',
  MEDIUM: 'yellow',
  LOW: 'gray',
  UNKNOWN: 'gray',
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

  useEffect(() => { scan(); }, []);

  const results = summary?.results ?? [];

  useInput((input, key) => {
    if (input === 'r') { void scan(); return; }

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
      <Text bold>{'\u{1F6E1}\uFE0F'}  {t('security_title')}</Text>

      {summary && (
        <Box gap={1} marginY={1}>
          <StatCard label={t('security_scanned')} value={summary.totalPackages} color="cyan" />
          <StatCard
            label={t('security_vulnerable')}
            value={summary.vulnerablePackages}
            color={summary.vulnerablePackages > 0 ? 'red' : 'green'}
          />
          {summary.criticalCount > 0 && <StatCard label={t('security_critical')} value={summary.criticalCount} color="red" />}
          {summary.highCount > 0 && <StatCard label={t('security_high')} value={summary.highCount} color="red" />}
          {summary.mediumCount > 0 && <StatCard label={t('security_medium')} value={summary.mediumCount} color="yellow" />}
        </Box>
      )}

      {results.length === 0 && summary && (
        <Box marginTop={1}>
          <Text color="green" bold>{'\u2714'} {t('security_noVulns')}</Text>
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
                  <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u25B6' : ' '}</Text>
                  <StatusBadge label={pkg.maxSeverity} variant={SEVERITY_BADGE[pkg.maxSeverity]} />
                  <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? 'white' : 'gray'}>
                    {pkg.packageName}
                  </Text>
                  <Text color="gray">{pkg.installedVersion}</Text>
                  <Text color="gray">{tp('plural_vulns', pkg.vulnerabilities.length)}</Text>
                  <Text color="gray">{isExpanded ? '\u25BC' : '\u25B6'}</Text>
                </Box>

                {isExpanded && (
                  <Box flexDirection="column" paddingLeft={4} marginBottom={1}>
                    {pkg.vulnerabilities.map((vuln) => (
                      <Box key={vuln.id} flexDirection="column" marginBottom={1}>
                        <Box gap={1}>
                          <Text color={SEVERITY_COLORS[vuln.severity]} bold>{vuln.id}</Text>
                          <Text color="gray">[{vuln.severity}]</Text>
                        </Box>
                        <Text color="gray" wrap="wrap">{vuln.summary}</Text>
                        {vuln.fixedVersion && (
                          <Text color="green">{t('security_fixedIn', { version: vuln.fixedVersion })}</Text>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}

          <Box marginTop={1}>
            <Text color="gray">
              {cursor + 1}/{results.length} {'\u2502'} enter:{t('hint_expand')} r:{t('hint_rescan')}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
