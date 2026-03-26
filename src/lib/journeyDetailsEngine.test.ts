import { describe, expect, it } from 'vitest';
import { applyJourneyDetailsIfChanged, buildJourneyDetails } from './journeyDetailsEngine';
import type { RouteProvider } from '../platform/routing/routeProvider';
import type { Stop, Trip } from '../types/trip';

const createStops = (): Stop[] => ([
    {
        id: 'start',
        name: 'Start',
        location: { lat: 1, lng: 1 },
        type: 'start',
    },
    {
        id: 'middle',
        name: 'Middle',
        location: { lat: 2, lng: 2 },
        type: 'stop',
    },
    {
        id: 'end',
        name: 'End',
        location: { lat: 3, lng: 3 },
        type: 'destination',
    },
]);

const createRouteProvider = (): RouteProvider => ({
    async computeDrivingRoute(origin, destination) {
        if ('lat' in origin && origin.lat === 1 && 'lat' in destination && destination.lat === 2) {
            return {
                legs: [{ distanceMeters: 15_500, durationMillis: 45 * 60_000 }],
            };
        }

        return {
            legs: [{ distanceMeters: 30_100, durationMillis: 75 * 60_000 }],
        };
    },
});

describe('journeyDetailsEngine', () => {
    it('builds derived journey details for a stop sequence', async () => {
        const nextStops = await buildJourneyDetails(
            createStops(),
            createRouteProvider(),
            {
                departureTime: new Date('2026-03-26T00:00:00.000Z'),
                layoverMinutes: 30,
                formatTime: (date) => date.toISOString().slice(11, 16),
            }
        );

        expect(nextStops.map((stop) => ({
            id: stop.id,
            arrivalTime: stop.arrivalTime,
            distanceFromPrevious: stop.distanceFromPrevious,
            durationFromPrevious: stop.durationFromPrevious,
        }))).toEqual([
            { id: 'start', arrivalTime: '00:00', distanceFromPrevious: undefined, durationFromPrevious: undefined },
            { id: 'middle', arrivalTime: '01:15', distanceFromPrevious: 16, durationFromPrevious: 45 },
            { id: 'end', arrivalTime: '03:00', distanceFromPrevious: 30, durationFromPrevious: 75 },
        ]);
    });

    it('only applies updated stops when journey details actually changed', () => {
        const stops = createStops();
        const trip: Trip = {
            id: 'trip-1',
            name: 'Trip',
            stops,
        };

        expect(applyJourneyDetailsIfChanged(trip, stops)).toBe(trip);

        const updatedTrip = applyJourneyDetailsIfChanged(trip, [
            stops[0],
            { ...stops[1], distanceFromPrevious: 10 },
            stops[2],
        ]);

        expect(updatedTrip).not.toBe(trip);
        expect(updatedTrip.stops[1].distanceFromPrevious).toBe(10);
    });
});
