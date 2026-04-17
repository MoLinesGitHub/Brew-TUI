import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { t } from '../../i18n/index.js';

interface SearchInputProps {
  defaultValue?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isActive?: boolean;
}

export function SearchInput({ defaultValue, onChange, placeholder, isActive = true }: SearchInputProps) {
  const resolvedPlaceholder = placeholder ?? t('searchInput_placeholder');
  return (
    <Box>
      <Text color="#FFD700">{'\u{1F50D}'} </Text>
      {isActive ? (
        <TextInput
          placeholder={resolvedPlaceholder}
          defaultValue={defaultValue}
          onChange={onChange}
        />
      ) : (
        <Text color="#6B7280">{defaultValue || placeholder}</Text>
      )}
    </Box>
  );
}
