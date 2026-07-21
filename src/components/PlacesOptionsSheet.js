import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilter } from './CategoryFilter';
import { SORT_OPTIONS } from '../utils/attractionSort';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Bottom sheet for sort + category filters.
 */
export function PlacesOptionsSheet({
  visible,
  onClose,
  sortId,
  onSortChange,
  selectedCategories,
  onCategoriesChange,
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Sort & filters</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Sort by</Text>
            <View style={styles.sortList}>
              {SORT_OPTIONS.map((option) => {
                const selected = option.id === sortId;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onSortChange?.(option.id)}
                    style={[styles.sortRow, selected && styles.sortRowSelected]}
                  >
                    <View style={styles.sortCopy}>
                      <Text
                        style={[
                          styles.sortLabel,
                          selected && styles.sortLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.sortDescription}>
                        {option.description}
                      </Text>
                    </View>
                    <View
                      style={[styles.radio, selected && styles.radioSelected]}
                    />
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, styles.sectionSpaced]}>
              Categories
            </Text>
            <Text style={styles.helper}>
              Tourist now includes aquariums and zoos by default.
            </Text>
            <CategoryFilter
              selectedIds={selectedCategories}
              onChange={onCategoriesChange}
              horizontal={false}
            />
          </ScrollView>

          <Pressable style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  sectionSpaced: {
    marginTop: spacing.lg,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  sortList: {
    gap: spacing.sm,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sortRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sortCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  sortLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  sortLabelSelected: {
    color: colors.primaryDark,
  },
  sortDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  doneButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    alignItems: 'center',
    paddingVertical: 14,
  },
  doneText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
