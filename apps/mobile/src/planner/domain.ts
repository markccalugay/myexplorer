export interface GeoPoint {
  lat: number;
  lng: number;
  [extraKey: string]: unknown;
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
  [extraKey: string]: unknown;
}

export type ConvoyParticipantKind = 'individual' | 'group';
export type ConvoyParticipantStatus = 'pending' | 'joined' | 'declined';
export type ConvoyInviteMethod = 'link' | 'code' | 'manual';
export type ConvoyInviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked';
export type ConvoyAssignmentStatus = 'active' | 'removed';

export interface ConvoyVehicle {
  id: string;
  label: string;
  order: number;
  seatCapacity?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConvoyMember {
  id: string;
  displayName: string;
  isPrimary?: boolean;
}

export interface ConvoyParticipant {
  id: string;
  kind: ConvoyParticipantKind;
  displayName: string;
  status: ConvoyParticipantStatus;
  invitedBy?: string;
  contactLabel?: string;
  members: ConvoyMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ConvoyInvite {
  id: string;
  participantId: string;
  method: ConvoyInviteMethod;
  token?: string;
  status: ConvoyInviteStatus;
  sentAt?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConvoyAssignment {
  id: string;
  participantId: string;
  memberId: string;
  vehicleId: string;
  assignedBy?: string;
  status: ConvoyAssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Convoy {
  id: string;
  tripId: string;
  vehicles: ConvoyVehicle[];
  participants: ConvoyParticipant[];
  invites: ConvoyInvite[];
  assignments: ConvoyAssignment[];
  assignmentLockAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  name: string;
  stops: Stop[];
  totalDistance?: number;
  totalDuration?: number;
  convoy?: Convoy;
  savedAt?: string;
  updatedAt?: string;
  migratedFromWebAt?: string;
  routeSnapshot?: import('./route').PersistedRoutePayload;
  [extraKey: string]: unknown;
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

export const insertStopIntoTripStops = (stops: Stop[], newStop: Stop): Stop[] => {
  if (stops.length < 2) {
    return retypeStops([...stops, newStop]);
  }
  const head = stops.slice(0, -1);
  const destination = stops[stops.length - 1];
  return retypeStops([...head, newStop, destination]);
};

export const parseManualCoordinate = (
  raw: string,
  min: number,
  max: number,
): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
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
