/**
 * Pick user photos as Media Library references (no app-sandbox full copies).
 * Dedupes via MD5 content hash — ImagePicker temp URIs change every pick.
 */

import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
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
 * MD5 fingerprint so the same image is recognized across temp ImagePicker URIs.
 * @param {string|null|undefined} uri
 * @returns {Promise<{ contentHash: string|null, fileSize: number|null }>}
 */
async function fingerprintUri(uri) {
  if (!uri) return { contentHash: null, fileSize: null };
  try {
    const info = await FileSystem.getInfoAsync(uri, { md5: true, size: true });
    if (!info?.exists) return { contentHash: null, fileSize: null };
    return {
      contentHash: info.md5 ? String(info.md5).toLowerCase() : null,
      fileSize:
        typeof info.size === 'number' && info.size > 0 ? info.size : null,
    };
  } catch {
    return { contentHash: null, fileSize: null };
  }
}

/**
 * Attach a stable contentHash (and size) to a photo reference.
 * @param {import('../types/cityAlbum').CityAlbumPhoto} photo
 */
export async function enrichPhotoFingerprint(photo) {
  const base = createCityAlbumPhoto(photo || {});
  if (base.contentHash) return base;

  const uri = await resolveAlbumPhotoUri(base);
  const { contentHash, fileSize } = await fingerprintUri(uri);
  return createCityAlbumPhoto({
    ...base,
    contentHash: contentHash || base.contentHash,
    fileSize: fileSize || base.fileSize,
    uri: uri || base.uri,
  });
}

/**
 * @param {import('../types/cityAlbum').CityAlbumPhoto[]} photos
 */
export async function enrichPhotosFingerprints(photos = []) {
  const enriched = [];
  for (const photo of photos) {
    // Sequential: avoids hammering disk with many large MD5 reads at once.
    // eslint-disable-next-line no-await-in-loop
    enriched.push(await enrichPhotoFingerprint(photo));
  }
  return enriched;
}

/**
 * Persist a camera capture into the system gallery, then return a reference.
 * @param {string} tempUri
 */
async function referenceFromCameraUri(tempUri) {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    const finger = await fingerprintUri(tempUri);
    return createCityAlbumPhoto({
      uri: tempUri,
      assetId: null,
      contentHash: finger.contentHash,
      fileSize: finger.fileSize,
    });
  }

  try {
    const asset = await MediaLibrary.createAssetAsync(tempUri);
    const uri = asset?.uri || tempUri;
    const finger = await fingerprintUri(uri);
    return createCityAlbumPhoto({
      assetId: asset?.id || null,
      uri,
      contentHash: finger.contentHash,
      fileSize: finger.fileSize,
    });
  } catch {
    const finger = await fingerprintUri(tempUri);
    return createCityAlbumPhoto({
      uri: tempUri,
      assetId: null,
      contentHash: finger.contentHash,
      fileSize: finger.fileSize,
    });
  }
}

function photoFromPickerAsset(asset) {
  return createCityAlbumPhoto({
    assetId: asset?.assetId || null,
    uri: asset?.uri || null,
    fileName: asset?.fileName || null,
    fileSize: asset?.fileSize ?? null,
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

  const mapped = result.assets
    .map(photoFromPickerAsset)
    .filter((photo) => photo.assetId || photo.uri);

  return enrichPhotosFingerprints(mapped);
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
  if (Platform.OS !== 'web') {
    const referenced = await referenceFromCameraUri(asset.uri);
    return [await enrichPhotoFingerprint(referenced)];
  }

  return enrichPhotosFingerprints([photoFromPickerAsset(asset)]);
}
