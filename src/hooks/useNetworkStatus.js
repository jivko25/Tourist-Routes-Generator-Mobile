import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Tracks connectivity for offline-aware UI.
 * Treats unknown reachability as online to avoid false offline banners.
 */
export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const apply = (state) => {
      const offline =
        state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(Boolean(offline));
      setIsReady(true);
    };

    NetInfo.fetch()
      .then(apply)
      .catch(() => {
        setIsReady(true);
      });

    const unsubscribe = NetInfo.addEventListener(apply);
    return unsubscribe;
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
    isReady,
  };
}
