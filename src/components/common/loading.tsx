import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';

interface LoadingProps {
  message?: string;
}

export function Loading({ message = 'Loading...' }: LoadingProps) {
  return (
    <Box paddingY={1}>
      <Spinner label={message} />
    </Box>
  );
}

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <Box paddingY={1}>
      <Text color="red" bold>{'\u2718'} Error: </Text>
      <Text color="red">{message}</Text>
    </Box>
  );
}
