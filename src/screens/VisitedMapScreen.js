import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getCountryDetails } from '../api/travelApi';
import { CountryDetailSheet } from '../components/world/CountryDetailSheet';
import { WorldMapSvg } from '../components/world/WorldMapSvg';
import { useTravel } from '../context/TravelContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePlaces } from '../hooks/usePlaces';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../utils/worldCountries';
import { colors, spacing } from '../theme/colors';

const SHEET_HEIGHT = 460;
const CITIES_LIMIT = 12;
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const MAP_ASPECT = WORLD_WIDTH / WORLD_HEIGHT;

function fitMapSize(containerW, containerH) {
  if (containerW <= 0 || containerH <= 0) {
    return { width: 0, height: 0 };
  }
  if (containerW / containerH > MAP_ASPECT) {
    const height = containerH;
    return { width: height * MAP_ASPECT, height };
  }
  const width = containerW;
  return { width, height: width / MAP_ASPECT };
}

function clampPan(panX, panY, scale, fitted, container) {
  const displayW = fitted.width * scale;
  const displayH = fitted.height * scale;
  const minX = Math.min(0, container.width - displayW);
  const maxX = Math.max(0, container.width - displayW);
  const minY = Math.min(0, container.height - displayH);
  const maxY = Math.max(0, container.height - displayH);

  const centeredX = (container.width - displayW) / 2 + panX;
  const centeredY = (container.height - displayH) / 2 + panY;

  return {
    x: Math.min(maxX, Math.max(minX, centeredX)),
    y: Math.min(maxY, Math.max(minY, centeredY)),
  };
}

