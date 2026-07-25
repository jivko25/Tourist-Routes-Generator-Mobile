/**
 * Pick user photos as Media Library references (no app-sandbox full copies).
 */

import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { createCityAlbumPhoto } from '../types/cityAlbum';

async function ensureLibraryPermission() {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const next = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return next.granted;
}

async function ensureCameraPermission() {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  const next = await ImagePicker.requestCameraPermissionsAsync();
  return next.granted;
}

/**
 * Resolve a display URI for a stored album photo.
 * @param {{ assetId?: string|null, uri?: string|null }} photo
 * @returns {Promise<string|null>}
 */
export async function resolveAlbumPhotoUri(photo) {
  if (!photo) return null;

  if (photo.assetId) {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(photo.assetId);
      const resolved = info?.localUri || info?.uri || null;
      if (resolved) return resolved;
    } catch {
      // Fall through to stored uri.
    }
  }

  return photo.uri || null;
}

/**
 * Persist a camera capture into the system gallery, then return a reference.
 * @param {string} tempUri
 */
async function referenceFromCameraUri(tempUri) {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    // Still keep the temp uri so the user sees the photo this session.
    return createCityAlbumPhoto({ uri: tempUri, assetId: null });
  }

  try {
    const asset = await MediaLibrary.createAssetAsync(tempUri);
    return createCityAlbumPhoto({
      assetId: asset?.id || null,
      uri: asset?.uri || tempUri,
    });
  } catch {
    return createCityAlbumPhoto({ uri: tempUri, assetId: null });
  }
}

function photoFromPickerAsset(asset) {
  return createCityAlbumPhoto({
    assetId: asset?.assetId || null,
    uri: asset?.uri || null,
  });
}

/**
 * Pick one or more photos from the device gallery (references only).
 * @returns {Promise<import('../types/cityAlbum').CityAlbumPhoto[]>}
 */
export async function pickPhotosFromLibrary({ selectionLimit = 12 } = {}) {
  const granted = await ensureLibraryPermission();
  if (!granted) {
    Alert.alert(
      'Photos permission',
      'Allow photo access to add pictures to this city album.'
    );
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit,
    quality: 1,
    exif: false,
  });

  if (result.canceled || !result.assets?.length) return [];
  return result.assets
    .map(photoFromPickerAsset)
    .filter((photo) => photo.assetId || photo.uri);
}

/**
 * Take a photo with the camera and save a gallery reference.
 * @returns {Promise<import('../types/cityAlbum').CityAlbumPhoto[]>}
 */
export async function capturePhotoForAlbum() {
  const granted = await ensureCameraPermission();
  if (!granted) {
    Alert.alert(
      'Camera permission',
      'Allow camera access to take a photo for this city album.'
    );
    return [];
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    exif: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return [];

  const asset = result.assets[0];
  // Camera returns a temp file — prefer linking via Media Library when possible.
  if (Platform.OS !== 'web') {
    const referenced = await referenceFromCameraUri(asset.uri);
    return [referenced];
  }

  return [photoFromPickerAsset(asset)];
}
