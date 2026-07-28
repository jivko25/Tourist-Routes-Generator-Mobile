import * as TaskManager from 'expo-task-manager';
import { GeofencingEventType } from 'expo-location';
import { LIVE_TRIP_GEOFENCE_TASK } from '../services/liveTripConstants';
import { handleGeofenceEnter } from '../services/liveTripService';

/**
 * Must be imported at app startup (top-level) so geofencing works in background.
 */
TaskManager.defineTask(LIVE_TRIP_GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Live trip geofence task error:', error.message);
    return;
  }

  const { eventType, region } = data || {};
  if (eventType !== GeofencingEventType.Enter) return;

  const identifier = region?.identifier;
  if (!identifier) return;

  try {
    await handleGeofenceEnter(identifier);
  } catch (err) {
    console.warn('Live trip arrival handling failed:', err?.message || err);
  }
});