export function VisitedMapScreen({ navigation }) {
  const { t } = useTranslation();
  const {
    visitedCountryCodes,
    markCountryVisited,
    removeVisitsForCountry,
    getVisitsForCountry,
    isCityVisited,
  } = useTravel();
  const { isOffline } = useNetworkStatus();
  const { searchCityAtCoordinates, loading: openingCity } = usePlaces();

  const sheetAnim = useRef(new Animated.Value(0)).current;
  const citiesCacheRef = useRef(new Map());

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [container, setContainer] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState(null);
  const [citiesRequestKey, setCitiesRequestKey] = useState(0);
  const [openingCityName, setOpeningCityName] = useState(null);

  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const lastScale = useRef(1);
  const lastPan = useRef({ x: 0, y: 0 });
  const initialPinchDistance = useRef(null);
  const isPinching = useRef(false);
  const containerRef = useRef(container);
  const fittedRef = useRef({ width: 0, height: 0 });
  const frameRef = useRef(null);

  const fitted = useMemo(
    () => fitMapSize(container.width, container.height),
    [container]
  );

  containerRef.current = container;
  fittedRef.current = fitted;
  scaleRef.current = scale;
  panRef.current = pan;

  const mapOffset = useMemo(
    () => clampPan(pan.x, pan.y, scale, fitted, container),
    [pan, scale, fitted, container]
  );

  const visitedSet = useMemo(
    () => new Set(visitedCountryCodes),
    [visitedCountryCodes]
  );

  const placeVisits = useMemo(() => {
    if (!selectedCountry?.id) return [];
    return getVisitsForCountry(selectedCountry.id).filter(
      (visit) => visit.kind === 'place' && visit.placeName
    );
  }, [selectedCountry?.id, getVisitsForCountry]);

  const loadCities = useCallback(async (countryCode, { force = false } = {}) => {
    const code = String(countryCode || '').toUpperCase();
    if (!code) return;

    if (!force && citiesCacheRef.current.has(code)) {
      setCities(citiesCacheRef.current.get(code));
      setCitiesError(null);
      setCitiesLoading(false);
      return;
    }

    if (isOffline) {
      setCities([]);
      setCitiesError(t('map.offlineCities'));
      setCitiesLoading(false);
      return;
    }

    setCitiesLoading(true);
    setCitiesError(null);

    try {
      const result = await getCountryDetails(code, CITIES_LIMIT);
      const list = Array.isArray(result.cities) ? result.cities : [];
      citiesCacheRef.current.set(code, list);
      setCities(list);
    } catch (error) {
      setCities([]);
      setCitiesError(error?.message || t('map.citiesError'));
    } finally {
      setCitiesLoading(false);
    }
  }, [isOffline, t]);

  useEffect(() => {
    if (!selectedCountry?.id) {
      setCities([]);
      setCitiesError(null);
      setCitiesLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await loadCities(selectedCountry.id);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCountry?.id, citiesRequestKey, loadCities]);

  const scheduleTransform = useCallback((nextScale, nextPan) => {
    if (frameRef.current != null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const fittedNow = fittedRef.current;
      const containerNow = containerRef.current;
      const clamped = clampPan(
        nextPan.x,
        nextPan.y,
        nextScale,
        fittedNow,
        containerNow
      );
      const displayW = fittedNow.width * nextScale;
      const displayH = fittedNow.height * nextScale;
      const relativePan = {
        x: clamped.x - (containerNow.width - displayW) / 2,
        y: clamped.y - (containerNow.height - displayH) / 2,
      };
      scaleRef.current = nextScale;
      panRef.current = relativePan;
      setScale(nextScale);
      setPan(relativePan);
    });
  }, []);

  const openSheet = useCallback(
    ({ id, name, d }) => {
      setSelectedCountry({ id, name, d });
      setCities([]);
      setCitiesError(null);
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    },
    [sheetAnim]
  );

  const closeSheet = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedCountry(null);
      setOpeningCityName(null);
    });
  }, [sheetAnim]);

  const handleCityPress = useCallback(
    async (city) => {
      if (!city?.name || openingCity || openingCityName) return;

      if (isOffline) {
        Alert.alert(
          t('map.openCityOfflineTitle'),
          t('map.openCityOfflineBody')
        );
        return;
      }

      setOpeningCityName(city.name);
      try {
        const { attractions } = await searchCityAtCoordinates({
          name: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
          id:
            city.geonameId != null
              ? `geoname_${city.geonameId}`
              : undefined,
        });
        navigation.navigate('Attractions', {
          resultCount: attractions.length,
        });
      } catch (error) {
        Alert.alert(
          t('map.openCityErrorTitle'),
          error?.message || t('map.openCityErrorBody')
        );
      } finally {
        setOpeningCityName(null);
      }
    },
    [
      isOffline,
      navigation,
      openingCity,
      openingCityName,
      searchCityAtCoordinates,
      t,
    ]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        isPinching.current = false;
        initialPinchDistance.current = null;
        lastScale.current = scaleRef.current;
        lastPan.current = { ...panRef.current };
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        const touchCount = touches.length;

        if (touchCount === 2) {
          const [a, b] = touches;
          const dx = a.pageX - b.pageX;
          const dy = a.pageY - b.pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (!initialPinchDistance.current) {
            initialPinchDistance.current = distance;
            lastScale.current = scaleRef.current;
            lastPan.current = { ...panRef.current };
          }

          isPinching.current = true;

          if (initialPinchDistance.current) {
            const ratio = distance / initialPinchDistance.current;
            const nextScale = Math.min(
              Math.max(lastScale.current * ratio, MIN_SCALE),
              MAX_SCALE
            );
            scheduleTransform(nextScale, lastPan.current);
          }
          return;
        }

        if (!isPinching.current && touchCount === 1) {
          if (scaleRef.current > 1.02) {
            scheduleTransform(scaleRef.current, {
              x: lastPan.current.x + gestureState.dx,
              y: lastPan.current.y + gestureState.dy,
            });
          }
        }
      },
      onPanResponderRelease: () => {
        lastScale.current = scaleRef.current;
        lastPan.current = { ...panRef.current };
        isPinching.current = false;
        initialPinchDistance.current = null;
        if (scaleRef.current <= 1.02) {
          scheduleTransform(1, { x: 0, y: 0 });
        }
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        lastScale.current = scaleRef.current;
        lastPan.current = { ...panRef.current };
        isPinching.current = false;
        initialPinchDistance.current = null;
      },
    })
  ).current;

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, 0],
  });

  const displayW = fitted.width * scale;
  const displayH = fitted.height * scale;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('map.title')}</Text>
        <Text style={styles.subtitle}>
          {t('map.countriesVisited', { count: visitedCountryCodes.length })}
        </Text>
      </View>

      <View
        style={styles.mapArea}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setContainer((prev) =>
            prev.width === width && prev.height === height
              ? prev
              : { width, height }
          );
        }}
        {...panResponder.panHandlers}
      >
        {displayW > 0 && displayH > 0 ? (
          <View
            style={[
              styles.mapCanvas,
              {
                width: displayW,
                height: displayH,
                left: mapOffset.x,
                top: mapOffset.y,
              },
            ]}
            pointerEvents="box-none"
          >
            <WorldMapSvg
              width={displayW}
              height={displayH}
              visitedIds={visitedCountryCodes}
              selectedId={selectedCountry?.id || null}
              onCountryPress={openSheet}
            />
          </View>
        ) : null}

        <CountryDetailSheet
          country={selectedCountry}
          translateY={sheetTranslateY}
          isVisited={
            selectedCountry ? visitedSet.has(selectedCountry.id) : false
          }
          cities={cities}
          citiesLoading={citiesLoading}
          citiesError={citiesError}
          openingCityName={openingCityName}
          placeVisits={placeVisits}
          isCityVisited={(cityName) =>
            selectedCountry
              ? isCityVisited(selectedCountry.id, cityName)
              : false
          }
          onRetryCities={() => {
            if (!selectedCountry?.id) return;
            citiesCacheRef.current.delete(
              String(selectedCountry.id).toUpperCase()
            );
            setCitiesRequestKey((key) => key + 1);
          }}
          onCityPress={handleCityPress}
          onClose={closeSheet}
          onMarkVisited={() => {
            if (!selectedCountry) return;
            markCountryVisited(selectedCountry.id);
          }}
          onClearCountry={() => {
            if (!selectedCountry) return;
            removeVisitsForCountry(selectedCountry.id);
          }}
        />
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
    zIndex: 2,
    elevation: 4,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  mapArea: {
    flex: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    zIndex: 0,
  },
  mapCanvas: {
    position: 'absolute',
  },
});
