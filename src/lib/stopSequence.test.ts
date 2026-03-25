import { describe, expect, it } from 'vitest';
import type { Stop } from '../types/trip';
import {
    createStopFromPlace,
    hasJourneyDetailsChanged,
    hasSameStopSequence,
    resetJourneyFields,
    retypeStops,
} from './stopSequence';

const createStop = (overrides: Partial<Stop>): Stop => ({
    id: overrides.id || 'stop-id',
    name: overrides.name || 'Stop',
    location: overrides.location || { lat: 14.5995, lng: 120.9842 },
    type: overrides.type || 'stop',
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

describe('stopSequence helpers', () => {
    it('retypes the first and last stop to match trip position', () => {
        expect(retypeStops([
            createStop({ id: 'a', type: 'stop' }),
            createStop({ id: 'b', type: 'stop' }),
            createStop({ id: 'c', type: 'stop' }),
        ]).map((stop) => stop.type)).toEqual(['start', 'stop', 'destination']);
    });

    it('creates manual stops from selected places', () => {
        const stop = createStopFromPlace({
            name: 'Baguio',
            formattedAddress: 'Baguio, Benguet',
            location: { lat: 16.4023, lng: 120.596 },
        }, 'destination');

        expect(stop).toMatchObject({
            name: 'Baguio',
            formattedAddress: 'Baguio, Benguet',
            type: 'destination',
            source: 'manual',
        });
        expect(stop.id).toBeTruthy();
    });

    it('clears computed journey fields without changing the stop identity', () => {
        expect(resetJourneyFields(createStop({
            id: 'stop-1',
            distanceFromPrevious: 10,
            durationFromPrevious: 20,
            arrivalTime: '08:30 AM',
        }))).toMatchObject({
            id: 'stop-1',
            distanceFromPrevious: undefined,
            durationFromPrevious: undefined,
            arrivalTime: undefined,
        });
    });

    it('detects when journey details have changed', () => {
        const previousStops = [createStop({ id: 'a', arrivalTime: '08:00 AM' })];
        const nextStops = [createStop({ id: 'a', arrivalTime: '08:30 AM' })];

        expect(hasJourneyDetailsChanged(previousStops, nextStops)).toBe(true);
    });

    it('matches stop sequences by identity and location, not derived fields', () => {
        const previousStops = [
            createStop({ id: 'a', type: 'start', distanceFromPrevious: 0 }),
            createStop({ id: 'b', type: 'destination', distanceFromPrevious: 10 }),
        ];
        const nextStops = [
            createStop({ id: 'a', type: 'start', distanceFromPrevious: 2 }),
            createStop({ id: 'b', type: 'destination', distanceFromPrevious: 12 }),
        ];

        expect(hasSameStopSequence(previousStops, nextStops)).toBe(true);
    });
});
