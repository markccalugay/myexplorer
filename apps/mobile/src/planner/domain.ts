export interface GeoPoint {
  lat: number;
  lng: number;
}

export type StopSource = 'manual' | 'auto-pitstop' | 'activity-recommendation';

export interface Stop {
  id: string;
  name: string;
  formattedAddress?: string;
  location: GeoPoint;
  type: 'start' | 'stop' | 'destination';
  source?: StopSource;
  isAutoSuggested?: boolean;
  category?: string;
  description?: string;
  rating?: number;
  googleMapsUri?: string;
  distanceFromPrevious?: number;
  durationFromPrevious?: number;
  arrivalTime?: string;
}

export interface Trip {
  id: string;
  name: string;
  stops: Stop[];
  totalDistance?: number;
  totalDuration?: number;
  savedAt?: string;
  updatedAt?: string;
  routeSnapshot?: import('./route').PersistedRoutePayload;
}

export const createTripId = () =>
  `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createStopId = () =>
  `stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyTrip = (): Trip => ({
  id: createTripId(),
  name: 'New Adventure',
  stops: [],
});

export const cloneTrip = (trip: Trip): Trip =>
  JSON.parse(JSON.stringify(trip)) as Trip;

export const normalizeTrip = (trip: Trip) =>
  JSON.stringify({
    ...trip,
    routeSnapshot: undefined,
    savedAt: undefined,
    updatedAt: undefined,
  });

export const retypeStops = (stops: Stop[]): Stop[] => {
  if (stops.length === 0) {
    return stops;
  }

  return stops.map((stop, index) => {
    if (index === 0) {
      return {...stop, type: 'start'};
    }

    if (index === stops.length - 1) {
      return {...stop, type: 'destination'};
    }

    return {...stop, type: 'stop'};
  });
};

export const createManualStop = (input: {
  name: string;
  formattedAddress?: string;
  lat: number;
  lng: number;
}): Stop => ({
  id: createStopId(),
  name: input.name.trim(),
  formattedAddress: input.formattedAddress?.trim() || undefined,
  location: {
    lat: input.lat,
    lng: input.lng,
  },
  type: 'stop',
  source: 'manual',
});

export const upsertSavedTrip = (savedTrips: Trip[], trip: Trip): Trip[] => {
  const timestamp = new Date().toISOString();
  const previous = savedTrips.find(savedTrip => savedTrip.id === trip.id);
  const nextTrip: Trip = {
    ...cloneTrip(trip),
    savedAt: previous?.savedAt ?? trip.savedAt ?? timestamp,
    updatedAt: timestamp,
  };

  return [nextTrip, ...savedTrips.filter(savedTrip => savedTrip.id !== trip.id)];
};

export const formatStopTypeLabel = (type: Stop['type']) => {
  switch (type) {
    case 'start':
      return 'Start';
    case 'destination':
      return 'Destination';
    default:
      return 'Stop';
  }
};
