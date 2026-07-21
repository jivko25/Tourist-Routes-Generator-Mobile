import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PLACE_CATEGORIES } from '../constants/placeCategories';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Pill chips for place categories — light blue selected state.
 */
export function CategoryFilter({
  selectedIds = [],
  onChange,
  horizontal = true,
}) {
  const toggleCategory = (categoryId) => {
    const isSelected = selectedIds.includes(categoryId);

    if (isSelected) {
      if (selectedIds.length === 1) return;
      onChange?.(selectedIds.filter((id) => id !== categoryId));
      return;
    }

    onChange?.([...selectedIds, categoryId]);
  };

  const content = PLACE_CATEGORIES.map((category) => {
    const selected = selectedIds.includes(category.id);
    return (
      <Pressable
        key={category.id}
        onPress={() => toggleCategory(category.id)}
        style={[styles.chip, selected && styles.chipSelected]}
      >
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
          {category.label}
        </Text>
      </Pressable>
    );
  });

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.wrap}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radii.pill,
    backgroundColor: colors.chip,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
