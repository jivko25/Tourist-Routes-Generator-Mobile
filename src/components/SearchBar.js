import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Reusable city search input + action button.
 */
export function SearchBar({
  value,
  onChangeText,
  onSearch,
  loading = false,
  placeholder = 'Search city',
}) {
  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label={placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSearch}
        returnKeyType="search"
        autoCapitalize="words"
        autoCorrect={false}
        disabled={loading}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        style={styles.input}
        outlineStyle={styles.outline}
        left={<TextInput.Icon icon="magnify" color={colors.primary} />}
      />
      <Button
        mode="contained"
        onPress={onSearch}
        loading={loading}
        disabled={loading || !value?.trim()}
        style={styles.button}
        contentStyle={styles.buttonContent}
        buttonColor={colors.primary}
        textColor="#FFFFFF"
        labelStyle={styles.buttonLabel}
      >
        Search
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
  outline: {
    borderRadius: radii.md,
  },
  button: {
    borderRadius: radii.pill,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  buttonLabel: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
