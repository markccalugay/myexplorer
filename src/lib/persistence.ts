import type { PersistedNavigationSession } from './navigationSession';
import type { AppPlace } from '../types/place';
import type { Stop, Trip } from '../types/trip';

const toPersistedPlaceId = (name: string, lat: number, lng: number) => (
    `stored:${name.trim().toLowerCase() || 'place'}:${lat.toFixed(5)}:${lng.toFixed(5)}`
);

export const sanitizePersistedPlace = (
    place: Pick<AppPlace, 'name' | 'location'> & Partial<AppPlace>
): AppPlace => ({
    id: toPersistedPlaceId(place.name, place.location.lat, place.location.lng),
    name: place.name,
    location: {
        lat: place.location.lat,
        lng: place.location.lng,
    },
});

export const sanitizePersistedStop = (stop: Stop): Stop => ({
    id: stop.id,
    name: stop.name,
    location: {
        lat: stop.location.lat,
        lng: stop.location.lng,
    },
    type: stop.type,
    source: stop.source,
    isAutoSuggested: stop.isAutoSuggested,
});

export const sanitizePersistedTrip = (trip: Trip): Trip => ({
    id: trip.id,
    name: trip.name,
    stops: trip.stops.map(sanitizePersistedStop),
    convoy: trip.convoy,
    savedAt: trip.savedAt,
    updatedAt: trip.updatedAt,
});

export const sanitizePersistedNavigationSession = (
    session: PersistedNavigationSession
): PersistedNavigationSession => ({
    ...session,
    tripSnapshot: sanitizePersistedTrip(session.tripSnapshot),
    approvedPitstops: session.approvedPitstops.map(sanitizePersistedStop),
});
