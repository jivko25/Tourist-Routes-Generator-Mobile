import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlaceMap } from '../components/PlaceMap';
import { SelectedPlaceCard } from '../components/SelectedPlaceCard';
import { useTravel } from '../context/TravelContext';
import { geocodeCity } from '../services/geocodingService';
import { openGoogleMapsRoute } from '../services/mapsService';
import { fetchRouteTravelEstimate } from '../services/directionsService';
import {
  formatDistanceKm,
  optimizeAttractionOrder,
} from '../utils/routeOptimization';
import {
  buildRoutePathPoints,
  estimateRouteTiming,
} from '../utils/visitDuration';
import { formatTravelModeLabel } from '../utils/config';
import { colors, radii, spacing } from '../theme/colors';

export function RouteScreen({ navigation }) {
  const {
    selectedAttractions,
    removeAttraction,
    reorderSelectedAttractions,
    clearRoute,
    settings,
    cityCoordinates,
    attractions,
    searchedCity,
    saveCurrentRoute,
  } = useTravel();
  const [opening, setOpening] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [liveTravelMinutes, setLiveTravelMinutes] = useState(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const [travelError, setTravelError] = useState(null);
  const listOpacity = useRef(new Animated.Value(0)).current;

  const startAddress = settings.startAddress?.trim() || '';
  const endAddress = settings.endAddress?.trim() || '';

  useEffect(() => {
    Animated.timing(listOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [listOpacity, selectedAttractions.length]);

  useEffect(() => {
    let mounted = true;

    async function resolveEndpoints() {
      try {
        const [start, end] = await Promise.all([
          startAddress
            ? geocodeCity(startAddress).catch(() => null)
            : Promise.resolve(null),
          endAddress
            ? geocodeCity(endAddress).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (!mounted) return;
        setStartPoint(
          start
            ? {
                id: 'route-start',
                name: start.name || startAddress,
                latitude: start.latitude,
                longitude: start.longitude,
                role: 'start',
              }
            : null
        );
        setEndPoint(
          end
            ? {
                id: 'route-end',
                name: end.name || endAddress,
                latitude: end.latitude,
                longitude: end.longitude,
                role: 'end',
              }
            : null
        );
      } catch {
        if (!mounted) return;
        setStartPoint(null);
        setEndPoint(null);
      }
    }

    resolveEndpoints();
    return () => {
      mounted = false;
    };
  }, [startAddress, endAddress]);

  const mapPoints = useMemo(() => {
    const stops = selectedAttractions.map((attraction, index) => ({
      id: attraction.id,
      name: `${index + 1}. ${attraction.name}`,
      latitude: attraction.latitude,
      longitude: attraction.longitude,
      role: 'stop',
    }));

    return [
      ...(startPoint ? [startPoint] : []),
      ...stops,
      ...(endPoint ? [endPoint] : []),
    ];
  }, [selectedAttractions, startPoint, endPoint]);

  useEffect(() => {
    if (selectedAttractions.length === 0) {
      setRouteStats(null);
      return;
    }

    const result = optimizeAttractionOrder(selectedAttractions, {
      start: startPoint,
      end: endPoint,
    });

    setRouteStats({
      currentDistanceKm: result.originalDistanceKm,
      optimizedDistanceKm: result.distanceKm,
      canImprove:
        result.ordered.map((item) => item.id).join('|') !==
        selectedAttractions.map((item) => item.id).join('|'),
      optimizedOrder: result.ordered,
    });
  }, [selectedAttractions, startPoint, endPoint]);

  useEffect(() => {
    const pathPoints = buildRoutePathPoints({
      attractions: selectedAttractions,
      start: startPoint,
      end: endPoint,
    });

    if (pathPoints.length < 2) {
      setLiveTravelMinutes(null);
      setTravelLoading(false);
      setTravelError(null);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setTravelLoading(true);
      setTravelError(null);
      try {
        const estimate = await fetchRouteTravelEstimate({
          points: pathPoints,
          travelMode: settings.travelMode,
        });
        if (!cancelled) {
          setLiveTravelMinutes(estimate.travelMinutes);
        }
      } catch (error) {
        if (!cancelled) {
          setLiveTravelMinutes(null);
          setTravelError(
            error?.response?.data?.error?.message ||
              error?.message ||
              'Could not load Google travel time.'
          );
        }
      } finally {
        if (!cancelled) setTravelLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    selectedAttractions,
    startPoint,
    endPoint,
    settings.travelMode,
  ]);

  const handleOptimizeRoute = () => {
    if (!routeStats?.optimizedOrder?.length) return;

    setOptimizing(true);
    try {
      reorderSelectedAttractions(routeStats.optimizedOrder);
    } finally {
      setOptimizing(false);
    }
  };

  const handleGenerateRoute = async () => {
    setOpening(true);
    try {
      await openGoogleMapsRoute(selectedAttractions, {
        origin: startAddress,
        destination: endAddress,
        travelMode: settings.travelMode,
      });
    } catch (error) {
      Alert.alert('Route error', error.message || 'Could not open Google Maps.');
    } finally {
      setOpening(false);
    }
  };

  const handleClearRoute = () => {
    Alert.alert('Clear route', 'Remove all selected places?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: clearRoute,
      },
    ]);
  };

  const openSaveDialog = () => {
    const cityLabel = searchedCity?.split(',')?.[0] || 'Trip';
    setRouteName(
      `${cityLabel} · ${selectedAttractions.length} stop${
        selectedAttractions.length === 1 ? '' : 's'
      }`
    );
    setSaveDialogVisible(true);
  };

  const handleSaveRoute = () => {
    setSaving(true);
    try {
      const saved = saveCurrentRoute(routeName.trim());
      setSaveDialogVisible(false);
      Alert.alert('Route saved', `"${saved.name}" is now in Saved.`, [
        { text: 'Stay here', style: 'cancel' },
        {
          text: 'View saved',
          onPress: () =>
            navigation.navigate('MainTabs', { screen: 'SavedTab' }),
        },
      ]);
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Could not save this route.');
    } finally {
      setSaving(false);
    }
  };

  const distanceOrigin = startPoint || cityCoordinates || null;
  const distanceOriginLabel = startPoint ? 'start' : 'city center';
  const canGenerate = selectedAttractions.length > 0;
  const canAddMorePlaces =
    Boolean(cityCoordinates) || attractions.length > 0;
  const routeTiming = useMemo(
    () =>
      estimateRouteTiming({
        attractions: selectedAttractions,
        start: startPoint,
        end: endPoint,
        travelMode: settings.travelMode,
        travelMinutesOverride: liveTravelMinutes,
      }),
    [
      selectedAttractions,
      startPoint,
      endPoint,
      settings.travelMode,
      liveTravelMinutes,
    ]
  );

  const handleAddMorePlaces = () => {
    if (canAddMorePlaces) {
      navigation.navigate('Attractions');
      return;
    }
    navigation.navigate('MainTabs', { screen: 'HomeTab' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>
          Your Route
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Preview the full path, optimize stop order, then open it in Google
          Maps.
        </Text>

        <Button
          mode="outlined"
          onPress={handleAddMorePlaces}
          icon="plus-circle-outline"
          textColor={colors.primary}
          style={styles.addMoreBtn}
          contentStyle={styles.addMoreContent}
          labelStyle={styles.addMoreLabel}
        >
          {canAddMorePlaces
            ? `Add more places${searchedCity ? ` in ${searchedCity.split(',')[0]}` : ''}`
            : 'Search places to add'}
        </Button>

        {selectedAttractions.length > 0 ? (
          <View style={styles.mapSection}>
            <PlaceMap points={mapPoints} showRoute height={260} />
            {routeStats ? (
              <Text style={styles.distanceText}>
                Approx. distance: {formatDistanceKm(routeStats.currentDistanceKm)}
                {routeStats.canImprove
                  ? ` · Better order ~${formatDistanceKm(
                      routeStats.optimizedDistanceKm
                    )} (save ~${formatDistanceKm(
                      Math.max(
                        0,
                        routeStats.currentDistanceKm -
                          routeStats.optimizedDistanceKm
                      )
                    )})`
                  : ' · Order looks optimal'}
              </Text>
            ) : null}
            {selectedAttractions.length > 0 ? (
              <View style={styles.timingBox}>
                <Text style={styles.timingTitle}>Estimated schedule</Text>
                <Text style={styles.timingRow}>
                  At places: ~{routeTiming.visitLabel}
                </Text>
                <Text style={styles.timingRow}>
                  Travel ({formatTravelModeLabel(settings.travelMode)}): ~
                  {travelLoading && !routeTiming.travelIsLive
                    ? '…'
                    : routeTiming.travelLabel}
                  {routeTiming.travelIsLive ? ' · Google' : ''}
                </Text>
                <Text style={styles.timingTotal}>
                  Total route: ~
                  {travelLoading && !routeTiming.travelIsLive
                    ? '…'
                    : routeTiming.totalLabel}
                </Text>
                {travelError && !routeTiming.travelIsLive ? (
                  <Text style={styles.timingHint}>
                    Using approximate travel time ({travelError})
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.endpoints}>
          <Text style={styles.endpointLabel}>Start</Text>
          <Text style={styles.endpointValue}>
            {startAddress || 'First selected attraction'}
          </Text>
          <Text style={[styles.endpointLabel, styles.endpointLabelSpaced]}>
            End
          </Text>
          <Text style={styles.endpointValue}>
            {endAddress || 'Last selected attraction'}
          </Text>
          <Text style={[styles.endpointLabel, styles.endpointLabelSpaced]}>
            Transport
          </Text>
          <Text style={styles.endpointValue}>
            {formatTravelModeLabel(settings.travelMode)}
          </Text>
          <Button
            mode="text"
            compact
            onPress={() => navigation.navigate('Settings')}
            textColor={colors.primary}
            style={styles.editSettings}
          >
            Edit in Settings
          </Button>
        </View>

        <Animated.View style={{ opacity: listOpacity }}>
          {selectedAttractions.length === 0 ? (
            <View style={styles.empty}>
              <Text variant="titleMedium" style={styles.emptyTitle}>
                No places selected
              </Text>
              <Text style={styles.emptyText}>
                Add attractions from a city search to build your itinerary.
              </Text>
              <Button
                mode="contained"
                buttonColor={colors.primary}
                onPress={() =>
                  navigation.navigate('MainTabs', { screen: 'HomeTab' })
                }
              >
                Search a city
              </Button>
            </View>
          ) : (
            selectedAttractions.map((attraction, index) => (
              <SelectedPlaceCard
                key={attraction.id}
                attraction={attraction}
                index={index + 1}
                origin={distanceOrigin}
                originLabel={distanceOriginLabel}
                onRemove={removeAttraction}
              />
            ))
          )}
        </Animated.View>
      </ScrollView>

      {canGenerate ? (
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={openSaveDialog}
            buttonColor={colors.success}
            textColor="#FFFFFF"
            style={styles.primaryAction}
            contentStyle={styles.actionContent}
            icon="bookmark-plus-outline"
            labelStyle={styles.actionLabel}
          >
            Save route
          </Button>
          <Button
            mode="contained"
            loading={optimizing}
            disabled={optimizing || !routeStats?.canImprove}
            onPress={handleOptimizeRoute}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.primaryAction}
            contentStyle={styles.actionContent}
            icon="sitemap"
            labelStyle={styles.actionLabel}
          >
            Optimize stop order
          </Button>
          <Button
            mode="contained"
            loading={opening}
            disabled={opening}
            onPress={handleGenerateRoute}
            buttonColor={colors.accent}
            textColor="#FFFFFF"
            style={styles.primaryAction}
            contentStyle={styles.actionContent}
            icon="map-marker-path"
            labelStyle={styles.actionLabel}
          >
            Generate Google Maps Route
          </Button>
          <Button
            mode="outlined"
            onPress={handleClearRoute}
            textColor={colors.error}
            style={styles.secondaryAction}
            contentStyle={styles.actionContent}
          >
            Clear Route
          </Button>
        </View>
      ) : null}

      <Portal>
        <Dialog
          visible={saveDialogVisible}
          onDismiss={() => setSaveDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Save route</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogHint}>
              Give this itinerary a name so you can reopen it later.
            </Text>
            <TextInput
              mode="outlined"
              label="Route name"
              value={routeName}
              onChangeText={setRouteName}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSaveDialogVisible(false)}>Cancel</Button>
            <Button
              loading={saving}
              disabled={!routeName.trim() || saving}
              onPress={handleSaveRoute}
              textColor={colors.success}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  title: {
    color: colors.text,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  addMoreBtn: {
    borderRadius: radii.pill,
    borderColor: colors.primary,
    marginBottom: spacing.lg,
    backgroundColor: colors.primarySoft,
  },
  addMoreContent: {
    paddingVertical: 4,
  },
  addMoreLabel: {
    fontWeight: '700',
  },
  mapSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  distanceText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  timingBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  timingTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 2,
  },
  timingRow: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  timingTotal: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 15,
    marginTop: 4,
  },
  timingHint: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
  endpoints: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  endpointLabel: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  endpointLabelSpaced: {
    marginTop: spacing.md,
  },
  endpointValue: {
    color: colors.text,
    marginTop: 4,
    lineHeight: 20,
    fontWeight: '600',
  },
  editSettings: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginLeft: -8,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  primaryAction: {
    borderRadius: radii.pill,
  },
  secondaryAction: {
    borderRadius: radii.pill,
    borderColor: colors.error,
  },
  actionContent: {
    paddingVertical: spacing.xs,
  },
  actionLabel: {
    fontWeight: '700',
  },
  dialog: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  dialogHint: {
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  dialogInput: {
    backgroundColor: colors.surface,
  },
});
