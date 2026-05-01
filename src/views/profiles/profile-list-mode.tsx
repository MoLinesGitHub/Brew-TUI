import React from 'react';
import { Box, Text } from 'ink';
import { ConfirmDialog } from '../../components/common/confirm-dialog.js';
import { SectionHeader } from '../../components/common/section-header.js';
import { COLORS } from '../../utils/colors.js';
import { SelectableRow } from '../../components/common/selectable-row.js';
import { GRADIENTS } from '../../utils/gradient.js';
import { t } from '../../i18n/index.js';
import { SPACING } from '../../utils/spacing.js';

interface ProfileListModeProps {
  profileNames: string[];
  cursor: number;
  confirmDelete: boolean;
  loadError: string | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export function ProfileListMode({ profileNames, cursor, confirmDelete, loadError, onConfirmDelete, onCancelDelete }: ProfileListModeProps) {
  return (
    <Box flexDirection="column">
      <SectionHeader emoji={'\u{1F4C1}'} title={t('profiles_title', { count: profileNames.length })} gradient={GRADIENTS.gold} />

      {/* SCR-004: Display load errors */}
      {loadError && (
        <Box marginY={SPACING.xs}>
          <Text color={COLORS.error}>{loadError}</Text>
        </Box>
      )}

      {confirmDelete && profileNames[cursor] && (
        <Box marginY={SPACING.xs}>
          <ConfirmDialog
            message={t('profiles_confirmDelete', { name: profileNames[cursor] })}
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
          />
        </Box>
      )}

      {profileNames.length === 0 && !confirmDelete && (
        <Box marginTop={SPACING.xs} borderStyle="round" borderColor={COLORS.textSecondary} paddingX={SPACING.sm} paddingY={SPACING.none}>
          <Box flexDirection="column">
            <Text color={COLORS.textSecondary} italic>{t('profiles_noProfiles')}</Text>
            <Text color={COLORS.muted}>{t('profiles_press')} <Text color={COLORS.gold} bold>n</Text> {t('profiles_exportHint')}</Text>
          </Box>
        </Box>
      )}

      {profileNames.length > 0 && !confirmDelete && (
        <Box flexDirection="column" marginTop={SPACING.xs}>
          {profileNames.map((name, i) => {
            const isCurrent = i === cursor;
            return (
              <SelectableRow key={name} isCurrent={isCurrent}>
                <Text bold={isCurrent} inverse={isCurrent}>{name}</Text>
              </SelectableRow>
            );
          })}
          <Box marginTop={SPACING.xs}>
            <Text color={COLORS.text} bold>{cursor + 1}/{profileNames.length}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
