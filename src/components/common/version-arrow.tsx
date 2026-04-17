import React from 'react';
import { Text } from 'ink';

interface VersionArrowProps {
  current: string;
  latest: string;
}

export function VersionArrow({ current, latest }: VersionArrowProps) {
  return (
    <>
      <Text color="#EF4444">{current}</Text>
      <Text color="#F59E0B">{' \u2500\u2500 '}</Text>
      <Text color="#FFD700">{'\u25B6'}</Text>
      <Text color="#2DD4BF"> {latest}</Text>
    </>
  );
}
