import type {Stop, Trip} from './domain';
import {
  routeSnapshotMatchesTrip,
  type RouteState,
} from './route';

export interface PreTripMapStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: Stop['type'];
  order: number;
}

export type PreTripRouteOverlayStatus =
  | 'none'
  | 'valid'
  | 'stale'
  | 'unavailable';

export interface PreTripMapModel {
  validStops: PreTripMapStop[];
  ignoredInvalidStopCount: number;
  routeOverlayStatus: PreTripRouteOverlayStatus;
  routeOverlayMessage: string;
  encodedPolyline: string | null;
}

export function isValidMapCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function buildPreTripMapModel(
  trip: Pick<Trip, 'stops' | 'routeSnapshot'>,
  routeState?: Pick<RouteState, 'status' | 'message'>,
): PreTripMapModel {
  const validStops: PreTripMapStop[] = [];
  let ignoredInvalidStopCount = 0;

  for (const stop of trip.stops) {
    const lat = stop.location?.lat;
    const lng = stop.location?.lng;
    if (!isValidMapCoordinate(lat, lng)) {
      ignoredInvalidStopCount += 1;
      continue;
    }
    validStops.push({
      id: stop.id,
      name: stop.name,
      lat,
      lng,
      type: stop.type,
      order: validStops.length + 1,
    });
  }

  if (validStops.length < 2) {
    return {
      validStops,
      ignoredInvalidStopCount,
      routeOverlayStatus: 'none',
      routeOverlayMessage:
        'Add at least two valid stops to preview a route.',
      encodedPolyline: null,
    };
  }

  const snapshot = trip.routeSnapshot;
  const matchesCurrentStops =
    ignoredInvalidStopCount === 0 && routeSnapshotMatchesTrip(snapshot, trip);
  const polyline =
    typeof snapshot?.encodedPolyline === 'string' &&
    snapshot.encodedPolyline.trim().length > 0
      ? snapshot.encodedPolyline.trim()
      : null;

  if (matchesCurrentStops && polyline) {
    return {
      validStops,
      ignoredInvalidStopCount,
      routeOverlayStatus: 'valid',
      routeOverlayMessage: 'Showing saved route preview.',
      encodedPolyline: polyline,
    };
  }

  if (snapshot && !matchesCurrentStops) {
    return {
      validStops,
      ignoredInvalidStopCount,
      routeOverlayStatus: 'stale',
      routeOverlayMessage:
        'Saved route preview is stale for the current stops; no route line drawn.',
      encodedPolyline: null,
    };
  }

  if (routeState?.status === 'error' && routeState.message) {
    return {
      validStops,
      ignoredInvalidStopCount,
      routeOverlayStatus: 'unavailable',
      routeOverlayMessage: routeState.message,
      encodedPolyline: null,
    };
  }

  return {
    validStops,
    ignoredInvalidStopCount,
    routeOverlayStatus: 'unavailable',
    routeOverlayMessage:
      'No calculated route preview available yet; showing stop markers only.',
    encodedPolyline: null,
  };
}
