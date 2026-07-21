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
        left={<TextInput.Icon icon="map-search-outline" />}
      />
      <Button
        mode="contained"
        onPress={onSearch}
        loading={loading}
        disabled={loading || !value?.trim()}
        style={styles.button}
        contentStyle={styles.buttonContent}
        buttonColor={colors.secondary}
        textColor="#FFFFFF"
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
    backgroundColor: colors.surface,
  },
  button: {
    borderRadius: radii.md,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
});
