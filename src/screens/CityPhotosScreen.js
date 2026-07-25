import React, { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  AlbumPhotoThumb,
  FullscreenPhotoModal,
} from '../components/FullscreenPhotoModal';
import { useTravel } from '../context/TravelContext';
import {
  capturePhotoForAlbum,
  enrichPhotosFingerprints,
  pickPhotosFromLibrary,
  resolveAlbumPhotoUri,
} from '../services/cityAlbumService';
import { colors, radii, spacing } from '../theme/colors';

export function CityPhotosScreen({ route }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const {
    countryCode,
    countryName,
    cityName,
  } = route.params || {};
  const {
    getCityAlbum,
    addPhotosToCityAlbum,
    removePhotoFromCityAlbum,
  } = useTravel();

  const [busy, setBusy] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [resolvedViewerUris, setResolvedViewerUris] = useState([]);

  const album = getCityAlbum(countryCode, cityName);
  const photos = album?.photos || [];

  const gap = spacing.sm;
  const columns = 3;
  const tile = Math.floor((width - spacing.lg * 2 - gap * (columns - 1)) / columns);

  const openViewer = useCallback(
    async (startIndex) => {
      setBusy(true);
      try {
        const resolved = [];
        let targetIndex = 0;
        for (let i = 0; i < photos.length; i += 1) {
          const url = await resolveAlbumPhotoUri(photos[i]);
          if (!url) continue;
          if (i === startIndex) targetIndex = resolved.length;
          resolved.push({ url });
        }
        setResolvedViewerUris(resolved);
        setViewerIndex(resolved.length ? targetIndex : null);
      } finally {
        setBusy(false);
      }
    },
    [photos]
  );

  const appendPhotos = useCallback(
    async (incoming) => {
      if (!incoming?.length) return;

      const existing = getCityAlbum(countryCode, cityName)?.photos || [];
      const [backfilledExisting, enrichedIncoming] = await Promise.all([
        enrichPhotosFingerprints(existing),
        enrichPhotosFingerprints(incoming),
      ]);

      const { added, skipped } = addPhotosToCityAlbum(
        countryCode,
        cityName,
        enrichedIncoming,
        {
          countryName,
          // Use hashed existing list in the same update (avoids stale state race).
          existingPhotos: backfilledExisting,
        }
      );

      if (skipped > 0 && added === 0) {
        Alert.alert(t('album.duplicatesTitle'), t('album.duplicatesAllBody'));
      } else if (skipped > 0) {
        Alert.alert(
          t('album.duplicatesTitle'),
          t('album.duplicatesPartialBody', { added, skipped })
        );
      }
    },
    [
      addPhotosToCityAlbum,
      countryCode,
      cityName,
      countryName,
      getCityAlbum,
      t,
    ]
  );

  const handleAdd = useCallback(() => {
    const fromLibrary = async () => {
      setBusy(true);
      try {
        const picked = await pickPhotosFromLibrary();
        await appendPhotos(picked);
      } finally {
        setBusy(false);
      }
    };

    const fromCamera = async () => {
      setBusy(true);
      try {
        const captured = await capturePhotoForAlbum();
        await appendPhotos(captured);
      } finally {
        setBusy(false);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('common.cancel'),
            t('album.addFromLibrary'),
            t('album.takePhoto'),
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) fromLibrary();
          if (buttonIndex === 2) fromCamera();
        }
      );
      return;
    }

    Alert.alert(t('album.addPhotos'), t('album.addPhotosHint'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('album.addFromLibrary'), onPress: fromLibrary },
      { text: t('album.takePhoto'), onPress: fromCamera },
    ]);
  }, [appendPhotos, t]);

  const handleDelete = useCallback(
    (photoId) => {
      Alert.alert(t('album.removeTitle'), t('album.removeBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('album.remove'),
          style: 'destructive',
          onPress: () =>
            removePhotoFromCityAlbum(countryCode, cityName, photoId),
        },
      ]);
    },
    [countryCode, cityName, removePhotoFromCityAlbum, t]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.title}>
          {cityName}
        </Text>
        <Text style={styles.subtitle}>
          {countryName || countryCode}
          {photos.length
            ? ` · ${t('album.photoCount', { count: photos.length })}`
            : ''}
        </Text>
        <Text style={styles.hint}>{t('album.hint')}</Text>
      </View>

      {photos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('album.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('album.emptyBody')}</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap }}
          ItemSeparatorComponent={() => <View style={{ height: gap }} />}
          renderItem={({ item, index }) => (
            <AlbumPhotoThumb
              photo={item}
              resolveUri={resolveAlbumPhotoUri}
              style={{ width: tile, height: tile, borderRadius: radii.sm, overflow: 'hidden' }}
              onPress={() => openViewer(index)}
              onLongPress={() => handleDelete(item.id)}
            />
          )}
        />
      )}

      <View style={styles.footer}>
        <Button
          mode="contained"
          icon="image-plus"
          onPress={handleAdd}
          loading={busy}
          disabled={busy}
          buttonColor={colors.accent}
          textColor="#FFFFFF"
          style={styles.addBtn}
          contentStyle={styles.addBtnContent}
        >
          {t('album.addPhotos')}
        </Button>
      </View>

      <FullscreenPhotoModal
        visible={viewerIndex != null && resolvedViewerUris.length > 0}
        photos={resolvedViewerUris}
        initialIndex={viewerIndex || 0}
        onClose={() => setViewerIndex(null)}
      />

      {busy && photos.length > 0 ? (
        <View style={styles.busyOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontWeight: '600',
  },
  hint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  addBtn: {
    borderRadius: radii.pill,
  },
  addBtnContent: {
    paddingVertical: 4,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,251,255,0.35)',
  },
});
