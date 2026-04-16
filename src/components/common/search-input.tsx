import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';

interface SearchInputProps {
  defaultValue?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isActive?: boolean;
}

export function SearchInput({ defaultValue, onChange, placeholder = 'Type to filter...', isActive = true }: SearchInputProps) {
  return (
    <Box>
      <Text color="cyan">{'\u{1F50D}'} </Text>
      {isActive ? (
        <TextInput
          placeholder={placeholder}
          defaultValue={defaultValue}
          onChange={onChange}
        />
      ) : (
        <Text color="gray">{defaultValue || placeholder}</Text>
      )}
    </Box>
  );
}
