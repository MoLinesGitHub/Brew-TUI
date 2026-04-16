import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { Loading } from '../components/common/loading.js';

export function DoctorView() {
  const { doctorWarnings, doctorClean, loading, fetchDoctor } = useBrewStore();

  useEffect(() => { fetchDoctor(); }, []);

  useInput((input) => {
    if (input === 'r') fetchDoctor();
  });

  if (loading.doctor) return <Loading message="Running brew doctor... (this may take a moment)" />;

  return (
    <Box flexDirection="column">
      <Text bold>{'\u{1FA7A}'} Homebrew Doctor</Text>

      <Box flexDirection="column" marginTop={1}>
        {doctorClean && (
          <Box>
            <Text color="green" bold>{'\u2714'} Your system is ready to brew.</Text>
          </Box>
        )}

        {doctorClean === false && doctorWarnings.length === 0 && (
          <Text color="yellow">Doctor finished with warnings but none were captured.</Text>
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
          {doctorWarnings.length > 0 ? `${doctorWarnings.length} warning(s)` : ''}
          {' '}{'\u2502'} r:refresh
        </Text>
      </Box>
    </Box>
  );
}
