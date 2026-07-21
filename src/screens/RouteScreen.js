import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SelectedPlaceCard } from '../components/SelectedPlaceCard';
import { useTravel } from '../context/TravelContext';
import { openGoogleMapsRoute } from '../services/mapsService';
import { colors, radii, spacing } from '../theme/colors';

export function RouteScreen({ navigation }) {
  const { selectedAttractions, removeAttraction, clearRoute } = useTravel();
  const [opening, setOpening] = useState(false);
  const listOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(listOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [listOpacity, selectedAttractions.length]);

  const handleGenerateRoute = async () => {
    setOpening(true);
    try {
      await openGoogleMapsRoute(selectedAttractions);
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

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>
          Your Route
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Places will open in Google Maps in this order.
        </Text>

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
                onPress={() => navigation.navigate('Home')}
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
                onRemove={removeAttraction}
              />
            ))
          )}
        </Animated.View>
      </ScrollView>

      {selectedAttractions.length > 0 ? (
        <View style={styles.actions}>
          <Button
            mode="contained"
            loading={opening}
            disabled={opening}
            onPress={handleGenerateRoute}
            buttonColor={colors.secondary}
            textColor="#FFFFFF"
            style={styles.primaryAction}
            contentStyle={styles.actionContent}
            icon="map-marker-path"
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
    color: colors.primary,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
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
    borderRadius: radii.md,
  },
  secondaryAction: {
    borderRadius: radii.md,
    borderColor: colors.error,
  },
  actionContent: {
    paddingVertical: spacing.xs,
  },
});
