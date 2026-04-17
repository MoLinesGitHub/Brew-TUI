import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { SectionHeader } from '../components/common/section-header.js';
import { GRADIENTS } from '../utils/gradient.js';
import { t, tp } from '../i18n/index.js';

export function DoctorView() {
  const { doctorWarnings, doctorClean, loading, errors, fetchDoctor } = useBrewStore();

  useEffect(() => { fetchDoctor(); }, []);

  useInput((input) => {
    if (input === 'r') void fetchDoctor();
  });

  if (loading.doctor) return <Loading message={t('loading_doctor')} />;
  if (errors.doctor) return <ErrorMessage message={errors.doctor} />;

  return (
    <Box flexDirection="column">
      <SectionHeader emoji={'\u{1FA7A}'} title={t('doctor_title')} gradient={GRADIENTS.emerald} />

      <Box flexDirection="column" marginTop={1}>
        {doctorClean && (
          <Box borderStyle="round" borderColor="#22C55E" paddingX={2} paddingY={0}>
            <Text color="#22C55E" bold>{'\u2714'} {t('doctor_clean')}</Text>
          </Box>
        )}

        {doctorClean === false && doctorWarnings.length === 0 && (
          <Text color="#F59E0B">{t('doctor_warningsNotCaptured')}</Text>
        )}

        {doctorWarnings.map((warning, i) => (
          <Box key={i} flexDirection="column" marginBottom={1} borderStyle="single" borderColor="#F59E0B" paddingX={1}>
            {warning.split('\n').map((line, j) => (
              <Text key={j} color={j === 0 ? '#F59E0B' : '#9CA3AF'}>{line}</Text>
            ))}
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="#F9FAFB" bold>
          {doctorWarnings.length > 0 ? tp('plural_warnings', doctorWarnings.length) : ''}
        </Text>
      </Box>
    </Box>
  );
}
