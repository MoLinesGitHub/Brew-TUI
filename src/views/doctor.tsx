import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
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
      <Text bold>{'\u{1FA7A}'} {t('doctor_title')}</Text>

      <Box flexDirection="column" marginTop={1}>
        {doctorClean && (
          <Box>
            <Text color="green" bold>{'\u2714'} {t('doctor_clean')}</Text>
          </Box>
        )}

        {doctorClean === false && doctorWarnings.length === 0 && (
          <Text color="yellow">{t('doctor_warningsNotCaptured')}</Text>
        )}

        {doctorWarnings.map((warning, i) => (
          <Box key={i} flexDirection="column" marginBottom={1} borderStyle="single" borderColor="yellow" paddingX={1}>
            {warning.split('\n').map((line, j) => (
              <Text key={j} color={j === 0 ? 'yellow' : 'gray'}>{line}</Text>
            ))}
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          {doctorWarnings.length > 0 ? tp('plural_warnings', doctorWarnings.length) : ''}
          {' '}{'\u2502'} r:{t('hint_refresh')}
        </Text>
      </Box>
    </Box>
  );
}
