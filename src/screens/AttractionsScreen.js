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
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AttractionCard } from '../components/AttractionCard';
import { PlacesOptionsSheet } from '../components/PlacesOptionsSheet';
import { usePlaces } from '../hooks/usePlaces';
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
    settings,
    updateSettings,
    toggleAttraction,
    isAttractionSelected,
  } = useTravel();
  const { loading, error, setError, refreshAttractions } = usePlaces();
  const [refreshing, setRefreshing] = useState(false);
  const [listQuery, setListQuery] = useState('');
  const [sortId, setSortId] = useState(DEFAULT_SORT_ID);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const filteredAttractions = useMemo(() => {
    const query = listQuery.trim().toLowerCase();
    const filtered = !query
      ? attractions
      : attractions.filter((item) => {
          const haystack = [
            item.name,
            item.category,
            item.description,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(query);
        });

    return sortAttractions(filtered, sortId, cityCoordinates);
  }, [attractions, listQuery, sortId, cityCoordinates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAttractions(cityCoordinates, searchedCity);
    } catch {
      // Error handled in hook.
    } finally {
      setRefreshing(false);
    }
  }, [cityCoordinates, searchedCity, refreshAttractions]);

  const handleCategoriesChange = useCallback(
    async (nextCategories) => {
      updateSettings({ selectedCategories: nextCategories });
      if (!cityCoordinates) return;

      try {
        await refreshAttractions(cityCoordinates, searchedCity, {
          selectedCategories: nextCategories,
        });
      } catch {
        // Error handled in hook.
      }
    },
    [updateSettings, cityCoordinates, searchedCity, refreshAttractions]
  );

  const renderEmpty = () => {
    if (loading && !refreshing) {
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
          Try other categories, a larger radius, or another city.
        </Text>
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
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
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

        <Searchbar
          placeholder="Search places…"
          value={listQuery}
          onChangeText={setListQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
          iconColor={colors.primary}
        />

        <Pressable
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

      <FlatList
        data={filteredAttractions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          filteredAttractions.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (loading && !refreshing)}
            onRefresh={onRefresh}
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
            onPressDetails={(attraction) =>
              navigation.navigate('AttractionDetail', {
                attractionId: attraction.id,
                title: attraction.name,
              })
            }
          />
        )}
      />

      <View style={styles.footer}>
        <Button
          mode="contained"
          buttonColor={colors.accent}
          textColor="#FFFFFF"
          disabled={selectedAttractions.length === 0}
          onPress={() =>
            navigation.navigate('MainTabs', { screen: 'RouteTab' })
          }
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
