import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { t, useLocaleStore } from '../../i18n/index.js';
import { useModalStore } from '../../stores/modal-store.js';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  const locale = useLocaleStore((s) => s.locale);
  const { openModal, closeModal } = useModalStore();

  useEffect(() => {
    openModal();
    return () => { closeModal(); };
  }, []);

  useInput((input, key) => {
    if (input === 'y' || input === 'Y') onConfirm();
    else if (locale === 'es' && (input === 's' || input === 'S')) onConfirm();
    else if (input === 'n' || input === 'N') onCancel();
    else if (key.escape) onCancel();
  });

  return (
    <Box borderStyle="double" borderColor="magentaBright" paddingX={2} paddingY={1} flexDirection="column">
      <Text bold color="white">{message}</Text>
      <Box marginTop={1}>
        <Text color="greenBright">{t('confirm_yes')}</Text>
        <Text> / </Text>
        <Text color="redBright">{t('confirm_no')}</Text>
      </Box>
    </Box>
  );
}
