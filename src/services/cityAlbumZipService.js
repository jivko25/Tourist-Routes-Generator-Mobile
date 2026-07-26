import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { resolveAlbumPhotoUri } from './cityAlbumService';

function sanitizePathPart(value) {
  return String(value || 'unknown')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'unknown';
}

function guessExtension(uri) {
  const clean = String(uri || '').split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'png';
  if (clean.endsWith('.webp')) return 'webp';
  if (clean.endsWith('.heic') || clean.endsWith('.heif')) return 'heic';
  return 'jpg';
}

/**
 * Build a ZIP of album photos: Country/City/photo_001.jpg …
 *
 * @param {object} params
 * @param {string} params.countryCode
 * @param {string} [params.countryName]
 * @param {string} params.cityName
 * @param {import('../types/cityAlbum').CityAlbumPhoto[]} params.photos
 * @param {(done: number, total: number) => void} [params.onProgress]
 * @returns {Promise<{ uri: string, fileName: string, sizeBytes: number, photoCount: number }>}
 */
export async function buildCityAlbumZip({
  countryCode,
  countryName,
  cityName,
  photos,
  onProgress,
}) {
  if (!photos?.length) {
    throw new Error('No photos to export.');
  }

  const zip = new JSZip();
  const countryFolder = sanitizePathPart(countryName || countryCode);
  const cityFolder = sanitizePathPart(cityName);
  const folder = zip.folder(countryFolder)?.folder(cityFolder);
  if (!folder) {
    throw new Error('Could not create ZIP folders.');
  }

  let packed = 0;
  for (let i = 0; i < photos.length; i += 1) {
    const uri = await resolveAlbumPhotoUri(photos[i]);
    if (!uri) continue;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = guessExtension(uri);
    const name = `photo_${String(packed + 1).padStart(3, '0')}.${ext}`;
    folder.file(name, base64, { base64: true });
    packed += 1;
    onProgress?.(packed, photos.length);
  }

  if (packed === 0) {
    throw new Error('Could not read any photos for the ZIP.');
  }

  const zipBase64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const fileName = `${cityFolder}_photos.zip`;
  const outUri = `${FileSystem.cacheDirectory}travelgo_${Date.now()}_${fileName}`;
  await FileSystem.writeAsStringAsync(outUri, zipBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const info = await FileSystem.getInfoAsync(outUri, { size: true });
  return {
    uri: outUri,
    fileName,
    sizeBytes: typeof info.size === 'number' ? info.size : null,
    photoCount: packed,
  };
}

/**
 * @param {string} uri
 */
export async function deleteLocalFile(uri) {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore cleanup errors
  }
}
