import { describe, expect, it, vi } from 'vitest';
import {
    type AppRoute,
    computeDrivingRoute,
    getRouteDistanceKm,
    getRouteDurationMinutes,
    getRouteLeg,
    getRoutePath,
    getRouteSteps,
} from './googleRoutes';

describe('googleRoutes', () => {
    it('normalizes routes API responses through computeDrivingRoute', async () => {
        const computeRoutes = vi.fn().mockResolvedValue({
            routes: [
                {
                    path: [
                        { lat: 14.5995, lng: 120.9842 },
                        { lat: 10.3157, lng: 123.8854 },
                        null,
                    ],
                    legs: [
                        {
                            distanceMeters: 18_342,
                            staticDurationMillis: 1_250_000,
                            steps: [
                                {
                                    distanceMeters: 5_120,
                                    staticDurationMillis: 300_000,
                                    instructions: 'Head north',
                                    maneuver: 'turn-left',
                                    localizedValues: {
                                        distance: '5.1 km',
                                        staticDuration: '5 min',
                                    },
                                    startLocation: { lat: 14.5995, lng: 120.9842 },
                                    endLocation: { lat: 14.676, lng: 121.0437 },
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        const googleMaps = {
            maps: {
                importLibrary: vi.fn().mockResolvedValue({
                    Route: { computeRoutes },
                }),
            },
        } as unknown as typeof window.google;

        const route = await computeDrivingRoute(
            googleMaps,
            { lat: 14.5995, lng: 120.9842 },
            { lat: 10.3157, lng: 123.8854 }
        );

        expect(route).not.toBeNull();
        expect(getRoutePath(route)).toEqual([
            { lat: 14.5995, lng: 120.9842 },
            { lat: 10.3157, lng: 123.8854 },
        ]);
        expect(getRouteLeg(route)).toMatchObject({
            distanceMeters: 18_342,
            durationMillis: 1_250_000,
        });
        expect(getRouteSteps(route)).toEqual([
            expect.objectContaining({
                distanceMeters: 5_120,
                durationMillis: 300_000,
                navigationInstruction: {
                    instructions: 'Head north',
                    maneuver: 'turn-left',
                },
            }),
        ]);
        expect(computeRoutes).toHaveBeenCalledWith(
            expect.objectContaining({
                travelMode: 'DRIVING',
                fields: ['path', 'legs'],
            })
        );
    });

    it('provides path, distance, and duration helpers from normalized routes', () => {
        const route: AppRoute = {
            path: [
                {
                    lat: () => 14.5995,
                    lng: () => 120.9842,
                    equals: () => false,
                    toJSON: () => ({ lat: 14.5995, lng: 120.9842 }),
                    toUrlValue: () => '14.5995,120.9842',
                } as unknown as google.maps.LatLng,
                { lat: 10.3157, lng: 123.8854 },
            ],
            legs: [
                {
                    distanceMeters: 18_340,
                    durationMillis: 125_000,
                },
            ],
        };

        expect(getRoutePath(route)).toEqual([
            { lat: 14.5995, lng: 120.9842 },
            { lat: 10.3157, lng: 123.8854 },
        ]);
        expect(getRouteDistanceKm(route)).toBe(18);
        expect(getRouteDurationMinutes(route)).toBe(2);
    });
});
