import { describe, expect, it, vi } from 'vitest';
import {
    advanceNavigationSession,
    endNavigationSession,
    restoreNavigationSession,
    startNavigationSession,
    syncNavigationSessionProgress,
} from './navigationSessionController';
import { createNavigationRouteFingerprint, createNavigationSession } from './navigationSession';
import type { Trip } from '../types/trip';
import type { LocationProvider } from '../platform/location/locationProvider';

const createTrip = (): Trip => ({
    id: 'trip-1',
    name: 'Road trip',
    stops: [
        {
            id: 'start',
            name: 'Start',
            location: { lat: 1, lng: 1 },
            type: 'start',
        },
        {
            id: 'destination',
            name: 'Destination',
            location: { lat: 2, lng: 2 },
            type: 'destination',
        },
    ],
});

describe('navigationSessionController', () => {
    it('restores a persisted session when the route fingerprint still matches', () => {
        const trip = createTrip();
        const session = createNavigationSession(trip, {
            routeFingerprint: createNavigationRouteFingerprint(trip),
        });

        expect(restoreNavigationSession(session, trip, 5_000)).toMatchObject({
            notice: 'Restored your active trip session.',
            elapsedTimeMs: 0,
        });
    });

    it('starts a navigation session using the live location when available', async () => {
        const locationProvider: LocationProvider = {
            getCurrentLocation: vi.fn().mockResolvedValue({ lat: 14.6, lng: 121.0 }),
        };

        await expect(startNavigationSession(createTrip(), locationProvider, 123)).resolves.toMatchObject({
            currentLocation: { lat: 14.6, lng: 121.0 },
            notice: 'Using your live location to guide you to the next stop.',
            startedAt: 123,
            session: {
                status: 'active',
                reconnectState: 'restored',
            },
        });
    });

    it('falls back to the planned origin when live location is unavailable', async () => {
        const locationProvider: LocationProvider = {
            getCurrentLocation: vi.fn().mockRejectedValue(new Error('no gps')),
        };

        await expect(startNavigationSession(createTrip(), locationProvider, 456)).resolves.toMatchObject({
            currentLocation: null,
            notice: 'Live location was unavailable, so navigation starts from your planned origin.',
            startedAt: 456,
            session: {
                status: 'active',
                reconnectState: 'pending',
            },
        });
    });

    it('advances and completes sessions based on stop progression', () => {
        const trip = createTrip();
        const session = createNavigationSession(trip);

        expect(advanceNavigationSession(session, 2, trip.stops[1], trip.stops.length, 789)).toMatchObject({
            completed: true,
            session: {
                status: 'completed',
                currentStopIndex: 2,
            },
        });

        expect(endNavigationSession(session, true, 999)).toMatchObject({
            status: 'abandoned',
            updatedAt: 999,
        });
    });

    it('syncs active-session progress from route state', () => {
        const trip = createTrip();
        const session = createNavigationSession(trip);

        expect(syncNavigationSessionProgress({
            session,
            trip,
            currentStopIndex: 1,
            currentLocation: { lat: 1.1, lng: 1.2 },
            hasRemainingStop: true,
            navigationRoute: {
                legs: [{
                    distanceMeters: 1234,
                    durationMillis: 180000,
                    steps: [{
                        distanceMeters: 200,
                        durationMillis: 30000,
                        navigationInstruction: {
                            instructions: 'Turn <b>right</b>',
                        },
                    }],
                }],
            },
            now: 1_000,
        })).toMatchObject({
            currentStopIndex: 1,
            currentLocation: { lat: 1.1, lng: 1.2 },
            remainingDistanceMeters: 1234,
            remainingDurationSeconds: 180,
            nextInstruction: {
                text: 'Turn right',
                distanceMeters: 200,
                durationSeconds: 30,
            },
        });
    });
});
