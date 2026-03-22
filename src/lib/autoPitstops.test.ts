import { describe, expect, it } from 'vitest';
import {
    allocateAutoPitstopsByLeg,
    AUTO_PITSTOP_DOUBLE_DISTANCE_KM,
    AUTO_PITSTOP_SINGLE_DISTANCE_KM,
    AUTO_PITSTOP_SINGLE_DURATION_MINUTES,
    buildAutoPitstopId,
    dedupeStopsByLocation,
    getAutoPitstopFractions,
    getMandatoryAutoPitstopCount,
    getPitstopPlanningStops,
    getPitstopRouteKey,
    mergeAutoPitstopsIntoTrip,
} from './autoPitstops';
import type { Stop } from '../types/trip';

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

describe('autoPitstops helpers', () => {
    it('builds a route key from the real manual route shape and ignores auto pitstops', () => {
        const stops: Stop[] = [
            createStop({ id: 'start', type: 'start', location: { lat: 14.1, lng: 120.1 } }),
            createStop({ id: 'manual-mid', type: 'stop', location: { lat: 14.2, lng: 120.2 } }),
            createStop({
                id: 'auto-mid',
                type: 'stop',
                isAutoSuggested: true,
                source: 'auto-pitstop',
                location: { lat: 14.25, lng: 120.25 },
            }),
            createStop({ id: 'dest', type: 'destination', location: { lat: 14.3, lng: 120.3 } }),
        ];

        expect(getPitstopPlanningStops(stops).map((stop) => stop.id)).toEqual(['start', 'manual-mid', 'dest']);
        expect(getPitstopRouteKey(stops)).toBe(
            'start:14.100000:120.100000|stop:14.200000:120.200000|destination:14.300000:120.300000'
        );
    });

    it('derives mandatory pitstop counts from total route distance and duration', () => {
        expect(
            getMandatoryAutoPitstopCount(
                AUTO_PITSTOP_SINGLE_DISTANCE_KM - 1,
                AUTO_PITSTOP_SINGLE_DURATION_MINUTES - 1
            )
        ).toBe(0);
        expect(getMandatoryAutoPitstopCount(AUTO_PITSTOP_SINGLE_DISTANCE_KM + 1, 30)).toBe(1);
        expect(getMandatoryAutoPitstopCount(20, AUTO_PITSTOP_SINGLE_DURATION_MINUTES + 1)).toBe(1);
        expect(getMandatoryAutoPitstopCount(AUTO_PITSTOP_DOUBLE_DISTANCE_KM + 1, 30)).toBe(2);
    });

    it('returns pitstop fractions and allocates mandatory stops to the longest legs first', () => {
        expect(getAutoPitstopFractions(0)).toEqual([]);
        expect(getAutoPitstopFractions(1)).toEqual([0.5]);
        expect(getAutoPitstopFractions(2)).toEqual([1 / 3, 2 / 3]);

        expect(allocateAutoPitstopsByLeg([
            { distanceKm: 20, durationMins: 25 },
            { distanceKm: 35, durationMins: 40 },
        ])).toEqual([0, 1]);

        expect(allocateAutoPitstopsByLeg([
            { distanceKm: 60, durationMins: 70 },
            { distanceKm: 55, durationMins: 65 },
            { distanceKm: 10, durationMins: 12 },
        ])).toEqual([1, 1, 0]);
    });

    it('dedupes suggested pitstops by location and preserves manual stops in leg order when merging', () => {
        const baseStops: Stop[] = [
            createStop({ id: 'start', type: 'start' }),
            createStop({ id: 'manual-mid', type: 'stop', location: { lat: 15.1, lng: 121.1 } }),
            createStop({ id: 'dest', type: 'destination', location: { lat: 16.1, lng: 122.1 } }),
        ];
        const suggestions: Stop[] = dedupeStopsByLocation([
            createStop({ id: 'a', isAutoSuggested: true, location: { lat: 15.5, lng: 121.5 } }),
            createStop({ id: 'b', isAutoSuggested: true, location: { lat: 15.5, lng: 121.5 } }),
            createStop({ id: 'c', isAutoSuggested: true, location: { lat: 15.8, lng: 121.8 } }),
        ]);

        expect(suggestions.map((stop) => stop.id)).toEqual(['a', 'c']);
        expect(mergeAutoPitstopsIntoTrip(baseStops, [suggestions, []]).map((stop) => stop.id)).toEqual([
            'start',
            'a',
            'c',
            'manual-mid',
            'dest',
        ]);
    });

    it('creates stable auto pitstop ids from Maps URIs or coordinates', () => {
        expect(
            buildAutoPitstopId({
                name: 'Gas Station',
                googleMapsUri: 'https://maps.google.com/?cid=123',
                location: { lat: 14.5995, lng: 120.9842 },
            })
        ).toBe('auto-pitstop:https://maps.google.com/?cid=123');

        expect(
            buildAutoPitstopId({
                name: 'Fallback Station',
                location: { lat: 14.5995, lng: 120.9842 },
            })
        ).toBe('auto-pitstop:Fallback Station:14.599500:120.984200');
    });
});
