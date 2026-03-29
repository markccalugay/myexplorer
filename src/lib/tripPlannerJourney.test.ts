import { describe, expect, it } from 'vitest';
import type { Stop, Trip } from '../types/trip';
import {
    applyJourneyDetailsUpdateIfCurrent,
    removeStopFromTrip,
    reorderTripStops,
    replaceStopInTrip,
} from './tripPlannerJourney';

const createStop = (overrides: Partial<Stop>): Stop => ({
    id: overrides.id ?? 'stop-id',
    name: overrides.name ?? 'Stop',
    location: overrides.location ?? { lat: 14.5995, lng: 120.9842 },
    type: overrides.type ?? 'stop',
    source: overrides.source,
    isAutoSuggested: overrides.isAutoSuggested,
    formattedAddress: overrides.formattedAddress,
    category: overrides.category,
    description: overrides.description,
    rating: overrides.rating,
    googleMapsUri: overrides.googleMapsUri,
    distanceFromPrevious: overrides.distanceFromPrevious,
    durationFromPrevious: overrides.durationFromPrevious,
    arrivalTime: overrides.arrivalTime,
});

const createTrip = (): Trip => ({
    id: 'trip-1',
    name: 'Trip',
    stops: [
        createStop({ id: 'start', name: 'Start', type: 'start', arrivalTime: '08:00' }),
        createStop({ id: 'middle', name: 'Middle', type: 'stop', arrivalTime: '09:00' }),
        createStop({ id: 'end', name: 'End', type: 'destination', arrivalTime: '10:00' }),
    ],
});

describe('tripPlannerJourney helpers', () => {
    it('ignores stale journey detail responses after a newer request starts', () => {
        const trip = createTrip();
        const staleResponseStops = [
            trip.stops[0],
            createStop({ ...trip.stops[1], arrivalTime: '09:30', distanceFromPrevious: 12 }),
            trip.stops[2],
        ];

        const updatedTrip = applyJourneyDetailsUpdateIfCurrent(trip, staleResponseStops, 2, 1);

        expect(updatedTrip).toBe(trip);
        expect(updatedTrip.stops[1].arrivalTime).toBe('09:00');
    });

    it('applies journey detail responses when the resolving request is still current', () => {
        const trip = createTrip();
        const nextStops = [
            trip.stops[0],
            createStop({ ...trip.stops[1], arrivalTime: '09:30', distanceFromPrevious: 12 }),
            trip.stops[2],
        ];

        const updatedTrip = applyJourneyDetailsUpdateIfCurrent(trip, nextStops, 1, 1);

        expect(updatedTrip).not.toBe(trip);
        expect(updatedTrip.stops[1].arrivalTime).toBe('09:30');
        expect(updatedTrip.stops[1].distanceFromPrevious).toBe(12);
    });

    it('removes a stop immutably and retypes the remaining sequence', () => {
        const trip = createTrip();

        const updatedTrip = removeStopFromTrip(trip, 'middle');

        expect(updatedTrip).not.toBe(trip);
        expect(updatedTrip.stops).not.toBe(trip.stops);
        expect(updatedTrip.stops.map((stop) => stop.id)).toEqual(['start', 'end']);
        expect(updatedTrip.stops.map((stop) => stop.type)).toEqual(['start', 'destination']);
        expect(updatedTrip.stops.every((stop) => (
            stop.arrivalTime === undefined &&
            stop.distanceFromPrevious === undefined &&
            stop.durationFromPrevious === undefined
        ))).toBe(true);
        expect(trip.stops.map((stop) => stop.id)).toEqual(['start', 'middle', 'end']);
        expect(trip.stops[0].arrivalTime).toBe('08:00');
    });

    it('replaces an edited stop immutably and preserves positional retyping', () => {
        const trip = createTrip();
        const updatedStop = createStop({
            id: 'middle',
            name: 'Edited middle',
            type: 'destination',
            location: { lat: 15.1, lng: 121.1 },
        });

        const updatedTrip = replaceStopInTrip(trip, 'middle', updatedStop);

        expect(updatedTrip).not.toBe(trip);
        expect(updatedTrip.stops).not.toBe(trip.stops);
        expect(updatedTrip.stops[1]).toMatchObject({
            id: 'middle',
            name: 'Edited middle',
            type: 'stop',
            location: { lat: 15.1, lng: 121.1 },
            arrivalTime: undefined,
            distanceFromPrevious: undefined,
            durationFromPrevious: undefined,
        });
        expect(trip.stops[1]).toMatchObject({
            id: 'middle',
            name: 'Middle',
            type: 'stop',
            location: { lat: 14.5995, lng: 120.9842 },
        });
    });

    it('reorders stops immutably so recalculation can react to a new stops array', () => {
        const trip = createTrip();
        const reorderedStops = [trip.stops[0], trip.stops[2], trip.stops[1]];

        const updatedTrip = reorderTripStops(trip, reorderedStops);

        expect(updatedTrip).not.toBe(trip);
        expect(updatedTrip.stops).not.toBe(trip.stops);
        expect(updatedTrip.stops).not.toBe(reorderedStops);
        expect(updatedTrip.stops.map((stop) => stop.id)).toEqual(['start', 'end', 'middle']);
        expect(updatedTrip.stops.map((stop) => stop.type)).toEqual(['start', 'stop', 'destination']);
        expect(updatedTrip.stops.every((stop) => (
            stop.arrivalTime === undefined &&
            stop.distanceFromPrevious === undefined &&
            stop.durationFromPrevious === undefined
        ))).toBe(true);
        expect(trip.stops.map((stop) => stop.id)).toEqual(['start', 'middle', 'end']);
    });
});
