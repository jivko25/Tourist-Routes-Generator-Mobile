import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Searchbar,
  SegmentedButtons,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AttractionCard } from '../components/AttractionCard';
import { AttractionMapPreview } from '../components/AttractionMapPreview';
import { AttractionsMapView } from '../components/AttractionsMapView';
import { PlacesOptionsSheet } from '../components/PlacesOptionsSheet';
import { OfflineBanner } from '../components/OfflineBanner';
import { usePlaces } from '../hooks/usePlaces';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTravel } from '../context/TravelContext';
import { formatSelectedCategoriesLabel } from '../constants/placeCategories';
import { formatRadiusLabel } from '../utils/googleMaps';
import {
  DEFAULT_SORT_ID,
  formatSortLabel,
  sortAttractions,
} from '../utils/attractionSort';
import { colors, radii, spacing } from '../theme/colors';

export function AttractionsScreen({ navigation }) {
  const {
    attractions,
    searchedCity,
    cityCoordinates,
    selectedAttractions,
    placesCatalogReady,
    settings,
    updateSettings,
    toggleAttraction,
    isAttractionSelected,
  } = useTravel();
  const { loading, error, setError, refreshAttractions } = usePlaces();
  const { isOffline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [listQuery, setListQuery] = useState('');
  const [sortId, setSortId] = useState(DEFAULT_SORT_ID);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [focusedAttraction, setFocusedAttraction] = useState(null);

  const filteredAttractions = useMemo(() => {
    const query = listQuery.trim().toLowerCase();
    const filtered = !query
      ? attractions
      : attractions.filter((item) => {
          const haystack = [item.name, item.category, item.description]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(query);
        });

    return sortAttractions(filtered, sortId, cityCoordinates);
  }, [attractions, listQuery, sortId, cityCoordinates]);

  const reloadCatalog = useCallback(async () => {
    if (!cityCoordinates) {
      setError('No city selected to refresh.');
      return;
    }
    if (isOffline) {
      setError('You’re offline. Reloading places needs internet.');
      return;
    }

    setRefreshing(true);
    try {
      await refreshAttractions(cityCoordinates, searchedCity);
    } catch {
      // Error handled in hook.
    } finally {
      setRefreshing(false);
    }
  }, [
    cityCoordinates,
    searchedCity,
    refreshAttractions,
    isOffline,
    setError,
  ]);

  // After app resume the selected stops are restored but the Places catalog is not.
  useFocusEffect(
    useCallback(() => {
      if (placesCatalogReady || !cityCoordinates || isOffline) {
        return undefined;
      }

      let cancelled = false;
      (async () => {
        setRefreshing(true);
        try {
          await refreshAttractions(cityCoordinates, searchedCity);
        } catch {
          // Error handled in hook.
        } finally {
          if (!cancelled) setRefreshing(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [
      placesCatalogReady,
      cityCoordinates,
      searchedCity,
      isOffline,
      refreshAttractions,
    ])
  );

  const handleCategoriesChange = useCallback(
    async (nextCategories) => {
      updateSettings({ selectedCategories: nextCategories });
      if (!cityCoordinates) return;
      if (isOffline) {
        setError('You’re offline. Changing place types needs internet.');
        return;
      }

      try {
        await refreshAttractions(cityCoordinates, searchedCity, {
          selectedCategories: nextCategories,
        });
      } catch {
        // Error handled in hook.
      }
    },
    [
      updateSettings,
      cityCoordinates,
      searchedCity,
      refreshAttractions,
      isOffline,
      setError,
    ]
  );

  const handleViewModeChange = useCallback((next) => {
    setViewMode(next);
    if (next === 'list') setFocusedAttraction(null);
  }, []);

  const openDetails = useCallback(
    (attraction) => {
      navigation.navigate('AttractionDetail', {
        attractionId: attraction.id,
        title: attraction.name,
      });
    },
    [navigation]
  );

  const isCatalogLoading =
    !placesCatalogReady && Boolean(cityCoordinates) && (loading || refreshing);

  const renderEmpty = () => {
    if (isCatalogLoading || (loading && !refreshing && !placesCatalogReady)) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator animating color={colors.primary} size="large" />
          <Text style={styles.emptyText}>Finding places…</Text>
        </View>
      );
    }

    if (listQuery.trim() && attractions.length > 0) {
      return (
        <View style={styles.centered}>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No matches
          </Text>
          <Text style={styles.emptyText}>
            Nothing matches “{listQuery.trim()}”. Try another search term.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.centered}>
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No places found
        </Text>
        <Text style={styles.emptyText}>
          {cityCoordinates
            ? 'Reload places for this city, or search again from Home.'
            : 'Try other categories, a larger radius, or another city.'}
        </Text>
        {cityCoordinates ? (
          <Button
            mode="contained"
            testID="attractions-reload"
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            loading={refreshing || loading}
            disabled={isOffline || refreshing || loading}
            onPress={reloadCatalog}
          >
            Reload places
          </Button>
        ) : null}
        <Button
          mode="outlined"
          onPress={() =>
            navigation.navigate('MainTabs', { screen: 'HomeTab' })
          }
        >
          Search again
        </Button>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['left', 'right', 'bottom']}
      testID="screen-attractions"
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {searchedCity || 'Places'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {filteredAttractions.length}
          {listQuery.trim() ? ` / ${attractions.length}` : ''} place
          {filteredAttractions.length === 1 ? '' : 's'} ·{' '}
          {formatRadiusLabel(settings.searchRadiusMeters)}
        </Text>

        {isOffline ? (
          <OfflineBanner message="Browsing cached results. Refresh and category changes need internet." />
        ) : null}

        <SegmentedButtons
          value={viewMode}
          onValueChange={handleViewModeChange}
          style={styles.viewToggle}
          buttons={[
            {
              value: 'list',
              label: 'List',
              icon: 'view-list',
              testID: 'attractions-view-list',
            },
            {
              value: 'map',
              label: 'Map',
              icon: 'map',
              testID: 'attractions-view-map',
            },
          ]}
        />

        <Searchbar
          testID="attractions-search"
          placeholder="Search places…"
          value={listQuery}
          onChangeText={(text) => {
            setListQuery(text);
            setFocusedAttraction(null);
          }}
          style={styles.search}
          inputStyle={styles.searchInput}
          iconColor={colors.primary}
        />

        <Pressable
          testID="attractions-options"
          style={styles.optionsButton}
          onPress={() => setOptionsOpen(true)}
        >
          <Text style={styles.optionsButtonText}>
            Sort: {formatSortLabel(sortId)} ·{' '}
            {formatSelectedCategoriesLabel(settings.selectedCategories)}
          </Text>
          <Text style={styles.optionsChevron}>▾</Text>
        </Pressable>

        {error ? (
          <Text style={styles.error} onPress={() => setError(null)}>
            {error}
          </Text>
        ) : null}
      </View>

      {viewMode === 'list' ? (
        <FlatList
          data={filteredAttractions}
          extraData={filteredAttractions
            .map((item) => item.coverImageUrl || item.photos?.[0]?.url || '')
            .join('|')}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            filteredAttractions.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || (loading && !placesCatalogReady)}
              onRefresh={reloadCatalog}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderEmpty}
          renderItem={({ item }) => (
            <AttractionCard
              attraction={item}
              cityName={searchedCity}
              origin={cityCoordinates}
              selected={isAttractionSelected(item.id)}
              onToggle={toggleAttraction}
              onPressDetails={openDetails}
            />
          )}
        />
      ) : (
        <View style={styles.mapPane}>
          {filteredAttractions.length === 0 ? (
            renderEmpty()
          ) : (
            <>
              <AttractionsMapView
                attractions={filteredAttractions}
                cityCoordinates={cityCoordinates}
                isSelected={isAttractionSelected}
                focusedId={focusedAttraction?.id || null}
                onSelect={setFocusedAttraction}
                onMapPress={() => setFocusedAttraction(null)}
              />
              <AttractionMapPreview
                attraction={focusedAttraction}
                cityName={searchedCity}
                origin={cityCoordinates}
                selected={
                  focusedAttraction
                    ? isAttractionSelected(focusedAttraction.id)
                    : false
                }
                onClose={() => setFocusedAttraction(null)}
                onToggle={toggleAttraction}
                onPressDetails={openDetails}
              />
            </>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Button
          mode="contained"
          testID="attractions-footer-route"
          buttonColor={colors.accent}
          textColor="#FFFFFF"
          disabled={selectedAttractions.length === 0}
          onPress={() => navigation.navigate('Route')}
          contentStyle={styles.footerButton}
          style={styles.footerAction}
          labelStyle={styles.footerLabel}
        >
          Your Route ({selectedAttractions.length})
        </Button>
      </View>

      <PlacesOptionsSheet
        visible={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        sortId={sortId}
        onSortChange={setSortId}
        selectedCategories={settings.selectedCategories || ['tourist']}
        onCategoriesChange={handleCategoriesChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
  },
  viewToggle: {
    alignSelf: 'stretch',
  },
  search: {
    backgroundColor: colors.surface,
    elevation: 0,
    borderRadius: radii.pill,
  },
  searchInput: {
    minHeight: 0,
  },
  optionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionsButtonText: {
    flex: 1,
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  optionsChevron: {
    color: colors.primaryDark,
    fontSize: 14,
    marginLeft: spacing.sm,
  },
  error: {
    color: colors.error,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  listEmpty: {
    flexGrow: 1,
  },
  mapPane: {
    flex: 1,
    position: 'relative',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerAction: {
    borderRadius: radii.pill,
  },
  footerButton: {
    paddingVertical: spacing.xs,
  },
  footerLabel: {
    fontWeight: '700',
  },
});
