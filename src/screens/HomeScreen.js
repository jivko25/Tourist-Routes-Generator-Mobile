import React, { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Banner, IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '../components/SearchBar';
import { usePlaces } from '../hooks/usePlaces';
import { useTravel } from '../context/TravelContext';
import { formatRadiusLabel } from '../utils/googleMaps';
import { formatSelectedCategoriesLabel } from '../constants/placeCategories';
import { colors, radii, spacing } from '../theme/colors';
import { CategoryFilter } from '../components/CategoryFilter';

export function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const { selectedAttractions, settings, updateSettings } = useTravel();
  const { loading, error, setError, searchCityAttractions } = usePlaces();
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(18)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslate, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroOpacity, heroTranslate]);

  const handleSearch = async () => {
    try {
      const { attractions } = await searchCityAttractions(query);
      navigation.navigate('Attractions', {
        resultCount: attractions.length,
      });
    } catch {
      // Error is stored in hook state for Banner display.
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarSpacer} />
          <IconButton
            icon="cog-outline"
            iconColor={colors.primary}
            size={26}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Open settings"
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.hero,
              {
                opacity: heroOpacity,
                transform: [{ translateY: heroTranslate }],
              },
            ]}
          >
            <Text variant="labelLarge" style={styles.eyebrow}>
              Travel planner
            </Text>
            <Text variant="displaySmall" style={styles.title}>
              Discover places.{'\n'}Build your route.
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Search a city, pick attractions, and open a ready-made Google Maps
              itinerary in one tap.
            </Text>
          </Animated.View>

          <View style={styles.panel}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              onSearch={handleSearch}
              loading={loading}
            />

            <Text style={styles.filterLabel}>Place types</Text>
            <CategoryFilter
              selectedIds={settings.selectedCategories || ['tourist']}
              onChange={(next) => updateSettings({ selectedCategories: next })}
            />

            <Text style={styles.radiusHint}>
              Radius: {formatRadiusLabel(settings.searchRadiusMeters)} ·{' '}
              {formatSelectedCategoriesLabel(settings.selectedCategories)}
              {settings.startAddress?.trim() ? ' · Start set' : ''}
            </Text>

            {error ? (
              <Banner
                visible
                icon="alert-circle-outline"
                actions={[
                  {
                    label: 'Dismiss',
                    onPress: () => setError(null),
                  },
                ]}
                style={styles.banner}
              >
                {error}
              </Banner>
            ) : null}
          </View>

          <View style={styles.footerActions}>
            {selectedAttractions.length > 0 ? (
              <Text
                variant="bodyMedium"
                style={styles.routeHint}
                onPress={() => navigation.navigate('Route')}
              >
                {selectedAttractions.length} place
                {selectedAttractions.length === 1 ? '' : 's'} selected — view
                route →
              </Text>
            ) : (
              <Text variant="bodyMedium" style={styles.hint}>
                Tip: open Settings to set start/end addresses.
              </Text>
            )}
          </View>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  topBarSpacer: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  eyebrow: {
    color: colors.secondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  title: {
    color: colors.primary,
    fontWeight: '800',
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 24,
    maxWidth: 360,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  radiusHint: {
    color: colors.textMuted,
    fontSize: 13,
  },
  filterLabel: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  banner: {
    backgroundColor: '#FDECEA',
    borderRadius: radii.sm,
  },
  footerActions: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  hint: {
    color: colors.textMuted,
  },
  routeHint: {
    color: colors.primary,
    fontWeight: '600',
  },
});
