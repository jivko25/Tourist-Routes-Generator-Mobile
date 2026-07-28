import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function navigateToAttractionDetail(attractionId, title) {
  if (!attractionId || !navigationRef.isReady()) return;
  navigationRef.navigate('AttractionDetail', {
    attractionId,
    title: title || 'Place',
  });
}
