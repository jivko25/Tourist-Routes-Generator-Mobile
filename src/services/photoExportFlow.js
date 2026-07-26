import { createPhotoExport } from '../api/photoExportsApi';
import { buildCityAlbumZip, deleteLocalFile } from './cityAlbumZipService';
import { uploadZipToGoogleDrive } from './googleDriveService';

/**
 * Full city export pipeline:
 * local ZIP → Google Drive → POST /api/photo-exports
 * (Bearer token is attached by photoExportsApi via withAuthRetry)
 *
 * @param {object} params
 * @param {string} params.googleAccessToken Google OAuth token (drive.file)
 * @param {string} params.countryCode
 * @param {string} [params.countryName]
 * @param {string} params.cityName
 * @param {import('../types/cityAlbum').CityAlbumPhoto[]} params.photos
 * @param {(phase: string, done?: number, total?: number) => void} [params.onProgress]
 */
export async function exportCityAlbumToDriveAndRegister({
  googleAccessToken,
  countryCode,
  countryName,
  cityName,
  photos,
  onProgress,
}) {
  onProgress?.('zip', 0, photos?.length || 0);

  const zip = await buildCityAlbumZip({
    countryCode,
    countryName,
    cityName,
    photos,
    onProgress: (done, total) => onProgress?.('zip', done, total),
  });

  try {
    onProgress?.('upload');
    const driveFile = await uploadZipToGoogleDrive({
      accessToken: googleAccessToken,
      fileUri: zip.uri,
      fileName: zip.fileName,
      sizeBytes: zip.sizeBytes,
    });

    onProgress?.('register');
    const record = await createPhotoExport({
      scope: 'city',
      country_code: countryCode,
      country_name: countryName || null,
      city_name: cityName,
      drive_file_id: driveFile.id,
      web_view_link: driveFile.webViewLink,
      web_content_link: driveFile.webContentLink,
      file_name: zip.fileName,
      size_bytes: zip.sizeBytes,
      photo_count: zip.photoCount,
    });

    return { record, driveFile, zip };
  } finally {
    await deleteLocalFile(zip.uri);
  }
}
