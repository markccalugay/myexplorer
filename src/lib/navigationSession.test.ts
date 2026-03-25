import { describe, expect, it, vi } from 'vitest';
import { canResumeNavigationSession, createNavigationSession, getElapsedNavigationTimeMs, updateNavigationSessionStatus } from './navigationSession';
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
});
