import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AttractionCard } from '../components/AttractionCard';
import { usePlaces } from '../hooks/usePlaces';
import { useTravel } from '../context/TravelContext';
import { colors, spacing } from '../theme/colors';

export function AttractionsScreen({ navigation }) {
  const {
    attractions,
    searchedCity,
    cityCoordinates,
    selectedAttractions,
    toggleAttraction,
    isAttractionSelected,
  } = useTravel();
  const { loading, error, setError, refreshAttractions } = usePlaces();
  const [refreshing, setRefreshing] = useState(false);

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

  const renderEmpty = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator animating color={colors.primary} size="large" />
          <Text style={styles.emptyText}>Finding attractions…</Text>
        </View>
      );
    }

    return (
      <View style={styles.centered}>
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No attractions found
        </Text>
        <Text style={styles.emptyText}>
          Try another city or pull down to refresh.
        </Text>
        <Button mode="outlined" onPress={() => navigation.navigate('Home')}>
          Search again
        </Button>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {searchedCity || 'Attractions'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {attractions.length} tourist attraction
          {attractions.length === 1 ? '' : 's'} nearby
        </Text>
        {error ? (
          <Text style={styles.error} onPress={() => setError(null)}>
            {error}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={attractions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          attractions.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
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
          buttonColor={colors.secondary}
          textColor="#FFFFFF"
          disabled={selectedAttractions.length === 0}
          onPress={() => navigation.navigate('Route')}
          contentStyle={styles.footerButton}
        >
          Your Route ({selectedAttractions.length})
        </Button>
      </View>
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
  },
  title: {
    color: colors.primary,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.error,
    marginTop: spacing.sm,
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
  footerButton: {
    paddingVertical: spacing.xs,
  },
});
