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
import { OfflineBanner } from '../components/OfflineBanner';
import { RouteActionsDock } from '../components/RouteActionsDock';
import { useTravel } from '../context/TravelContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { geocodeCity } from '../services/geocodingService';
import { openGoogleMapsRoute, shareGoogleMapsRoute } from '../services/mapsService';
import { fetchRouteTravelEstimate } from '../services/directionsService';
import { fetchPlaceDetails } from '../services/placesService';
import { getCurrentGpsPosition } from '../services/locationService';
import {
  formatDistanceKm,
  optimizeAttractionOrder,
} from '../utils/routeOptimization';
import {
  buildRoutePathPoints,
  estimateRouteTiming,
} from '../utils/visitDuration';
import { getOpenStatus } from '../utils/openingHours';
import { formatCoordinate } from '../utils/googleMaps';
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
    patchSelectedAttraction,
  } = useTravel();
  const { isOffline } = useNetworkStatus();
  const [opening, setOpening] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [addressStartPoint, setAddressStartPoint] = useState(null);
  const [addressEndPoint, setAddressEndPoint] = useState(null);
  const [gpsStartPoint, setGpsStartPoint] = useState(null);
  const [gpsEndPoint, setGpsEndPoint] = useState(null);
  const [gpsLoadingTarget, setGpsLoadingTarget] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [liveTravelMinutes, setLiveTravelMinutes] = useState(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const [travelError, setTravelError] = useState(null);
  const listOpacity = useRef(new Animated.Value(0)).current;
  const fetchedHoursIdsRef = useRef(new Set());

  const startAddress = settings.startAddress?.trim() || '';
  const endAddress = settings.endAddress?.trim() || '';
  const startPoint = gpsStartPoint || addressStartPoint;
  const endPoint = gpsEndPoint || addressEndPoint;

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
      if (isOffline) {
        return;
      }

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
        setAddressStartPoint(
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
        setAddressEndPoint(
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
        setAddressStartPoint(null);
        setAddressEndPoint(null);
      }
    }

    resolveEndpoints();
    return () => {
      mounted = false;
    };
  }, [startAddress, endAddress, isOffline]);

  const mapPoints = useMemo(() => {
    const stops = selectedAttractions.map((attraction, index) => ({
      id: attraction.id,
      name: `${index + 1}. ${attraction.name}`,
      latitude: attraction.latitude,
      longitude: attraction.longitude,
      role: 'stop',
      openStatus: getOpenStatus(attraction),
    }));

    return [
      ...(startPoint
        ? [
            {
              ...startPoint,
              isGps: Boolean(gpsStartPoint),
              openStatus: gpsStartPoint ? undefined : 'unknown',
            },
          ]
        : []),
      ...stops,
      ...(endPoint
        ? [
            {
              ...endPoint,
              isGps: Boolean(gpsEndPoint),
              openStatus: gpsEndPoint ? undefined : 'unknown',
            },
          ]
        : []),
    ];
  }, [selectedAttractions, startPoint, endPoint, gpsStartPoint, gpsEndPoint]);

  useEffect(() => {
    if (isOffline || selectedAttractions.length === 0) {
      if (selectedAttractions.length === 0) {
        fetchedHoursIdsRef.current.clear();
      }
      return undefined;
    }

    const selectedIds = new Set(selectedAttractions.map((item) => item.id));
    fetchedHoursIdsRef.current.forEach((id) => {
      if (!selectedIds.has(id)) fetchedHoursIdsRef.current.delete(id);
    });

    const pending = selectedAttractions.filter((item) => {
      if (fetchedHoursIdsRef.current.has(item.id)) return false;
      return !(
        Array.isArray(item.weekdayDescriptions) &&
        item.weekdayDescriptions.length > 0
      );
    });

    if (pending.length === 0) return undefined;

    let cancelled = false;
    pending.forEach((item) => fetchedHoursIdsRef.current.add(item.id));

    async function enrichOpeningHours() {
      const results = await Promise.allSettled(
        pending.map(async (item) => {
          const placeId = item.googlePlaceId || item.id;
          const details = await fetchPlaceDetails(placeId);
          return {
            id: item.id,
            openNow: details.openNow,
            weekdayDescriptions: details.weekdayDescriptions,
          };
        })
      );

      if (cancelled) return;

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          fetchedHoursIdsRef.current.delete(pending[index].id);
          return;
        }

        patchSelectedAttraction(result.value.id, {
          openNow: result.value.openNow,
          weekdayDescriptions: result.value.weekdayDescriptions,
        });
      });
    }

    enrichOpeningHours();

    return () => {
      cancelled = true;
    };
    // Intentionally keyed by stop ids so hours enrich once per selection set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedAttractions.map((item) => item.id).join('|'),
    patchSelectedAttraction,
    isOffline,
  ]);

  useEffect(() => {
    if (selectedAttractions.length === 0) {
      setRouteStats(null);
      return;
    }

    // Free open-path optimize (same undirected length either way).
    // Optional Settings addresses still act as fixed outer endpoints.
    const result = optimizeAttractionOrder(selectedAttractions, {
      start: startPoint,
      end: endPoint,
    });

    const improves =
      result.distanceKm + 1e-6 < result.originalDistanceKm &&
      result.ordered.map((item) => item.id).join('|') !==
        selectedAttractions.map((item) => item.id).join('|');

    setRouteStats({
      currentDistanceKm: result.originalDistanceKm,
      optimizedDistanceKm: result.distanceKm,
      canImprove: improves,
      optimizedOrder: result.ordered,
    });
  }, [selectedAttractions, startPoint, endPoint]);

  useEffect(() => {
    const pathPoints = buildRoutePathPoints({
      attractions: selectedAttractions,
      start: startPoint,
      end: endPoint,
    });

    if (isOffline || pathPoints.length < 2) {
      setLiveTravelMinutes(null);
      setTravelLoading(false);
      setTravelError(isOffline ? 'Offline — using approximate travel time.' : null);
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
    isOffline,
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

  const handleReverseRoute = () => {
    if (selectedAttractions.length < 2) return;
    reorderSelectedAttractions([...selectedAttractions].reverse());
  };

  const handleUseGpsPoint = async (target) => {
    setGpsLoadingTarget(target);
    try {
      const position = await getCurrentGpsPosition();
      const point = {
        id: target === 'start' ? 'gps-start' : 'gps-end',
        name: 'My location',
        latitude: position.latitude,
        longitude: position.longitude,
        role: target,
        isGps: true,
      };

      if (target === 'start') {
        setGpsStartPoint(point);
      } else {
        setGpsEndPoint(point);
      }
    } catch (error) {
      Alert.alert(
        'Location unavailable',
        error?.message || 'Could not get your current location.'
      );
    } finally {
      setGpsLoadingTarget(null);
    }
  };

  const handleClearGpsStart = () => {
    setGpsStartPoint(null);
  };

  const handleClearGpsEnd = () => {
    setGpsEndPoint(null);
  };

  const getMapsRouteOptions = () => {
    const origin = gpsStartPoint
      ? `${gpsStartPoint.latitude},${gpsStartPoint.longitude}`
      : startAddress;
    const destination = gpsEndPoint
      ? `${gpsEndPoint.latitude},${gpsEndPoint.longitude}`
      : endAddress;

    return {
      origin,
      destination,
      travelMode: settings.travelMode,
    };
  };

  const handleGenerateRoute = async () => {
    const openMaps = async () => {
      setOpening(true);
      try {
        await openGoogleMapsRoute(selectedAttractions, getMapsRouteOptions());
      } catch (error) {
        Alert.alert('Route error', error.message || 'Could not open Google Maps.');
      } finally {
        setOpening(false);
      }
    };

    if (isOffline) {
      Alert.alert(
        'You’re offline',
        'Google Maps needs internet to build turn-by-turn directions. Your stops stay available here. If you already downloaded offline maps in the Google Maps app for this area, opening may still work — otherwise try again online.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try anyway', onPress: openMaps },
        ]
      );
      return;
    }

    await openMaps();
  };

  const handleShareRoute = async () => {
    setSharing(true);
    try {
      const cityLabel = searchedCity?.split(',')?.[0];
      await shareGoogleMapsRoute(selectedAttractions, {
        ...getMapsRouteOptions(),
        title: cityLabel
          ? `${cityLabel} · Travel Go route`
          : 'Travel Go route',
      });
    } catch (error) {
      if (error?.message !== 'User did not share') {
        Alert.alert(
          'Share failed',
          error?.message || 'Could not share this Google Maps link.'
        );
      }
    } finally {
      setSharing(false);
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

  const distanceOrigin = startPoint || selectedAttractions[0] || cityCoordinates || null;
  const distanceOriginLabel = gpsStartPoint
    ? 'my location'
    : startPoint
      ? 'start'
      : selectedAttractions[0]
        ? 'start stop'
        : 'city center';
  const canGenerate = selectedAttractions.length > 0;
  const canAddMorePlaces =
    Boolean(cityCoordinates) || attractions.length > 0;
  const firstStop = selectedAttractions[0] || null;
  const lastStop =
    selectedAttractions.length > 0
      ? selectedAttractions[selectedAttractions.length - 1]
      : null;
  const startLabel = gpsStartPoint
    ? `My location (${formatCoordinate(gpsStartPoint.latitude)}, ${formatCoordinate(gpsStartPoint.longitude)})`
    : startAddress
      ? startAddress
      : firstStop?.name || 'First stop in list';
  const endLabel = gpsEndPoint
    ? `My location (${formatCoordinate(gpsEndPoint.latitude)}, ${formatCoordinate(gpsEndPoint.longitude)})`
    : endAddress
      ? endAddress
      : lastStop?.name || 'Last stop in list';
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
    if (isOffline && !canAddMorePlaces) {
      Alert.alert(
        'You’re offline',
        'New place searches need internet. You can still review this saved route offline.'
      );
      return;
    }

    if (canAddMorePlaces) {
      navigation.navigate('Attractions');
      return;
    }
    navigation.navigate('MainTabs', { screen: 'HomeTab' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={styles.title}>
          Your Route
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Preview the full path, optimize stop order, then open it in Google
          Maps.
        </Text>

        {isOffline ? (
          <OfflineBanner message="Reviewing saved stops offline. Live hours, Google travel times, and Maps directions need internet." />
        ) : null}

        <Button
          mode="outlined"
          onPress={handleAddMorePlaces}
          icon="plus-circle-outline"
          textColor={colors.primary}
          style={styles.addMoreBtn}
          contentStyle={styles.addMoreContent}
          labelStyle={styles.addMoreLabel}
          disabled={isOffline && !canAddMorePlaces}
        >
          {canAddMorePlaces
            ? `Add more places${searchedCity ? ` in ${searchedCity.split(',')[0]}` : ''}`
            : 'Search places to add'}
        </Button>

        {selectedAttractions.length > 0 ? (
          <View style={styles.mapSection}>
            <PlaceMap
              points={mapPoints}
              showRoute
              showOpenLegend
              height={280}
            />
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
          <Text style={styles.endpointValue}>{startLabel}</Text>
          <View style={styles.gpsRow}>
            <Button
              mode={gpsStartPoint ? 'contained' : 'outlined'}
              compact
              icon="crosshairs-gps"
              loading={gpsLoadingTarget === 'start'}
              disabled={Boolean(gpsLoadingTarget)}
              onPress={() => handleUseGpsPoint('start')}
              buttonColor={gpsStartPoint ? colors.primary : undefined}
              textColor={gpsStartPoint ? '#FFFFFF' : colors.primaryDark}
              style={styles.gpsBtn}
            >
              {gpsStartPoint ? 'Refresh start GPS' : 'Start from my location'}
            </Button>
            {gpsStartPoint ? (
              <Button
                mode="text"
                compact
                onPress={handleClearGpsStart}
                textColor={colors.error}
              >
                Clear
              </Button>
            ) : null}
          </View>

          <Text style={[styles.endpointLabel, styles.endpointLabelSpaced]}>
            End
          </Text>
          <Text style={styles.endpointValue}>{endLabel}</Text>
          <View style={styles.gpsRow}>
            <Button
              mode={gpsEndPoint ? 'contained' : 'outlined'}
              compact
              icon="crosshairs-gps"
              loading={gpsLoadingTarget === 'end'}
              disabled={Boolean(gpsLoadingTarget)}
              onPress={() => handleUseGpsPoint('end')}
              buttonColor={gpsEndPoint ? colors.primary : undefined}
              textColor={gpsEndPoint ? '#FFFFFF' : colors.primaryDark}
              style={styles.gpsBtn}
            >
              {gpsEndPoint ? 'Refresh end GPS' : 'End at my location'}
            </Button>
            {gpsEndPoint ? (
              <Button
                mode="text"
                compact
                onPress={handleClearGpsEnd}
                textColor={colors.error}
              >
                Clear
              </Button>
            ) : null}
          </View>

          <Text style={[styles.endpointLabel, styles.endpointLabelSpaced]}>
            Transport
          </Text>
          <Text style={styles.endpointValue}>
            {formatTravelModeLabel(settings.travelMode)}
          </Text>
          <Text style={styles.endpointHint}>
            GPS start/end use your current position (blue pin). Reverse flips
            stop order only. Optional hotel addresses still come from Settings.
          </Text>
          <Button
            mode="text"
            compact
            onPress={() => navigation.navigate('Settings')}
            textColor={colors.primary}
            style={styles.editSettings}
          >
            Edit addresses in Settings
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
            <>
              <View style={styles.listToolbar}>
                <Button
                  mode="outlined"
                  compact
                  icon="swap-vertical"
                  onPress={handleReverseRoute}
                  disabled={selectedAttractions.length < 2}
                  textColor={colors.primaryDark}
                  style={styles.reverseBtn}
                >
                  Reverse route
                </Button>
              </View>
              {selectedAttractions.map((attraction, index) => (
                <SelectedPlaceCard
                  key={attraction.id}
                  attraction={attraction}
                  index={index + 1}
                  isStart={index === 0}
                  isEnd={index === selectedAttractions.length - 1}
                  origin={distanceOrigin}
                  originLabel={distanceOriginLabel}
                  onRemove={removeAttraction}
                />
              ))}
            </>
          )}
        </Animated.View>
      </ScrollView>

      {canGenerate ? (
        <RouteActionsDock
          stopCount={selectedAttractions.length}
          opening={opening}
          sharing={sharing}
          optimizing={optimizing}
          canOptimize={Boolean(routeStats?.canImprove)}
          onOpenMaps={handleGenerateRoute}
          onShare={handleShareRoute}
          onSave={openSaveDialog}
          onOptimize={handleOptimizeRoute}
          onClear={handleClearRoute}
        />
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
  scroll: {
    flex: 1,
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
  endpointHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.sm,
  },
  gpsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  gpsBtn: {
    borderRadius: radii.pill,
    borderColor: colors.primary,
  },
  listToolbar: {
    marginBottom: spacing.sm,
  },
  reverseBtn: {
    borderRadius: radii.pill,
    borderColor: colors.primary,
    alignSelf: 'flex-start',
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
