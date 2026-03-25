import type { Convoy, Trip } from '../types/trip';

export type LegacyTrip = Trip & { convey?: Convoy };

export const createTripId = () => `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyTrip = (): Trip => ({
    id: createTripId(),
    name: 'New Adventure',
    stops: [],
});

export const normalizeLoadedTrip = (trip: LegacyTrip): Trip => {
    const { convey, ...rest } = trip;
    return {
        ...rest,
        convoy: trip.convoy ?? convey,
    };
};

export const cloneTrip = (trip: LegacyTrip): Trip => normalizeLoadedTrip(JSON.parse(JSON.stringify(trip)) as LegacyTrip);

export const normalizeTrip = (trip: LegacyTrip) => JSON.stringify({
    ...normalizeLoadedTrip(trip),
    savedAt: undefined,
    updatedAt: undefined,
});
