import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoGallery } from '../components/PhotoGallery';
import { PlaceMap } from '../components/PlaceMap';
import { PlacePricingCard } from '../components/PlacePricingCard';
import { ReviewsList } from '../components/ReviewsList';
import { useTravel } from '../context/TravelContext';
import { fetchPlaceDetails } from '../services/placesService';
import { formatCoordinate } from '../utils/googleMaps';
import {
  formatDistanceKm,
  haversineDistanceKm,
} from '../utils/routeOptimization';
import { getPricingDisplay, isFoodPlace, isTicketedPlace } from '../utils/placePricing';
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
  const [toggling, setToggling] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const baseAttraction = useMemo(() => {
    return (
      attractions.find((item) => item.id === attractionId) ||
      selectedAttractions.find((item) => item.id === attractionId) ||
      null
    );
  }, [attractionId, attractions, selectedAttractions]);

  const attraction = useMemo(() => {
    if (!baseAttraction) return null;
    if (!details) return baseAttraction;
    return {
      ...baseAttraction,
      ...details,
      photos:
        details.photos?.length > 0 ? details.photos : baseAttraction.photos,
      description: details.description || baseAttraction.description,
      reviews: details.reviews?.length
        ? details.reviews
        : baseAttraction.reviews || [],
    };
  }, [baseAttraction, details]);

  const selected = attraction
    ? isAttractionSelected(attraction.id)
    : false;

  useEffect(() => {
    setToggling(false);
  }, [selected]);

  useEffect(() => {
    if (!toggling) return undefined;
    const timeout = setTimeout(() => setToggling(false), 1200);
    return () => clearTimeout(timeout);
  }, [toggling]);

  useEffect(() => {
    let cancelled = false;
    const placeId = baseAttraction?.googlePlaceId || baseAttraction?.id;

    if (!placeId) {
      setDetails(null);
      setDetailsLoading(false);
      setDetailsError(null);
      return undefined;
    }

    setDetails(null);
    setDetailsLoading(true);
    setDetailsError(null);

    fetchPlaceDetails(placeId)
      .then((enriched) => {
        if (!cancelled) setDetails(enriched);
      })
      .catch((error) => {
        if (!cancelled) {
          setDetailsError(
            error?.response?.data?.error?.message ||
              error?.message ||
              'Could not load Google place details.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [baseAttraction?.googlePlaceId, baseAttraction?.id]);

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

  const foodPlace = isFoodPlace(attraction);
  const ticketedPlace = isTicketedPlace(attraction);
  const hasPricing = Boolean(getPricingDisplay(attraction));
  const showPricing =
    foodPlace || ticketedPlace || hasPricing || detailsLoading;
  const showReviews =
    foodPlace ||
    (attraction.reviews?.length || 0) > 0 ||
    detailsLoading;

  const handleToggle = () => {
    if (toggling) return;
    setToggling(true);
    toggleAttraction(attraction);
  };

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

        {showPricing ? (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {foodPlace ? 'Prices' : 'Tickets & prices'}
            </Text>
            <PlacePricingCard place={attraction} loading={detailsLoading} />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            About
          </Text>
          <Text style={styles.description}>
            {attraction.description ||
              'No editorial description is available for this place yet.'}
          </Text>
        </View>

        {showReviews ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitleInline}>
                Google reviews
              </Text>
              {detailsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
            </View>
            <ReviewsList
              reviews={attraction.reviews || []}
              rating={attraction.rating}
              userRatingCount={attraction.userRatingCount}
              loading={detailsLoading && !(attraction.reviews || []).length}
            />
            {attraction.googleMapsUri ? (
              <Button
                mode="text"
                textColor={colors.primaryDark}
                onPress={() => Linking.openURL(attraction.googleMapsUri)}
                style={styles.mapsLink}
              >
                See more on Google Maps
              </Button>
            ) : null}
          </View>
        ) : null}

        {detailsError ? (
          <Text style={styles.detailsError}>{detailsError}</Text>
        ) : null}

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
          onPress={handleToggle}
          loading={toggling}
          disabled={toggling}
          buttonColor={selected ? colors.success : colors.accent}
          textColor="#FFFFFF"
          contentStyle={styles.footerButton}
          style={[styles.footerAction, selected && styles.footerActionSelected]}
          labelStyle={{ fontWeight: '700' }}
          icon={toggling ? undefined : selected ? 'check-circle' : 'plus'}
        >
          {toggling
            ? 'Updating…'
            : selected
              ? 'Added to route'
              : 'Add to route'}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionTitleInline: {
    color: colors.text,
    fontWeight: '700',
  },
  description: {
    color: colors.text,
    lineHeight: 24,
    fontSize: 16,
  },
  mapsLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginLeft: -8,
  },
  detailsError: {
    color: colors.error,
    marginTop: spacing.md,
    fontSize: 13,
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
