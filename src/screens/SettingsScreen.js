import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryFilter } from '../components/CategoryFilter';
import { useTravel } from '../context/TravelContext';
import {
  MAX_SEARCH_RADIUS_METERS,
  MIN_SEARCH_RADIUS_METERS,
  RADIUS_PRESETS,
  TRAVEL_MODES,
} from '../utils/config';
import { formatRadiusLabel } from '../utils/googleMaps';
import { formatSelectedCategoriesLabel } from '../constants/placeCategories';
import { colors, radii, spacing } from '../theme/colors';

export function SettingsScreen({ navigation }) {
  const { settings, updateSettings, isHydrated } = useTravel();
  const [startAddress, setStartAddress] = useState(settings.startAddress);
  const [endAddress, setEndAddress] = useState(settings.endAddress);
  const [selectedCategories, setSelectedCategories] = useState(
    settings.selectedCategories || ['tourist']
  );
  const [travelMode, setTravelMode] = useState(
    settings.travelMode || 'walking'
  );
  const [radiusInput, setRadiusInput] = useState(
    String(Math.round(settings.searchRadiusMeters / 1000))
  );
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    setStartAddress(settings.startAddress);
    setEndAddress(settings.endAddress);
    setSelectedCategories(settings.selectedCategories || ['tourist']);
    setTravelMode(settings.travelMode || 'walking');
    setRadiusInput(String(Math.round(settings.searchRadiusMeters / 1000)));
  }, [isHydrated, settings]);

  const radiusMeters = Math.round(Number(radiusInput) * 1000);
  const radiusError =
    radiusInput.trim() === '' ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters < MIN_SEARCH_RADIUS_METERS ||
    radiusMeters > MAX_SEARCH_RADIUS_METERS;

  const handleSave = () => {
    if (radiusError) return;

    updateSettings({
      startAddress: startAddress.trim(),
      endAddress: endAddress.trim(),
      searchRadiusMeters: radiusMeters,
      selectedCategories,
      travelMode,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  };

  const presetValue = RADIUS_PRESETS.some(
    (preset) => preset.value === settings.searchRadiusMeters
  )
    ? String(settings.searchRadiusMeters)
    : 'custom';

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="bodyLarge" style={styles.intro}>
            Set route addresses, search radius, and which place types to include
            when searching a city.
          </Text>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Route points
            </Text>
            <TextInput
              mode="outlined"
              label="Start address"
              placeholder="Manastirski Livadi, Bulgaria Blvd 69, 1404 Sofia"
              value={startAddress}
              onChangeText={setStartAddress}
              multiline
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={styles.input}
              left={<TextInput.Icon icon="map-marker" />}
            />
            <HelperText type="info">
              Used as the Google Maps origin when generating a route.
            </HelperText>

            <TextInput
              mode="outlined"
              label="End address"
              placeholder="Optional destination address"
              value={endAddress}
              onChangeText={setEndAddress}
              multiline
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={styles.input}
              left={<TextInput.Icon icon="flag-checkered" />}
            />
            <HelperText type="info">
              Used as the Google Maps destination. Leave empty to end at the
              last attraction.
            </HelperText>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Transport mode
            </Text>
            <Text style={styles.helperInline}>
              Used when opening the route in Google Maps.
            </Text>
            <SegmentedButtons
              value={travelMode}
              onValueChange={setTravelMode}
              buttons={TRAVEL_MODES.slice(0, 2).map((mode) => ({
                value: mode.id,
                label: mode.shortLabel,
              }))}
              style={styles.presets}
            />
            <SegmentedButtons
              value={travelMode}
              onValueChange={setTravelMode}
              buttons={TRAVEL_MODES.slice(2).map((mode) => ({
                value: mode.id,
                label: mode.shortLabel,
              }))}
              style={styles.presets}
            />
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Place categories
            </Text>
            <Text style={styles.helperInline}>
              Default is Tourist only. Select more types to broaden results.
            </Text>
            <CategoryFilter
              selectedIds={selectedCategories}
              onChange={setSelectedCategories}
              horizontal={false}
            />
            <HelperText type="info">
              Active: {formatSelectedCategoriesLabel(selectedCategories)}
            </HelperText>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Search radius
            </Text>
            <Text style={styles.radiusCurrent}>
              Current: {formatRadiusLabel(settings.searchRadiusMeters)}
            </Text>

            <SegmentedButtons
              value={presetValue}
              onValueChange={(value) => {
                if (value === 'custom') return;
                const meters = Number(value);
                setRadiusInput(String(meters / 1000));
                updateSettings({ searchRadiusMeters: meters });
              }}
              buttons={RADIUS_PRESETS.slice(0, 3).map((preset) => ({
                value: String(preset.value),
                label: preset.label,
              }))}
              style={styles.presets}
            />
            <SegmentedButtons
              value={presetValue}
              onValueChange={(value) => {
                const meters = Number(value);
                setRadiusInput(String(meters / 1000));
                updateSettings({ searchRadiusMeters: meters });
              }}
              buttons={RADIUS_PRESETS.slice(3).map((preset) => ({
                value: String(preset.value),
                label: preset.label,
              }))}
              style={styles.presets}
            />

            <TextInput
              mode="outlined"
              label="Custom radius (km)"
              value={radiusInput}
              onChangeText={setRadiusInput}
              keyboardType="decimal-pad"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={styles.input}
            />
            <HelperText type={radiusError ? 'error' : 'info'}>
              {radiusError
                ? `Enter a value between ${MIN_SEARCH_RADIUS_METERS / 1000} and ${MAX_SEARCH_RADIUS_METERS / 1000} km.`
                : `Places will be searched within ${formatRadiusLabel(radiusMeters)}.`}
            </HelperText>
          </View>

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={radiusError}
            buttonColor={colors.secondary}
            textColor="#FFFFFF"
            style={styles.saveButton}
            contentStyle={styles.saveContent}
          >
            {savedFlash ? 'Saved' : 'Save settings'}
          </Button>

          <Button mode="text" onPress={() => navigation.goBack()}>
            Back
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  intro: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  helperInline: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  radiusCurrent: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  presets: {
    marginBottom: spacing.sm,
  },
  saveButton: {
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  saveContent: {
    paddingVertical: spacing.xs,
  },
});
