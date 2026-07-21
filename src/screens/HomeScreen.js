import React, { useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Banner, IconButton, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '../components/SearchBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { GlassCard } from '../components/GlassCard';
import { ActiveRouteCard } from '../components/ActiveRouteCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { usePlaces } from '../hooks/usePlaces';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTravel } from '../context/TravelContext';
import { formatRadiusLabel } from '../utils/googleMaps';
import { formatSelectedCategoriesLabel } from '../constants/placeCategories';
import { colors, radii, spacing } from '../theme/colors';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=80';

export function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const {
    selectedAttractions,
    searchedCity,
    settings,
    updateSettings,
    clearRoute,
  } = useTravel();
  const { loading, error, setError, searchCityAttractions } = usePlaces();
  const { isOffline } = useNetworkStatus();
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(18)).current;
  const hasActiveRoute = selectedAttractions.length > 0;

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
    if (isOffline) {
      setError(
        'You’re offline. Open a saved route instead — new city searches need internet.'
      );
      return;
    }

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
    <View style={styles.root}>
      <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.heroBg}>
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.15)',
            'rgba(247,251,255,0.92)',
            colors.background,
          ]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.topBar}>
              <Text style={styles.brand}>Travel Go</Text>
              <IconButton
                icon="cog-outline"
                iconColor={colors.text}
                size={24}
                style={styles.cog}
                onPress={() => navigation.navigate('Settings')}
                accessibilityLabel="Open settings"
              />
            </View>

            <ScrollView
              contentContainerStyle={[
                styles.content,
                hasActiveRoute && styles.contentWithRoute,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                style={{
                  opacity: heroOpacity,
                  transform: [{ translateY: heroTranslate }],
                }}
              >
                <Text style={styles.title}>
                  {hasActiveRoute
                    ? 'Your trip is underway.'
                    : 'Discover places.\nBuild your route.'}
                </Text>
                <Text style={styles.subtitle}>
                  {hasActiveRoute
                    ? 'Continue planning, or clear the itinerary and start fresh.'
                    : 'Search a city, pick stops, optimize the path, and open it in Google Maps.'}
                </Text>
              </Animated.View>

              {hasActiveRoute ? (
                <ActiveRouteCard
                  selectedAttractions={selectedAttractions}
                  searchedCity={searchedCity}
                  settings={settings}
                  onContinue={() =>
                    navigation.navigate('MainTabs', { screen: 'RouteTab' })
                  }
                  onClear={clearRoute}
                />
              ) : null}

              {isOffline ? (
                <OfflineBanner message="Saved routes still open offline. New city searches need internet." />
              ) : null}

              <GlassCard style={styles.panel} contentStyle={styles.panelContent}>
                <Text style={styles.panelTitle}>
                  {hasActiveRoute ? 'Add more places' : 'Start exploring'}
                </Text>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  onSearch={handleSearch}
                  loading={loading}
                  disabled={isOffline}
                />

                <Text style={styles.filterLabel}>Place types</Text>
                <CategoryFilter
                  selectedIds={settings.selectedCategories || ['tourist']}
                  onChange={(next) =>
                    updateSettings({ selectedCategories: next })
                  }
                />

                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>
                      {formatRadiusLabel(settings.searchRadiusMeters)}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>
                      {formatSelectedCategoriesLabel(settings.selectedCategories)}
                    </Text>
                  </View>
                </View>

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
              </GlassCard>

              {!hasActiveRoute ? (
                <Text style={styles.hint}>
                  Tip: set start/end addresses in Settings.
                </Text>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroBg: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  brand: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
    marginLeft: spacing.sm,
  },
  cog: {
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  contentWithRoute: {
    justifyContent: 'flex-start',
    paddingTop: spacing.md,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 34,
    lineHeight: 40,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 340,
  },
  panel: {
    borderRadius: radii.xl,
  },
  panelContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  panelTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  filterLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaPillText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  banner: {
    backgroundColor: '#FEE2E2',
    borderRadius: radii.md,
  },
  hint: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
