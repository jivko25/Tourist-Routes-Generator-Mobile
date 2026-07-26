/**
 * Google Drive helpers (user Drive, scope drive.file).
 */

import * as FileSystem from 'expo-file-system/legacy';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const EXPORTS_FOLDER_NAME = 'Travel Go Exports';

/**
 * @param {string} accessToken
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function driveFetch(accessToken, path, init = {}) {
  const response = await fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      detail = '';
    }
    throw new Error(
      `Google Drive error (${response.status}): ${detail || response.statusText}`
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

/**
 * Find or create the shared exports folder in the user's Drive.
 * @param {string} accessToken
 * @returns {Promise<string>} folder id
 */
export async function ensureTravelGoExportsFolder(accessToken) {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${EXPORTS_FOLDER_NAME}' and trashed=false`
  );
  const listed = await driveFetch(
    accessToken,
    `/files?q=${q}&spaces=drive&fields=files(id,name)&pageSize=1`
  );
  const existing = listed?.files?.[0]?.id;
  if (existing) return existing;

  const created = await driveFetch(accessToken, '/files?fields=id,name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: EXPORTS_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!created?.id) {
    throw new Error('Could not create Travel Go Exports folder in Drive.');
  }
  return created.id;
}

/**
 * Resumable upload of a local ZIP into the user's Drive.
 *
 * @param {object} params
 * @param {string} params.accessToken Google provider_token
 * @param {string} params.fileUri local file:// URI
 * @param {string} params.fileName
 * @param {number|null} [params.sizeBytes]
 * @returns {Promise<{ id: string, webViewLink: string|null, webContentLink: string|null, size: string|null, name: string }>}
 */
export async function uploadZipToGoogleDrive({
  accessToken,
  fileUri,
  fileName,
  sizeBytes = null,
}) {
  if (!accessToken) {
    throw new Error('Missing Google Drive access token. Sign in again.');
  }
  if (!fileUri) {
    throw new Error('Missing local ZIP path.');
  }

  const folderId = await ensureTravelGoExportsFolder(accessToken);
  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  const length =
    typeof sizeBytes === 'number' && sizeBytes > 0
      ? sizeBytes
      : typeof info.size === 'number'
        ? info.size
        : null;

  const initResponse = await fetch(
    `${UPLOAD_API}/files?uploadType=resumable&fields=id,name,webViewLink,webContentLink,size`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/zip',
        ...(length != null
          ? { 'X-Upload-Content-Length': String(length) }
          : {}),
      },
      body: JSON.stringify({
        name: fileName,
        mimeType: 'application/zip',
        parents: [folderId],
      }),
    }
  );

  if (!initResponse.ok) {
    const detail = await initResponse.text().catch(() => '');
    throw new Error(
      `Drive upload init failed (${initResponse.status}): ${detail}`
    );
  }

  const sessionUrl = initResponse.headers.get('Location');
  if (!sessionUrl) {
    throw new Error('Drive did not return an upload session URL.');
  }

  const uploadResult = await FileSystem.uploadAsync(sessionUrl, fileUri, {
    httpMethod: 'PUT',
    headers: {
      'Content-Type': 'application/zip',
      ...(length != null ? { 'Content-Length': String(length) } : {}),
    },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(
      `Drive upload failed (${uploadResult.status}): ${uploadResult.body || ''}`
    );
  }

  let body = {};
  try {
    body = JSON.parse(uploadResult.body || '{}');
  } catch {
    body = {};
  }

  if (!body.id) {
    throw new Error('Drive upload succeeded but file id is missing.');
  }

  return {
    id: body.id,
    name: body.name || fileName,
    webViewLink:
      body.webViewLink ||
      `https://drive.google.com/file/d/${body.id}/view`,
    webContentLink: body.webContentLink || null,
    size: body.size || (length != null ? String(length) : null),
  };
}
