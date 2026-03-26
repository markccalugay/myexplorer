import { describe, expect, it, vi } from 'vitest';
import {
    beginNavigationReconnect,
    canResumeNavigationSession,
    createNavigationRouteFingerprint,
    createNavigationSession,
    failNavigationReconnect,
    getNavigationSessionResumeState,
    getElapsedNavigationTimeMs,
    pauseNavigationSession,
    resumeNavigationSession,
    skipNavigationSessionStop,
    syncNavigationSession,
    updateNavigationSessionStatus,
} from './navigationSession';
import type { Trip } from '../types/trip';

const createTrip = (): Trip => ({
    id: 'trip-1',
    name: 'Road trip',
    stops: [],
});

describe('navigationSession helpers', () => {
    it('creates a new preparing session from a trip snapshot', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-25T12:00:00.000Z'));

        const session = createNavigationSession(createTrip());

        expect(session).toMatchObject({
            tripId: 'trip-1',
            status: 'preparing',
            currentStopIndex: 1,
            currentLegIndex: 0,
            approvedPitstops: [],
            reconnectState: 'pending',
            lastSyncSource: 'phone-ui',
        });
        expect(session.sessionId).toMatch(/^nav-\d+-[a-z0-9]{6}$/);

        vi.useRealTimers();
    });

    it('marks which session states can be resumed later', () => {
        const session = createNavigationSession(createTrip());

        expect(canResumeNavigationSession(session)).toBe(true);
        expect(canResumeNavigationSession(updateNavigationSessionStatus(session, 'active'))).toBe(true);
        expect(canResumeNavigationSession(updateNavigationSessionStatus(session, 'completed'))).toBe(false);
    });

    it('derives elapsed time only for active or reconnecting sessions', () => {
        expect(getElapsedNavigationTimeMs({
            startedAt: 1_000,
            status: 'active',
        }, 4_500)).toBe(3_500);

        expect(getElapsedNavigationTimeMs({
            startedAt: 1_000,
            status: 'paused',
        }, 4_500)).toBe(0);
    });

    it('creates a stable route fingerprint from the trip stop sequence', () => {
        expect(createNavigationRouteFingerprint({
            ...createTrip(),
            stops: [
                {
                    id: 'start',
                    name: 'Start',
                    location: { lat: 14.5995123, lng: 120.9842456 },
                    type: 'start',
                },
                {
                    id: 'destination',
                    name: 'Destination',
                    location: { lat: 14.7012345, lng: 121.0023456 },
                    type: 'destination',
                },
            ],
        })).toBe(JSON.stringify([
            { id: 'start', type: 'start', lat: 14.59951, lng: 120.98425 },
            { id: 'destination', type: 'destination', lat: 14.70123, lng: 121.00235 },
        ]));
    });

    it('syncs progress fields onto a persisted session without dropping prior values', () => {
        const session = createNavigationSession(createTrip());

        expect(syncNavigationSession(session, {
            status: 'active',
            currentStopIndex: 2,
            currentLegIndex: 1,
            currentLocation: { lat: 1, lng: 2 },
            lastKnownLocationAt: 123,
            remainingDistanceMeters: 456,
            remainingDurationSeconds: 789,
            reconnectState: 'restored',
        }, 999)).toMatchObject({
            status: 'active',
            currentStopIndex: 2,
            currentLegIndex: 1,
            currentLocation: { lat: 1, lng: 2 },
            lastKnownLocationAt: 123,
            remainingDistanceMeters: 456,
            remainingDurationSeconds: 789,
            reconnectState: 'restored',
            updatedAt: 999,
        });
    });

    it('supports pause, reconnect, resume, and reconnect-failure transitions', () => {
        const session = createNavigationSession(createTrip());
        const active = updateNavigationSessionStatus(session, 'active', 100);
        const paused = pauseNavigationSession(active, 200);
        const reconnecting = beginNavigationReconnect(paused, 300);
        const failedReconnect = failNavigationReconnect(reconnecting, 400);
        const resumed = resumeNavigationSession(failedReconnect, 'vehicle-projection', 500);

        expect(paused).toMatchObject({
            status: 'paused',
            updatedAt: 200,
        });
        expect(reconnecting).toMatchObject({
            status: 'reconnecting',
            reconnectState: 'pending',
            lastSyncSource: 'background',
            updatedAt: 300,
        });
        expect(failedReconnect).toMatchObject({
            status: 'paused',
            reconnectState: 'failed',
            updatedAt: 400,
        });
        expect(resumed).toMatchObject({
            status: 'active',
            reconnectState: 'restored',
            lastSyncSource: 'vehicle-projection',
            updatedAt: 500,
        });
    });

    it('supports skipping ahead to the next stop or completing the session', () => {
        const trip = {
            ...createTrip(),
            stops: [
                {
                    id: 'start',
                    name: 'Start',
                    location: { lat: 1, lng: 1 },
                    type: 'start' as const,
                },
                {
                    id: 'mid',
                    name: 'Mid',
                    location: { lat: 2, lng: 2 },
                    type: 'stop' as const,
                },
                {
                    id: 'end',
                    name: 'End',
                    location: { lat: 3, lng: 3 },
                    type: 'destination' as const,
                },
            ],
        };
        const session = updateNavigationSessionStatus(createNavigationSession(trip), 'active', 100);

        expect(skipNavigationSessionStop(session, 2, trip.stops.length, 200)).toMatchObject({
            status: 'active',
            currentStopIndex: 2,
            currentLegIndex: 1,
            updatedAt: 200,
        });

        expect(skipNavigationSessionStop(session, 3, trip.stops.length, 300)).toMatchObject({
            status: 'completed',
            currentStopIndex: 3,
            currentLegIndex: 2,
            updatedAt: 300,
        });
    });

    it('allows session restore only when the trip fingerprint still matches', () => {
        const trip = {
            ...createTrip(),
            stops: [
                {
                    id: 'start',
                    name: 'Start',
                    location: { lat: 1, lng: 1 },
                    type: 'start' as const,
                },
                {
                    id: 'end',
                    name: 'End',
                    location: { lat: 2, lng: 2 },
                    type: 'destination' as const,
                },
            ],
        };
        const session = createNavigationSession(trip, {
            routeFingerprint: createNavigationRouteFingerprint(trip),
            currentStopIndex: 99,
            currentLegIndex: 99,
        });

        expect(getNavigationSessionResumeState(session, trip)).toMatchObject({
            status: 'resume-ok',
            session: {
                currentStopIndex: 2,
                currentLegIndex: 1,
            },
        });

        const changedTrip = {
            ...trip,
            stops: [
                trip.stops[0],
                {
                    id: 'mid',
                    name: 'Mid',
                    location: { lat: 1.5, lng: 1.5 },
                    type: 'stop' as const,
                },
                trip.stops[1],
            ],
        };

        expect(getNavigationSessionResumeState(session, changedTrip).status).toBe('resume-needs-reroute');
        expect(getNavigationSessionResumeState(
            updateNavigationSessionStatus(session, 'completed'),
            trip
        ).status).toBe('resume-reject');
    });
});
