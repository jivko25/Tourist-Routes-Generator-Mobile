import axios from 'axios';
import { getTravelApiBaseUrl } from '../utils/config';
import { withAuthRetry } from './authorizedApi';

/**
 * @typedef {'city'|'country'} PhotoExportScope
 *
 * @typedef {Object} PhotoExport
 * @property {string} id
 * @property {string} user_id
 * @property {PhotoExportScope} scope
 * @property {string} country_code
 * @property {string|null} country_name
 * @property {string|null} city_name
 * @property {string} drive_file_id
 * @property {string} web_view_link
 * @property {string|null} web_content_link
 * @property {string} file_name
 * @property {number|null} size_bytes
 * @property {number|null} photo_count
 * @property {string} created_at
 *
 * @typedef {Object} CreatePhotoExportRequest
 * @property {PhotoExportScope} scope
 * @property {string} country_code
 * @property {string|null} [country_name]
 * @property {string|null} [city_name]
 * @property {string} drive_file_id
 * @property {string} web_view_link
 * @property {string|null} [web_content_link]
 * @property {string} file_name
 * @property {number|null} [size_bytes]
 * @property {number|null} [photo_count]
 */

function authHeaders(accessToken) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

/**
 * @returns {Promise<PhotoExport[]>}
 */
export async function listPhotoExports() {
  const response = await withAuthRetry(
    (accessToken) =>
      axios.get(`${getTravelApiBaseUrl()}/api/photo-exports`, {
        timeout: 30000,
        headers: authHeaders(accessToken),
      }),
    'Could not load photo exports.'
  );
  return Array.isArray(response.data?.exports) ? response.data.exports : [];
}

/**
 * @param {CreatePhotoExportRequest} payload
 * @returns {Promise<PhotoExport>}
 */
export async function createPhotoExport(payload) {
  const response = await withAuthRetry(
    (accessToken) =>
      axios.post(`${getTravelApiBaseUrl()}/api/photo-exports`, payload, {
        timeout: 30000,
        headers: authHeaders(accessToken),
      }),
    'Could not register photo export.'
  );
  return response.data;
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePhotoExport(id) {
  await withAuthRetry(
    (accessToken) =>
      axios.delete(`${getTravelApiBaseUrl()}/api/photo-exports/${id}`, {
        timeout: 30000,
        headers: authHeaders(accessToken),
      }),
    'Could not delete photo export.'
  );
}
