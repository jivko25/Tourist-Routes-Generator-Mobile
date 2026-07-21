import React, { useMemo } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoGallery } from '../components/PhotoGallery';
import { PlaceMap } from '../components/PlaceMap';
import { useTravel } from '../context/TravelContext';
import { formatCoordinate } from '../utils/googleMaps';
import {
  formatDistanceKm,
  haversineDistanceKm,
} from '../utils/routeOptimization';
import { colors, radii, spacing } from '../theme/colors';

const GALLERY_WIDTH = Dimensions.get('window').width - spacing.lg * 2;

export function AttractionDetailScreen({ route, navigation }) {
  const { attractionId } = route.params || {};
  const {
    attractions,
    selectedAttractions,
    searchedCity,
    cityCoordinates,
    toggleAttraction,
    isAttractionSelected,
  } = useTravel();

  const attraction = useMemo(() => {
    return (
      attractions.find((item) => item.id === attractionId) ||
      selectedAttractions.find((item) => item.id === attractionId) ||
      null
    );
  }, [attractionId, attractions, selectedAttractions]);

  const distanceFromCity = useMemo(() => {
    if (
      !attraction ||
      !cityCoordinates ||
      typeof cityCoordinates.latitude !== 'number' ||
      typeof cityCoordinates.longitude !== 'number'
    ) {
      return null;
    }

    return formatDistanceKm(
      haversineDistanceKm(cityCoordinates, attraction)
    );
  }, [attraction, cityCoordinates]);

  if (!attraction) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <View style={styles.missing}>
          <Text variant="titleMedium" style={styles.missingTitle}>
            Attraction not found
          </Text>
          <Button mode="contained" onPress={() => navigation.goBack()}>
            Go back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const selected = isAttractionSelected(attraction.id);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <PhotoGallery
          photos={attraction.photos}
          width={GALLERY_WIDTH}
          height={240}
        />

        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            {attraction.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.category}>
              {attraction.category || 'Tourist Attraction'}
            </Text>
            {typeof attraction.rating === 'number' ? (
              <Text style={styles.rating}>★ {attraction.rating.toFixed(1)}</Text>
            ) : null}
          </View>
          {searchedCity ? (
            <Text style={styles.city}>{searchedCity}</Text>
          ) : null}
          {distanceFromCity ? (
            <Text style={styles.distance}>
              {distanceFromCity} from city center
            </Text>
          ) : null}
          <Text style={styles.coords}>
            {formatCoordinate(attraction.latitude)},{' '}
            {formatCoordinate(attraction.longitude)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            About
          </Text>
          <Text style={styles.description}>
            {attraction.description ||
              'No editorial description is available for this place yet.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Location
          </Text>
          <PlaceMap
            height={220}
            points={[
              {
                id: attraction.id,
                name: attraction.name,
                latitude: attraction.latitude,
                longitude: attraction.longitude,
              },
            ]}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => toggleAttraction(attraction)}
          buttonColor={selected ? colors.success : colors.accent}
          textColor="#FFFFFF"
          contentStyle={styles.footerButton}
          style={[styles.footerAction, selected && styles.footerActionSelected]}
          labelStyle={{ fontWeight: '700' }}
          icon={selected ? 'check-circle' : 'plus'}
        >
          {selected ? 'Added to route' : 'Add to route'}
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginTop: spacing.lg,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  category: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  rating: {
    color: colors.text,
    fontWeight: '700',
  },
  city: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  distance: {
    color: colors.accent,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  coords: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.text,
    lineHeight: 24,
    fontSize: 16,
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
  footerActionSelected: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  footerButton: {
    paddingVertical: spacing.xs,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  missingTitle: {
    color: colors.text,
    fontWeight: '700',
  },
});
