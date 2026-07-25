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
import { useTranslation } from 'react-i18next';
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
import { setAppLanguage } from '../i18n/language';
import { colors, radii, spacing } from '../theme/colors';

export function SettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { settings, updateSettings, isHydrated } = useTravel();
  const [startAddress, setStartAddress] = useState(settings.startAddress);
  const [endAddress, setEndAddress] = useState(settings.endAddress);
  const [selectedCategories, setSelectedCategories] = useState(
    settings.selectedCategories || ['tourist']
  );
  const [travelMode, setTravelMode] = useState(
    settings.travelMode || 'walking'
  );
  const [language, setLanguage] = useState(settings.language || 'en');
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
    setLanguage(settings.language || 'en');
    setRadiusInput(String(Math.round(settings.searchRadiusMeters / 1000)));
  }, [isHydrated, settings]);

  const radiusMeters = Math.round(Number(radiusInput) * 1000);
  const radiusError =
    radiusInput.trim() === '' ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters < MIN_SEARCH_RADIUS_METERS ||
    radiusMeters > MAX_SEARCH_RADIUS_METERS;

  const handleLanguageChange = async (next) => {
    setLanguage(next);
    await setAppLanguage(next);
    updateSettings({ language: next });
  };

  const handleSave = () => {
    if (radiusError) return;

    updateSettings({
      language,
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
            {t('settings.intro')}
          </Text>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('settings.language')}
            </Text>
            <Text style={styles.helperInline}>{t('settings.languageHint')}</Text>
            <SegmentedButtons
              value={language}
              onValueChange={handleLanguageChange}
              buttons={[
                { value: 'en', label: t('settings.english') },
                { value: 'bg', label: t('settings.bulgarian') },
              ]}
              style={styles.presets}
            />
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('settings.routePoints')}
            </Text>
            <TextInput
              mode="outlined"
              label={t('settings.startAddress')}
              placeholder={t('settings.startPlaceholder')}
              value={startAddress}
              onChangeText={setStartAddress}
              multiline
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={styles.input}
              left={<TextInput.Icon icon="map-marker" />}
            />
            <HelperText type="info">{t('settings.startHelp')}</HelperText>

            <TextInput
              mode="outlined"
              label={t('settings.endAddress')}
              placeholder={t('settings.endPlaceholder')}
              value={endAddress}
              onChangeText={setEndAddress}
              multiline
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={styles.input}
              left={<TextInput.Icon icon="flag-checkered" />}
            />
            <HelperText type="info">{t('settings.endHelp')}</HelperText>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('settings.transport')}
            </Text>
            <Text style={styles.helperInline}>
              {t('settings.transportHint')}
            </Text>
            <SegmentedButtons
              value={travelMode}
              onValueChange={setTravelMode}
              buttons={TRAVEL_MODES.slice(0, 2).map((mode) => ({
                value: mode.id,
                label: t(`travelMode.${mode.id}Short`),
              }))}
              style={styles.presets}
            />
            <SegmentedButtons
              value={travelMode}
              onValueChange={setTravelMode}
              buttons={TRAVEL_MODES.slice(2).map((mode) => ({
                value: mode.id,
                label: t(`travelMode.${mode.id}Short`),
              }))}
              style={styles.presets}
            />
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('settings.categories')}
            </Text>
            <Text style={styles.helperInline}>
              {t('settings.categoriesHint')}
            </Text>
            <CategoryFilter
              selectedIds={selectedCategories}
              onChange={setSelectedCategories}
              horizontal={false}
            />
            <HelperText type="info">
              {t('settings.active', {
                labels: formatSelectedCategoriesLabel(selectedCategories, t),
              })}
            </HelperText>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('settings.radius')}
            </Text>
            <Text style={styles.radiusCurrent}>
              {t('settings.radiusCurrent', {
                radius: formatRadiusLabel(settings.searchRadiusMeters),
              })}
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
              label={t('settings.customRadius')}
              value={radiusInput}
              onChangeText={setRadiusInput}
              keyboardType="decimal-pad"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={styles.input}
            />
            <HelperText type={radiusError ? 'error' : 'info'}>
              {radiusError
                ? t('settings.radiusError', {
                    min: MIN_SEARCH_RADIUS_METERS / 1000,
                    max: MAX_SEARCH_RADIUS_METERS / 1000,
                  })
                : t('settings.radiusInfo', {
                    radius: formatRadiusLabel(radiusMeters),
                  })}
            </HelperText>
          </View>

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={radiusError}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.saveButton}
            contentStyle={styles.saveContent}
            labelStyle={{ fontWeight: '700' }}
          >
            {savedFlash ? t('common.saved') : t('common.save')}
          </Button>

          <Button mode="text" onPress={() => navigation.goBack()}>
            {t('common.back')}
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
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '800',
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
    borderRadius: radii.pill,
    marginTop: spacing.sm,
  },
  saveContent: {
    paddingVertical: spacing.xs,
  },
});
