import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTravel } from '../context/TravelContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { OfflineBanner } from '../components/OfflineBanner';
import { shareGoogleMapsRoute } from '../services/mapsService';
import { formatTravelModeLabel } from '../utils/config';
import { colors, radii, spacing } from '../theme/colors';

function formatSavedDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function SavedRoutesScreen({ navigation }) {
  const {
    savedRoutes,
    deleteSavedRoute,
    loadSavedRoute,
  } = useTravel();
  const { isOffline } = useNetworkStatus();
  const [loadingId, setLoadingId] = useState(null);
  const [sharingId, setSharingId] = useState(null);

  const sortedRoutes = useMemo(
    () =>
      [...savedRoutes].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [savedRoutes]
  );

  const handleOpen = (route) => {
    try {
      setLoadingId(route.id);
      loadSavedRoute(route);
      navigation.navigate('MainTabs', { screen: 'RouteTab' });
    } catch (error) {
      Alert.alert('Could not open route', error.message || 'Unknown error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = (route) => {
    Alert.alert('Delete saved route?', `"${route.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSavedRoute(route.id),
      },
    ]);
  };

  const handleShare = async (route) => {
    setSharingId(route.id);
    try {
      await shareGoogleMapsRoute(route.attractions || [], {
        url: route.googleMapsUrl || undefined,
        origin: route.startAddress,
        destination: route.endAddress,
        travelMode: route.travelMode,
        title: route.name || 'Travel Go route',
      });
    } catch (error) {
      if (error?.message !== 'User did not share') {
        Alert.alert(
          'Share failed',
          error?.message || 'Could not share this Google Maps link.'
        );
      }
    } finally {
      setSharingId(null);
    }
  };

  const renderItem = ({ item }) => {
    const cover = item.attractions?.[0]?.photos?.[0]?.url;
    const stopNames = item.attractions
      .slice(0, 2)
      .map((place) => place.name)
      .join(' · ');

    return (
      <Pressable style={styles.card} onPress={() => handleOpen(item)}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]} />
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardMeta}>
            {item.attractions.length} stop
            {item.attractions.length === 1 ? '' : 's'}
            {item.cityName ? ` · ${item.cityName.split(',')[0]}` : ''}
          </Text>
          {stopNames ? (
            <Text style={styles.cardStops} numberOfLines={1}>
              {stopNames}
              {item.attractions.length > 2
                ? ` +${item.attractions.length - 2}`
                : ''}
            </Text>
          ) : null}
          <View style={styles.cardFooter}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {formatTravelModeLabel(item.travelMode)}
              </Text>
            </View>
            <Text style={styles.dateText}>{formatSavedDate(item.createdAt)}</Text>
          </View>
          <View style={styles.cardActions}>
            <Button
              mode="contained"
              compact
              loading={loadingId === item.id}
              onPress={() => handleOpen(item)}
              buttonColor={colors.primary}
              textColor="#FFFFFF"
              style={styles.openBtn}
              labelStyle={styles.actionLabel}
            >
              Open
            </Button>
            <Button
              mode="outlined"
              compact
              loading={sharingId === item.id}
              disabled={sharingId === item.id}
              onPress={() => handleShare(item)}
              textColor={colors.primary}
              style={styles.shareBtn}
              labelStyle={styles.actionLabel}
              icon="share-variant"
            >
              Share
            </Button>
            <Button
              mode="text"
              compact
              onPress={() => handleDelete(item)}
              textColor={colors.error}
              labelStyle={styles.actionLabel}
            >
              Delete
            </Button>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved routes</Text>
        <Text style={styles.subtitle}>
          {isOffline
            ? 'Available offline — open a trip to review stops without internet.'
            : 'Reopen a trip anytime and continue planning.'}
        </Text>
        {isOffline ? (
          <View style={styles.offlineWrap}>
            <OfflineBanner message="You can’t create new routes offline. Opening a saved one still works." />
          </View>
        ) : null}
      </View>

      <FlatList
        data={sortedRoutes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          sortedRoutes.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No saved routes yet</Text>
            <Text style={styles.emptyText}>
              Build a route, then tap Save route on the Route tab.
            </Text>
            <Button
              mode="contained"
              buttonColor={colors.accent}
              textColor="#FFFFFF"
              onPress={() =>
                navigation.navigate('MainTabs', { screen: 'RouteTab' })
              }
              style={styles.emptyBtn}
            >
              Go to Route
            </Button>
          </View>
        }
        renderItem={renderItem}
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
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 14,
  },
  offlineWrap: {
    marginTop: spacing.md,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cover: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surfaceMuted,
  },
  coverFallback: {
    backgroundColor: '#C7D7EE',
  },
  cardBody: {
    padding: spacing.md,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardMeta: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
  },
  cardStops: {
    color: colors.textMuted,
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  openBtn: {
    borderRadius: radii.pill,
  },
  shareBtn: {
    borderRadius: radii.pill,
  },
  actionLabel: {
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    borderRadius: radii.pill,
  },
});
