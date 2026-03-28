import type {GeoPoint, Stop, Trip} from './domain';

export interface RouteLegSummary {
  distanceMeters: number;
  durationMillis: number;
}

export interface PersistedRoutePayload {
  source: 'routing-proxy';
  provider: 'google-routes';
  routeKey: string;
  refreshedAt: string;
  totalDistanceMeters: number;
  totalDurationMillis: number;
  encodedPolyline?: string | null;
  legs: RouteLegSummary[];
}

export type RouteStatus = 'idle' | 'loading' | 'ready' | 'stale' | 'error';

export interface RouteState {
  status: RouteStatus;
  message: string | null;
  activeRouteKey: string | null;
}

export interface RoutingProxyRouteResponse {
  route: {
    provider?: 'google-routes';
    routeKey?: string;
    refreshedAt?: string;
    totalDistanceMeters: number;
    totalDurationMillis: number;
    encodedPolyline?: string | null;
    legs: Array<{
      distanceMeters: number;
      durationMillis: number;
    }>;
  };
}

export const createInitialRouteState = (): RouteState => ({
  status: 'idle',
  message: null,
  activeRouteKey: null,
});

const toFixedCoordinate = (value: number) => value.toFixed(5);

const toRouteKeyPart = (point: GeoPoint) =>
  `${toFixedCoordinate(point.lat)},${toFixedCoordinate(point.lng)}`;

export const buildRouteKey = (stops: Stop[]): string | null => {
  if (stops.length < 2) {
    return null;
  }

  return stops
    .map(stop => `${stop.id}:${toRouteKeyPart(stop.location)}`)
    .join('|');
};

export const routeSnapshotMatchesTrip = (
  snapshot: PersistedRoutePayload | undefined,
  trip: Pick<Trip, 'stops'>,
): boolean => {
  if (!snapshot) {
    return false;
  }

  return snapshot.routeKey === buildRouteKey(trip.stops);
};

export const createRouteSnapshotFromResponse = (
  response: RoutingProxyRouteResponse,
  routeKey: string,
): PersistedRoutePayload => ({
  source: 'routing-proxy',
  provider: response.route.provider ?? 'google-routes',
  routeKey,
  refreshedAt: response.route.refreshedAt ?? new Date().toISOString(),
  totalDistanceMeters: response.route.totalDistanceMeters,
  totalDurationMillis: response.route.totalDurationMillis,
  encodedPolyline: response.route.encodedPolyline ?? null,
  legs: response.route.legs.map(leg => ({
    distanceMeters: leg.distanceMeters,
    durationMillis: leg.durationMillis,
  })),
});

export const formatDistanceKm = (distanceMeters?: number | null) => {
  if (typeof distanceMeters !== 'number') {
    return 'Unavailable';
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

export const formatDuration = (durationMillis?: number | null) => {
  if (typeof durationMillis !== 'number') {
    return 'Unavailable';
  }

  const totalMinutes = Math.max(1, Math.round(durationMillis / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};
