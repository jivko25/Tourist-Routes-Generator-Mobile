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
import { colors, spacing } from '../theme/colors';

const SHEET_HEIGHT = 320;

export function VisitedMapScreen() {
  const {
    visitedCountryCodes,
    getVisitsForCountry,
    markCountryVisited,
    removeVisitsForCountry,
  } = useTravel();

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const lastScale = useRef(1);
  const lastTranslate = useRef({ x: 0, y: 0 });
  const initialPinchDistance = useRef(null);
  const isPinching = useRef(false);
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });

  const [selectedCountry, setSelectedCountry] = useState(null);

  const visitedSet = useMemo(
    () => new Set(visitedCountryCodes),
    [visitedCountryCodes]
  );

  const countryVisits = useMemo(
    () =>
      selectedCountry ? getVisitsForCountry(selectedCountry.id) : [],
    [selectedCountry, getVisitsForCountry]
  );

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
          }

          isPinching.current = true;

          if (initialPinchDistance.current) {
            const ratio = distance / initialPinchDistance.current;
            const next = Math.min(Math.max(lastScale.current * ratio, 1), 5);
            scaleRef.current = next;
            scale.setValue(next);
          }
          return;
        }

        if (!isPinching.current && touchCount === 1) {
          if (scaleRef.current > 1.02) {
            const nextX = lastTranslate.current.x + gestureState.dx;
            const nextY = lastTranslate.current.y + gestureState.dy;
            translateRef.current = { x: nextX, y: nextY };
            translateX.setValue(nextX);
            translateY.setValue(nextY);
          }
        }
      },
      onPanResponderRelease: () => {
        lastScale.current = scaleRef.current;
        lastTranslate.current = { ...translateRef.current };
        isPinching.current = false;
        initialPinchDistance.current = null;
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        lastScale.current = scaleRef.current;
        lastTranslate.current = { ...translateRef.current };
        isPinching.current = false;
        initialPinchDistance.current = null;
      },
    })
  ).current;

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, 0],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My map</Text>
        <Text style={styles.subtitle}>
          {visitedCountryCodes.length} countr
          {visitedCountryCodes.length === 1 ? 'y' : 'ies'} visited
        </Text>
      </View>

      <View style={styles.mapArea}>
        <Animated.View
          style={[
            styles.mapWrapper,
            {
              transform: [{ translateX }, { translateY }, { scale }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <WorldMapSvg
            visitedIds={visitedCountryCodes}
            selectedId={selectedCountry?.id || null}
            onCountryPress={openSheet}
          />
        </Animated.View>

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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
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
  },
  mapWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
  },
});
