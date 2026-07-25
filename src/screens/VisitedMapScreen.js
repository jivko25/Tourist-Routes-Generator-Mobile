import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CountryDetailSheet } from '../components/world/CountryDetailSheet';
import { WorldMapSvg } from '../components/world/WorldMapSvg';
import { useTravel } from '../context/TravelContext';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../utils/worldCountries';
import { colors, spacing } from '../theme/colors';

const SHEET_HEIGHT = 320;
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

  // Centered origin + pan, then clamp so the map stays covering the viewport when zoomed.
  const centeredX = (container.width - displayW) / 2 + panX;
  const centeredY = (container.height - displayH) / 2 + panY;

  return {
    x: Math.min(maxX, Math.max(minX, centeredX)),
    y: Math.min(maxY, Math.max(minY, centeredY)),
  };
}

export function VisitedMapScreen() {
  const {
    visitedCountryCodes,
    getVisitsForCountry,
    markCountryVisited,
    removeVisitsForCountry,
  } = useTravel();

  const sheetAnim = useRef(new Animated.Value(0)).current;

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [container, setContainer] = useState({ width: 0, height: 0 });
  // Vector zoom: grow SVG layout size (not transform:scale) so paths stay sharp.
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

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

  const countryVisits = useMemo(
    () =>
      selectedCountry ? getVisitsForCountry(selectedCountry.id) : [],
    [selectedCountry, getVisitsForCountry]
  );

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
      // Store pan relative to centered position for stable gesture math.
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
    }).start(() => setSelectedCountry(null));
  }, [sheetAnim]);

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
        <Text style={styles.title}>My map</Text>
        <Text style={styles.subtitle}>
          {visitedCountryCodes.length} countr
          {visitedCountryCodes.length === 1 ? 'y' : 'ies'} visited
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
          visits={countryVisits}
          translateY={sheetTranslateY}
          isVisited={
            selectedCountry ? visitedSet.has(selectedCountry.id) : false
          }
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
